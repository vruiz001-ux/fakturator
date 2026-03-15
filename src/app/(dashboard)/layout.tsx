import type { Metadata } from "next"
import { AppShell } from "@/components/layout/app-shell"
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OnboardingGuard>
      <AppShell>{children}</AppShell>
    </OnboardingGuard>
  )
}
