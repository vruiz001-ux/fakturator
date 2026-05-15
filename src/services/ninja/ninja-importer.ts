// @ts-nocheck
// Server-side Ninja Invoice → Prisma importer.
// Idempotent via (organizationId, externalSource, externalId) findFirst + update/create.

import { prisma } from "@/lib/prisma"
import {
  type NinjaConfig,
  type NinjaClient,
  type NinjaInvoice,
  type NinjaProduct,
  type NinjaPayment,
  type NinjaQuote,
  type NinjaRecurring,
  fetchAll,
  fetchCompany,
  currencyCode,
  countryCode,
  NINJA_INVOICE_STATUS,
  NINJA_FREQUENCY,
} from "./ninja-source"

const SOURCE = "NINJA_INVOICE"

export interface ImportOptions {
  importClients?: boolean
  importProducts?: boolean
  importInvoices?: boolean
  importQuotes?: boolean
  importRecurring?: boolean
  importPayments?: boolean
}

export interface EntityResult {
  total: number
  imported: number
  updated: number
  skipped: number
  errors: Array<{ id: string; ref: string; message: string }>
}

export interface ImportResult {
  organizationId: string
  organizationName: string
  startedAt: string
  finishedAt: string
  durationMs: number
  clients: EntityResult
  products: EntityResult
  invoices: EntityResult
  quotes: EntityResult
  recurring: EntityResult
  payments: EntityResult
}

const empty = (): EntityResult => ({ total: 0, imported: 0, updated: 0, skipped: 0, errors: [] })

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function mapInvoiceItems(items: NinjaInvoice["line_items"], usesInclusiveTaxes: boolean) {
  return (items || []).map((it, i) => {
    const qty = Number(it.quantity) || 0
    const unitPrice = Number(it.cost) || 0
    const vatRate = Number(it.tax_rate1) || 0
    let netAmount: number
    let vatAmount: number
    let grossAmount: number
    if (usesInclusiveTaxes && vatRate > 0) {
      grossAmount = round2(qty * unitPrice)
      netAmount = round2(grossAmount / (1 + vatRate / 100))
      vatAmount = round2(grossAmount - netAmount)
    } else {
      netAmount = round2(qty * unitPrice)
      vatAmount = vatRate > 0 ? round2(netAmount * (vatRate / 100)) : 0
      grossAmount = round2(netAmount + vatAmount)
    }
    return {
      description: it.notes || it.product_key || "Imported item",
      quantity: qty,
      unit: "SERVICE" as any,
      unitPrice,
      vatRate,
      netAmount,
      vatAmount,
      grossAmount,
      sortOrder: Number(it.sort_id) || i,
    }
  })
}

function totalsFromItems(items: ReturnType<typeof mapInvoiceItems>) {
  const subtotal = round2(items.reduce((s, x) => s + x.netAmount, 0))
  const vatTotal = round2(items.reduce((s, x) => s + x.vatAmount, 0))
  const total = round2(items.reduce((s, x) => s + x.grossAmount, 0))
  return { subtotal, vatTotal, total }
}

function parseDate(s: string | undefined | null, fallback?: Date): Date {
  if (!s) return fallback ?? new Date()
  const d = new Date(s.length === 10 ? `${s}T00:00:00.000Z` : s)
  return isNaN(d.getTime()) ? (fallback ?? new Date()) : d
}

function statusForInvoice(ni: NinjaInvoice): "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" {
  const mapped = NINJA_INVOICE_STATUS[ni.status_id] || "DRAFT"
  if ((mapped === "SENT" || mapped === "PARTIALLY_PAID") && ni.due_date) {
    const due = parseDate(ni.due_date)
    if (due < new Date() && Number(ni.balance) > 0) return "OVERDUE"
  }
  return mapped
}

function bump(result: EntityResult, created: boolean) {
  if (created) result.imported++
  else result.updated++
}

// Idempotency helper: findFirst by (org, source, extId) → update or create.
async function upsertByExternal<T extends { id: string }>(
  model: any,
  externalId: string,
  whereExtra: Record<string, any>,
  createData: any,
  updateData: any,
): Promise<{ row: T; created: boolean }> {
  const existing = await model.findFirst({
    where: { externalSource: SOURCE, externalId, ...whereExtra },
    select: { id: true },
  })
  if (existing) {
    const row = await model.update({ where: { id: existing.id }, data: updateData, select: { id: true } })
    return { row: row as T, created: false }
  }
  const row = await model.create({ data: { externalSource: SOURCE, externalId, ...createData }, select: { id: true } })
  return { row: row as T, created: true }
}

// ───────────────────────────────────────────────────────────
// Org bootstrap
// ───────────────────────────────────────────────────────────

export async function ensureOrgFromNinja(config: NinjaConfig): Promise<{ id: string; name: string }> {
  const { profile } = await fetchCompany(config)
  const defaultCurrency = currencyCode(profile.currencyId, "PLN")
  const country = countryCode(profile.countryId, "PL")

  const existing = await prisma.organization.findFirst({ where: { name: profile.name } })

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        address: profile.address1 || existing.address,
        city: profile.city || existing.city,
        postalCode: profile.postalCode || existing.postalCode,
        country,
        nip: profile.vatNumber || existing.nip,
        phone: profile.phone || existing.phone,
        email: profile.email || existing.email,
        website: profile.website || existing.website,
        defaultCurrency,
      },
      select: { id: true, name: true },
    })
  }

  return prisma.organization.create({
    data: {
      name: profile.name,
      address: profile.address1 || null,
      city: profile.city || null,
      postalCode: profile.postalCode || null,
      country,
      nip: profile.vatNumber || null,
      phone: profile.phone || null,
      email: profile.email || null,
      website: profile.website || null,
      defaultCurrency,
    },
    select: { id: true, name: true },
  })
}

// ───────────────────────────────────────────────────────────
// Importer
// ───────────────────────────────────────────────────────────

export async function importFromNinja(
  config: NinjaConfig,
  organizationId: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const opts = {
    importClients: true,
    importProducts: true,
    importInvoices: true,
    importQuotes: true,
    importRecurring: true,
    importPayments: true,
    ...options,
  }

  const startedAt = new Date()
  const result: ImportResult = {
    organizationId,
    organizationName: "",
    startedAt: startedAt.toISOString(),
    finishedAt: "",
    durationMs: 0,
    clients: empty(),
    products: empty(),
    invoices: empty(),
    quotes: empty(),
    recurring: empty(),
    payments: empty(),
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, defaultCurrency: true },
  })
  if (!org) throw new Error(`Organization ${organizationId} not found`)
  result.organizationName = org.name
  const orgCurrency = org.defaultCurrency || "PLN"

  const migrationLog = await prisma.migrationImport.create({
    data: { organizationId, source: SOURCE, status: "PROCESSING" },
    select: { id: true },
  })

  const clientMap = new Map<string, string>()
  const invoiceMap = new Map<string, string>()
  const serviceMap = new Map<string, string>()

  try {
    // 1) Clients
    if (opts.importClients) {
      const clients = await fetchAll<NinjaClient>(config, "clients", "contacts")
      result.clients.total = clients.length
      for (const nc of clients) {
        if (nc.is_deleted) { result.clients.skipped++; continue }
        const primary = nc.contacts?.find(c => c.is_primary) || nc.contacts?.[0]
        const contactPerson = primary ? `${primary.first_name || ""} ${primary.last_name || ""}`.trim() || null : null
        const address = [nc.address1, nc.address2].filter(Boolean).join(", ") || null
        const data = {
          organizationId,
          name: nc.name || nc.display_name || `Client ${nc.number || nc.id}`,
          email: primary?.email || null,
          phone: nc.phone || primary?.phone || null,
          address,
          city: nc.city || null,
          postalCode: nc.postal_code || null,
          country: countryCode(nc.country_id, "PL"),
          nip: nc.vat_number || null,
          contactPerson,
          notes: nc.public_notes || null,
          invoiceEmail: primary?.email || null,
        }
        try {
          const { row, created } = await upsertByExternal<{ id: string }>(
            prisma.client, nc.id, { organizationId }, data, data,
          )
          clientMap.set(nc.id, row.id)
          bump(result.clients, created)
        } catch (err: any) {
          result.clients.errors.push({ id: nc.id, ref: nc.name || nc.id, message: err.message })
        }
      }
    } else {
      const existing = await prisma.client.findMany({
        where: { organizationId, externalSource: SOURCE },
        select: { id: true, externalId: true },
      })
      existing.forEach(c => c.externalId && clientMap.set(c.externalId, c.id))
    }

    // 2) Products → Services
    if (opts.importProducts) {
      const products = await fetchAll<NinjaProduct>(config, "products")
      result.products.total = products.length
      for (const np of products) {
        if (np.is_deleted) { result.products.skipped++; continue }
        const data = {
          organizationId,
          name: np.product_key || `Service ${np.id}`,
          description: np.notes || null,
          defaultRate: np.price || np.cost || null,
          defaultVatRate: Number(np.tax_rate1) || 0,
          category: "Imported from Ninja",
        }
        try {
          const { row, created } = await upsertByExternal<{ id: string }>(
            prisma.service, np.id, { organizationId }, data, data,
          )
          serviceMap.set(np.id, row.id)
          bump(result.products, created)
        } catch (err: any) {
          result.products.errors.push({ id: np.id, ref: np.product_key || np.id, message: err.message })
        }
      }
    }

    // 3) Invoices (+ items)
    //
    // GUARDRAIL: never downgrade status or reduce paidAmount on update.
    // Once we've marked an invoice PAID in Fakturator (via dashboard/server action),
    // a re-import of Ninja's stale DRAFT/SENT must not overwrite our state.
    if (opts.importInvoices) {
      // Status precedence — higher means "more advanced", never roll back.
      const STATUS_RANK: Record<string, number> = {
        DRAFT: 0, SENT: 1, PARTIALLY_PAID: 2, OVERDUE: 2, PAID: 3, CANCELLED: 4, CORRECTED: 4,
      }
      const invoices = await fetchAll<NinjaInvoice>(config, "invoices")
      result.invoices.total = invoices.length
      for (const ni of invoices) {
        if (ni.is_deleted) { result.invoices.skipped++; continue }
        const clientId = clientMap.get(ni.client_id)
        if (!clientId) {
          result.invoices.errors.push({ id: ni.id, ref: ni.number || ni.id, message: "Client not in map (re-run with importClients=true)" })
          continue
        }
        try {
          const items = mapInvoiceItems(ni.line_items, !!ni.uses_inclusive_taxes)
          const { subtotal, vatTotal, total } = totalsFromItems(items)
          const ninjaStatus = statusForInvoice(ni)
          const issueDate = parseDate(ni.date)
          const dueDate = parseDate(ni.due_date, new Date(issueDate.getTime() + 14 * 86400000))
          const ninjaPaid = Number(ni.paid_to_date) || 0

          // Pull existing local state for guardrail
          const existing = await prisma.invoice.findFirst({
            where: { organizationId, externalSource: SOURCE, externalId: ni.id },
            select: { status: true, paidAmount: true },
          })

          const finalStatus = existing
            ? (STATUS_RANK[existing.status] >= STATUS_RANK[ninjaStatus] ? existing.status : ninjaStatus)
            : ninjaStatus
          const finalPaid = existing ? Math.max(existing.paidAmount, ninjaPaid) : ninjaPaid

          const baseCreate = {
            organizationId,
            clientId,
            invoiceNumber: ni.number || `NINJA-${ni.id}`,
            type: "VAT",
            status: finalStatus,
            issueDate,
            saleDate: issueDate,
            dueDate,
            paymentMethod: "BANK_TRANSFER",
            currency: orgCurrency,
            subtotal,
            vatTotal,
            total,
            paidAmount: finalPaid,
            notes: ni.public_notes || null,
            items: { create: items },
          }
          const baseUpdate = {
            clientId,
            invoiceNumber: ni.number || `NINJA-${ni.id}`,
            status: finalStatus,
            issueDate,
            saleDate: issueDate,
            dueDate,
            currency: orgCurrency,
            subtotal,
            vatTotal,
            total,
            paidAmount: finalPaid,
            notes: ni.public_notes || null,
            items: { deleteMany: {}, create: items },
          }

          const { row, created } = await upsertByExternal<{ id: string }>(
            prisma.invoice, ni.id, { organizationId }, baseCreate, baseUpdate,
          )
          invoiceMap.set(ni.id, row.id)
          bump(result.invoices, created)
        } catch (err: any) {
          result.invoices.errors.push({ id: ni.id, ref: ni.number || ni.id, message: err.message })
        }
      }
    } else {
      const existing = await prisma.invoice.findMany({
        where: { organizationId, externalSource: SOURCE },
        select: { id: true, externalId: true },
      })
      existing.forEach(i => i.externalId && invoiceMap.set(i.externalId, i.id))
    }

    // 4) Quotes → Invoice (type=PROFORMA)
    if (opts.importQuotes) {
      const quotes = await fetchAll<NinjaQuote>(config, "quotes")
      result.quotes.total = quotes.length
      for (const nq of quotes) {
        if (nq.is_deleted) { result.quotes.skipped++; continue }
        const clientId = clientMap.get(nq.client_id)
        if (!clientId) {
          result.quotes.errors.push({ id: nq.id, ref: nq.number || nq.id, message: "Client not in map" })
          continue
        }
        try {
          const items = mapInvoiceItems(nq.line_items, !!nq.uses_inclusive_taxes)
          const { subtotal, vatTotal, total } = totalsFromItems(items)
          const issueDate = parseDate(nq.date)
          const dueDate = parseDate(nq.due_date, new Date(issueDate.getTime() + 14 * 86400000))
          const externalId = `quote:${nq.id}`

          const baseCreate = {
            organizationId,
            clientId,
            invoiceNumber: nq.number || `QUOTE-${nq.id}`,
            type: "PROFORMA",
            status: "DRAFT",
            issueDate,
            saleDate: issueDate,
            dueDate,
            currency: orgCurrency,
            subtotal,
            vatTotal,
            total,
            notes: nq.public_notes || null,
            items: { create: items },
          }
          const baseUpdate = {
            clientId,
            invoiceNumber: nq.number || `QUOTE-${nq.id}`,
            issueDate,
            saleDate: issueDate,
            dueDate,
            currency: orgCurrency,
            subtotal,
            vatTotal,
            total,
            notes: nq.public_notes || null,
            items: { deleteMany: {}, create: items },
          }
          const { created } = await upsertByExternal<{ id: string }>(
            prisma.invoice, externalId, { organizationId }, baseCreate, baseUpdate,
          )
          bump(result.quotes, created)
        } catch (err: any) {
          result.quotes.errors.push({ id: nq.id, ref: nq.number || nq.id, message: err.message })
        }
      }
    }

    // 5) Recurring invoices → RecurringRule
    if (opts.importRecurring) {
      const rec = await fetchAll<NinjaRecurring>(config, "recurring_invoices")
      result.recurring.total = rec.length
      for (const nr of rec) {
        if (nr.is_deleted) { result.recurring.skipped++; continue }
        const clientId = clientMap.get(nr.client_id)
        if (!clientId) {
          result.recurring.errors.push({ id: nr.id, ref: nr.number || nr.id, message: "Client not in map" })
          continue
        }
        try {
          const items = mapInvoiceItems(nr.line_items, !!nr.uses_inclusive_taxes)
          const totals = totalsFromItems(items)
          const frequency = NINJA_FREQUENCY[String(nr.frequency_id)] || "MONTHLY"
          const nextRunDate = parseDate(nr.next_send_date, new Date())
          const data = {
            organizationId,
            clientId,
            frequency,
            nextRunDate,
            isActive: String(nr.status_id) === "2",
            templateData: { number: nr.number, items, totals, currency: orgCurrency, notes: nr.public_notes || null },
          }
          const { created } = await upsertByExternal<{ id: string }>(
            prisma.recurringRule, nr.id, { organizationId }, data, data,
          )
          bump(result.recurring, created)
        } catch (err: any) {
          result.recurring.errors.push({ id: nr.id, ref: nr.number || nr.id, message: err.message })
        }
      }
    }

    // 6) Payments → Payment (one row per paymentable line)
    if (opts.importPayments) {
      const payments = await fetchAll<NinjaPayment>(config, "payments", "paymentables")
      let totalPaymentables = 0
      for (const p of payments) totalPaymentables += (p.paymentables?.length || 0)
      result.payments.total = totalPaymentables
      for (const np of payments) {
        if (np.is_deleted || !np.paymentables?.length) continue
        for (const pt of np.paymentables) {
          if (!pt.invoice_id) { result.payments.skipped++; continue }
          const invoiceId = invoiceMap.get(pt.invoice_id)
          if (!invoiceId) {
            result.payments.errors.push({ id: np.id, ref: np.number || np.id, message: `Invoice ${pt.invoice_id} not in map` })
            continue
          }
          try {
            const externalId = `${np.id}:${pt.invoice_id}`
            const data = {
              invoiceId,
              amount: Number(pt.amount) || 0,
              date: parseDate(np.date),
              method: "BANK_TRANSFER",
              reference: np.transaction_reference || np.number || null,
            }
            const { created } = await upsertByExternal<{ id: string }>(
              prisma.payment, externalId, { invoiceId }, data, data,
            )
            bump(result.payments, created)
          } catch (err: any) {
            result.payments.errors.push({ id: np.id, ref: np.number || np.id, message: err.message })
          }
        }
      }
    }

    const finishedAt = new Date()
    result.finishedAt = finishedAt.toISOString()
    result.durationMs = finishedAt.getTime() - startedAt.getTime()

    const totalImported =
      result.clients.imported + result.clients.updated +
      result.products.imported + result.products.updated +
      result.invoices.imported + result.invoices.updated +
      result.quotes.imported + result.quotes.updated +
      result.recurring.imported + result.recurring.updated +
      result.payments.imported + result.payments.updated
    const totalErrors =
      result.clients.errors.length + result.products.errors.length +
      result.invoices.errors.length + result.quotes.errors.length +
      result.recurring.errors.length + result.payments.errors.length
    const totalRecords =
      result.clients.total + result.products.total + result.invoices.total +
      result.quotes.total + result.recurring.total + result.payments.total

    await prisma.migrationImport.update({
      where: { id: migrationLog.id },
      data: {
        status: totalErrors > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        totalRecords,
        importedRecords: totalImported,
        failedRecords: totalErrors,
        errors: { result } as any,
        importedAt: finishedAt,
      },
    })

    return result
  } catch (err: any) {
    await prisma.migrationImport.update({
      where: { id: migrationLog.id },
      data: { status: "FAILED", errors: { message: err.message, partial: result } as any },
    })
    throw err
  }
}
