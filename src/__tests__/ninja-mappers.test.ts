import {
  currencyCode,
  countryCode,
  NINJA_INVOICE_STATUS,
  NINJA_FREQUENCY,
} from "@/services/ninja/ninja-source"

describe("currencyCode", () => {
  it("maps common Ninja currency IDs to ISO codes", () => {
    expect(currencyCode("1")).toBe("USD")
    expect(currencyCode("3")).toBe("EUR")
    expect(currencyCode("17")).toBe("PLN")
    expect(currencyCode("2")).toBe("GBP")
  })
  it("falls back to EUR for unknown / empty IDs", () => {
    expect(currencyCode("")).toBe("EUR")
    expect(currencyCode(null)).toBe("EUR")
    expect(currencyCode("9999")).toBe("EUR")
  })
  it("respects a custom fallback", () => {
    expect(currencyCode(null, "PLN")).toBe("PLN")
  })
})

describe("countryCode", () => {
  it("maps Ninja country IDs to ISO alpha-2", () => {
    expect(countryCode("616")).toBe("PL")
    expect(countryCode("250")).toBe("FR")
    expect(countryCode("276")).toBe("DE")
  })
  it("zero-pads short IDs before lookup", () => {
    expect(countryCode("40")).toBe("AT")  // 040
    expect(countryCode("56")).toBe("BE")  // 056
  })
  it("defaults to PL for unknown IDs", () => {
    expect(countryCode("9999")).toBe("PL")
    expect(countryCode(null)).toBe("PL")
  })
})

describe("NINJA_INVOICE_STATUS", () => {
  it("maps Ninja status_id to Fakturator status", () => {
    expect(NINJA_INVOICE_STATUS["1"]).toBe("DRAFT")
    expect(NINJA_INVOICE_STATUS["2"]).toBe("SENT")
    expect(NINJA_INVOICE_STATUS["3"]).toBe("PARTIALLY_PAID")
    expect(NINJA_INVOICE_STATUS["4"]).toBe("PAID")
    expect(NINJA_INVOICE_STATUS["5"]).toBe("CANCELLED")
    expect(NINJA_INVOICE_STATUS["6"]).toBe("CANCELLED")
  })
})

describe("NINJA_FREQUENCY", () => {
  it("maps Ninja frequency_id to recurring cadence", () => {
    expect(NINJA_FREQUENCY["5"]).toBe("MONTHLY")
    expect(NINJA_FREQUENCY["7"]).toBe("QUARTERLY")
    expect(NINJA_FREQUENCY["10"]).toBe("YEARLY")
  })
  it("treats sub-monthly cadences as MONTHLY", () => {
    expect(NINJA_FREQUENCY["1"]).toBe("MONTHLY")  // daily
    expect(NINJA_FREQUENCY["2"]).toBe("MONTHLY")  // weekly
  })
})
