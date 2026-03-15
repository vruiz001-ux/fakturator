"use client"

import { useState } from "react"
import { Plus, Trash2, Tag } from "lucide-react"
import type { ServicesSetup, ServiceEntry } from "@/lib/onboarding/onboarding.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface StepServicesProps {
  data: ServicesSetup
  onUpdate: (data: Partial<ServicesSetup>) => void
  errors?: Map<string, string>
  onAddService: (service: Omit<ServiceEntry, "id">) => void
  onRemoveService: (id: string) => void
  onUpdateService: (id: string, data: Partial<ServiceEntry>) => void
}

const UNITS = [
  { value: "HOUR", label: "Hour" },
  { value: "DAY", label: "Day" },
  { value: "MONTH", label: "Month" },
  { value: "PROJECT", label: "Project" },
  { value: "PIECE", label: "Piece" },
  { value: "SERVICE", label: "Service" },
]

const PRICING_MODELS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "FIXED", label: "Fixed" },
  { value: "CUSTOM", label: "Custom" },
]

const VAT_RATES = [
  { value: "23", label: "23%" },
  { value: "8", label: "8%" },
  { value: "5", label: "5%" },
  { value: "0", label: "0%" },
]

export function StepServices({
  data,
  onUpdate,
  errors,
  onAddService,
  onRemoveService,
  onUpdateService,
}: StepServicesProps) {
  const [categoryInput, setCategoryInput] = useState("")

  const addCategory = () => {
    const trimmed = categoryInput.trim()
    if (!trimmed || data.categories.includes(trimmed)) return
    onUpdate({ categories: [...data.categories, trimmed] })
    setCategoryInput("")
  }

  const removeCategory = (cat: string) => {
    onUpdate({ categories: data.categories.filter((c) => c !== cat) })
  }

  const handleAddService = () => {
    onAddService({
      name: "",
      description: "",
      category: "",
      unit: "HOUR",
      defaultRate: null,
      pricingModel: "HOURLY",
      vatRate: 23,
      isTaxable: true,
      isRecurringEligible: false,
    })
  }

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addCategory()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Define the services you provide</h3>
        <p className="mt-1 text-sm text-slate-500">
          These will be used for invoice line items, analytics, and AI suggestions.
        </p>
      </div>

      {/* Category Tags */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          Service Categories
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Type a category and press Enter"
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCategory}>
            Add
          </Button>
        </div>
        {data.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.categories.map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="cursor-pointer gap-1 pr-1.5 hover:bg-red-50 hover:text-red-600"
                onClick={() => removeCategory(cat)}
              >
                {cat}
                <span className="text-[10px]">&times;</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Service List */}
      {errors?.get?.("services") && (
        <p className="text-xs text-red-500">{errors.get("services")}</p>
      )}

      {data.services.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-slate-500">
              No services added yet. Add at least one service you offer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.services.map((svc, idx) => (
            <Card key={svc.id} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Service {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                    onClick={() => onRemoveService(svc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      placeholder="e.g. Web Development"
                      value={svc.name}
                      onChange={(e) => onUpdateService(svc.id, { name: e.target.value })}
                    />
                    {errors?.get?.(`services[${idx}].name`) && (
                      <p className="text-xs text-red-500">{errors.get(`services[${idx}].name`)}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="Brief description"
                      value={svc.description}
                      onChange={(e) => onUpdateService(svc.id, { description: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={svc.category}
                      onValueChange={(v) => onUpdateService(svc.id, { category: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {data.categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unit */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit</Label>
                    <Select
                      value={svc.unit}
                      onValueChange={(v) => onUpdateService(svc.id, { unit: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Default Rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default Rate</Label>
                    <Input
                      type="number"
                      placeholder="200"
                      value={svc.defaultRate ?? ""}
                      onChange={(e) =>
                        onUpdateService(svc.id, {
                          defaultRate: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>

                  {/* Pricing Model */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pricing Model</Label>
                    <Select
                      value={svc.pricingModel}
                      onValueChange={(v) => onUpdateService(svc.id, { pricingModel: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRICING_MODELS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* VAT Rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">VAT Rate</Label>
                    <Select
                      value={String(svc.vatRate)}
                      onValueChange={(v) => onUpdateService(svc.id, { vatRate: Number(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Switches */}
                <div className="mt-3 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={svc.isTaxable}
                      onCheckedChange={(checked) => onUpdateService(svc.id, { isTaxable: checked })}
                    />
                    <Label className="text-xs text-slate-600">Taxable</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={svc.isRecurringEligible}
                      onCheckedChange={(checked) =>
                        onUpdateService(svc.id, { isRecurringEligible: checked })
                      }
                    />
                    <Label className="text-xs text-slate-600">Recurring eligible</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={handleAddService}>
        <Plus className="mr-2 h-4 w-4" />
        Add Service
      </Button>
    </div>
  )
}
