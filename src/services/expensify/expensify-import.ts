// Client-side import: maps Expensify expenses into Fakturator data store
import type { ExpensifyReport, ExpensifyImportResult } from "./expensify.service"
import { addExpense, initializeStore } from "@/lib/store/data-store"
import { logAudit } from "@/lib/audit/audit.service"

export function importExpensifyToStore(reports: ExpensifyReport[]): ExpensifyImportResult {
  initializeStore()

  const result: ExpensifyImportResult = {
    reports: reports.length,
    expenses: 0,
    imported: 0,
    errors: [],
    currencies: [],
  }

  const currencySet = new Set<string>()

  logAudit({
    action: "MIGRATION_STARTED",
    entityType: "MIGRATION",
    actor: "SYSTEM",
    success: true,
    details: { source: "EXPENSIFY", reportCount: reports.length },
  })

  for (const report of reports) {
    for (const exp of report.expenses) {
      result.expenses++
      currencySet.add(exp.currency)

      if (exp.amount <= 0) continue

      try {
        // Expensify amounts are in cents — convert to decimal
        const amountDecimal = exp.amount / 100
        const isForeign = exp.currency !== "EUR" && exp.currency !== "PLN"

        addExpense({
          description: `${exp.merchant}${report.reportName ? ` (${report.reportName})` : ""}`,
          date: exp.date || new Date().toISOString().split("T")[0],
          netAmount: amountDecimal,
          vatRate: 0, // Expenses from Expensify typically don't have VAT breakdown
          currency: exp.currency,
          categoryId: mapExpensifyCategory(exp.category, exp.merchant),
          isBillable: true,
          isForeignCurrency: isForeign,
          originalCurrency: exp.currency,
          originalAmount: amountDecimal,
        })
        result.imported++
      } catch (err: any) {
        result.errors.push(`${exp.merchant}: ${err.message}`)
      }
    }
  }

  result.currencies = Array.from(currencySet)

  logAudit({
    action: "MIGRATION_COMPLETED",
    entityType: "MIGRATION",
    actor: "SYSTEM",
    success: true,
    details: { source: "EXPENSIFY", result },
  })

  return result
}

// Map Expensify categories/merchants to Fakturator expense categories
function mapExpensifyCategory(category: string, merchant: string): string | undefined {
  const m = merchant.toLowerCase()
  const c = (category || "").toLowerCase()

  if (m.includes("taxi") || m.includes("bolt") || m.includes("train") || m.includes("flight") || m.includes("fuel") || m.includes("parking") || m.includes("toll") || m.includes("lot polish")) {
    return "ec_travel"
  }
  if (m.includes("linkedin") || m.includes("vkard") || m.includes("network")) {
    return "ec_marketing"
  }
  if (m.includes("phone") || m.includes("orange") || m.includes("mobile")) {
    return "ec_software"
  }
  if (m.includes("insurance") || m.includes("visa")) {
    return "ec_professional"
  }
  if (m.includes("dinner") || m.includes("lunch") || m.includes("perdiem") || m.includes("per diem") || m.includes("flowers")) {
    return "ec_travel"
  }
  return undefined
}
