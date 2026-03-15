import { validateStep, canComplete } from "../lib/onboarding/onboarding.validation"
import type { OnboardingData } from "../lib/onboarding/onboarding.types"

function createValidData(): OnboardingData {
  return {
    company: {
      legalName: "Test Sp. z o.o.",
      tradingName: "",
      businessType: "limited",
      industry: "technology",
      description: "",
      website: "",
      email: "test@company.pl",
      phone: "",
      logoUrl: "",
    },
    billing: {
      address: "ul. Testowa 1",
      city: "Warszawa",
      postalCode: "00-001",
      country: "PL",
      nip: "1234563218",
      regon: "",
      krs: "",
      taxResidency: "PL",
      isVatPayer: true,
      defaultVatRate: 23,
    },
    banking: {
      accountHolder: "Test Sp. z o.o.",
      bankName: "mBank",
      accountNumber: "",
      iban: "PL12345678901234567890123456",
      swift: "BREXPLPW",
      acceptedMethods: ["BANK_TRANSFER"],
      defaultPaymentDays: 14,
      latePaymentPolicy: "",
    },
    invoicing: {
      defaultCurrency: "PLN",
      supportedCurrencies: ["PLN", "EUR"],
      invoiceLanguage: "en",
      numberFormat: "FV/{YYYY}/{MM}/{NNN}",
      defaultFooter: "",
      taxDisplayMode: "inclusive",
      issueDateLogic: "today",
      dueDateLogic: "net_14",
    },
    services: {
      categories: ["Development"],
      services: [
        {
          id: "svc1",
          name: "Web Development",
          description: "Full-stack development",
          category: "Development",
          unit: "HOUR",
          defaultRate: 200,
          pricingModel: "hourly",
          vatRate: 23,
          isTaxable: true,
          isRecurringEligible: false,
        },
      ],
    },
    clients: {
      clientTypes: ["B2B"],
      mainCountries: ["PL"],
      clientCurrencies: ["PLN"],
      requiresPOReference: false,
      usesRebillableExpenses: false,
      preferredContactFields: ["email"],
    },
    expenses: {
      tracksClientExpenses: false,
      enableRebilling: false,
      autoMatchExpenses: false,
      rebillInEur: false,
      defaultFxMargin: 5,
      enableExpensifyLater: false,
    },
    compliance: {
      ksefEnabled: false,
      structuredInvoiceData: true,
      auditLoggingEnabled: true,
      offerNinjaImport: false,
      importHistoricalNow: false,
    },
  }
}

describe("Onboarding Validation", () => {
  test("welcome step is always valid", () => {
    const result = validateStep(0, createValidData())
    expect(result.valid).toBe(true)
  })

  test("company step requires legal name and email", () => {
    const data = createValidData()
    data.company.legalName = ""
    data.company.email = ""
    const result = validateStep(1, data)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  test("company step validates email format", () => {
    const data = createValidData()
    data.company.email = "not-an-email"
    const result = validateStep(1, data)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "email")).toBe(true)
  })

  test("billing step requires address, city, postal code", () => {
    const data = createValidData()
    data.billing.address = ""
    data.billing.city = ""
    const result = validateStep(2, data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  test("billing step requires NIP for VAT payers", () => {
    const data = createValidData()
    data.billing.isVatPayer = true
    data.billing.nip = ""
    const result = validateStep(2, data)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "nip")).toBe(true)
  })

  test("billing step validates NIP checksum", () => {
    const data = createValidData()
    data.billing.nip = "1234567890" // Invalid checksum
    const result = validateStep(2, data)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes("Invalid NIP"))).toBe(true)
  })

  test("banking step requires account holder and IBAN", () => {
    const data = createValidData()
    data.banking.accountHolder = ""
    data.banking.iban = ""
    const result = validateStep(3, data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  test("invoicing step requires currency and number format", () => {
    const data = createValidData()
    data.invoicing.defaultCurrency = ""
    data.invoicing.supportedCurrencies = []
    const result = validateStep(4, data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  test("services step requires at least one service", () => {
    const data = createValidData()
    data.services.services = []
    const result = validateStep(5, data)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "services")).toBe(true)
  })

  test("services step validates service names", () => {
    const data = createValidData()
    data.services.services[0].name = ""
    const result = validateStep(5, data)
    expect(result.valid).toBe(false)
  })

  test("optional steps (6, 7, 8) are always valid", () => {
    const data = createValidData()
    expect(validateStep(6, data).valid).toBe(true)
    expect(validateStep(7, data).valid).toBe(true)
    expect(validateStep(8, data).valid).toBe(true)
  })

  test("canComplete returns ready for valid data", () => {
    const result = canComplete(createValidData())
    expect(result.ready).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  test("canComplete returns missing sections for incomplete data", () => {
    const data = createValidData()
    data.company.legalName = ""
    data.services.services = []
    const result = canComplete(data)
    expect(result.ready).toBe(false)
    expect(result.missing.length).toBeGreaterThan(0)
  })
})
