"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Users, MoreHorizontal, Mail, Phone, FileText, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { getClients, initializeStore, subscribe } from "@/lib/store/data-store"
import { formatCurrency, formatNIP } from "@/lib/formatters"

export default function ClientsPage() {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    initializeStore()
    return subscribe(() => forceUpdate(n => n + 1))
  }, [])

  const [search, setSearch] = useState("")
  const clients = getClients()

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nip?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {clients.filter(c => c.isActive).length} active clients
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by name, NIP, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Client Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="group relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-sm">
                    {client.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {client.name}
                    </Link>
                    {client.nip && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        NIP: {formatNIP(client.nip)}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Edit Client</DropdownMenuItem>
                    <DropdownMenuItem>Create Invoice</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Deactivate</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact */}
              <div className="mt-4 space-y-1.5">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </div>
                )}
                {client.city && (
                  <p className="text-sm text-slate-400">
                    {client.address}, {client.postalCode} {client.city}
                  </p>
                )}
              </div>

              {/* Tags */}
              {client.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-600">{client.invoiceCount} invoices</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-medium text-slate-900">
                    {formatCurrency(client.totalRevenue || 0)}
                  </span>
                </div>
                {(client.overdueBalance || 0) > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {formatCurrency(client.overdueBalance || 0)} overdue
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No clients found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {search ? "Try adjusting your search terms" : "No clients yet. Add your first client to start invoicing."}
          </p>
          {!search && (
            <Button className="mt-4">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
