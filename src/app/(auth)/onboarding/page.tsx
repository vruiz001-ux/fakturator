"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Zap, ArrowRight, ArrowLeft, Building2, CreditCard, FileText,
  Briefcase, Users, Receipt, CheckCircle2, Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const STEPS = [
  { id: 1, title: "Company Info", icon: Building2, description: "Legal details & address" },
  { id: 2, title: "Tax & Banking", icon: CreditCard, description: "VAT, NIP & bank account" },
  { id: 3, title: "Invoicing", icon: FileText, description: "Numbering & payment terms" },
  { id: 4, title: "Services", icon: Briefcase, description: "What you sell" },
  { id: 5, title: "Expenses", icon: Receipt, description: "Rebilling setup" },
  { id: 6, title: "Migration", icon: Upload, description: "Import from Ninja Invoice" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const handleFinish = () => {
    setLoading(true)
    setTimeout(() => router.push("/dashboard"), 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set up your Fakturator workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Step {step} of {STEPS.length} — {STEPS[step - 1].description}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                s.id === step
                  ? "bg-indigo-600 text-white shadow-sm"
                  : s.id < step
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {s.id < step ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <s.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-xl animate-fade-in">
          <CardContent className="p-8">
            {/* Step 1: Company Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription className="mt-1">
                    Your legal company details — these appear on every invoice
                  </CardDescription>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Company Name *</Label>
                    <Input placeholder="Acme Sp. z o.o." />
                  </div>
                  <div className="space-y-2">
                    <Label>Legal Form</Label>
                    <Select defaultValue="sp_zoo">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sp_zoo">Sp. z o.o.</SelectItem>
                        <SelectItem value="sa">S.A.</SelectItem>
                        <SelectItem value="jdg">JDG (Sole Proprietorship)</SelectItem>
                        <SelectItem value="sp_j">Sp. jawna</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input defaultValue="Poland" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Street Address *</Label>
                    <Input placeholder="ul. Marszałkowska 100" />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input placeholder="Warszawa" />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code *</Label>
                    <Input placeholder="00-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input placeholder="+48 22 123 4567" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="biuro@company.pl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input placeholder="https://company.pl" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Tax & Banking */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <CardTitle>Tax & Banking Details</CardTitle>
                  <CardDescription className="mt-1">
                    VAT registration, NIP, and bank account for invoices
                  </CardDescription>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>NIP (Tax ID) *</Label>
                    <Input placeholder="123-456-78-90" />
                    <p className="text-xs text-slate-400">10-digit Polish tax identification number</p>
                  </div>
                  <div className="space-y-2">
                    <Label>REGON</Label>
                    <Input placeholder="123456789" />
                  </div>
                  <div className="space-y-2">
                    <Label>Default VAT Rate</Label>
                    <Select defaultValue="23">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="23">23% (Standard)</SelectItem>
                        <SelectItem value="8">8% (Reduced)</SelectItem>
                        <SelectItem value="5">5% (Reduced)</SelectItem>
                        <SelectItem value="0">0% (Zero rate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Registered?</Label>
                    <div className="flex items-center gap-3 pt-2">
                      <Switch defaultChecked />
                      <span className="text-sm text-slate-600">Yes, I&apos;m a VAT payer</span>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bank Name *</Label>
                    <Input placeholder="mBank S.A." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Bank Account (IBAN) *</Label>
                    <Input placeholder="PL 12 1140 2004 0000 3102 7890 1234" />
                  </div>
                  <div className="space-y-2">
                    <Label>SWIFT/BIC</Label>
                    <Input placeholder="BREXPLPWXXX" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Invoicing */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <CardTitle>Invoicing Preferences</CardTitle>
                  <CardDescription className="mt-1">
                    Number format, payment terms, and default currency
                  </CardDescription>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Invoice Number Format</Label>
                    <Input defaultValue="FV/{YYYY}/{MM}/{NNN}" />
                    <p className="text-xs text-slate-400">FV = faktura VAT, PRO = proforma, KOR = correction</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Next Invoice Number</Label>
                    <Input defaultValue="001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Select defaultValue="PLN">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Currency</Label>
                    <Select defaultValue="EUR">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Payment Terms</Label>
                    <Select defaultValue="14">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="21">21 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="45">45 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Payment Method</Label>
                    <Select defaultValue="BANK_TRANSFER">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="ONLINE">Online Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Services */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <CardTitle>Services You Offer</CardTitle>
                  <CardDescription className="mt-1">
                    Add the services you invoice for — you can always add more later
                  </CardDescription>
                </div>
                <div className="space-y-4">
                  {["Web Development", "Consulting", "Design"].map((svc, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs">Service Name</Label>
                          <Input defaultValue={i < 1 ? svc : ""} placeholder={svc} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Default Rate</Label>
                          <Input type="number" placeholder="200" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Unit</Label>
                          <Select defaultValue="HOUR">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HOUR">Hour</SelectItem>
                              <SelectItem value="DAY">Day</SelectItem>
                              <SelectItem value="PROJECT">Project</SelectItem>
                              <SelectItem value="MONTH">Month</SelectItem>
                              <SelectItem value="PIECE">Piece</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    + Add another service
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Expense Rebilling */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <CardTitle>Expense Recovery & Rebilling</CardTitle>
                  <CardDescription className="mt-1">
                    Configure how you track and rebill expenses to clients
                  </CardDescription>
                </div>
                <div className="rounded-lg bg-indigo-50 p-4">
                  <div className="flex items-start gap-3">
                    <Receipt className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-indigo-900">What is expense rebilling?</p>
                      <p className="mt-1 text-sm text-indigo-700">
                        When you incur expenses on behalf of a client (travel, software, materials),
                        Fakturator lets you track them, assign them to clients, and automatically
                        convert them into invoice line items — with optional markup.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Enable expense rebilling</p>
                      <p className="text-xs text-slate-500">Track billable expenses and add them to invoices</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Default markup on rebilled expenses</p>
                      <p className="text-xs text-slate-500">Percentage added on top of expense cost</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="0" className="w-20 text-right" />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Auto-assign expenses by client tag</p>
                      <p className="text-xs text-slate-500">Match expenses to clients based on tags or vendor</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Connect Expensify</p>
                      <p className="text-xs text-slate-500">Import expenses automatically from Expensify</p>
                    </div>
                    <Button variant="outline" size="sm">Connect Later</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Migration */}
            {step === 6 && (
              <div className="space-y-6">
                <div>
                  <CardTitle>Import from Ninja Invoice</CardTitle>
                  <CardDescription className="mt-1">
                    Bring your existing invoices, clients, and products into Fakturator
                  </CardDescription>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <button className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-all hover:border-indigo-300 hover:bg-indigo-50/50">
                    <Upload className="h-10 w-10 text-indigo-500" />
                    <div>
                      <p className="font-medium text-slate-900">Import from Ninja Invoice</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Upload your CSV or JSON export file
                      </p>
                    </div>
                  </button>
                  <button className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition-all hover:border-slate-300 hover:bg-slate-50">
                    <FileText className="h-10 w-10 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">Import CSV / Excel</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Import from any other source
                      </p>
                    </div>
                  </button>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    <strong>What gets imported:</strong> Clients, invoices, products/services,
                    payment history, and invoice numbering. You&apos;ll preview and map fields
                    before anything is imported.
                  </p>
                </div>

                <Button variant="ghost" className="w-full text-slate-400" onClick={handleFinish}>
                  Skip — I&apos;ll start fresh
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              <Button
                variant="ghost"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {step < STEPS.length ? (
                <Button onClick={() => setStep(step + 1)}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} loading={loading}>
                  Launch Fakturator
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
