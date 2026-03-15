// ─── Enums ───────────────────────────────────────────────

export type InvoiceType = "VAT" | "PROFORMA" | "CORRECTION" | "ADVANCE" | "RECURRING"
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED" | "CORRECTED"
export type PaymentMethod = "BANK_TRANSFER" | "CASH" | "CARD" | "ONLINE" | "OTHER"
export type Unit = "HOUR" | "PIECE" | "SERVICE" | "PROJECT" | "MONTH" | "DAY" | "KG" | "M2" | "OTHER"
export type RecurringFrequency = "MONTHLY" | "QUARTERLY" | "YEARLY"
export type KsefStatusType = "PENDING" | "VALIDATED" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "ERROR"
export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

// ─── Core Entities ───────────────────────────────────────

export interface Organization {
  id: string
  name: string
  address?: string
  city?: string
  postalCode?: string
  country: string
  nip?: string
  phone?: string
  email?: string
  website?: string
  bankName?: string
  bankAccount?: string
  defaultCurrency: string
  defaultVatRate: number
  defaultPaymentDays: number
  logoUrl?: string
}

export interface Client {
  id: string
  organizationId: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country: string
  nip?: string
  contactPerson?: string
  notes?: string
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Computed
  invoiceCount?: number
  totalRevenue?: number
  overdueBalance?: number
}

export interface Service {
  id: string
  organizationId: string
  name: string
  description?: string
  defaultRate?: number
  defaultUnit: Unit
  defaultVatRate: number
  category?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Computed
  invoiceCount?: number
  totalRevenue?: number
}

export interface InvoiceItem {
  id?: string
  invoiceId?: string
  serviceId?: string
  service?: Service
  description: string
  quantity: number
  unit: Unit
  unitPrice: number
  vatRate: number
  netAmount: number
  vatAmount: number
  grossAmount: number
  sortOrder: number
}

export interface Invoice {
  id: string
  organizationId: string
  clientId: string
  client?: Client
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  issueDate: string
  saleDate?: string
  dueDate: string
  paymentMethod: PaymentMethod
  currency: string
  subtotal: number
  vatTotal: number
  total: number
  paidAmount: number
  notes?: string
  items: InvoiceItem[]
  payments?: Payment[]
  correctedInvoiceId?: string
  recurringRuleId?: string
  ksefReferenceId?: string
  ksefStatus?: KsefStatusType
  ksefSubmittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  date: string
  method: PaymentMethod
  reference?: string
  notes?: string
  createdAt: string
  invoice?: Invoice
}

export interface Expense {
  id: string
  organizationId: string
  supplierId?: string
  supplier?: Supplier
  categoryId?: string
  category?: ExpenseCategory
  invoiceNumber?: string
  description: string
  date: string
  netAmount: number
  vatRate: number
  vatAmount: number
  grossAmount: number
  currency: string
  notes?: string
  // Rebilling fields
  clientId?: string
  client?: Client
  isBillable: boolean
  isRebilled: boolean
  rebilledInvoiceId?: string
  rebilledAt?: string
  markup: number
  // Foreign currency fields
  isForeignCurrency: boolean
  originalCurrency?: string
  originalAmount?: number
  fxRate?: number
  convertedEurAmount?: number
  fxUpliftPercent?: number
  fxUpliftAmount?: number
  finalRebillAmount?: number
  fxLocked?: boolean
  createdAt: string
}

export interface MigrationImport {
  id: string
  organizationId: string
  source: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  fileName?: string
  totalRecords: number
  importedRecords: number
  failedRecords: number
  errors?: Record<string, unknown>
  mappings?: Record<string, string>
  importedAt?: string
  createdAt: string
}

export interface IntegrationConfig {
  id: string
  organizationId: string
  provider: string
  isActive: boolean
  config?: Record<string, unknown>
  lastSyncAt?: string
  createdAt: string
}

export interface ExpenseCategory {
  id: string
  organizationId: string
  name: string
  color: string
  icon?: string
  isDefault: boolean
}

export interface Supplier {
  id: string
  organizationId: string
  name: string
  nip?: string
  address?: string
  city?: string
  postalCode?: string
  country: string
  email?: string
  phone?: string
  isActive: boolean
}

export interface RecurringRule {
  id: string
  organizationId: string
  clientId: string
  client?: Client
  frequency: RecurringFrequency
  nextRunDate: string
  isActive: boolean
  templateData: Record<string, unknown>
}

export interface KsefSubmission {
  id: string
  organizationId: string
  invoiceId: string
  invoice?: Invoice
  referenceId?: string
  status: KsefStatusType
  submittedAt?: string
  response?: Record<string, unknown>
  errors?: Record<string, unknown>
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  organizationId: string
  userId: string
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
  createdAt: string
}

// ─── Dashboard & Analytics ───────────────────────────────

export interface DashboardMetrics {
  totalInvoiced: number
  totalPaid: number
  totalUnpaid: number
  totalOverdue: number
  revenueThisPeriod: number
  expensesThisPeriod: number
  netIncome: number
  outstandingReceivables: number
  averageInvoiceValue: number
  totalInvoiceCount: number
  paidCount: number
  unpaidCount: number
  overdueCount: number
  paidRatio: number
  overdueRatio: number
  revenueByMonth: MonthlyRevenue[]
  revenueByClient: ClientRevenue[]
  revenueByService: ServiceRevenue[]
  topClients: ClientRevenue[]
  invoiceStatusBreakdown: StatusBreakdown[]
  expensesByCategory: CategoryExpense[]
  recentPayments: Payment[]
  upcomingDueDates: Invoice[]
  cashflowTrend: CashflowPoint[]
  vatSummary: VatSummary
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface ClientRevenue {
  clientId: string
  clientName: string
  revenue: number
  invoiceCount: number
  paidAmount: number
  overdueAmount: number
}

export interface ServiceRevenue {
  serviceId: string
  serviceName: string
  revenue: number
  invoiceCount: number
  averageValue: number
}

export interface StatusBreakdown {
  status: InvoiceStatus
  count: number
  total: number
}

export interface CategoryExpense {
  categoryId: string
  categoryName: string
  color: string
  total: number
  count: number
}

export interface CashflowPoint {
  date: string
  inflow: number
  outflow: number
  balance: number
}

export interface VatSummary {
  outputVat: number
  inputVat: number
  vatDue: number
  byRate: { rate: number; output: number; input: number }[]
}

// ─── Form Types ──────────────────────────────────────────

export interface CreateInvoiceInput {
  clientId: string
  type: InvoiceType
  issueDate: string
  saleDate?: string
  dueDate: string
  paymentMethod: PaymentMethod
  currency: string
  notes?: string
  items: Omit<InvoiceItem, "id" | "invoiceId">[]
}

export interface CreateClientInput {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  nip?: string
  contactPerson?: string
  notes?: string
  tags?: string[]
}

export interface CreateExpenseInput {
  supplierId?: string
  categoryId?: string
  invoiceNumber?: string
  description: string
  date: string
  netAmount: number
  vatRate: number
  currency?: string
  notes?: string
}

export interface DateRange {
  from: Date
  to: Date
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FilterOptions {
  dateRange?: DateRange
  status?: InvoiceStatus | InvoiceStatus[]
  clientId?: string
  serviceId?: string
  type?: InvoiceType
  currency?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}
