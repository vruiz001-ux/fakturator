import { convertCurrency, calculateExpenseRebill, isForeignCurrency, MockFxRateProvider, setFxRateProvider } from "../services/fx/fx.service"

// Reset to mock provider before each test
beforeEach(() => {
  setFxRateProvider(new MockFxRateProvider())
})

describe("FX Service - Currency Conversion", () => {
  test("converts PLN to EUR", async () => {
    const result = await convertCurrency(1000, "PLN", "EUR")
    expect(result).not.toBeNull()
    expect(result!.originalAmount).toBe(1000)
    expect(result!.originalCurrency).toBe("PLN")
    expect(result!.targetCurrency).toBe("EUR")
    expect(result!.rate).toBeCloseTo(0.2326, 3)
    expect(result!.convertedAmount).toBeCloseTo(232.6, 1)
    expect(result!.upliftPercent).toBe(0)
    expect(result!.upliftAmount).toBe(0)
    expect(result!.finalAmount).toBeCloseTo(232.6, 1)
  })

  test("applies 5% uplift correctly", async () => {
    const result = await convertCurrency(1000, "PLN", "EUR", 5)
    expect(result).not.toBeNull()
    expect(result!.convertedAmount).toBeCloseTo(232.6, 1)
    expect(result!.upliftPercent).toBe(5)
    expect(result!.upliftAmount).toBeCloseTo(11.63, 1)
    expect(result!.finalAmount).toBeCloseTo(244.23, 1)
  })

  test("same currency returns identity", async () => {
    const result = await convertCurrency(500, "EUR", "EUR")
    expect(result).not.toBeNull()
    expect(result!.rate).toBe(1)
    expect(result!.convertedAmount).toBe(500)
    expect(result!.finalAmount).toBe(500)
    expect(result!.upliftAmount).toBe(0)
  })

  test("handles zero uplift", async () => {
    const result = await convertCurrency(100, "USD", "EUR", 0)
    expect(result).not.toBeNull()
    expect(result!.upliftPercent).toBe(0)
    expect(result!.upliftAmount).toBe(0)
    expect(result!.finalAmount).toBe(result!.convertedAmount)
  })

  test("returns null for unsupported currency pair", async () => {
    const result = await convertCurrency(100, "PLN", "JPY")
    expect(result).toBeNull()
  })

  test("preserves two decimal precision", async () => {
    const result = await convertCurrency(333.33, "USD", "EUR", 5)
    expect(result).not.toBeNull()
    const decimals = result!.finalAmount.toString().split(".")[1]
    expect(decimals?.length || 0).toBeLessThanOrEqual(2)
  })
})

describe("FX Service - Expense Rebill Calculation", () => {
  test("calculates rebill for foreign expense", async () => {
    const result = await calculateExpenseRebill(
      { grossAmount: 500, currency: "USD", isForeignCurrency: true, fxLocked: false },
      "EUR",
      5
    )
    expect(result).not.toBeNull()
    expect(result!.upliftPercent).toBe(5)
    expect(result!.finalAmount).toBeGreaterThan(result!.convertedAmount)
  })

  test("skips locked expenses", async () => {
    const result = await calculateExpenseRebill(
      { grossAmount: 500, currency: "USD", isForeignCurrency: true, fxLocked: true },
      "EUR",
      5
    )
    expect(result).toBeNull()
  })

  test("5% uplift matches expected value", async () => {
    const result = await calculateExpenseRebill(
      { grossAmount: 1000, currency: "GBP", isForeignCurrency: true, fxLocked: false },
      "EUR",
      5
    )
    expect(result).not.toBeNull()
    // GBP to EUR rate is ~1.1651
    const expectedConverted = Math.round(1000 * 1.1651 * 100) / 100
    const expectedUplift = Math.round(expectedConverted * 0.05 * 100) / 100
    expect(result!.convertedAmount).toBeCloseTo(expectedConverted, 0)
    expect(result!.upliftAmount).toBeCloseTo(expectedUplift, 0)
    expect(result!.finalAmount).toBeCloseTo(expectedConverted + expectedUplift, 0)
  })
})

describe("FX Service - Currency Detection", () => {
  test("PLN is not foreign to PLN base", () => {
    expect(isForeignCurrency("PLN", "PLN")).toBe(false)
  })

  test("EUR is foreign to PLN base", () => {
    expect(isForeignCurrency("EUR", "PLN")).toBe(true)
  })

  test("USD is foreign to PLN base", () => {
    expect(isForeignCurrency("USD", "PLN")).toBe(true)
  })
})
