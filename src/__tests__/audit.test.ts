import { logAudit, getAuditLog, getAuditCount, clearAuditLog } from "../lib/audit/audit.service"

beforeEach(() => {
  clearAuditLog()
})

describe("Audit Service", () => {
  test("logs an audit entry", () => {
    const entry = logAudit({
      action: "INVOICE_CREATED",
      entityType: "INVOICE",
      entityId: "inv_001",
      actor: "user_001",
      success: true,
      details: { invoiceNumber: "FV/2026/03/001" },
    })

    expect(entry.id).toBeDefined()
    expect(entry.timestamp).toBeInstanceOf(Date)
    expect(entry.action).toBe("INVOICE_CREATED")
    expect(entry.entityId).toBe("inv_001")
    expect(entry.success).toBe(true)
  })

  test("retrieves audit log with filters", () => {
    logAudit({ action: "INVOICE_CREATED", entityType: "INVOICE", entityId: "inv_001", actor: "user_001", success: true })
    logAudit({ action: "CLIENT_CREATED", entityType: "CLIENT", entityId: "cl_001", actor: "user_001", success: true })
    logAudit({ action: "INVOICE_ISSUED", entityType: "INVOICE", entityId: "inv_001", actor: "user_001", success: true })

    const all = getAuditLog()
    expect(all).toHaveLength(3)

    const invoiceOnly = getAuditLog({ entityType: "INVOICE" })
    expect(invoiceOnly).toHaveLength(2)

    const byEntity = getAuditLog({ entityId: "inv_001" })
    expect(byEntity).toHaveLength(2)
  })

  test("records count correctly", () => {
    expect(getAuditCount()).toBe(0)
    logAudit({ action: "USER_SIGNUP", entityType: "USER", actor: "SYSTEM", success: true })
    expect(getAuditCount()).toBe(1)
  })

  test("logs failure entries", () => {
    const entry = logAudit({
      action: "INVOICE_EMAIL_FAILED",
      entityType: "EMAIL_EVENT",
      entityId: "inv_001",
      actor: "SYSTEM",
      success: false,
      errorMessage: "SMTP connection refused",
    })

    expect(entry.success).toBe(false)
    expect(entry.errorMessage).toBe("SMTP connection refused")
  })

  test("captures before/after values", () => {
    const entry = logAudit({
      action: "INVOICE_UPDATED",
      entityType: "INVOICE",
      entityId: "inv_001",
      actor: "user_001",
      success: true,
      before: { status: "DRAFT" },
      after: { status: "SENT" },
    })

    expect(entry.before).toEqual({ status: "DRAFT" })
    expect(entry.after).toEqual({ status: "SENT" })
  })

  test("respects limit and offset", () => {
    for (let i = 0; i < 10; i++) {
      logAudit({ action: "INVOICE_CREATED", entityType: "INVOICE", entityId: `inv_${i}`, actor: "user_001", success: true })
    }

    const page1 = getAuditLog({ limit: 3, offset: 0 })
    expect(page1).toHaveLength(3)

    const page2 = getAuditLog({ limit: 3, offset: 3 })
    expect(page2).toHaveLength(3)
    expect(page2[0].entityId).not.toBe(page1[0].entityId)
  })
})
