"use server"

import { getActiveOrgId } from "@/lib/server/active-org"
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
