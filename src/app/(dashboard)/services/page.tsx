"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Briefcase, TrendingUp, FileText, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getServices, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency } from "@/lib/formatters"
import { UNITS } from "@/lib/constants"

export default function ServicesPage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const [search, setSearch] = useState("")
  const services = getServices()

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = services.reduce((sum, s) => sum + (s.totalRevenue || 0), 0)
  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {services.length} services across {categories.length} categories
        </p>
        <Button>
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Briefcase className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Services</p>
              <p className="text-lg font-bold text-slate-900">{services.filter(s => s.isActive).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Revenue</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Invoices</p>
              <p className="text-lg font-bold text-slate-900">{services.reduce((s, svc) => s + (svc.invoiceCount || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search services or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Services Table */}
      {filteredServices.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Briefcase className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">No services found</h3>
            <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
              {search ? "Try adjusting your search terms." : "No services defined. Add the services you offer."}
            </p>
            {!search && (
              <Button className="mt-4" size="sm">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            )}
          </div>
        </Card>
      ) : (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Default Rate</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>VAT</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const unit = UNITS.find((u) => u.value === service.defaultUnit)
                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{service.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.category && (
                        <Badge variant="secondary">{service.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {service.defaultRate ? formatCurrency(service.defaultRate) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-500">{unit?.label || service.defaultUnit}</TableCell>
                    <TableCell className="text-slate-500">{service.defaultVatRate}%</TableCell>
                    <TableCell>{service.invoiceCount || 0}</TableCell>
                    <TableCell className="font-medium text-emerald-600">
                      {formatCurrency(service.totalRevenue || 0)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Service</DropdownMenuItem>
                          <DropdownMenuItem>View Invoices</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
