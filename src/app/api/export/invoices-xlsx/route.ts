import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getActiveOrg } from "@/lib/server/active-org"
import { getInvoicesList } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const org = await getActiveOrg()
  const rows = await getInvoicesList(org.id)

  const wb = new ExcelJS.Workbook()
  wb.creator = "Fakturator"
  wb.created = new Date()
  const ws = wb.addWorksheet("Invoices")

  ws.columns = [
    { header: "Invoice #", key: "number", width: 18 },
    { header: "Type", key: "type", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Client", key: "client", width: 28 },
    { header: "Issue date", key: "issue", width: 14 },
    { header: "Due date", key: "due", width: 14 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Total", key: "total", width: 14 },
    { header: "Paid", key: "paid", width: 14 },
    { header: "Outstanding", key: "outstanding", width: 14 },
    { header: "Source", key: "source", width: 16 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } }

  for (const r of rows) {
    ws.addRow({
      number: r.invoiceNumber,
      type: r.type,
      status: r.status,
      client: r.clientName,
      issue: r.issueDate.slice(0, 10),
      due: r.dueDate.slice(0, 10),
      currency: r.currency,
      total: r.total,
      paid: r.paidAmount,
      outstanding: Math.max(0, r.total - r.paidAmount),
      source: r.externalSource || "",
    })
  }
  for (const col of ["H", "I", "J"]) {
    ws.getColumn(col).numFmt = "#,##0.00"
  }

  // Totals row
  const totalRow = ws.addRow({
    number: "TOTAL",
    total: rows.reduce((s, r) => s + r.total, 0),
    paid: rows.reduce((s, r) => s + r.paidAmount, 0),
    outstanding: rows.reduce((s, r) => s + Math.max(0, r.total - r.paidAmount), 0),
  })
  totalRow.font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fakturator-invoices-${date}.xlsx"`,
    },
  })
}
