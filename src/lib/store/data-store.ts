// Production data store for Fakturator
// All data starts empty — no demo content in production
// Development fixtures are loaded only when NODE_ENV === 'development'

import type {
  Client, Invoice, Service, Expense, ExpenseCategory, Payment,
  InvoiceItem, CreateClientInput, CreateInvoiceInput, CreateExpenseInput,
} from '@/types'

// ─── Store State ──────────────────────────────────────────

interface CompanyProfile {
  name: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  nip?: string
  email?: string
  phone?: string
  bankName?: string
  bankAccount?: string
}

interface NinjaCredentials {
  apiUrl: string
  apiToken: string
}

interface UserSettings {
  displayCurrency: string
  ninjaCredentials?: NinjaCredentials
}

interface DataStore {
  company: CompanyProfile
  settings: UserSettings
  clients: Client[]
  invoices: Invoice[]
  services: Service[]
  expenses: Expense[]
  expenseCategories: ExpenseCategory[]
  payments: Payment[]
  initialized: boolean
}

import { getUserStorageKey } from "@/lib/auth/auth.store"

function getStorageKey(): string {
  try { return getUserStorageKey() } catch { return "fakturator_data_guest" }
}

const store: DataStore = {
  company: { name: "" },
  settings: { displayCurrency: "EUR" },
  clients: [],
  invoices: [],
  services: [],
  expenses: [],
  expenseCategories: [],
  payments: [],
  initialized: false,
}

// ─── Persistence ──────────────────────────────────────────

function persist() {
  if (typeof window === "undefined") return
  try {
    const toSave = {
      company: store.company,
      settings: store.settings,
      clients: store.clients,
      invoices: store.invoices,
      services: store.services,
      expenses: store.expenses,
      expenseCategories: store.expenseCategories,
      payments: store.payments,
    }
    localStorage.setItem(getStorageKey(), JSON.stringify(toSave))
  } catch {}
}

function loadFromStorage(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(getStorageKey())
    if (!raw) return false
    const data = JSON.parse(raw)
    if (data && typeof data === "object") {
      if (data.company) store.company = { ...store.company, ...data.company }
      if (data.settings) store.settings = { ...store.settings, ...data.settings }
      if (Array.isArray(data.clients)) store.clients = data.clients
      if (Array.isArray(data.invoices)) store.invoices = data.invoices
      if (Array.isArray(data.services)) store.services = data.services
      if (Array.isArray(data.expenses)) store.expenses = data.expenses
      if (Array.isArray(data.expenseCategories) && data.expenseCategories.length > 0) {
        store.expenseCategories = data.expenseCategories
      }
      if (Array.isArray(data.payments)) store.payments = data.payments
      return true
    }
  } catch {
    try { localStorage.removeItem(getStorageKey()) } catch {}
  }
  return false
}

// ─── Listeners ────────────────────────────────────────────

type Listener = () => void
const listeners: Set<Listener> = new Set()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach(l => l())
  persist()
}

// ─── Getters ──────────────────────────────────────────────

export function getCompany(): CompanyProfile { return store.company }
export function setCompany(data: Partial<CompanyProfile>): void {
  store.company = { ...store.company, ...data }
  notify()
}
export function getSettings(): UserSettings { return store.settings }
export function setSettings(data: Partial<UserSettings>): void {
  store.settings = { ...store.settings, ...data }
  notify()
}
export function getDisplayCurrency(): string { return store.settings.displayCurrency || "EUR" }
export function setDisplayCurrency(currency: string): void {
  store.settings.displayCurrency = currency
  notify()
}
export function getNinjaCredentials(): NinjaCredentials | undefined { return store.settings.ninjaCredentials }
export function setNinjaCredentials(creds: NinjaCredentials): void {
  store.settings.ninjaCredentials = creds
  notify()
}
export function getClients(): Client[] { return store.clients }
export function getClient(id: string): Client | undefined { return store.clients.find(c => c.id === id) }
export function getInvoices(): Invoice[] { return store.invoices }
export function getInvoice(id: string): Invoice | undefined { return store.invoices.find(i => i.id === id) }
export function getServices(): Service[] { return store.services }
export function getExpenses(): Expense[] { return store.expenses }
export function getExpenseCategories(): ExpenseCategory[] { return store.expenseCategories }
export function getPayments(): Payment[] { return store.payments }
export function isInitialized(): boolean { return store.initialized }

// ─── Client Operations ───────────────────────────────────

export function addClient(data: CreateClientInput): Client {
  const client: Client = {
    id: `cl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    organizationId: 'org1',
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    postalCode: data.postalCode,
    country: data.country || 'PL',
    nip: data.nip,
    contactPerson: data.contactPerson,
    notes: data.notes,
    tags: data.tags || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  store.clients.push(client)
  notify()
  return client
}

export function updateClient(id: string, data: Partial<Client>): Client | undefined {
  const idx = store.clients.findIndex(c => c.id === id)
  if (idx === -1) return undefined
  store.clients[idx] = { ...store.clients[idx], ...data, updatedAt: new Date().toISOString() }
  notify()
  return store.clients[idx]
}

export function deleteClient(id: string): boolean {
  const idx = store.clients.findIndex(c => c.id === id)
  if (idx === -1) return false
  store.clients[idx].isActive = false
  notify()
  return true
}

// ─── Invoice Operations ──────────────────────────────────

let invoiceCounter = 0

export function generateInvoiceNumber(type: string = 'VAT'): string {
  invoiceCounter++
  const now = new Date()
  const prefix = type === 'PROFORMA' ? 'PRO' : type === 'CORRECTION' ? 'KOR' : 'FV'
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const num = String(invoiceCounter).padStart(3, '0')
  return `${prefix}/${year}/${month}/${num}`
}

export function addInvoice(data: {
  clientId: string
  type?: string
  issueDate?: string
  saleDate?: string
  dueDate: string
  paymentMethod?: string
  currency?: string
  notes?: string
  items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
}): Invoice {
  const client = getClient(data.clientId)
  const invoiceNumber = generateInvoiceNumber(data.type)

  const items: InvoiceItem[] = data.items.map((item, i) => ({
    ...item,
    id: `ii_${Date.now()}_${i}`,
    invoiceId: '',
    sortOrder: item.sortOrder ?? i,
  }))

  const subtotal = items.reduce((s, i) => s + i.netAmount, 0)
  const vatTotal = items.reduce((s, i) => s + i.vatAmount, 0)
  const total = subtotal + vatTotal

  const invoice: Invoice = {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    organizationId: 'org1',
    clientId: data.clientId,
    client,
    invoiceNumber,
    type: (data.type as any) || 'VAT',
    status: 'DRAFT',
    issueDate: data.issueDate || new Date().toISOString(),
    saleDate: data.saleDate || new Date().toISOString(),
    dueDate: data.dueDate,
    paymentMethod: (data.paymentMethod as any) || 'BANK_TRANSFER',
    currency: data.currency || 'PLN',
    subtotal,
    vatTotal,
    total,
    paidAmount: 0,
    notes: data.notes,
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  items.forEach(item => { item.invoiceId = invoice.id })
  store.invoices.push(invoice)
  notify()
  return invoice
}

export function updateInvoiceStatus(id: string, status: string): Invoice | undefined {
  const inv = store.invoices.find(i => i.id === id)
  if (!inv) return undefined

  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
    OVERDUE: ['PAID', 'PARTIALLY_PAID', 'CANCELLED'],
    PAID: ['CORRECTED'],
    CANCELLED: [],
    CORRECTED: [],
  }

  if (!validTransitions[inv.status]?.includes(status)) {
    throw new Error(`Invalid status transition: ${inv.status} → ${status}`)
  }

  inv.status = status as any
  inv.updatedAt = new Date().toISOString()
  notify()
  return inv
}

export function deleteInvoice(id: string): boolean {
  const idx = store.invoices.findIndex(i => i.id === id)
  if (idx === -1) return false
  if (store.invoices[idx].status !== 'DRAFT') {
    throw new Error('Only draft invoices can be deleted')
  }
  store.invoices.splice(idx, 1)
  notify()
  return true
}

// ─── Expense Operations ──────────────────────────────────

export function addExpense(data: CreateExpenseInput & {
  isBillable?: boolean
  clientId?: string
  isForeignCurrency?: boolean
  originalCurrency?: string
  originalAmount?: number
}): Expense {
  const vatAmount = data.vatRate > 0 ? Math.round(data.netAmount * (data.vatRate / 100) * 100) / 100 : 0
  const grossAmount = Math.round((data.netAmount + vatAmount) * 100) / 100

  const expense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    organizationId: 'org1',
    categoryId: data.categoryId,
    description: data.description,
    date: data.date,
    netAmount: data.netAmount,
    vatRate: data.vatRate,
    vatAmount,
    grossAmount,
    currency: data.currency || 'PLN',
    notes: data.notes,
    clientId: data.clientId,
    isBillable: data.isBillable ?? false,
    isRebilled: false,
    markup: 0,
    isForeignCurrency: data.isForeignCurrency ?? false,
    originalCurrency: data.originalCurrency,
    originalAmount: data.originalAmount,
    createdAt: new Date().toISOString(),
  }

  store.expenses.push(expense)
  notify()
  return expense
}

// ─── Service Operations ──────────────────────────────────

export function addService(data: {
  name: string
  description?: string
  defaultRate?: number
  defaultUnit?: string
  defaultVatRate?: number
  category?: string
}): Service {
  const service: Service = {
    id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    organizationId: 'org1',
    name: data.name,
    description: data.description,
    defaultRate: data.defaultRate,
    defaultUnit: (data.defaultUnit as any) || 'SERVICE',
    defaultVatRate: data.defaultVatRate ?? 23,
    category: data.category,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  store.services.push(service)
  notify()
  return service
}

// ─── Payment Operations ──────────────────────────────────

export function recordPayment(invoiceId: string, amount: number, method?: string): Payment {
  const invoice = store.invoices.find(i => i.id === invoiceId)
  if (!invoice) throw new Error('Invoice not found')

  const payment: Payment = {
    id: `pay_${Date.now()}`,
    invoiceId,
    amount,
    date: new Date().toISOString(),
    method: (method as any) || 'BANK_TRANSFER',
    createdAt: new Date().toISOString(),
  }

  store.payments.push(payment)
  invoice.paidAmount += amount
  if (invoice.paidAmount >= invoice.total) {
    invoice.status = 'PAID'
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'PARTIALLY_PAID'
  }
  invoice.updatedAt = new Date().toISOString()
  notify()
  return payment
}

// ─── Initialization ──────────────────────────────────────

export function initializeStore(): void {
  if (store.initialized) return

  // Load persisted data from localStorage
  const loaded = loadFromStorage()

  // Set up default expense categories if none loaded
  if (store.expenseCategories.length === 0) {
    store.expenseCategories = [
      { id: 'ec_software', organizationId: 'org1', name: 'Software & Tools', color: '#6366f1', isDefault: true },
      { id: 'ec_office', organizationId: 'org1', name: 'Office Supplies', color: '#f59e0b', isDefault: true },
      { id: 'ec_marketing', organizationId: 'org1', name: 'Marketing', color: '#10b981', isDefault: true },
      { id: 'ec_travel', organizationId: 'org1', name: 'Travel', color: '#3b82f6', isDefault: true },
      { id: 'ec_professional', organizationId: 'org1', name: 'Professional Services', color: '#8b5cf6', isDefault: true },
      { id: 'ec_rent', organizationId: 'org1', name: 'Rent & Utilities', color: '#ef4444', isDefault: true },
    ]
  }

  store.initialized = true
  if (!loaded) persist() // Save defaults
  notify()
}

export function clearAllData(): void {
  store.company = { name: "" }
  store.settings = { displayCurrency: "EUR" }
  store.clients = []
  store.invoices = []
  store.services = []
  store.expenses = []
  store.payments = []
  store.expenseCategories = []
  store.initialized = false
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(getStorageKey()) } catch {}
  }
  notify()
}

// ─── Development Fixtures ─────────────────────────────────

export function loadDevFixtures(): void {
  // Only for development — never called in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'development') return

  // Import and apply dev fixtures
  // This is intentionally left as a manual step —
  // call loadDevFixtures() from a dev-only hook or admin action
}

// ─── Stats Helpers ────────────────────────────────────────

export function getStats() {
  const invoices = store.invoices
  const expenses = store.expenses
  const payments = store.payments

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0)
  const totalUnpaid = invoices.filter(i => ['SENT', 'DRAFT', 'PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + (i.total - i.paidAmount), 0)
  const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (i.total - i.paidAmount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.grossAmount, 0)
  const paidCount = invoices.filter(i => i.status === 'PAID').length
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length

  return {
    totalInvoiced,
    totalPaid,
    totalUnpaid,
    totalOverdue,
    totalExpenses,
    netIncome: totalPaid - totalExpenses,
    invoiceCount: invoices.length,
    paidCount,
    overdueCount,
    clientCount: store.clients.filter(c => c.isActive).length,
    averageInvoiceValue: invoices.length > 0 ? totalInvoiced / invoices.length : 0,
    paidRatio: invoices.length > 0 ? (paidCount / invoices.length) * 100 : 0,
    overdueRatio: invoices.length > 0 ? (overdueCount / invoices.length) * 100 : 0,
  }
}
