import { NextResponse } from "next/server"
import { getStats, initializeStore } from "@/lib/store/data-store"

export async function GET() {
  initializeStore()
  const stats = getStats()
  return NextResponse.json(stats)
}
