"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { loadOnboarding, isOnboardingComplete } from "@/lib/onboarding/onboarding.store"

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let shouldRedirect = false
    try {
      if (typeof window !== "undefined") {
        loadOnboarding()
        if (!isOnboardingComplete()) {
          shouldRedirect = true
        }
      }
    } catch {
      // Never block the app on onboarding errors
    }

    if (shouldRedirect) {
      router.replace("/onboarding")
    } else {
      setReady(true)
    }
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
