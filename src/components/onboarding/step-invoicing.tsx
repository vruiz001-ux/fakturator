"use client"

import { useMemo } from "react"
import type { InvoicingSetup } from "@/lib/onboarding/onboarding.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface StepInvoicingProps {
  data: InvoicingSetup
  onUpdate: (data: Partial<InvoicingSetup>) => void
  errors?: Map<string, string>
}

const CURRENCIES = [
  { value: "PLN", label: "PLN" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
]

export function StepInvoicing({ data, onUpdate, errors }: StepInvoicingProps) {
  const toggleCurrency = (currency: string) => {
    const current = data.supportedCurrencies
    const updated = current.includes(currency)
      ? current.filter((c) => c !== currency)
      : [...current, currency]
    onUpdate({ supportedCurrencies: updated })
  }

  const numberPreview = useMemo(() => {
    const now = new Date()
    return data.numberFormat
      .replace("{YYYY}", String(now.getFullYear()))
      .replace("{MM}", String(now.getMonth() + 1).padStart(2, "0"))
      .replace("{NNN}", "001")
  }, [data.numberFormat])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Invoicing Preferences</h3>
        <p className="mt-1 text-sm text-slate-500">
          Currencies, numbering format, and invoice defaults
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Default Currency */}
        <div className="space-y-2">
          <Label>Default Currency *</Label>
          <Select value={data.defaultCurrency} onValueChange={(v) => onUpdate({ defaultCurrency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
          {errors?.get?.("defaultCurrency") && (
            <p className="text-xs text-red-500">{errors.get("defaultCurrency")}</p>
          )}
        </div>

        {/* Supported Currencies */}
        <div className="space-y-2">
          <Label>Supported Currencies *</Label>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <Button
                key={c.value}
                type="button"
                variant={data.supportedCurrencies.includes(c.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCurrency(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
          {errors?.get?.("supportedCurrencies") && (
            <p className="text-xs text-red-500">{errors.get("supportedCurrencies")}</p>
          )}
        </div>

        {/* Invoice Language */}
        <div className="space-y-2">
          <Label>Invoice Language</Label>
          <Select value={data.invoiceLanguage} onValueChange={(v) => onUpdate({ invoiceLanguage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="pl">Polish</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Number Format */}
        <div className="space-y-2">
          <Label>Invoice Number Format *</Label>
          <Input
            value={data.numberFormat}
            onChange={(e) => onUpdate({ numberFormat: e.target.value })}
            placeholder="FV/{YYYY}/{MM}/{NNN}"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Preview:</span>
            <Badge variant="secondary" className="font-mono text-xs">{numberPreview}</Badge>
          </div>
          {errors?.get?.("numberFormat") && (
            <p className="text-xs text-red-500">{errors.get("numberFormat")}</p>
          )}
        </div>

        {/* Tax Display Mode */}
        <div className="space-y-2">
          <Label>Tax Display</Label>
          <Select value={data.taxDisplayMode} onValueChange={(v) => onUpdate({ taxDisplayMode: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inclusive">Show VAT inclusive</SelectItem>
              <SelectItem value="separate">Show VAT separate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issue Date Logic */}
        <div className="space-y-2">
          <Label>Issue Date Logic</Label>
          <Select value={data.issueDateLogic} onValueChange={(v) => onUpdate({ issueDateLogic: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Date of issue</SelectItem>
              <SelectItem value="sale_date">Date of sale</SelectItem>
              <SelectItem value="same_as_sale">Same as sale date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date Logic */}
        <div className="space-y-2">
          <Label>Due Date Logic</Label>
          <Select value={data.dueDateLogic} onValueChange={(v) => onUpdate({ dueDateLogic: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="net_7">Net 7</SelectItem>
              <SelectItem value="net_14">Net 14</SelectItem>
              <SelectItem value="net_21">Net 21</SelectItem>
              <SelectItem value="net_30">Net 30</SelectItem>
              <SelectItem value="net_45">Net 45</SelectItem>
              <SelectItem value="net_60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Footer */}
        <div className="space-y-2 md:col-span-2">
          <Label>Default Footer</Label>
          <Textarea
            placeholder="Thank you for your business"
            value={data.defaultFooter}
            onChange={(e) => onUpdate({ defaultFooter: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}
