"use client"

import { useState } from "react"
import {
  Upload, FileText, Users, Briefcase, CheckCircle2, AlertCircle,
  ArrowRight, Download, Eye, RefreshCw, Plug, ShieldCheck, XCircle,
  CreditCard, Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clearAllData, initializeStore as initStore } from "@/lib/store/data-store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

interface ImportResult {
  clients: { total: number; imported: number; errors: string[] }
  invoices: { total: number; imported: number; errors: string[] }
  products: { total: number; imported: number; errors: string[] }
  payments: { total: number; imported: number; errors: string[] }
}

interface ImportHistoryEntry {
  id: number
  source: string
  date: string
  records: number
  imported: number
  failed: number
  status: string
}

export default function MigrationPage() {
  // Load saved credentials on mount
  const [apiUrl, setApiUrl] = useState("")
  const [apiToken, setApiToken] = useState("")
  const [testing, setTesting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [connectionError, setConnectionError] = useState("")
  const [credentialsLoaded, setCredentialsLoaded] = useState(false)

  // Load saved Ninja credentials (per user, securely stored)
  useState(() => {
    try {
      const { loadSecureToken } = require("@/lib/auth/auth.store")
      initStore()
      const savedUrl = loadSecureToken("ninja_url")
      const savedToken = loadSecureToken("ninja_token")
      if (savedUrl) setApiUrl(savedUrl)
      if (savedToken) setApiToken(savedToken)
      if (savedUrl && savedToken) setCredentialsLoaded(true)
    } catch {}
  })

  // Import options
  const [importClients, setImportClients] = useState(true)
  const [importInvoices, setImportInvoices] = useState(true)
  const [importProducts, setImportProducts] = useState(true)
  const [importPayments, setImportPayments] = useState(true)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState("")

  // History
  const [history, setHistory] = useState<ImportHistoryEntry[]>([
    { id: 1, source: "Invoice Ninja", date: "2026-03-10", records: 156, imported: 152, failed: 4, status: "COMPLETED" },
    { id: 2, source: "CSV Import", date: "2026-03-12", records: 23, imported: 23, failed: 0, status: "COMPLETED" },
  ])

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionError("")
    setConnected(false)
    setCompanyName("")

    try {
      const res = await fetch("/api/ninja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", apiUrl, apiToken }),
      })
      const data = await res.json()
      if (data.success) {
        setConnected(true)
        // Save credentials per-user (securely encoded)
        try {
          const { saveSecureToken } = require("@/lib/auth/auth.store")
          saveSecureToken("ninja_url", apiUrl)
          saveSecureToken("ninja_token", apiToken)
        } catch {}
        setCompanyName(data.companyName || "Connected")
      } else {
        setConnectionError(data.error || "Connection failed")
      }
    } catch (err: any) {
      setConnectionError(err.message || "Network error")
    } finally {
      setTesting(false)
    }
  }

  const handleStartImport = async () => {
    setImporting(true)
    setImportResult(null)
    setImportError("")

    // Clear existing data before importing to avoid stale currency issues
    clearAllData()
    initStore()

    try {
      // Step 1: Fetch raw data from Ninja via server-side proxy
      const res = await fetch("/api/ninja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetch",
          apiUrl,
          apiToken,
          options: {
            importClients,
            importInvoices,
            importProducts,
            importPayments,
          },
        }),
      })
      const fetchResult = await res.json()
      if (!fetchResult.success || !fetchResult.data) {
        setImportError(fetchResult.error || "Failed to fetch data from Invoice Ninja")
        setImporting(false)
        return
      }

      // Step 2: Import into client-side data store
      const { importNinjaDataToStore } = await import("@/services/ninja/ninja-client-import")
      const importResult = importNinjaDataToStore(fetchResult.data)

      if (importResult) {
        setImportResult(importResult)
        // Add to history
        const totalImported =
          importResult.clients.imported +
          importResult.invoices.imported +
          importResult.products.imported +
          importResult.payments.imported
        const totalErrors =
          importResult.clients.errors.length +
          importResult.invoices.errors.length +
          importResult.products.errors.length +
          importResult.payments.errors.length
        const totalRecords =
          importResult.clients.total +
          importResult.invoices.total +
          importResult.products.total +
          importResult.payments.total
        setHistory((prev) => [
          {
            id: Date.now(),
            source: "Invoice Ninja",
            date: new Date().toISOString().split("T")[0],
            records: totalRecords,
            imported: totalImported,
            failed: totalErrors,
            status: "COMPLETED",
          },
          ...prev,
        ])
      } else {
        setImportError("Import returned no results")
      }
    } catch (err: any) {
      setImportError(err.message || "Network error")
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setConnected(false)
    setCompanyName("")
    setConnectionError("")
    setImportResult(null)
    setImportError("")
    setApiUrl("")
    setApiToken("")
  }

  const handleClearAllData = () => {
    if (confirm("This will delete all imported invoices, clients, and company data. Continue?")) {
      clearAllData()
      initStore()
      setImportResult(null)
      alert("All data cleared. You can now re-import from Ninja.")
    }
  }

  const totalImported = importResult
    ? importResult.clients.imported + importResult.invoices.imported + importResult.products.imported + importResult.payments.imported
    : 0
  const totalErrors = importResult
    ? importResult.clients.errors.length + importResult.invoices.errors.length + importResult.products.errors.length + importResult.payments.errors.length
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Import data from Invoice Ninja or other sources</p>
        </div>
      </div>

      <Tabs defaultValue="ninja" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ninja">Invoice Ninja Import</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        {/* Invoice Ninja Import */}
        <TabsContent value="ninja" className="space-y-6">
          {/* Step 1: Connection */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Plug className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Connect to Invoice Ninja</CardTitle>
                  <CardDescription>Enter your Invoice Ninja API credentials to connect</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">API URL</label>
                  <Input
                    placeholder="https://app.invoiceninja.com"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    disabled={connected || testing}
                  />
                  <p className="text-xs text-slate-400">Your Invoice Ninja instance URL (no trailing slash)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">API Token</label>
                  <Input
                    type="password"
                    placeholder="Your X-API-TOKEN value"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    disabled={connected || testing}
                  />
                  <p className="text-xs text-slate-400">Found in Settings &gt; Account Management &gt; API Tokens</p>
                </div>
              </div>

              {/* Connection status */}
              {connected && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-800">Connected successfully</p>
                    <p className="text-xs text-emerald-600">Company: {companyName}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="text-emerald-600 hover:text-emerald-800">
                    Disconnect
                  </Button>
                </div>
              )}

              {connectionError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Connection failed</p>
                    <p className="text-xs text-red-600">{connectionError}</p>
                  </div>
                </div>
              )}

              {!connected && (
                <Button
                  onClick={handleTestConnection}
                  disabled={!apiUrl || !apiToken || testing}
                  className="gap-2"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <Plug className="h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Import Options (shown after connection) */}
          {connected && !importResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Import Options</CardTitle>
                    <CardDescription>Select what data to import from Invoice Ninja</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      key: "clients",
                      label: "Clients",
                      desc: "Names, NIP, addresses, contacts",
                      icon: Users,
                      checked: importClients,
                      onChange: setImportClients,
                      color: "indigo",
                    },
                    {
                      key: "invoices",
                      label: "Invoices",
                      desc: "Numbers, amounts, dates, line items, statuses",
                      icon: FileText,
                      checked: importInvoices,
                      onChange: setImportInvoices,
                      color: "emerald",
                    },
                    {
                      key: "products",
                      label: "Products / Services",
                      desc: "Names, rates, tax rates",
                      icon: Briefcase,
                      checked: importProducts,
                      onChange: setImportProducts,
                      color: "amber",
                    },
                    {
                      key: "payments",
                      label: "Payments",
                      desc: "Payment records linked to invoices",
                      icon: CreditCard,
                      checked: importPayments,
                      onChange: setImportPayments,
                      color: "violet",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                        item.checked
                          ? `border-${item.color}-200 bg-${item.color}-50/50`
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.onChange(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {!importClients && importInvoices && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-xs text-amber-700">
                      Invoices require clients. Clients will be imported automatically if invoices are selected.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handleStartImport}
                    disabled={importing || (!importClients && !importInvoices && !importProducts && !importPayments)}
                    className="gap-2"
                    size="lg"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        Start Import
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Importing spinner */}
          {importing && (
            <Card>
              <CardContent className="flex flex-col items-center gap-6 py-16">
                <div className="relative">
                  <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900">Importing your data...</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Fetching data from Invoice Ninja and importing into Fakturator. This may take a moment.
                  </p>
                </div>
                <div className="w-64">
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-600 transition-all animate-pulse" style={{ width: "65%" }} />
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-400">Please don&apos;t close this page</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import error */}
          {importError && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900">Import Failed</h3>
                  <p className="mt-2 text-sm text-red-600">{importError}</p>
                </div>
                <Button variant="outline" onClick={() => setImportError("")}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Import Results */}
          {importResult && (
            <Card>
              <CardContent className="space-y-6 py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-slate-900">Import Complete!</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Successfully imported {totalImported} records from Invoice Ninja
                      {totalErrors > 0 && ` with ${totalErrors} error${totalErrors !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    { label: "Clients", data: importResult.clients, icon: Users, color: "indigo" },
                    { label: "Invoices", data: importResult.invoices, icon: FileText, color: "emerald" },
                    { label: "Products", data: importResult.products, icon: Briefcase, color: "amber" },
                    { label: "Payments", data: importResult.payments, icon: CreditCard, color: "violet" },
                  ].map((cat) => (
                    <div key={cat.label} className="rounded-lg border border-slate-200 p-4 text-center">
                      <cat.icon className="mx-auto h-5 w-5 text-slate-400 mb-2" />
                      <p className="text-2xl font-bold text-slate-900">
                        {cat.data.imported}
                        <span className="text-sm font-normal text-slate-400">/{cat.data.total}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{cat.label}</p>
                      {cat.data.errors.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">{cat.data.errors.length} error{cat.data.errors.length !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Error details */}
                {totalErrors > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800 mb-2">Errors encountered during import:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {[
                        ...importResult.clients.errors.map((e) => ({ category: "Client", error: e })),
                        ...importResult.invoices.errors.map((e) => ({ category: "Invoice", error: e })),
                        ...importResult.products.errors.map((e) => ({ category: "Product", error: e })),
                        ...importResult.payments.errors.map((e) => ({ category: "Payment", error: e })),
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>
                            <span className="font-medium">{item.category}:</span> {item.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    Import More
                  </Button>
                  <Button asChild>
                    <a href="/dashboard">Go to Dashboard</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Import History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import History</CardTitle>
              <CardDescription>Past data imports and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Records</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.source}</TableCell>
                      <TableCell className="text-slate-500">{row.date}</TableCell>
                      <TableCell>{row.records}</TableCell>
                      <TableCell className="text-emerald-600 font-medium">{row.imported}</TableCell>
                      <TableCell>
                        {row.failed > 0 ? (
                          <span className="text-red-600 font-medium">{row.failed}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{row.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset data */}
      <div className="border-t border-slate-200 pt-4 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Reset All Data</p>
            <p className="text-xs text-slate-400">Clear all imported invoices, clients, and company data</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleClearAllData}>
            Clear All Data
          </Button>
        </div>
      </div>
    </div>
  )
}
