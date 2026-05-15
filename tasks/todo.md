# Fakturator — AI-Native Polish Invoicing SaaS Roadmap

**Vision:** The first invoicing SaaS Polish SMBs choose because the AI does the boring 80% — KSeF, JPK, white-list checks, chasing — autonomously. Vincent dogfoods it by migrating from Ninja Invoice.

**Wedge:** KSeF mandatory in PL from 2026. Every Polish SMB must migrate. Whoever ships the autonomous KSeF-compliant copilot first wins.

**Pricing thesis (proposed):**
- Free — 5 invoices/mo
- Solo — €19/mo — unlimited + 1 AI agent
- Pro — €49/mo — all AI + KSeF auto + multi-currency + JPK_V7
- Agency — €99/mo — white-label + multi-org + API

---

## CRITICAL FINDING (audit 2026-05-14)
Dashboard, reports, migration, invoices, clients, expenses pages all read from **browser localStorage**, not Prisma. Server APIs exist but UI bypasses them. **No data persists per-user across devices/sessions.** This must be fixed before anything else — it's the difference between a demo and a SaaS.

---

## Phase 0 — Persistence (move data plane localStorage → DB) [P0, ~2 days]
Without this, Ninja import is throwaway.

- [ ] Confirm Supabase Postgres region (must be EU — Frankfurt/Ireland) | P0
- [ ] Replace `lib/store/data-store` calls in `/dashboard`, `/reports`, `/invoices`, `/clients`, `/expenses`, `/migration` with RSC server fetches from Prisma scoped to `session.user.organizationId` | P0
- [ ] Server actions for create/update/delete (replace client-side store mutations) | P0
- [ ] Keep optimistic UI via `useOptimistic` where it matters | P1
- [ ] Delete `lib/store/*` after migration, or repurpose for offline cache | P1
- [ ] Smoke test: log in two browsers, create invoice in A, see it in B | P0

## Phase 1 — Ninja Invoice full migration [P0, ~2 days]
Vincent's real data lands in the new DB. This is the dogfood moment.

- [ ] Switch `ninja-import.service.ts` to write to Prisma (currently writes localStorage via `ninja-client-import.ts`) | P0
- [ ] Add missing entity mappers:
  - [ ] Expenses (`/api/v1/expenses` → `Expense` model with category, supplier, FX fields) | P0
  - [ ] Recurring invoices (`/api/v1/recurring_invoices` → `RecurringRule`) | P0
  - [ ] Quotes (`/api/v1/quotes` → `Invoice` with `type=PROFORMA`) | P0
  - [ ] Payments — write real `Payment` rows, not just count | P0
  - [ ] Suppliers (`/api/v1/vendors` → `Supplier`) | P1
  - [ ] Documents/attachments (S3/Supabase Storage) | P2
- [ ] Idempotency: store Ninja entity ID on every row (`Invoice.externalId`, etc.), upsert on re-run | P0
- [ ] Background job: long imports run server-side with progress polling (don't block browser) | P0
- [ ] Migration report screen: counts, errors, mapping diffs, "what's in Ninja vs. here" | P0
- [ ] Ongoing sync option: nightly delta pull for users who keep both systems running | P1

## Phase 2 — Compliance backbone [P0, ~3 days]
Polish law + EU GDPR + EU Accessibility Act + SEO. Non-negotiable before paying customers.

### 2A — GDPR / Privacy
- [ ] `/privacy`, `/dpa`, `/terms`, `/security` pages (PL + EN) | P0
- [ ] Cookie banner (TCF-aware, PL-first, granular: necessary/analytics/marketing) | P0
- [ ] Consent log: per-user record of what they accepted + timestamp + IP | P0
- [ ] Data export endpoint: GDPR Art. 20 portability (JSON + CSV bundle) | P0
- [ ] Right-to-erasure flow: settings → "Delete my account" → 30-day soft-delete with email confirm | P0
- [ ] GDPR Art. 22 disclosure on every AI-automated decision (risk score, chasing tone, etc.) + human review opt-out | P0
- [ ] DPA template downloadable PDF + ToS auto-issued on Pro+ signup | P0
- [ ] Audit log UI under settings (we have the model, just surface it) | P1

### 2B — EU residency / infra
- [ ] Pin Supabase project to eu-central-1 (Frankfurt) or eu-west-1 (Ireland); if currently US, migrate | P0
- [ ] Resend: use `eu-central-1` API endpoint for inbound + outbound | P0
- [ ] Netlify functions region: pin to EU (Frankfurt) | P0
- [ ] Document infra residency on `/security` page | P0

### 2C — Polish tax law
- [ ] KSeF state machine: sandbox/prod toggle in org settings, cert upload, real submission via API | P0
- [ ] White List NIP daily cron: every client NIP re-checked, alert + invoice flag on removal | P0
- [ ] Split-payment (MPP) auto-flag: invoices ≥15k PLN B2B with sensitive categories → MPP required | P0
- [ ] JPK_V7M (monthly) + JPK_V7K (quarterly) XML generator + validator | P0
- [ ] GTU codes (01–13) on invoice items where applicable, AI suggests | P1

### 2D — Accessibility (EU Accessibility Act, effective 2025-06)
- [ ] WCAG 2.1 AA pass on dashboard + invoice builder + checkout flow | P0
- [ ] Add `aria-*`, `role=`, alt-text everywhere; focus-visible styles | P0
- [ ] Keyboard nav for all flows (invoice create, KSeF submit, payment) | P0
- [ ] Lighthouse a11y ≥ 95 on every public + auth route | P0

### 2E — SEO
- [ ] `robots.ts` (allow + sitemap pointer) | P0
- [ ] Expand `sitemap.ts`: all marketing + pricing + features + blog + locale variants | P0
- [ ] `generateMetadata` per route (title, description, canonical, OG, Twitter) | P0
- [ ] hreflang PL/EN/UA on all marketing pages | P0
- [ ] JSON-LD: `Organization`, `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `Product` for pricing | P0
- [ ] Dynamic OG images (Next.js `opengraph-image.tsx`) per route | P0
- [ ] Core Web Vitals ≥ 90 mobile (image optim, font subset, RSC) | P0
- [ ] Marketing blog scaffold (MDX) for content SEO — KSeF guide, JPK guide, freelance tax tips | P1
- [ ] Lead magnet: "KSeF migration checklist" gated PDF | P1

## Phase 3 — Plug remaining SaaS leaks [P0, ~1 day]
- [ ] `Organization.subscriptionStatus`, `subscriptionPlan`, `stripeCustomerId`, `stripeSubscriptionId`, `currentPeriodEnd`, `trialEndsAt` fields | P0
- [ ] Stripe webhook persists state (`customer.subscription.*`, `invoice.payment_failed`) | P0
- [ ] Tier gating middleware (free: 5 inv/3 clients; Pro: AI/KSeF/FX/JPK; Agency: multi-org) | P0
- [ ] 14-day Pro trial on signup, no card | P0
- [ ] Pricing page `/pricing` wired to checkout | P0
- [ ] Team invites via Resend (token, role assignment, audit log) | P0

## Phase 4 — AI core platform [P0, ~2 days]
Replace regex "AI" with real LLM. Foundation for Phase 5.

- [ ] `src/services/ai/provider.ts` — Claude Sonnet 4.6 default, OpenAI fallback | P0
- [ ] Prompt registry (`src/services/ai/prompts/`) with Zod-typed structured outputs | P0
- [ ] Prompt caching (Anthropic cache_control on system + tools) for cost | P0
- [ ] `AIInteraction` persistence: tokens, cost, latency, org for usage billing | P0
- [ ] AI usage meter UI + soft cap per plan | P0
- [ ] PII redaction layer before send (NIP, emails, names → tokens) | P0

## Phase 5 — Killer AI agents over real Ninja data [~5 days]
Built on top of Vincent's actually-imported invoices/clients/expenses.

### 5A — KSeF Copilot
- [ ] Parse rejection XML, AI explains in plain Polish | P0
- [ ] Auto-fix: NIP format, GTU code, VAT split, JPK_V7 mismatch | P0
- [ ] Pre-submit rejection-probability scorer | P1

### 5B — Receipt OCR → Expense
- [ ] Phone photo / forwarded faktura → structured expense (vision LLM) | P0
- [ ] Auto-extract supplier NIP + line items + VAT split + GTU + payment date | P0
- [ ] White-list check, flag if supplier removed | P0
- [ ] Dedicated `receipts@<org>.fakturator.app` inbound (Resend Receive) | P1

### 5C — Auto-Chasing Agent
- [ ] Polish-grammar reminders, escalating tone | P0
- [ ] Send-time optimization per client open rates | P1
- [ ] Promise-to-pay extraction from replies | P1
- [ ] Cash-flow risk score per client (pay-lag history) | P1

### 5D — Cash-Flow Forecaster
- [ ] 30/60/90-day projection using historical lag per client | P0
- [ ] AI commentary: "Your January cash gap is 12k PLN — chase these 3 first" | P0
- [ ] What-if simulator | P1

## Phase 6 — Power features [later]
- [ ] Voice-to-invoice via Telegram (Claw bridge) | P1
- [ ] Contract → recurring invoice (PDF upload, AI extracts terms) | P1
- [ ] Multi-language invoices (DE/EN/FR with correct VAT phrasing) | P1
- [ ] Bank reconciliation (mBank/PKO/Santander OAuth) | P2
- [ ] White-label for accountants (Agency tier) | P2
- [ ] Public API + Zapier templates | P2

---

## Sequencing
**Week 1:** Phase 0 (persistence) → Phase 1 (Ninja import) → Vincent migrated, real KPIs on real data.
**Week 2:** Phase 2 (compliance) → Phase 3 (billing/tier gates) → sellable.
**Week 3:** Phase 4 (AI core) → Phase 5A+5C (KSeF Copilot + Auto-Chasing) → groundbreaking.
**Later:** Phase 5B/5D, Phase 6.

## Open questions for Vincent
1. **Ninja access** — share API token + URL (probably https://invoicing.co), or paste from Settings → Account → API Tokens?
2. **Supabase region** — confirm current (Frankfurt/Ireland) or migrate? If unknown, share Supabase project URL.
3. **AI provider** — Claude Sonnet 4.6 default + OpenAI fallback OK?
4. **KSeF cert** — sandbox now, or have a production NIP cert already?
5. **Languages** — PL + EN first? Add UA later?
6. **Pricing tiers** — accept proposed Free/€19/€49/€99 or counter?
