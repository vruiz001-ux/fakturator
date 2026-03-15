"use client"

import { useState, useEffect } from "react"
import {
  Plus, Search, Receipt, TrendingDown, PieChart, MoreHorizontal,
  Calendar, Users, FileText, ArrowRight, CheckCircle2, Clock,
  ArrowUpRight, DollarSign, TrendingUp, Globe, Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { getExpenses, getExpenseCategories, getClients, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency, formatDate } from "@/lib/formatters"

export default function ExpensesPage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [tab, setTab] = useState("all")

  const expenses = getExpenses()
  const expenseCategories = getExpenseCategories()
  const clients = getClients()

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "ALL" || e.categoryId === categoryFilter
    const matchesTab =
      tab === "all" ||
      (tab === "billable" && e.isBillable && !e.isRebilled) ||
      (tab === "rebilled" && e.isRebilled) ||
      (tab === "internal" && !e.isBillable) ||
      (tab === "fx" && e.isForeignCurrency)
    return matchesSearch && matchesCategory && matchesTab
  })

  const totalGross = expenses.reduce((sum, e) => sum + e.grossAmount, 0)
  const billableTotal = expenses.filter(e => e.isBillable).reduce((s, e) => s + e.grossAmount, 0)
  const rebilledTotal = expenses.filter(e => e.isRebilled).reduce((s, e) => s + e.grossAmount, 0)
  const pendingRebill = expenses.filter(e => e.isBillable && !e.isRebilled).reduce((s, e) => s + e.grossAmount, 0)

  // FX metrics
  const fxExpenses = expenses.filter(e => e.isForeignCurrency)
  const fxPendingRebill = fxExpenses.filter(e => !e.isRebilled)
  const totalFxConvertedEur = fxExpenses.reduce((s, e) => s + (e.convertedEurAmount || 0), 0)
  const totalFxUplift = fxExpenses.reduce((s, e) => s + (e.fxUpliftAmount || 0), 0)
  const totalFxFinalRebill = fxExpenses.reduce((s, e) => s + (e.finalRebillAmount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Track expenses, assign to clients, and rebill automatically
        </p>
        <div className="flex gap-2">
          <Button variant="outline">
            <Receipt className="h-4 w-4" />
            Import from Expensify
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">No expenses recorded</h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              No expenses recorded. Add an expense or import from Expensify.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">
                <Receipt className="h-4 w-4" />
                Import from Expensify
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </div>
          </div>
        </Card>
      ) : (
      <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Expenses</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totalGross)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Billable (Client)</p>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(billableTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Rebilled (Recovered)</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(rebilledTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Rebill</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(pendingRebill)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FX Dashboard */}
      {fxExpenses.length > 0 && (
        <Card className="border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-900">Foreign Currency Pipeline</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-white/80 p-3 text-center">
                <p className="text-xs text-slate-500">FX Expenses</p>
                <p className="text-lg font-bold text-violet-600">{fxExpenses.length}</p>
              </div>
              <div className="rounded-lg bg-white/80 p-3 text-center">
                <p className="text-xs text-slate-500">Converted (EUR)</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalFxConvertedEur, "EUR")}</p>
              </div>
              <div className="rounded-lg bg-white/80 p-3 text-center">
                <p className="text-xs text-slate-500">FX Uplift (5%)</p>
                <p className="text-lg font-bold text-amber-600">+{formatCurrency(totalFxUplift, "EUR")}</p>
              </div>
              <div className="rounded-lg bg-white/80 p-3 text-center">
                <p className="text-xs text-slate-500">Total Rebillable</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalFxFinalRebill, "EUR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rebilling Alert */}
      {pendingRebill > 0 && (
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-medium text-indigo-900">
                  {expenses.filter(e => e.isBillable && !e.isRebilled).length} expenses ready to rebill
                </p>
                <p className="text-xs text-indigo-600">
                  {formatCurrency(pendingRebill)} in client expenses can be added to invoices
                </p>
              </div>
            </div>
            <Button size="sm">
              Create Rebill Invoice
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Expenses</TabsTrigger>
            <TabsTrigger value="billable">
              Pending Rebill
              <Badge variant="warning" className="ml-1.5 text-[10px] px-1.5">
                {expenses.filter(e => e.isBillable && !e.isRebilled).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="fx">
              <Globe className="h-3.5 w-3.5 mr-1" />
              Foreign Currency
              <Badge variant="default" className="ml-1.5 text-[10px] px-1.5">
                {fxExpenses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rebilled">Rebilled</TabsTrigger>
            <TabsTrigger value="internal">Internal</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value={tab} className="mt-4">
          {/* Category Breakdown */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {expenseCategories.map((cat) => {
                  const catExpenses = expenses.filter(e => e.categoryId === cat.id)
                  const catTotal = catExpenses.reduce((s, e) => s + e.grossAmount, 0)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(categoryFilter === cat.id ? "ALL" : cat.id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        categoryFilter === cat.id
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{cat.name}</p>
                        <p className="text-xs text-slate-400">{catExpenses.length} items</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(catTotal)}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Original</TableHead>
                    {tab === "fx" && (
                      <>
                        <TableHead>EUR Converted</TableHead>
                        <TableHead>+Uplift</TableHead>
                        <TableHead>Rebill EUR</TableHead>
                      </>
                    )}
                    {tab !== "fx" && <TableHead>Gross</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{expense.description}</p>
                        {expense.markup > 0 && (
                          <p className="text-xs text-indigo-500">+{expense.markup}% markup</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.category && (
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: expense.category.color }} />
                            <span className="text-sm text-slate-600">{expense.category.name}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.client?.name ? (
                          <span className="text-sm text-indigo-600 font-medium">{expense.client?.name}</span>
                        ) : (
                          <span className="text-sm text-slate-400">Internal</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(expense.date)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.isForeignCurrency
                          ? `${expense.grossAmount.toFixed(2)} ${expense.currency}`
                          : formatCurrency(expense.grossAmount, expense.currency)}
                      </TableCell>
                      {tab === "fx" && (
                        <>
                          <TableCell className="text-slate-600">
                            {expense.convertedEurAmount
                              ? formatCurrency(expense.convertedEurAmount, "EUR")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-amber-600 font-medium">
                            {expense.fxUpliftAmount
                              ? `+${formatCurrency(expense.fxUpliftAmount, "EUR")}`
                              : "—"}
                          </TableCell>
                          <TableCell className="font-bold text-emerald-600">
                            {expense.finalRebillAmount
                              ? formatCurrency(expense.finalRebillAmount, "EUR")
                              : "—"}
                            {expense.fxLocked && <Lock className="h-3 w-3 inline ml-1 text-slate-400" />}
                          </TableCell>
                        </>
                      )}
                      {tab !== "fx" && (
                        <TableCell className="font-semibold">{formatCurrency(expense.grossAmount, expense.currency)}</TableCell>
                      )}
                      <TableCell>
                        {expense.isRebilled ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Rebilled
                          </Badge>
                        ) : expense.isForeignCurrency ? (
                          <Badge className="text-xs bg-violet-100 text-violet-700">
                            <DollarSign className="h-3 w-3 mr-1" />
                            FX Pending
                          </Badge>
                        ) : expense.isBillable ? (
                          <Badge variant="warning" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Internal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            {!expense.isBillable && (
                              <DropdownMenuItem>Mark as Billable</DropdownMenuItem>
                            )}
                            {expense.isBillable && !expense.isRebilled && (
                              <>
                                <DropdownMenuItem>Assign to Client</DropdownMenuItem>
                                <DropdownMenuItem className="text-indigo-600">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Add to Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>
      )}
    </div>
  )
}
