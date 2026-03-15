"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { loadOnboarding, isOnboardingComplete, subscribe } from "@/lib/onboarding/onboarding.store"

const PUBLIC_PATHS = ["/", "/login", "/signup", "/onboarding"]

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    loadOnboarding()

    const check = () => {
      const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/onboarding"))
      if (!isPublic && !isOnboardingComplete()) {
        router.replace("/onboarding")
        return
      }
      setChecked(true)
    }

    check()
    return subscribe(check)
  }, [pathname, router])

  if (!checked) {
    // Show nothing while checking — prevents flash
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/onboarding"))
    if (!isPublic) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      )
    }
  }

  return <>{children}</>
}
