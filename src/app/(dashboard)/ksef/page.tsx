"use client"

import { useState, useEffect } from "react"
import { Shield, CheckCircle2, AlertTriangle, XCircle, Clock, FileText, Upload, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { getInvoices, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency, formatDate } from "@/lib/formatters"

function getKsefStatusBadge(status: string) {
  switch (status) {
    case "ACCEPTED": return <Badge variant="success">Accepted</Badge>
    case "SUBMITTED": return <Badge variant="warning">Submitted</Badge>
    case "PENDING": return <Badge variant="secondary">Pending</Badge>
    case "REJECTED": return <Badge variant="destructive">Rejected</Badge>
    case "ERROR": return <Badge variant="destructive">Error</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

export default function KsefPage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const invoices = getInvoices()

  // Invoices that have been submitted to KSeF
  const submittedInvoices = invoices.filter((inv) => inv.ksefReferenceId)
  const acceptedCount = submittedInvoices.filter((inv) => inv.ksefStatus === "ACCEPTED").length
  const pendingCount = submittedInvoices.filter((inv) => inv.ksefStatus === "SUBMITTED" || inv.ksefStatus === "PENDING").length
  const rejectedCount = submittedInvoices.filter((inv) => inv.ksefStatus === "REJECTED" || inv.ksefStatus === "ERROR").length
  const notSubmittedCount = invoices.filter((inv) => !inv.ksefReferenceId && (inv.status === "PAID" || inv.status === "SENT")).length

  // Invoices ready for submission (paid or sent, not yet submitted)
  const pendingInvoices = invoices.filter(
    (inv) => (inv.status === "PAID" || inv.status === "SENT") && !inv.ksefReferenceId
  )

  if (invoices.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Shield className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">No invoices submitted to KSeF yet</h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              Create and send invoices first, then submit them to KSeF for compliance.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Accepted</p>
              <p className="text-2xl font-bold text-slate-900">{acceptedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-900">{rejectedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Not Submitted</p>
              <p className="text-2xl font-bold text-slate-900">{notSubmittedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Submission History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              KSeF Submission History
            </CardTitle>
            <CardDescription>Track the status of invoices submitted to KSeF</CardDescription>
          </CardHeader>
          <CardContent>
            {submittedInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>KSeF Reference</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submittedInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium text-indigo-600">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{inv.ksefReferenceId}</TableCell>
                    <TableCell className="text-slate-500">{inv.ksefSubmittedAt ? formatDate(inv.ksefSubmittedAt) : "--"}</TableCell>
                    <TableCell>{getKsefStatusBadge(inv.ksefStatus || "PENDING")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            ) : (
              <p className="text-center text-sm text-slate-400 py-8">No invoices submitted to KSeF yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Validation Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Validation</CardTitle>
            <CardDescription>KSeF compliance checks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-slate-400 py-8">
              Select an invoice to run validation checks.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ready for Submission */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Ready for Submission</CardTitle>
              <CardDescription>Invoices that can be submitted to KSeF</CardDescription>
            </div>
            <Button disabled={pendingInvoices.length === 0}>
              <Upload className="h-4 w-4" />
              Submit Selected
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingInvoices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="rounded border-slate-300" />
                </TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <input type="checkbox" className="rounded border-slate-300" />
                  </TableCell>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell className="text-slate-600">{inv.client?.name}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(inv.total)}</TableCell>
                  <TableCell className="text-slate-500">{formatDate(inv.issueDate)}</TableCell>
                  <TableCell>
                    <Badge variant="success" className="text-xs">Valid</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Submit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
            <p className="text-center text-sm text-slate-400 py-8">No invoices ready for submission.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
