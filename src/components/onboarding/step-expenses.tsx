"use client"

import { Receipt } from "lucide-react"
import type { ExpensePreferences } from "@/lib/onboarding/onboarding.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"

interface StepExpensesProps {
  data: ExpensePreferences
  onUpdate: (data: Partial<ExpensePreferences>) => void
  errors?: Map<string, string>
}

export function StepExpenses({ data, onUpdate }: StepExpensesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Expense Preferences</h3>
        <p className="mt-1 text-sm text-slate-500">
          Configure how you track and rebill expenses to clients
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Receipt className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-indigo-900">What is expense rebilling?</p>
            <p className="mt-1 text-sm text-indigo-700">
              When you incur expenses on behalf of a client (travel, software, materials),
              Fakturator lets you track them, assign them to clients, and automatically
              convert them into invoice line items — with optional markup and FX conversion.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {/* Tracks Client Expenses */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">We incur expenses on behalf of clients</p>
            <p className="text-xs text-slate-500">Track billable expenses per client project</p>
          </div>
          <Switch
            checked={data.tracksClientExpenses}
            onCheckedChange={(checked) => onUpdate({ tracksClientExpenses: checked })}
          />
        </div>

        {/* Enable Rebilling — only if tracksClientExpenses */}
        {data.tracksClientExpenses && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Enable rebilling</p>
              <p className="text-xs text-slate-500">Automatically add tracked expenses as invoice line items</p>
            </div>
            <Switch
              checked={data.enableRebilling}
              onCheckedChange={(checked) => onUpdate({ enableRebilling: checked })}
            />
          </div>
        )}

        {/* Auto Match Expenses */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Auto-match expenses</p>
            <p className="text-xs text-slate-500">Automatically match expenses to clients based on tags or vendor</p>
          </div>
          <Switch
            checked={data.autoMatchExpenses}
            onCheckedChange={(checked) => onUpdate({ autoMatchExpenses: checked })}
          />
        </div>

        {/* Rebill in EUR */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Rebill foreign expenses in EUR</p>
            <p className="text-xs text-slate-500">Convert non-PLN expenses to EUR for rebilling</p>
          </div>
          <Switch
            checked={data.rebillInEur}
            onCheckedChange={(checked) => onUpdate({ rebillInEur: checked })}
          />
        </div>

        {/* Default FX Margin — only if rebillInEur */}
        {data.rebillInEur && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">FX Margin</p>
              <p className="text-xs text-slate-500">Markup percentage on foreign exchange conversion</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={data.defaultFxMargin}
                onChange={(e) => onUpdate({ defaultFxMargin: Number(e.target.value) })}
                className="w-20 text-right"
                min={0}
                max={100}
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
        )}

        {/* Expensify */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Connect Expensify later</p>
            <p className="text-xs text-slate-500">Import expenses automatically from Expensify</p>
          </div>
          <Switch
            checked={data.enableExpensifyLater}
            onCheckedChange={(checked) => onUpdate({ enableExpensifyLater: checked })}
          />
        </div>
      </div>
    </div>
  )
}
