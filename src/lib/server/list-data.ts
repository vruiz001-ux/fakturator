// Server-side list fetchers for /invoices, /clients, /expenses, /services pages.
// All Prisma. Org-scoped. Decoded once, passed as props to client list views.

import "server-only"
import { prisma } from "@/lib/prisma"

export interface InvoiceRow {
  id: string
  invoiceNumber: string
  type: string
  status: string
  issueDate: string
  dueDate: string
  total: number
  paidAmount: number
  currency: string
  clientId: string
  clientName: string
  hasItems: number
  externalSource: string | null
}

export async function getInvoicesList(organizationId: string): Promise<InvoiceRow[]> {
  const rows = await prisma.invoice.findMany({
    where: { organizationId },
    orderBy: { issueDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      type: true,
      status: true,
      issueDate: true,
      dueDate: true,
      total: true,
      paidAmount: true,
      currency: true,
      clientId: true,
      externalSource: true,
      client: { select: { name: true } },
      _count: { select: { items: true } },
    },
  })
  return rows.map(r => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    type: r.type,
    status: r.status,
    issueDate: r.issueDate.toISOString(),
    dueDate: r.dueDate.toISOString(),
    total: r.total,
    paidAmount: r.paidAmount,
    currency: r.currency,
    clientId: r.clientId,
    clientName: r.client?.name ?? "—",
    hasItems: r._count.items,
    externalSource: r.externalSource,
  }))
}

export interface ClientRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  country: string
  nip: string | null
  contactPerson: string | null
  isActive: boolean
  invoiceCount: number
  totalBilled: number
  outstandingAmount: number
  externalSource: string | null
  createdAt: string
}

export async function getClientsList(organizationId: string): Promise<ClientRow[]> {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, phone: true, city: true,
      country: true, nip: true, contactPerson: true, isActive: true,
      externalSource: true, createdAt: true,
    },
  })

  const agg = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: { organizationId, type: { not: "PROFORMA" }, status: { notIn: ["CANCELLED", "CORRECTED"] } },
    _sum: { total: true, paidAmount: true },
    _count: { _all: true },
  })
  const aggMap = new Map(agg.map(a => [a.clientId, a]))

  return clients.map(c => {
    const a = aggMap.get(c.id)
    const total = a?._sum.total ?? 0
    const paid = a?._sum.paidAmount ?? 0
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      country: c.country,
      nip: c.nip,
      contactPerson: c.contactPerson,
      isActive: c.isActive,
      invoiceCount: a?._count._all ?? 0,
      totalBilled: total,
      outstandingAmount: Math.max(0, total - paid),
      externalSource: c.externalSource,
      createdAt: c.createdAt.toISOString(),
    }
  })
}

export interface ExpenseRow {
  id: string
  description: string
  invoiceNumber: string | null
  supplierName: string | null
  categoryName: string | null
  categoryColor: string
  date: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  vatRate: number
  currency: string
  isBillable: boolean
  isRebilled: boolean
  clientName: string | null
}

export async function getExpensesList(organizationId: string): Promise<ExpenseRow[]> {
  const rows = await prisma.expense.findMany({
    where: { organizationId },
    orderBy: { date: "desc" },
    select: {
      id: true,
      description: true,
      invoiceNumber: true,
      date: true,
      netAmount: true,
      vatAmount: true,
      grossAmount: true,
      vatRate: true,
      currency: true,
      isBillable: true,
      isRebilled: true,
      supplier: { select: { name: true } },
      category: { select: { name: true, color: true } },
      client: { select: { name: true } },
    },
  })
  return rows.map(r => ({
    id: r.id,
    description: r.description,
    invoiceNumber: r.invoiceNumber,
    supplierName: r.supplier?.name ?? null,
    categoryName: r.category?.name ?? null,
    categoryColor: r.category?.color ?? "#94a3b8",
    date: r.date.toISOString(),
    netAmount: r.netAmount,
    vatAmount: r.vatAmount,
    grossAmount: r.grossAmount,
    vatRate: r.vatRate,
    currency: r.currency,
    isBillable: r.isBillable,
    isRebilled: r.isRebilled,
    clientName: r.client?.name ?? null,
  }))
}

export interface ServiceRow {
  id: string
  name: string
  description: string | null
  defaultRate: number | null
  defaultUnit: string
  defaultVatRate: number
  category: string | null
  isActive: boolean
  usageCount: number
  externalSource: string | null
}

export interface ClientDetail {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string
  nip: string | null
  contactPerson: string | null
  notes: string | null
  isActive: boolean
  invoiceEmail: string | null
  externalSource: string | null
  createdAt: string
  stats: {
    invoiceCount: number
    totalBilled: number
    totalPaid: number
    outstanding: number
    overdue: number
    averageLagDays: number | null
  }
  invoices: InvoiceRow[]
}

export async function getClientDetail(clientId: string, organizationId: string): Promise<ClientDetail | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: {
      id: true, name: true, email: true, phone: true, address: true,
      city: true, postalCode: true, country: true, nip: true,
      contactPerson: true, notes: true, isActive: true, invoiceEmail: true,
      externalSource: true, createdAt: true,
    },
  })
  if (!client) return null

  const invoices = await prisma.invoice.findMany({
    where: { organizationId, clientId },
    orderBy: { issueDate: "desc" },
    select: {
      id: true, invoiceNumber: true, type: true, status: true,
      issueDate: true, dueDate: true, total: true, paidAmount: true,
      currency: true, clientId: true, externalSource: true,
      _count: { select: { items: true } },
      payments: { orderBy: { date: "asc" }, take: 1, select: { date: true } },
    },
  })

  let totalBilled = 0, totalPaid = 0, overdue = 0
  const lags: number[] = []
  for (const inv of invoices) {
    if (inv.type === "PROFORMA" || inv.status === "CANCELLED" || inv.status === "CORRECTED") continue
    totalBilled += inv.total
    totalPaid += inv.paidAmount
    if (inv.status === "OVERDUE") overdue += Math.max(0, inv.total - inv.paidAmount)
    if (inv.status === "PAID" && inv.payments[0]?.date) {
      lags.push(Math.max(0, Math.floor((inv.payments[0].date.getTime() - inv.issueDate.getTime()) / 86400000)))
    }
  }

  return {
    ...client,
    createdAt: client.createdAt.toISOString(),
    stats: {
      invoiceCount: invoices.filter(i => i.type !== "PROFORMA").length,
      totalBilled,
      totalPaid,
      outstanding: Math.max(0, totalBilled - totalPaid),
      overdue,
      averageLagDays: lags.length > 0 ? Math.round(lags.reduce((a, b) => a + b, 0) / lags.length) : null,
    },
    invoices: invoices.map(r => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      type: r.type,
      status: r.status,
      issueDate: r.issueDate.toISOString(),
      dueDate: r.dueDate.toISOString(),
      total: r.total,
      paidAmount: r.paidAmount,
      currency: r.currency,
      clientId: r.clientId,
      clientName: client.name,
      hasItems: r._count.items,
      externalSource: r.externalSource,
    })),
  }
}

export interface QuoteRow extends InvoiceRow {}

export async function getQuotesList(organizationId: string): Promise<QuoteRow[]> {
  const rows = await prisma.invoice.findMany({
    where: { organizationId, type: "PROFORMA" },
    orderBy: { issueDate: "desc" },
    select: {
      id: true, invoiceNumber: true, type: true, status: true,
      issueDate: true, dueDate: true, total: true, paidAmount: true,
      currency: true, clientId: true, externalSource: true,
      client: { select: { name: true } },
      _count: { select: { items: true } },
    },
  })
  return rows.map(r => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    type: r.type,
    status: r.status,
    issueDate: r.issueDate.toISOString(),
    dueDate: r.dueDate.toISOString(),
    total: r.total,
    paidAmount: r.paidAmount,
    currency: r.currency,
    clientId: r.clientId,
    clientName: r.client?.name ?? "—",
    hasItems: r._count.items,
    externalSource: r.externalSource,
  }))
}

export interface KsefRow {
  id: string
  invoiceNumber: string
  clientName: string
  total: number
  currency: string
  issueDate: string
  ksefStatus: string | null
  ksefReferenceId: string | null
  ksefSubmittedAt: string | null
}

export interface KsefOverview {
  rows: KsefRow[]
  counts: {
    notSubmitted: number
    pending: number
    accepted: number
    rejected: number
    error: number
  }
}

export async function getKsefOverview(organizationId: string): Promise<KsefOverview> {
  const invoices = await prisma.invoice.findMany({
    where: { organizationId, type: { not: "PROFORMA" } },
    orderBy: { issueDate: "desc" },
    select: {
      id: true, invoiceNumber: true, total: true, currency: true,
      issueDate: true, ksefStatus: true, ksefReferenceId: true, ksefSubmittedAt: true,
      client: { select: { name: true } },
    },
  })

  const counts = { notSubmitted: 0, pending: 0, accepted: 0, rejected: 0, error: 0 }
  for (const inv of invoices) {
    const s = inv.ksefStatus
    if (!s || s === "PENDING" && !inv.ksefSubmittedAt) counts.notSubmitted++
    else if (s === "ACCEPTED") counts.accepted++
    else if (s === "REJECTED") counts.rejected++
    else if (s === "ERROR") counts.error++
    else counts.pending++
  }

  return {
    counts,
    rows: invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client?.name ?? "—",
      total: inv.total,
      currency: inv.currency,
      issueDate: inv.issueDate.toISOString(),
      ksefStatus: inv.ksefStatus,
      ksefReferenceId: inv.ksefReferenceId,
      ksefSubmittedAt: inv.ksefSubmittedAt?.toISOString() ?? null,
    })),
  }
}

export interface RecurringRow {
  id: string
  clientName: string
  frequency: string
  nextRunDate: string
  isActive: boolean
  templateNumber: string | null
  total: number
  currency: string
  externalSource: string | null
}

export async function getRecurringList(organizationId: string): Promise<RecurringRow[]> {
  const rows = await prisma.recurringRule.findMany({
    where: { organizationId },
    orderBy: { nextRunDate: "asc" },
    select: {
      id: true, frequency: true, nextRunDate: true, isActive: true,
      externalSource: true, templateData: true,
      client: { select: { name: true } },
    },
  })
  return rows.map(r => {
    const tpl: any = r.templateData
    return {
      id: r.id,
      clientName: r.client?.name ?? "—",
      frequency: r.frequency,
      nextRunDate: r.nextRunDate.toISOString(),
      isActive: r.isActive,
      templateNumber: tpl?.number ?? null,
      total: Number(tpl?.totals?.total) || 0,
      currency: tpl?.currency || "EUR",
      externalSource: r.externalSource,
    }
  })
}

export async function getServicesList(organizationId: string): Promise<ServiceRow[]> {
  const services = await prisma.service.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, description: true,
      defaultRate: true, defaultUnit: true, defaultVatRate: true,
      category: true, isActive: true, externalSource: true,
      _count: { select: { invoiceItems: true } },
    },
  })
  return services.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    defaultRate: s.defaultRate,
    defaultUnit: s.defaultUnit,
    defaultVatRate: s.defaultVatRate,
    category: s.category,
    isActive: s.isActive,
    usageCount: s._count.invoiceItems,
    externalSource: s.externalSource,
  }))
}
