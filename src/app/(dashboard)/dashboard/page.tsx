"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
  PieChartIcon,
  Receipt,
  Wallet,
  Activity,
  Plus,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

import {
  getInvoices,
  getExpenses,
  getPayments,
  getClients,
  getStats,
  getExpenseCategories,
  getDisplayCurrency,
  setDisplayCurrency,
  fixInvoiceCurrencies,
  deduplicateInvoices,
  initializeStore,
  isInitialized,
  subscribe,
} from "@/lib/store/data-store"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/formatters"

// ─── Chart Colors ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981",
  SENT: "#3b82f6",
  OVERDUE: "#ef4444",
  DRAFT: "#94a3b8",
  PARTIALLY_PAID: "#f59e0b",
  CANCELLED: "#6b7280",
  CORRECTED: "#8b5cf6",
}

const EXPENSE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#f97316", "#14b8a6"]

const CHART_GRADIENT_ID = "revenueGradient"

// ─── Helpers ───────────────────────────────────────────────

function daysUntilDue(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Custom Tooltip ────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="mb-1 text-sm font-medium text-slate-900">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, "EUR")}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-sm font-medium text-slate-900">{data.name}</p>
      <p className="text-sm text-slate-600">{formatCurrency(data.value, "EUR")}</p>
    </div>
  )
}

// ─── Empty Chart Placeholder ──────────────────────────────

function EmptyChart({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────

export default function DashboardPage() {
  // Initialize store, fix currencies, deduplicate
  useEffect(() => {
    if (!isInitialized()) {
      initializeStore()
    }
    fixInvoiceCurrencies("EUR")
    deduplicateInvoices()
  }, [])

  const [, forceUpdate] = useState(0)
  useEffect(() => {
    return subscribe(() => forceUpdate((n) => n + 1))
  }, [])

  // Pull data from store
  const invoices = getInvoices()
  const expenses = getExpenses()
  const payments = getPayments()
  const clients = getClients()
  const stats = getStats()
  const expenseCategories = getExpenseCategories()

  const hasData = invoices.length > 0

  // Currency display with live FX conversion
  const displayCurrency = getDisplayCurrency()
  const [fxRates, setFxRates] = useState<Record<string, number>>({
    EUR: 1, PLN: 4.2675, USD: 1.1476, GBP: 0.86503, CHF: 0.9034,
  })
  const [fxSource, setFxSource] = useState<string>("LOADING")
  const [fxDate, setFxDate] = useState<string>("")

  // Fetch live FX rates from ECB via our API
  useEffect(() => {
    fetch("/api/fx")
      .then((r) => r.json())
      .then((data) => {
        if (data.rates && Object.keys(data.rates).length > 1) {
          setFxRates(data.rates)
          setFxSource(data.source || "ECB")
          setFxDate(data.date || "")
        }
      })
      .catch(() => { setFxSource("FALLBACK") })
  }, [])

  // Convert amount from source currency to display currency using live ECB rates
  // ECB rates are EUR-based: rates[X] = how many X per 1 EUR
  // To convert A units of FROM to TO: A * (rates[TO] / rates[FROM])
  const convert = (amount: number, fromCurrency?: string) => {
    const from = fromCurrency || "EUR"
    if (from === displayCurrency) return amount
    const fromRate = fxRates[from]
    const toRate = fxRates[displayCurrency]
    if (!fromRate || !toRate) return amount // Can't convert — show original
    const rate = toRate / fromRate
    return Math.round(amount * rate * 100) / 100
  }

  // Current conversion rate for display
  const currentFxRate = displayCurrency !== "EUR"
    ? (fxRates[displayCurrency] || 0) / (fxRates["EUR"] || 1)
    : 1

  const fc = (amount: number, fromCurrency?: string) =>
    formatCurrency(convert(amount, fromCurrency), displayCurrency)

  // ─── Converted Stats ─────────────────────────────────────

  // Recompute stats with FX conversion
  const totalRevenue = invoices.reduce((s, i) => s + convert(i.subtotal, i.currency), 0)
  const totalInvoiced = invoices.reduce((s, i) => s + convert(i.total, i.currency), 0)
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + convert(i.total, i.currency), 0)
  const totalUnpaid = invoices.filter(i => ["SENT", "DRAFT", "PARTIALLY_PAID"].includes(i.status)).reduce((s, i) => s + convert(i.total - i.paidAmount, i.currency), 0)
  const totalOverdue = invoices.filter(i => i.status === "OVERDUE").reduce((s, i) => s + convert(i.total - i.paidAmount, i.currency), 0)
  const totalExpenses = expenses.reduce((s, e) => s + convert(e.grossAmount, e.currency), 0)
  const netIncome = totalPaid - totalExpenses
  const avgInvoiceValue = invoices.length > 0 ? totalInvoiced / invoices.length : 0

  // ─── Computed Data ───────────────────────────────────────

  // Revenue by month
  const revenueByMonth = Object.entries(
    invoices.reduce((acc: Record<string, { revenue: number; expenses: number }>, inv) => {
      const key = new Date(inv.issueDate).toLocaleString("en", { month: "short", year: "numeric" })
      if (!acc[key]) acc[key] = { revenue: 0, expenses: 0 }
      acc[key].revenue += convert(inv.subtotal, inv.currency)
      return acc
    }, {})
  ).map(([month, data]) => {
    expenses.forEach((exp) => {
      const expKey = new Date(exp.date).toLocaleString("en", { month: "short", year: "numeric" })
      if (expKey === month) {
        data.expenses += convert(exp.grossAmount, exp.currency)
      }
    })
    return { month, ...data, profit: data.revenue - data.expenses }
  })

  // Invoice status breakdown (converted)
  const statusBreakdown = Object.entries(
    invoices.reduce((acc: Record<string, { count: number; total: number }>, inv) => {
      if (!acc[inv.status]) acc[inv.status] = { count: 0, total: 0 }
      acc[inv.status].count++
      acc[inv.status].total += convert(inv.total, inv.currency)
      return acc
    }, {})
  ).map(([status, data]) => ({ status, ...data }))

  const statusPieData = statusBreakdown.map((s) => ({
    name: getStatusLabel(s.status),
    value: s.total,
    status: s.status,
    count: s.count,
  }))

  // Revenue by service (converted)
  const serviceBarData = Object.entries(
    invoices.reduce((acc: Record<string, { revenue: number; count: number }>, inv) => {
      inv.items.forEach((item) => {
        const name = item.service?.name || item.description || "Other"
        if (!acc[name]) acc[name] = { revenue: 0, count: 0 }
        acc[name].revenue += convert(item.netAmount, inv.currency)
        acc[name].count++
      })
      return acc
    }, {})
  )
    .map(([name, data]) => ({
      name: name.length > 16 ? name.slice(0, 14) + "..." : name,
      revenue: data.revenue,
      count: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // Expenses by category (converted)
  const expensePieData = Object.entries(
    expenses.reduce((acc: Record<string, { total: number; count: number; categoryId: string }>, exp) => {
      const catId = exp.categoryId || "uncategorized"
      const cat = expenseCategories.find((c) => c.id === catId)
      const name = cat?.name || exp.category?.name || "Uncategorized"
      if (!acc[name]) acc[name] = { total: 0, count: 0, categoryId: catId }
      acc[name].total += convert(exp.grossAmount, exp.currency)
      acc[name].count++
      return acc
    }, {})
  ).map(([name, data], i) => {
    const cat = expenseCategories.find((c) => c.id === data.categoryId)
    return {
      name,
      value: data.total,
      color: cat?.color || EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }
  })

  // Top clients (converted)
  const topClients = Object.entries(
    invoices.reduce(
      (acc: Record<string, { clientId: string; clientName: string; revenue: number; invoiceCount: number; paidAmount: number; overdueAmount: number }>, inv) => {
        const cid = inv.clientId
        const cname = inv.client?.name || clients.find((c) => c.id === cid)?.name || "Unknown"
        if (!acc[cid]) acc[cid] = { clientId: cid, clientName: cname, revenue: 0, invoiceCount: 0, paidAmount: 0, overdueAmount: 0 }
        acc[cid].revenue += convert(inv.total, inv.currency)
        acc[cid].invoiceCount++
        if (inv.status === "PAID") acc[cid].paidAmount += convert(inv.total, inv.currency)
        if (inv.status === "OVERDUE") acc[cid].overdueAmount += convert(inv.total - inv.paidAmount, inv.currency)
        return acc
      },
      {}
    )
  )
    .map(([, data]) => data)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Recent payments
  const recentPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4)

  // Upcoming due dates
  const now = new Date()
  const upcomingInvoices = invoices
    .filter((inv) => (inv.status === "SENT" || inv.status === "DRAFT") && new Date(inv.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)

  // KPI calculations (using converted totals from above)
  const previousMonthRevenue = revenueByMonth.length >= 2 ? revenueByMonth[revenueByMonth.length - 2]?.revenue ?? 0 : 0
  const currentMonthRevenue = revenueByMonth.length >= 1 ? revenueByMonth[revenueByMonth.length - 1]?.revenue ?? 0 : 0
  const revenueTrend = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : 0
  const revenueTrendUp = revenueTrend >= 0
  const unpaidCount = invoices.filter((i) => ["SENT", "DRAFT", "PARTIALLY_PAID"].includes(i.status)).length

  // VAT summary (converted)
  const outputVat = invoices.reduce((s, i) => s + convert(i.vatTotal, i.currency), 0)
  const inputVat = expenses.reduce((s, e) => s + convert(e.vatAmount, e.currency), 0)
  const vatDue = outputVat - inputVat

  // ─── Empty State ────────────────────────────────────────

  if (!hasData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Your financial overview</p>
        </div>

        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <FileText className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900">
              Welcome to Fakturator
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Create your first invoice to see your dashboard come alive.
              All your revenue, expenses, and client data will appear here.
            </p>
            <Link
              href="/invoices/new"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Main Dashboard ─────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Page Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          {displayCurrency !== "EUR" && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-mono text-slate-600">1 EUR = {currentFxRate.toFixed(4)} {displayCurrency}</p>
              <p className="text-[10px] text-slate-400">
                {fxSource === "ECB" ? "ECB" : fxSource === "LOADING" ? "Loading..." : "Fallback"}{fxDate ? ` · ${fxDate}` : ""}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Display</span>
            <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v)}>
              <SelectTrigger className="w-24 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR €</SelectItem>
                <SelectItem value="PLN">PLN zł</SelectItem>
                <SelectItem value="USD">USD $</SelectItem>
                <SelectItem value="GBP">GBP £</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── KPI Cards Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                <DollarSign className="h-5 w-5 text-indigo-600" />
              </div>
              {revenueByMonth.length >= 2 && (
                <Badge
                  variant={revenueTrendUp ? "success" : "destructive"}
                  className="flex items-center gap-0.5"
                >
                  {revenueTrendUp ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(revenueTrend).toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {fc(totalRevenue)}
              </p>
              {revenueByMonth.length >= 2 && (
                <p className="mt-1 text-xs text-slate-400">
                  vs {fc(previousMonthRevenue)} last month
                </p>
              )}
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-indigo-300" />
        </Card>

        {/* Outstanding Receivables */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <Badge variant="warning">
                {unpaidCount} unpaid
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Outstanding Receivables</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {fc(totalUnpaid)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Across {unpaidCount + stats.overdueCount} invoices
              </p>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500 to-amber-300" />
        </Card>

        {/* Paid Invoices */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <Badge variant="success">{stats.paidRatio.toFixed(0)}%</Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Paid Invoices</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {stats.paidCount} / {stats.invoiceCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {fc(totalPaid)} collected
              </p>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-300" />
        </Card>

        {/* Overdue Amount */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <Badge variant="destructive">
                {stats.overdueCount} overdue
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">Overdue Amount</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {fc(totalOverdue)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {stats.overdueRatio.toFixed(0)}% of total invoiced
              </p>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-300" />
        </Card>
      </div>

      {/* ── Charts Row 1: Revenue Trend + Invoice Status ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Revenue Trend
                </CardTitle>
                <CardDescription className="mt-1">Monthly revenue, expenses & profit</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{fc(netIncome)}</p>
                <p className="text-xs text-slate-500">Net income</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={48}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill={`url(#${CHART_GRADIENT_ID})`}
                      dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fill="url(#expenseGradient)"
                      dot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No revenue data yet" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-indigo-500" />
              Invoice Status
            </CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusPieData.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {statusPieData.map((entry) => (
                    <div key={entry.status} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[entry.status] || "#94a3b8" }}
                        />
                        <span className="text-slate-600">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{entry.count}</span>
                        <span className="font-medium text-slate-900">{fc(entry.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52">
                <EmptyChart message="No invoice data yet" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Revenue by Service + Expense Breakdown ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Revenue by Service
            </CardTitle>
            <CardDescription>Net revenue per service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {serviceBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceBarData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={48}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No service data yet" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-500" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>
              Total expenses: {fc(totalExpenses)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expensePieData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {expensePieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {expensePieData.map((entry, i) => {
                    const pct = totalExpenses > 0 ? ((entry.value / totalExpenses) * 100).toFixed(1) : "0.0"
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-slate-600">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{pct}%</span>
                          <span className="font-medium text-slate-900">{fc(entry.value)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="h-52">
                <EmptyChart message="No expense data yet" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Clients Table ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            Top Clients by Revenue
          </CardTitle>
          <CardDescription>Top 5 clients ranked by total revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {topClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Collection Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client, i) => {
                  const collectionRate =
                    client.paidAmount + client.overdueAmount > 0
                      ? ((client.paidAmount / (client.paidAmount + client.overdueAmount)) * 100)
                      : client.revenue > 0 ? 0 : 0
                  return (
                    <TableRow key={client.clientId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                            {i + 1}
                          </div>
                          <span className="font-medium text-slate-900">{client.clientName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {fc(client.revenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{client.invoiceCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {fc(client.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.overdueAmount > 0 ? (
                          <span className="font-medium text-red-600">
                            {fc(client.overdueAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(collectionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            {collectionRate.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              No client data yet. Create invoices to see your top clients.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Payments + Upcoming Due Dates ──────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              Recent Payments
            </CardTitle>
            <CardDescription>Latest received payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => {
                  const invoice = invoices.find((inv) => inv.id === payment.invoiceId)
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {payment.reference || invoice?.invoiceNumber || "Payment"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {invoice?.client?.name ?? "Unknown"} &middot; {formatRelativeDate(payment.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          +{fc(payment.amount)}
                        </p>
                        <p className="text-xs text-slate-400">{formatDate(payment.date)}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">
                  No payments recorded yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Due Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Upcoming Due Dates
            </CardTitle>
            <CardDescription>Invoices due soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingInvoices.length > 0 ? (
                upcomingInvoices.map((inv) => {
                  const days = daysUntilDue(inv.dueDate)
                  const isUrgent = days <= 3
                  const isPast = days < 0
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            isPast
                              ? "bg-red-100"
                              : isUrgent
                              ? "bg-amber-100"
                              : "bg-blue-100"
                          }`}
                        >
                          <Clock
                            className={`h-4 w-4 ${
                              isPast
                                ? "text-red-600"
                                : isUrgent
                                ? "text-amber-600"
                                : "text-blue-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{inv.invoiceNumber}</p>
                          <p className="text-xs text-slate-400">
                            {inv.client?.name ?? clients.find((c) => c.id === inv.clientId)?.name ?? "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {fc(inv.total)}
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-slate-400">
                            {formatDate(inv.dueDate)}
                          </span>
                          <Badge
                            variant={isPast ? "destructive" : isUrgent ? "warning" : "secondary"}
                            className="text-[10px]"
                          >
                            {isPast
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                              ? "Due today"
                              : `${days}d left`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">
                  No upcoming invoices due.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Stats Row (Secondary KPIs) ──────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                <Receipt className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Avg Invoice</p>
                <p className="text-lg font-bold text-slate-900">
                  {fc(avgInvoiceValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Paid Ratio</p>
                <p className="text-lg font-bold text-emerald-600">{stats.paidRatio.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Total Invoices</p>
                <p className="text-lg font-bold text-slate-900">{stats.invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                <DollarSign className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Net Income</p>
                <p className="text-lg font-bold text-slate-900">
                  {fc(netIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
                <TrendingDown className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">VAT Due</p>
                <p className="text-lg font-bold text-rose-600">
                  {formatCurrency(vatDue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
