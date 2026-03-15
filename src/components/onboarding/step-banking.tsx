"use client"

import type { BankingSetup } from "@/lib/onboarding/onboarding.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface StepBankingProps {
  data: BankingSetup
  onUpdate: (data: Partial<BankingSetup>) => void
  errors?: Map<string, string>
}

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "ONLINE", label: "Online" },
]

const PAYMENT_DAYS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "21", label: "21 days" },
  { value: "30", label: "30 days" },
  { value: "45", label: "45 days" },
  { value: "60", label: "60 days" },
]

export function StepBanking({ data, onUpdate, errors }: StepBankingProps) {
  const toggleMethod = (method: string) => {
    const current = data.acceptedMethods
    const updated = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method]
    onUpdate({ acceptedMethods: updated })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Banking &amp; Payment</h3>
        <p className="mt-1 text-sm text-slate-500">
          Bank account details and payment terms that appear on your invoices
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Account Holder */}
        <div className="space-y-2 md:col-span-2">
          <Label>Account Holder *</Label>
          <Input
            placeholder="Acme Sp. z o.o."
            value={data.accountHolder}
            onChange={(e) => onUpdate({ accountHolder: e.target.value })}
          />
          {errors?.get?.("accountHolder") && (
            <p className="text-xs text-red-500">{errors.get("accountHolder")}</p>
          )}
        </div>

        {/* Bank Name */}
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Input
            placeholder="mBank S.A."
            value={data.bankName}
            onChange={(e) => onUpdate({ bankName: e.target.value })}
          />
        </div>

        {/* IBAN */}
        <div className="space-y-2 md:col-span-2">
          <Label>IBAN *</Label>
          <Input
            placeholder="PL 12 1140 2004 0000 3102 7890 1234"
            value={data.iban}
            onChange={(e) => onUpdate({ iban: e.target.value })}
          />
          <p className="text-xs text-slate-400">
            Country code + 2 check digits + up to 30 alphanumeric characters (e.g. PL61 1090 1014 0000 0712 1981 2874)
          </p>
          {errors?.get?.("iban") && (
            <p className="text-xs text-red-500">{errors.get("iban")}</p>
          )}
        </div>

        {/* SWIFT */}
        <div className="space-y-2">
          <Label>SWIFT / BIC</Label>
          <Input
            placeholder="BREXPLPWXXX"
            value={data.swift}
            onChange={(e) => onUpdate({ swift: e.target.value })}
          />
        </div>

        {/* Accepted Payment Methods */}
        <div className="space-y-2 md:col-span-2">
          <Label>Accepted Payment Methods</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <Button
                key={m.value}
                type="button"
                variant={data.acceptedMethods.includes(m.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMethod(m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Default Payment Days */}
        <div className="space-y-2">
          <Label>Default Payment Terms *</Label>
          <Select
            value={String(data.defaultPaymentDays)}
            onValueChange={(v) => onUpdate({ defaultPaymentDays: Number(v) })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_DAYS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.get?.("defaultPaymentDays") && (
            <p className="text-xs text-red-500">{errors.get("defaultPaymentDays")}</p>
          )}
        </div>

        {/* Late Payment Policy */}
        <div className="space-y-2 md:col-span-2">
          <Label>Late Payment Policy</Label>
          <Textarea
            placeholder="e.g., 0.05% daily interest after due date"
            value={data.latePaymentPolicy}
            onChange={(e) => onUpdate({ latePaymentPolicy: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}
