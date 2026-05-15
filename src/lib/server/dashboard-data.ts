// Server-side dashboard data fetcher. Aggregates Prisma rows for KPIs,
// charts, and tables consumed by the RSC dashboard.
//
// Everything is scoped to organizationId. No client-side reads.

import "server-only"
import { prisma } from "@/lib/prisma"

export interface KpiCards {
  totalInvoiced: number
  totalUnpaid: number
  totalPaid: number
  totalOverdue: number
  countInvoiced: number
  countUnpaid: number
  countPaid: number
  countOverdue: number
}

export interface RevenuePoint {
  month: string         // "2026-01"
  revenue: number       // sum of total for SENT/PAID/PARTIALLY_PAID/OVERDUE
  expenses: number      // sum of grossAmount
  profit: number        // revenue - expenses
}

export interface StatusSlice {
  status: string
  count: number
  total: number
}

export interface ServiceSlice {
  name: string
  total: number
}

export interface RecentInvoice {
  id: string
  invoiceNumber: string
  clientName: string
  status: string
  issueDate: string
  dueDate: string
  total: number
  paidAmount: number
  currency: string
}

export interface AgingBucket {
  label: string
  range: string
  amount: number
  count: number
}

export interface ClientPayerStat {
  clientId: string
  clientName: string
  paidInvoices: number
  averageLagDays: number
  totalBilled: number
  outstanding: number
}

export interface ExtendedKpis {
  ytdRevenue: number
  ytdInvoices: number
  monthRevenue: number
  monthInvoices: number
  averageInvoiceValue: number
  averagePaymentDelayDays: number
  uniqueClientsBilled: number
  topClientShare: number          // 0-1
  topClientName: string | null
  vatCollectedYtd: number
}

export interface DashboardData {
  org: {
    id: string
    name: string
    defaultCurrency: string
  }
  kpis: KpiCards
  extended: ExtendedKpis
  revenueTrend: RevenuePoint[]
  statusBreakdown: StatusSlice[]
  topServices: ServiceSlice[]
  recentInvoices: RecentInvoice[]
  agingBuckets: AgingBucket[]
  topPayers: ClientPayerStat[]
  worstPayers: ClientPayerStat[]
}

function ymKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function lastNMonths(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push(ymKey(d))
  }
  return out
}

export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true, defaultCurrency: true },
  })

  // ─── KPI rollup ──────────────────────────────────────────
  // Proforma invoices (quotes) are not real receivables — exclude from KPIs.
  const statusAgg = await prisma.invoice.groupBy({
    by: ["status"],
    where: { organizationId, type: { not: "PROFORMA" } },
    _sum: { total: true, paidAmount: true },
    _count: { _all: true },
  })

  const kpis: KpiCards = {
    totalInvoiced: 0, countInvoiced: 0,
    totalPaid: 0, countPaid: 0,
    totalUnpaid: 0, countUnpaid: 0,
    totalOverdue: 0, countOverdue: 0,
  }

  const statusBreakdown: StatusSlice[] = []
  for (const s of statusAgg) {
    const total = s._sum.total ?? 0
    const paid = s._sum.paidAmount ?? 0
    const count = s._count._all
    statusBreakdown.push({ status: s.status, count, total })
    // Exclude CANCELLED + CORRECTED from totals
    if (s.status !== "CANCELLED" && s.status !== "CORRECTED") {
      kpis.totalInvoiced += total
      kpis.countInvoiced += count
      kpis.totalPaid += paid
      if (s.status === "PAID") kpis.countPaid += count
    }
    if (s.status === "OVERDUE") {
      kpis.totalOverdue += Math.max(0, total - paid)
      kpis.countOverdue += count
    }
    if (s.status === "SENT" || s.status === "PARTIALLY_PAID" || s.status === "DRAFT") {
      kpis.totalUnpaid += Math.max(0, total - paid)
      kpis.countUnpaid += count
    }
  }

  // ─── Revenue trend (last 12 months) ──────────────────────
  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - 11, 1)
  since.setUTCHours(0, 0, 0, 0)

  const [invoicesInPeriod, expensesInPeriod] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId,
        type: { not: "PROFORMA" },
        issueDate: { gte: since },
        status: { in: ["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: { issueDate: true, total: true },
    }),
    prisma.expense.findMany({
      where: { organizationId, date: { gte: since } },
      select: { date: true, grossAmount: true },
    }),
  ])

  const months = lastNMonths(12)
  const byMonth = new Map<string, { revenue: number; expenses: number }>()
  for (const m of months) byMonth.set(m, { revenue: 0, expenses: 0 })

  for (const inv of invoicesInPeriod) {
    const k = ymKey(inv.issueDate)
    const row = byMonth.get(k)
    if (row) row.revenue += inv.total
  }
  for (const ex of expensesInPeriod) {
    const k = ymKey(ex.date)
    const row = byMonth.get(k)
    if (row) row.expenses += ex.grossAmount
  }

  const revenueTrend: RevenuePoint[] = months.map(m => {
    const row = byMonth.get(m)!
    return {
      month: m,
      revenue: Math.round(row.revenue * 100) / 100,
      expenses: Math.round(row.expenses * 100) / 100,
      profit: Math.round((row.revenue - row.expenses) * 100) / 100,
    }
  })

  // ─── Top services by revenue ─────────────────────────────
  const itemAgg = await prisma.invoiceItem.groupBy({
    by: ["serviceId", "description"],
    where: {
      invoice: {
        organizationId,
        type: { not: "PROFORMA" },
        status: { notIn: ["CANCELLED", "CORRECTED"] },
      },
    },
    _sum: { netAmount: true },
  })
  const serviceTotals = new Map<string, number>()
  for (const it of itemAgg) {
    const name = it.description || "Untitled"
    serviceTotals.set(name, (serviceTotals.get(name) ?? 0) + (it._sum.netAmount ?? 0))
  }
  const topServices: ServiceSlice[] = Array.from(serviceTotals.entries())
    .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // ─── Recent invoices (10) ────────────────────────────────
  const recent = await prisma.invoice.findMany({
    where: {
      organizationId,
      type: { not: "PROFORMA" },
      status: { notIn: ["CANCELLED", "CORRECTED"] },
    },
    orderBy: { issueDate: "desc" },
    take: 10,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      issueDate: true,
      dueDate: true,
      total: true,
      paidAmount: true,
      currency: true,
      client: { select: { name: true } },
    },
  })

  const recentInvoices: RecentInvoice[] = recent.map(r => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    clientName: r.client?.name ?? "—",
    status: r.status,
    issueDate: r.issueDate.toISOString(),
    dueDate: r.dueDate.toISOString(),
    total: r.total,
    paidAmount: r.paidAmount,
    currency: r.currency,
  }))

  // ─── Extended KPIs ───────────────────────────────────────
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))

  const [ytdAgg, monthAgg, vatYtdAgg, allInvoicesForAvg] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        organizationId,
        type: { not: "PROFORMA" },
        status: { notIn: ["CANCELLED", "CORRECTED"] },
        issueDate: { gte: yearStart },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        type: { not: "PROFORMA" },
        status: { notIn: ["CANCELLED", "CORRECTED"] },
        issueDate: { gte: monthStart },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        type: { not: "PROFORMA" },
        status: { notIn: ["CANCELLED", "CORRECTED"] },
        issueDate: { gte: yearStart },
      },
      _sum: { vatTotal: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        type: { not: "PROFORMA" },
        status: { notIn: ["CANCELLED", "CORRECTED"] },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ])

  const ytdRevenue = ytdAgg._sum.total ?? 0
  const monthRevenue = monthAgg._sum.total ?? 0
  const avgInvoice = allInvoicesForAvg._count._all > 0
    ? (allInvoicesForAvg._sum.total ?? 0) / allInvoicesForAvg._count._all
    : 0

  // Pay lag (issue -> first payment)
  const paidInvoices = await prisma.invoice.findMany({
    where: { organizationId, status: "PAID", type: { not: "PROFORMA" } },
    select: {
      id: true, clientId: true, issueDate: true, total: true, paidAmount: true,
      client: { select: { name: true } },
      payments: { orderBy: { date: "asc" }, take: 1, select: { date: true } },
    },
  })
  const lagsByClient = new Map<string, { name: string; lags: number[]; billed: number }>()
  let totalLagDays = 0
  let lagSamples = 0
  for (const inv of paidInvoices) {
    const firstPay = inv.payments[0]?.date
    if (firstPay) {
      const lag = Math.max(0, Math.round((firstPay.getTime() - inv.issueDate.getTime()) / 86400000))
      totalLagDays += lag
      lagSamples++
      const b = lagsByClient.get(inv.clientId) || { name: inv.client?.name ?? "—", lags: [], billed: 0 }
      b.lags.push(lag)
      b.billed += inv.total
      lagsByClient.set(inv.clientId, b)
    }
  }
  const averagePaymentDelayDays = lagSamples > 0 ? Math.round(totalLagDays / lagSamples) : 0

  // Per-client billed (for concentration)
  const billedByClient = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: { organizationId, type: { not: "PROFORMA" }, status: { notIn: ["CANCELLED", "CORRECTED"] } },
    _sum: { total: true },
    _count: { _all: true },
  })
  const clientNames = await prisma.client.findMany({
    where: { organizationId, id: { in: billedByClient.map(b => b.clientId) } },
    select: { id: true, name: true },
  })
  const byClient = billedByClient.map(b => ({
    clientId: b.clientId,
    name: clientNames.find(c => c.id === b.clientId)?.name ?? "—",
    billed: b._sum.total ?? 0,
    invoiceCount: b._count._all,
  }))
  const totalBilled = byClient.reduce((s, c) => s + c.billed, 0)
  const sortedClients = [...byClient].sort((a, b) => b.billed - a.billed)
  const topClient = sortedClients[0]
  const topClientShare = totalBilled > 0 && topClient ? topClient.billed / totalBilled : 0

  // Outstanding per client (for worst payers + concentration view)
  const outstandingByClient = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: {
      organizationId,
      type: { not: "PROFORMA" },
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    _sum: { total: true, paidAmount: true },
  })
  const outstandingMap = new Map(
    outstandingByClient.map(o => [
      o.clientId,
      Math.max(0, (o._sum.total ?? 0) - (o._sum.paidAmount ?? 0)),
    ])
  )

  // Payer leaderboards
  const payerStats: ClientPayerStat[] = Array.from(lagsByClient.entries()).map(([clientId, b]) => ({
    clientId,
    clientName: b.name,
    paidInvoices: b.lags.length,
    averageLagDays: Math.round(b.lags.reduce((a, c) => a + c, 0) / b.lags.length),
    totalBilled: b.billed,
    outstanding: outstandingMap.get(clientId) ?? 0,
  }))
  const topPayers = [...payerStats].sort((a, b) => a.averageLagDays - b.averageLagDays).slice(0, 5)
  const worstPayers = [...payerStats].sort((a, b) => b.averageLagDays - a.averageLagDays).slice(0, 5)

  const extended: ExtendedKpis = {
    ytdRevenue,
    ytdInvoices: ytdAgg._count._all,
    monthRevenue,
    monthInvoices: monthAgg._count._all,
    averageInvoiceValue: avgInvoice,
    averagePaymentDelayDays,
    uniqueClientsBilled: byClient.length,
    topClientShare,
    topClientName: topClient?.name ?? null,
    vatCollectedYtd: vatYtdAgg._sum.vatTotal ?? 0,
  }

  // ─── Aging buckets (outstanding invoices grouped by days past due) ─
  const openInvoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      type: { not: "PROFORMA" },
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE", "DRAFT"] },
    },
    select: { dueDate: true, total: true, paidAmount: true },
  })
  const now = new Date()
  const agingBuckets: AgingBucket[] = [
    { label: "Not due", range: "future",     amount: 0, count: 0 },
    { label: "1-30d",   range: "1-30",       amount: 0, count: 0 },
    { label: "31-60d",  range: "31-60",      amount: 0, count: 0 },
    { label: "61-90d",  range: "61-90",      amount: 0, count: 0 },
    { label: "90+d",    range: "90+",        amount: 0, count: 0 },
  ]
  for (const inv of openInvoices) {
    const outstanding = Math.max(0, inv.total - inv.paidAmount)
    if (outstanding <= 0) continue
    const daysPast = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000)
    let b: AgingBucket
    if (daysPast < 0) b = agingBuckets[0]
    else if (daysPast <= 30) b = agingBuckets[1]
    else if (daysPast <= 60) b = agingBuckets[2]
    else if (daysPast <= 90) b = agingBuckets[3]
    else b = agingBuckets[4]
    b.amount += outstanding
    b.count++
  }

  return {
    org,
    kpis,
    extended,
    revenueTrend,
    statusBreakdown,
    topServices,
    recentInvoices,
    agingBuckets,
    topPayers,
    worstPayers,
  }
}
