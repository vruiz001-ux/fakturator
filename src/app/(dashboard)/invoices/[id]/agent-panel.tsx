"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Send, Shield, AlertTriangle, CheckCircle2, Copy, MailCheck } from "lucide-react"
import { draftChaseAction, validateKsefAction, sendChaseAction } from "@/services/ai/agents/actions"
import type { ChaseDraft, ChaseTone, ChaseLanguage } from "@/services/ai/agents/chaser"
import type { KsefValidationResult } from "@/services/ai/agents/ksef-copilot"

interface Props {
  invoiceId: string
  invoiceStatus: string
  daysToDue: number
}

const TONES: { value: ChaseTone; label: string; description: string }[] = [
  { value: "friendly", label: "Friendly", description: "Warm follow-up, assumes oversight" },
  { value: "formal", label: "Formal", description: "Polite but firm reminder" },
  { value: "final", label: "Final", description: "Last notice before escalation" },
]
const LANGUAGES: { value: ChaseLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polish" },
  { value: "fr", label: "French" },
]

export function AgentPanel({ invoiceId, invoiceStatus, daysToDue }: Props) {
  const overdue = invoiceStatus !== "PAID" && invoiceStatus !== "CANCELLED" && daysToDue < 0
  const canChase = invoiceStatus !== "PAID" && invoiceStatus !== "CANCELLED"
  const [isPending, startTransition] = useTransition()

  // Chase state
  const [chaseTone, setChaseTone] = useState<ChaseTone>(overdue ? "formal" : "friendly")
  const [chaseLang, setChaseLang] = useState<ChaseLanguage>("en")
  const [chaseDraft, setChaseDraft] = useState<ChaseDraft | null>(null)

  // KSeF state
  const [ksefResult, setKsefResult] = useState<KsefValidationResult | null>(null)

  // Chase send state
  const [chaseSubject, setChaseSubject] = useState("")
  const [chaseBody, setChaseBody] = useState("")
  const [sentMsg, setSentMsg] = useState<string | null>(null)

  const [err, setErr] = useState<string | null>(null)

  function sendChase() {
    setErr(null); setSentMsg(null)
    startTransition(async () => {
      const r = await sendChaseAction(invoiceId, chaseSubject, chaseBody)
      if (!r.ok) { setErr(r.error); return }
      setSentMsg(r.mock
        ? "Reminder logged (no RESEND_API_KEY — mock send). Set the key to send for real."
        : "Reminder sent.")
      setChaseDraft(null)
    })
  }

  function runChase() {
    setErr(null); setChaseDraft(null); setSentMsg(null)
    startTransition(async () => {
      const r = await draftChaseAction(invoiceId, chaseTone, chaseLang)
      if (!r.ok) { setErr(r.error); return }
      setChaseDraft(r.draft)
      setChaseSubject(r.draft.subject)
      setChaseBody(r.draft.body)
    })
  }

  function runKsefCheck() {
    setErr(null); setKsefResult(null)
    startTransition(async () => {
      const r = await validateKsefAction(invoiceId)
      if (!r.ok) { setErr(r.error); return }
      setKsefResult(r.result)
    })
  }

  return (
    <div className="space-y-4">
      {/* Auto-Chasing Agent */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <Sparkles className="h-3 w-3" /> Auto-Chasing Agent
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {canChase ? "Drafts a payment reminder in your tone of choice" : "Invoice is paid or cancelled, no chase needed"}
              </p>
            </div>
            {overdue && <Badge className="bg-rose-100 text-rose-700">{Math.abs(daysToDue)}d overdue</Badge>}
          </div>

          {canChase && !chaseDraft && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tone</Label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setChaseTone(t.value)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                        chaseTone === t.value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                      title={t.description}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Language</Label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.value}
                      onClick={() => setChaseLang(l.value)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                        chaseLang === l.value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={runChase} disabled={isPending}>
                <Sparkles className="mr-1 h-4 w-4" />
                {isPending ? "Drafting..." : "Draft reminder"}
              </Button>
            </div>
          )}

          {chaseDraft && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={chaseSubject} onChange={e => setChaseSubject(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Body (editable before sending)</Label>
                <Textarea value={chaseBody} onChange={e => setChaseBody(e.target.value)} rows={10} className="mt-1 font-sans text-sm" />
              </div>
              <p className="text-xs text-slate-500">
                To: {chaseDraft.recipientEmail || "(no client email on file)"} · Tone: {chaseDraft.tone} · {chaseDraft.language.toUpperCase()}
              </p>
              {sentMsg && (
                <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700">
                  <MailCheck className="h-3.5 w-3.5" /> {sentMsg}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${chaseSubject}\n\n${chaseBody}`)}>
                  <Copy className="mr-1 h-4 w-4" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setChaseDraft(null); setSentMsg(null) }}>Redraft</Button>
                <Button
                  size="sm"
                  disabled={isPending || !chaseDraft.recipientEmail}
                  title={chaseDraft.recipientEmail ? "Send via Resend" : "Client has no email on file"}
                  onClick={sendChase}
                >
                  <Send className="mr-1 h-4 w-4" /> {isPending ? "Sending..." : "Send reminder"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KSeF Copilot */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <Shield className="h-3 w-3" /> KSeF Copilot
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Pre-submit validation + plain-Polish explainer</p>
            </div>
          </div>

          {!ksefResult && (
            <Button size="sm" className="w-full" onClick={runKsefCheck} disabled={isPending}>
              <Shield className="mr-1 h-4 w-4" />
              {isPending ? "Validating..." : "Run pre-submit check"}
            </Button>
          )}

          {ksefResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {ksefResult.passed ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Passed
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-700">
                    <AlertTriangle className="mr-1 h-3 w-3" /> {ksefResult.errors.length} error{ksefResult.errors.length === 1 ? "" : "s"}
                  </Badge>
                )}
                <span className="text-xs text-slate-500">
                  Rejection risk: {(ksefResult.rejectionProbability * 100).toFixed(0)}%
                </span>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {ksefResult.aiSummary}
              </div>

              {ksefResult.errors.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-rose-700">Errors</p>
                  <ul className="space-y-1">
                    {ksefResult.errors.map((e, i) => (
                      <li key={i} className="text-xs text-rose-900">
                        <span className="font-mono">{e.code}</span> · {e.message}
                        {e.suggestion && <div className="ml-3 text-rose-700">→ {e.suggestion}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ksefResult.warnings.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-amber-700">Warnings</p>
                  <ul className="space-y-1">
                    {ksefResult.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-900">
                        <span className="font-mono">{w.code}</span> · {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setKsefResult(null)}>Recheck</Button>
                <Button size="sm" disabled title="KSeF API submission — needs production cert (Phase 3)">
                  Submit to KSeF (Phase 3)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {err && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-3 text-sm text-rose-700">{err}</CardContent>
        </Card>
      )}
    </div>
  )
}
