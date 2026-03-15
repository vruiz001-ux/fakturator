import { NextRequest, NextResponse } from "next/server"
import { getInvoices, addInvoice, initializeStore } from "@/lib/store/data-store"

export async function GET(request: NextRequest) {
  initializeStore()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")?.toLowerCase()

  let invoices = getInvoices()
  if (status && status !== "ALL") {
    invoices = invoices.filter((inv) => inv.status === status)
  }
  if (search) {
    invoices = invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.client?.name.toLowerCase().includes(search)
    )
  }

  return NextResponse.json({ data: invoices, total: invoices.length })
}

export async function POST(request: NextRequest) {
  try {
    initializeStore()
    const data = await request.json()

    if (!data.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 })
    }
    if (!data.dueDate) {
      return NextResponse.json({ error: "dueDate is required" }, { status: 400 })
    }
    if (!data.items?.length) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 })
    }

    const invoice = addInvoice(data)
    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create invoice" }, { status: 500 })
  }
}
