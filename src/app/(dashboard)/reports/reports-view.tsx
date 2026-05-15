"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { Database, TrendingUp, Users, Briefcase, FileText, Receipt, Calculator } from "lucide-react"
import type { ReportsData } from "@/lib/server/reports-data"

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#f97316", "#14b8a6"]
const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981", SENT: "#3b82f6", OVERDUE: "#ef4444", DRAFT: "#94a3b8",
  PARTIALLY_PAID: "#f59e0b", CANCELLED: "#6b7280", CORRECTED: "#8b5cf6",
}

function fc(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value)
  } catch { return `${currency} ${value.toFixed(2)}` }
}

export function ReportsView({ data }: { data: ReportsData }) {
  const { org, totals, clients, services, statusBuckets, expenseCategories, vat } = data
  const cur = org.defaultCurrency

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="text-sm text-slate-600">
            {org.name} · server-aggregated
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
      </header>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="revenue"><TrendingUp className="mr-1 h-4 w-4" />Revenue</TabsTrigger>
          <TabsTrigger value="clients"><Users className="mr-1 h-4 w-4" />Clients</TabsTrigger>
          <TabsTrigger value="services"><Briefcase className="mr-1 h-4 w-4" />Services</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="mr-1 h-4 w-4" />Invoices</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="mr-1 h-4 w-4" />Expenses</TabsTrigger>
          <TabsTrigger value="vat"><Calculator className="mr-1 h-4 w-4" />VAT</TabsTrigger>
        </TabsList>

        {/* ── Revenue ── */}
        <TabsContent value="revenue" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">Revenue (net)</p>
              <p className="mt-1 text-2xl font-bold">{fc(totals.invoicedExclVat, cur)}</p>
              <p className="mt-1 text-xs text-slate-500">incl. VAT: {fc(totals.invoicedInclVat, cur)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">Expenses (net)</p>
              <p className="mt-1 text-2xl font-bold">{fc(totals.expensesNet, cur)}</p>
              <p className="mt-1 text-xs text-slate-500">incl. VAT: {fc(totals.expensesGross, cur)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">Net profit</p>
              <p className={`mt-1 text-2xl font-bold ${totals.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {fc(totals.netProfit, cur)}
              </p>
              <p className="mt-1 text-xs text-slate-500">margin: {totals.netMarginPct.toFixed(1)}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">Receivables</p>
              <p className="mt-1 text-2xl font-bold">{fc(totals.outstanding + totals.overdue, cur)}</p>
              <p className="mt-1 text-xs text-slate-500">overdue: {fc(totals.overdue, cur)}</p>
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* ── Clients ── */}
        <TabsContent value="clients" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Revenue by client</CardTitle><CardDescription>All-time billed</CardDescription></CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={clients} dataKey="revenue" nameKey="clientName" innerRadius={50} outerRadius={90}>
                        {clients.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fc(Number(v) || 0, cur)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Client ledger</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(c => (
                      <TableRow key={c.clientId}>
                        <TableCell className="font-medium">{c.clientName}</TableCell>
                        <TableCell className="text-right">{c.invoiceCount}</TableCell>
                        <TableCell className="text-right">{fc(c.revenue, cur)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{fc(c.paidAmount, cur)}</TableCell>
                        <TableCell className={`text-right ${c.overdueAmount > 0 ? "text-rose-600" : "text-slate-500"}`}>
                          {fc(c.overdueAmount, cur)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Services ── */}
        <TabsContent value="services" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by line item</CardTitle>
              <CardDescription>Grouped by description (net amount)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={services.slice(0, 15)} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={(v) => fc(v, cur).replace(/\.\d+/, "")} />
                    <YAxis type="category" dataKey="name" width={180} fontSize={11} />
                    <Tooltip formatter={(v: any) => fc(Number(v) || 0, cur)} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Line item</TableHead>
                    <TableHead className="text-right">Invoice count</TableHead>
                    <TableHead className="text-right">Revenue (net)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map(s => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.invoiceCount}</TableCell>
                      <TableCell className="text-right">{fc(s.revenue, cur)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invoices ── */}
        <TabsContent value="invoices" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle>Status breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBuckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="status" />
                      <YAxis tickFormatter={(v) => fc(v, cur).replace(/\.\d+/, "")} />
                      <Tooltip formatter={(v: any) => fc(Number(v) || 0, cur)} />
                      <Bar dataKey="total">
                        {statusBuckets.map(s => (
                          <Cell key={s.status} fill={STATUS_COLORS[s.status] || "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusBuckets.map(s => (
                      <TableRow key={s.status}>
                        <TableCell>
                          <Badge style={{ backgroundColor: (STATUS_COLORS[s.status] || "#94a3b8") + "22", color: STATUS_COLORS[s.status] || "#475569" }}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                        <TableCell className="text-right">{fc(s.total, cur)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{fc(s.paidAmount, cur)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expenses ── */}
        <TabsContent value="expenses" className="space-y-4 pt-4">
          <Card>
            <CardHeader><CardTitle>Expenses by category</CardTitle></CardHeader>
            <CardContent>
              {expenseCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No expenses recorded yet. Ninja didn't return any expenses — add them in the Expenses tab or import via Expensify.
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expenseCategories} dataKey="total" nameKey="categoryName" innerRadius={50} outerRadius={90}>
                          {expenseCategories.map(c => <Cell key={c.categoryId} fill={c.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fc(Number(v) || 0, cur)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseCategories.map(c => (
                        <TableRow key={c.categoryId}>
                          <TableCell className="flex items-center gap-2 font-medium">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.categoryName}
                          </TableCell>
                          <TableCell className="text-right">{c.count}</TableCell>
                          <TableCell className="text-right">{fc(c.total, cur)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── VAT ── */}
        <TabsContent value="vat" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">Output VAT</p>
              <p className="mt-1 text-2xl font-bold">{fc(vat.totals.outputVat, cur)}</p>
              <p className="mt-1 text-xs text-slate-500">collected on sales</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">Input VAT</p>
              <p className="mt-1 text-2xl font-bold">{fc(vat.totals.inputVat, cur)}</p>
              <p className="mt-1 text-xs text-slate-500">paid on expenses</p>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <p className="text-sm text-slate-600">VAT due</p>
              <p className={`mt-1 text-2xl font-bold ${vat.totals.vatDue >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {fc(vat.totals.vatDue, cur)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{vat.totals.vatDue >= 0 ? "to remit" : "refundable"}</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>VAT by rate</CardTitle>
              <CardDescription>For JPK_V7 monthly reporting (Phase 3)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Output net</TableHead>
                    <TableHead className="text-right">Output VAT</TableHead>
                    <TableHead className="text-right">Input net</TableHead>
                    <TableHead className="text-right">Input VAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vat.buckets.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-slate-500">
                      No VAT data yet. Your Ninja invoices have 0% VAT (foreign B2B exempt).
                    </TableCell></TableRow>
                  )}
                  {vat.buckets.map(b => (
                    <TableRow key={b.rate}>
                      <TableCell className="font-medium">{b.rate}%</TableCell>
                      <TableCell className="text-right">{fc(b.outputNet, cur)}</TableCell>
                      <TableCell className="text-right">{fc(b.outputVat, cur)}</TableCell>
                      <TableCell className="text-right">{fc(b.inputNet, cur)}</TableCell>
                      <TableCell className="text-right">{fc(b.inputVat, cur)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
