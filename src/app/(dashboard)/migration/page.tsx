"use client"

import { useState } from "react"
import {
  Upload, FileText, Users, Briefcase, CheckCircle2, AlertCircle,
  ArrowRight, Download, Eye, RefreshCw, Table2, MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete"

const samplePreviewData = [
  { ninjaField: "client_name", fakturatorField: "Client Name", sample: "TechVenture Sp. z o.o.", status: "mapped" },
  { ninjaField: "client_email", fakturatorField: "Client Email", sample: "kontakt@techventure.pl", status: "mapped" },
  { ninjaField: "client_vat_number", fakturatorField: "Client NIP", sample: "5272987654", status: "mapped" },
  { ninjaField: "invoice_number", fakturatorField: "Invoice Number", sample: "INV-0042", status: "mapped" },
  { ninjaField: "invoice_date", fakturatorField: "Issue Date", sample: "2026-01-15", status: "mapped" },
  { ninjaField: "due_date", fakturatorField: "Due Date", sample: "2026-01-29", status: "mapped" },
  { ninjaField: "amount", fakturatorField: "Net Amount", sample: "5000.00", status: "mapped" },
  { ninjaField: "tax_rate", fakturatorField: "VAT Rate", sample: "23", status: "mapped" },
  { ninjaField: "product_key", fakturatorField: "Service Name", sample: "Web Development", status: "mapped" },
  { ninjaField: "custom_field_1", fakturatorField: "—", sample: "Internal ref", status: "unmapped" },
]

const migrationHistory = [
  { id: 1, source: "Ninja Invoice", date: "2026-03-10", records: 156, imported: 152, failed: 4, status: "COMPLETED" },
  { id: 2, source: "CSV Import", date: "2026-03-12", records: 23, imported: 23, failed: 0, status: "COMPLETED" },
]

export default function MigrationPage() {
  const [step, setStep] = useState<ImportStep>("upload")
  const [importing, setImporting] = useState(false)

  const handleStartImport = () => {
    setImporting(true)
    setStep("importing")
    setTimeout(() => {
      setStep("complete")
      setImporting(false)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Import data from Ninja Invoice or other sources</p>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">New Import</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        {/* New Import */}
        <TabsContent value="import" className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2">
            {(["upload", "mapping", "preview", "importing", "complete"] as ImportStep[]).map((s, i) => {
              const labels = ["Upload", "Map Fields", "Preview", "Import", "Done"]
              const icons = [Upload, MapPin, Eye, RefreshCw, CheckCircle2]
              const Icon = icons[i]
              const isActive = s === step
              const isDone = ["upload", "mapping", "preview", "importing", "complete"].indexOf(step) > i

              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />}
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{labels[i]}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Step: Upload */}
          {step === "upload" && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="group cursor-pointer transition-all hover:border-indigo-200 hover:shadow-md" onClick={() => setStep("mapping")}>
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                    <FileText className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Ninja Invoice Export</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload your Ninja Invoice CSV or JSON export
                    </p>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 w-full transition-colors group-hover:border-indigo-300">
                    <Upload className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-2 text-xs text-slate-400">
                      Drop file here or click to browse
                    </p>
                  </div>
                  <Badge variant="secondary">Recommended</Badge>
                </CardContent>
              </Card>

              <Card className="group cursor-pointer transition-all hover:border-slate-300 hover:shadow-md" onClick={() => setStep("mapping")}>
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 transition-colors group-hover:bg-slate-200">
                    <Table2 className="h-8 w-8 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Generic CSV / Excel</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Import from any system using standard file formats
                    </p>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 w-full transition-colors group-hover:border-slate-300">
                    <Upload className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-2 text-xs text-slate-400">
                      Drop file here or click to browse
                    </p>
                  </div>
                  <Badge variant="outline">Custom mapping</Badge>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="p-6">
                  <h4 className="font-medium text-slate-900 mb-3">What gets imported</h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: Users, label: "Clients", desc: "Names, NIP, addresses, contacts" },
                      { icon: FileText, label: "Invoices", desc: "Numbers, amounts, dates, items" },
                      { icon: Briefcase, label: "Products / Services", desc: "Names, rates, units" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                        <item.icon className="h-5 w-5 text-indigo-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step: Mapping */}
          {step === "mapping" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Field Mapping</CardTitle>
                <CardDescription>
                  Match Ninja Invoice fields to Fakturator fields. Most fields are auto-mapped.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Field</TableHead>
                      <TableHead>Fakturator Field</TableHead>
                      <TableHead>Sample Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samplePreviewData.map((row) => (
                      <TableRow key={row.ninjaField}>
                        <TableCell className="font-mono text-xs text-slate-600">{row.ninjaField}</TableCell>
                        <TableCell>
                          <Select defaultValue={row.fakturatorField === "—" ? "skip" : row.fakturatorField}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={row.fakturatorField === "—" ? "skip" : row.fakturatorField}>
                                {row.fakturatorField === "—" ? "Skip" : row.fakturatorField}
                              </SelectItem>
                              <SelectItem value="skip">Skip this field</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{row.sample}</TableCell>
                        <TableCell>
                          {row.status === "mapped" ? (
                            <Badge variant="success" className="text-xs">Mapped</Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs">Unmapped</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                  <Button onClick={() => setStep("preview")}>
                    Preview Import
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Preview</CardTitle>
                <CardDescription>Review what will be imported before confirming</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-indigo-50 p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-600">42</p>
                    <p className="text-sm text-indigo-600">Clients</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-600">156</p>
                    <p className="text-sm text-emerald-600">Invoices</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">18</p>
                    <p className="text-sm text-amber-600">Services</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700">All required fields are mapped</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700">NIP formats validated</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700">No duplicate invoice numbers detected</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-slate-700">1 field was skipped (custom_field_1)</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep("mapping")}>Back to Mapping</Button>
                  <Button onClick={handleStartImport}>
                    Start Import
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-6 py-16">
                <div className="relative">
                  <RefreshCw className="h-12 w-12 text-indigo-600 animate-spin" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900">Importing your data...</h3>
                  <p className="mt-2 text-sm text-slate-500">This may take a moment. Please don&apos;t close this page.</p>
                </div>
                <div className="w-64">
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-600 transition-all animate-pulse" style={{ width: "65%" }} />
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-400">Processing 156 records...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step: Complete */}
          {step === "complete" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-6 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-slate-900">Import Complete!</h3>
                  <p className="mt-2 text-sm text-slate-500">Your Ninja Invoice data has been imported successfully.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">42</p>
                    <p className="text-xs text-emerald-600">Clients imported</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">152</p>
                    <p className="text-xs text-emerald-600">Invoices imported</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">4</p>
                    <p className="text-xs text-amber-600">Skipped (errors)</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("upload")}>Import More</Button>
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
                  {migrationHistory.map((row) => (
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
    </div>
  )
}
