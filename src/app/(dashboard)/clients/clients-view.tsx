"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Search, Users, Database, Download } from "lucide-react"
import type { ClientRow } from "@/lib/server/list-data"

function fc(v: number, currency = "EUR") {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}

export function ClientsView({ rows, defaultCurrency }: { rows: ClientRow[]; defaultCurrency: string }) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nip?.includes(q) ||
      c.contactPerson?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const totalRevenue = rows.reduce((s, c) => s + c.totalBilled, 0)
  const totalOutstanding = rows.reduce((s, c) => s + c.outstandingAmount, 0)

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clients</h1>
          <p className="text-sm text-slate-600">
            {rows.length} total · {fc(totalRevenue, defaultCurrency)} billed · {fc(totalOutstanding, defaultCurrency)} outstanding
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/export/clients" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <Link href="/clients/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New client
          </Link>
        </div>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, NIP..."
              className="pl-9"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-500">
                      <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No clients match.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/clients/${c.id}`} className="text-indigo-600 hover:underline">{c.name}</Link>
                      {c.contactPerson && <div className="text-xs text-slate-500">{c.contactPerson}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{c.nip || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-600">{c.email || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-600">{c.city ? `${c.city}, ${c.country}` : c.country}</TableCell>
                    <TableCell className="text-right">{c.invoiceCount}</TableCell>
                    <TableCell className="text-right font-medium">{fc(c.totalBilled, defaultCurrency)}</TableCell>
                    <TableCell className={`text-right ${c.outstandingAmount > 0 ? "text-rose-600 font-medium" : "text-slate-500"}`}>
                      {fc(c.outstandingAmount, defaultCurrency)}
                    </TableCell>
                    <TableCell>
                      {c.externalSource ? (
                        <Badge className="bg-slate-100 text-slate-700">{c.externalSource === "NINJA_INVOICE" ? "Ninja" : c.externalSource}</Badge>
                      ) : "—"}
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
