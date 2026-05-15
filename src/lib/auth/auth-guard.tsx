"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { loadAuth, isAuthenticated, subscribeAuth } from "./auth.store"

const PUBLIC_PATHS = ["/", "/login", "/signup"]
const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(DEV_BYPASS)

  useEffect(() => {
    if (DEV_BYPASS) { setReady(true); return }
    loadAuth()

    const check = () => {
      const isPublic = PUBLIC_PATHS.includes(pathname)
      if (!isPublic && !isAuthenticated()) {
        router.replace("/login")
        return
      }
      setReady(true)
    }

    check()
    return subscribeAuth(check)
  }, [pathname, router])

  if (!ready) {
    const isPublic = PUBLIC_PATHS.includes(pathname)
    if (isPublic) return <>{children}</>
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  return <>{children}</>
}
