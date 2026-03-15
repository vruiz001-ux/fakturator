// @ts-nocheck
import prisma from "@/lib/prisma"

export async function createClient(organizationId: string, data: {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  nip?: string
  contactPerson?: string
  notes?: string
  tags?: string[]
}) {
  return prisma.client.create({
    data: { organizationId, ...data, country: data.country || "PL", tags: data.tags || [] },
  })
}

export async function updateClient(id: string, data: any) {
  return prisma.client.update({ where: { id }, data })
}

export async function deleteClient(id: string) {
  return prisma.client.update({ where: { id }, data: { isActive: false } })
}

export async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        include: { items: true },
        orderBy: { issueDate: "desc" },
      },
    },
  })
}

export async function getClients(organizationId: string, filters: { search?: string; tags?: string[]; page?: number; pageSize?: number } = {}) {
  const { search, tags, page = 1, pageSize = 50 } = filters

  const where: any = { organizationId, isActive: true }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { nip: { contains: search } },
    ]
  }

  if (tags?.length) {
    where.tags = { hasSome: tags }
  }

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getClientRevenue(clientId: string, dateRange?: { from: Date; to: Date }) {
  const where: any = { clientId }
  if (dateRange) where.issueDate = { gte: dateRange.from, lte: dateRange.to }

  const invoices = await prisma.invoice.findMany({ where })
  return invoices.reduce((sum: number, inv: any) => sum + inv.subtotal, 0)
}
