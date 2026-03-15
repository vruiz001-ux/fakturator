// @ts-nocheck
import type { Invoice } from "@/types"

export interface KsefValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateInvoiceForKsef(invoice: any): KsefValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required seller fields
  if (!invoice.organization?.nip) errors.push("Seller NIP is required")
  if (!invoice.organization?.name) errors.push("Seller name is required")
  if (!invoice.organization?.address) errors.push("Seller address is required")

  // Required buyer fields
  if (!invoice.client?.name) errors.push("Buyer name is required")
  if (!invoice.client?.nip) {
    if (invoice.type === "VAT") errors.push("Buyer NIP is required for VAT invoices")
    else warnings.push("Buyer NIP is recommended")
  }

  // Invoice fields
  if (!invoice.invoiceNumber) errors.push("Invoice number is required")
  if (!invoice.issueDate) errors.push("Issue date is required")
  if (!invoice.saleDate) warnings.push("Sale date is recommended")
  if (!invoice.dueDate) errors.push("Due date is required")

  // Line items
  if (!invoice.items?.length) errors.push("At least one line item is required")
  for (const item of invoice.items || []) {
    if (!item.description) errors.push(`Line item missing description`)
    if (item.quantity <= 0) errors.push(`Line item "${item.description}": quantity must be positive`)
    if (item.unitPrice < 0) errors.push(`Line item "${item.description}": unit price cannot be negative`)
  }

  // VAT validation
  const calculatedVat = (invoice.items || []).reduce((sum: number, item: any) => sum + item.vatAmount, 0)
  if (Math.abs(calculatedVat - invoice.vatTotal) > 0.01) {
    errors.push("VAT total does not match sum of line item VAT amounts")
  }

  // NIP format validation
  if (invoice.client?.nip && !/^\d{10}$/.test(invoice.client.nip.replace(/\D/g, ""))) {
    errors.push("Buyer NIP must be exactly 10 digits")
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export interface KsefSubmissionData {
  invoiceNumber: string
  issueDate: string
  saleDate?: string
  seller: {
    name: string
    nip: string
    address: string
  }
  buyer: {
    name: string
    nip?: string
    address?: string
  }
  items: {
    description: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    netAmount: number
    vatAmount: number
    grossAmount: number
  }[]
  totals: {
    netTotal: number
    vatTotal: number
    grossTotal: number
  }
  paymentInfo: {
    method: string
    dueDate: string
    bankAccount?: string
  }
}

export function prepareKsefSubmission(invoice: any): KsefSubmissionData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate).toISOString().split("T")[0],
    saleDate: invoice.saleDate ? new Date(invoice.saleDate).toISOString().split("T")[0] : undefined,
    seller: {
      name: invoice.organization?.name || "",
      nip: invoice.organization?.nip || "",
      address: `${invoice.organization?.address || ""}, ${invoice.organization?.postalCode || ""} ${invoice.organization?.city || ""}`,
    },
    buyer: {
      name: invoice.client?.name || "",
      nip: invoice.client?.nip,
      address: invoice.client?.address ? `${invoice.client.address}, ${invoice.client.postalCode || ""} ${invoice.client.city || ""}` : undefined,
    },
    items: (invoice.items || []).map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      netAmount: item.netAmount,
      vatAmount: item.vatAmount,
      grossAmount: item.grossAmount,
    })),
    totals: {
      netTotal: invoice.subtotal,
      vatTotal: invoice.vatTotal,
      grossTotal: invoice.total,
    },
    paymentInfo: {
      method: invoice.paymentMethod,
      dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
      bankAccount: invoice.organization?.bankAccount,
    },
  }
}

// Placeholder for actual KSeF API integration
export async function submitToKsef(submissionData: KsefSubmissionData): Promise<{
  success: boolean
  referenceId?: string
  errors?: string[]
}> {
  // This is a placeholder - actual KSeF API integration would go here
  console.log("KSeF submission placeholder:", submissionData)
  return {
    success: true,
    referenceId: `KSeF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999999)).padStart(7, "0")}`,
  }
}

export async function checkKsefStatus(referenceId: string): Promise<{
  status: string
  message?: string
}> {
  // Placeholder
  return { status: "ACCEPTED", message: "Invoice accepted by KSeF" }
}
