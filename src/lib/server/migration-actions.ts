"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveOrgId } from "./active-org"
import { importFromNinja, ensureOrgFromNinja, type ImportResult } from "@/services/ninja/ninja-importer"

export interface MigrationHistoryItem {
  id: string
  source: string
  status: string
  totalRecords: number
  importedRecords: number
  failedRecords: number
  createdAt: string
  importedAt: string | null
}

export async function getMigrationHistory(): Promise<MigrationHistoryItem[]> {
  const orgId = await getActiveOrgId()
  const rows = await prisma.migrationImport.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true, source: true, status: true, totalRecords: true,
      importedRecords: true, failedRecords: true, createdAt: true, importedAt: true,
    },
  })
  return rows.map(r => ({
    id: r.id,
    source: r.source,
    status: r.status,
    totalRecords: r.totalRecords,
    importedRecords: r.importedRecords,
    failedRecords: r.failedRecords,
    createdAt: r.createdAt.toISOString(),
    importedAt: r.importedAt?.toISOString() ?? null,
  }))
}

export async function runNinjaImportAction(): Promise<
  { ok: true; result: ImportResult } | { ok: false; error: string }
> {
  try {
    const url = process.env.NINJA_API_URL
    const token = process.env.NINJA_API_TOKEN
    if (!url || !token) {
      return { ok: false, error: "Ninja credentials not configured. Set NINJA_API_URL and NINJA_API_TOKEN in the environment." }
    }
    const config = { apiUrl: url.replace(/\/+$/, ""), apiToken: token }

    // Ensure org exists / matches the active org context
    const orgId = await getActiveOrgId()
    const org = await ensureOrgFromNinja(config)
    if (org.id !== orgId) {
      // Importer created/matched a different org than the active session — run into the active one anyway
    }

    const result = await importFromNinja(config, org.id)
    revalidatePath("/migration")
    revalidatePath("/dashboard")
    revalidatePath("/invoices")
    revalidatePath("/clients")
    return { ok: true, result }
  } catch (err: any) {
    return { ok: false, error: err.message || "Import failed" }
  }
}

export async function testNinjaConnectionAction(): Promise<
  { ok: true; companyName: string } | { ok: false; error: string }
> {
  try {
    const url = process.env.NINJA_API_URL
    const token = process.env.NINJA_API_TOKEN
    if (!url || !token) {
      return { ok: false, error: "NINJA_API_URL / NINJA_API_TOKEN not set" }
    }
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/v1/ping`, {
      headers: { "X-Api-Token": token, "X-Requested-With": "XMLHttpRequest" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { ok: false, error: `Ninja API returned ${res.status}` }
    const data = await res.json()
    return { ok: true, companyName: data.company_name || "Connected" }
  } catch (err: any) {
    return { ok: false, error: err.message || "Connection failed" }
  }
}
