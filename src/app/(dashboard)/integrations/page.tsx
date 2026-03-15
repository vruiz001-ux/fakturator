"use client"

import { useState } from "react"
import {
  Receipt, FileText, ArrowLeftRight, CheckCircle2, Settings, ExternalLink,
  Plug, RefreshCw, Clock, AlertCircle, CreditCard, Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  category: string
  status: "connected" | "available" | "coming_soon"
  lastSync?: string
}

const integrations: Integration[] = [
  {
    id: "expensify",
    name: "Expensify",
    description: "Import expenses automatically. Track billable costs and convert them to invoice line items.",
    icon: Receipt,
    category: "Expenses",
    status: "available",
  },
  {
    id: "ninja_invoice",
    name: "Ninja Invoice",
    description: "Migrate your complete history from Ninja Invoice including clients, invoices, and products.",
    icon: ArrowLeftRight,
    category: "Migration",
    status: "available",
  },
  {
    id: "bank_transfer",
    name: "Bank Feed",
    description: "Auto-match incoming payments to invoices based on reference numbers and amounts.",
    icon: CreditCard,
    category: "Payments",
    status: "coming_soon",
  },
  {
    id: "email",
    name: "Email (SMTP)",
    description: "Send invoices and reminders directly from Fakturator using your own email domain.",
    icon: Mail,
    category: "Communication",
    status: "available",
  },
  {
    id: "ksef_api",
    name: "KSeF Direct API",
    description: "Submit invoices directly to the Polish National e-Invoice System. Full compliance automation.",
    icon: FileText,
    category: "Compliance",
    status: "coming_soon",
  },
]

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return <Badge variant="success">Connected</Badge>
    case "available":
      return <Badge variant="secondary">Available</Badge>
    case "coming_soon":
      return <Badge variant="outline">Coming Soon</Badge>
    default:
      return null
  }
}

export default function IntegrationsPage() {
  const [configDialog, setConfigDialog] = useState<string | null>(null)
  const selectedIntegration = integrations.find((i) => i.id === configDialog)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">
          Connect external services to automate your workflow
        </p>
      </div>

      {/* Connected */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Active Integrations</h3>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <Plug className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No integrations connected yet</p>
          <p className="text-xs text-slate-400 mt-1">Connect Expensify or Ninja Invoice to get started</p>
        </div>
      </div>

      {/* Available Integrations */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Available Integrations</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                    <integration.icon className="h-6 w-6" />
                  </div>
                  <StatusBadge status={integration.status} />
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold text-slate-900">{integration.name}</h4>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    {integration.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{integration.category}</Badge>
                  {integration.status === "available" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfigDialog(integration.id)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configure
                    </Button>
                  ) : integration.status === "connected" ? (
                    <Button size="sm" variant="ghost">
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">Coming soon</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && <selectedIntegration.icon className="h-5 w-5 text-indigo-600" />}
              Connect {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.id === "expensify" && (
                "Connect your Expensify account to import expenses and enable automatic rebilling."
              )}
              {selectedIntegration?.id === "ninja_invoice" && (
                "Connect to Ninja Invoice to import your data. You can also use the Migration page for file uploads."
              )}
              {selectedIntegration?.id === "email" && (
                "Configure your SMTP server to send invoices and reminders from your own domain."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedIntegration?.id === "expensify" && (
              <>
                <div className="space-y-2">
                  <Label>Expensify Partner User ID</Label>
                  <Input placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Expensify Partner User Secret</Label>
                  <Input type="password" placeholder="Enter your API secret" />
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Auto-import expenses</p>
                      <p className="text-xs text-slate-500">Sync expenses every hour</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Auto-assign to clients</p>
                      <p className="text-xs text-slate-500">Match expenses by project tag</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Mark as billable by default</p>
                      <p className="text-xs text-slate-500">New imported expenses are billable</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </>
            )}

            {selectedIntegration?.id === "ninja_invoice" && (
              <>
                <div className="rounded-lg bg-indigo-50 p-4">
                  <p className="text-sm text-indigo-700">
                    For the best migration experience, use the{" "}
                    <a href="/migration" className="font-medium underline">Migration Wizard</a>{" "}
                    which provides field mapping, preview, and validation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Ninja Invoice API URL (optional)</Label>
                  <Input placeholder="https://your-instance.invoicing.co/api/v1" />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input type="password" placeholder="Enter your Ninja Invoice API token" />
                </div>
              </>
            )}

            {selectedIntegration?.id === "email" && (
              <>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input placeholder="587" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input placeholder="you@company.pl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="App password" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input placeholder="Fakturator - Your Company" />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>Cancel</Button>
            <Button onClick={() => setConfigDialog(null)}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
