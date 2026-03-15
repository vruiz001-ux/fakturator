"use client"

import { useState } from "react"
import type { CompanySetup, BillingSetup } from "@/lib/onboarding/onboarding.types"
import type { CompanySourceMetadata } from "@/services/krs/krs.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { KrsLookup } from "./krs-lookup"

interface StepCompanyProps {
  data: CompanySetup
  onUpdate: (data: Partial<CompanySetup>) => void
  errors?: Map<string, string>
  billingData?: BillingSetup
  onUpdateBilling?: (data: Partial<BillingSetup>) => void
  sourceMetadata?: CompanySourceMetadata | null
  onSourceMetadataChange?: (metadata: CompanySourceMetadata | null) => void
}

const BUSINESS_TYPES = [
  { value: "sole_proprietor", label: "Sole Proprietor (JDG)" },
  { value: "limited", label: "Limited Company (Sp. z o.o.)" },
  { value: "corporation", label: "Corporation (S.A.)" },
  { value: "partnership", label: "Partnership (Sp.j. / Sp.k.)" },
  { value: "foundation", label: "Foundation" },
  { value: "other", label: "Other" },
]

const INDUSTRIES = [
  "Technology", "Consulting", "Design", "Marketing", "Legal",
  "Accounting", "Construction", "Education", "Healthcare", "Other",
]

export function StepCompany({ data, onUpdate, errors, billingData, onUpdateBilling, sourceMetadata, onSourceMetadataChange }: StepCompanyProps) {
  const [krsFields, setKrsFields] = useState<Set<string>>(
    new Set(sourceMetadata?.matchedFields || [])
  )

  const handleKrsSelected = (
    company: Partial<CompanySetup>,
    billing: Partial<BillingSetup>,
    metadata: CompanySourceMetadata,
    filledFields: string[]
  ) => {
    onUpdate(company)
    onUpdateBilling?.(billing)
    onSourceMetadataChange?.(metadata)
    setKrsFields(new Set(filledFields))
  }

  const handleClearKrs = () => {
    setKrsFields(new Set())
    onSourceMetadataChange?.(null)
  }

  // Track manual overrides of KRS-filled fields
  const handleFieldChange = (field: string, value: string) => {
    onUpdate({ [field]: value } as Partial<CompanySetup>)
    if (krsFields.has(field) && sourceMetadata) {
      const { trackOverride } = require("@/services/krs/krs-autofill.service")
      onSourceMetadataChange?.(trackOverride(sourceMetadata, field))
    }
  }

  const isKrsField = (field: string) => krsFields.has(field)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Company Information</h3>
        <p className="mt-1 text-sm text-slate-500">
          Your legal company details — these appear on every invoice
        </p>
      </div>

      {/* KRS Lookup */}
      <KrsLookup
        onCompanySelected={handleKrsSelected}
        currentSourceMetadata={sourceMetadata}
        onClear={handleClearKrs}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Legal Name */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center gap-2">
            <Label>Legal Name *</Label>
            {isKrsField("legalName") && (
              <Badge variant="secondary" className="text-[10px] h-4">KRS</Badge>
            )}
          </div>
          <Input
            placeholder="Acme Sp. z o.o."
            value={data.legalName}
            onChange={(e) => handleFieldChange("legalName", e.target.value)}
          />
          {errors?.get?.("legalName") && (
            <p className="text-xs text-red-500">{errors.get("legalName")}</p>
          )}
        </div>

        {/* Trading Name */}
        <div className="space-y-2">
          <Label>Trading Name</Label>
          <Input
            placeholder="Acme"
            value={data.tradingName}
            onChange={(e) => onUpdate({ tradingName: e.target.value })}
          />
        </div>

        {/* Business Type */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Business Type</Label>
            {isKrsField("businessType") && (
              <Badge variant="secondary" className="text-[10px] h-4">KRS</Badge>
            )}
          </div>
          <Select value={data.businessType} onValueChange={(v) => {
            onUpdate({ businessType: v })
            if (isKrsField("businessType") && sourceMetadata) {
              const { trackOverride } = require("@/services/krs/krs-autofill.service")
              onSourceMetadataChange?.(trackOverride(sourceMetadata, "businessType"))
            }
          }}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={data.industry} onValueChange={(v) => onUpdate({ industry: v })}>
            <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Brief description of your business"
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            placeholder="https://company.pl"
            value={data.website}
            onChange={(e) => onUpdate({ website: e.target.value })}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input
            type="email"
            placeholder="biuro@company.pl"
            value={data.email}
            onChange={(e) => handleFieldChange("email", e.target.value)}
          />
          {errors?.get?.("email") && (
            <p className="text-xs text-red-500">{errors.get("email")}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            placeholder="+48 22 123 4567"
            value={data.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
