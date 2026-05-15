import { getActiveOrgId } from "@/lib/server/active-org"
import { getInvoicesList } from "@/lib/server/list-data"
import { InvoicesView } from "./invoices-view"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  const orgId = await getActiveOrgId()
  const rows = await getInvoicesList(orgId)
  return <InvoicesView rows={rows} />
}
