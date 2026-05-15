import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, FileText, Database } from "lucide-react"
import { getActiveOrg } from "@/lib/server/active-org"
import { getQuotesList } from "@/lib/server/list-data"

export const dynamic = "force-dynamic"

function fc(v: number, currency: string) {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v) }
  catch { return `${currency} ${v.toFixed(2)}` }
}
function fd(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function QuotesPage() {
  const org = await getActiveOrg()
  const rows = await getQuotesList(org.id)
  const totalValue = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotes</h1>
          <p className="text-sm text-slate-600">
            {rows.length} proforma · {fc(totalValue, org.defaultCurrency)} pipeline value
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Database className="h-3 w-3" /> Postgres
            </span>
          </p>
        </div>
        <Link href="/invoices/new?type=PROFORMA" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> New quote
        </Link>
      </header>

      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No quotes yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    <Link href={`/invoices/${q.id}`} className="text-indigo-600 hover:underline">{q.invoiceNumber}</Link>
                  </TableCell>
                  <TableCell>{q.clientName}</TableCell>
                  <TableCell className="text-sm text-slate-600">{fd(q.issueDate)}</TableCell>
                  <TableCell className="text-sm text-slate-600">{fd(q.dueDate)}</TableCell>
                  <TableCell className="text-right font-medium">{fc(q.total, q.currency)}</TableCell>
                  <TableCell><Badge className="bg-slate-100 text-slate-700">{q.status}</Badge></TableCell>
                  <TableCell>
                    {q.externalSource ? (
                      <Badge className="bg-slate-100 text-slate-700">{q.externalSource === "NINJA_INVOICE" ? "Ninja" : q.externalSource}</Badge>
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
