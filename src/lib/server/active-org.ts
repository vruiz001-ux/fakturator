// Server-side resolution of the currently active organization.
//
// SECURITY: in production the only trusted source is the signed session
// cookie. The DEFAULT_ORG_ID env var and first-org DB fallback are DEV-ONLY
// conveniences — without them a leaked `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`
// would let any visitor read an arbitrary org's books. They are gated behind
// an explicit allow-flag so a stray prod env var cannot open the door.

import "server-only"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const COOKIE_NAME = "fakturator_active_org"
const IS_PROD = process.env.NODE_ENV === "production"

// Dev shortcuts are honored only when NOT in production, OR when the operator
// has explicitly opted in via ALLOW_DEV_ORG_FALLBACK=true (e.g. a staging box
// running a NODE_ENV=production build but with no real auth yet).
const DEV_FALLBACK_ALLOWED =
  !IS_PROD || process.env.ALLOW_DEV_ORG_FALLBACK === "true"

let cachedDevOrgId: string | null = null

export async function getActiveOrgId(): Promise<string> {
  // 1) Signed session cookie — the only source trusted in production.
  try {
    const jar = await cookies()
    const fromCookie = jar.get(COOKIE_NAME)?.value
    if (fromCookie) return fromCookie
  } catch {
    // cookies() unavailable outside a request context — fall through
  }

  // 2) Env override — dev/staging only.
  if (DEV_FALLBACK_ALLOWED && process.env.DEFAULT_ORG_ID) {
    return process.env.DEFAULT_ORG_ID
  }

  // 3) First-org-in-DB fallback — dev/staging only, cached.
  if (DEV_FALLBACK_ALLOWED) {
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

  // Production with no session — refuse rather than leak.
  throw new Error("No active organization in session. Sign in required.")
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
