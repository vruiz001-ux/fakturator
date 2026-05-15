// AI Assistant — general-purpose Q&A over the user's invoicing data.
// Strategy: gather a structured digest of the org's current state, drop it
// into the system prompt, and let the model answer. For Vincent's data size
// (14 invoices, 1 client) this fits in <2K tokens — no tools required yet.

import "server-only"
import { prisma } from "@/lib/prisma"
import { callAi, type AiMessage } from "../provider"

export interface AssistantMessage {
  role: "user" | "assistant"
  content: string
}

interface BookContext {
  orgName: string
  currency: string
  todayIso: string
  totals: {
    totalInvoiced: number
    totalPaid: number
    totalOutstanding: number
    totalOverdue: number
    ytdRevenue: number
    monthRevenue: number
    averageInvoiceValue: number
    averagePaymentDelayDays: number
    vatCollectedYtd: number
  }
  clientsCount: number
  clients: Array<{
    name: string
    nip: string | null
    country: string
    invoiceCount: number
    totalBilled: number
    outstanding: number
    averageLagDays: number | null
  }>
  invoices: Array<{
    number: string
    clientName: string
    issueDate: string
    dueDate: string
    status: string
    total: number
    paid: number
    outstanding: number
    daysOverdue: number
    type: string
    description: string
  }>
}

async function buildContext(organizationId: string): Promise<BookContext> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, defaultCurrency: true },
  })
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))

  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    orderBy: { issueDate: "desc" },
    include: {
      client: { select: { name: true, nip: true, country: true } },
      items: { select: { description: true } },
      payments: { orderBy: { date: "asc" }, take: 1, select: { date: true } },
    },
  })

  const clientsAll = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true, name: true, nip: true, country: true },
  })

  // Per-client aggregates
  const perClient = new Map<string, {
    name: string; nip: string | null; country: string;
    invoiceCount: number; totalBilled: number; outstanding: number; lags: number[];
  }>()
  for (const c of clientsAll) {
    perClient.set(c.id, { name: c.name, nip: c.nip, country: c.country, invoiceCount: 0, totalBilled: 0, outstanding: 0, lags: [] })
  }

  let totalInvoiced = 0, totalPaid = 0, totalOutstanding = 0, totalOverdue = 0
  let ytdRevenue = 0, monthRevenue = 0, vatYtd = 0
  let validInvoiceCount = 0

  for (const inv of invoices) {
    if (inv.type === "PROFORMA" || inv.status === "CANCELLED" || inv.status === "CORRECTED") continue
    validInvoiceCount++
    totalInvoiced += inv.total
    totalPaid += inv.paidAmount
    const outstanding = Math.max(0, inv.total - inv.paidAmount)
    totalOutstanding += outstanding
    if (inv.status === "OVERDUE") totalOverdue += outstanding
    if (inv.issueDate >= yearStart) { ytdRevenue += inv.total; vatYtd += inv.vatTotal }
    if (inv.issueDate >= monthStart) monthRevenue += inv.total

    const c = perClient.get(inv.clientId)
    if (c) {
      c.invoiceCount++
      c.totalBilled += inv.total
      c.outstanding += outstanding
      if (inv.status === "PAID" && inv.payments[0]?.date) {
        c.lags.push(Math.max(0, Math.floor((inv.payments[0].date.getTime() - inv.issueDate.getTime()) / 86400000)))
      }
    }
  }
  const avgInvoiceValue = validInvoiceCount > 0 ? totalInvoiced / validInvoiceCount : 0
  const allLags = Array.from(perClient.values()).flatMap(c => c.lags)
  const avgPaymentDelay = allLags.length > 0 ? Math.round(allLags.reduce((a, c) => a + c, 0) / allLags.length) : 0

  const now = Date.now()
  return {
    orgName: org.name,
    currency: org.defaultCurrency,
    todayIso: new Date().toISOString().slice(0, 10),
    totals: {
      totalInvoiced: round2(totalInvoiced),
      totalPaid: round2(totalPaid),
      totalOutstanding: round2(totalOutstanding),
      totalOverdue: round2(totalOverdue),
      ytdRevenue: round2(ytdRevenue),
      monthRevenue: round2(monthRevenue),
      averageInvoiceValue: round2(avgInvoiceValue),
      averagePaymentDelayDays: avgPaymentDelay,
      vatCollectedYtd: round2(vatYtd),
    },
    clientsCount: clientsAll.length,
    clients: Array.from(perClient.values()).map(c => ({
      name: c.name,
      nip: c.nip,
      country: c.country,
      invoiceCount: c.invoiceCount,
      totalBilled: round2(c.totalBilled),
      outstanding: round2(c.outstanding),
      averageLagDays: c.lags.length > 0 ? Math.round(c.lags.reduce((a, b) => a + b, 0) / c.lags.length) : null,
    })),
    invoices: invoices.slice(0, 50).map(inv => ({
      number: inv.invoiceNumber,
      clientName: inv.client?.name ?? "—",
      issueDate: inv.issueDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      status: inv.status,
      total: round2(inv.total),
      paid: round2(inv.paidAmount),
      outstanding: round2(Math.max(0, inv.total - inv.paidAmount)),
      daysOverdue: inv.status !== "PAID" && inv.dueDate.getTime() < now
        ? Math.floor((now - inv.dueDate.getTime()) / 86400000) : 0,
      type: inv.type,
      description: inv.items.map(i => i.description).join("; ").slice(0, 80),
    })),
  }
}

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function askAssistant(
  organizationId: string,
  history: AssistantMessage[],
): Promise<{ reply: string; provider: string; model: string }> {
  if (history.length === 0) {
    return { reply: "Ask me anything about your invoicing, clients, taxes, or cash flow.", provider: "noop", model: "noop" }
  }
  const ctx = await buildContext(organizationId)

  const system = [
    `You are the AI assistant for Fakturator, a Polish-market invoicing SaaS.`,
    `You answer questions about the user's books using ONLY the data below.`,
    `If the answer can be computed from the data, do the math and answer in 1-3 sentences with specific numbers (currency: ${ctx.currency}).`,
    `If a question can't be answered from the data, say so plainly and suggest what's needed.`,
    `Today is ${ctx.todayIso}. Format money with the currency symbol.`,
    `No em dashes. No AI cliches. No flattery.`,
    "",
    `## Company: ${ctx.orgName}`,
    `## Totals`,
    `- Total invoiced: ${ctx.currency} ${ctx.totals.totalInvoiced}`,
    `- Total paid: ${ctx.currency} ${ctx.totals.totalPaid}`,
    `- Outstanding: ${ctx.currency} ${ctx.totals.totalOutstanding}`,
    `- Overdue: ${ctx.currency} ${ctx.totals.totalOverdue}`,
    `- YTD revenue: ${ctx.currency} ${ctx.totals.ytdRevenue}`,
    `- Month revenue: ${ctx.currency} ${ctx.totals.monthRevenue}`,
    `- Average invoice value: ${ctx.currency} ${ctx.totals.averageInvoiceValue}`,
    `- Average payment delay: ${ctx.totals.averagePaymentDelayDays} days`,
    `- VAT collected YTD: ${ctx.currency} ${ctx.totals.vatCollectedYtd}`,
    "",
    `## Clients (${ctx.clientsCount})`,
    ...ctx.clients.map(c =>
      `- ${c.name} (${c.country}${c.nip ? ", NIP " + c.nip : ""}): ${c.invoiceCount} invoices, billed ${c.totalBilled}, outstanding ${c.outstanding}, avg pay-lag ${c.averageLagDays ?? "n/a"}d`
    ),
    "",
    `## Recent invoices (showing ${ctx.invoices.length})`,
    ...ctx.invoices.map(i =>
      `- ${i.number} ${i.clientName} | ${i.type} ${i.status} | issued ${i.issueDate} due ${i.dueDate}${i.daysOverdue > 0 ? ` (overdue ${i.daysOverdue}d)` : ""} | total ${i.total} paid ${i.paid} outstanding ${i.outstanding} | ${i.description || "—"}`
    ),
  ].join("\n")

  const messages: AiMessage[] = history.map(m => ({ role: m.role, content: m.content }))

  const result = await callAi(
    { system, messages, maxTokens: 600, temperature: 0.3 },
    { organizationId, interactionType: "assistant_chat" },
  )

  return { reply: result.text.trim(), provider: result.provider, model: result.model }
}
