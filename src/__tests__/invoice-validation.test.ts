import { validateInvoice, validateNIP, validateInvoiceStateTransition } from "../lib/validation/invoice.validation"

describe("Invoice Validation", () => {
  const validInvoice = {
    clientId: "cl1",
    invoiceNumber: "FV/2026/03/001",
    issueDate: "2026-03-01",
    dueDate: "2026-03-15",
    currency: "PLN",
    paymentMethod: "BANK_TRANSFER",
    items: [
      {
        description: "Web Development",
        quantity: 10,
        unitPrice: 200,
        vatRate: 23,
        netAmount: 2000,
        vatAmount: 460,
        grossAmount: 2460,
      },
    ],
    subtotal: 2000,
    vatTotal: 460,
    total: 2460,
  }

  test("accepts a valid invoice", () => {
    const result = validateInvoice(validInvoice)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test("rejects invoice without client", () => {
    const result = validateInvoice({ ...validInvoice, clientId: undefined })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "clientId")).toBe(true)
  })

  test("rejects invoice without items", () => {
    const result = validateInvoice({ ...validInvoice, items: [] })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === "REQUIRED" && e.field === "items")).toBe(true)
  })

  test("rejects invoice with due date before issue date", () => {
    const result = validateInvoice({
      ...validInvoice,
      issueDate: "2026-03-15",
      dueDate: "2026-03-01",
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === "DATE_ORDER")).toBe(true)
  })

  test("detects line item calculation mismatch", () => {
    const result = validateInvoice({
      ...validInvoice,
      items: [{ ...validInvoice.items[0], netAmount: 9999 }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === "CALC_MISMATCH")).toBe(true)
  })

  test("detects total mismatch", () => {
    const result = validateInvoice({ ...validInvoice, total: 9999 })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === "TOTAL_MISMATCH")).toBe(true)
  })

  test("rejects invalid currency", () => {
    const result = validateInvoice({ ...validInvoice, currency: "BTC" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.code === "INVALID_CURRENCY")).toBe(true)
  })

  test("handles zero VAT rate correctly", () => {
    const result = validateInvoice({
      ...validInvoice,
      items: [{
        description: "Export service",
        quantity: 1,
        unitPrice: 1000,
        vatRate: 0,
        netAmount: 1000,
        vatAmount: 0,
        grossAmount: 1000,
      }],
      subtotal: 1000,
      vatTotal: 0,
      total: 1000,
    })
    expect(result.valid).toBe(true)
  })
})

describe("NIP Validation", () => {
  test("accepts valid NIP", () => {
    expect(validateNIP("1234563218")).toBe(true)
  })

  test("accepts NIP with dashes", () => {
    expect(validateNIP("123-456-32-18")).toBe(true)
  })

  test("rejects NIP with wrong length", () => {
    expect(validateNIP("12345")).toBe(false)
  })

  test("rejects NIP with invalid checksum", () => {
    expect(validateNIP("1234567890")).toBe(false)
  })

  test("rejects non-numeric NIP", () => {
    expect(validateNIP("ABCDEFGHIJ")).toBe(false)
  })
})

describe("Invoice State Transitions", () => {
  test("allows DRAFT to SENT", () => {
    expect(validateInvoiceStateTransition("DRAFT", "SENT").valid).toBe(true)
  })

  test("allows SENT to PAID", () => {
    expect(validateInvoiceStateTransition("SENT", "PAID").valid).toBe(true)
  })

  test("prevents PAID to DRAFT", () => {
    const result = validateInvoiceStateTransition("PAID", "DRAFT")
    expect(result.valid).toBe(false)
  })

  test("prevents CANCELLED to any state", () => {
    expect(validateInvoiceStateTransition("CANCELLED", "SENT").valid).toBe(false)
    expect(validateInvoiceStateTransition("CANCELLED", "DRAFT").valid).toBe(false)
  })

  test("allows PAID to CORRECTED", () => {
    expect(validateInvoiceStateTransition("PAID", "CORRECTED").valid).toBe(true)
  })

  test("allows SENT to OVERDUE", () => {
    expect(validateInvoiceStateTransition("SENT", "OVERDUE").valid).toBe(true)
  })
})
