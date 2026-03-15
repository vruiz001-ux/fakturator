// Invoice Ninja API v5 field mappings

export interface NinjaConfig {
  apiUrl: string   // e.g. "https://app.invoiceninja.com" or self-hosted URL
  apiToken: string // X-API-TOKEN value
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
  balance: number
  paid_to_date: number
  number: string
  created_at: number
  updated_at: number
}

export interface NinjaContact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  is_primary: boolean
}

export interface NinjaInvoice {
  id: string
  client_id: string
  number: string
  date: string
  due_date: string
  amount: number
  balance: number
  status_id: string // 1=Draft, 2=Sent, 3=Partial, 4=Paid, 5=Cancelled, 6=Reversed
  discount: number
  po_number: string
  terms: string
  public_notes: string
  private_notes: string
  footer: string
  tax_name1: string
  tax_rate1: number
  tax_name2: string
  tax_rate2: number
  line_items: NinjaLineItem[]
  paid_to_date: number
  created_at: number
  updated_at: number
  uses_inclusive_taxes: boolean
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
  sort_id: number
}

export interface NinjaProduct {
  id: string
  product_key: string
  notes: string
  cost: number
  price: number
  quantity: number
  tax_name1: string
  tax_rate1: number
  created_at: number
  updated_at: number
}

export interface NinjaPayment {
  id: string
  client_id: string
  amount: number
  date: string
  transaction_reference: string
  number: string
  status_id: string
  created_at: number
}

// Import results
export interface NinjaImportResult {
  clients: { total: number; imported: number; errors: string[] }
  invoices: { total: number; imported: number; errors: string[] }
  products: { total: number; imported: number; errors: string[] }
  payments: { total: number; imported: number; errors: string[] }
}
