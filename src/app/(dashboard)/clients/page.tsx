import { getActiveOrg } from "@/lib/server/active-org"
import { getClientsList } from "@/lib/server/list-data"
import { ClientsView } from "./clients-view"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const org = await getActiveOrg()
  const rows = await getClientsList(org.id)
  return <ClientsView rows={rows} defaultCurrency={org.defaultCurrency} />
}
