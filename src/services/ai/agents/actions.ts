"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveOrgId } from "@/lib/server/active-org"
import { sendEmail } from "@/services/email/email.service"
import { draftChase, type ChaseTone, type ChaseLanguage, type ChaseDraft } from "./chaser"
import { validateForKsef, type KsefValidationResult } from "./ksef-copilot"
import { askAssistant, type AssistantMessage } from "./assistant"

export async function draftChaseAction(
  invoiceId: string,
  tone: ChaseTone,
  language: ChaseLanguage,
): Promise<{ ok: true; draft: ChaseDraft } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const draft = await draftChase(invoiceId, orgId, tone, language)
    return { ok: true, draft }
  } catch (err: any) {
    return { ok: false, error: err.message || "Draft failed" }
  }
}

export async function validateKsefAction(
  invoiceId: string,
): Promise<{ ok: true; result: KsefValidationResult } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const result = await validateForKsef(invoiceId, orgId)
    return { ok: true, result }
  } catch (err: any) {
    return { ok: false, error: err.message || "Validation failed" }
  }
}

export async function askAssistantAction(
  history: AssistantMessage[],
): Promise<{ ok: true; reply: string; provider: string; model: string } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const { reply, provider, model } = await askAssistant(orgId, history)
    return { ok: true, reply, provider, model }
  } catch (err: any) {
    return { ok: false, error: err.message || "Assistant failed" }
  }
}

export async function sendChaseAction(
  invoiceId: string,
  subject: string,
  body: string,
): Promise<{ ok: true; messageId?: string; mock: boolean } | { ok: false; error: string }> {
  try {
    const orgId = await getActiveOrgId()
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { client: true },
    })
    if (!invoice) return { ok: false, error: "Invoice not found" }

    const to = invoice.client.invoiceEmail || invoice.client.email
    if (!to) return { ok: false, error: "Client has no email address on file" }
    const cc = invoice.client.invoiceEmailCc || []

    const htmlBody = `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${
      body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }</div>`

    const result = await sendEmail({ to: [to], cc, subject, body, htmlBody })

    // Audit trail: email event + reminder row
    await prisma.invoiceEmailEvent.create({
      data: {
        invoiceId: invoice.id,
        status: result.success ? "SENT" : "FAILED",
        recipients: [to],
        ccRecipients: cc,
        bccRecipients: [],
        subject,
        body,
        sentAt: result.success ? new Date() : null,
        errorMessage: result.success ? null : result.error,
        isAutoSend: false,
        triggeredBy: "AI_CHASER",
      },
    })
    if (result.success) {
      await prisma.reminder.create({
        data: {
          invoiceId: invoice.id,
          scheduledDate: new Date(),
          sentAt: new Date(),
          type: "EMAIL",
          message: subject,
        },
      })
    }

    if (!result.success) return { ok: false, error: result.error || "Send failed" }
    revalidatePath(`/invoices/${invoice.id}`)
    // mock = no RESEND_API_KEY configured
    return { ok: true, messageId: result.messageId, mock: !process.env.RESEND_API_KEY }
  } catch (err: any) {
    return { ok: false, error: err.message || "Send failed" }
  }
}
