import { NextRequest, NextResponse } from "next/server"
import { getActiveOrgId } from "@/lib/server/active-org"
import { getClientsList } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(_req: NextRequest) {
  const orgId = await getActiveOrgId()
  const rows = await getClientsList(orgId)
  const flat = rows.map(r => ({
    name: r.name,
    email: r.email || "",
    phone: r.phone || "",
    city: r.city || "",
    country: r.country,
    nip: r.nip || "",
    contact_person: r.contactPerson || "",
    active: r.isActive ? "yes" : "no",
    invoices: r.invoiceCount,
    total_billed: r.totalBilled.toFixed(2),
    outstanding: r.outstandingAmount.toFixed(2),
    source: r.externalSource || "",
  }))
  const headers = Object.keys(flat[0] || {})
  const csv = [
    headers.join(","),
    ...flat.map(r => headers.map(h => csvEscape((r as any)[h])).join(",")),
  ].join("\n")
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fakturator-clients-${date}.csv"`,
    },
  })
}
