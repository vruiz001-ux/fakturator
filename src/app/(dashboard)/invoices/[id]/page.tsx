"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft, Send, Download, Copy, Edit3, Trash2,
  Calendar, CreditCard, Building2, FileText, CheckCircle2, Clock, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { getInvoice, getCompany, updateInvoiceStatus, recordPayment, deleteInvoice, initializeStore, subscribe } from "@/lib/store/data-store"
import { logAudit } from "@/lib/audit/audit.service"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, formatNIP } from "@/lib/formatters"
import { EmailDeliveryPanel } from "@/components/invoices/email-delivery-panel"
import { PAYMENT_METHODS, UNITS } from "@/lib/constants"

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const invoice = getInvoice(id)

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Link>
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">Invoice not found</h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              The invoice you are looking for does not exist or has been deleted.
            </p>
            <Link href="/invoices" className="mt-4">
              <Button size="sm" variant="outline">Back to Invoices</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const handleStatusChange = (newStatus: string) => {
    if (!invoice) return
    setActionLoading(true)
    try {
      updateInvoiceStatus(invoice.id, newStatus)
      logAudit({
        action: newStatus === "SENT" ? "INVOICE_ISSUED" : newStatus === "CANCELLED" ? "INVOICE_CANCELLED" : "INVOICE_UPDATED",
        entityType: "INVOICE",
        entityId: invoice.id,
        actor: "USER",
        success: true,
        before: { status: invoice.status },
        after: { status: newStatus },
      })
    } catch (err: any) {
      alert(err.message || "Status change failed")
    }
    setActionLoading(false)
  }

  const handleRecordPayment = () => {
    if (!invoice) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return
    try {
      recordPayment(invoice.id, amount)
      logAudit({
        action: "PAYMENT_RECORDED",
        entityType: "PAYMENT",
        entityId: invoice.id,
        actor: "USER",
        success: true,
        details: { amount, invoiceNumber: invoice.invoiceNumber },
      })
      setShowPaymentDialog(false)
      setPaymentAmount("")
    } catch (err: any) {
      alert(err.message || "Payment recording failed")
    }
  }

  const handleDelete = () => {
    if (!invoice || invoice.status !== "DRAFT") return
    if (!confirm(`Delete draft invoice ${invoice.invoiceNumber}?`)) return
    try {
      deleteInvoice(invoice.id)
      logAudit({
        action: "INVOICE_DELETED",
        entityType: "INVOICE",
        entityId: invoice.id,
        actor: "USER",
        success: true,
      })
      window.location.href = "/invoices"
    } catch (err: any) {
      alert(err.message || "Delete failed")
    }
  }

  const statusIcon = {
    PAID: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    SENT: <Send className="h-5 w-5 text-blue-500" />,
    OVERDUE: <AlertCircle className="h-5 w-5 text-red-500" />,
    DRAFT: <Edit3 className="h-5 w-5 text-slate-400" />,
    PARTIALLY_PAID: <Clock className="h-5 w-5 text-amber-500" />,
    CANCELLED: <Trash2 className="h-5 w-5 text-slate-400" />,
    CORRECTED: <FileText className="h-5 w-5 text-purple-500" />,
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h2>
            <Badge className={getStatusColor(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Issued on {formatDate(invoice.issueDate)} for {invoice.client?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Status actions */}
          {invoice.status === "DRAFT" && (
            <>
              <Button size="sm" onClick={() => handleStatusChange("SENT")} loading={actionLoading}>
                <Send className="h-4 w-4" />
                Issue & Send
              </Button>
              <Button size="sm" variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          {invoice.status === "SENT" && (
            <>
              <Button size="sm" variant="success" onClick={() => setShowPaymentDialog(true)}>
                <CreditCard className="h-4 w-4" />
                Record Payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("CANCELLED")}>
                Cancel
              </Button>
            </>
          )}
          {invoice.status === "PARTIALLY_PAID" && (
            <Button size="sm" variant="success" onClick={() => setShowPaymentDialog(true)}>
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          )}
          {invoice.status === "OVERDUE" && (
            <>
              <Button size="sm" variant="success" onClick={() => setShowPaymentDialog(true)}>
                <CreditCard className="h-4 w-4" />
                Record Payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("CANCELLED")}>
                Cancel
              </Button>
            </>
          )}
          {invoice.status === "PAID" && (
            <Badge variant="success" className="h-8 px-3 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Fully Paid
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Document */}
          <Card>
            <CardContent className="p-8">
              {/* Invoice Header */}
              <div className="flex justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-indigo-600">{getCompany().name || "Fakturator"}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {getCompany().address && <>{getCompany().address}<br /></>}
                    {(getCompany().postalCode || getCompany().city) && <>{getCompany().postalCode} {getCompany().city}<br /></>}
                    {getCompany().nip && <>NIP: {getCompany().nip}</>}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h3>
                  <Badge className={`mt-2 ${getStatusColor(invoice.status)}`}>
                    {getStatusLabel(invoice.status)}
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Dates & Client */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Bill To</h4>
                  <p className="font-semibold text-slate-900">{invoice.client?.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {invoice.client?.address}<br />
                    {invoice.client?.postalCode} {invoice.client?.city}<br />
                    NIP: {invoice.client?.nip ? formatNIP(invoice.client.nip) : "—"}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Issue Date</span>
                    <span className="text-sm font-medium text-slate-900">{formatDate(invoice.issueDate)}</span>
                  </div>
                  {invoice.saleDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Sale Date</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(invoice.saleDate)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Due Date</span>
                    <span className={`text-sm font-medium ${invoice.status === "OVERDUE" ? "text-red-600" : "text-slate-900"}`}>
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Payment</span>
                    <span className="text-sm font-medium text-slate-900">
                      {PAYMENT_METHODS.find(p => p.value === invoice.paymentMethod)?.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-slate-400">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-slate-500">
                        {UNITS.find(u => u.value === item.unit)?.short || item.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice, invoice.currency)}</TableCell>
                      <TableCell className="text-right text-slate-500">{item.vatRate}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.netAmount, invoice.currency)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.grossAmount, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-6 ml-auto w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal (Net)</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VAT</span>
                  <span className="font-medium">{formatCurrency(invoice.vatTotal, invoice.currency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-slate-900">Total (Gross)</span>
                  <span className="text-xl font-bold text-indigo-600">{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
                {invoice.paidAmount > 0 && invoice.paidAmount < invoice.total && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Paid</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Remaining</span>
                      <span className="font-medium text-red-600">{formatCurrency(invoice.total - invoice.paidAmount, invoice.currency)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-8 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-600">{invoice.notes}</p>
                </div>
              )}

              {/* Bank Details Footer */}
              {(getCompany().bankAccount || getCompany().bankName) && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    {getCompany().bankName && (
                      <span><span className="font-medium text-slate-500">Swift:</span> {getCompany().bankName}</span>
                    )}
                    {getCompany().bankAccount && (
                      <span><span className="font-medium text-slate-500">IBAN:</span> {getCompany().bankAccount}</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {statusIcon[invoice.status] || statusIcon.DRAFT}
                <div>
                  <Badge className={`text-sm ${getStatusColor(invoice.status)}`}>
                    {getStatusLabel(invoice.status)}
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">
                    Last updated {formatDate(invoice.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total</span>
                <span className="font-semibold">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Outstanding</span>
                <span className="font-semibold text-amber-600">{formatCurrency(invoice.total - invoice.paidAmount, invoice.currency)}</span>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(invoice.paidAmount / invoice.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {((invoice.paidAmount / invoice.total) * 100).toFixed(0)}% paid
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-sm">
                  {invoice.client?.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <Link href={`/clients/${invoice.clientId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {invoice.client?.name}
                  </Link>
                  <p className="text-xs text-slate-400">{invoice.client?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Delivery */}
          <EmailDeliveryPanel
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            clientName={invoice.client?.name || ""}
            clientEmail={invoice.client?.email}
            clientInvoiceEmail={invoice.client?.email}
            autoSendEnabled={true}
            onSend={(recipients) => console.log("Send invoice to:", recipients)}
            onResend={(eventId) => console.log("Resend event:", eventId)}
          />

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                  <div>
                    <p className="text-sm text-slate-700">Invoice created</p>
                    <p className="text-xs text-slate-400">{formatDate(invoice.createdAt)}</p>
                  </div>
                </div>
                {invoice.status !== "DRAFT" && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-sm text-slate-700">Invoice sent</p>
                      <p className="text-xs text-slate-400">{formatDate(invoice.issueDate)}</p>
                    </div>
                  </div>
                )}
                {invoice.paidAmount > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-sm text-slate-700">Payment received</p>
                      <p className="text-xs text-slate-400">{formatCurrency(invoice.paidAmount, invoice.currency)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment for {invoice.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Invoice Total</span>
                <span className="font-semibold">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Already Paid</span>
                <span className="text-emerald-600">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-700">Remaining</span>
                <span className="text-amber-600">{formatCurrency(invoice.total - invoice.paidAmount, invoice.currency)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Amount ({invoice.currency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.total - invoice.paidAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`${(invoice.total - invoice.paidAmount).toFixed(2)}`}
              />
              <button
                type="button"
                className="text-xs text-indigo-600 hover:text-indigo-700"
                onClick={() => setPaymentAmount((invoice.total - invoice.paidAmount).toFixed(2))}
              >
                Pay full remaining amount
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              variant="success"
              onClick={handleRecordPayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
