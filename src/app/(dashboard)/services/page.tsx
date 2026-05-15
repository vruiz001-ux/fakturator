import { getActiveOrg } from "@/lib/server/active-org"
import { getServicesList } from "@/lib/server/list-data"
import { ServicesView } from "./services-view"

export const dynamic = "force-dynamic"

export default async function ServicesPage() {
  const org = await getActiveOrg()
  const rows = await getServicesList(org.id)
  return <ServicesView rows={rows} defaultCurrency={org.defaultCurrency} />
}
