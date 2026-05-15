import { getActiveOrgId } from "@/lib/server/active-org"
import { generateForecast } from "@/services/ai/agents/forecaster"
import { ForecastView } from "./forecast-view"

export const dynamic = "force-dynamic"

export default async function ForecastPage() {
  const orgId = await getActiveOrgId()
  const forecast = await generateForecast(orgId)
  return <ForecastView forecast={forecast} />
}
