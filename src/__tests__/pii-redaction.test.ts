import { redactPii } from "@/lib/pii"

describe("redactPii", () => {
  it("redacts email addresses", () => {
    expect(redactPii("contact matthieu@donecle.com please")).toBe("contact [EMAIL] please")
  })
  it("redacts IBANs", () => {
    expect(redactPii("pay to PL61109010140000071219812874")).toBe("pay to [IBAN]")
  })
  it("redacts tax IDs", () => {
    expect(redactPii("NIP 5260250274 confirmed")).toBe("NIP [TAXID] confirmed")
    expect(redactPii("VAT FR36813450350")).toContain("[TAXID]")
  })
  it("redacts phone numbers", () => {
    expect(redactPii("call +48 123 456 789 now")).toBe("call [PHONE] now")
  })
  it("leaves clean text untouched", () => {
    expect(redactPii("Invoice 0008 is overdue by 14 days")).toBe("Invoice 0008 is overdue by 14 days")
  })
  it("handles empty input", () => {
    expect(redactPii("")).toBe("")
  })
  it("redacts multiple PII types in one string", () => {
    const out = redactPii("Donecle SAS, NIP 5260250274, billing@donecle.com, +48 600 700 800")
    expect(out).toContain("[TAXID]")
    expect(out).toContain("[EMAIL]")
    expect(out).toContain("[PHONE]")
    expect(out).toContain("Donecle SAS")
  })
})
