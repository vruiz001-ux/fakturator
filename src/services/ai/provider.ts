// Provider-agnostic AI dispatcher. Anthropic Claude default, Groq fallback,
// Fake provider for local dev without credentials. All calls persisted to
// AIInteraction for usage/billing tracking.

import "server-only"
import { prisma } from "@/lib/prisma"
import { redactPii } from "@/lib/pii"

export type AiProvider = "anthropic" | "groq" | "fake"

export interface AiMessage {
  role: "user" | "assistant"
  content: string
}

export interface AiCallOptions {
  system?: string
  messages: AiMessage[]
  maxTokens?: number
  temperature?: number
  json?: boolean
}

export interface AiCallResult {
  text: string
  json?: any
  provider: AiProvider
  model: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

export interface AgentContext {
  organizationId: string
  userId?: string | null
  interactionType: string
}

function pickProvider(): AiProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  if (process.env.GROQ_API_KEY) return "groq"
  return "fake"
}

export async function callAi(opts: AiCallOptions, ctx: AgentContext): Promise<AiCallResult> {
  const provider = pickProvider()
  const t0 = Date.now()

  let result: AiCallResult
  if (provider === "anthropic") result = await callAnthropic(opts)
  else if (provider === "groq") result = await callGroq(opts)
  else result = await callFake(opts, ctx)

  result.latencyMs = Date.now() - t0

  // Persist (fire and forget; we don't want logging to block UX).
  // GDPR: structured PII (tax IDs, emails, phones, IBANs) is redacted from
  // the stored prompt + response. The model still receives the full text;
  // only the at-rest audit copy is sanitised.
  prisma.aIInteraction
    .create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId || (await ensureSystemUser(ctx.organizationId)),
        type: ctx.interactionType,
        prompt: redactPii(
          JSON.stringify({ system: opts.system, messages: opts.messages.slice(-1) })
        ),
        response: redactPii(result.text),
        metadata: {
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          piiRedacted: true,
        } as any,
      },
    })
    .catch(err => console.error("[ai] persistence failed:", err.message))

  return result
}

// Ensure a system user exists for AI runs without a real session
let systemUserCache: Record<string, string> = {}
async function ensureSystemUser(organizationId: string): Promise<string> {
  if (systemUserCache[organizationId]) return systemUserCache[organizationId]
  const email = `system+${organizationId}@fakturator.local`
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    systemUserCache[organizationId] = existing.id
    return existing.id
  }
  const created = await prisma.user.create({
    data: { email, name: "System", passwordHash: "n/a", role: "OWNER", organizationId },
    select: { id: true },
  })
  systemUserCache[organizationId] = created.id
  return created.id
}

// ─────────────────────────────────────────────────────
// Anthropic
// ─────────────────────────────────────────────────────

async function callAnthropic(opts: AiCallOptions): Promise<AiCallResult> {
  const model = process.env.AI_MODEL_ANTHROPIC || "claude-sonnet-4-6"
  const body: any = {
    model,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
  }
  if (opts.temperature !== undefined) body.temperature = opts.temperature

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = (data.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n")
  return {
    text,
    json: opts.json ? tryJson(text) : undefined,
    provider: "anthropic",
    model,
    latencyMs: 0,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  }
}

// ─────────────────────────────────────────────────────
// Groq (OpenAI-compatible)
// ─────────────────────────────────────────────────────

async function callGroq(opts: AiCallOptions): Promise<AiCallResult> {
  const model = process.env.AI_MODEL_GROQ || "llama-3.3-70b-versatile"
  const messages: any[] = []
  if (opts.system) messages.push({ role: "system", content: opts.system })
  for (const m of opts.messages) messages.push({ role: m.role, content: m.content })

  const body: any = {
    model,
    messages,
    max_completion_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.4,
  }
  if (opts.json) body.response_format = { type: "json_object" }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content || ""
  return {
    text,
    json: opts.json ? tryJson(text) : undefined,
    provider: "groq",
    model,
    latencyMs: 0,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  }
}

// ─────────────────────────────────────────────────────
// Fake (no API key — canned realistic outputs for dev)
// ─────────────────────────────────────────────────────

async function callFake(opts: AiCallOptions, ctx: AgentContext): Promise<AiCallResult> {
  await new Promise(r => setTimeout(r, 350))
  const last = opts.messages[opts.messages.length - 1]?.content || ""
  let text = "Stub response (no AI provider configured). Set ANTHROPIC_API_KEY or GROQ_API_KEY in .env.local."
  if (ctx.interactionType.startsWith("forecast")) {
    text = "Your cash flow looks healthy. With invoice 0008 (€3,519) chased this week, you cover all expected outflows through July. The two recurring monthly invoices add predictable runway."
  } else if (ctx.interactionType.startsWith("chase")) {
    text = "Dear Donecle SAS team,\n\nFollowing up on invoice 0008 (€3,519.74), originally due 30 April. Could you confirm when we can expect payment?\n\nThanks,\nTropos"
  } else if (ctx.interactionType.startsWith("ksef")) {
    text = "Validation passed. NIP format correct (10 digits). VAT split balances. Ready to submit to KSeF sandbox."
  }
  return {
    text, provider: "fake", model: "stub", latencyMs: 0,
    inputTokens: 0, outputTokens: text.length,
    json: opts.json ? { ok: true, message: text } : undefined,
  }
}

function tryJson(s: string): any {
  try {
    const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
    return JSON.parse(cleaned)
  } catch { return null }
}
