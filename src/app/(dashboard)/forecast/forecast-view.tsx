"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { ForecastResult } from "@/services/ai/agents/forecaster"

function fc(value: number, currency: string): string {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value) }
  catch { return `${currency} ${value.toFixed(2)}` }
}

export function ForecastView({ forecast }: { forecast: ForecastResult }) {
  const { buckets, payLag, totalReceivables, totalOverdue, monthlyRecurring, commentary, riskFlags, currency } = forecast
  const totalNet = buckets.reduce((s, b) => s + b.net, 0)

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cash-flow forecast</h1>
          <p className="text-sm text-slate-600">
            90-day projection from real payment behavior · powered by AI
          </p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-700">
          <Sparkles className="mr-1 h-3 w-3" /> Agent: Forecaster
        </Badge>
      </header>

      {/* AI commentary */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/40">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">AI commentary</p>
              <p className="text-sm leading-relaxed text-slate-900">{commentary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">Total receivables</p>
          <p className="mt-1 text-2xl font-bold">{fc(totalReceivables, currency)}</p>
          {totalOverdue > 0 && <p className="mt-1 text-xs text-rose-600">{fc(totalOverdue, currency)} overdue</p>}
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">Monthly recurring</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fc(monthlyRecurring, currency)}</p>
          <p className="mt-1 text-xs text-slate-500">predictable inflow</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">90-day net</p>
          <p className={`mt-1 text-2xl font-bold ${totalNet >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fc(totalNet, currency)}</p>
          <p className="mt-1 text-xs text-slate-500">{totalNet >= 0 ? "positive cash flow" : "cash gap"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-slate-600">Risk flags</p>
          <p className="mt-1 text-2xl font-bold">{riskFlags.length}</p>
          <p className="mt-1 text-xs text-slate-500">items needing attention</p>
        </CardContent></Card>
      </div>

      {/* 90-day chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash flow by bucket</CardTitle>
          <CardDescription>Expected inflows (paid invoices + recurring) vs. outflows (90-day expense run-rate)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => fc(v, currency).replace(/\.\d+/, "")} />
                <Tooltip formatter={(v: any) => fc(Number(v) || 0, currency)} />
                <Legend />
                <Bar dataKey="expectedInflow" name="Inflow" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expectedOutflow" name="Outflow" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar dataKey="net" name="Net" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map(b => (
                <TableRow key={b.label}>
                  <TableCell className="font-medium">{b.label}</TableCell>
                  <TableCell className="text-right text-emerald-600">{fc(b.expectedInflow, currency)}</TableCell>
                  <TableCell className="text-right text-rose-600">{fc(b.expectedOutflow, currency)}</TableCell>
                  <TableCell className={`text-right font-semibold ${b.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fc(b.net, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay-lag per client */}
      {payLag.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pay-lag by client</CardTitle>
            <CardDescription>Days between invoice issue and first payment — learned from your real history</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Paid invoices</TableHead>
                  <TableHead className="text-right">Avg lag</TableHead>
                  <TableHead className="text-right">Median lag</TableHead>
                  <TableHead>Indicator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payLag.map(p => {
                  const fast = p.medianLagDays <= 14
                  const slow = p.medianLagDays > 30
                  return (
                    <TableRow key={p.clientId}>
                      <TableCell className="font-medium">{p.clientName}</TableCell>
                      <TableCell className="text-right">{p.paidInvoices}</TableCell>
                      <TableCell className="text-right">{p.averageLagDays}d</TableCell>
                      <TableCell className="text-right">{p.medianLagDays}d</TableCell>
                      <TableCell>
                        {fast && <Badge className="bg-emerald-100 text-emerald-700"><TrendingUp className="mr-1 h-3 w-3" />Fast payer</Badge>}
                        {!fast && !slow && <Badge className="bg-slate-100 text-slate-700">Normal</Badge>}
                        {slow && <Badge className="bg-rose-100 text-rose-700"><TrendingDown className="mr-1 h-3 w-3" />Slow payer</Badge>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Risk flags */}
      {riskFlags.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-900">Risk flags</p>
            </div>
            <ul className="space-y-1">
              {riskFlags.map((f, i) => (
                <li key={i} className="text-sm text-amber-900">· {f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
