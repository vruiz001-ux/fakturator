// Client-side import: maps Ninja data and inserts into browser data store
import type { NinjaClient, NinjaInvoice, NinjaProduct, NinjaPayment, NinjaImportResult } from "./ninja.types"
import { addClient, addInvoice, addService, updateInvoiceStatus, initializeStore, setCompany } from "@/lib/store/data-store"
import { logAudit } from "@/lib/audit/audit.service"

const NINJA_STATUS: Record<string, string> = {
  "1": "DRAFT", "2": "SENT", "3": "PARTIALLY_PAID",
  "4": "PAID", "5": "CANCELLED", "6": "CANCELLED",
}

export function importNinjaDataToStore(data: {
  clients: NinjaClient[]
  invoices: NinjaInvoice[]
  products: NinjaProduct[]
  payments: NinjaPayment[]
  companyName?: string
  companyProfile?: {
    name: string
    address1: string
    address2: string
    city: string
    state: string
    postalCode: string
    countryId: string
    vatNumber: string
    phone: string
    email: string
    website: string
  }
}): NinjaImportResult {
  initializeStore()

  // Set full company profile from Ninja
  if (data.companyProfile) {
    const p = data.companyProfile
    const address = [p.address1, p.address2].filter(Boolean).join(", ")
    const nip = p.vatNumber?.replace(/^PL/i, "") || ""
    setCompany({
      name: p.name,
      address,
      city: p.city,
      postalCode: p.postalCode,
      country: "PL",
      nip,
      email: p.email,
      phone: p.phone,
    })
  } else if (data.companyName) {
    setCompany({ name: data.companyName })
  }

  const result: NinjaImportResult = {
    clients: { total: data.clients.length, imported: 0, errors: [] },
    invoices: { total: data.invoices.length, imported: 0, errors: [] },
    products: { total: data.products.length, imported: 0, errors: [] },
    payments: { total: data.payments.length, imported: 0, errors: [] },
  }

  const clientMap = new Map<string, string>()

  logAudit({
    action: "MIGRATION_STARTED",
    entityType: "MIGRATION",
    actor: "SYSTEM",
    success: true,
    details: { source: "NINJA_INVOICE" },
  })

  // 1. Products → Services
  for (const p of data.products) {
    try {
      addService({
        name: p.product_key || "Imported Product",
        description: p.notes || undefined,
        defaultRate: p.price || p.cost || undefined,
        defaultUnit: "SERVICE",
        defaultVatRate: p.tax_rate1 || 23,
        category: "Imported",
      })
      result.products.imported++
    } catch (e: any) {
      result.products.errors.push(`${p.product_key}: ${e.message}`)
    }
  }

  // 2. Clients
  for (const c of data.clients) {
    try {
      const contact = c.contacts?.find((ct: any) => ct.is_primary) || c.contacts?.[0]
      const client = addClient({
        name: c.name || "Unnamed Client",
        email: contact?.email || undefined,
        phone: c.phone || contact?.phone || undefined,
        address: [c.address1, c.address2].filter(Boolean).join(", ") || undefined,
        city: c.city || undefined,
        postalCode: c.postal_code || undefined,
        country: "PL",
        nip: c.vat_number || undefined,
        contactPerson: contact ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || undefined : undefined,
        notes: c.public_notes || undefined,
      })
      clientMap.set(c.id, client.id)
      result.clients.imported++
    } catch (e: any) {
      result.clients.errors.push(`${c.name}: ${e.message}`)
    }
  }

  // 3. Invoices
  for (const inv of data.invoices) {
    try {
      const clientId = clientMap.get(inv.client_id)
      if (!clientId) {
        result.invoices.errors.push(`${inv.number}: client not found`)
        continue
      }

      const items = (inv.line_items || []).map((li: any, i: number) => {
        const net = Math.round((li.quantity || 1) * (li.cost || 0) * 100) / 100
        const vatRate = li.tax_rate1 || 0
        const vat = vatRate > 0 ? Math.round(net * vatRate / 100 * 100) / 100 : 0
        return {
          description: li.notes || li.product_key || "Imported item",
          quantity: li.quantity || 1,
          unit: "SERVICE" as const,
          unitPrice: li.cost || 0,
          vatRate,
          netAmount: net,
          vatAmount: vat,
          grossAmount: Math.round((net + vat) * 100) / 100,
          sortOrder: li.sort_id || i,
        }
      })

      if (items.length === 0) {
        result.invoices.errors.push(`${inv.number}: no line items`)
        continue
      }

      const dueDate = inv.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
      const created = addInvoice({
        clientId,
        type: "VAT",
        issueDate: inv.date || undefined,
        saleDate: inv.date || undefined,
        dueDate,
        paymentMethod: "BANK_TRANSFER",
        currency: "PLN",
        notes: inv.public_notes || undefined,
        items,
      })

      // Set status
      const targetStatus = NINJA_STATUS[inv.status_id] || "DRAFT"
      try {
        if (targetStatus === "SENT") updateInvoiceStatus(created.id, "SENT")
        if (targetStatus === "PAID") { updateInvoiceStatus(created.id, "SENT"); updateInvoiceStatus(created.id, "PAID") }
        if (targetStatus === "PARTIALLY_PAID") { updateInvoiceStatus(created.id, "SENT"); updateInvoiceStatus(created.id, "PARTIALLY_PAID") }
        if (targetStatus === "CANCELLED") updateInvoiceStatus(created.id, "CANCELLED")
      } catch {}

      result.invoices.imported++
    } catch (e: any) {
      result.invoices.errors.push(`${inv.number}: ${e.message}`)
    }
  }

  // 4. Payments (count only — already handled via invoice status)
  result.payments.imported = data.payments.length

  logAudit({
    action: "MIGRATION_COMPLETED",
    entityType: "MIGRATION",
    actor: "SYSTEM",
    success: true,
    details: { source: "NINJA_INVOICE", result },
  })

  return result
}
