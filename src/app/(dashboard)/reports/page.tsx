"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getInvoices, getExpenses, getClients, getServices, getStats, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/formatters"
import { TrendingUp, Users, Briefcase, FileText, DollarSign, BarChart3 } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"]

export default function ReportsPage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const invoices = getInvoices()
  const expenses = getExpenses()
  const clients = getClients()
  const services = getServices()
  const stats = getStats()

  // Compute revenue by client
  const revenueByClient = useMemo(() => {
    const map = new Map<string, { clientId: string; clientName: string; revenue: number; invoiceCount: number; paidAmount: number; overdueAmount: number }>()
    for (const inv of invoices) {
      const cid = inv.clientId
      const existing = map.get(cid) || { clientId: cid, clientName: inv.client?.name || "Unknown", revenue: 0, invoiceCount: 0, paidAmount: 0, overdueAmount: 0 }
      existing.revenue += inv.total
      existing.invoiceCount++
      existing.paidAmount += inv.paidAmount
      if (inv.status === "OVERDUE") existing.overdueAmount += inv.total - inv.paidAmount
      map.set(cid, existing)
    }
    return Array.from(map.values())
  }, [invoices])

  // Compute revenue by service
  const revenueByService = useMemo(() => {
    const map = new Map<string, { serviceId: string; serviceName: string; revenue: number; invoiceCount: number }>()
    for (const inv of invoices) {
      for (const item of inv.items) {
        const sid = item.serviceId || item.description
        const existing = map.get(sid) || { serviceId: sid, serviceName: item.description, revenue: 0, invoiceCount: 0 }
        existing.revenue += item.netAmount
        existing.invoiceCount++
        map.set(sid, existing)
      }
    }
    return Array.from(map.values())
  }, [invoices])

  // Invoice status breakdown
  const invoiceStatusBreakdown = useMemo(() => {
    const map = new Map<string, { status: string; count: number; total: number }>()
    for (const inv of invoices) {
      const existing = map.get(inv.status) || { status: inv.status, count: 0, total: 0 }
      existing.count++
      existing.total += inv.total
      map.set(inv.status, existing)
    }
    return Array.from(map.values())
  }, [invoices])

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { categoryId: string; categoryName: string; color: string; total: number }>()
    for (const exp of expenses) {
      const cid = exp.categoryId || "uncategorized"
      const existing = map.get(cid) || { categoryId: cid, categoryName: exp.category?.name || "Uncategorized", color: exp.category?.color || "#94a3b8", total: 0 }
      existing.total += exp.grossAmount
      map.set(cid, existing)
    }
    return Array.from(map.values())
  }, [expenses])

  // Revenue by month
  const profitData = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; expenses: number; profit: number }>()
    for (const inv of invoices) {
      const date = new Date(inv.issueDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleString("default", { month: "short" })
      const existing = map.get(key) || { name: label, revenue: 0, expenses: 0, profit: 0 }
      existing.revenue += inv.total
      map.set(key, existing)
    }
    for (const exp of expenses) {
      const date = new Date(exp.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleString("default", { month: "short" })
      const existing = map.get(key) || { name: label, revenue: 0, expenses: 0, profit: 0 }
      existing.expenses += exp.grossAmount
      map.set(key, existing)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, profit: v.revenue - v.expenses }))
  }, [invoices, expenses])

  // VAT summary
  const vatSummary = useMemo(() => {
    const outputVat = invoices.reduce((s, i) => s + i.vatTotal, 0)
    const inputVat = expenses.reduce((s, e) => s + e.vatAmount, 0)
    const byRateMap = new Map<number, { rate: number; output: number; input: number }>()
    for (const inv of invoices) {
      for (const item of inv.items) {
        const existing = byRateMap.get(item.vatRate) || { rate: item.vatRate, output: 0, input: 0 }
        existing.output += item.vatAmount
        byRateMap.set(item.vatRate, existing)
      }
    }
    for (const exp of expenses) {
      const existing = byRateMap.get(exp.vatRate) || { rate: exp.vatRate, output: 0, input: 0 }
      existing.input += exp.vatAmount
      byRateMap.set(exp.vatRate, existing)
    }
    return {
      outputVat,
      inputVat,
      vatDue: outputVat - inputVat,
      byRate: Array.from(byRateMap.values()).sort((a, b) => b.rate - a.rate),
    }
  }, [invoices, expenses])

  const hasData = invoices.length > 0 || expenses.length > 0

  if (!hasData) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <BarChart3 className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">Not enough data for reports</h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              Create invoices and record expenses to see your business reports and analytics here.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="tax">VAT Summary</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalInvoiced)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Expenses</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalExpenses)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Net Profit</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.netIncome)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {profitData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue vs Expenses vs Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Revenue by Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByClient.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueByClient.sort((a, b) => b.revenue - a.revenue).map((client) => (
                    <TableRow key={client.clientId}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell className="font-semibold text-indigo-600">{formatCurrency(client.revenue)}</TableCell>
                      <TableCell>{client.invoiceCount}</TableCell>
                      <TableCell className="text-emerald-600">{formatCurrency(client.paidAmount)}</TableCell>
                      <TableCell>
                        {client.overdueAmount > 0 ? (
                          <span className="text-red-600 font-medium">{formatCurrency(client.overdueAmount)}</span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              ) : (
                <p className="text-center text-sm text-slate-400 py-8">No client revenue data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                Revenue by Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByService.length > 0 ? (
              <>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByService} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                    <YAxis dataKey="serviceName" type="category" width={150} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Avg Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueByService.sort((a, b) => b.revenue - a.revenue).map((svc) => (
                    <TableRow key={svc.serviceId}>
                      <TableCell className="font-medium">{svc.serviceName}</TableCell>
                      <TableCell className="font-semibold text-indigo-600">{formatCurrency(svc.revenue)}</TableCell>
                      <TableCell>{svc.invoiceCount}</TableCell>
                      <TableCell>{formatCurrency(svc.invoiceCount > 0 ? svc.revenue / svc.invoiceCount : 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </>
              ) : (
                <p className="text-center text-sm text-slate-400 py-8">No service revenue data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Invoice Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceStatusBreakdown.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoiceStatusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }: any) => `${name}: ${value}`}
                      >
                        {invoiceStatusBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => String(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {invoiceStatusBreakdown.map((item, i) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{item.count} invoices</p>
                        <p className="text-sm text-slate-500">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              ) : (
                <p className="text-center text-sm text-slate-400 py-8">No invoice data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name }: any) => name}
                      >
                        {expensesByCategory.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {expensesByCategory.map((cat) => (
                    <div key={cat.categoryId} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium text-slate-700">{cat.categoryName}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              ) : (
                <p className="text-center text-sm text-slate-400 py-8">No expense data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAT Tab */}
        <TabsContent value="tax">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">VAT Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <span className="text-sm text-slate-600">Output VAT (sales)</span>
                  <span className="font-semibold">{formatCurrency(vatSummary.outputVat)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <span className="text-sm text-slate-600">Input VAT (purchases)</span>
                  <span className="font-semibold text-emerald-600">-{formatCurrency(vatSummary.inputVat)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-indigo-50 p-4">
                  <span className="font-medium text-indigo-700">VAT Due</span>
                  <span className="text-lg font-bold text-indigo-700">{formatCurrency(vatSummary.vatDue)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">VAT by Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {vatSummary.byRate.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rate</TableHead>
                      <TableHead>Output</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vatSummary.byRate.map((row) => (
                      <TableRow key={row.rate}>
                        <TableCell className="font-medium">{row.rate}%</TableCell>
                        <TableCell>{formatCurrency(row.output)}</TableCell>
                        <TableCell className="text-emerald-600">{formatCurrency(row.input)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(row.output - row.input)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                ) : (
                  <p className="text-center text-sm text-slate-400 py-8">No VAT data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
