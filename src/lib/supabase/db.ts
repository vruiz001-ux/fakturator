// Supabase database operations
// Wraps Supabase client for type-safe CRUD
// Falls back gracefully when Supabase is not configured

import { createClient } from "./client"

const isConfigured = () =>
  typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ─── Auth ─────────────────────────────────────────────────

export async function signUp(email: string, password: string, name?: string) {
  if (!isConfigured()) return { user: null, error: "Supabase not configured" }
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name || email.split("@")[0] } },
  })
  return { user: data.user, error: error?.message }
}

export async function signIn(email: string, password: string) {
  if (!isConfigured()) return { user: null, error: "Supabase not configured" }
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data.user, session: data.session, error: error?.message }
}

export async function signOut() {
  if (!isConfigured()) return
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getSession() {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser() {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

// ─── Organization ─────────────────────────────────────────

export async function getOrganization(orgId: string) {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data } = await supabase.from("organizations").select("*").eq("id", orgId).single()
  return data
}

export async function updateOrganization(orgId: string, updates: Record<string, any>) {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data } = await supabase.from("organizations").update(updates).eq("id", orgId).select().single()
  return data
}

// ─── Clients ──────────────────────────────────────────────

export async function dbGetClients(orgId: string) {
  if (!isConfigured()) return []
  const supabase = createClient()
  const { data } = await supabase.from("clients").select("*").eq("organization_id", orgId).eq("is_active", true).order("name")
  return data || []
}

export async function dbCreateClient(orgId: string, client: Record<string, any>) {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data } = await supabase.from("clients").insert({ organization_id: orgId, ...client }).select().single()
  return data
}

// ─── Invoices ─────────────────────────────────────────────

export async function dbGetInvoices(orgId: string) {
  if (!isConfigured()) return []
  const supabase = createClient()
  const { data } = await supabase
    .from("invoices")
    .select("*, invoice_items(*), clients(name, nip, email, address, city, postal_code)")
    .eq("organization_id", orgId)
    .order("issue_date", { ascending: false })
  return data || []
}

export async function dbCreateInvoice(orgId: string, invoice: Record<string, any>, items: Record<string, any>[]) {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data: inv } = await supabase.from("invoices").insert({ organization_id: orgId, ...invoice }).select().single()
  if (inv && items.length > 0) {
    await supabase.from("invoice_items").insert(items.map((item) => ({ invoice_id: inv.id, ...item })))
  }
  return inv
}

export async function dbUpdateInvoiceStatus(invoiceId: string, status: string, paidAmount?: number) {
  if (!isConfigured()) return null
  const supabase = createClient()
  const updates: Record<string, any> = { status }
  if (paidAmount !== undefined) updates.paid_amount = paidAmount
  const { data } = await supabase.from("invoices").update(updates).eq("id", invoiceId).select().single()
  return data
}

// ─── Expenses ─────────────────────────────────────────────

export async function dbGetExpenses(orgId: string) {
  if (!isConfigured()) return []
  const supabase = createClient()
  const { data } = await supabase.from("expenses").select("*").eq("organization_id", orgId).order("date", { ascending: false })
  return data || []
}

// ─── Services ─────────────────────────────────────────────

export async function dbGetServices(orgId: string) {
  if (!isConfigured()) return []
  const supabase = createClient()
  const { data } = await supabase.from("services").select("*").eq("organization_id", orgId).eq("is_active", true).order("name")
  return data || []
}

// ─── Payments ─────────────────────────────────────────────

export async function dbRecordPayment(invoiceId: string, amount: number, method?: string) {
  if (!isConfigured()) return null
  const supabase = createClient()
  const { data } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    method: method || "BANK_TRANSFER",
  }).select().single()
  return data
}

// ─── Audit ────────────────────────────────────────────────

export async function dbLogAudit(orgId: string, userId: string, action: string, entityType: string, entityId?: string, details?: any) {
  if (!isConfigured()) return
  const supabase = createClient()
  await supabase.from("audit_logs").insert({
    organization_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  })
}
