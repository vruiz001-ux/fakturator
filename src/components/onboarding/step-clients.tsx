"use client"

import type { ClientPreferences } from "@/lib/onboarding/onboarding.types"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

interface StepClientsProps {
  data: ClientPreferences
  onUpdate: (data: Partial<ClientPreferences>) => void
  errors?: Map<string, string>
}

const CLIENT_TYPES = ["B2B", "B2C", "Public Sector", "Mixed"]
const COUNTRIES = ["Poland", "Germany", "UK", "France", "Netherlands", "Other"]
const CURRENCIES = ["PLN", "EUR", "USD", "GBP"]
const CONTACT_FIELDS = ["Email", "Phone", "Address", "NIP"]

function MultiToggle({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (updated: string[]) => void
}) {
  const toggle = (value: string) => {
    const updated = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(updated)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt}
          type="button"
          variant={selected.includes(opt) ? "default" : "outline"}
          size="sm"
          onClick={() => toggle(opt)}
        >
          {opt}
        </Button>
      ))}
    </div>
  )
}

export function StepClients({ data, onUpdate, errors }: StepClientsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Client Preferences</h3>
        <p className="mt-1 text-sm text-slate-500">
          Tell us about your typical clients so we can tailor the experience
        </p>
      </div>

      {/* Client Types */}
      <div className="space-y-2">
        <Label>Client Types</Label>
        <MultiToggle
          options={CLIENT_TYPES}
          selected={data.clientTypes}
          onChange={(v) => onUpdate({ clientTypes: v })}
        />
      </div>

      {/* Main Countries */}
      <div className="space-y-2">
        <Label>Main Countries</Label>
        <MultiToggle
          options={COUNTRIES}
          selected={data.mainCountries}
          onChange={(v) => onUpdate({ mainCountries: v })}
        />
      </div>

      {/* Client Currencies */}
      <div className="space-y-2">
        <Label>Client Currencies</Label>
        <MultiToggle
          options={CURRENCIES}
          selected={data.clientCurrencies}
          onChange={(v) => onUpdate({ clientCurrencies: v })}
        />
      </div>

      {/* Switches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Requires PO Reference</p>
            <p className="text-xs text-slate-500">Clients require a purchase order number on invoices</p>
          </div>
          <Switch
            checked={data.requiresPOReference}
            onCheckedChange={(checked) => onUpdate({ requiresPOReference: checked })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Uses Rebillable Expenses</p>
            <p className="text-xs text-slate-500">You rebill expenses incurred on behalf of clients</p>
          </div>
          <Switch
            checked={data.usesRebillableExpenses}
            onCheckedChange={(checked) => onUpdate({ usesRebillableExpenses: checked })}
          />
        </div>
      </div>

      {/* Preferred Contact Fields */}
      <div className="space-y-2">
        <Label>Preferred Contact Fields</Label>
        <MultiToggle
          options={CONTACT_FIELDS}
          selected={data.preferredContactFields}
          onChange={(v) => onUpdate({ preferredContactFields: v })}
        />
      </div>
    </div>
  )
}
