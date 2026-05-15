// Server-side reports aggregations. All Prisma. All org-scoped.
// Powers the /reports page tabs: Revenue · Clients · Services · Invoices · Expenses · VAT.

import "server-only"
import { prisma } from "@/lib/prisma"

export interface ClientRevenue {
  clientId: string
  clientName: string
  invoiceCount: number
  revenue: number
  paidAmount: number
  outstandingAmount: number
  overdueAmount: number
}

export interface ServiceRevenue {
  name: string
  invoiceCount: number
  revenue: number
}

export interface StatusBucket {
  status: string
  count: number
  total: number
  paidAmount: number
}

export interface ExpenseCategoryBucket {
  categoryId: string
  categoryName: string
  color: string
  total: number
  count: number
}

export interface VatBucket {
  rate: number
  outputNet: number
  outputVat: number
  inputNet: number
  inputVat: number
}

export interface VatSummary {
  buckets: VatBucket[]
  totals: {
    outputNet: number
    outputVat: number
    inputNet: number
    inputVat: number
    vatDue: number
  }
}

export interface ReportsData {
  org: { id: string; name: string; defaultCurrency: string }
  totals: {
    invoicedExclVat: number
    invoicedInclVat: number
    paidExclVat: number
    paidInclVat: number
    expensesNet: number
    expensesGross: number
    netProfit: number
    netMarginPct: number
    outstanding: number
    overdue: number
  }
  clients: ClientRevenue[]
  services: ServiceRevenue[]
  statusBuckets: StatusBucket[]
  expenseCategories: ExpenseCategoryBucket[]
  vat: VatSummary
}

const REAL_INVOICE = { type: { not: "PROFORMA" as const } }
const COUNT_FOR_REVENUE = { notIn: ["CANCELLED", "CORRECTED"] as ("CANCELLED" | "CORRECTED")[] }

export async function getReportsData(organizationId: string): Promise<ReportsData> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { id: true, name: true, defaultCurrency: true },
  })

  // ─── Aggregate over all real invoices ────────────────────
  const realWhere = {
    organizationId,
    ...REAL_INVOICE,
    status: COUNT_FOR_REVENUE,
  }

  const invoiceTotals = await prisma.invoice.aggregate({
    where: realWhere,
    _sum: { subtotal: true, vatTotal: true, total: true, paidAmount: true },
  })

  const overdueAgg = await prisma.invoice.aggregate({
    where: { organizationId, ...REAL_INVOICE, status: "OVERDUE" },
    _sum: { total: true, paidAmount: true },
  })

  const outstandingAgg = await prisma.invoice.aggregate({
    where: {
      organizationId,
      ...REAL_INVOICE,
      status: { in: ["SENT", "DRAFT", "PARTIALLY_PAID"] },
    },
    _sum: { total: true, paidAmount: true },
  })

  const expenseTotals = await prisma.expense.aggregate({
    where: { organizationId },
    _sum: { netAmount: true, vatAmount: true, grossAmount: true },
  })

  const invoicedExclVat = invoiceTotals._sum.subtotal ?? 0
  const invoicedInclVat = invoiceTotals._sum.total ?? 0
  const paidInclVat = invoiceTotals._sum.paidAmount ?? 0
  // Approximate paid-net as paid * (subtotal/total) ratio
  const paidExclVat = invoicedInclVat > 0 ? paidInclVat * (invoicedExclVat / invoicedInclVat) : 0
  const expensesNet = expenseTotals._sum.netAmount ?? 0
  const expensesGross = expenseTotals._sum.grossAmount ?? 0
  const netProfit = invoicedExclVat - expensesNet
  const netMarginPct = invoicedExclVat > 0 ? (netProfit / invoicedExclVat) * 100 : 0
  const outstanding = Math.max(0, (outstandingAgg._sum.total ?? 0) - (outstandingAgg._sum.paidAmount ?? 0))
  const overdue = Math.max(0, (overdueAgg._sum.total ?? 0) - (overdueAgg._sum.paidAmount ?? 0))

  // ─── Per-client breakdown ────────────────────────────────
  const perClient = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: realWhere,
    _sum: { total: true, paidAmount: true },
    _count: { _all: true },
  })
  const perClientOverdue = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: { organizationId, ...REAL_INVOICE, status: "OVERDUE" },
    _sum: { total: true, paidAmount: true },
  })
  const clientNames = await prisma.client.findMany({
    where: { organizationId, id: { in: perClient.map(p => p.clientId) } },
    select: { id: true, name: true },
  })
  const overdueByClient = new Map(
    perClientOverdue.map(o => [o.clientId, Math.max(0, (o._sum.total ?? 0) - (o._sum.paidAmount ?? 0))])
  )

  const clients: ClientRevenue[] = perClient
    .map(p => {
      const name = clientNames.find(c => c.id === p.clientId)?.name ?? "—"
      const revenue = p._sum.total ?? 0
      const paid = p._sum.paidAmount ?? 0
      return {
        clientId: p.clientId,
        clientName: name,
        invoiceCount: p._count._all,
        revenue,
        paidAmount: paid,
        outstandingAmount: Math.max(0, revenue - paid),
        overdueAmount: overdueByClient.get(p.clientId) ?? 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // ─── Per-service / per-line-description ──────────────────
  const items = await prisma.invoiceItem.groupBy({
    by: ["description"],
    where: { invoice: realWhere },
    _sum: { netAmount: true },
    _count: { _all: true },
  })
  const services: ServiceRevenue[] = items
    .map(i => ({
      name: i.description || "—",
      invoiceCount: i._count._all,
      revenue: i._sum.netAmount ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ─── Status buckets (incl. CANCELLED + CORRECTED for visibility) ─
  const statusAgg = await prisma.invoice.groupBy({
    by: ["status"],
    where: { organizationId, ...REAL_INVOICE },
    _sum: { total: true, paidAmount: true },
    _count: { _all: true },
  })
  const statusBuckets: StatusBucket[] = statusAgg.map(s => ({
    status: s.status,
    count: s._count._all,
    total: s._sum.total ?? 0,
    paidAmount: s._sum.paidAmount ?? 0,
  }))

  // ─── Expense categories ──────────────────────────────────
  const expCats = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: { organizationId },
    _sum: { grossAmount: true },
    _count: { _all: true },
  })
  const catRecords = await prisma.expenseCategory.findMany({
    where: { organizationId },
    select: { id: true, name: true, color: true },
  })
  const expenseCategories: ExpenseCategoryBucket[] = expCats.map(e => {
    const cat = catRecords.find(c => c.id === e.categoryId)
    return {
      categoryId: e.categoryId ?? "uncategorized",
      categoryName: cat?.name ?? "Uncategorized",
      color: cat?.color ?? "#94a3b8",
      total: e._sum.grossAmount ?? 0,
      count: e._count._all,
    }
  })

  // ─── VAT summary ─────────────────────────────────────────
  const vatItems = await prisma.invoiceItem.groupBy({
    by: ["vatRate"],
    where: { invoice: realWhere },
    _sum: { netAmount: true, vatAmount: true },
  })
  const vatExpenses = await prisma.expense.groupBy({
    by: ["vatRate"],
    where: { organizationId },
    _sum: { netAmount: true, vatAmount: true },
  })
  const ratesSet = new Set<number>([
    ...vatItems.map(v => v.vatRate),
    ...vatExpenses.map(v => v.vatRate),
  ])
  const buckets: VatBucket[] = Array.from(ratesSet)
    .sort((a, b) => b - a)
    .map(rate => {
      const out = vatItems.find(v => v.vatRate === rate)
      const inp = vatExpenses.find(v => v.vatRate === rate)
      return {
        rate,
        outputNet: out?._sum.netAmount ?? 0,
        outputVat: out?._sum.vatAmount ?? 0,
        inputNet: inp?._sum.netAmount ?? 0,
        inputVat: inp?._sum.vatAmount ?? 0,
      }
    })
  const vatTotals = buckets.reduce(
    (acc, b) => ({
      outputNet: acc.outputNet + b.outputNet,
      outputVat: acc.outputVat + b.outputVat,
      inputNet: acc.inputNet + b.inputNet,
      inputVat: acc.inputVat + b.inputVat,
      vatDue: 0,
    }),
    { outputNet: 0, outputVat: 0, inputNet: 0, inputVat: 0, vatDue: 0 },
  )
  vatTotals.vatDue = vatTotals.outputVat - vatTotals.inputVat

  return {
    org,
    totals: {
      invoicedExclVat,
      invoicedInclVat,
      paidExclVat,
      paidInclVat,
      expensesNet,
      expensesGross,
      netProfit,
      netMarginPct,
      outstanding,
      overdue,
    },
    clients,
    services,
    statusBuckets,
    expenseCategories,
    vat: { buckets, totals: vatTotals },
  }
}
