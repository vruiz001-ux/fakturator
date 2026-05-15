// @ts-nocheck
// Ninja Invoice REST client. Source-of-truth pull layer.
// All entity fetchers paginate to completion.

export interface NinjaConfig {
  apiUrl: string
  apiToken: string
}

const HEADERS = (token: string) => ({
  "X-Api-Token": token,
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/json",
})

interface Paginated<T> {
  data: T[]
  meta?: {
    pagination?: {
      total: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}

async function fetchPage<T>(config: NinjaConfig, endpoint: string, page: number, include?: string): Promise<Paginated<T>> {
  const params = new URLSearchParams({ per_page: "50", page: String(page) })
  if (include) params.set("include", include)
  const url = `${config.apiUrl}/api/v1/${endpoint}?${params}`
  const res = await fetch(url, {
    headers: HEADERS(config.apiToken),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("NINJA_AUTH: invalid token or access denied")
    throw new Error(`NINJA_HTTP_${res.status}: ${endpoint}`)
  }
  return res.json()
}

export async function fetchAll<T>(config: NinjaConfig, endpoint: string, include?: string): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const result = await fetchPage<T>(config, endpoint, page, include)
    all.push(...result.data)
    const pag = result.meta?.pagination
    if (!pag || page >= pag.total_pages) break
    page++
  }
  return all
}

export interface NinjaCompanyProfile {
  name: string
  address1: string
  address2: string
  city: string
  state: string
  postalCode: string
  countryId: string
  vatNumber: string
  phone: string
  email: string
  website: string
  currencyId: string
}

export async function fetchCompany(config: NinjaConfig): Promise<{ profile: NinjaCompanyProfile; raw: any }> {
  const res = await fetch(`${config.apiUrl}/api/v1/companies`, {
    headers: HEADERS(config.apiToken),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`NINJA_HTTP_${res.status}: companies`)
  const json = await res.json()
  const company = json?.data?.[0] || {}
  const s = company.settings || {}
  return {
    raw: company,
    profile: {
      name: s.name || "Unnamed Company",
      address1: s.address1 || "",
      address2: s.address2 || "",
      city: s.city || "",
      state: s.state || "",
      postalCode: s.postal_code || "",
      countryId: String(s.country_id || ""),
      vatNumber: s.vat_number || "",
      phone: s.phone || "",
      email: s.email || "",
      website: s.website || "",
      currencyId: String(s.currency_id ?? ""),
    },
  }
}

// Ninja currency_id → ISO 4217 (most common). Falls back to EUR.
// Source: Invoice Ninja currencies table.
const NINJA_CURRENCY: Record<string, string> = {
  "1": "USD", "2": "GBP", "3": "EUR", "4": "JPY", "5": "CAD", "6": "AUD",
  "8": "NZD", "10": "DKK", "11": "HKD", "12": "HUF", "14": "MYR", "15": "NOK",
  "17": "PLN", "18": "RON", "19": "SEK", "20": "SGD", "22": "CHF",
  "23": "ARS", "24": "BRL", "30": "ILS", "31": "RUB", "33": "TWD",
  "35": "BGN", "38": "TRY", "39": "MAD", "47": "ISK", "48": "KRW",
  "49": "AED", "61": "CZK",
}

export function currencyCode(id: string | number | null | undefined, fallback = "EUR"): string {
  if (!id) return fallback
  return NINJA_CURRENCY[String(id)] || fallback
}

// Ninja country_id → ISO 3166-1 alpha-2 (subset).
// Default country left empty; mapping below covers PL-targeted use.
const NINJA_COUNTRY: Record<string, string> = {
  "616": "PL", "276": "DE", "250": "FR", "528": "NL", "056": "BE",
  "826": "GB", "840": "US", "124": "CA", "752": "SE", "208": "DK",
  "246": "FI", "578": "NO", "380": "IT", "724": "ES", "620": "PT",
  "040": "AT", "756": "CH", "203": "CZ", "703": "SK", "348": "HU",
  "440": "LT", "428": "LV", "233": "EE", "642": "RO", "100": "BG",
  "705": "SI", "191": "HR", "300": "GR", "372": "IE",
}

export function countryCode(id: string | number | null | undefined, fallback = "PL"): string {
  if (!id) return fallback
  return NINJA_COUNTRY[String(id).padStart(3, "0")] || fallback
}

// Status mappings
export const NINJA_INVOICE_STATUS: Record<string, "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED"> = {
  "1": "DRAFT",
  "2": "SENT",
  "3": "PARTIALLY_PAID",
  "4": "PAID",
  "5": "CANCELLED",
  "6": "CANCELLED",
}

export const NINJA_FREQUENCY: Record<string, "MONTHLY" | "QUARTERLY" | "YEARLY"> = {
  "1": "MONTHLY", "2": "MONTHLY", "3": "MONTHLY", "4": "MONTHLY",
  "5": "MONTHLY",
  "6": "QUARTERLY", "7": "QUARTERLY", "8": "QUARTERLY", "9": "QUARTERLY",
  "10": "YEARLY", "11": "YEARLY", "12": "YEARLY",
}

// Entity types

export interface NinjaContact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  is_primary: boolean
}

export interface NinjaClient {
  id: string
  name: string
  website: string
  address1: string
  address2: string
  city: string
  state: string
  postal_code: string
  country_id: string
  phone: string
  vat_number: string
  id_number: string
  public_notes: string
  private_notes: string
  contacts: NinjaContact[]
  number: string
  is_deleted: boolean
  settings?: { currency_id?: string | number }
}

export interface NinjaLineItem {
  product_key: string
  notes: string
  quantity: number
  cost: number
  discount: number
  tax_name1: string
  tax_rate1: number
  tax_name2: string
  tax_rate2: number
  line_total: number
  gross_line_total?: number
  sort_id: string | number
  unit_code?: string
}

export interface NinjaInvoice {
  id: string
  client_id: string
  number: string
  date: string
  due_date: string
  amount: number
  balance: number
  paid_to_date: number
  status_id: string
  public_notes: string
  private_notes: string
  line_items: NinjaLineItem[]
  uses_inclusive_taxes: boolean
  is_deleted: boolean
  exchange_rate?: number
}

export interface NinjaQuote extends NinjaInvoice {
  invoice_id?: string
}

export interface NinjaRecurring extends NinjaInvoice {
  frequency_id: string
  next_send_date?: string
  remaining_cycles?: number
}

export interface NinjaProduct {
  id: string
  product_key: string
  notes: string
  cost: number
  price: number
  tax_name1: string
  tax_rate1: number
  is_deleted: boolean
}

export interface NinjaPayment {
  id: string
  client_id: string
  amount: number
  date: string
  transaction_reference: string
  number: string
  status_id: string
  is_deleted: boolean
  paymentables?: Array<{ invoice_id?: string; amount: number; refunded: number }>
}
