import { NextRequest, NextResponse } from "next/server"
import { getActiveOrgId } from "@/lib/server/active-org"
import { getInvoicesList } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const lines = [headers.join(",")]
  for (const r of rows) {
    lines.push(headers.map(h => csvEscape(r[h])).join(","))
  }
  return lines.join("\n")
}

export async function GET(_req: NextRequest) {
  const orgId = await getActiveOrgId()
  const rows = await getInvoicesList(orgId)
  const flat = rows.map(r => ({
    invoice_number: r.invoiceNumber,
    type: r.type,
    status: r.status,
    client: r.clientName,
    issue_date: r.issueDate.slice(0, 10),
    due_date: r.dueDate.slice(0, 10),
    currency: r.currency,
    total: r.total.toFixed(2),
    paid_amount: r.paidAmount.toFixed(2),
    outstanding: Math.max(0, r.total - r.paidAmount).toFixed(2),
    source: r.externalSource || "",
  }))
  const csv = toCsv(flat)
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fakturator-invoices-${date}.csv"`,
    },
  })
}
