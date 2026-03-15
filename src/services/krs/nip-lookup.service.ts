// ─── NIP Lookup Service ───────────────────────────────────
// Uses the Polish Ministry of Finance White List API
// https://wl-api.mf.gov.pl/api/search/nip/{nip}?date={YYYY-MM-DD}

import type { KrsCompanyRecord, KrsLookupResult } from "./krs.types"

const WL_API_BASE = "https://wl-api.mf.gov.pl/api/search"

// ─── NIP Format Validation ───────────────────────────────

export function validateNipFormat(nip: string): { valid: boolean; error?: string; cleaned: string } {
  const cleaned = nip.replace(/[\s\-]/g, "")
  if (!/^\d+$/.test(cleaned)) return { valid: false, error: "NIP must contain only digits", cleaned }
  if (cleaned.length !== 10) return { valid: false, error: "NIP must be exactly 10 digits", cleaned }

  // Checksum validation (Polish NIP algorithm)
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i]
  }
  if (sum % 11 !== parseInt(cleaned[9])) {
    return { valid: false, error: "Invalid NIP checksum", cleaned }
  }

  return { valid: true, cleaned }
}

// ─── NIP Lookup via White List API ────────────────────────

export async function lookupByNip(nip: string): Promise<KrsLookupResult> {
  const { valid, error, cleaned } = validateNipFormat(nip)
  if (!valid) {
    return { found: false, error: error || "Invalid NIP format" }
  }

  try {
    const today = new Date().toISOString().split("T")[0]
    const url = `${WL_API_BASE}/nip/${cleaned}?date=${today}`

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 400) {
        return { found: false, error: "Invalid NIP number" }
      }
      return { found: false, error: `Registry API error: ${response.status}` }
    }

    const data = await response.json()
    const subject = data?.result?.subject

    if (!subject) {
      return { found: false, error: "No company found for this NIP" }
    }

    return {
      found: true,
      company: normalizeWhiteListResponse(subject),
    }
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { found: false, error: "Registry lookup timed out. Please try again." }
    }
    return { found: false, error: `Failed to connect to registry: ${err.message}` }
  }
}

// ─── REGON Lookup (via White List by bank account — limited) ─

export async function lookupByRegon(regon: string): Promise<KrsLookupResult> {
  // The White List API doesn't support REGON search directly
  // REGON lookup would require the GUS BIR1 API which needs authentication
  return { found: false, error: "REGON lookup requires the GUS BIR1 API. Use NIP or KRS number instead." }
}

// ─── Response Normalization ───────────────────────────────

function normalizeWhiteListResponse(subject: any): KrsCompanyRecord {
  const address = parseAddress(subject.workingAddress || subject.residenceAddress || "")

  return {
    krsNumber: subject.krs || "",
    name: normalizeCompanyName(subject.name || ""),
    nip: subject.nip || "",
    regon: subject.regon || "",
    legalForm: extractLegalForm(subject.name || ""),
    address: {
      street: address.street,
      buildingNumber: address.buildingNumber,
      unitNumber: address.unitNumber,
      postalCode: address.postalCode,
      city: address.city,
      municipality: "",
      county: "",
      voivodeship: "",
      country: "PL",
    },
    vatStatus: subject.statusVat || undefined,
    registrationDate: subject.registrationLegalDate,
    source: "KRS_API",
    fetchedAt: new Date().toISOString(),
  }
}

// ─── Address Parsing ──────────────────────────────────────
// White List returns address as a single string like:
// "AL. ALEJE JEROZOLIMSKIE 123A, 02-017 WARSZAWA"
// "JAGIELLOŃSKA 74, 03-301 WARSZAWA"
// "UL. MARSZAŁKOWSKA 100/5, 00-001 WARSZAWA"

interface ParsedAddress {
  street: string
  buildingNumber: string
  unitNumber: string
  postalCode: string
  city: string
}

function parseAddress(raw: string): ParsedAddress {
  const result: ParsedAddress = {
    street: "", buildingNumber: "", unitNumber: "",
    postalCode: "", city: "",
  }

  if (!raw) return result

  // Split by comma — first part is street+number, second is postal+city
  const parts = raw.split(",").map((p) => p.trim())

  if (parts.length >= 2) {
    // Parse street part: "UL. MARSZAŁKOWSKA 100/5" or "JAGIELLOŃSKA 74"
    const streetPart = parts[0]
    const streetMatch = streetPart.match(/^(.+?)\s+(\d+\w*(?:\/\d+\w*)?)$/)
    if (streetMatch) {
      result.street = streetMatch[1]
      const numParts = streetMatch[2].split("/")
      result.buildingNumber = numParts[0]
      result.unitNumber = numParts[1] || ""
    } else {
      result.street = streetPart
    }

    // Parse postal+city part: "02-017 WARSZAWA"
    const postalPart = parts[parts.length - 1]
    const postalMatch = postalPart.match(/^(\d{2}-\d{3})\s+(.+)$/)
    if (postalMatch) {
      result.postalCode = postalMatch[1]
      result.city = capitalizeCity(postalMatch[2])
    } else {
      result.city = capitalizeCity(postalPart)
    }
  } else if (parts.length === 1) {
    // Try to parse single-line address
    const postalMatch = raw.match(/(\d{2}-\d{3})\s+(.+)$/)
    if (postalMatch) {
      result.postalCode = postalMatch[1]
      result.city = capitalizeCity(postalMatch[2])
      result.street = raw.replace(postalMatch[0], "").trim().replace(/,\s*$/, "")
    }
  }

  return result
}

// ─── Name Normalization ───────────────────────────────────

function normalizeCompanyName(name: string): string {
  if (!name) return ""
  return name
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase()
      if (["sp.", "z", "o.o.", "s.a.", "sp.j.", "s.c.", "s.k.a.", "sp.k."].includes(lower)) {
        return lower === "z" ? "z" : word
      }
      if (word === word.toUpperCase() && word.length > 2) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word
    })
    .join(" ")
    .replace(/SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ/gi, "Sp. z o.o.")
    .replace(/SPÓŁKA AKCYJNA/gi, "S.A.")
    .replace(/SPÓŁKA JAWNA/gi, "Sp.j.")
    .replace(/SPÓŁKA KOMANDYTOWA/gi, "Sp.k.")
}

function extractLegalForm(name: string): string {
  const upper = name.toUpperCase()
  if (upper.includes("SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ") || upper.includes("SP. Z O.O")) return "Sp. z o.o."
  if (upper.includes("SPÓŁKA AKCYJNA") || upper.includes("S.A.")) return "S.A."
  if (upper.includes("SPÓŁKA JAWNA") || upper.includes("SP.J.")) return "Sp.j."
  if (upper.includes("SPÓŁKA KOMANDYTOWA") || upper.includes("SP.K.")) return "Sp.k."
  if (upper.includes("FUNDACJA")) return "Fundacja"
  if (upper.includes("STOWARZYSZENIE")) return "Stowarzyszenie"
  return ""
}

function capitalizeCity(city: string): string {
  if (!city) return ""
  return city
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
