"use client"

// Client-side renderer for the dashboard. Receives data from RSC parent.
// All charts + interactivity here; zero localStorage reads.

import Link from "next/link"
import {
  DollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
  Database,
  Calendar,
  Receipt,
  Users,
  Calculator,
  Trophy,
  TrendingDown,
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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import type { DashboardData } from "@/lib/server/dashboard-data"

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981",
  SENT: "#3b82f6",
  OVERDUE: "#ef4444",
  DRAFT: "#94a3b8",
  PARTIALLY_PAID: "#f59e0b",
  CANCELLED: "#6b7280",
  CORRECTED: "#8b5cf6",
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  CORRECTED: "Corrected",
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-")
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function RevenueTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="mb-1 text-sm font-medium text-slate-900">{formatMonthLabel(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatMoney(entry.value, currency)}
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload, currency }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-sm font-medium text-slate-900">{STATUS_LABELS[data.name] || data.name}</p>
      <p className="text-sm text-slate-600">{formatMoney(data.value, currency)}</p>
    </div>
  )
}

interface KpiTileProps {
  title: string
  value: string
  count?: number
  icon: React.ElementType
  tint: string
  hint?: string
}

function KpiTile({ title, value, count, icon: Icon, tint, hint }: KpiTileProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            {(hint || typeof count === "number") && (
              <p className="mt-1 text-xs text-slate-500">
                {typeof count === "number" ? `${count} invoice${count === 1 ? "" : "s"}` : ""}{hint ? ` · ${hint}` : ""}
              </p>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView({ data }: { data: DashboardData }) {
  const { org, kpis, extended, revenueTrend, statusBreakdown, topServices, recentInvoices, agingBuckets, topPayers, worstPayers } = data
  const currency = org.defaultCurrency

  const totalRevenue12m = revenueTrend.reduce((s, r) => s + r.revenue, 0)
  const totalExpenses12m = revenueTrend.reduce((s, r) => s + r.expenses, 0)
  const netMargin12m = totalRevenue12m > 0 ? ((totalRevenue12m - totalExpenses12m) / totalRevenue12m) * 100 : 0

  const overdueRecent = recentInvoices.filter(i => i.status === "OVERDUE")

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            {org.name} · live data from the database
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New invoice
        </Link>
      </header>

      {/* Primary KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          title="Total invoiced"
          value={formatMoney(kpis.totalInvoiced, currency)}
          count={kpis.countInvoiced}
          icon={FileText}
          tint="bg-indigo-50 text-indigo-600"
        />
        <KpiTile
          title="Outstanding"
          value={formatMoney(kpis.totalUnpaid, currency)}
          count={kpis.countUnpaid}
          icon={Clock}
          tint="bg-amber-50 text-amber-600"
        />
        <KpiTile
          title="Paid"
          value={formatMoney(kpis.totalPaid, currency)}
          count={kpis.countPaid}
          icon={CheckCircle2}
          tint="bg-emerald-50 text-emerald-600"
        />
        <KpiTile
          title="Overdue"
          value={formatMoney(kpis.totalOverdue, currency)}
          count={kpis.countOverdue}
          icon={AlertCircle}
          tint="bg-rose-50 text-rose-600"
          hint={kpis.countOverdue > 0 ? "needs chase" : "all clear"}
        />
      </div>

      {/* Extended KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          title={`YTD ${new Date().getFullYear()}`}
          value={formatMoney(extended.ytdRevenue, currency)}
          count={extended.ytdInvoices}
          icon={Calendar}
          tint="bg-violet-50 text-violet-600"
        />
        <KpiTile
          title="This month"
          value={formatMoney(extended.monthRevenue, currency)}
          count={extended.monthInvoices}
          icon={TrendingUp}
          tint="bg-sky-50 text-sky-600"
        />
        <KpiTile
          title="Avg invoice"
          value={formatMoney(extended.averageInvoiceValue, currency)}
          icon={Receipt}
          tint="bg-teal-50 text-teal-600"
          hint={`${extended.uniqueClientsBilled} client${extended.uniqueClientsBilled === 1 ? "" : "s"} billed`}
        />
        <KpiTile
          title="Avg payment delay"
          value={`${extended.averagePaymentDelayDays} days`}
          icon={Clock}
          tint="bg-orange-50 text-orange-600"
          hint="issue → first payment"
        />
      </div>

      {/* Risk + VAT row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Client concentration</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {(extended.topClientShare * 100).toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {extended.topClientName ? `${extended.topClientName} is your largest client` : "no client data yet"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-50 text-fuchsia-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            {extended.topClientShare > 0.5 && (
              <p className="mt-3 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Concentration risk: revenue depends heavily on a single client
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">VAT collected YTD</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatMoney(extended.vatCollectedYtd, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">JPK_V7 input (Phase 3)</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                <Calculator className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Open receivables</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatMoney(kpis.totalUnpaid + kpis.totalOverdue, currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {agingBuckets.reduce((s, b) => s + b.count, 0)} open invoice{agingBuckets.reduce((s, b) => s + b.count, 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Revenue trend</CardTitle>
              <CardDescription>Last 12 months · revenue vs. expenses</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Net margin</p>
              <p className={`text-lg font-semibold ${netMargin12m >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {netMargin12m.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickFormatter={formatMonthLabel} stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatMoney(v, currency).replace(/\.\d+/, "")} />
                <Tooltip content={<RevenueTooltip currency={currency} />} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={0} strokeWidth={2} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two-up: status pie + top services */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice status</CardTitle>
            <CardDescription>Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="total"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusBreakdown.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip currency={currency} />} />
                  <Legend formatter={(v: string) => STATUS_LABELS[v] || v} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top services</CardTitle>
            <CardDescription>Revenue by line-item description</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatMoney(v, currency).replace(/\.\d+/, "")} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={140} />
                  <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0, currency)} />
                  <Bar dataKey="total" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>Last 10 invoices, newest first</CardDescription>
          </div>
          <Link href="/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No invoices yet. Run <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run import:ninja</code> to migrate.
                    </TableCell>
                  </TableRow>
                )}
                {recentInvoices.map((inv) => {
                  const d = daysUntil(inv.dueDate)
                  const overdue = inv.status !== "PAID" && d < 0
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.clientName}</TableCell>
                      <TableCell className="text-sm text-slate-600">{formatShortDate(inv.issueDate)}</TableCell>
                      <TableCell className={`text-sm ${overdue ? "text-rose-600 font-medium" : "text-slate-600"}`}>
                        {formatShortDate(inv.dueDate)} {overdue ? `· ${Math.abs(d)}d late` : ""}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: STATUS_COLORS[inv.status] + "22", color: STATUS_COLORS[inv.status] }}>
                          {STATUS_LABELS[inv.status] || inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Aging report + payer leaderboards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Invoice aging</CardTitle>
            <CardDescription>Outstanding receivables by days past due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agingBuckets.map(b => {
                const total = agingBuckets.reduce((s, x) => s + x.amount, 0)
                const pct = total > 0 ? (b.amount / total) * 100 : 0
                const color =
                  b.range === "future" ? "#10b981" :
                  b.range === "1-30" ? "#f59e0b" :
                  b.range === "31-60" ? "#f97316" :
                  b.range === "61-90" ? "#ef4444" : "#b91c1c"
                return (
                  <div key={b.range}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{b.label}</span>
                      <span className="text-slate-500">
                        {formatMoney(b.amount, currency)} · {b.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
              <CardTitle>Fastest payers</CardTitle>
            </div>
            <CardDescription>Shortest average pay-lag</CardDescription>
          </CardHeader>
          <CardContent>
            {topPayers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No payment history yet.</p>
            ) : (
              <ul className="space-y-3">
                {topPayers.map(p => (
                  <li key={p.clientId} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.clientName}</p>
                      <p className="text-xs text-slate-500">{p.paidInvoices} paid · {formatMoney(p.totalBilled, currency)} billed</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{p.averageLagDays}d</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <CardTitle>Slowest payers</CardTitle>
            </div>
            <CardDescription>Longest average pay-lag</CardDescription>
          </CardHeader>
          <CardContent>
            {worstPayers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">No payment history yet.</p>
            ) : (
              <ul className="space-y-3">
                {worstPayers.map(p => (
                  <li key={p.clientId} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {p.paidInvoices} paid · {p.outstanding > 0 ? `${formatMoney(p.outstanding, currency)} open` : "fully settled"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">{p.averageLagDays}d</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chase nudge */}
      {overdueRecent.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-900">
                {overdueRecent.length} overdue invoice{overdueRecent.length === 1 ? "" : "s"} totalling{" "}
                {formatMoney(overdueRecent.reduce((s, i) => s + (i.total - i.paidAmount), 0), currency)}
              </p>
              <p className="text-xs text-rose-700">
                AI auto-chasing agent (Phase 5C) will handle these once enabled.
              </p>
            </div>
            <Link href="/invoices?status=OVERDUE" className="text-sm font-medium text-rose-700 hover:text-rose-900">
              Review →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
