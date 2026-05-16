"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, AlertCircle, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInvoice, type InvoiceFormData } from "@/lib/server/invoice-create"

interface LineItem {
  description: string
  quantity: string
  unitPrice: string
  vatRate: string
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function fc(v: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}

export function InvoiceForm({ data, presetClientId }: { data: InvoiceFormData; presetClientId?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + data.defaultPaymentDays * 86400000).toISOString().slice(0, 10)

  const [clientId, setClientId] = useState(presetClientId && data.clients.some(c => c.id === presetClientId) ? presetClientId : "")
  const [invoiceNumber, setInvoiceNumber] = useState(data.suggestedNumber)
  const [type, setType] = useState<"VAT" | "PROFORMA" | "CORRECTION" | "ADVANCE">("VAT")
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(due)
  const [currency, setCurrency] = useState(data.defaultCurrency)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "", vatRate: String(data.defaultVatRate) },
  ])

  const totals = useMemo(() => {
    let net = 0, vat = 0
    for (const it of items) {
      const q = parseFloat(it.quantity) || 0
      const p = parseFloat(it.unitPrice) || 0
      const r = parseFloat(it.vatRate) || 0
      const lineNet = round2(q * p)
      net += lineNet
      vat += r > 0 ? round2(lineNet * (r / 100)) : 0
    }
    return { net: round2(net), vat: round2(vat), total: round2(net + vat) }
  }, [items])

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems([...items, { description: "", quantity: "1", unitPrice: "", vatRate: String(data.defaultVatRate) }])
  }
  function removeItem(idx: number) {
    if (items.length > 1) setItems(items.filter((_, i) => i !== idx))
  }
  function applyService(idx: number, serviceId: string) {
    const svc = data.services.find(s => s.id === serviceId)
    if (!svc) return
    updateItem(idx, {
      description: svc.name,
      unitPrice: svc.defaultRate != null ? String(svc.defaultRate) : items[idx].unitPrice,
      vatRate: String(svc.defaultVatRate),
    })
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const r = await createInvoice({
        clientId,
        invoiceNumber,
        type,
        issueDate,
        dueDate,
        currency,
        notes: notes || undefined,
        items: items.map(it => ({
          description: it.description,
          quantity: parseFloat(it.quantity) || 0,
          unitPrice: parseFloat(it.unitPrice) || 0,
          vatRate: parseFloat(it.vatRate) || 0,
        })),
      })
      if (!r.ok) { setError(r.error); return }
      router.push(`/invoices/${r.invoiceId}`)
    })
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900">New invoice</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {data.clients.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" /> No clients yet. <Link href="/clients/new" className="underline">Add a client</Link> first.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Header fields */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Invoice details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="client">Client</Label>
              <select
                id="client"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select a client...</option>
                {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="number">Invoice number</Label>
              <Input id="number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="VAT">VAT invoice</option>
                <option value="PROFORMA">Proforma / quote</option>
                <option value="CORRECTION">Correction</option>
                <option value="ADVANCE">Advance</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="issue">Issue date</Label>
                <Input id="issue" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="due">Due date</Label>
                <Input id="due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {["PLN", "EUR", "USD", "GBP", "CHF"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Payment terms, references..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map((it, idx) => {
              const q = parseFloat(it.quantity) || 0
              const p = parseFloat(it.unitPrice) || 0
              const r = parseFloat(it.vatRate) || 0
              const lineNet = round2(q * p)
              const lineGross = round2(lineNet * (1 + r / 100))
              return (
                <div key={idx} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {data.services.length > 0 && (
                    <select
                      onChange={e => { applyService(idx, e.target.value); e.target.value = "" }}
                      className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-500"
                      defaultValue=""
                    >
                      <option value="">Pick from service catalog...</option>
                      {data.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  <Input
                    value={it.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                    placeholder="Description"
                    className="mb-2"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" step="0.01" value={it.quantity} onChange={e => updateItem(idx, { quantity: e.target.value })} className="mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs">Unit price</Label>
                      <Input type="number" step="0.01" value={it.unitPrice} onChange={e => updateItem(idx, { unitPrice: e.target.value })} className="mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs">VAT %</Label>
                      <Input type="number" step="1" value={it.vatRate} onChange={e => updateItem(idx, { vatRate: e.target.value })} className="mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs">Line total</Label>
                      <p className="mt-2 text-sm font-medium">{fc(lineGross, currency)}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" /> Add line item
            </Button>

            {/* Totals */}
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{fc(totals.net, currency)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-medium">{fc(totals.vat, currency)}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-1 text-base"><span className="font-semibold">Total</span><span className="font-bold">{fc(totals.total, currency)}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/invoices"><Button variant="outline" disabled={isPending}>Cancel</Button></Link>
              <Button onClick={submit} disabled={isPending || !clientId}>
                <FileText className="mr-1 h-4 w-4" />
                {isPending ? "Creating..." : "Create invoice"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
