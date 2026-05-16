import { getMigrationHistory } from "@/lib/server/migration-actions"
import { MigrationView } from "./migration-view"

export const dynamic = "force-dynamic"

export default async function MigrationPage() {
  const history = await getMigrationHistory()
  return <MigrationView history={history} />
}
