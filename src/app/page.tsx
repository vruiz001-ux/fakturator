"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Zap, FileText, BarChart3, Receipt, ArrowLeftRight,
  ArrowRight, CheckCircle2, Sparkles, Shield, Building2,
  CreditCard, Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KrsLookup } from "@/components/onboarding/krs-lookup"
import { updateStepData, markStepComplete, setCurrentStep, loadOnboarding } from "@/lib/onboarding/onboarding.store"
import type { CompanySetup, BillingSetup } from "@/lib/onboarding/onboarding.types"
import type { CompanySourceMetadata } from "@/services/krs/krs.types"

const features = [
  {
    icon: FileText,
    title: "Smart Invoicing",
    description: "AI-powered invoice creation with Polish compliance. Auto-fill, VAT calculations, and PDF generation built in.",
  },
  {
    icon: Receipt,
    title: "Expense Recovery",
    description: "Track and rebill expenses to clients automatically. Never lose money on project costs again.",
  },
  {
    icon: ArrowLeftRight,
    title: "Easy Migration",
    description: "Switch from Ninja Invoice in minutes. Clients, invoices, and settings migrate seamlessly.",
  },
  {
    icon: BarChart3,
    title: "Business Intelligence",
    description: "Real-time dashboard with revenue, expenses, and actionable KPIs per client and service.",
  },
]

const previews = [
  {
    icon: BarChart3,
    title: "Dashboard Analytics",
    description: "Revenue trends, outstanding invoices, and cash flow forecasts updated in real time.",
  },
  {
    icon: FileText,
    title: "Invoice Management",
    description: "Create, send, and track invoices with automatic VAT handling and KSeF submission.",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    description: "Capture costs, assign to projects, and generate rebilling invoices with one click.",
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [companyData, setCompanyData] = useState<Partial<CompanySetup>>({})
  const [billingData, setBillingData] = useState<Partial<BillingSetup>>({})
  const [sourceMetadata, setSourceMetadata] = useState<CompanySourceMetadata | null>(null)

  const handleCompanySelected = useCallback(
    (company: Partial<CompanySetup>, billing: Partial<BillingSetup>, metadata: CompanySourceMetadata, filledFields: string[]) => {
      setCompanyData(company)
      setBillingData(billing)
      setSourceMetadata(metadata)
    },
    [],
  )

  const handleContinue = () => {
    loadOnboarding()
    if (companyData.legalName) {
      updateStepData("company", companyData)
    }
    if (billingData.nip || billingData.address) {
      updateStepData("billing", billingData)
    }
    markStepComplete(0)
    if (companyData.legalName) markStepComplete(1)
    if (billingData.address && billingData.nip) {
      markStepComplete(2)
      setCurrentStep(3)
    } else {
      setCurrentStep(1)
    }
    router.push("/onboarding")
  }

  const hasCompany = !!companyData.legalName

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Fakturator</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
              Sign in
            </Link>
            <Button onClick={() => router.push("/onboarding")} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          {/* Left — copy */}
          <div>
            <Badge variant="secondary" className="mb-5 gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Business Console for Poland
            </Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Set up your business{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                in 60 seconds
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Enter your NIP and we&apos;ll import your company details from the official Polish registry. Start invoicing today.
            </p>
            <div className="mt-8 flex flex-wrap gap-5">
              {[
                { icon: Shield, label: "Real KRS & NIP data" },
                { icon: Globe, label: "PLN + EUR support" },
                { icon: CheckCircle2, label: "KSeF-ready" },
              ].map((tp) => (
                <div key={tp.label} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <tp.icon className="h-4 w-4 text-indigo-500" />
                  {tp.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — onboarding panel */}
          <Card className="border border-slate-200 shadow-lg shadow-slate-200/60">
            <CardContent className="space-y-5 p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Start your company setup</h2>
                <p className="mt-1 text-sm text-slate-500">Search by NIP, company name, or KRS number</p>
              </div>

              <KrsLookup
                onCompanySelected={handleCompanySelected}
                currentSourceMetadata={sourceMetadata ?? undefined}
                onClear={() => {
                  setCompanyData({})
                  setBillingData({})
                  setSourceMetadata(null)
                }}
              />

              {hasCompany && (
                <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                    <Building2 className="h-4 w-4" />
                    Company details imported
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-slate-500">Legal name</Label>
                      <Input value={companyData.legalName ?? ""} readOnly className="mt-1 bg-white text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">NIP</Label>
                      <Input value={billingData.nip ?? ""} readOnly className="mt-1 bg-white text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-slate-500">Address</Label>
                      <Input
                        value={[billingData.address, billingData.postalCode, billingData.city].filter(Boolean).join(", ")}
                        readOnly
                        className="mt-1 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleContinue} className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg">
                Continue Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-slate-400">
                or{" "}
                <Link href="/onboarding" className="font-medium text-indigo-600 hover:text-indigo-700">
                  enter details manually
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to run your business</h2>
            <p className="mt-3 text-lg text-slate-500">AI invoicing, expense recovery, easy migration, and smart analytics.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">See your business at a glance</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-lg text-slate-500">
            One dashboard, every metric. Track performance across invoices, expenses, and clients.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {previews.map((p) => (
              <Card key={p.title} className="border-slate-100 bg-white">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Ready to take control?</h2>
          <p className="mt-4 text-lg text-slate-500">
            Join businesses across Poland using Fakturator to invoice smarter and grow with confidence.
          </p>
          <Button onClick={() => router.push("/onboarding")} size="lg" className="mt-8 bg-indigo-600 hover:bg-indigo-700">
            Start Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Fakturator</span>
          </div>
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Fakturator. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
