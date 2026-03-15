// @ts-nocheck

export interface FxRateEntry {
  baseCurrency: string
  targetCurrency: string
  rate: number
  rateDate: Date
  source: 'MANUAL' | 'ECB' | 'NBP' | 'MOCK'
}

export interface FxConversionResult {
  originalAmount: number
  originalCurrency: string
  targetCurrency: string
  rate: number
  rateDate: Date
  rateSource: string
  convertedAmount: number
  upliftPercent: number
  upliftAmount: number
  finalAmount: number
}

// Mock exchange rates - replace with ECB/NBP API integration
const MOCK_RATES: Record<string, Record<string, number>> = {
  PLN: { EUR: 0.2326, USD: 0.2533, GBP: 0.1996, CHF: 0.2275 },
  USD: { EUR: 0.9183, PLN: 3.9475, GBP: 0.7882, CHF: 0.8979 },
  GBP: { EUR: 1.1651, PLN: 5.0085, USD: 1.2688, CHF: 1.1391 },
  CHF: { EUR: 1.0228, PLN: 4.3959, USD: 1.1137, GBP: 0.8779 },
  EUR: { PLN: 4.2989, USD: 1.0890, GBP: 0.8583, CHF: 0.9777 },
}

// FX rate provider interface - implement for ECB, NBP, etc.
export interface FxRateProvider {
  getRate(baseCurrency: string, targetCurrency: string, date?: Date): Promise<FxRateEntry | null>
  getName(): string
}

// Mock provider
export class MockFxRateProvider implements FxRateProvider {
  async getRate(baseCurrency: string, targetCurrency: string, date?: Date): Promise<FxRateEntry | null> {
    if (baseCurrency === targetCurrency) {
      return { baseCurrency, targetCurrency, rate: 1, rateDate: date || new Date(), source: 'MOCK' }
    }
    const rate = MOCK_RATES[baseCurrency]?.[targetCurrency]
    if (!rate) return null
    return {
      baseCurrency,
      targetCurrency,
      rate,
      rateDate: date || new Date(),
      source: 'MOCK',
    }
  }
  getName() { return 'MOCK' }
}

// Manual rate provider (user-entered rates)
export class ManualFxRateProvider implements FxRateProvider {
  private rates: Map<string, FxRateEntry> = new Map()

  setRate(baseCurrency: string, targetCurrency: string, rate: number, date?: Date) {
    const key = `${baseCurrency}_${targetCurrency}`
    this.rates.set(key, { baseCurrency, targetCurrency, rate, rateDate: date || new Date(), source: 'MANUAL' })
  }

  async getRate(baseCurrency: string, targetCurrency: string): Promise<FxRateEntry | null> {
    return this.rates.get(`${baseCurrency}_${targetCurrency}`) || null
  }
  getName() { return 'MANUAL' }
}

// Main FX service
let activeProvider: FxRateProvider = new MockFxRateProvider()

export function setFxRateProvider(provider: FxRateProvider) {
  activeProvider = provider
}

export function getFxRateProvider(): FxRateProvider {
  return activeProvider
}

export async function getExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
  date?: Date
): Promise<FxRateEntry | null> {
  return activeProvider.getRate(baseCurrency, targetCurrency, date)
}

// Convert amount with optional uplift
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  upliftPercent: number = 0,
  date?: Date
): Promise<FxConversionResult | null> {
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate: 1,
      rateDate: date || new Date(),
      rateSource: 'IDENTITY',
      convertedAmount: amount,
      upliftPercent: 0,
      upliftAmount: 0,
      finalAmount: amount,
    }
  }

  const rateEntry = await getExchangeRate(fromCurrency, toCurrency, date)
  if (!rateEntry) return null

  const convertedAmount = Math.round(amount * rateEntry.rate * 100) / 100
  const upliftAmount = upliftPercent > 0 ? Math.round(convertedAmount * (upliftPercent / 100) * 100) / 100 : 0
  const finalAmount = Math.round((convertedAmount + upliftAmount) * 100) / 100

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    targetCurrency: toCurrency,
    rate: rateEntry.rate,
    rateDate: rateEntry.rateDate,
    rateSource: rateEntry.source,
    convertedAmount,
    upliftPercent,
    upliftAmount,
    finalAmount,
  }
}

// Calculate rebill amount for a foreign-currency expense
export async function calculateExpenseRebill(
  expense: {
    grossAmount: number
    currency: string
    isForeignCurrency?: boolean
    fxLocked?: boolean
  },
  rebillCurrency: string = 'EUR',
  upliftPercent: number = 5,
  date?: Date
): Promise<FxConversionResult | null> {
  if (expense.fxLocked) return null

  return convertCurrency(
    expense.grossAmount,
    expense.currency,
    rebillCurrency,
    upliftPercent,
    date
  )
}

// Batch process multiple expenses
export async function batchCalculateRebills(
  expenses: Array<{
    id: string
    grossAmount: number
    currency: string
    isForeignCurrency?: boolean
    fxLocked?: boolean
  }>,
  rebillCurrency: string = 'EUR',
  upliftPercent: number = 5
): Promise<Map<string, FxConversionResult>> {
  const results = new Map<string, FxConversionResult>()

  for (const expense of expenses) {
    if (expense.fxLocked) continue
    const result = await calculateExpenseRebill(expense, rebillCurrency, upliftPercent)
    if (result) results.set(expense.id, result)
  }

  return results
}

// Get supported currencies
export function getSupportedCurrencies(): string[] {
  return ['PLN', 'EUR', 'USD', 'GBP', 'CHF']
}

// Check if a currency is foreign relative to a base
export function isForeignCurrency(currency: string, baseCurrency: string = 'PLN'): boolean {
  return currency !== baseCurrency
}
