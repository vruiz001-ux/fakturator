import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Repeat, Database, CheckCircle2, PauseCircle } from "lucide-react"
import { getActiveOrg } from "@/lib/server/active-org"
import { getRecurringList } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

function fc(v: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}
function fd(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function RecurringPage() {
  const org = await getActiveOrg()
  const rows = await getRecurringList(org.id)
  const monthlyEquivalent = rows
    .filter(r => r.isActive)
    .reduce((s, r) => {
      const factor = r.frequency === "MONTHLY" ? 1 : r.frequency === "QUARTERLY" ? 1 / 3 : 1 / 12
      return s + r.total * factor
    }, 0)
  const activeCount = rows.filter(r => r.isActive).length

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recurring invoices</h1>
          <p className="text-sm text-slate-600">
            {activeCount} active · {fc(monthlyEquivalent, org.defaultCurrency)} monthly equivalent
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <Link href="/invoices/new?recurring=true" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New rule
        </Link>
      </header>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    <Repeat className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No recurring rules yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.templateNumber || `Rule ${r.id.slice(-6)}`}</TableCell>
                  <TableCell>{r.clientName}</TableCell>
                  <TableCell>
                    <Badge className="bg-indigo-100 text-indigo-700">{r.frequency}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{fd(r.nextRunDate)}</TableCell>
                  <TableCell className="text-right font-medium">{fc(r.total, r.currency)}</TableCell>
                  <TableCell>
                    {r.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700">
                        <PauseCircle className="mr-1 h-3 w-3" /> Paused
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.externalSource ? (
                      <Badge className="bg-slate-100 text-slate-700">{r.externalSource === "NINJA_INVOICE" ? "Ninja" : r.externalSource}</Badge>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
