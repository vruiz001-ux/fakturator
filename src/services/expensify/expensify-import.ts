"use server"

// Server-side Expensify import → Prisma. Maps Expensify reports/expenses
// into Expense rows for the active organization.

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveOrgId } from "@/lib/server/active-org"
import type { ExpensifyReport, ExpensifyImportResult } from "./expensify.service"

export async function importExpensifyExpenses(
  reports: ExpensifyReport[],
): Promise<ExpensifyImportResult> {
  const organizationId = await getActiveOrgId()

  const result: ExpensifyImportResult = {
    reports: reports.length,
    expenses: 0,
    imported: 0,
    errors: [],
    currencies: [],
  }
  const currencySet = new Set<string>()

  for (const report of reports) {
    for (const exp of report.expenses) {
      result.expenses++
      currencySet.add(exp.currency)
      if (exp.amount <= 0) continue

      try {
        // Expensify amounts are in cents
        const netAmount = exp.amount / 100
        const isForeign = exp.currency !== "EUR" && exp.currency !== "PLN"
        await prisma.expense.create({
          data: {
            organizationId,
            description: `${exp.merchant}${report.reportName ? ` (${report.reportName})` : ""}`,
            date: exp.date ? new Date(`${exp.date}T00:00:00.000Z`) : new Date(),
            netAmount,
            vatRate: 0,
            vatAmount: 0,
            grossAmount: netAmount,
            currency: exp.currency,
            isBillable: true,
            isForeignCurrency: isForeign,
            originalCurrency: exp.currency,
            originalAmount: netAmount,
            notes: `Imported from Expensify · category: ${exp.category || "—"}`,
          },
        })
        result.imported++
      } catch (err: any) {
        result.errors.push(`${exp.merchant}: ${err.message}`)
      }
    }
  }

  result.currencies = Array.from(currencySet)
  revalidatePath("/expenses")
  revalidatePath("/dashboard")
  return result
}
