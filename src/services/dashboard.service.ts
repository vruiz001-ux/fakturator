// @ts-nocheck
import prisma from "@/lib/prisma"
import type { DashboardMetrics, DateRange } from "@/types"

export async function getDashboardMetrics(
  organizationId: string,
  dateRange?: DateRange
): Promise<DashboardMetrics> {
  const dateFilter = dateRange
    ? { gte: dateRange.from, lte: dateRange.to }
    : undefined

  const invoiceWhere: any = { organizationId }
  if (dateFilter) invoiceWhere.issueDate = dateFilter

  const [invoices, expenses, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: { client: true, items: { include: { service: true } } },
    }),
    prisma.expense.findMany({
      where: { organizationId, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { category: true },
    }),
    prisma.payment.findMany({
      where: { invoice: { organizationId }, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { invoice: { include: { client: true } } },
      orderBy: { date: "desc" },
    }),
  ])

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.total, 0)
  const totalUnpaid = invoices.filter(i => ["SENT", "DRAFT", "PARTIALLY_PAID"].includes(i.status)).reduce((s, i) => s + i.total - i.paidAmount, 0)
  const totalOverdue = invoices.filter(i => i.status === "OVERDUE").reduce((s, i) => s + i.total - i.paidAmount, 0)
  const totalInvoiceCount = invoices.length
  const paidCount = invoices.filter(i => i.status === "PAID").length
  const unpaidCount = invoices.filter(i => ["SENT", "DRAFT", "PARTIALLY_PAID"].includes(i.status)).length
  const overdueCount = invoices.filter(i => i.status === "OVERDUE").length

  const expenseTotal = expenses.reduce((s, e) => s + e.grossAmount, 0)
  const revenueNet = invoices.reduce((s, i) => s + i.subtotal, 0)

  // Revenue by client
  const clientMap = new Map<string, { name: string; revenue: number; count: number; paid: number; overdue: number }>()
  for (const inv of invoices) {
    const existing = clientMap.get(inv.clientId) || { name: inv.client.name, revenue: 0, count: 0, paid: 0, overdue: 0 }
    existing.revenue += inv.subtotal
    existing.count += 1
    existing.paid += inv.paidAmount
    if (inv.status === "OVERDUE") existing.overdue += inv.total - inv.paidAmount
    clientMap.set(inv.clientId, existing)
  }
  const revenueByClient = Array.from(clientMap.entries()).map(([clientId, d]) => ({
    clientId, clientName: d.name, revenue: d.revenue, invoiceCount: d.count, paidAmount: d.paid, overdueAmount: d.overdue,
  })).sort((a, b) => b.revenue - a.revenue)

  // Revenue by service
  const serviceMap = new Map<string, { name: string; revenue: number; count: number }>()
  for (const inv of invoices) {
    for (const item of inv.items) {
      const svcId = item.serviceId || "uncategorized"
      const svcName = item.service?.name || "Uncategorized"
      const existing = serviceMap.get(svcId) || { name: svcName, revenue: 0, count: 0 }
      existing.revenue += item.netAmount
      existing.count += 1
      serviceMap.set(svcId, existing)
    }
  }
  const revenueByService = Array.from(serviceMap.entries()).map(([serviceId, d]) => ({
    serviceId, serviceName: d.name, revenue: d.revenue, invoiceCount: d.count, averageValue: d.count > 0 ? d.revenue / d.count : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // Status breakdown
  const statusMap = new Map<string, { count: number; total: number }>()
  for (const inv of invoices) {
    const existing = statusMap.get(inv.status) || { count: 0, total: 0 }
    existing.count += 1
    existing.total += inv.total
    statusMap.set(inv.status, existing)
  }
  const invoiceStatusBreakdown = Array.from(statusMap.entries()).map(([status, d]) => ({
    status: status as any, count: d.count, total: d.total,
  }))

  // Expenses by category
  const catMap = new Map<string, { name: string; color: string; total: number; count: number }>()
  for (const exp of expenses) {
    const catId = exp.categoryId || "uncategorized"
    const existing = catMap.get(catId) || { name: exp.category?.name || "Uncategorized", color: exp.category?.color || "#94a3b8", total: 0, count: 0 }
    existing.total += exp.grossAmount
    existing.count += 1
    catMap.set(catId, existing)
  }
  const expensesByCategory = Array.from(catMap.entries()).map(([categoryId, d]) => ({
    categoryId, categoryName: d.name, color: d.color, total: d.total, count: d.count,
  })).sort((a, b) => b.total - a.total)

  // VAT summary
  const outputVat = invoices.reduce((s, i) => s + i.vatTotal, 0)
  const inputVat = expenses.reduce((s, e) => s + e.vatAmount, 0)

  // Revenue by month
  const monthMap = new Map<string, { revenue: number; expenses: number }>()
  for (const inv of invoices) {
    const key = new Date(inv.issueDate).toLocaleString("en", { month: "short", year: "numeric" })
    const existing = monthMap.get(key) || { revenue: 0, expenses: 0 }
    existing.revenue += inv.subtotal
    monthMap.set(key, existing)
  }
  for (const exp of expenses) {
    const key = new Date(exp.date).toLocaleString("en", { month: "short", year: "numeric" })
    const existing = monthMap.get(key) || { revenue: 0, expenses: 0 }
    existing.expenses += exp.grossAmount
    monthMap.set(key, existing)
  }
  const revenueByMonth = Array.from(monthMap.entries()).map(([month, d]) => ({
    month, revenue: d.revenue, expenses: d.expenses, profit: d.revenue - d.expenses,
  }))

  // Upcoming due dates
  const now = new Date()
  const upcomingDueDates = invoices
    .filter(i => ["SENT", "DRAFT"].includes(i.status) && new Date(i.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5) as any

  return {
    totalInvoiced,
    totalPaid,
    totalUnpaid,
    totalOverdue,
    revenueThisPeriod: revenueNet,
    expensesThisPeriod: expenseTotal,
    netIncome: revenueNet - expenseTotal,
    outstandingReceivables: totalUnpaid + totalOverdue,
    averageInvoiceValue: totalInvoiceCount > 0 ? totalInvoiced / totalInvoiceCount : 0,
    totalInvoiceCount,
    paidCount,
    unpaidCount,
    overdueCount,
    paidRatio: totalInvoiceCount > 0 ? (paidCount / totalInvoiceCount) * 100 : 0,
    overdueRatio: totalInvoiceCount > 0 ? (overdueCount / totalInvoiceCount) * 100 : 0,
    revenueByMonth,
    revenueByClient,
    revenueByService,
    topClients: revenueByClient.slice(0, 5),
    invoiceStatusBreakdown,
    expensesByCategory,
    recentPayments: payments.slice(0, 5) as any,
    upcomingDueDates,
    cashflowTrend: [],
    vatSummary: {
      outputVat,
      inputVat,
      vatDue: outputVat - inputVat,
      byRate: [],
    },
  }
}
