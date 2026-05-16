import Link from "next/link"
import { Shield, CheckCircle2, AlertTriangle, Clock, XCircle, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { getActiveOrg } from "@/lib/server/active-org"
import { getKsefOverview } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

function fc(v: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}
function fd(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

const KSEF_BADGE: Record<string, { label: string; cls: string }> = {
  ACCEPTED: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
  ERROR: { label: "Error", cls: "bg-rose-100 text-rose-700" },
  PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  SUBMITTED: { label: "Submitted", cls: "bg-sky-100 text-sky-700" },
  VALIDATED: { label: "Validated", cls: "bg-indigo-100 text-indigo-700" },
}

export default async function KsefPage() {
  const org = await getActiveOrg()
  const { rows, counts } = await getKsefOverview(org.id)

  return (
    <div className="space-y-6 p-6">
      <header>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">KSeF Center</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Poland's National e-Invoicing System · {org.name}
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Database className="h-3 w-3" /> Postgres
          </span>
        </p>
      </header>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-slate-500"><Clock className="h-4 w-4" /><span className="text-xs">Not submitted</span></div>
          <p className="mt-1 text-2xl font-bold">{counts.notSubmitted}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-amber-600"><Clock className="h-4 w-4" /><span className="text-xs">In progress</span></div>
          <p className="mt-1 text-2xl font-bold">{counts.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Accepted</span></div>
          <p className="mt-1 text-2xl font-bold">{counts.accepted}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-rose-600"><XCircle className="h-4 w-4" /><span className="text-xs">Rejected</span></div>
          <p className="mt-1 text-2xl font-bold">{counts.rejected}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-2 text-rose-600"><AlertTriangle className="h-4 w-4" /><span className="text-xs">Error</span></div>
          <p className="mt-1 text-2xl font-bold">{counts.error}</p>
        </CardContent></Card>
      </div>

      {/* Info banner */}
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div className="text-sm text-indigo-900">
            <p className="font-medium">KSeF mandatory from 2026</p>
            <p className="mt-0.5 text-indigo-800">
              Open any invoice and run the <strong>KSeF Copilot</strong> in the agent panel for a pre-submit validation,
              rejection-probability score, and plain-Polish explainer. Production submission requires a NIP certificate (Phase 3).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoice list */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>KSeF status per invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>KSeF status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(r => {
                  const badge = r.ksefStatus ? KSEF_BADGE[r.ksefStatus] : null
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${r.id}`} className="text-indigo-600 hover:underline">
                          {r.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{r.clientName}</TableCell>
                      <TableCell className="text-sm text-slate-600">{fd(r.issueDate)}</TableCell>
                      <TableCell className="text-right font-medium">{fc(r.total, r.currency)}</TableCell>
                      <TableCell>
                        {badge
                          ? <Badge className={badge.cls}>{badge.label}</Badge>
                          : <Badge className="bg-slate-100 text-slate-600">Not submitted</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {r.ksefReferenceId || "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
