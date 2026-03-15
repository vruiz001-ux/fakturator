"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { getInvoices, initializeStore, subscribe } from "@/lib/store/data-store"
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Filter,
  FileText,
  MoreHorizontal,
  Download,
  Send,
  Eye,
  Copy,
  Trash2,
  ArrowUpDown,
} from "lucide-react"
import type { Invoice, InvoiceType } from "@/types"

type SortField = "issueDate" | "dueDate" | "total" | "invoiceNumber"
type SortOrder = "asc" | "desc"

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
] as const

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "VAT", label: "VAT" },
  { value: "PROFORMA", label: "Proforma" },
  { value: "CORRECTION", label: "Correction" },
  { value: "ADVANCE", label: "Advance" },
] as const

const ITEMS_PER_PAGE = 10

export default function InvoicesPage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [sortField, setSortField] = useState<SortField>("issueDate")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [currentPage, setCurrentPage] = useState(1)

  const invoices = getInvoices()

  // --- Computed stats ---
  const stats = useMemo(() => {
    const total = invoices.length
    const totalValue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidCount = invoices.filter((inv) => inv.status === "PAID").length
    const overdueCount = invoices.filter(
      (inv) => inv.status === "OVERDUE"
    ).length
    return { total, totalValue, paidCount, overdueCount }
  }, [invoices])

  // --- Filtering ---
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.client?.name ?? "").toLowerCase().includes(q)
      )
    }

    // Status
    if (statusFilter !== "ALL") {
      result = result.filter((inv) => inv.status === statusFilter)
    }

    // Type
    if (typeFilter !== "ALL") {
      result = result.filter((inv) => inv.type === typeFilter)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "issueDate":
          cmp =
            new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
          break
        case "dueDate":
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          break
        case "total":
          cmp = a.total - b.total
          break
        case "invoiceNumber":
          cmp = a.invoiceNumber.localeCompare(b.invoiceNumber)
          break
      }
      return sortOrder === "asc" ? cmp : -cmp
    })

    return result
  }, [searchQuery, statusFilter, typeFilter, sortField, sortOrder])

  // --- Pagination ---
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
  )
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }
  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const isOverdue = (invoice: Invoice) => {
    return (
      invoice.status === "OVERDUE" ||
      (invoice.status !== "PAID" &&
        invoice.status !== "CANCELLED" &&
        new Date(invoice.dueDate) < new Date())
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and track all your invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Invoices
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Value
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatCurrency(stats.totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Paid
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">
              {stats.paidCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Overdue
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              {stats.overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Bar ───────────────────────────────────── */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Status Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <TabsList className="h-9 bg-slate-100/80">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="px-3 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                    {tab.value !== "ALL" && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-200/80 px-1 text-[10px] font-medium text-slate-600">
                        {
                          invoices.filter(
                            (inv) => inv.status === tab.value
                          ).length
                        }
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search, Type, Date, Sort */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by invoice number or client..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-9 pl-9 text-sm border-slate-200 bg-white placeholder:text-slate-400 focus-visible:ring-slate-300"
                />
              </div>
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9 w-full sm:w-[160px] border-slate-200 bg-white text-sm">
                  <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="From"
                className="h-9 w-full sm:w-[140px] border-slate-200 bg-white text-sm text-slate-500"
                disabled
                title="Date range filter (coming soon)"
              />
              <Input
                type="date"
                placeholder="To"
                className="h-9 w-full sm:w-[140px] border-slate-200 bg-white text-sm text-slate-500"
                disabled
                title="Date range filter (coming soon)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice Table ────────────────────────────────── */}
      <Card className="overflow-hidden border-slate-200/60 shadow-sm">
        {paginatedInvoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="w-[180px]">
                      <button
                        onClick={() => toggleSort("invoiceNumber")}
                        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Invoice
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Client
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("issueDate")}
                        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Issue Date
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => toggleSort("dueDate")}
                        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Due Date
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => toggleSort("total")}
                        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors ml-auto"
                      >
                        Amount
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="border-slate-100 transition-colors hover:bg-slate-50/60 group"
                    >
                      <TableCell className="py-3.5">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {invoice.type}
                        </p>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <p className="text-sm text-slate-700">
                          {invoice.client?.name ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-slate-600">
                        {formatDate(invoice.issueDate)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span
                          className={`text-sm ${
                            isOverdue(invoice)
                              ? "font-medium text-red-600"
                              : "text-slate-600"
                          }`}
                        >
                          {formatDate(invoice.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <span className="text-sm font-medium text-slate-900 tabular-nums">
                          {formatCurrency(invoice.total, invoice.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="secondary"
                          className={`${getStatusColor(invoice.status)} border-0 text-xs font-medium`}
                        >
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4 text-slate-500" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/invoices/${invoice.id}/edit`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <FileText className="h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                              <Send className="h-4 w-4" />
                              Send
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                              <Download className="h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination ────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-700">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>
                {" - "}
                <span className="font-medium text-slate-700">
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filteredInvoices.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-700">
                  {filteredInvoices.length}
                </span>{" "}
                invoices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage <= 1}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* ── Empty State ────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">
              No invoices found
            </h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              {searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "Try adjusting your search or filter criteria."
                : "No invoices yet. Create your first invoice to get started."}
            </p>
            {!searchQuery &&
              statusFilter === "ALL" &&
              typeFilter === "ALL" && (
                <Link href="/invoices/new" className="mt-4">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Button>
                </Link>
              )}
          </div>
        )}
      </Card>
    </div>
  )
}
