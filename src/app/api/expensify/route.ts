import { NextRequest, NextResponse } from "next/server"
import { testConnection, fetchExpenses } from "@/services/expensify/expensify.service"

export async function POST(request: NextRequest) {
  try {
    const { action, partnerUserID, partnerUserSecret } = await request.json()

    if (!partnerUserID || !partnerUserSecret) {
      return NextResponse.json({ error: "Expensify credentials are required" }, { status: 400 })
    }

    const creds = { partnerUserID, partnerUserSecret }

    if (action === "test") {
      const result = await testConnection(creds)
      return NextResponse.json(result)
    }

    if (action === "fetch") {
      const reports = await fetchExpenses(creds)
      const totalExpenses = reports.reduce((s, r) => s + r.expenses.length, 0)
      return NextResponse.json({
        success: true,
        reports,
        summary: {
          reportCount: reports.length,
          expenseCount: totalExpenses,
        },
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Expensify API error" }, { status: 500 })
  }
}
