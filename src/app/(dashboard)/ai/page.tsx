"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, FileText, BarChart3, Users, Clock, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getInvoices, getClients, getStats, getExpenses, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency } from "@/lib/formatters"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const suggestedQuestions = [
  { icon: FileText, text: "Which invoices are overdue?", category: "Invoices" },
  { icon: BarChart3, text: "What was my revenue this month?", category: "Revenue" },
  { icon: Users, text: "Which client generated the most revenue?", category: "Clients" },
  { icon: Clock, text: "Show upcoming due dates", category: "Schedule" },
  { icon: BarChart3, text: "What's my profit estimate this quarter?", category: "Finance" },
  { icon: FileText, text: "Create an invoice for TechVenture, consulting 10 hours at 300 PLN", category: "Create" },
]

function generateAIResponse(question: string): string {
  const q = question.toLowerCase()
  const invoices = getInvoices()
  const clients = getClients()
  const stats = getStats()
  const expenses = getExpenses()

  if (invoices.length === 0 && clients.length === 0) {
    return "I don't have enough data to answer that yet. Start by adding clients and creating invoices."
  }

  if (q.includes("overdue")) {
    const overdue = invoices.filter(i => i.status === "OVERDUE")
    if (overdue.length === 0) return "You have no overdue invoices. Great job staying on top of collections!"
    return `You have **${overdue.length} overdue invoices** totaling **${formatCurrency(stats.totalOverdue)}**:\n\n${overdue.map(i => `- **${i.invoiceNumber}** — ${i.client?.name} — ${formatCurrency(i.total)}`).join("\n")}\n\nI recommend sending payment reminders to these clients.`
  }

  if (q.includes("revenue") && (q.includes("month") || q.includes("this"))) {
    return `Your total invoiced revenue is **${formatCurrency(stats.totalInvoiced)}**.\n\nTotal expenses: ${formatCurrency(stats.totalExpenses)}\nNet income: **${formatCurrency(stats.netIncome)}**`
  }

  if (q.includes("client") && (q.includes("most") || q.includes("top") || q.includes("best"))) {
    if (invoices.length === 0) return "No invoice data available yet to determine top clients."
    const revenueByClient = new Map<string, { name: string; revenue: number; count: number }>()
    for (const inv of invoices) {
      const existing = revenueByClient.get(inv.clientId) || { name: inv.client?.name || "Unknown", revenue: 0, count: 0 }
      existing.revenue += inv.total
      existing.count++
      revenueByClient.set(inv.clientId, existing)
    }
    const sorted = Array.from(revenueByClient.values()).sort((a, b) => b.revenue - a.revenue)
    const top = sorted[0]
    return `**${top.name}** is your top client with **${formatCurrency(top.revenue)}** in revenue from ${top.count} invoices.\n\nTop clients:\n${sorted.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} — ${formatCurrency(c.revenue)}`).join("\n")}`
  }

  if (q.includes("due") || q.includes("upcoming")) {
    const upcoming = invoices.filter(i => i.status === "SENT" || i.status === "DRAFT")
    if (upcoming.length === 0) return "No upcoming due dates found."
    return `Upcoming due dates:\n\n${upcoming.map(i => `- **${i.invoiceNumber}** — ${i.client?.name} — ${formatCurrency(i.total)} — Due: ${new Date(i.dueDate).toLocaleDateString()}`).join("\n")}`
  }

  if (q.includes("profit") || q.includes("margin")) {
    if (stats.totalInvoiced === 0) return "No revenue data yet to calculate profit."
    const margin = stats.totalInvoiced > 0 ? ((stats.netIncome / stats.totalInvoiced) * 100).toFixed(1) : "0.0"
    return `**Net income:** ${formatCurrency(stats.netIncome)}\n\nRevenue: ${formatCurrency(stats.totalInvoiced)}\nExpenses: ${formatCurrency(stats.totalExpenses)}\nMargin: ${margin}%`
  }

  if (q.includes("create") && q.includes("invoice")) {
    return `To create an invoice, go to the Invoices page and click "New Invoice". You can use the AI prompt bar there to describe the invoice in natural language.`
  }

  if (q.includes("vat") || q.includes("tax")) {
    const outputVat = invoices.reduce((s, i) => s + i.vatTotal, 0)
    const inputVat = expenses.reduce((s, e) => s + e.vatAmount, 0)
    const vatDue = outputVat - inputVat
    return `**VAT Summary:**\n\nOutput VAT (sales): ${formatCurrency(outputVat)}\nInput VAT (purchases): ${formatCurrency(inputVat)}\n**VAT due:** ${formatCurrency(vatDue)}`
  }

  if (q.includes("expense")) {
    if (expenses.length === 0) return "No expenses recorded yet."
    return `**Total expenses:** ${formatCurrency(stats.totalExpenses)}\n\n${expenses.length} expense(s) recorded.`
  }

  return `I understand you're asking about "${question}". Here's what I can help with:\n\n- Revenue and financial metrics\n- Invoice status and management\n- Client analytics\n- Expense tracking\n- VAT and tax summaries\n- Creating invoices from natural language\n\nCould you rephrase your question or try one of the suggested questions?`
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [, forceUpdate] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (text?: string) => {
    const question = text || input
    if (!question.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    // Simulate AI thinking
    setTimeout(() => {
      const response = generateAIResponse(question)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 800 + Math.random() * 800)
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">AI Business Assistant</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Ask questions about your business, create invoices with natural language, or get insights from your data.
            </p>

            {/* Suggested Questions */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2 max-w-2xl w-full">
              {suggestedQuestions.map((sq) => (
                <button
                  key={sq.text}
                  onClick={() => handleSend(sq.text)}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-sm"
                >
                  <sq.icon className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{sq.text}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">{sq.category}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-600">Fakturator AI</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.split("**").map((part, i) =>
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                <span className="text-sm text-slate-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Ask about your business or describe an invoice to create..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pl-9 h-12"
            />
          </div>
          <Button type="submit" size="lg" disabled={!input.trim() || isTyping}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <Lightbulb className="h-3 w-3" />
          <span>Try: &quot;What was my revenue this month?&quot; or &quot;Create an invoice for...&quot;</span>
        </div>
      </div>
    </div>
  )
}
