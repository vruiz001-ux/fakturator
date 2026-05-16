// KSeF Copilot. Validates an invoice against local rules first, then asks the
// AI to (a) plain-Polish explain any errors, (b) suggest fixes, (c) score the
// rejection probability before submission.

import "server-only"
import { prisma } from "@/lib/prisma"
import { callAi } from "../provider"
import { nipChecksumValid, NIP_RE } from "@/lib/nip"

export type Severity = "error" | "warning" | "info"

export interface KsefIssue {
  code: string
  severity: Severity
  field: string
  message: string
  suggestion?: string
}

export interface KsefValidationResult {
  invoiceId: string
  invoiceNumber: string
  total: number
  currency: string
  passed: boolean
  errors: KsefIssue[]
  warnings: KsefIssue[]
  rejectionProbability: number   // 0-1
  aiSummary: string              // plain-Polish explanation
  recommendedActions: string[]
}

export async function validateForKsef(invoiceId: string, organizationId: string): Promise<KsefValidationResult> {
  const inv = await prisma.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId },
    include: { client: true, organization: true, items: true },
  })

  const issues: KsefIssue[] = []

  // Seller NIP
  const sellerNip = (inv.organization.nip || "").replace(/[^0-9]/g, "")
  if (!sellerNip) {
    issues.push({ code: "SELLER_NIP_MISSING", severity: "error", field: "organization.nip", message: "Seller NIP is required" })
  } else if (!nipChecksumValid(sellerNip)) {
    issues.push({ code: "SELLER_NIP_INVALID", severity: "error", field: "organization.nip", message: "Seller NIP checksum invalid", suggestion: "Verify the NIP digits — checksum failed" })
  }

  // Seller name + address
  if (!inv.organization.name) issues.push({ code: "SELLER_NAME_MISSING", severity: "error", field: "organization.name", message: "Seller name required" })
  if (!inv.organization.address) issues.push({ code: "SELLER_ADDR_MISSING", severity: "warning", field: "organization.address", message: "Seller address missing — required for KSeF FA(2)" })

  // Buyer
  if (!inv.client.name) issues.push({ code: "BUYER_NAME_MISSING", severity: "error", field: "client.name", message: "Buyer name required" })
  const buyerNip = (inv.client.nip || "").replace(/[^0-9]/g, "")
  const buyerIsPolish = (inv.client.country || "PL") === "PL"
  if (buyerIsPolish && !buyerNip) {
    issues.push({ code: "BUYER_NIP_MISSING_PL", severity: "error", field: "client.nip", message: "Polish B2B buyer must have NIP", suggestion: "If this is a B2C invoice, set buyer country or mark as consumer" })
  } else if (buyerNip && buyerIsPolish && !nipChecksumValid(buyerNip)) {
    issues.push({ code: "BUYER_NIP_INVALID", severity: "error", field: "client.nip", message: "Buyer NIP checksum invalid" })
  }

  // Invoice fundamentals
  if (!inv.invoiceNumber) issues.push({ code: "NO_NUMBER", severity: "error", field: "invoiceNumber", message: "Invoice number required" })
  if (!inv.issueDate) issues.push({ code: "NO_ISSUE_DATE", severity: "error", field: "issueDate", message: "Issue date required" })
  if (!inv.items.length) issues.push({ code: "NO_ITEMS", severity: "error", field: "items", message: "At least one line item required" })

  // Math integrity
  const recomputedNet = inv.items.reduce((s, i) => s + i.netAmount, 0)
  const recomputedVat = inv.items.reduce((s, i) => s + i.vatAmount, 0)
  const recomputedTotal = recomputedNet + recomputedVat
  if (Math.abs(recomputedTotal - inv.total) > 0.02) {
    issues.push({
      code: "TOTAL_MISMATCH",
      severity: "error",
      field: "total",
      message: `Total ${inv.total.toFixed(2)} does not match sum of items ${recomputedTotal.toFixed(2)}`,
      suggestion: "Recompute totals from line items",
    })
  }

  // Split-payment (MPP) for ≥15,000 PLN B2B
  const pln15k = inv.currency === "PLN" ? 15000 : (inv.currency === "EUR" ? 3500 : null)
  if (pln15k && inv.total >= pln15k && buyerIsPolish && buyerNip) {
    issues.push({
      code: "MPP_CONSIDER",
      severity: "info",
      field: "invoice",
      message: `Invoice ≥ ${pln15k} ${inv.currency} to PL B2B may require Split-Payment (MPP) marking under Polish law`,
      suggestion: 'Add "mechanizm podzielonej płatności" annotation if items fall under Annex 15',
    })
  }

  const errors = issues.filter(i => i.severity === "error")
  const warnings = issues.filter(i => i.severity === "warning")
  const infos = issues.filter(i => i.severity === "info")

  // Rejection probability heuristic
  const rejectionProbability = Math.min(1, errors.length * 0.4 + warnings.length * 0.08)

  // AI summary in plain Polish
  const aiSummary = await aiExplainIssues(organizationId, inv.invoiceNumber, issues)
  const recommendedActions = [
    ...errors.map(e => e.suggestion || `Fix: ${e.message}`),
    ...warnings.map(w => w.suggestion || `Review: ${w.message}`),
  ]

  return {
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    total: inv.total,
    currency: inv.currency,
    passed: errors.length === 0,
    errors,
    warnings,
    rejectionProbability,
    aiSummary,
    recommendedActions,
  }
}

async function aiExplainIssues(organizationId: string, invoiceNumber: string, issues: KsefIssue[]): Promise<string> {
  if (issues.length === 0) {
    return "Walidacja zaliczona — faktura gotowa do wysłania do KSeF."
  }
  const system = `You are a Polish KSeF (e-invoicing) compliance assistant. Explain validation issues in plain Polish for a small-business owner. Be specific, no jargon. Output 2-4 sentences. No markdown.`
  const user = [
    `Faktura ${invoiceNumber} — wyniki walidacji KSeF:`,
    ...issues.map(i => `- [${i.severity.toUpperCase()}] ${i.code}: ${i.message}${i.suggestion ? ` (sugestia: ${i.suggestion})` : ""}`),
    "",
    "Wyjaśnij użytkownikowi, co poszło nie tak i co zrobić, żeby przeszło.",
  ].join("\n")

  const result = await callAi(
    { system, messages: [{ role: "user", content: user }], maxTokens: 400, temperature: 0.3 },
    { organizationId, interactionType: `ksef_explain:${issues.length > 0 ? "issues" : "ok"}` },
  )
  return result.text.trim()
}
