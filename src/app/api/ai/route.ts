import { NextRequest, NextResponse } from "next/server"
import { parseNaturalLanguageInvoice } from "@/services/ai.service"

export async function POST(request: NextRequest) {
  const { prompt, type } = await request.json()

  if (type === "parse-invoice") {
    const parsed = parseNaturalLanguageInvoice(prompt)
    return NextResponse.json(parsed)
  }

  return NextResponse.json({ error: "Unknown AI action type" }, { status: 400 })
}
