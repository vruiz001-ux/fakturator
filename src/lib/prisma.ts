// @ts-nocheck
// Lazy Prisma 7 singleton. The client is created on first access, not at
// module load — so `next build` succeeds even when DATABASE_URL isn't set
// (build only collects routes; it doesn't run RSC code).

import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

declare global {
  var __prisma: PrismaClient | undefined
}

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local for dev, or in Netlify environment for prod."
    )
  }
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

function getClient(): PrismaClient {
  if (globalThis.__prisma) return globalThis.__prisma
  const client = makeClient()
  if (process.env.NODE_ENV !== "production") globalThis.__prisma = client
  return client
}

// Proxy so any property access lazily resolves to the real client.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})

export default prisma

export function getPrismaClient(): PrismaClient {
  return getClient()
}
