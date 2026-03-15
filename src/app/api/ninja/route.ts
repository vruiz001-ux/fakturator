import { NextRequest, NextResponse } from "next/server"
import { testConnection, fetchClients, fetchInvoices, fetchProducts, fetchPayments } from "@/services/ninja/ninja.service"

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

    if (action === "fetch") {
      // Fetch raw data from Ninja — client will do the mapping and store insertion
      const opts = {
        importClients: true,
        importInvoices: true,
        importProducts: true,
        importPayments: true,
        ...options,
      }

      const [clients, invoices, products, payments] = await Promise.all([
        opts.importClients ? fetchClients(config) : Promise.resolve([]),
        opts.importInvoices ? fetchInvoices(config) : Promise.resolve([]),
        opts.importProducts ? fetchProducts(config) : Promise.resolve([]),
        opts.importPayments ? fetchPayments(config) : Promise.resolve([]),
      ])

      return NextResponse.json({
        success: true,
        data: { clients, invoices, products, payments },
      })
    }

    return NextResponse.json({ error: "Unknown action. Use 'test' or 'fetch'." }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
