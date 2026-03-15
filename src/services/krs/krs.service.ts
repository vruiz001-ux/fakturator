// @ts-nocheck
// ─── KRS Registry Lookup Service ──────────────────────────
// Uses the official Polish KRS API: api-krs.ms.gov.pl
// Supports lookup by KRS number (direct API)
// Name search uses a local index approach

import type { KrsCompanyRecord, KrsLookupResult, KrsSearchResult, KrsSearchResponse } from "./krs.types"

const KRS_API_BASE = "https://api-krs.ms.gov.pl/api/krs"

// ─── KRS Number Lookup (Real API) ─────────────────────────

export async function lookupByKrsNumber(krsNumber: string): Promise<KrsLookupResult> {
  const clean = krsNumber.replace(/\D/g, "").padStart(10, "0")

  if (clean.length !== 10) {
    return { found: false, error: "KRS number must be 10 digits" }
  }

  try {
    const url = `${KRS_API_BASE}/OdpisAktualny/${clean}?rejestr=P&format=json`
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (response.status === 404) {
      // Try register S (stowarzyszenia)
      const urlS = `${KRS_API_BASE}/OdpisAktualny/${clean}?rejestr=S&format=json`
      const responseS = await fetch(urlS, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      })
      if (responseS.status === 404) {
        return { found: false, error: "Company not found in KRS registry" }
      }
      if (!responseS.ok) {
        return { found: false, error: `KRS API error: ${responseS.status}` }
      }
      const dataS = await responseS.json()
      return { found: true, company: normalizeKrsResponse(dataS, clean) }
    }

    if (!response.ok) {
      return { found: false, error: `KRS API error: ${response.status}` }
    }

    const data = await response.json()
    return { found: true, company: normalizeKrsResponse(data, clean) }
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { found: false, error: "KRS registry lookup timed out. Please try again." }
    }
    return { found: false, error: `Failed to connect to KRS registry: ${err.message}` }
  }
}

// ─── NIP Lookup via KRS ───────────────────────────────────

export async function lookupByNip(nip: string): Promise<KrsLookupResult> {
  const clean = nip.replace(/\D/g, "")
  if (clean.length !== 10) {
    return { found: false, error: "NIP must be 10 digits" }
  }

  // KRS API doesn't support NIP search directly
  // We try known KRS numbers or return not-found
  return { found: false, error: "NIP search requires KRS number. Enter the KRS number for direct lookup." }
}

// ─── Name Search ──────────────────────────────────────────
// The KRS API doesn't support name search. We provide a
// well-known companies index for common lookups, and
// guide users to enter KRS number for exact matches.

const WELL_KNOWN_COMPANIES: KrsSearchResult[] = [
  { krsNumber: "0000028860", name: "ALLEGRO.PL SP. Z O.O.", nip: "5242617178", city: "Warszawa", legalForm: "SP. Z O.O." },
  { krsNumber: "0000037568", name: "BANK PKO BP S.A.", nip: "5250007738", city: "Warszawa", legalForm: "S.A." },
  { krsNumber: "0000127680", name: "ASSECO POLAND S.A.", nip: "5220001106", city: "Rzeszów", legalForm: "S.A." },
  { krsNumber: "0000331533", name: "CD PROJEKT S.A.", nip: "7342867148", city: "Warszawa", legalForm: "S.A." },
  { krsNumber: "0000073314", name: "INPOST SP. Z O.O.", nip: "6793087624", city: "Kraków", legalForm: "SP. Z O.O." },
  { krsNumber: "0000024353", name: "COMARCH S.A.", nip: "6770065406", city: "Kraków", legalForm: "S.A." },
]

export async function searchByName(query: string): Promise<KrsSearchResponse> {
  const q = query.trim().toUpperCase()
  if (q.length < 3) {
    return { results: [], total: 0 }
  }

  // Check if the query looks like a KRS number
  if (/^\d{1,10}$/.test(q.replace(/\s/g, ""))) {
    const result = await lookupByKrsNumber(q)
    if (result.found && result.company) {
      return {
        results: [{
          krsNumber: result.company.krsNumber,
          name: result.company.name,
          nip: result.company.nip,
          regon: result.company.regon,
          city: result.company.address.city,
          legalForm: result.company.legalForm,
        }],
        total: 1,
      }
    }
    return { results: [], total: 0, error: result.error }
  }

  // Search well-known companies
  const matches = WELL_KNOWN_COMPANIES.filter(
    (c) => c.name.includes(q) || (c.nip && c.nip.includes(q))
  )

  return { results: matches, total: matches.length }
}

// ─── Response Normalization ───────────────────────────────

function normalizeKrsResponse(data: any, krsNumber: string): KrsCompanyRecord {
  const odpis = data?.odpis || data
  const dzial1 = odpis?.dane?.dzial1 || {}
  const podmiot = dzial1?.danePodmiotu || {}
  const siedzibaIAdres = dzial1?.siedzibaIAdres || {}
  const header = odpis?.naglowekA || odpis?.naglowekP || {}

  // Get latest values (last element in arrays = most current)
  const nameArr = podmiot?.nazwa || []
  const name = nameArr.length > 0 ? nameArr[nameArr.length - 1]?.nazwa || "" : ""

  const formArr = podmiot?.formaPrawna || []
  const legalForm = formArr.length > 0 ? formArr[formArr.length - 1]?.formaPrawna || "" : ""

  // Identifiers — get from latest entry
  const identArr = podmiot?.identyfikatory || []
  const latestIdent = identArr.length > 0 ? identArr[identArr.length - 1]?.identyfikatory || {} : {}
  const nip = latestIdent?.nip || ""
  const regon = latestIdent?.regon || ""

  // Address — get latest
  const addrArr = siedzibaIAdres?.adres || []
  const latestAddr = addrArr.length > 0 ? addrArr[addrArr.length - 1] : {}

  // Siedziba (headquarters) — get latest
  const siedzibaArr = siedzibaIAdres?.siedziba || []
  const latestSiedziba = siedzibaArr.length > 0 ? siedzibaArr[siedzibaArr.length - 1] : {}

  return {
    krsNumber: (header?.numerKRS || krsNumber).padStart(10, "0"),
    name: normalizeCompanyName(name),
    nip,
    regon,
    legalForm: normalizeLegalForm(legalForm),
    address: {
      street: latestAddr?.ulica || "",
      buildingNumber: latestAddr?.nrDomu || "",
      unitNumber: latestAddr?.nrLokalu || "",
      postalCode: latestAddr?.kodPocztowy || "",
      city: capitalizeCity(latestAddr?.miejscowosc || latestSiedziba?.miejscowosc || ""),
      municipality: latestSiedziba?.gmina || "",
      county: latestSiedziba?.powiat || "",
      voivodeship: capitalizeCity(latestSiedziba?.wojewodztwo || ""),
      country: "PL",
    },
    registrationDate: header?.dataRejestracjiWKRS,
    lastEntryDate: header?.dataOstatniegoWpisu,
    lastEntryNumber: header?.numerostatniegoWpisu,
    source: "KRS_API",
    fetchedAt: new Date().toISOString(),
  }
}

// ─── Name Normalization ───────────────────────────────────

function normalizeCompanyName(name: string): string {
  if (!name) return ""
  // KRS stores names in ALL CAPS — convert to title case
  return name
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase()
      // Keep abbreviations uppercase
      if (["sp.", "z", "o.o.", "s.a.", "sp.j.", "s.c.", "s.k.a.", "sp.k."].includes(lower)) {
        return lower === "z" ? "z" : lower.toUpperCase().replace(/\.$/, ".").replace(/^(.)/, (m) => m.toUpperCase())
      }
      // Standard title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
    // Fix common patterns
    .replace(/Sp\. Z O\.o\./i, "Sp. z o.o.")
    .replace(/S\.a\./i, "S.A.")
    .replace(/Sp\.j\./i, "Sp.j.")
}

function normalizeLegalForm(form: string): string {
  const map: Record<string, string> = {
    "SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ": "Sp. z o.o.",
    "SPÓŁKA AKCYJNA": "S.A.",
    "SPÓŁKA JAWNA": "Sp.j.",
    "SPÓŁKA KOMANDYTOWA": "Sp.k.",
    "SPÓŁKA KOMANDYTOWO-AKCYJNA": "S.K.A.",
    "SPÓŁKA PARTNERSKA": "Sp.p.",
    "FUNDACJA": "Fundacja",
    "STOWARZYSZENIE": "Stowarzyszenie",
  }
  return map[form?.toUpperCase()] || form
}

function capitalizeCity(city: string): string {
  if (!city) return ""
  return city
    .toLowerCase()
    .split(" ")
    .map((w) => (w === "m.st." ? "m.st." : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/^M\.st\. /, "")
}
