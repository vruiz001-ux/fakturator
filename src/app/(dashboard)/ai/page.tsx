"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Sparkles, Send, AlertCircle, User, Bot, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { askAssistantAction } from "@/services/ai/agents/actions"
import type { AssistantMessage } from "@/services/ai/agents/assistant"

const SUGGESTIONS = [
  "How much did I invoice this year?",
  "Which invoices are overdue?",
  "Which client pays slowest?",
  "What VAT did I collect this quarter?",
  "Compare this month with the previous one",
  "What's my biggest outstanding invoice?",
  "Summarise my invoicing performance",
]

interface ChatTurn extends AssistantMessage {
  meta?: { provider: string; model: string }
}

export default function AssistantPage() {
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [history, isPending])

  function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || isPending) return
    setError(null)
    setInput("")
    const next: ChatTurn[] = [...history, { role: "user", content: trimmed }]
    setHistory(next)
    startTransition(async () => {
      const r = await askAssistantAction(next.map(({ role, content }) => ({ role, content })))
      if (!r.ok) {
        setError(r.error)
        return
      }
      setHistory(h => [...h, { role: "assistant", content: r.reply, meta: { provider: r.provider, model: r.model } }])
    })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Assistant</h1>
          <p className="text-sm text-slate-600">Ask anything about your invoices, clients, taxes, or cash flow</p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-700">
          <Sparkles className="mr-1 h-3 w-3" /> Powered by AI
        </Badge>
      </header>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col p-0">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
            {history.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-indigo-900">
                    <Sparkles className="h-4 w-4" /> What can I help with?
                  </p>
                  <p className="mt-1 text-sm text-indigo-800">
                    I have read-only access to your invoices, clients, payments, and totals. I do math on what's in the DB and answer in plain language.
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Try one of these</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {history.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  t.role === "user" ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white"
                }`}>
                  {t.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  t.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>
                  {t.meta && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide opacity-60">
                      {t.meta.provider} · {t.meta.model}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {error}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <form
              onSubmit={e => { e.preventDefault(); ask(input) }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your invoices, taxes, clients..."
                disabled={isPending}
                className="flex-1"
              />
              <Button type="submit" disabled={isPending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Answers based on your real DB. Provider auto-selected: Anthropic → Groq → fake (set ANTHROPIC_API_KEY for best quality).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
