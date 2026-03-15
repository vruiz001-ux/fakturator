import { NextResponse } from "next/server"

// Fetch live rates from ECB (European Central Bank) daily reference rates
// Free, no API key, XML format
const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"

interface FxRates {
  base: string
  date: string
  rates: Record<string, number>
  source: string
  fetchedAt: string
}

// Cache rates for 1 hour
let cachedRates: FxRates | null = null
let cacheTime = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

async function fetchEcbRates(): Promise<FxRates> {
  if (cachedRates && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedRates
  }

  try {
    const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`ECB API returned ${res.status}`)

    const xml = await res.text()

    // Parse XML to extract rates
    const rates: Record<string, number> = { EUR: 1 }
    const dateMatch = xml.match(/time='(\d{4}-\d{2}-\d{2})'/)
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0]

    // Extract currency rates from XML: <Cube currency='USD' rate='1.0890'/>
    const rateRegex = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g
    let match
    while ((match = rateRegex.exec(xml)) !== null) {
      rates[match[1]] = parseFloat(match[2])
    }

    // Add cross-rates (ECB rates are EUR-based)
    // PLN rate from ECB
    const result: FxRates = {
      base: "EUR",
      date,
      rates,
      source: "ECB",
      fetchedAt: new Date().toISOString(),
    }

    cachedRates = result
    cacheTime = Date.now()
    return result
  } catch (err: any) {
    // Fallback to static rates
    return {
      base: "EUR",
      date: new Date().toISOString().split("T")[0],
      rates: {
        EUR: 1,
        PLN: 4.2989,
        USD: 1.0890,
        GBP: 0.8583,
        CHF: 0.9777,
        CZK: 25.07,
        SEK: 11.05,
        NOK: 11.52,
        DKK: 7.4602,
      },
      source: "FALLBACK",
      fetchedAt: new Date().toISOString(),
    }
  }
}

// Convert between any two currencies using ECB EUR-based rates
function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): { converted: number; rate: number } | null {
  if (fromCurrency === toCurrency) return { converted: amount, rate: 1 }

  const fromRate = rates[fromCurrency]
  const toRate = rates[toCurrency]
  if (!fromRate || !toRate) return null

  // Convert via EUR: amount / fromRate * toRate
  const rate = toRate / fromRate
  const converted = Math.round(amount * rate * 100) / 100
  return { converted, rate: Math.round(rate * 10000) / 10000 }
}

export async function GET() {
  const fxData = await fetchEcbRates()
  return NextResponse.json(fxData)
}

export async function POST(request: Request) {
  const { amount, from, to } = await request.json()

  if (!amount || !from || !to) {
    return NextResponse.json({ error: "amount, from, and to are required" }, { status: 400 })
  }

  const fxData = await fetchEcbRates()
  const result = convertAmount(amount, from, to, fxData.rates)

  if (!result) {
    return NextResponse.json({ error: `Unsupported currency pair: ${from}/${to}` }, { status: 400 })
  }

  return NextResponse.json({
    originalAmount: amount,
    originalCurrency: from,
    convertedAmount: result.converted,
    displayCurrency: to,
    rate: result.rate,
    rateDate: fxData.date,
    rateSource: fxData.source,
    fetchedAt: fxData.fetchedAt,
  })
}
