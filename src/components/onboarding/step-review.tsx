"use client"

import {
  CheckCircle2, AlertCircle, Pencil, Building2, Receipt, CreditCard,
  FileText, Briefcase, Users, Wallet, Shield,
} from "lucide-react"
import type { OnboardingData } from "@/lib/onboarding/onboarding.types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface StepReviewProps {
  data: OnboardingData
  completedSteps: number[]
  onGoToStep: (step: number) => void
  validationStatus: { ready: boolean; missing: string[] }
}

interface SectionSummary {
  step: number
  title: string
  icon: React.ElementType
  required: boolean
  items: { label: string; value: string }[]
}

function summarize(data: OnboardingData): SectionSummary[] {
  return [
    {
      step: 1,
      title: "Company",
      icon: Building2,
      required: true,
      items: [
        { label: "Legal Name", value: data.company.legalName || "Not set" },
        { label: "Email", value: data.company.email || "Not set" },
        { label: "Business Type", value: data.company.businessType || "Not set" },
        { label: "Industry", value: data.company.industry || "Not set" },
      ],
    },
    {
      step: 2,
      title: "Tax & Billing",
      icon: Receipt,
      required: true,
      items: [
        { label: "Address", value: data.billing.address ? `${data.billing.address}, ${data.billing.city}` : "Not set" },
        { label: "NIP", value: data.billing.nip || "Not set" },
        { label: "VAT Payer", value: data.billing.isVatPayer ? `Yes (${data.billing.defaultVatRate}%)` : "No" },
        { label: "Country", value: data.billing.country || "Not set" },
      ],
    },
    {
      step: 3,
      title: "Banking",
      icon: CreditCard,
      required: true,
      items: [
        { label: "Account Holder", value: data.banking.accountHolder || "Not set" },
        { label: "IBAN", value: data.banking.iban ? `${data.banking.iban.slice(0, 8)}...` : "Not set" },
        { label: "Payment Terms", value: `${data.banking.defaultPaymentDays} days` },
        { label: "Methods", value: data.banking.acceptedMethods.join(", ") || "None" },
      ],
    },
    {
      step: 4,
      title: "Invoicing",
      icon: FileText,
      required: true,
      items: [
        { label: "Currency", value: data.invoicing.defaultCurrency },
        { label: "Format", value: data.invoicing.numberFormat },
        { label: "Supported", value: data.invoicing.supportedCurrencies.join(", ") },
        { label: "Language", value: data.invoicing.invoiceLanguage === "pl" ? "Polish" : "English" },
      ],
    },
    {
      step: 5,
      title: "Services",
      icon: Briefcase,
      required: true,
      items: [
        {
          label: "Services",
          value: data.services.services.length > 0
            ? `${data.services.services.length} defined (${data.services.services.map((s) => s.name || "Unnamed").slice(0, 3).join(", ")}${data.services.services.length > 3 ? "..." : ""})`
            : "None",
        },
        { label: "Categories", value: data.services.categories.length > 0 ? data.services.categories.join(", ") : "None" },
      ],
    },
    {
      step: 6,
      title: "Clients",
      icon: Users,
      required: false,
      items: [
        { label: "Types", value: data.clients.clientTypes.join(", ") || "Not configured" },
        { label: "Countries", value: data.clients.mainCountries.join(", ") },
        { label: "PO Required", value: data.clients.requiresPOReference ? "Yes" : "No" },
      ],
    },
    {
      step: 7,
      title: "Expenses",
      icon: Wallet,
      required: false,
      items: [
        { label: "Tracks Expenses", value: data.expenses.tracksClientExpenses ? "Yes" : "No" },
        { label: "Rebilling", value: data.expenses.enableRebilling ? "Enabled" : "Disabled" },
        { label: "EUR Rebill", value: data.expenses.rebillInEur ? `Yes (+${data.expenses.defaultFxMargin}% margin)` : "No" },
      ],
    },
    {
      step: 8,
      title: "Compliance",
      icon: Shield,
      required: false,
      items: [
        { label: "KSeF", value: data.compliance.ksefEnabled ? "Enabled" : "Disabled" },
        { label: "Audit Log", value: data.compliance.auditLoggingEnabled ? "Enabled" : "Disabled" },
        { label: "Ninja Import", value: data.compliance.offerNinjaImport ? "Yes" : "No" },
      ],
    },
  ]
}

export function StepReview({ data, completedSteps, onGoToStep, validationStatus }: StepReviewProps) {
  const sections = summarize(data)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Review &amp; Launch</h3>
        <p className="mt-1 text-sm text-slate-500">
          Review your settings before launching your Fakturator workspace
        </p>
      </div>

      {/* Validation Status */}
      {!validationStatus.ready && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Some required steps are incomplete</p>
              <p className="mt-1 text-sm text-amber-700">
                Please complete: {validationStatus.missing.join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {validationStatus.ready && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">All set!</p>
              <p className="mt-1 text-sm text-emerald-700">
                All required steps are complete. You&apos;re ready to launch!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Section Summaries */}
      <div className="space-y-3">
        {sections.map((section) => {
          const isComplete = completedSteps.includes(section.step)
          const isMissing = validationStatus.missing.some(
            (m) => m.toLowerCase() === section.title.toLowerCase()
          )

          return (
            <Card
              key={section.step}
              className={isMissing ? "border-amber-200" : ""}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isMissing
                          ? "bg-amber-100 text-amber-600"
                          : isComplete
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isComplete && !isMissing ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <section.icon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{section.title}</p>
                        {section.required && (
                          <Badge variant="secondary" className="text-[10px]">Required</Badge>
                        )}
                        {isMissing && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px]">Incomplete</Badge>
                        )}
                      </div>
                      <div className="mt-1.5 grid gap-x-6 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-2">
                        {section.items.map((item) => (
                          <span key={item.label}>
                            <span className="text-slate-400">{item.label}:</span>{" "}
                            <span
                              className={
                                item.value === "Not set" || item.value === "None" || item.value === "Not configured"
                                  ? "italic text-slate-400"
                                  : "text-slate-600"
                              }
                            >
                              {item.value}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0 text-slate-400 hover:text-indigo-600"
                    onClick={() => onGoToStep(section.step)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
