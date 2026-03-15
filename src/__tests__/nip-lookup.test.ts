import { validateNipFormat } from "../services/krs/nip-lookup.service"

describe("NIP Format Validation", () => {
  test("accepts valid NIP", () => {
    const result = validateNipFormat("1234563218")
    expect(result.valid).toBe(true)
    expect(result.cleaned).toBe("1234563218")
  })

  test("accepts NIP with dashes", () => {
    const result = validateNipFormat("123-456-32-18")
    expect(result.valid).toBe(true)
    expect(result.cleaned).toBe("1234563218")
  })

  test("accepts NIP with spaces", () => {
    const result = validateNipFormat("123 456 32 18")
    expect(result.valid).toBe(true)
    expect(result.cleaned).toBe("1234563218")
  })

  test("rejects NIP with wrong length", () => {
    const result = validateNipFormat("12345")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("10 digits")
  })

  test("rejects NIP with letters", () => {
    const result = validateNipFormat("123ABC7890")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("only digits")
  })

  test("rejects NIP with invalid checksum", () => {
    const result = validateNipFormat("1234567890")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("checksum")
  })

  test("validates real Polish NIPs", () => {
    // Known valid NIPs (public companies)
    expect(validateNipFormat("6342373405").valid).toBe(true) // Rodenstock
    expect(validateNipFormat("7342867148").valid).toBe(true) // CD Projekt
    expect(validateNipFormat("5242617178").valid).toBe(true) // Allegro
  })

  test("rejects empty NIP", () => {
    const result = validateNipFormat("")
    expect(result.valid).toBe(false)
  })

  test("returns cleaned value", () => {
    const result = validateNipFormat("634-237-34-05")
    expect(result.cleaned).toBe("6342373405")
  })
})

describe("NIP Lookup Integration", () => {
  // These tests verify the service contract without calling the real API
  // Integration tests with the real API should be in a separate e2e suite

  test("validateNipFormat is deterministic", () => {
    const nip = "7342867148"
    const r1 = validateNipFormat(nip)
    const r2 = validateNipFormat(nip)
    expect(r1.valid).toBe(r2.valid)
    expect(r1.cleaned).toBe(r2.cleaned)
  })

  test("all 10-digit checksum-valid NIPs are accepted", () => {
    // Generate a valid NIP programmatically
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
    const digits = [1, 2, 3, 4, 5, 6, 3, 2, 1]
    let sum = 0
    for (let i = 0; i < 9; i++) sum += digits[i] * weights[i]
    const checkDigit = sum % 11
    if (checkDigit < 10) {
      const nip = digits.join("") + checkDigit
      expect(validateNipFormat(nip).valid).toBe(true)
    }
  })
})
