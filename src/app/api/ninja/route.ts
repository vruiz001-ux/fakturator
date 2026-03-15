import { NextRequest, NextResponse } from "next/server"
import { testConnection } from "@/services/ninja/ninja.service"
import { importFromNinja } from "@/services/ninja/ninja-import.service"
import { initializeStore } from "@/lib/store/data-store"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, apiUrl, apiToken, options } = body

    if (!apiUrl || !apiToken) {
      return NextResponse.json({ error: "API URL and token are required" }, { status: 400 })
    }

    const config = { apiUrl: apiUrl.replace(/\/+$/, ""), apiToken }

    if (action === "test") {
      const result = await testConnection(config)
      return NextResponse.json(result)
    }

    if (action === "import") {
      initializeStore()
      const result = await importFromNinja(config, options)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Import failed" }, { status: 500 })
  }
}
