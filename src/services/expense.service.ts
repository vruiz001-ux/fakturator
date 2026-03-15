// @ts-nocheck
import prisma from "@/lib/prisma"

export async function createExpense(organizationId: string, data: {
  supplierId?: string
  categoryId?: string
  invoiceNumber?: string
  description: string
  date?: Date
  netAmount: number
  vatRate: number
  currency?: string
  notes?: string
}) {
  const vatAmount = data.vatRate > 0 ? Math.round(data.netAmount * (data.vatRate / 100) * 100) / 100 : 0
  const grossAmount = data.netAmount + vatAmount

  return prisma.expense.create({
    data: {
      organizationId,
      ...data,
      date: data.date || new Date(),
      vatAmount,
      grossAmount,
      currency: data.currency || "PLN",
    },
    include: { category: true, supplier: true },
  })
}

export async function getExpenses(organizationId: string, filters: {
  categoryId?: string
  supplierId?: string
  dateRange?: { from: Date; to: Date }
  search?: string
  page?: number
  pageSize?: number
} = {}) {
  const { categoryId, supplierId, dateRange, search, page = 1, pageSize = 50 } = filters

  const where: any = { organizationId }
  if (categoryId) where.categoryId = categoryId
  if (supplierId) where.supplierId = supplierId
  if (dateRange) where.date = { gte: dateRange.from, lte: dateRange.to }
  if (search) where.description = { contains: search, mode: "insensitive" }

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true, supplier: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ])

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function updateExpense(id: string, data: any) {
  if (data.netAmount !== undefined && data.vatRate !== undefined) {
    data.vatAmount = data.vatRate > 0 ? Math.round(data.netAmount * (data.vatRate / 100) * 100) / 100 : 0
    data.grossAmount = data.netAmount + data.vatAmount
  }
  return prisma.expense.update({ where: { id }, data, include: { category: true } })
}

export async function deleteExpense(id: string) {
  return prisma.expense.delete({ where: { id } })
}

export async function getExpensesByCategory(organizationId: string, dateRange?: { from: Date; to: Date }) {
  const where: any = { organizationId }
  if (dateRange) where.date = { gte: dateRange.from, lte: dateRange.to }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
  })

  const categoryMap = new Map<string, { name: string; color: string; total: number; count: number }>()
  for (const exp of expenses) {
    const catId = exp.categoryId || "uncategorized"
    const existing = categoryMap.get(catId) || {
      name: exp.category?.name || "Uncategorized",
      color: exp.category?.color || "#94a3b8",
      total: 0,
      count: 0,
    }
    existing.total += exp.grossAmount
    existing.count += 1
    categoryMap.set(catId, existing)
  }

  return Array.from(categoryMap.entries()).map(([categoryId, d]) => ({
    categoryId,
    ...d,
  })).sort((a, b) => b.total - a.total)
}
