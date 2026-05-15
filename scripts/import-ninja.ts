// CLI: Import data from Invoice Ninja into the Fakturator Postgres DB.
//
// Usage:
//   npm run import:ninja
//
// Requires .env.local with:
//   DATABASE_URL=postgresql://...
//   NINJA_API_URL=https://invoicing.co
//   NINJA_API_TOKEN=...

import "dotenv/config"
import { config as loadEnv } from "dotenv"
import { resolve } from "path"

// Load .env.local on top of .env
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true })

import { prisma } from "../src/lib/prisma"
import { ensureOrgFromNinja, importFromNinja } from "../src/services/ninja/ninja-importer"

function color(code: string, s: string) {
  return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s
}
const dim = (s: string) => color("2", s)
const green = (s: string) => color("32", s)
const yellow = (s: string) => color("33", s)
const red = (s: string) => color("31", s)
const bold = (s: string) => color("1", s)

async function main() {
  const url = process.env.NINJA_API_URL
  const token = process.env.NINJA_API_TOKEN
  if (!url || !token) {
    console.error(red("Missing NINJA_API_URL or NINJA_API_TOKEN in env."))
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error(red("Missing DATABASE_URL in env."))
    process.exit(1)
  }

  console.log(bold("\nFakturator ← Ninja Invoice migration\n"))
  console.log(dim(`Ninja:    ${url}`))
  console.log(dim(`Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`))

  const t0 = Date.now()
  console.log("\n› Bootstrapping organization from Ninja company profile...")
  const org = await ensureOrgFromNinja({ apiUrl: url, apiToken: token })
  console.log(green(`  ✓ Organization: ${org.name} (${org.id})`))

  console.log("\n› Importing all entities (idempotent — safe to re-run)...")
  const result = await importFromNinja({ apiUrl: url, apiToken: token }, org.id)

  console.log(green(`\n✓ Done in ${result.durationMs}ms\n`))
  const rows: Array<[string, any]> = [
    ["Clients", result.clients],
    ["Products → Services", result.products],
    ["Invoices", result.invoices],
    ["Quotes → Proforma", result.quotes],
    ["Recurring rules", result.recurring],
    ["Payments", result.payments],
  ]
  const w = 22
  console.log(bold(`${"Entity".padEnd(w)}${"Total".padStart(8)}${"New".padStart(8)}${"Upd".padStart(8)}${"Skip".padStart(8)}${"Err".padStart(8)}`))
  console.log(dim("─".repeat(w + 40)))
  for (const [label, r] of rows) {
    const err = r.errors.length
    const errStr = err > 0 ? red(String(err).padStart(8)) : String(err).padStart(8)
    console.log(
      `${label.padEnd(w)}` +
      String(r.total).padStart(8) +
      green(String(r.imported).padStart(8)) +
      yellow(String(r.updated).padStart(8)) +
      String(r.skipped).padStart(8) +
      errStr
    )
  }

  // Surface errors
  const allErrors = rows.flatMap(([label, r]) => r.errors.map((e: any) => ({ ...e, kind: label })))
  if (allErrors.length) {
    console.log(red(`\n${allErrors.length} error(s):`))
    for (const e of allErrors) {
      console.log(red(`  • [${e.kind}] ${e.ref}: ${e.message}`))
    }
  }

  // Post-import DB summary
  console.log(bold("\nDatabase state after import:"))
  const [clients, invoices, items, payments, services, recurring] = await Promise.all([
    prisma.client.count({ where: { organizationId: org.id } }),
    prisma.invoice.count({ where: { organizationId: org.id } }),
    prisma.invoiceItem.count({ where: { invoice: { organizationId: org.id } } }),
    prisma.payment.count({ where: { invoice: { organizationId: org.id } } }),
    prisma.service.count({ where: { organizationId: org.id } }),
    prisma.recurringRule.count({ where: { organizationId: org.id } }),
  ])
  console.log(`  Clients:       ${clients}`)
  console.log(`  Invoices:      ${invoices}`)
  console.log(`  Invoice items: ${items}`)
  console.log(`  Payments:      ${payments}`)
  console.log(`  Services:      ${services}`)
  console.log(`  Recurring:     ${recurring}`)

  // Quick KPIs preview
  console.log(bold("\nKPI preview (from real DB):"))
  const agg = await prisma.invoice.groupBy({
    by: ["status"],
    where: { organizationId: org.id },
    _sum: { total: true, paidAmount: true },
    _count: { _all: true },
  })
  for (const a of agg) {
    const t = a._sum.total ?? 0
    const p = a._sum.paidAmount ?? 0
    console.log(`  ${a.status.padEnd(18)} count=${String(a._count._all).padStart(3)}  total=${t.toFixed(2)}  paid=${p.toFixed(2)}`)
  }

  console.log(`\nTotal elapsed: ${Date.now() - t0}ms\n`)
  await prisma.$disconnect()
}

main().catch(async err => {
  console.error("\x1b[31m\nImport failed:\x1b[0m", err)
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
