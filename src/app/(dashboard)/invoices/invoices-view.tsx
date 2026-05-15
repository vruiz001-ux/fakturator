"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Search, ArrowUpDown, FileText, Database, Download } from "lucide-react"
import type { InvoiceRow } from "@/lib/server/list-data"

const STATUS_TABS = ["ALL", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const
const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981", SENT: "#3b82f6", OVERDUE: "#ef4444",
  DRAFT: "#94a3b8", PARTIALLY_PAID: "#f59e0b", CANCELLED: "#6b7280", CORRECTED: "#8b5cf6",
}

function fc(value: number, currency: string): string {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}
function fd(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

type SortField = "issueDate" | "dueDate" | "total" | "invoiceNumber"
type SortOrder = "asc" | "desc"

export function InvoicesView({ rows }: { rows: InvoiceRow[] }) {
  const [tab, setTab] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({ field: "issueDate", order: "desc" })

  const filtered = useMemo(() => {
    let out = rows
    if (tab !== "ALL") out = out.filter(r => r.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(r =>
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q)
      )
    }
    out = [...out].sort((a, b) => {
      const dir = sort.order === "asc" ? 1 : -1
      if (sort.field === "total") return (a.total - b.total) * dir
      if (sort.field === "invoiceNumber") return a.invoiceNumber.localeCompare(b.invoiceNumber) * dir
      return (new Date(a[sort.field]).getTime() - new Date(b[sort.field]).getTime()) * dir
    })
    return out
  }, [rows, tab, search, sort])

  function toggleSort(field: SortField) {
    setSort(s => s.field === field ? { field, order: s.order === "asc" ? "desc" : "asc" } : { field, order: "desc" })
  }

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length }
    for (const t of STATUS_TABS) if (t !== "ALL") out[t] = rows.filter(r => r.status === t).length
    return out
  }, [rows])

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-600">
            {rows.length} total
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export/invoices" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <Link href="/invoices/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        </div>
      </header>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              tab === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")} <span className="ml-1 opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search number or client..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => toggleSort("invoiceNumber")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Number <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("issueDate")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Issued <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => toggleSort("dueDate")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Due <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button onClick={() => toggleSort("total")} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-500">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No invoices match.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(inv => {
                  const overdue = inv.status !== "PAID" && new Date(inv.dueDate) < new Date()
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                        {inv.externalSource && (
                          <span className="ml-2 text-xs text-slate-400">{inv.externalSource === "NINJA_INVOICE" ? "Ninja" : inv.externalSource}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{inv.type}</TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell className="text-sm text-slate-600">{fd(inv.issueDate)}</TableCell>
                      <TableCell className={`text-sm ${overdue ? "text-rose-600 font-medium" : "text-slate-600"}`}>
                        {fd(inv.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fc(inv.total, inv.currency)}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: (STATUS_COLORS[inv.status] || "#94a3b8") + "22", color: STATUS_COLORS[inv.status] || "#475569" }}>
                          {inv.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/invoices/${inv.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
