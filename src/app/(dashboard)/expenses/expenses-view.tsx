"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Search, Receipt, Database } from "lucide-react"
import type { ExpenseRow } from "@/lib/server/list-data"

function fc(v: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}
function fd(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function ExpensesView({ rows, defaultCurrency }: { rows: ExpenseRow[]; defaultCurrency: string }) {
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.description.toLowerCase().includes(q) ||
      r.supplierName?.toLowerCase().includes(q) ||
      r.categoryName?.toLowerCase().includes(q) ||
      r.invoiceNumber?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const totalGross = rows.reduce((s, r) => s + r.grossAmount, 0)
  const totalNet = rows.reduce((s, r) => s + r.netAmount, 0)
  const totalVat = rows.reduce((s, r) => s + r.vatAmount, 0)
  const billable = rows.filter(r => r.isBillable).length
  const rebilled = rows.filter(r => r.isRebilled).length

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-600">
            {rows.length} entries · {fc(totalGross, defaultCurrency)} gross · {billable} billable · {rebilled} rebilled
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <Link href="/expenses/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New expense
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">Total (gross)</p>
          <p className="mt-1 text-2xl font-bold">{fc(totalGross, defaultCurrency)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">Net</p>
          <p className="mt-1 text-2xl font-bold">{fc(totalNet, defaultCurrency)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">Input VAT</p>
          <p className="mt-1 text-2xl font-bold">{fc(totalVat, defaultCurrency)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description, supplier, category..." className="pl-9" />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead>Billable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-500">
                      <Receipt className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No expenses yet. Ninja didn't return any expenses for Tropos — track them here as they come in, or wire Expensify in Integrations.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-slate-600">{fd(r.date)}</TableCell>
                    <TableCell className="font-medium">
                      {r.description}
                      {r.invoiceNumber && <div className="text-xs text-slate-500">#{r.invoiceNumber}</div>}
                    </TableCell>
                    <TableCell>{r.supplierName || "—"}</TableCell>
                    <TableCell>
                      {r.categoryName ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.categoryColor }} />
                          {r.categoryName}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{fc(r.netAmount, r.currency)}</TableCell>
                    <TableCell className="text-right text-slate-500">{r.vatRate}% · {fc(r.vatAmount, r.currency)}</TableCell>
                    <TableCell className="text-right font-medium">{fc(r.grossAmount, r.currency)}</TableCell>
                    <TableCell>
                      {r.isRebilled ? <Badge className="bg-emerald-100 text-emerald-700">Rebilled{r.clientName ? ` · ${r.clientName}` : ""}</Badge>
                       : r.isBillable ? <Badge className="bg-amber-100 text-amber-700">Billable</Badge>
                       : <span className="text-xs text-slate-400">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
