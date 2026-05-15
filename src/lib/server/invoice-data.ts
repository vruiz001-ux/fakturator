// Server-side single-invoice fetcher with all items, payments, client + org context.

import "server-only"
import { prisma } from "@/lib/prisma"

export interface InvoiceDetail {
  id: string
  invoiceNumber: string
  type: string
  status: string
  issueDate: string
  saleDate: string | null
  dueDate: string
  paymentMethod: string
  currency: string
  subtotal: number
  vatTotal: number
  total: number
  paidAmount: number
  outstanding: number
  daysToDue: number
  notes: string | null
  ksefStatus: string | null
  ksefReferenceId: string | null
  externalSource: string | null
  items: Array<{
    id: string
    description: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    netAmount: number
    vatAmount: number
    grossAmount: number
  }>
  payments: Array<{
    id: string
    amount: number
    date: string
    method: string
    reference: string | null
    notes: string | null
  }>
  client: {
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
  }
  org: {
    id: string
    name: string
    address: string | null
    city: string | null
    postalCode: string | null
    country: string
    nip: string | null
    email: string | null
    phone: string | null
    bankName: string | null
    bankAccount: string | null
  }
}

export async function getInvoiceDetail(invoiceId: string, organizationId: string): Promise<InvoiceDetail | null> {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { date: "desc" } },
      client: true,
      organization: true,
    },
  })
  if (!inv) return null

  const outstanding = Math.max(0, inv.total - inv.paidAmount)
  const daysToDue = Math.ceil((inv.dueDate.getTime() - Date.now()) / 86400000)

  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    type: inv.type,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    saleDate: inv.saleDate?.toISOString() ?? null,
    dueDate: inv.dueDate.toISOString(),
    paymentMethod: inv.paymentMethod,
    currency: inv.currency,
    subtotal: inv.subtotal,
    vatTotal: inv.vatTotal,
    total: inv.total,
    paidAmount: inv.paidAmount,
    outstanding,
    daysToDue,
    notes: inv.notes,
    ksefStatus: inv.ksefStatus,
    ksefReferenceId: inv.ksefReferenceId,
    externalSource: inv.externalSource,
    items: inv.items.map(i => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      vatRate: i.vatRate,
      netAmount: i.netAmount,
      vatAmount: i.vatAmount,
      grossAmount: i.grossAmount,
    })),
    payments: inv.payments.map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.date.toISOString(),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
    })),
    client: {
      id: inv.client.id,
      name: inv.client.name,
      email: inv.client.email,
      phone: inv.client.phone,
      address: inv.client.address,
      city: inv.client.city,
      postalCode: inv.client.postalCode,
      country: inv.client.country,
      nip: inv.client.nip,
      contactPerson: inv.client.contactPerson,
    },
    org: {
      id: inv.organization.id,
      name: inv.organization.name,
      address: inv.organization.address,
      city: inv.organization.city,
      postalCode: inv.organization.postalCode,
      country: inv.organization.country,
      nip: inv.organization.nip,
      email: inv.organization.email,
      phone: inv.organization.phone,
      bankName: inv.organization.bankName,
      bankAccount: inv.organization.bankAccount,
    },
  }
}
