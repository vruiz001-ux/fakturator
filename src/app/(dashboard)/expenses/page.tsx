import { getActiveOrg } from "@/lib/server/active-org"
import { getExpensesList } from "@/lib/server/list-data"
import { ExpensesView } from "./expenses-view"

export const dynamic = "force-dynamic"

export default async function ExpensesPage() {
  const org = await getActiveOrg()
  const rows = await getExpensesList(org.id)
  return <ExpensesView rows={rows} defaultCurrency={org.defaultCurrency} />
}
