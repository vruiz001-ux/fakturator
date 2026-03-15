// @ts-nocheck
import prisma from "@/lib/prisma"
import type { FilterOptions, PaginatedResult } from "@/types"

export async function createInvoice(organizationId: string, data: {
  clientId: string
  type?: string
  issueDate?: Date
  saleDate?: Date
  dueDate: Date
  paymentMethod?: string
  currency?: string
  notes?: string
  items: {
    serviceId?: string
    description: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    sortOrder?: number
  }[]
}) {
  const invoiceNumber = await generateInvoiceNumber(organizationId, data.type || "VAT")

  const items = data.items.map((item, i) => {
    const netAmount = item.quantity * item.unitPrice
    const vatAmount = item.vatRate > 0 ? Math.round(netAmount * (item.vatRate / 100) * 100) / 100 : 0
    const grossAmount = netAmount + vatAmount
    return {
      ...item,
      netAmount,
      vatAmount,
      grossAmount,
      sortOrder: item.sortOrder ?? i,
      unit: item.unit as any,
    }
  })

  const subtotal = items.reduce((sum, item) => sum + item.netAmount, 0)
  const vatTotal = items.reduce((sum, item) => sum + item.vatAmount, 0)
  const total = subtotal + vatTotal

  return prisma.invoice.create({
    data: {
      organizationId,
      clientId: data.clientId,
      invoiceNumber,
      type: (data.type as any) || "VAT",
      status: "DRAFT",
      issueDate: data.issueDate || new Date(),
      saleDate: data.saleDate,
      dueDate: data.dueDate,
      paymentMethod: (data.paymentMethod as any) || "BANK_TRANSFER",
      currency: data.currency || "PLN",
      subtotal,
      vatTotal,
      total,
      notes: data.notes,
      items: { create: items },
    },
    include: { items: true, client: true },
  })
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { include: { service: true }, orderBy: { sortOrder: "asc" } },
      client: true,
      payments: { orderBy: { date: "desc" } },
    },
  })
}

export async function getInvoices(organizationId: string, filters: FilterOptions = {}) {
  const { page = 1, pageSize = 20, status, clientId, type, search, sortBy = "issueDate", sortOrder = "desc" } = filters

  const where: any = { organizationId }

  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status
  }
  if (clientId) where.clientId = clientId
  if (type) where.type = type
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ]
  }
  if (filters.dateRange) {
    where.issueDate = { gte: filters.dateRange.from, lte: filters.dateRange.to }
  }

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true, items: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  } as PaginatedResult<any>
}

export async function updateInvoice(id: string, data: any) {
  return prisma.invoice.update({ where: { id }, data })
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({ where: { id } })
}

export async function updateInvoiceStatus(id: string, status: string) {
  return prisma.invoice.update({ where: { id }, data: { status: status as any } })
}

export async function markAsPaid(id: string, paymentData: { amount: number; method?: string; reference?: string; date?: Date }) {
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) throw new Error("Invoice not found")

  const newPaidAmount = invoice.paidAmount + paymentData.amount
  const newStatus = newPaidAmount >= invoice.total ? "PAID" : "PARTIALLY_PAID"

  const [payment, updatedInvoice] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: id,
        amount: paymentData.amount,
        method: (paymentData.method as any) || "BANK_TRANSFER",
        reference: paymentData.reference,
        date: paymentData.date || new Date(),
      },
    }),
    prisma.invoice.update({
      where: { id },
      data: { paidAmount: newPaidAmount, status: newStatus as any },
    }),
  ])

  return { payment, invoice: updatedInvoice }
}

export async function generateInvoiceNumber(organizationId: string, type: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")

  const prefix = type === "PROFORMA" ? "PRO" : type === "CORRECTION" ? "KOR" : "FV"

  const count = await prisma.invoice.count({
    where: {
      organizationId,
      invoiceNumber: { startsWith: `${prefix}/${year}/${month}` },
    },
  })

  const number = String(count + 1).padStart(3, "0")
  return `${prefix}/${year}/${month}/${number}`
}

export async function duplicateInvoice(id: string) {
  const original = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!original) throw new Error("Invoice not found")

  const newNumber = await generateInvoiceNumber(original.organizationId, original.type)

  return prisma.invoice.create({
    data: {
      organizationId: original.organizationId,
      clientId: original.clientId,
      invoiceNumber: newNumber,
      type: original.type,
      status: "DRAFT",
      issueDate: new Date(),
      saleDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      paymentMethod: original.paymentMethod,
      currency: original.currency,
      subtotal: original.subtotal,
      vatTotal: original.vatTotal,
      total: original.total,
      notes: original.notes,
      items: {
        create: original.items.map(({ id: _id, invoiceId: _iid, ...item }) => item),
      },
    },
    include: { items: true, client: true },
  })
}
