import { getActiveOrgId } from "@/lib/server/active-org"
import { getDashboardData } from "@/lib/server/dashboard-data"
import { DashboardView } from "./dashboard-view"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const orgId = await getActiveOrgId()
  const data = await getDashboardData(orgId)
  return <DashboardView data={data} />
}
