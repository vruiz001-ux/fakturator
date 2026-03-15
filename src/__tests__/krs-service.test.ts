import { mapKrsToOnboarding, trackOverride } from "../services/krs/krs-autofill.service"
import type { KrsCompanyRecord, CompanySourceMetadata } from "../services/krs/krs.types"

const mockCompany: KrsCompanyRecord = {
  krsNumber: "0000331533",
  name: "Cd Projekt S.A.",
  nip: "7342867148",
  regon: "49271737000000",
  legalForm: "S.A.",
  address: {
    street: "UL. JAGIELLOŃSKA",
    buildingNumber: "74",
    unitNumber: "",
    postalCode: "03-301",
    city: "Warszawa",
    municipality: "WARSZAWA",
    county: "M.ST. WARSZAWA",
    voivodeship: "Mazowieckie",
    country: "PL",
  },
  registrationDate: "2002-03-14",
  source: "KRS_API",
  fetchedAt: "2026-03-15T10:00:00Z",
}

describe("KRS Autofill Service", () => {
  test("maps KRS company to onboarding fields", () => {
    const result = mapKrsToOnboarding(mockCompany)

    expect(result.company.legalName).toBe("Cd Projekt S.A.")
    expect(result.billing.nip).toBe("7342867148")
    expect(result.billing.regon).toBe("49271737000000")
    expect(result.billing.krs).toBe("0000331533")
    expect(result.billing.city).toBe("Warszawa")
    expect(result.billing.postalCode).toBe("03-301")
    expect(result.billing.country).toBe("PL")
    expect(result.billing.isVatPayer).toBe(true)
  })

  test("maps legal form to business type", () => {
    const result = mapKrsToOnboarding(mockCompany)
    expect(result.company.businessType).toBe("corporation")
  })

  test("maps Sp. z o.o. correctly", () => {
    const company = { ...mockCompany, legalForm: "Sp. z o.o." }
    const result = mapKrsToOnboarding(company)
    expect(result.company.businessType).toBe("limited")
  })

  test("records filled fields", () => {
    const result = mapKrsToOnboarding(mockCompany)
    expect(result.filledFields).toContain("legalName")
    expect(result.filledFields).toContain("nip")
    expect(result.filledFields).toContain("city")
    expect(result.filledFields).toContain("address")
  })

  test("builds source metadata", () => {
    const result = mapKrsToOnboarding(mockCompany)
    expect(result.metadata.sourceType).toBe("KRS")
    expect(result.metadata.sourceId).toBe("0000331533")
    expect(result.metadata.matchedFields.length).toBeGreaterThan(0)
    expect(result.metadata.overriddenFields).toHaveLength(0)
  })

  test("constructs full address from parts", () => {
    const result = mapKrsToOnboarding(mockCompany)
    expect(result.billing.address).toBe("UL. JAGIELLOŃSKA 74")
  })

  test("handles missing address unit number", () => {
    const company = { ...mockCompany, address: { ...mockCompany.address, unitNumber: "5" } }
    const result = mapKrsToOnboarding(company)
    expect(result.billing.address).toBe("UL. JAGIELLOŃSKA 74/5")
  })
})

describe("KRS Override Tracking", () => {
  test("tracks field override", () => {
    const metadata: CompanySourceMetadata = {
      sourceType: "KRS",
      sourceId: "0000331533",
      fetchedAt: "2026-03-15T10:00:00Z",
      matchedFields: ["legalName", "nip", "city"],
      overriddenFields: [],
    }

    const updated = trackOverride(metadata, "legalName")
    expect(updated.overriddenFields).toContain("legalName")
    expect(updated.matchedFields).toContain("legalName")
  })

  test("does not track non-KRS field as override", () => {
    const metadata: CompanySourceMetadata = {
      sourceType: "KRS",
      sourceId: "0000331533",
      matchedFields: ["legalName"],
      overriddenFields: [],
    }

    const updated = trackOverride(metadata, "phone")
    expect(updated.overriddenFields).not.toContain("phone")
  })

  test("does not double-track overrides", () => {
    const metadata: CompanySourceMetadata = {
      sourceType: "KRS",
      sourceId: "0000331533",
      matchedFields: ["legalName"],
      overriddenFields: ["legalName"],
    }

    const updated = trackOverride(metadata, "legalName")
    expect(updated.overriddenFields.filter((f) => f === "legalName")).toHaveLength(1)
  })
})
