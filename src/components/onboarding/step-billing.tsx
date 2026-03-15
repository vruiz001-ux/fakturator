"use client"

import type { BillingSetup } from "@/lib/onboarding/onboarding.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface StepBillingProps {
  data: BillingSetup
  onUpdate: (data: Partial<BillingSetup>) => void
  errors?: Map<string, string>
}

const COUNTRIES = [
  { value: "PL", label: "Poland" },
  { value: "DE", label: "Germany" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "Other", label: "Other" },
]

const TAX_RESIDENCIES = [
  { value: "PL", label: "Poland" },
  { value: "EU", label: "EU (non-PL)" },
  { value: "Other", label: "Other" },
]

const VAT_RATES = [
  { value: "23", label: "23% (Standard)" },
  { value: "8", label: "8% (Reduced)" },
  { value: "5", label: "5% (Reduced)" },
  { value: "0", label: "0% (Zero rate)" },
]

export function StepBilling({ data, onUpdate, errors }: StepBillingProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Tax &amp; Billing Details</h3>
        <p className="mt-1 text-sm text-slate-500">
          Registered address, VAT, and tax identifiers for your invoices
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Address */}
        <div className="space-y-2 md:col-span-2">
          <Label>Registered Address *</Label>
          <Input
            placeholder="ul. Marszalkowska 100"
            value={data.address}
            onChange={(e) => onUpdate({ address: e.target.value })}
          />
          {errors?.get?.("address") && (
            <p className="text-xs text-red-500">{errors.get("address")}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label>City *</Label>
          <Input
            placeholder="Warszawa"
            value={data.city}
            onChange={(e) => onUpdate({ city: e.target.value })}
          />
          {errors?.get?.("city") && (
            <p className="text-xs text-red-500">{errors.get("city")}</p>
          )}
        </div>

        {/* Postal Code */}
        <div className="space-y-2">
          <Label>Postal Code *</Label>
          <Input
            placeholder="00-001"
            value={data.postalCode}
            onChange={(e) => onUpdate({ postalCode: e.target.value })}
          />
          {errors?.get?.("postalCode") && (
            <p className="text-xs text-red-500">{errors.get("postalCode")}</p>
          )}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label>Country *</Label>
          <Select value={data.country} onValueChange={(v) => onUpdate({ country: v })}>
            <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.get?.("country") && (
            <p className="text-xs text-red-500">{errors.get("country")}</p>
          )}
        </div>

        {/* NIP */}
        <div className="space-y-2">
          <Label>NIP (Tax ID) *</Label>
          <Input
            placeholder="123-456-78-90"
            value={data.nip}
            onChange={(e) => onUpdate({ nip: e.target.value })}
          />
          <p className="text-xs text-slate-400">Format: XXX-XXX-XX-XX</p>
          {errors?.get?.("nip") && (
            <p className="text-xs text-red-500">{errors.get("nip")}</p>
          )}
        </div>

        {/* REGON */}
        <div className="space-y-2">
          <Label>REGON</Label>
          <Input
            placeholder="123456789"
            value={data.regon}
            onChange={(e) => onUpdate({ regon: e.target.value })}
          />
        </div>

        {/* KRS */}
        <div className="space-y-2">
          <Label>KRS</Label>
          <Input
            placeholder="0000123456"
            value={data.krs}
            onChange={(e) => onUpdate({ krs: e.target.value })}
          />
        </div>

        {/* Tax Residency */}
        <div className="space-y-2">
          <Label>Tax Residency</Label>
          <Select value={data.taxResidency} onValueChange={(v) => onUpdate({ taxResidency: v })}>
            <SelectTrigger><SelectValue placeholder="Select residency" /></SelectTrigger>
            <SelectContent>
              {TAX_RESIDENCIES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* VAT Payer Switch */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">VAT Registered</p>
              <p className="text-xs text-slate-500">Are you a registered VAT payer?</p>
            </div>
            <Switch
              checked={data.isVatPayer}
              onCheckedChange={(checked) => onUpdate({ isVatPayer: checked })}
            />
          </div>
        </div>

        {/* Default VAT Rate — only shown if VAT payer */}
        {data.isVatPayer && (
          <div className="space-y-2">
            <Label>Default VAT Rate</Label>
            <Select
              value={String(data.defaultVatRate)}
              onValueChange={(v) => onUpdate({ defaultVatRate: Number(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VAT_RATES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
