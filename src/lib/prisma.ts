// @ts-nocheck
// Prisma client singleton. Requires a PostgreSQL database to function.
// In the MVP, pages use mock data directly. This module is used by the
// service layer when connected to a real database.

export function getPrismaClient() {
  const { PrismaClient } = require("@/generated/prisma/client")
  return new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })
}

const globalForPrisma = globalThis as any
const prisma = globalForPrisma.__prisma || (globalForPrisma.__prisma = null)

export default prisma
