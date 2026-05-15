"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, CreditCard, CheckCircle2, Send, Trash2, FileText, Calendar,
  Building2, Database, Clock, AlertCircle, Edit3,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import type { InvoiceDetail } from "@/lib/server/invoice-data"
import { markInvoicePaid, recordPayment, markInvoiceSent, cancelInvoice } from "@/lib/server/invoice-actions"
import { AgentPanel } from "./agent-panel"

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981", SENT: "#3b82f6", OVERDUE: "#ef4444", DRAFT: "#94a3b8",
  PARTIALLY_PAID: "#f59e0b", CANCELLED: "#6b7280", CORRECTED: "#8b5cf6",
}

function fc(value: number, currency: string): string {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}
function fd(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function InvoiceDetailView({ invoice }: { invoice: InvoiceDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPay, setShowPay] = useState(false)
  const [payAmount, setPayAmount] = useState(invoice.outstanding.toString())
  const [payRef, setPayRef] = useState("")
  const [err, setErr] = useState<string | null>(null)

  const overdue = invoice.status !== "PAID" && invoice.status !== "CANCELLED" && invoice.daysToDue < 0
  const statusColor = STATUS_COLORS[invoice.status] || "#94a3b8"

  function run(action: () => Promise<{ ok: boolean; error?: string } | { ok: true }>) {
    setErr(null)
    startTransition(async () => {
      const result = await action() as any
      if (!result.ok) {
        setErr(result.error || "Action failed")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h2>
            <Badge style={{ backgroundColor: statusColor + "22", color: statusColor }}>
              {invoice.status.replace("_", " ")}
            </Badge>
            {invoice.externalSource && (
              <Badge className="bg-slate-100 text-slate-700">
                <Database className="mr-1 h-3 w-3" /> {invoice.externalSource === "NINJA_INVOICE" ? "Ninja" : invoice.externalSource}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Issued {fd(invoice.issueDate)} · {invoice.client.name}
            {overdue && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-600">
                <AlertCircle className="h-4 w-4" /> {Math.abs(invoice.daysToDue)} days overdue
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.status === "DRAFT" && (
            <Button size="sm" disabled={isPending} onClick={() => run(() => markInvoiceSent(invoice.id))}>
              <Send className="mr-1 h-4 w-4" /> Mark sent
            </Button>
          )}
          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <>
              <Button size="sm" variant="success" disabled={isPending} onClick={() => setShowPay(true)}>
                <CreditCard className="mr-1 h-4 w-4" /> Record payment
              </Button>
              <Button size="sm" disabled={isPending} onClick={() => run(() => markInvoicePaid(invoice.id))}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Mark fully paid
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(() => cancelInvoice(invoice.id))}>
                <Trash2 className="mr-1 h-4 w-4" /> Cancel
              </Button>
            </>
          )}
          {invoice.status === "PAID" && (
            <Badge style={{ backgroundColor: "#10b98122", color: "#10b981" }} className="h-8 px-3 text-sm">
              <CheckCircle2 className="mr-1 h-4 w-4" /> Fully paid
            </Badge>
          )}
        </div>
      </div>

      {err && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-3 text-sm text-rose-700">{err}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice document */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-8">
              {/* Header block */}
              <div className="mb-6 flex justify-between">
                <div>
                  <h3 className="text-xl font-bold text-indigo-600">{invoice.org.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {invoice.org.address && <>{invoice.org.address}<br /></>}
                    {(invoice.org.postalCode || invoice.org.city) && <>{invoice.org.postalCode} {invoice.org.city}<br /></>}
                    {invoice.org.nip && <>NIP: {invoice.org.nip}</>}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h3>
                  <Badge style={{ backgroundColor: statusColor + "22", color: statusColor }} className="mt-2">
                    {invoice.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="mb-6 grid grid-cols-2 gap-8">
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Bill to</h4>
                  <p className="font-semibold text-slate-900">{invoice.client.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {invoice.client.address}<br />
                    {invoice.client.postalCode} {invoice.client.city}<br />
                    {invoice.client.nip && <>NIP: {invoice.client.nip}</>}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Issue date</span>
                    <span className="font-medium text-slate-900">{fd(invoice.issueDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Due date</span>
                    <span className={`font-medium ${overdue ? "text-rose-600" : "text-slate-900"}`}>{fd(invoice.dueDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Payment</span>
                    <span className="font-medium text-slate-900">{invoice.paymentMethod.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Currency</span>
                    <span className="font-medium text-slate-900">{invoice.currency}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map(it => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.description}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{fc(it.unitPrice, invoice.currency)}</TableCell>
                      <TableCell className="text-right text-slate-500">{it.vatRate}%</TableCell>
                      <TableCell className="text-right font-medium">{fc(it.grossAmount, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">{fc(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT</span>
                    <span className="font-medium">{fc(invoice.vatTotal, invoice.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{fc(invoice.total, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid</span>
                    <span className="font-semibold">{fc(invoice.paidAmount, invoice.currency)}</span>
                  </div>
                  {invoice.outstanding > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Outstanding</span>
                      <span className="font-semibold">{fc(invoice.outstanding, invoice.currency)}</span>
                    </div>
                  )}
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
                  {invoice.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Payments</p>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {invoice.payments.map(p => (
                    <li key={p.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{fc(p.amount, invoice.currency)}</span>
                        <span className="text-xs text-slate-500">{fd(p.date)}</span>
                      </div>
                      {p.reference && <p className="mt-1 text-xs text-slate-500">{p.reference}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <AgentPanel invoiceId={invoice.id} invoiceStatus={invoice.status} daysToDue={invoice.daysToDue} />
        </div>
      </div>

      {/* Record payment dialog */}
      <Dialog open={showPay} onOpenChange={setShowPay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="amount">Amount ({invoice.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Outstanding: {fc(invoice.outstanding, invoice.currency)}</p>
            </div>
            <div>
              <Label htmlFor="ref">Reference (optional)</Label>
              <Input id="ref" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Bank reference / transaction ID" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPay(false)} disabled={isPending}>Cancel</Button>
            <Button
              disabled={isPending}
              onClick={() => {
                const amount = parseFloat(payAmount)
                if (!Number.isFinite(amount) || amount <= 0) { setErr("Invalid amount"); return }
                setShowPay(false)
                run(() => recordPayment(invoice.id, amount, payRef || undefined))
              }}
            >
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
