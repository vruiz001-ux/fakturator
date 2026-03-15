// @ts-nocheck
import type { NinjaConfig, NinjaClient, NinjaInvoice, NinjaProduct, NinjaPayment } from "./ninja.types"

const HEADERS = (token: string) => ({
  "X-API-TOKEN": token,
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/json",
})

async function ninjaFetch<T>(config: NinjaConfig, endpoint: string, page = 1): Promise<{ data: T[]; meta: { pagination: { total: number; per_page: number; current_page: number; total_pages: number } } }> {
  const url = `${config.apiUrl}/api/v1/${endpoint}?per_page=50&page=${page}`
  const res = await fetch(url, {
    headers: HEADERS(config.apiToken),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error("Invalid API token or access denied")
    throw new Error(`Invoice Ninja API error: ${res.status}`)
  }
  return res.json()
}

// Fetch all pages of a resource
async function fetchAll<T>(config: NinjaConfig, endpoint: string): Promise<T[]> {
  const all: T[] = []
  let page = 1
  while (true) {
    const result = await ninjaFetch<T>(config, endpoint, page)
    all.push(...result.data)
    const pagination = result.meta?.pagination
    if (!pagination || page >= pagination.total_pages) break
    page++
  }
  return all
}

export async function testConnection(config: NinjaConfig): Promise<{ success: boolean; error?: string; companyName?: string }> {
  try {
    const res = await fetch(`${config.apiUrl}/api/v1/companies`, {
      headers: HEADERS(config.apiToken),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return { success: false, error: res.status === 401 ? "Invalid API token" : `API error: ${res.status}` }
    }
    const data = await res.json()
    const name = data?.data?.[0]?.settings?.name || "Connected"
    return { success: true, companyName: name }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function fetchClients(config: NinjaConfig): Promise<NinjaClient[]> {
  return fetchAll<NinjaClient>(config, "clients")
}

export async function fetchInvoices(config: NinjaConfig): Promise<NinjaInvoice[]> {
  return fetchAll<NinjaInvoice>(config, "invoices")
}

export async function fetchProducts(config: NinjaConfig): Promise<NinjaProduct[]> {
  return fetchAll<NinjaProduct>(config, "products")
}

export async function fetchPayments(config: NinjaConfig): Promise<NinjaPayment[]> {
  return fetchAll<NinjaPayment>(config, "payments")
}
