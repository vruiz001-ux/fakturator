"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, FileText, Plus, TrendingUp, AlertCircle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { getClient, getInvoices, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency, formatDate, formatNIP, getStatusColor, getStatusLabel } from "@/lib/formatters"

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const client = getClient(id)

  if (!client) {
    return (
      <div className="space-y-6">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Building2 className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">Client not found</h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              The client you are looking for does not exist or has been removed.
            </p>
            <Link href="/clients" className="mt-4">
              <Button size="sm" variant="outline">Back to Clients</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const clientInvoices = getInvoices().filter((inv) => inv.clientId === client.id)

  const totalRevenue = clientInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalPaid = clientInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const totalOverdue = clientInvoices
    .filter((inv) => inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.total - inv.paidAmount, 0)

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-lg">
            {client.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
            {client.nip && (
              <p className="text-sm text-slate-500 mt-0.5">NIP: {formatNIP(client.nip)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Client</Button>
          <Link href="/invoices/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Revenue</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Paid</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoices</p>
                <p className="text-lg font-bold text-slate-900">{clientInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Overdue</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.contactPerson && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{client.contactPerson}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-700">{client.phone}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <span className="text-slate-700">
                  {client.address}<br />
                  {client.postalCode} {client.city}, {client.country}
                </span>
              </div>
            )}
            {client.tags.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </>
            )}
            {client.notes && (
              <>
                <Separator />
                <p className="text-sm text-slate-500">{client.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(inv.issueDate)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {clientInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                      No invoices yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
