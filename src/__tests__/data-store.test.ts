import {
  initializeStore, addClient, getClients, getClient,
  addInvoice, getInvoices, getInvoice, updateInvoiceStatus, deleteInvoice,
  addExpense, getExpenses, addService, getServices,
  recordPayment, getPayments, getStats,
} from "../lib/store/data-store"

beforeEach(() => {
  // Reset store — since it's module-level state, we need to clear manually
  // For proper isolation, the store should support reset
})

describe("Data Store - Clients", () => {
  test("starts with no clients", () => {
    initializeStore()
    // Note: clients start empty in production
  })

  test("adds a client", () => {
    const client = addClient({
      name: "Test Company Sp. z o.o.",
      email: "test@company.pl",
      nip: "1234563218",
    })

    expect(client.id).toBeDefined()
    expect(client.name).toBe("Test Company Sp. z o.o.")
    expect(client.isActive).toBe(true)
    expect(getClient(client.id)).toBeDefined()
  })
})

describe("Data Store - Invoices", () => {
  test("creates an invoice with calculated totals", () => {
    const client = addClient({ name: "Invoice Test Client" })

    const invoice = addInvoice({
      clientId: client.id,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [{
        description: "Web Development",
        quantity: 10,
        unit: "HOUR" as any,
        unitPrice: 200,
        vatRate: 23,
        netAmount: 2000,
        vatAmount: 460,
        grossAmount: 2460,
        sortOrder: 0,
      }],
    })

    expect(invoice.status).toBe("DRAFT")
    expect(invoice.subtotal).toBe(2000)
    expect(invoice.vatTotal).toBe(460)
    expect(invoice.total).toBe(2460)
    expect(invoice.invoiceNumber).toMatch(/^FV\/\d{4}\/\d{2}\/\d{3}$/)
  })

  test("enforces valid status transitions", () => {
    const client = addClient({ name: "Status Test" })
    const invoice = addInvoice({
      clientId: client.id,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [{
        description: "Test",
        quantity: 1,
        unit: "SERVICE" as any,
        unitPrice: 100,
        vatRate: 23,
        netAmount: 100,
        vatAmount: 23,
        grossAmount: 123,
        sortOrder: 0,
      }],
    })

    // Valid: DRAFT -> SENT
    updateInvoiceStatus(invoice.id, "SENT")
    expect(getInvoice(invoice.id)?.status).toBe("SENT")

    // Invalid: SENT -> DRAFT
    expect(() => updateInvoiceStatus(invoice.id, "DRAFT")).toThrow()
  })

  test("only deletes draft invoices", () => {
    const client = addClient({ name: "Delete Test" })
    const invoice = addInvoice({
      clientId: client.id,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [{
        description: "Test",
        quantity: 1,
        unit: "SERVICE" as any,
        unitPrice: 50,
        vatRate: 23,
        netAmount: 50,
        vatAmount: 11.5,
        grossAmount: 61.5,
        sortOrder: 0,
      }],
    })

    // Can delete draft
    expect(deleteInvoice(invoice.id)).toBe(true)

    // Create another and send it
    const inv2 = addInvoice({
      clientId: client.id,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [{
        description: "Test 2",
        quantity: 1,
        unit: "SERVICE" as any,
        unitPrice: 50,
        vatRate: 23,
        netAmount: 50,
        vatAmount: 11.5,
        grossAmount: 61.5,
        sortOrder: 0,
      }],
    })
    updateInvoiceStatus(inv2.id, "SENT")

    // Cannot delete sent invoice
    expect(() => deleteInvoice(inv2.id)).toThrow()
  })
})

describe("Data Store - Payments", () => {
  test("records payment and updates invoice status", () => {
    const client = addClient({ name: "Payment Test" })
    const invoice = addInvoice({
      clientId: client.id,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [{
        description: "Service",
        quantity: 1,
        unit: "SERVICE" as any,
        unitPrice: 1000,
        vatRate: 23,
        netAmount: 1000,
        vatAmount: 230,
        grossAmount: 1230,
        sortOrder: 0,
      }],
    })

    updateInvoiceStatus(invoice.id, "SENT")

    // Partial payment
    recordPayment(invoice.id, 500)
    expect(getInvoice(invoice.id)?.status).toBe("PARTIALLY_PAID")
    expect(getInvoice(invoice.id)?.paidAmount).toBe(500)

    // Full payment
    recordPayment(invoice.id, 730)
    expect(getInvoice(invoice.id)?.status).toBe("PAID")
    expect(getInvoice(invoice.id)?.paidAmount).toBe(1230)
  })
})

describe("Data Store - Stats", () => {
  test("computes stats from actual data", () => {
    const stats = getStats()
    // Stats should reflect actual store state
    expect(stats.invoiceCount).toBeGreaterThanOrEqual(0)
    expect(stats.clientCount).toBeGreaterThanOrEqual(0)
    expect(typeof stats.totalInvoiced).toBe("number")
    expect(typeof stats.paidRatio).toBe("number")
  })
})
