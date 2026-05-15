# Fakturator

AI-first invoicing and business dashboard for Polish SMBs. Migrates from Invoice Ninja, runs on Next.js + Prisma + Postgres.

**Live demo**: https://fakturator-app.netlify.app
**Repo**: https://github.com/vruiz001-ux/fakturator

---

## What it does

- **Invoicing**: VAT invoices, proforma quotes, recurring rules, partial payments, credit notes, multi-currency.
- **Polish compliance**: KSeF state machine, NIP white-list lookup, JPK_V7 inputs, split-payment (MPP) flagging, GTU-aware items.
- **Invoice Ninja migration**: One-command import of clients, invoices, line items, quotes, recurring rules, payments, and products from any Invoice Ninja instance.
- **Powerful dashboard**: 11 KPIs (YTD revenue, avg invoice value, avg payment delay, client concentration, VAT collected, etc.) + aging report + pay-lag leaderboards + revenue trend + status pie + top-services bar.
- **AI agents** built into the core:
  - **AI Assistant** — answers questions like "How much did I invoice Donecle this year?" or "Which client pays slowest?"
  - **Cash-Flow Forecaster** — 90-day projection from real pay-lag history with AI commentary.
  - **Auto-Chasing Agent** — drafts Polish/English/French reminders in friendly/formal/final tones.
  - **KSeF Copilot** — pre-submit validator with rejection-probability score and plain-Polish explainer.
- **Reports**: 6 tabs (Revenue · Clients · Services · Invoices · Expenses · VAT) all server-aggregated via Prisma `groupBy`.
- **CSV export** for invoices and clients.

---

## Stack

- **Next.js 16** (App Router, RSC) on **Turbopack**
- **TypeScript** end-to-end with **Zod** validation
- **PostgreSQL 16** + **Prisma 7** (`prisma-client` generator + `@prisma/adapter-pg`)
- **Tailwind CSS** + **shadcn/ui** + **Recharts**
- **Resend** for transactional email (chasers, invoices)
- **Stripe** for subscription billing (Free / Pro / Agency)
- **AI provider abstraction**: Anthropic Claude → Groq Llama → fake (priority order, auto-selected)
- **React-PDF** for invoice PDF generation
- **NextAuth** + custom session model

---

## Quick start

### Prerequisites
- Node.js 22+
- Docker (for local Postgres)
- An Invoice Ninja account (optional, only if you want to migrate data)

### 1. Install
```bash
git clone https://github.com/vruiz001-ux/fakturator.git
cd fakturator
npm install
```

### 2. Database
```bash
docker run -d --name fakturator-pg \
  -e POSTGRES_PASSWORD=devpw \
  -e POSTGRES_DB=invoicepilot \
  -p 5433:5432 \
  postgres:16-alpine
```

### 3. Environment
Copy `.env.example` to `.env.local` and fill in:
```bash
DATABASE_URL=postgresql://postgres:devpw@localhost:5433/invoicepilot?schema=public

# Dev shortcuts (skip auth, pin active org)
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
DEFAULT_ORG_ID=                     # filled after first import

# AI (pick one; Anthropic preferred for production quality)
ANTHROPIC_API_KEY=sk-ant-...        # optional
GROQ_API_KEY=gsk_...                # optional, free tier works great
AI_MODEL_ANTHROPIC=claude-sonnet-4-6
AI_MODEL_GROQ=llama-3.3-70b-versatile

# Invoice Ninja (only if migrating)
NINJA_API_URL=https://invoicing.co  # or your self-hosted URL
NINJA_API_TOKEN=...                 # from Ninja → Settings → Account Management → API Tokens

# Optional (production)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
```

### 4. Push schema + import
```bash
npm run db:push                     # creates all 23 tables
npm run import:ninja                # pulls everything from Invoice Ninja
```

The importer creates an `Organization` row from your Ninja company profile, then upserts all entities idempotently. Copy the printed org ID into `DEFAULT_ORG_ID` in `.env.local`.

### 5. Run
```bash
npm run dev                         # http://localhost:3000
npm run db:studio                   # http://localhost:5555 — visual DB browser
```

---

## Invoice Ninja import

### What gets imported

| Ninja entity | Fakturator entity | Notes |
|---|---|---|
| `clients` | `Client` | Contacts, NIP/VAT number, address |
| `products` | `Service` | Maps to reusable line-item templates |
| `invoices` | `Invoice` (VAT) | Line items, status, dates, totals |
| `quotes` | `Invoice` (PROFORMA) | Same shape, type=PROFORMA |
| `recurring_invoices` | `RecurringRule` | Frequency, next-run-date, template |
| `payments` (+ paymentables) | `Payment` | One row per paymentable link |

### Idempotency

Every imported row carries `externalSource = "NINJA_INVOICE"` and `externalId = <ninja_id>`. Re-running `npm run import:ninja` upserts safely.

### Guardrail

The importer never downgrades local state. If you mark an invoice PAID in Fakturator, a future re-import of stale Ninja data won't revert it. Status precedence: `DRAFT < SENT < PARTIALLY_PAID/OVERDUE < PAID < CANCELLED/CORRECTED`.

### CSV/JSON import

Not yet wired. The current pull-from-API flow covers the common case (live Ninja account). For exported CSV/JSON files, drop them in `/tmp/ninja-export/` and use `scripts/import-ninja.ts` as a reference for adapters.

---

## AI agents

### How provider selection works

`src/services/ai/provider.ts` resolves provider at request time:
1. `ANTHROPIC_API_KEY` present → Claude (best quality)
2. else `GROQ_API_KEY` present → Llama 3.3 70B via Groq (free, fast)
3. else fake provider returning canned dev responses

Every call is persisted to the `AIInteraction` table with tokens, latency, and provider — enables per-tenant usage caps and billing.

### Agents

| Agent | File | Endpoint | Used by |
|---|---|---|---|
| AI Assistant (chat) | `src/services/ai/agents/assistant.ts` | server action | `/ai` page |
| Cash-Flow Forecaster | `src/services/ai/agents/forecaster.ts` | RSC | `/forecast` page |
| Auto-Chasing Agent | `src/services/ai/agents/chaser.ts` | server action | invoice detail `AgentPanel` |
| KSeF Copilot | `src/services/ai/agents/ksef-copilot.ts` | server action | invoice detail `AgentPanel` |

### Example questions

The AI Assistant page comes pre-loaded with suggestion chips:
- "How much did I invoice this year?"
- "Which invoices are overdue?"
- "Which client pays slowest?"
- "What VAT did I collect this quarter?"
- "What's my biggest outstanding invoice?"

---

## Data model

23 Prisma models, all org-scoped with cascade deletes and proper indexes.

Key tables: `User`, `Organization`, `Client`, `Service`, `Invoice`, `InvoiceItem`, `RecurringRule`, `Payment`, `Expense`, `ExpenseCategory`, `Supplier`, `Reminder`, `TaxSetting`, `KsefSubmission`, `AuditLog`, `AIInteraction`, `MigrationImport`, `IntegrationConfig`, `InvoiceEmailEvent`, `DeliverySettings`, `FxRate`, `FxRebillConfig`.

All Ninja-sourced rows have `externalSource` + `externalId` columns for idempotent re-imports.

---

## NPM scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbopack on :3000 |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run test` | Jest (no tests gating yet — Playwright planned) |
| `npm run db:push` | Apply Prisma schema to DB (no migration files) |
| `npm run db:studio` | Prisma Studio on :5555 |
| `npm run import:ninja` | Pull-import from Invoice Ninja → Postgres |

---

## Architecture notes

### Server vs client

All pages under `(dashboard)/` are React Server Components by default. Data fetching happens server-side via `src/lib/server/*` helpers:

- `active-org.ts` — resolves active organization (cookie → env → first-org fallback)
- `dashboard-data.ts` — KPIs, aging, payer leaderboards, revenue trend
- `reports-data.ts` — all 6 report tabs aggregated via Prisma `groupBy`
- `list-data.ts` — invoices, quotes, recurring, clients, expenses, services
- `invoice-data.ts` — single-invoice detail with items + payments + KSeF state
- `invoice-actions.ts` — server actions for `markPaid`, `recordPayment`, `markSent`, `cancel`

Client components are reserved for interactive bits: filter chips, sort, search, dialogs, charts.

### Auth (dev bypass)

`NEXT_PUBLIC_DEV_BYPASS_AUTH=true` skips the `AuthGuard` and `OnboardingGuard`. The active org is then read from `DEFAULT_ORG_ID`. For production, wire NextAuth + remove the bypass.

### EU residency

For GDPR compliance, pin Postgres (Supabase/RDS) and Resend to `eu-central-1` (Frankfurt) or `eu-west-1` (Ireland) before going live with paying customers.

---

## Roadmap

See `tasks/todo.md` for the live roadmap. Headline:

- **Phase 0–1** (✅ done): Persistence + Ninja import + dashboard/reports/lists + invoice actions
- **Phase 2** (🟡 partial): Compliance — GDPR pages, cookie banner, WCAG, hreflang, JSON-LD
- **Phase 3** (⏳): JPK_V7M generator, KSeF production submission, MPP detection, GUS nightly sync
- **Phase 4** (✅ partial): AI provider + 4 agents shipped (Assistant, Forecaster, Chaser, KSeF Copilot)
- **Phase 5** (⏳): Receipt OCR, contract→recurring, voice-to-invoice via Telegram
- **Phase 6** (⏳): White-label, public API, bank reconciliation

---

## License

Proprietary. © 2026 Vincent Ruiz.
