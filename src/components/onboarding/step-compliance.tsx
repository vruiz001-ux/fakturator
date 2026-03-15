"use client"

import { Shield } from "lucide-react"
import type { ComplianceSetup } from "@/lib/onboarding/onboarding.types"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"

interface StepComplianceProps {
  data: ComplianceSetup
  onUpdate: (data: Partial<ComplianceSetup>) => void
  errors?: Map<string, string>
}

export function StepCompliance({ data, onUpdate }: StepComplianceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Compliance &amp; Integration</h3>
        <p className="mt-1 text-sm text-slate-500">
          KSeF integration, audit logging, and data import options
        </p>
      </div>

      {/* KSeF Info Card */}
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-indigo-900">About KSeF</p>
            <p className="mt-1 text-sm text-indigo-700">
              KSeF (Krajowy System e-Faktur) is Poland&apos;s national e-invoicing system.
              When enabled, Fakturator will generate structured invoice data compatible
              with KSeF requirements. This will become mandatory for most businesses.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {/* KSeF Enabled */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Enable KSeF</p>
            <p className="text-xs text-slate-500">Generate KSeF-compatible structured invoices</p>
          </div>
          <Switch
            checked={data.ksefEnabled}
            onCheckedChange={(checked) => onUpdate({ ksefEnabled: checked })}
          />
        </div>

        {/* Structured Invoice Data */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Structured Invoice Data</p>
            <p className="text-xs text-slate-500">Store invoice data in a structured format for compliance</p>
          </div>
          <Switch
            checked={data.structuredInvoiceData}
            onCheckedChange={(checked) => onUpdate({ structuredInvoiceData: checked })}
          />
        </div>

        {/* Audit Logging */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Audit Logging</p>
            <p className="text-xs text-slate-500">Log all changes to invoices and financial data</p>
            <p className="mt-1 text-xs font-medium text-amber-600">Recommended for compliance</p>
          </div>
          <Switch
            checked={data.auditLoggingEnabled}
            onCheckedChange={(checked) => onUpdate({ auditLoggingEnabled: checked })}
          />
        </div>

        {/* Ninja Import */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-900">I want to import data from Ninja Invoice</p>
            <p className="text-xs text-slate-500">Migrate your existing invoices, clients, and products</p>
          </div>
          <Switch
            checked={data.offerNinjaImport}
            onCheckedChange={(checked) => onUpdate({ offerNinjaImport: checked })}
          />
        </div>

        {/* Import Historical Now — only if Ninja Import */}
        {data.offerNinjaImport && (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Import historical data now</p>
              <p className="text-xs text-slate-500">
                Start the import process right after onboarding completes
              </p>
            </div>
            <Switch
              checked={data.importHistoricalNow}
              onCheckedChange={(checked) => onUpdate({ importHistoricalNow: checked })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
