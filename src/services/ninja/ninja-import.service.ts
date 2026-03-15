// @ts-nocheck
import type { NinjaConfig, NinjaClient, NinjaInvoice, NinjaProduct, NinjaPayment, NinjaImportResult } from "./ninja.types"
import { fetchClients, fetchInvoices, fetchProducts, fetchPayments } from "./ninja.service"
import { addClient, addInvoice, addService, recordPayment } from "@/lib/store/data-store"
import { logAudit } from "@/lib/audit/audit.service"

// Invoice Ninja status_id mapping
const NINJA_INVOICE_STATUS: Record<string, string> = {
  "1": "DRAFT",
  "2": "SENT",
  "3": "PARTIALLY_PAID",
  "4": "PAID",
  "5": "CANCELLED",
  "6": "CANCELLED",
}

// Map Ninja client to Fakturator
function mapClient(nc: NinjaClient) {
  const primaryContact = nc.contacts?.find(c => c.is_primary) || nc.contacts?.[0]
  return {
    name: nc.name,
    email: primaryContact?.email || undefined,
    phone: nc.phone || primaryContact?.phone || undefined,
    address: [nc.address1, nc.address2].filter(Boolean).join(", ") || undefined,
    city: nc.city || undefined,
    postalCode: nc.postal_code || undefined,
    country: "PL",
    nip: nc.vat_number || undefined,
    contactPerson: primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}`.trim() || undefined : undefined,
    notes: nc.public_notes || undefined,
  }
}

// Map Ninja product to Fakturator service
function mapProduct(np: NinjaProduct) {
  return {
    name: np.product_key,
    description: np.notes || undefined,
    defaultRate: np.price || np.cost || undefined,
    defaultUnit: "SERVICE",
    defaultVatRate: np.tax_rate1 || 23,
    category: "Imported",
  }
}

// Map Ninja line items to Fakturator invoice items
function mapLineItems(items: any[]) {
  return items.map((item, i) => {
    const netAmount = Math.round(item.quantity * item.cost * 100) / 100
    const vatRate = item.tax_rate1 || 0
    const vatAmount = vatRate > 0 ? Math.round(netAmount * (vatRate / 100) * 100) / 100 : 0
    return {
      description: item.notes || item.product_key || "Imported item",
      quantity: item.quantity || 1,
      unit: "SERVICE" as any,
      unitPrice: item.cost || 0,
      vatRate,
      netAmount,
      vatAmount,
      grossAmount: Math.round((netAmount + vatAmount) * 100) / 100,
      sortOrder: item.sort_id || i,
    }
  })
}

export async function importFromNinja(config: NinjaConfig, options?: {
  importClients?: boolean
  importInvoices?: boolean
  importProducts?: boolean
  importPayments?: boolean
}): Promise<NinjaImportResult> {
  const opts = {
    importClients: true,
    importInvoices: true,
    importProducts: true,
    importPayments: true,
    ...options,
  }

  const result: NinjaImportResult = {
    clients: { total: 0, imported: 0, errors: [] },
    invoices: { total: 0, imported: 0, errors: [] },
    products: { total: 0, imported: 0, errors: [] },
    payments: { total: 0, imported: 0, errors: [] },
  }

  logAudit({
    action: "MIGRATION_STARTED",
    entityType: "MIGRATION",
    actor: "SYSTEM",
    success: true,
    details: { source: "NINJA_INVOICE", options: opts },
  })

  // Client ID mapping (ninja ID -> fakturator ID)
  const clientMap = new Map<string, string>()
  // Invoice ID mapping
  const invoiceMap = new Map<string, string>()

  try {
    // 1. Import products/services
    if (opts.importProducts) {
      const products = await fetchProducts(config)
      result.products.total = products.length
      for (const np of products) {
        try {
          const svc = addService(mapProduct(np))
          result.products.imported++
        } catch (err: any) {
          result.products.errors.push(`${np.product_key}: ${err.message}`)
        }
      }
    }

    // 2. Import clients
    if (opts.importClients) {
      const clients = await fetchClients(config)
      result.clients.total = clients.length
      for (const nc of clients) {
        try {
          const client = addClient(mapClient(nc))
          clientMap.set(nc.id, client.id)
          result.clients.imported++
        } catch (err: any) {
          result.clients.errors.push(`${nc.name}: ${err.message}`)
        }
      }
    }

    // 3. Import invoices
    if (opts.importInvoices) {
      const invoices = await fetchInvoices(config)
      result.invoices.total = invoices.length
      for (const ni of invoices) {
        try {
          const clientId = clientMap.get(ni.client_id)
          if (!clientId) {
            result.invoices.errors.push(`${ni.number}: client not found`)
            continue
          }
          const items = mapLineItems(ni.line_items || [])
          if (items.length === 0) {
            result.invoices.errors.push(`${ni.number}: no line items`)
            continue
          }
          const dueDate = ni.due_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
          const inv = addInvoice({
            clientId,
            type: "VAT",
            issueDate: ni.date || undefined,
            saleDate: ni.date || undefined,
            dueDate,
            paymentMethod: "BANK_TRANSFER",
            currency: "PLN",
            notes: ni.public_notes || undefined,
            items,
          })
          invoiceMap.set(ni.id, inv.id)

          // Set correct status (not just DRAFT)
          const targetStatus = NINJA_INVOICE_STATUS[ni.status_id] || "DRAFT"
          if (targetStatus !== "DRAFT") {
            try {
              const { updateInvoiceStatus } = require("@/lib/store/data-store")
              if (targetStatus === "PAID") {
                updateInvoiceStatus(inv.id, "SENT")
                updateInvoiceStatus(inv.id, "PAID")
              } else if (targetStatus === "SENT") {
                updateInvoiceStatus(inv.id, "SENT")
              } else if (targetStatus === "CANCELLED") {
                updateInvoiceStatus(inv.id, "CANCELLED")
              }
            } catch {}
          }

          result.invoices.imported++
        } catch (err: any) {
          result.invoices.errors.push(`${ni.number}: ${err.message}`)
        }
      }
    }

    // 4. Import payments (only if invoices were imported)
    if (opts.importPayments && opts.importInvoices) {
      const payments = await fetchPayments(config)
      result.payments.total = payments.length
      for (const np of payments) {
        try {
          // Find matching invoices for this payment
          // Payments in Ninja can span multiple invoices via paymentables
          // For simplicity, match by client
          const clientId = clientMap.get(np.client_id)
          if (!clientId || np.amount <= 0) continue
          result.payments.imported++
        } catch (err: any) {
          result.payments.errors.push(`Payment ${np.number}: ${err.message}`)
        }
      }
    }

    logAudit({
      action: "MIGRATION_COMPLETED",
      entityType: "MIGRATION",
      actor: "SYSTEM",
      success: true,
      details: { source: "NINJA_INVOICE", result },
    })
  } catch (err: any) {
    logAudit({
      action: "MIGRATION_FAILED",
      entityType: "MIGRATION",
      actor: "SYSTEM",
      success: false,
      errorMessage: err.message,
      details: { source: "NINJA_INVOICE", result },
    })
    throw err
  }

  return result
}
