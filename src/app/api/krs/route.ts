import { NextRequest, NextResponse } from "next/server"
import { searchByName, lookupByKrsNumber } from "@/services/krs/krs.service"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const krs = searchParams.get("krs")?.trim()

  if (krs) {
    const result = await lookupByKrsNumber(krs)
    return NextResponse.json(result)
  }

  if (query && query.length >= 3) {
    const results = await searchByName(query)
    return NextResponse.json(results)
  }

  return NextResponse.json({ results: [], total: 0 })
}
