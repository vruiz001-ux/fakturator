import Link from "next/link"
import { ArrowLeft, Users, Mail, Phone, MapPin, Building2, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { getActiveOrg } from "@/lib/server/active-org"
import { getClientDetail } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

const STATUS_COLORS: Record<string, string> = {
  PAID: "#10b981", SENT: "#3b82f6", OVERDUE: "#ef4444", DRAFT: "#94a3b8",
  PARTIALLY_PAID: "#f59e0b", CANCELLED: "#6b7280", CORRECTED: "#8b5cf6",
}

function fc(v: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}
function fd(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const org = await getActiveOrg()
  const client = await getClientDetail(id, org.id)
  const currency = org.defaultCurrency

  if (!client) {
    return (
      <div className="space-y-6 p-6">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to clients
        </Link>
        <Card>
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">Client not found</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
              No client matches this ID in your organization.
            </p>
            <Link href="/clients" className="mt-4">
              <Button size="sm" variant="outline">Back to clients</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const s = client.stats

  return (
    <div className="space-y-6 p-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            {client.isActive
              ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
              : <Badge className="bg-slate-100 text-slate-700">Inactive</Badge>}
            {client.externalSource && (
              <Badge className="bg-slate-100 text-slate-700">
                <Database className="mr-1 h-3 w-3" />
                {client.externalSource === "NINJA_INVOICE" ? "Ninja" : client.externalSource}
              </Badge>
            )}
          </div>
          {client.contactPerson && <p className="mt-1 text-sm text-slate-500">{client.contactPerson}</p>}
        </div>
        <Link href={`/invoices/new?client=${client.id}`}>
          <Button size="sm">New invoice for this client</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Total billed</p>
          <p className="mt-1 text-xl font-bold">{fc(s.totalBilled, currency)}</p>
          <p className="mt-0.5 text-xs text-slate-400">{s.invoiceCount} invoice{s.invoiceCount === 1 ? "" : "s"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{fc(s.totalPaid, currency)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{fc(s.outstanding, currency)}</p>
          {s.overdue > 0 && <p className="mt-0.5 text-xs text-rose-500">{fc(s.overdue, currency)} overdue</p>}
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500">Avg pay-lag</p>
          <p className="mt-1 text-xl font-bold">{s.averageLagDays != null ? `${s.averageLagDays}d` : "—"}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact card */}
        <Card>
          <CardHeader><CardTitle>Contact details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Tax ID (NIP)</p>
                <p className="font-medium text-slate-900">{client.nip || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{client.invoiceEmail || client.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">{client.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Address</p>
                <p className="font-medium text-slate-900">
                  {client.address || "—"}<br />
                  {[client.postalCode, client.city].filter(Boolean).join(" ")}<br />
                  {client.country}
                </p>
              </div>
            </div>
            {client.notes && (
              <div className="rounded-lg bg-slate-50 p-3 text-slate-600">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
                {client.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>All invoices for this client, newest first</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        No invoices for this client yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {client.invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{inv.type}</TableCell>
                      <TableCell className="text-sm text-slate-600">{fd(inv.issueDate)}</TableCell>
                      <TableCell className="text-sm text-slate-600">{fd(inv.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">{fc(inv.total, inv.currency)}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: (STATUS_COLORS[inv.status] || "#94a3b8") + "22", color: STATUS_COLORS[inv.status] || "#475569" }}>
                          {inv.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
