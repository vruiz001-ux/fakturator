import { NextRequest, NextResponse } from "next/server"
import { searchByName, lookupByKrsNumber } from "@/services/krs/krs.service"
import { lookupByNip, validateNipFormat } from "@/services/krs/nip-lookup.service"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const krs = searchParams.get("krs")?.trim()
  const nip = searchParams.get("nip")?.trim()

  // NIP lookup — primary fast lookup
  if (nip) {
    const { valid, error } = validateNipFormat(nip)
    if (!valid) {
      return NextResponse.json({ found: false, error })
    }
    const result = await lookupByNip(nip)
    return NextResponse.json(result)
  }

  // KRS number lookup
  if (krs) {
    const result = await lookupByKrsNumber(krs)
    return NextResponse.json(result)
  }

  // Name search
  if (query && query.length >= 3) {
    // If query looks like a NIP (10 digits), try NIP lookup first
    const cleanQuery = query.replace(/[\s\-]/g, "")
    if (/^\d{10}$/.test(cleanQuery)) {
      const nipResult = await lookupByNip(cleanQuery)
      if (nipResult.found) {
        return NextResponse.json({
          results: [{
            krsNumber: nipResult.company?.krsNumber || "",
            name: nipResult.company?.name || "",
            nip: nipResult.company?.nip || "",
            regon: nipResult.company?.regon || "",
            city: nipResult.company?.address.city || "",
            legalForm: nipResult.company?.legalForm || "",
          }],
          total: 1,
          lookupMethod: "NIP",
        })
      }
    }

    const results = await searchByName(query)
    return NextResponse.json(results)
  }

  return NextResponse.json({ results: [], total: 0 })
}
