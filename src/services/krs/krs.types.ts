// ─── KRS Data Types ───────────────────────────────────────

export interface KrsSearchResult {
  krsNumber: string
  name: string
  nip?: string
  regon?: string
  city?: string
  legalForm?: string
  status?: string
}

export interface KrsCompanyRecord {
  krsNumber: string
  name: string
  nip: string
  regon: string
  legalForm: string
  address: {
    street: string
    buildingNumber: string
    unitNumber: string
    postalCode: string
    city: string
    municipality: string
    county: string
    voivodeship: string
    country: string
  }
  email?: string
  website?: string
  vatStatus?: string
  registrationDate?: string
  lastEntryDate?: string
  lastEntryNumber?: string
  source: "KRS_API"
  fetchedAt: string
}

export interface KrsLookupResult {
  found: boolean
  company?: KrsCompanyRecord
  error?: string
}

export interface KrsSearchResponse {
  results: KrsSearchResult[]
  total: number
  error?: string
}

// ─── Source Metadata ──────────────────────────────────────

export interface CompanySourceMetadata {
  sourceType: "KRS" | "MANUAL"
  sourceId?: string // KRS number
  fetchedAt?: string
  matchedFields: string[]
  overriddenFields: string[]
}
