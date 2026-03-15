"use client"

import { usePathname } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoices",
  "/invoices/new": "New Invoice",
  "/clients": "Clients",
  "/services": "Services",
  "/expenses": "Expenses & Rebilling",
  "/reports": "Reports & Analytics",
  "/migration": "Data Migration",
  "/ksef": "KSeF Compliance Center",
  "/integrations": "Integrations",
  "/ai": "AI Assistant",
  "/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title
  }
  return "Fakturator"
}

export function Header() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search invoices, clients..."
            className="w-72 pl-9 bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">VR</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
