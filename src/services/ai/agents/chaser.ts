// Auto-Chasing agent. Drafts payment-reminder emails in Polish, English, or French
// with three escalating tones, then optionally sends via Resend.

import "server-only"
import { prisma } from "@/lib/prisma"
import { callAi } from "../provider"

export type ChaseTone = "friendly" | "formal" | "final"
export type ChaseLanguage = "en" | "pl" | "fr"

const TONE_DESCRIPTION: Record<ChaseTone, string> = {
  friendly: "warm, collaborative, assumes oversight not bad faith. No threats.",
  formal: "polite but firm. Clear about overdue status. Mention consequences exist but don't list them.",
  final: "final notice tone. Mention next steps (legal action, debt collection, late-fee). Still professional, never abusive.",
}

const LANGUAGE_NAME: Record<ChaseLanguage, string> = {
  en: "English",
  pl: "Polish (Polski)",
  fr: "French (Français)",
}

export interface ChaseDraft {
  subject: string
  body: string
  tone: ChaseTone
  language: ChaseLanguage
  recipientEmail: string | null
  ccEmails: string[]
  daysOverdue: number
  amountOutstanding: number
  currency: string
}

export async function draftChase(
  invoiceId: string,
  organizationId: string,
  tone: ChaseTone = "friendly",
  language: ChaseLanguage = "en",
): Promise<ChaseDraft> {
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId },
    include: { client: true, organization: true, items: { orderBy: { sortOrder: "asc" } } },
  })

  const outstanding = Math.max(0, invoice.total - invoice.paidAmount)
  const daysOverdue = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000))

  const system = [
    `You write payment-reminder emails for a Polish business owner.`,
    `Output format: respond with exactly two lines:`,
    `LINE 1: Subject: <subject in ${LANGUAGE_NAME[language]}>`,
    `LINE 2 onwards: the email body in ${LANGUAGE_NAME[language]}.`,
    `Tone for this reminder: ${TONE_DESCRIPTION[tone]}`,
    `Style rules:`,
    `- No em dashes. No AI cliches like "I hope this email finds you well".`,
    `- No flattery. No apologies for reaching out.`,
    `- Reference the invoice number, amount, original due date, and days overdue.`,
    `- Be specific about the action requested: "please confirm payment by <date>" or "please share an updated payment date".`,
    `- Sign off with sender name + company.`,
    `- Maximum 8 sentences total.`,
  ].join("\n")

  const userMsg = [
    `Company (sender): ${invoice.organization.name}${invoice.organization.nip ? ` (NIP: ${invoice.organization.nip})` : ""}`,
    `Client (recipient): ${invoice.client.name}${invoice.client.contactPerson ? ` — attention ${invoice.client.contactPerson}` : ""}`,
    `Invoice number: ${invoice.invoiceNumber}`,
    `Original due date: ${invoice.dueDate.toISOString().slice(0, 10)}`,
    `Days overdue: ${daysOverdue}`,
    `Amount outstanding: ${invoice.currency} ${outstanding.toFixed(2)}`,
    `Line items: ${invoice.items.map(i => i.description).join("; ")}`,
    `Sender bank: ${invoice.organization.bankName || "—"} ${invoice.organization.bankAccount || ""}`.trim(),
    "",
    `Write the reminder. Tone: ${tone}. Language: ${LANGUAGE_NAME[language]}.`,
  ].join("\n")

  const result = await callAi(
    { system, messages: [{ role: "user", content: userMsg }], maxTokens: 600, temperature: tone === "final" ? 0.2 : 0.5 },
    { organizationId, interactionType: `chase_draft:${tone}:${language}` },
  )

  const { subject, body } = splitSubjectAndBody(result.text)
  return {
    subject,
    body,
    tone,
    language,
    recipientEmail: invoice.client.invoiceEmail || invoice.client.email || null,
    ccEmails: invoice.client.invoiceEmailCc || [],
    daysOverdue,
    amountOutstanding: outstanding,
    currency: invoice.currency,
  }
}

function splitSubjectAndBody(raw: string): { subject: string; body: string } {
  const text = raw.trim()
  const m = text.match(/^Subject:\s*(.+?)\r?\n([\s\S]+)$/i)
  if (m) return { subject: m[1].trim(), body: m[2].trim() }
  // Fallback: first non-empty line as subject
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  return {
    subject: lines[0]?.slice(0, 120) || "Payment reminder",
    body: lines.slice(1).join("\n").trim() || text,
  }
}
