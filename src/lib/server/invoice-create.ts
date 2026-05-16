"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getActiveOrg, getActiveOrgId } from "./active-org"

export interface InvoiceFormData {
  clients: Array<{ id: string; name: string }>
  services: Array<{ id: string; name: string; defaultRate: number | null; defaultVatRate: number }>
  defaultCurrency: string
  defaultVatRate: number
  defaultPaymentDays: number
  suggestedNumber: string
}

export async function getInvoiceFormData(): Promise<InvoiceFormData> {
  const org = await getActiveOrg()
  const [clients, services, orgFull] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultRate: true, defaultVatRate: true },
    }),
    prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
      select: { defaultVatRate: true, defaultPaymentDays: true },
    }),
  ])

  return {
    clients,
    services,
    defaultCurrency: org.defaultCurrency,
    defaultVatRate: orgFull.defaultVatRate,
    defaultPaymentDays: orgFull.defaultPaymentDays,
    suggestedNumber: await suggestInvoiceNumber(org.id),
  }
}

async function suggestInvoiceNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.invoice.count({
    where: { organizationId, issueDate: { gte: new Date(Date.UTC(year, 0, 1)) } },
  })
  return `FV/${year}/${String(count + 1).padStart(4, "0")}`
}

const itemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  vatRate: z.number().min(0).max(100),
})

const createSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  invoiceNumber: z.string().min(1, "Invoice number required"),
  type: z.enum(["VAT", "PROFORMA", "CORRECTION", "ADVANCE"]),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one line item required"),
})

export type CreateInvoiceInput = z.infer<typeof createSchema>

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  try {
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Invalid input" }
    }
    const data = parsed.data
    const organizationId = await getActiveOrgId()

    // Org-scope check: client must belong to this org
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, organizationId },
      select: { id: true },
    })
    if (!client) return { ok: false, error: "Client not found in your organization" }

    // Reject duplicate invoice number
    const dup = await prisma.invoice.findFirst({
      where: { organizationId, invoiceNumber: data.invoiceNumber },
      select: { id: true },
    })
    if (dup) return { ok: false, error: `Invoice number ${data.invoiceNumber} already exists` }

    // Compute line items + totals
    const items = data.items.map((it, i) => {
      const netAmount = round2(it.quantity * it.unitPrice)
      const vatAmount = it.vatRate > 0 ? round2(netAmount * (it.vatRate / 100)) : 0
      const grossAmount = round2(netAmount + vatAmount)
      return {
        description: it.description,
        quantity: it.quantity,
        unit: "SERVICE" as const,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
        netAmount,
        vatAmount,
        grossAmount,
        sortOrder: i,
      }
    })
    const subtotal = round2(items.reduce((s, x) => s + x.netAmount, 0))
    const vatTotal = round2(items.reduce((s, x) => s + x.vatAmount, 0))
    const total = round2(items.reduce((s, x) => s + x.grossAmount, 0))

    const issueDate = new Date(`${data.issueDate}T00:00:00.000Z`)
    const dueDate = new Date(`${data.dueDate}T00:00:00.000Z`)

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        clientId: data.clientId,
        invoiceNumber: data.invoiceNumber,
        type: data.type,
        status: "DRAFT",
        issueDate,
        saleDate: issueDate,
        dueDate,
        paymentMethod: "BANK_TRANSFER",
        currency: data.currency,
        subtotal,
        vatTotal,
        total,
        paidAmount: 0,
        notes: data.notes || null,
        items: { create: items },
      },
      select: { id: true },
    })

    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    revalidatePath("/reports")
    return { ok: true, invoiceId: invoice.id }
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to create invoice" }
  }
}
