"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding"]

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const { loadOnboarding, isOnboardingComplete } = require("@/lib/onboarding/onboarding.store")
      loadOnboarding()

      const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/onboarding"))
      if (!isPublic && !isOnboardingComplete()) {
        router.replace("/onboarding")
        return
      }
    } catch {
      // If onboarding store fails, allow access
    }
    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  return <>{children}</>
}
