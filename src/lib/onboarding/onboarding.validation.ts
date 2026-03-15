import type { OnboardingData } from "./onboarding.types"
import { validateNIP } from "@/lib/validation/invoice.validation"

export interface StepValidation {
  valid: boolean
  errors: { field: string; message: string }[]
}

export function validateStep(step: number, data: OnboardingData): StepValidation {
  const errors: { field: string; message: string }[] = []

  switch (step) {
    case 0: // Welcome — always valid
      break

    case 1: // Company
      if (!data.company.legalName.trim()) errors.push({ field: "legalName", message: "Company legal name is required" })
      if (!data.company.email.trim()) errors.push({ field: "email", message: "Company email is required" })
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.company.email)) errors.push({ field: "email", message: "Enter a valid email address" })
      break

    case 2: // Billing
      if (!data.billing.address.trim()) errors.push({ field: "address", message: "Registered address is required" })
      if (!data.billing.city.trim()) errors.push({ field: "city", message: "City is required" })
      if (!data.billing.postalCode.trim()) errors.push({ field: "postalCode", message: "Postal code is required" })
      if (!data.billing.country.trim()) errors.push({ field: "country", message: "Country is required" })
      if (data.billing.isVatPayer && !data.billing.nip.trim()) {
        errors.push({ field: "nip", message: "NIP is required for VAT payers" })
      }
      if (data.billing.nip.trim() && !validateNIP(data.billing.nip)) {
        errors.push({ field: "nip", message: "Invalid NIP format — must be 10 digits with valid checksum" })
      }
      break

    case 3: // Banking
      if (!data.banking.accountHolder.trim()) errors.push({ field: "accountHolder", message: "Account holder name is required" })
      if (!data.banking.iban.trim() && !data.banking.accountNumber.trim()) {
        errors.push({ field: "iban", message: "Bank account number or IBAN is required" })
      }
      if (data.banking.defaultPaymentDays < 1 || data.banking.defaultPaymentDays > 365) {
        errors.push({ field: "defaultPaymentDays", message: "Payment terms must be between 1 and 365 days" })
      }
      break

    case 4: // Invoicing
      if (!data.invoicing.defaultCurrency) errors.push({ field: "defaultCurrency", message: "Default currency is required" })
      if (data.invoicing.supportedCurrencies.length === 0) errors.push({ field: "supportedCurrencies", message: "At least one currency must be selected" })
      if (!data.invoicing.numberFormat.trim()) errors.push({ field: "numberFormat", message: "Invoice number format is required" })
      break

    case 5: // Services
      if (data.services.services.length === 0) {
        errors.push({ field: "services", message: "Add at least one service you provide" })
      }
      data.services.services.forEach((svc, i) => {
        if (!svc.name.trim()) errors.push({ field: `services[${i}].name`, message: `Service ${i + 1}: name is required` })
      })
      break

    case 6: // Client prefs — optional
    case 7: // Expense prefs — optional
    case 8: // Compliance — optional
      break

    case 9: // Review — validate all required steps
      const requiredSteps = [1, 2, 3, 4, 5]
      for (const s of requiredSteps) {
        const result = validateStep(s, data)
        if (!result.valid) {
          errors.push({ field: `step_${s}`, message: `Step "${stepName(s)}" has incomplete required fields` })
        }
      }
      break
  }

  return { valid: errors.length === 0, errors }
}

function stepName(step: number): string {
  const names: Record<number, string> = {
    1: "Company", 2: "Tax & Billing", 3: "Banking",
    4: "Invoicing", 5: "Services",
  }
  return names[step] || `Step ${step}`
}

export function getRequiredSteps(): number[] {
  return [0, 1, 2, 3, 4, 5, 9]
}

export function canComplete(data: OnboardingData): { ready: boolean; missing: string[] } {
  const missing: string[] = []
  for (const step of getRequiredSteps()) {
    if (step === 0 || step === 9) continue
    const result = validateStep(step, data)
    if (!result.valid) missing.push(stepName(step))
  }
  return { ready: missing.length === 0, missing }
}
