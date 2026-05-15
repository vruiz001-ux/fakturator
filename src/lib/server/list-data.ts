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
