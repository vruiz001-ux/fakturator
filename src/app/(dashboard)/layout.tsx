import type { Metadata } from "next"
import { AppShell } from "@/components/layout/app-shell"
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard"
import { AuthGuard } from "@/lib/auth/auth-guard"
import { getActiveOrg } from "@/lib/server/active-org"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let orgName = ""
  try {
    const org = await getActiveOrg()
    orgName = org.name
  } catch {
    // No active org yet (e.g. before first import) — sidebar shows the app name
  }

  return (
    <AuthGuard>
      <OnboardingGuard>
        <AppShell orgName={orgName}>{children}</AppShell>
      </OnboardingGuard>
    </AuthGuard>
  )
}
