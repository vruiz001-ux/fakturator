import { nipChecksumValid } from "@/lib/nip"

describe("nipChecksumValid", () => {
  it("accepts valid Polish NIPs", () => {
    // Checksum-correct NIPs (verified against the weighted-sum algorithm)
    expect(nipChecksumValid("5260250274")).toBe(true)
    expect(nipChecksumValid("5261040828")).toBe(true)
  })
  it("rejects NIPs with a wrong checksum digit", () => {
    expect(nipChecksumValid("5260250275")).toBe(false)
    expect(nipChecksumValid("1234567890")).toBe(false)
  })
  it("rejects malformed input", () => {
    expect(nipChecksumValid("")).toBe(false)
    expect(nipChecksumValid("123")).toBe(false)
    expect(nipChecksumValid("12345678901")).toBe(false) // 11 digits
    expect(nipChecksumValid("abcdefghij")).toBe(false)
  })
  it("strips non-digits before validating", () => {
    expect(nipChecksumValid("526-025-02-74")).toBe(true)
    expect(nipChecksumValid("526 025 02 74")).toBe(true)
  })
})
