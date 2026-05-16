"use server"

// Server actions for invoice mutations. Org-scoped via getActiveOrgId().

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveOrgId } from "./active-org"

export async function markInvoicePaid(invoiceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: { id: true, total: true, paidAmount: true, status: true },
    })
    if (!inv) return { ok: false, error: "Invoice not found" }
    if (inv.status === "PAID") return { ok: true }

    const remainder = inv.total - inv.paidAmount
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: inv.id },
        data: { status: "PAID", paidAmount: inv.total },
      }),
      ...(remainder > 0 ? [
        prisma.payment.create({
          data: {
            invoiceId: inv.id,
            amount: remainder,
            date: new Date(),
            method: "BANK_TRANSFER",
            reference: "Marked paid via dashboard",
          },
        }),
      ] : []),
    ])
    revalidatePath("/invoices")
    revalidatePath(`/invoices/${inv.id}`)
    revalidatePath("/dashboard")
    revalidatePath("/reports")
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "Action failed" }
  }
}

export async function recordPayment(invoiceId: string, amount: number, reference?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!(amount > 0)) return { ok: false, error: "Amount must be greater than zero" }
    const orgId = await getActiveOrgId()
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: { id: true, total: true, paidAmount: true },
    })
    if (!inv) return { ok: false, error: "Invoice not found" }

    const newPaid = Math.min(inv.total, inv.paidAmount + amount)
    const newStatus = newPaid >= inv.total ? "PAID" : "PARTIALLY_PAID"

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: inv.id,
          amount,
          date: new Date(),
          method: "BANK_TRANSFER",
          reference: reference || null,
        },
      }),
      prisma.invoice.update({
        where: { id: inv.id },
        data: { paidAmount: newPaid, status: newStatus },
      }),
    ])
    revalidatePath("/invoices")
    revalidatePath(`/invoices/${inv.id}`)
    revalidatePath("/dashboard")
    revalidatePath("/reports")
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "Action failed" }
  }
}

export async function markInvoiceSent(invoiceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const result = await prisma.invoice.updateMany({
      where: { id: invoiceId, organizationId: orgId, status: "DRAFT" },
      data: { status: "SENT" },
    })
    if (result.count === 0) return { ok: false, error: "Invoice not found or not in DRAFT" }
    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/dashboard")
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "Action failed" }
  }
}

export async function cancelInvoice(invoiceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const result = await prisma.invoice.updateMany({
      where: { id: invoiceId, organizationId: orgId, status: { notIn: ["PAID"] } },
      data: { status: "CANCELLED" },
    })
    if (result.count === 0) return { ok: false, error: "Cannot cancel a paid invoice" }
    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath("/dashboard")
    revalidatePath("/reports")
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || "Action failed" }
  }
}

// Issue a credit note (faktura korygująca): a CORRECTION invoice with negated
// line items, linked to the original via correctedInvoiceId. The original is
// marked CORRECTED.
export async function createCreditNote(
  originalInvoiceId: string,
): Promise<{ ok: true; creditNoteId: string } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const original = await prisma.invoice.findFirst({
      where: { id: originalInvoiceId, organizationId: orgId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
    if (!original) return { ok: false, error: "Invoice not found" }
    if (original.type === "CORRECTION") return { ok: false, error: "Cannot issue a credit note for a credit note" }
    if (original.type === "PROFORMA") return { ok: false, error: "Proforma invoices cannot be corrected" }

    const creditNumber = `KOR/${original.invoiceNumber}`
    const dup = await prisma.invoice.findFirst({
      where: { organizationId: orgId, invoiceNumber: creditNumber },
      select: { id: true },
    })
    if (dup) return { ok: false, error: `Credit note ${creditNumber} already exists` }

    const negItems = original.items.map((it, i) => ({
      description: `Correction: ${it.description}`,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: -it.unitPrice,
      vatRate: it.vatRate,
      netAmount: -it.netAmount,
      vatAmount: -it.vatAmount,
      grossAmount: -it.grossAmount,
      sortOrder: i,
    }))

    const creditNote = await prisma.$transaction(async (tx) => {
      const cn = await tx.invoice.create({
        data: {
          organizationId: orgId,
          clientId: original.clientId,
          invoiceNumber: creditNumber,
          type: "CORRECTION",
          status: "DRAFT",
          issueDate: new Date(),
          saleDate: new Date(),
          dueDate: new Date(),
          paymentMethod: original.paymentMethod,
          currency: original.currency,
          subtotal: -original.subtotal,
          vatTotal: -original.vatTotal,
          total: -original.total,
          paidAmount: 0,
          notes: `Credit note correcting invoice ${original.invoiceNumber}`,
          correctedInvoiceId: original.id,
          items: { create: negItems },
        },
        select: { id: true },
      })
      await tx.invoice.update({
        where: { id: original.id },
        data: { status: "CORRECTED" },
      })
      return cn
    })

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${originalInvoiceId}`)
    revalidatePath(`/invoices/${creditNote.id}`)
    revalidatePath("/dashboard")
    revalidatePath("/reports")
    return { ok: true, creditNoteId: creditNote.id }
  } catch (err: any) {
    return { ok: false, error: err.message || "Credit note failed" }
  }
}
