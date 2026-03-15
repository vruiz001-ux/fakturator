import type { OnboardingState, OnboardingData, ServiceEntry } from "./onboarding.types"
import { TOTAL_STEPS } from "./onboarding.types"

// ─── Default State ────────────────────────────────────────

function createDefaultData(): OnboardingData {
  return {
    company: {
      legalName: "", tradingName: "", businessType: "", industry: "",
      description: "", website: "", email: "", phone: "", logoUrl: "",
    },
    billing: {
      address: "", city: "", postalCode: "", country: "PL", nip: "",
      regon: "", krs: "", taxResidency: "PL", isVatPayer: true, defaultVatRate: 23,
    },
    banking: {
      accountHolder: "", bankName: "", accountNumber: "", iban: "", swift: "",
      acceptedMethods: ["BANK_TRANSFER"], defaultPaymentDays: 14, latePaymentPolicy: "",
    },
    invoicing: {
      defaultCurrency: "PLN", supportedCurrencies: ["PLN"],
      invoiceLanguage: "en", numberFormat: "FV/{YYYY}/{MM}/{NNN}",
      defaultFooter: "", taxDisplayMode: "inclusive",
      issueDateLogic: "today", dueDateLogic: "net_14",
    },
    services: { categories: [], services: [] },
    clients: {
      clientTypes: [], mainCountries: ["PL"], clientCurrencies: ["PLN"],
      requiresPOReference: false, usesRebillableExpenses: false,
      preferredContactFields: ["email"],
    },
    expenses: {
      tracksClientExpenses: false, enableRebilling: false,
      autoMatchExpenses: false, rebillInEur: false,
      defaultFxMargin: 5, enableExpensifyLater: false,
    },
    compliance: {
      ksefEnabled: false, structuredInvoiceData: true,
      auditLoggingEnabled: true, offerNinjaImport: false,
      importHistoricalNow: false,
    },
  }
}

// ─── Store ────────────────────────────────────────────────

const STORAGE_KEY = "fakturator_onboarding"

let state: OnboardingState = {
  status: "NOT_STARTED",
  currentStep: 0,
  completedSteps: [],
  data: createDefaultData(),
}

type Listener = () => void
const listeners = new Set<Listener>()

function notify() { listeners.forEach((l) => l()) }

function persist() {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

// ─── Public API ───────────────────────────────────────────

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getOnboardingState(): OnboardingState {
  return state
}

export function isOnboardingComplete(): boolean {
  return state.status === "COMPLETED"
}

export function loadOnboarding(): void {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === "object" && parsed.data) {
        const defaults = createDefaultData()
        state = {
          status: parsed.status || "NOT_STARTED",
          currentStep: typeof parsed.currentStep === "number" ? parsed.currentStep : 0,
          completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
          completedAt: parsed.completedAt,
          data: {
            company: { ...defaults.company, ...(parsed.data.company || {}) },
            billing: { ...defaults.billing, ...(parsed.data.billing || {}) },
            banking: { ...defaults.banking, ...(parsed.data.banking || {}) },
            invoicing: { ...defaults.invoicing, ...(parsed.data.invoicing || {}) },
            services: { ...defaults.services, ...(parsed.data.services || {}) },
            clients: { ...defaults.clients, ...(parsed.data.clients || {}) },
            expenses: { ...defaults.expenses, ...(parsed.data.expenses || {}) },
            compliance: { ...defaults.compliance, ...(parsed.data.compliance || {}) },
          },
        }
      }
    }
  } catch {
    // Corrupted localStorage — reset
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }
  notify()
}

export function updateStepData<K extends keyof OnboardingData>(
  section: K,
  data: Partial<OnboardingData[K]>
): void {
  state.data[section] = { ...state.data[section], ...data } as OnboardingData[K]
  if (state.status === "NOT_STARTED") state.status = "IN_PROGRESS"
  persist()
  notify()
}

export function markStepComplete(stepId: number): void {
  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId)
    state.completedSteps.sort((a, b) => a - b)
  }
  persist()
  notify()
}

export function setCurrentStep(step: number): void {
  state.currentStep = Math.max(0, Math.min(step, TOTAL_STEPS - 1))
  persist()
  notify()
}

export function goToNextStep(): void {
  markStepComplete(state.currentStep)
  setCurrentStep(state.currentStep + 1)
}

export function goToPrevStep(): void {
  setCurrentStep(state.currentStep - 1)
}

export function completeOnboarding(): void {
  state.status = "COMPLETED"
  state.completedAt = new Date().toISOString()
  persist()
  notify()
}

export function resetOnboarding(): void {
  state = {
    status: "NOT_STARTED",
    currentStep: 0,
    completedSteps: [],
    data: createDefaultData(),
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
  notify()
}

// ─── Service Helpers ──────────────────────────────────────

export function addServiceEntry(service: Omit<ServiceEntry, "id">): void {
  const id = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  state.data.services.services.push({ ...service, id })
  persist()
  notify()
}

export function removeServiceEntry(id: string): void {
  state.data.services.services = state.data.services.services.filter((s) => s.id !== id)
  persist()
  notify()
}

export function updateServiceEntry(id: string, data: Partial<ServiceEntry>): void {
  const idx = state.data.services.services.findIndex((s) => s.id === id)
  if (idx !== -1) {
    state.data.services.services[idx] = { ...state.data.services.services[idx], ...data }
    persist()
    notify()
  }
}

// ─── Apply to App Store ──────────────────────────────────

export function applyOnboardingToApp(): void {
  // This function applies onboarding data to the main app store
  // Called when onboarding is completed
  const { addClient, addService, initializeStore } = require("@/lib/store/data-store")
  initializeStore()

  // Add services from onboarding
  for (const svc of state.data.services.services) {
    addService({
      name: svc.name,
      description: svc.description,
      defaultRate: svc.defaultRate ?? undefined,
      defaultUnit: svc.unit,
      defaultVatRate: svc.vatRate,
      category: svc.category,
    })
  }
}
