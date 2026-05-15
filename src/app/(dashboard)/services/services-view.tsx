"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Search, Briefcase, Database } from "lucide-react"
import type { ServiceRow } from "@/lib/server/list-data"

function fc(v: number | null, currency = "EUR") {
  if (v == null) return "—"
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}

export function ServicesView({ rows, defaultCurrency }: { rows: ServiceRow[]; defaultCurrency: string }) {
  const [search, setSearch] = useState("")
  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Services</h1>
          <p className="text-sm text-slate-600">
            {rows.length} reusable items in your library
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <Link href="/services/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New service
        </Link>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, description, category..." className="pl-9" />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Used in</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                      <Briefcase className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No services match.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link href={`/services/${s.id}`} className="text-indigo-600 hover:underline">{s.name}</Link>
                      {s.description && <div className="text-xs text-slate-500 line-clamp-1">{s.description}</div>}
                    </TableCell>
                    <TableCell>{s.category || "—"}</TableCell>
                    <TableCell className="text-sm">{s.defaultUnit}</TableCell>
                    <TableCell className="text-right">{fc(s.defaultRate, defaultCurrency)}</TableCell>
                    <TableCell className="text-right">{s.defaultVatRate}%</TableCell>
                    <TableCell className="text-right">{s.usageCount} invoice{s.usageCount === 1 ? "" : "s"}</TableCell>
                    <TableCell>
                      {s.externalSource ? (
                        <Badge className="bg-slate-100 text-slate-700">{s.externalSource === "NINJA_INVOICE" ? "Ninja" : s.externalSource}</Badge>
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
