import { getActiveOrgId } from "@/lib/server/active-org"
import { getReportsData } from "@/lib/server/reports-data"
import { ReportsView } from "./reports-view"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const orgId = await getActiveOrgId()
  const data = await getReportsData(orgId)
  return <ReportsView data={data} />
}
