"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, CheckCircle2, AlertTriangle, Loader2, Plug, Database, Undo2 } from "lucide-react"
import {
  runNinjaImportAction, testNinjaConnectionAction, rollbackImportAction,
  type MigrationHistoryItem,
} from "@/lib/server/migration-actions"
import type { ImportResult } from "@/services/ninja/ninja-importer"

function fd(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const STATUS_CLS: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  COMPLETED_WITH_ERRORS: "bg-amber-100 text-amber-700",
  FAILED: "bg-rose-100 text-rose-700",
  PROCESSING: "bg-sky-100 text-sky-700",
  PENDING: "bg-slate-100 text-slate-700",
}

export function MigrationView({ history }: { history: MigrationHistoryItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [conn, setConn] = useState<{ ok: boolean; msg: string } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rollbackMsg, setRollbackMsg] = useState<string | null>(null)
  const [confirmRollback, setConfirmRollback] = useState(false)

  function doRollback() {
    setError(null); setRollbackMsg(null)
    startTransition(async () => {
      const r = await rollbackImportAction("NINJA_INVOICE")
      if (!r.ok) { setError(r.error); return }
      const rm = r.removed
      setRollbackMsg(`Rolled back: ${rm.invoices} invoices, ${rm.clients} clients, ${rm.services} services, ${rm.recurring} recurring rules removed.`)
      setConfirmRollback(false)
      setResult(null)
      router.refresh()
    })
  }

  function testConnection() {
    setConn(null); setError(null)
    startTransition(async () => {
      const r = await testNinjaConnectionAction()
      setConn(r.ok ? { ok: true, msg: `Connected to ${r.companyName}` } : { ok: false, msg: r.error })
    })
  }

  function runImport() {
    setError(null); setResult(null)
    startTransition(async () => {
      const r = await runNinjaImportAction()
      if (!r.ok) { setError(r.error); return }
      setResult(r.result)
      router.refresh()
    })
  }

  const entityRows = result ? [
    ["Clients", result.clients],
    ["Products → Services", result.products],
    ["Invoices", result.invoices],
    ["Quotes → Proforma", result.quotes],
    ["Recurring rules", result.recurring],
    ["Payments", result.payments],
  ] as const : []

  return (
    <div className="space-y-6 p-6">
      <header>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-indigo-600" />
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Migration</h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">Import your data from Invoice Ninja into Fakturator</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Ninja</CardTitle>
          <CardDescription>
            Pulls clients, products, invoices, quotes, recurring rules, and payments. Idempotent — safe to re-run.
            Manual status changes are preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={testConnection} disabled={isPending}>
              <Plug className="mr-1 h-4 w-4" /> Test connection
            </Button>
            <Button size="sm" onClick={runImport} disabled={isPending}>
              {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Database className="mr-1 h-4 w-4" />}
              {isPending ? "Importing..." : "Run import"}
            </Button>
            {!confirmRollback ? (
              <Button size="sm" variant="outline" onClick={() => setConfirmRollback(true)} disabled={isPending}>
                <Undo2 className="mr-1 h-4 w-4" /> Roll back import
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5">
                <span className="text-xs text-rose-700">Delete all Ninja-imported data?</span>
                <Button size="sm" variant="outline" onClick={() => setConfirmRollback(false)} disabled={isPending}>Cancel</Button>
                <Button size="sm" onClick={doRollback} disabled={isPending} className="bg-rose-600 hover:bg-rose-700">
                  Confirm
                </Button>
              </div>
            )}
          </div>

          {conn && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${conn.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {conn.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {conn.msg}
            </div>
          )}

          {rollbackMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              <Undo2 className="h-4 w-4" /> {rollbackMsg}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Import complete in {result.durationMs}ms — {result.organizationName}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-2 text-left">Entity</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">New</th>
                    <th className="px-4 py-2 text-right">Updated</th>
                    <th className="px-4 py-2 text-right">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {entityRows.map(([label, r]) => (
                    <tr key={label} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{label}</td>
                      <td className="px-4 py-2 text-right">{r.total}</td>
                      <td className="px-4 py-2 text-right text-emerald-600">{r.imported}</td>
                      <td className="px-4 py-2 text-right text-amber-600">{r.updated}</td>
                      <td className={`px-4 py-2 text-right ${r.errors.length ? "text-rose-600" : "text-slate-400"}`}>
                        {r.errors.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import history */}
      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
          <CardDescription>Last 20 migration runs</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No imports yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 text-left">Source</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Records</th>
                  <th className="px-3 py-2 text-right">Imported</th>
                  <th className="px-3 py-2 text-right">Failed</th>
                  <th className="px-3 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{h.source.replace("_", " ")}</td>
                    <td className="px-3 py-2">
                      <Badge className={STATUS_CLS[h.status] || "bg-slate-100 text-slate-700"}>
                        {h.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">{h.totalRecords}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{h.importedRecords}</td>
                    <td className={`px-3 py-2 text-right ${h.failedRecords ? "text-rose-600" : "text-slate-400"}`}>
                      {h.failedRecords}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{fd(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
