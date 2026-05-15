// Cash-flow forecaster: combines pay-lag history per client + scheduled
// recurring invoices + outstanding receivables into a 30/60/90-day projection,
// then asks the AI for a 2-3 sentence commentary on the result.

import "server-only"
import { prisma } from "@/lib/prisma"
import { callAi } from "../provider"

export interface PayLagStat {
  clientId: string
  clientName: string
  paidInvoices: number
  averageLagDays: number
  medianLagDays: number
}

export interface ForecastBucket {
  label: string         // "0-30d", "31-60d", "61-90d"
  startDays: number
  endDays: number
  expectedInflow: number
  expectedOutflow: number
  net: number
}

export interface ForecastResult {
  currency: string
  asOf: string
  totalReceivables: number
  totalOverdue: number
  payLag: PayLagStat[]
  buckets: ForecastBucket[]
  monthlyRecurring: number
  commentary: string
  riskFlags: string[]
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

export async function generateForecast(organizationId: string): Promise<ForecastResult> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, defaultCurrency: true },
  })

  // Pay-lag per client (PAID invoices only, using first payment date - issue date)
  const paidInvoices = await prisma.invoice.findMany({
    where: { organizationId, status: "PAID", type: { not: "PROFORMA" } },
    select: {
      id: true, clientId: true, issueDate: true,
      client: { select: { name: true } },
      payments: { orderBy: { date: "asc" }, take: 1, select: { date: true } },
    },
  })
  const lagsByClient = new Map<string, { name: string; lags: number[] }>()
  for (const inv of paidInvoices) {
    const firstPay = inv.payments[0]?.date
    if (!firstPay) continue
    const lag = Math.max(0, Math.round((firstPay.getTime() - inv.issueDate.getTime()) / 86400000))
    const bucket = lagsByClient.get(inv.clientId) || { name: inv.client?.name ?? "—", lags: [] }
    bucket.lags.push(lag)
    lagsByClient.set(inv.clientId, bucket)
  }
  const payLag: PayLagStat[] = Array.from(lagsByClient.entries()).map(([clientId, b]) => ({
    clientId,
    clientName: b.name,
    paidInvoices: b.lags.length,
    averageLagDays: Math.round(b.lags.reduce((a, c) => a + c, 0) / b.lags.length),
    medianLagDays: Math.round(median(b.lags)),
  }))

  // Outstanding/overdue invoices → place into 30/60/90 day buckets
  const open = await prisma.invoice.findMany({
    where: {
      organizationId,
      type: { not: "PROFORMA" },
      status: { in: ["SENT", "DRAFT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: { id: true, clientId: true, total: true, paidAmount: true, dueDate: true, status: true },
  })

  const now = new Date()
  const buckets: ForecastBucket[] = [
    { label: "0-30 days", startDays: 0, endDays: 30, expectedInflow: 0, expectedOutflow: 0, net: 0 },
    { label: "31-60 days", startDays: 31, endDays: 60, expectedInflow: 0, expectedOutflow: 0, net: 0 },
    { label: "61-90 days", startDays: 61, endDays: 90, expectedInflow: 0, expectedOutflow: 0, net: 0 },
  ]

  for (const inv of open) {
    const outstanding = Math.max(0, inv.total - inv.paidAmount)
    if (outstanding <= 0) continue
    const clientLag = payLag.find(p => p.clientId === inv.clientId)?.medianLagDays ?? 14
    const expectedPayDate = new Date(inv.dueDate.getTime() + clientLag * 86400000)
    const daysOut = Math.max(0, Math.ceil((expectedPayDate.getTime() - now.getTime()) / 86400000))
    const bucket = buckets.find(b => daysOut >= b.startDays && daysOut <= b.endDays) || buckets[0]
    bucket.expectedInflow += outstanding
  }

  // Recurring rules contribute to inflow over 90 days
  const recurring = await prisma.recurringRule.findMany({
    where: { organizationId, isActive: true },
    select: { frequency: true, templateData: true },
  })
  let monthlyRecurring = 0
  for (const r of recurring) {
    const td: any = r.templateData
    const amount = Number(td?.totals?.total) || 0
    const factor = r.frequency === "MONTHLY" ? 1 : r.frequency === "QUARTERLY" ? 1 / 3 : 1 / 12
    monthlyRecurring += amount * factor
  }
  // Spread across the 3 buckets (1 hit in 0-30, 1 in 31-60, 1 in 61-90 for monthly)
  buckets[0].expectedInflow += monthlyRecurring
  buckets[1].expectedInflow += monthlyRecurring
  buckets[2].expectedInflow += monthlyRecurring

  // Expenses: use last 90 days as a forward proxy
  const past = new Date(now.getTime() - 90 * 86400000)
  const recentExpenses = await prisma.expense.aggregate({
    where: { organizationId, date: { gte: past } },
    _sum: { grossAmount: true },
  })
  const monthlyExpenseRunRate = (recentExpenses._sum.grossAmount ?? 0) / 3
  for (const b of buckets) b.expectedOutflow += monthlyExpenseRunRate
  for (const b of buckets) b.net = b.expectedInflow - b.expectedOutflow

  const totalReceivables = open.reduce((s, i) => s + Math.max(0, i.total - i.paidAmount), 0)
  const overdueAgg = await prisma.invoice.aggregate({
    where: { organizationId, ...{ type: { not: "PROFORMA" as any } }, status: "OVERDUE" },
    _sum: { total: true, paidAmount: true },
  })
  const totalOverdue = Math.max(0, (overdueAgg._sum.total ?? 0) - (overdueAgg._sum.paidAmount ?? 0))

  // Risk flags
  const riskFlags: string[] = []
  if (totalOverdue > 0) riskFlags.push(`€${totalOverdue.toFixed(0)} overdue (${open.filter(o => o.status === "OVERDUE").length} invoice${open.filter(o => o.status === "OVERDUE").length === 1 ? "" : "s"})`)
  const concentratedClient = payLag.sort((a, b) => b.paidInvoices - a.paidInvoices)[0]
  if (concentratedClient && concentratedClient.paidInvoices >= 5) {
    riskFlags.push(`Client concentration risk: ${concentratedClient.clientName} = ${concentratedClient.paidInvoices} paid invoices`)
  }
  if (buckets[0].net < 0) riskFlags.push(`First 30-day net cash gap of €${Math.abs(buckets[0].net).toFixed(0)}`)
  const longLag = payLag.find(p => p.averageLagDays > 30)
  if (longLag) riskFlags.push(`${longLag.clientName} pays ${longLag.averageLagDays}d late on average`)

  // Generate AI commentary
  const commentary = await renderCommentary(organizationId, { totalReceivables, totalOverdue, buckets, payLag, monthlyRecurring, monthlyExpenseRunRate, currency: org.defaultCurrency, riskFlags })

  return {
    currency: org.defaultCurrency,
    asOf: now.toISOString(),
    totalReceivables,
    totalOverdue,
    payLag,
    buckets,
    monthlyRecurring,
    commentary,
    riskFlags,
  }
}

async function renderCommentary(
  organizationId: string,
  ctx: { totalReceivables: number; totalOverdue: number; buckets: ForecastBucket[]; payLag: PayLagStat[]; monthlyRecurring: number; monthlyExpenseRunRate: number; currency: string; riskFlags: string[] },
): Promise<string> {
  const system = `You are a CFO assistant for a Polish SMB. Give cash-flow guidance in 2-3 sentences. Be concrete: name actual amounts. Be direct, no fluff, no AI cliches. Output plain text, no markdown.`
  const userMsg = [
    `Currency: ${ctx.currency}`,
    `Total receivables: ${ctx.totalReceivables.toFixed(2)}`,
    `Overdue: ${ctx.totalOverdue.toFixed(2)}`,
    `Monthly recurring revenue: ${ctx.monthlyRecurring.toFixed(2)}`,
    `Monthly expense run-rate (90d avg): ${ctx.monthlyExpenseRunRate.toFixed(2)}`,
    `30-day projection: inflow ${ctx.buckets[0].expectedInflow.toFixed(0)}, outflow ${ctx.buckets[0].expectedOutflow.toFixed(0)}, net ${ctx.buckets[0].net.toFixed(0)}`,
    `60-day projection: inflow ${ctx.buckets[1].expectedInflow.toFixed(0)}, outflow ${ctx.buckets[1].expectedOutflow.toFixed(0)}, net ${ctx.buckets[1].net.toFixed(0)}`,
    `90-day projection: inflow ${ctx.buckets[2].expectedInflow.toFixed(0)}, outflow ${ctx.buckets[2].expectedOutflow.toFixed(0)}, net ${ctx.buckets[2].net.toFixed(0)}`,
    `Risk flags: ${ctx.riskFlags.length ? ctx.riskFlags.join("; ") : "none"}`,
    `Pay-lag by client: ${ctx.payLag.map(p => `${p.clientName} avg ${p.averageLagDays}d (n=${p.paidInvoices})`).join("; ")}`,
    "",
    "Write 2-3 sentences of guidance for the owner. Mention specific numbers and the single most important action.",
  ].join("\n")

  const result = await callAi(
    { system, messages: [{ role: "user", content: userMsg }], maxTokens: 300, temperature: 0.4 },
    { organizationId, interactionType: "forecast_commentary" },
  )
  return result.text.trim()
}
