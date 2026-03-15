import { NextResponse } from "next/server"

// Fetch live rates from ECB + NBP for Polish users
const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
const NBP_URL = "https://api.nbp.pl/api/exchangerates/tables/a/?format=json"

interface FxRates {
  base: string
  date: string
  rates: Record<string, number>
  source: string
  fetchedAt: string
}

let cachedRates: FxRates | null = null
let cacheTime = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

async function fetchRates(): Promise<FxRates> {
  if (cachedRates && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedRates
  }

  // Try NBP first (official Polish rates)
  try {
    const nbpRes = await fetch(NBP_URL, { signal: AbortSignal.timeout(8000) })
    if (nbpRes.ok) {
      const nbpData = await nbpRes.json()
      const table = nbpData[0]
      const rates: Record<string, number> = {}

      // NBP rates are PLN-based: 1 unit of foreign currency = X PLN
      // We need EUR-based rates for our converter
      let eurToPln = 0
      for (const r of table.rates) {
        if (r.code === "EUR") eurToPln = r.mid
      }

      if (eurToPln > 0) {
        rates["EUR"] = 1
        rates["PLN"] = eurToPln // 1 EUR = X PLN
        for (const r of table.rates) {
          // Convert NBP PLN-based rate to EUR-based rate
          // NBP: 1 USD = Y PLN → EUR-based: 1 EUR = (eurToPln / Y) USD... no
          // Actually: rates[CODE] should be "how many CODE per 1 EUR"
          // NBP gives: 1 CODE = mid PLN
          // So: 1 EUR = eurToPln PLN, and 1 CODE = mid PLN
          // Therefore: 1 EUR = (eurToPln / mid) CODE
          if (r.code !== "EUR" && r.mid > 0) {
            rates[r.code] = eurToPln / r.mid
          }
        }

        const result: FxRates = {
          base: "EUR",
          date: table.effectiveDate,
          rates,
          source: "NBP",
          fetchedAt: new Date().toISOString(),
        }
        cachedRates = result
        cacheTime = Date.now()
        return result
      }
    }
  } catch {}

  // Fallback to ECB
  try {
    const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const xml = await res.text()
      const rates: Record<string, number> = { EUR: 1 }
      const dateMatch = xml.match(/time='(\d{4}-\d{2}-\d{2})'/)
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0]

      const rateRegex = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g
      let match
      while ((match = rateRegex.exec(xml)) !== null) {
        rates[match[1]] = parseFloat(match[2])
      }

      const result: FxRates = { base: "EUR", date, rates, source: "ECB", fetchedAt: new Date().toISOString() }
      cachedRates = result
      cacheTime = Date.now()
      return result
    }
  } catch {}

  // Final fallback
  return {
    base: "EUR",
    date: new Date().toISOString().split("T")[0],
    rates: { EUR: 1, PLN: 4.2693, USD: 1.1476, GBP: 0.86503, CHF: 0.9034 },
    source: "FALLBACK",
    fetchedAt: new Date().toISOString(),
  }
}

export async function GET() {
  const fxData = await fetchRates()
  return NextResponse.json(fxData)
}

export async function POST(request: Request) {
  const { amount, from, to } = await request.json()
  if (!amount || !from || !to) {
    return NextResponse.json({ error: "amount, from, and to are required" }, { status: 400 })
  }

  const fxData = await fetchRates()
  const fromRate = fxData.rates[from]
  const toRate = fxData.rates[to]

  if (!fromRate || !toRate) {
    return NextResponse.json({ error: `Unsupported currency pair: ${from}/${to}` }, { status: 400 })
  }

  const rate = toRate / fromRate
  const converted = Math.round(amount * rate * 100) / 100

  return NextResponse.json({
    originalAmount: amount,
    originalCurrency: from,
    convertedAmount: converted,
    displayCurrency: to,
    rate: Math.round(rate * 10000) / 10000,
    rateDate: fxData.date,
    rateSource: fxData.source,
    fetchedAt: fxData.fetchedAt,
  })
}
