// ─── KRS Autofill Service ─────────────────────────────────
// Maps KRS company data to onboarding form fields

import type { KrsCompanyRecord, CompanySourceMetadata } from "./krs.types"
import type { CompanySetup, BillingSetup } from "@/lib/onboarding/onboarding.types"

export interface AutofillResult {
  company: Partial<CompanySetup>
  billing: Partial<BillingSetup>
  metadata: CompanySourceMetadata
  filledFields: string[]
}

export function mapKrsToOnboarding(record: KrsCompanyRecord): AutofillResult {
  const filledFields: string[] = []

  const company: Partial<CompanySetup> = {}
  const billing: Partial<BillingSetup> = {}

  // Company fields
  if (record.name) {
    company.legalName = record.name
    filledFields.push("legalName")
  }

  if (record.legalForm) {
    company.businessType = mapLegalFormToBusinessType(record.legalForm)
    filledFields.push("businessType")
  }

  // Billing fields
  if (record.address.street) {
    const street = record.address.street
    const num = [record.address.buildingNumber, record.address.unitNumber]
      .filter(Boolean)
      .join("/")
    billing.address = num ? `${street} ${num}` : street
    filledFields.push("address")
  }

  if (record.address.city) {
    billing.city = record.address.city
    filledFields.push("city")
  }

  if (record.address.postalCode) {
    billing.postalCode = record.address.postalCode
    filledFields.push("postalCode")
  }

  if (record.address.country) {
    billing.country = record.address.country
    filledFields.push("country")
  }

  if (record.nip) {
    billing.nip = record.nip
    filledFields.push("nip")
  }

  if (record.regon) {
    billing.regon = record.regon
    filledFields.push("regon")
  }

  if (record.krsNumber) {
    billing.krs = record.krsNumber
    filledFields.push("krs")
  }

  billing.taxResidency = "PL"
  billing.isVatPayer = true

  const metadata: CompanySourceMetadata = {
    sourceType: "KRS",
    sourceId: record.krsNumber,
    fetchedAt: record.fetchedAt,
    matchedFields: filledFields,
    overriddenFields: [],
  }

  return { company, billing, metadata, filledFields }
}

function mapLegalFormToBusinessType(legalForm: string): string {
  const form = legalForm.toLowerCase()
  if (form.includes("sp. z o.o") || form.includes("spółka z ograniczoną")) return "limited"
  if (form.includes("s.a.") || form.includes("akcyjna")) return "corporation"
  if (form.includes("sp.j.") || form.includes("jawna")) return "partnership"
  if (form.includes("sp.k.") || form.includes("komandytowa")) return "partnership"
  if (form.includes("fundacja")) return "foundation"
  if (form.includes("stowarzyszenie")) return "other"
  return "other"
}

// Track field overrides
export function trackOverride(
  metadata: CompanySourceMetadata,
  field: string
): CompanySourceMetadata {
  if (metadata.matchedFields.includes(field) && !metadata.overriddenFields.includes(field)) {
    return {
      ...metadata,
      overriddenFields: [...metadata.overriddenFields, field],
    }
  }
  return metadata
}
