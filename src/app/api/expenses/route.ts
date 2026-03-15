import { NextRequest, NextResponse } from "next/server"
import { getExpenses, addExpense, initializeStore } from "@/lib/store/data-store"

export async function GET(request: NextRequest) {
  initializeStore()
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("categoryId")

  let expenses = getExpenses()
  if (categoryId) {
    expenses = expenses.filter((e) => e.categoryId === categoryId)
  }

  return NextResponse.json({ data: expenses, total: expenses.length })
}

export async function POST(request: NextRequest) {
  try {
    initializeStore()
    const data = await request.json()

    if (!data.description?.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }
    if (!data.netAmount || data.netAmount <= 0) {
      return NextResponse.json({ error: "Net amount must be positive" }, { status: 400 })
    }

    const expense = addExpense(data)
    return NextResponse.json(expense, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create expense" }, { status: 500 })
  }
}
