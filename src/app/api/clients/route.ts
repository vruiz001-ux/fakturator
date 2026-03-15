import { NextRequest, NextResponse } from "next/server"
import { getClients, addClient, initializeStore } from "@/lib/store/data-store"

export async function GET(request: NextRequest) {
  initializeStore()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.toLowerCase()

  let clients = getClients()
  if (search) {
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.nip?.includes(search) ||
        c.email?.toLowerCase().includes(search)
    )
  }

  return NextResponse.json({ data: clients, total: clients.length })
}

export async function POST(request: NextRequest) {
  try {
    initializeStore()
    const data = await request.json()

    if (!data.name?.trim()) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    const client = addClient(data)
    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create client" }, { status: 500 })
  }
}
