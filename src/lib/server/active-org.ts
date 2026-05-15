// Server-side resolution of the currently active organization.
// Reads from cookie/session in production; falls back to a dev env var or
// the first org in the database in dev — so /dashboard renders out-of-the-box
// after a Ninja import without a real auth session.

import "server-only"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const COOKIE_NAME = "fakturator_active_org"
const DEV = process.env.NODE_ENV !== "production"

let cachedDevOrgId: string | null = null

export async function getActiveOrgId(): Promise<string> {
  // 1) Cookie set by server actions on login / org switch
  try {
    const jar = await cookies()
    const fromCookie = jar.get(COOKIE_NAME)?.value
    if (fromCookie) return fromCookie
  } catch {
    // headers() unavailable outside request context — fall through
  }

  // 2) Env override (set in .env.local for dev)
  if (process.env.DEFAULT_ORG_ID) return process.env.DEFAULT_ORG_ID

  // 3) Dev fallback: first org in DB (cached)
  if (DEV) {
    if (cachedDevOrgId) return cachedDevOrgId
    const org = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
    if (org) {
      cachedDevOrgId = org.id
      return org.id
    }
    throw new Error("No organization in database. Run `npm run import:ninja` first.")
  }

  throw new Error("No active organization in session.")
}

export async function getActiveOrg() {
  const id = await getActiveOrgId()
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      defaultCurrency: true,
      country: true,
      nip: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
    },
  })
  if (!org) throw new Error(`Active org ${id} not found`)
  return org
}
