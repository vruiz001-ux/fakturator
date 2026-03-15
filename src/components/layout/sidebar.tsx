"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Receipt,
  BarChart3,
  Shield,
  Sparkles,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Plug,
} from "lucide-react"
import { getOnboardingState, loadOnboarding, subscribe as onboardingSubscribe } from "@/lib/onboarding/onboarding.store"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Services", href: "/services", icon: Briefcase },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Migration", href: "/migration", icon: ArrowLeftRight },
  { name: "KSeF Center", href: "/ksef", icon: Shield },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "AI Assistant", href: "/ai", icon: Sparkles },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState("")

  useEffect(() => {
    try {
      loadOnboarding()
      const state = getOnboardingState()
      if (state.status === "COMPLETED") {
        setCompanyName(state.data.company.legalName || state.data.company.tradingName || "")
      }
      return onboardingSubscribe(() => {
        try {
          const s = getOnboardingState()
          if (s.status === "COMPLETED") {
            setCompanyName(s.data.company.legalName || s.data.company.tradingName || "")
          }
        } catch {}
      })
    } catch {}
  }, [])

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo + Company Name */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            {companyName ? (
              <>
                <p className="text-sm font-bold text-white truncate leading-tight">{companyName}</p>
                <p className="text-[10px] text-slate-500 leading-tight">Powered by Fakturator</p>
              </>
            ) : (
              <span className="text-lg font-bold text-white tracking-tight">Fakturator</span>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-indigo-400")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 px-3 py-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800/60 hover:text-slate-200",
            collapsed && "justify-center px-2",
            pathname.startsWith("/settings") && "bg-indigo-600/20 text-indigo-400"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-800/60 hover:text-slate-300",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
