// ─── Onboarding Data Model ────────────────────────────────

export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

export interface OnboardingState {
  status: OnboardingStatus
  currentStep: number
  completedSteps: number[]
  completedAt?: string
  data: OnboardingData
}

export interface OnboardingData {
  company: CompanySetup
  billing: BillingSetup
  banking: BankingSetup
  invoicing: InvoicingSetup
  services: ServicesSetup
  clients: ClientPreferences
  expenses: ExpensePreferences
  compliance: ComplianceSetup
}

export interface CompanySetup {
  legalName: string
  tradingName: string
  businessType: string
  industry: string
  description: string
  website: string
  email: string
  phone: string
  logoUrl: string
}

export interface BillingSetup {
  address: string
  city: string
  postalCode: string
  country: string
  nip: string
  regon: string
  krs: string
  taxResidency: string
  isVatPayer: boolean
  defaultVatRate: number
}

export interface BankingSetup {
  accountHolder: string
  bankName: string
  accountNumber: string
  iban: string
  swift: string
  acceptedMethods: string[]
  defaultPaymentDays: number
  latePaymentPolicy: string
}

export interface InvoicingSetup {
  defaultCurrency: string
  supportedCurrencies: string[]
  invoiceLanguage: string
  numberFormat: string
  defaultFooter: string
  taxDisplayMode: string
  issueDateLogic: string
  dueDateLogic: string
}

export interface ServiceEntry {
  id: string
  name: string
  description: string
  category: string
  unit: string
  defaultRate: number | null
  pricingModel: string
  vatRate: number
  isTaxable: boolean
  isRecurringEligible: boolean
}

export interface ServicesSetup {
  categories: string[]
  services: ServiceEntry[]
}

export interface ClientPreferences {
  clientTypes: string[]
  mainCountries: string[]
  clientCurrencies: string[]
  requiresPOReference: boolean
  usesRebillableExpenses: boolean
  preferredContactFields: string[]
}

export interface ExpensePreferences {
  tracksClientExpenses: boolean
  enableRebilling: boolean
  autoMatchExpenses: boolean
  rebillInEur: boolean
  defaultFxMargin: number
  enableExpensifyLater: boolean
}

export interface ComplianceSetup {
  ksefEnabled: boolean
  structuredInvoiceData: boolean
  auditLoggingEnabled: boolean
  offerNinjaImport: boolean
  importHistoricalNow: boolean
}

// ─── Step Definition ──────────────────────────────────────

export interface OnboardingStepDef {
  id: number
  key: string
  title: string
  description: string
  icon: string
  required: boolean
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: 0, key: "welcome", title: "Welcome", description: "Workspace setup", icon: "Sparkles", required: true },
  { id: 1, key: "company", title: "Company", description: "Legal & contact details", icon: "Building2", required: true },
  { id: 2, key: "billing", title: "Tax & Billing", description: "VAT, NIP & address", icon: "Receipt", required: true },
  { id: 3, key: "banking", title: "Banking", description: "Accounts & payment terms", icon: "CreditCard", required: true },
  { id: 4, key: "invoicing", title: "Invoicing", description: "Currencies & defaults", icon: "FileText", required: true },
  { id: 5, key: "services", title: "Services", description: "What you sell", icon: "Briefcase", required: true },
  { id: 6, key: "clients", title: "Clients", description: "Client preferences", icon: "Users", required: false },
  { id: 7, key: "expenses", title: "Expenses", description: "Rebilling setup", icon: "Wallet", required: false },
  { id: 8, key: "compliance", title: "Compliance", description: "KSeF & audit", icon: "Shield", required: false },
  { id: 9, key: "review", title: "Review", description: "Confirm & launch", icon: "CheckCircle2", required: true },
]

export const TOTAL_STEPS = ONBOARDING_STEPS.length
