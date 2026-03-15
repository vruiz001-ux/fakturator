import { calculateVAT, calculateGross, calculateNet, formatNIP } from "../lib/formatters"

describe("Financial Calculations", () => {
  test("calculates VAT at 23%", () => {
    expect(calculateVAT(1000, 23)).toBe(230)
  })

  test("calculates VAT at 8%", () => {
    expect(calculateVAT(1000, 8)).toBe(80)
  })

  test("calculates zero VAT for exempt", () => {
    expect(calculateVAT(1000, -1)).toBe(0)
  })

  test("calculates gross from net", () => {
    expect(calculateGross(1000, 23)).toBe(1230)
  })

  test("calculates net from gross", () => {
    expect(calculateNet(1230, 23)).toBeCloseTo(1000, 0)
  })

  test("handles precision for common amounts", () => {
    // Common Polish invoice scenario
    expect(calculateVAT(4500, 23)).toBe(1035)
    expect(calculateGross(4500, 23)).toBe(5535)
  })

  test("VAT calculation is deterministic", () => {
    const results = Array.from({ length: 100 }, () => calculateVAT(333.33, 23))
    expect(new Set(results).size).toBe(1) // All identical
  })
})

describe("NIP Formatting", () => {
  test("formats 10-digit NIP with dashes", () => {
    expect(formatNIP("5272987654")).toBe("527-298-76-54")
  })

  test("handles already formatted NIP", () => {
    expect(formatNIP("527-298-76-54")).toBe("527-298-76-54")
  })

  test("returns original for invalid NIP", () => {
    expect(formatNIP("12345")).toBe("12345")
  })
})
