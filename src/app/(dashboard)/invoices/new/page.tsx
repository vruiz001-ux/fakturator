"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { getClients, getServices, initializeStore, subscribe } from "@/lib/store/data-store"
import type { InvoiceItem, InvoiceType, PaymentMethod, Unit } from "@/types"
import { formatCurrency, calculateVAT, calculateGross } from "@/lib/formatters"
import { VAT_RATES, PAYMENT_METHODS, INVOICE_TYPES, UNITS, CURRENCIES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Sparkles, ArrowLeft, Save, Send, Eye } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0]
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function generateInvoiceNumber() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const year = now.getFullYear()
  return `FV/${year}/${month}/009`
}

interface LineItem {
  id: string
  serviceId: string
  description: string
  quantity: number
  unit: Unit
  unitPrice: number
  vatRate: number
}

function createEmptyItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    serviceId: "",
    description: "",
    quantity: 1,
    unit: "HOUR",
    unitPrice: 0,
    vatRate: 23,
  }
}

// ─── AI Parsing ───────────────────────────────────────────

function parseAIDescription(text: string) {
  const result: {
    clientId?: string
    description?: string
    quantity?: number
    unit?: Unit
    unitPrice?: number
    vatRate?: number
    dueDays?: number
  } = {}

  const clients = getClients()
  const services = getServices()

  // Match client name
  const clientMatch = clients.find((c) =>
    text.toLowerCase().includes(c.name.toLowerCase()) ||
    text.toLowerCase().includes(c.name.split(" ")[0].toLowerCase())
  )
  if (clientMatch) {
    result.clientId = clientMatch.id
  }

  // Match service
  const serviceMatch = services.find((s) =>
    text.toLowerCase().includes(s.name.toLowerCase())
  )
  if (serviceMatch) {
    result.description = serviceMatch.name
    result.unitPrice = serviceMatch.defaultRate
    result.unit = serviceMatch.defaultUnit
    result.vatRate = serviceMatch.defaultVatRate
  }

  // Extract hours/quantity — e.g. "80 hours" or "80 hr"
  const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|godzin)/i)
  if (hoursMatch) {
    result.quantity = parseFloat(hoursMatch[1])
    result.unit = "HOUR"
  }

  // Extract quantity with other units
  const monthMatch = text.match(/(\d+)\s*(?:months?|miesi)/i)
  if (monthMatch && !hoursMatch) {
    result.quantity = parseFloat(monthMatch[1])
    result.unit = "MONTH"
  }

  // Extract rate — e.g. "at 200 PLN" or "200 PLN/hr" or "200 zł"
  const rateMatch = text.match(/(?:at|@|po)\s*(\d+(?:\.\d+)?)\s*(?:PLN|zł|EUR|\$|USD)?/i)
  if (rateMatch) {
    result.unitPrice = parseFloat(rateMatch[1])
  }
  // Also try "200 PLN" pattern without prefix if no match
  if (!rateMatch) {
    const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:PLN|zł)/i)
    if (priceMatch) {
      result.unitPrice = parseFloat(priceMatch[1])
    }
  }

  // Extract VAT rate — e.g. "23% VAT" or "VAT 23%"
  const vatMatch = text.match(/(\d+)\s*%\s*(?:VAT|vat)/i) || text.match(/(?:VAT|vat)\s*(\d+)\s*%/i)
  if (vatMatch) {
    result.vatRate = parseInt(vatMatch[1])
  }

  // Extract due days — e.g. "due in 14 days" or "14 days payment"
  const dueMatch = text.match(/(?:due\s+in|payment\s+in|termin|w\s+ciągu)\s*(\d+)\s*(?:days?|dni)/i)
  if (dueMatch) {
    result.dueDays = parseInt(dueMatch[1])
  }

  // Extract description from "for" clause if no service matched
  if (!result.description) {
    const forMatch = text.match(/(?:for|za)\s+(?:\w+\s*,?\s*)(.+?)(?:,|\d+\s*(?:hours?|hrs?)|\d+\s*(?:PLN|zł)|$)/i)
    if (forMatch) {
      result.description = forMatch[1].trim().replace(/,\s*$/, "")
    }
  }

  return result
}

// ─── Page Component ───────────────────────────────────────

export default function NewInvoicePage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const clients = getClients()
  const services = getServices()

  const [invoiceType, setInvoiceType] = useState<InvoiceType>("VAT")
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber())
  const [issueDate, setIssueDate] = useState(todayStr())
  const [saleDate, setSaleDate] = useState(todayStr())
  const [dueDate, setDueDate] = useState(addDays(todayStr(), 14))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER")
  const [currency, setCurrency] = useState("PLN")
  const [selectedClientId, setSelectedClientId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()])
  const [aiPrompt, setAiPrompt] = useState("")

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  )

  // ─── Computed totals ─────────────────────────────────────

  const computedItems = useMemo(() => {
    return items.map((item) => {
      const netAmount = Math.round(item.quantity * item.unitPrice * 100) / 100
      const vatAmount = calculateVAT(netAmount, item.vatRate)
      const grossAmount = calculateGross(netAmount, item.vatRate)
      return { ...item, netAmount, vatAmount, grossAmount }
    })
  }, [items])

  const subtotal = useMemo(
    () => computedItems.reduce((sum, i) => sum + i.netAmount, 0),
    [computedItems]
  )
  const vatTotal = useMemo(
    () => computedItems.reduce((sum, i) => sum + i.vatAmount, 0),
    [computedItems]
  )
  const grandTotal = useMemo(
    () => computedItems.reduce((sum, i) => sum + i.grossAmount, 0),
    [computedItems]
  )

  // VAT breakdown by rate
  const vatBreakdown = useMemo(() => {
    const map = new Map<number, { net: number; vat: number; gross: number }>()
    for (const item of computedItems) {
      const existing = map.get(item.vatRate) || { net: 0, vat: 0, gross: 0 }
      existing.net += item.netAmount
      existing.vat += item.vatAmount
      existing.gross += item.grossAmount
      map.set(item.vatRate, existing)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, amounts]) => ({ rate, ...amounts }))
  }, [computedItems])

  // ─── Item handlers ────────────────────────────────────────

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  function handleServiceSelect(itemId: string, serviceId: string) {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              serviceId,
              description: service.name,
              unitPrice: service.defaultRate ?? 0,
              unit: service.defaultUnit,
              vatRate: service.defaultVatRate,
            }
          : item
      )
    )
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()])
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.id !== id)))
  }

  // ─── AI generate handler ─────────────────────────────────

  function handleAIGenerate() {
    if (!aiPrompt.trim()) return
    const parsed = parseAIDescription(aiPrompt)

    if (parsed.clientId) setSelectedClientId(parsed.clientId)
    if (parsed.dueDays) setDueDate(addDays(issueDate, parsed.dueDays))

    if (parsed.description || parsed.quantity || parsed.unitPrice) {
      const newItem: LineItem = {
        id: crypto.randomUUID(),
        serviceId: "",
        description: parsed.description || "",
        quantity: parsed.quantity || 1,
        unit: parsed.unit || "HOUR",
        unitPrice: parsed.unitPrice || 0,
        vatRate: parsed.vatRate || 23,
      }

      // Try to match service for serviceId
      const svcMatch = services.find(
        (s) => s.name.toLowerCase() === (parsed.description || "").toLowerCase()
      )
      if (svcMatch) newItem.serviceId = svcMatch.id

      setItems([newItem])
    }

    setAiPrompt("")
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
            <p className="text-sm text-muted-foreground">
              Fill in the details below or use AI to auto-generate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button variant="secondary" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          <Button size="sm">
            <Send className="mr-2 h-4 w-4" />
            Save &amp; Send
          </Button>
        </div>
      </div>

      {/* AI Quick Create Bar */}
      <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Describe your invoice... e.g. 'Invoice for TechVenture, web development 80 hours at 200 PLN, 23% VAT, due in 14 days'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAIGenerate()
                }}
                className="flex-1"
              />
              <Button onClick={handleAIGenerate} disabled={!aiPrompt.trim()}>
                Generate
              </Button>
            </div>
          </div>
          <p className="mt-2 pl-[52px] text-xs text-muted-foreground">
            AI will auto-fill the invoice details from your description
          </p>
        </CardContent>
      </Card>

      {/* Main Form + Summary */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Invoice Details & Client — two column on desktop */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceType">Invoice Type</Label>
                  <Select
                    value={invoiceType}
                    onValueChange={(v) => setInvoiceType(v as InvoiceType)}
                  >
                    <SelectTrigger id="invoiceType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_TYPES.filter((t) => t.value !== "RECURRING").map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saleDate">Sale Date</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Select Client</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span>{client.name}</span>
                            {client.nip && (
                              <span className="text-xs text-muted-foreground">
                                NIP: {client.nip}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>

                {selectedClient && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{selectedClient.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {selectedClient.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {selectedClient.nip && (
                        <p>
                          <span className="font-medium text-foreground">NIP:</span>{" "}
                          {selectedClient.nip}
                        </p>
                      )}
                      {selectedClient.address && (
                        <p>
                          <span className="font-medium text-foreground">Address:</span>{" "}
                          {selectedClient.address}
                          {selectedClient.postalCode &&
                            `, ${selectedClient.postalCode}`}{" "}
                          {selectedClient.city}
                        </p>
                      )}
                      {selectedClient.email && (
                        <p>
                          <span className="font-medium text-foreground">Email:</span>{" "}
                          {selectedClient.email}
                        </p>
                      )}
                      {selectedClient.contactPerson && (
                        <p>
                          <span className="font-medium text-foreground">Contact:</span>{" "}
                          {selectedClient.contactPerson}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Desktop table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_1.5fr_80px_100px_110px_100px_110px_110px_130px_40px] md:gap-2 md:text-xs md:font-medium md:text-muted-foreground md:px-1">
                <span>Service</span>
                <span>Description</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Unit Price</span>
                <span>VAT Rate</span>
                <span>Net</span>
                <span>VAT</span>
                <span>Gross</span>
                <span></span>
              </div>

              {computedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border p-3 md:space-y-0 md:grid md:grid-cols-[1fr_1.5fr_80px_100px_110px_100px_110px_110px_130px_40px] md:gap-2 md:items-center md:border-0 md:p-0"
                >
                  {/* Service */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Service</Label>
                    <Select
                      value={item.serviceId}
                      onValueChange={(v) => handleServiceSelect(item.id, v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((svc) => (
                          <SelectItem key={svc.id} value={svc.id}>
                            {svc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Description</Label>
                    <Input
                      className="h-9 text-xs"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                    />
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Quantity</Label>
                    <Input
                      className="h-9 text-xs"
                      type="number"
                      min="0"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateItem(item.id, "unit", v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.short || u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Unit Price</Label>
                    <Input
                      className="h-9 text-xs"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "unitPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>

                  {/* VAT Rate */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">VAT Rate</Label>
                    <Select
                      value={String(item.vatRate)}
                      onValueChange={(v) =>
                        updateItem(item.id, "vatRate", parseFloat(v))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map((r) => (
                          <SelectItem key={r.value} value={String(r.value)}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Net Amount */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Net Amount</Label>
                    <div className="flex h-9 items-center rounded-md bg-muted px-3 text-xs font-medium">
                      {formatCurrency(item.netAmount, currency)}
                    </div>
                  </div>

                  {/* VAT Amount */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">VAT Amount</Label>
                    <div className="flex h-9 items-center rounded-md bg-muted px-3 text-xs font-medium">
                      {formatCurrency(item.vatAmount, currency)}
                    </div>
                  </div>

                  {/* Gross Amount */}
                  <div className="space-y-1 md:space-y-0">
                    <Label className="text-xs md:hidden">Gross Amount</Label>
                    <div className="flex h-9 items-center rounded-md bg-muted px-3 text-xs font-semibold">
                      {formatCurrency(item.grossAmount, currency)}
                    </div>
                  </div>

                  {/* Remove */}
                  <div className="flex justify-end md:justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>

              {/* Totals */}
              <Separator className="my-4" />
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (net)</span>
                    <span className="font-medium">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </div>
                  {vatBreakdown.map((vb) => (
                    <div
                      key={vb.rate}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        VAT {vb.rate >= 0 ? `${vb.rate}%` : "exempt"}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(vb.vat, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total VAT</span>
                    <span className="font-medium">
                      {formatCurrency(vatTotal, currency)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">
                      {formatCurrency(grandTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Additional notes or payment instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Sticky Summary */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium text-right max-w-[180px] truncate">
                    {selectedClient?.name || "Not selected"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono text-xs">{invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline" className="text-xs">
                    {INVOICE_TYPES.find((t) => t.value === invoiceType)?.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="text-xs">{dueDate}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>

                {vatBreakdown.map((vb) => (
                  <div
                    key={vb.rate}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      VAT {vb.rate >= 0 ? `${vb.rate}%` : "exempt"}
                    </span>
                    <span>{formatCurrency(vb.vat, currency)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <Button className="w-full" size="sm">
                  <Send className="mr-2 h-4 w-4" />
                  Save &amp; Send
                </Button>
                <Button variant="secondary" className="w-full" size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
