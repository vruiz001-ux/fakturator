"use client"

import { useState } from "react"
import { Building2, CreditCard, Shield, Bell, Palette, Globe, Mail, DollarSign, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="tax">Tax & VAT</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          <TabsTrigger value="delivery">Email Delivery</TabsTrigger>
          <TabsTrigger value="fx">FX & Rebilling</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Company Profile
              </CardTitle>
              <CardDescription>Your company information appears on all invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="Fakturator Sp. z o.o." />
                </div>
                <div className="space-y-2">
                  <Label>NIP (Tax ID)</Label>
                  <Input defaultValue="527-298-76-54" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue="kontakt@fakturator.pl" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+48 22 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input defaultValue="ul. Nowy Świat 35" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input defaultValue="Warszawa" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input defaultValue="00-029" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input defaultValue="Poland" disabled />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input defaultValue="mBank S.A." />
                </div>
                <div className="space-y-2">
                  <Label>Bank Account (IBAN)</Label>
                  <Input defaultValue="PL 12 1140 2004 0000 3102 7890 1234" />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input defaultValue="https://fakturator.pl" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Tax & VAT Settings
              </CardTitle>
              <CardDescription>Configure VAT rates and tax preferences for Poland</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default VAT Rate</Label>
                  <Select defaultValue="23">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="23">23% (Standard)</SelectItem>
                      <SelectItem value="8">8% (Reduced)</SelectItem>
                      <SelectItem value="5">5% (Reduced)</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-slate-900 mb-3">Active VAT Rates</h4>
                <div className="space-y-2">
                  {[
                    { rate: "23%", label: "Standard rate", active: true },
                    { rate: "8%", label: "Reduced rate (food, construction)", active: true },
                    { rate: "5%", label: "Reduced rate (books, periodicals)", active: true },
                    { rate: "0%", label: "Zero rate (exports)", active: true },
                    { rate: "zw.", label: "Exempt from VAT", active: false },
                    { rate: "np.", label: "Not applicable", active: false },
                  ].map((vat) => (
                    <div key={vat.rate} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                      <div>
                        <span className="font-medium text-slate-900">{vat.rate}</span>
                        <span className="ml-2 text-sm text-slate-500">{vat.label}</span>
                      </div>
                      <Switch defaultChecked={vat.active} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Tax Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoicing Settings */}
        <TabsContent value="invoicing">
          <Card>
            <CardHeader>
              <CardTitle>Invoicing Defaults</CardTitle>
              <CardDescription>Default values for new invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select defaultValue="PLN">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Payment Terms (days)</Label>
                  <Input type="number" defaultValue="14" />
                </div>
                <div className="space-y-2">
                  <Label>Default Payment Method</Label>
                  <Select defaultValue="BANK_TRANSFER">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="ONLINE">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number Format</Label>
                  <Input defaultValue="FV/{YYYY}/{MM}/{NNN}" />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Features</h4>
                {[
                  { label: "Auto-generate invoice numbers", enabled: true },
                  { label: "Include QR code on invoice PDF", enabled: false },
                  { label: "Send automatic payment reminders", enabled: true },
                  { label: "Enable recurring invoices", enabled: true },
                ].map((feat) => (
                  <div key={feat.label} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <span className="text-sm text-slate-700">{feat.label}</span>
                    <Switch defaultChecked={feat.enabled} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Delivery Settings */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-600" />
                Invoice Email Delivery
              </CardTitle>
              <CardDescription>Configure automatic invoice forwarding by email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-send on validation</p>
                    <p className="text-xs text-slate-500">Automatically email invoices when they are issued and validated</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Attach PDF</p>
                    <p className="text-xs text-slate-500">Include invoice PDF as an email attachment</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Default Internal Recipients</h4>
                <div className="space-y-2">
                  <Label>Internal CC (finance team)</Label>
                  <Input placeholder="finance@company.pl, accounting@company.pl" defaultValue="finance@fakturator.pl" />
                  <p className="text-xs text-slate-400">Comma-separated. These will be CC&apos;d on all outgoing invoices.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Email Template</h4>
                <div className="space-y-2">
                  <Label>Subject line template</Label>
                  <Input defaultValue="Invoice {invoiceNumber} from {companyName}" />
                  <p className="text-xs text-slate-400">Variables: {"{invoiceNumber}"}, {"{companyName}"}, {"{total}"}, {"{clientName}"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Sender name</Label>
                  <Input defaultValue="Fakturator" />
                </div>
                <div className="space-y-2">
                  <Label>Reply-to email</Label>
                  <Input defaultValue="kontakt@fakturator.pl" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Delivery Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FX & Rebilling */}
        <TabsContent value="fx">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-600" />
                Foreign Currency & Rebilling
              </CardTitle>
              <CardDescription>Configure FX conversion and expense rebilling margins</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-indigo-50 p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">How FX rebilling works</p>
                    <p className="mt-1 text-sm text-indigo-700">
                      Foreign-currency expenses are converted to EUR and a configurable uplift (default 5%)
                      is added to cover FX conversion costs and bank charges before rebilling to clients.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default rebilling currency</Label>
                  <Select defaultValue="EUR">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default FX uplift</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="5" className="w-24" min={0} max={50} step={0.5} />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                  <p className="text-xs text-slate-400">Applied to cover FX conversion costs and bank charges</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Automation</h4>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-apply FX uplift</p>
                    <p className="text-xs text-slate-500">Automatically add the uplift when converting foreign expenses</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Lock conversion on invoice creation</p>
                    <p className="text-xs text-slate-500">Prevent recalculation once an expense is added to an invoice draft</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-detect foreign currency expenses</p>
                    <p className="text-xs text-slate-500">Flag expenses in non-PLN currencies automatically</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Exchange Rate Source</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "mock", label: "Mock Rates", desc: "For development", active: true },
                    { id: "manual", label: "Manual Entry", desc: "Enter rates manually", active: false },
                    { id: "ecb", label: "ECB Live", desc: "European Central Bank", active: false },
                  ].map((source) => (
                    <button
                      key={source.id}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        source.active
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">{source.label}</p>
                      <p className="text-xs text-slate-500">{source.desc}</p>
                      {source.active && <p className="text-xs text-indigo-600 mt-1 font-medium">Active</p>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save FX Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                Notifications
              </CardTitle>
              <CardDescription>Configure when and how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Payment received", desc: "When a client pays an invoice", enabled: true },
                { label: "Invoice overdue", desc: "When an invoice passes its due date", enabled: true },
                { label: "New payment reminder sent", desc: "When an automatic reminder is sent", enabled: true },
                { label: "KSeF submission status", desc: "When a KSeF submission status changes", enabled: true },
                { label: "Weekly summary", desc: "Receive a weekly business summary email", enabled: false },
                { label: "Monthly report", desc: "Receive monthly financial report", enabled: true },
              ].map((notif) => (
                <div key={notif.label} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{notif.label}</p>
                    <p className="text-xs text-slate-500">{notif.desc}</p>
                  </div>
                  <Switch defaultChecked={notif.enabled} />
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-600" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {["Light", "Dark", "System"].map((theme) => (
                    <button
                      key={theme}
                      className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                        theme === "Light"
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pl">Polski (coming soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button>Save Appearance</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
