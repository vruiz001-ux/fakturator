export type AuditAction =
  | 'USER_SIGNUP' | 'ONBOARDING_COMPLETE'
  | 'COMPANY_SETTINGS_UPDATED' | 'TAX_SETTINGS_UPDATED'
  | 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'CLIENT_DELETED'
  | 'INVOICE_CREATED' | 'INVOICE_UPDATED' | 'INVOICE_VALIDATED'
  | 'INVOICE_ISSUED' | 'INVOICE_CANCELLED' | 'INVOICE_DELETED'
  | 'PAYMENT_RECORDED' | 'PAYMENT_STATUS_CHANGED'
  | 'INVOICE_EMAIL_SENT' | 'INVOICE_EMAIL_FAILED' | 'INVOICE_EMAIL_RESENT'
  | 'EXPENSE_CREATED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED'
  | 'EXPENSE_REBILLED' | 'EXPENSE_ASSIGNED_TO_CLIENT'
  | 'FX_CONVERSION_CALCULATED' | 'FX_CONVERSION_LOCKED'
  | 'MIGRATION_STARTED' | 'MIGRATION_COMPLETED' | 'MIGRATION_FAILED'
  | 'IMPORT_ERROR'
  | 'KSEF_VALIDATION' | 'KSEF_SUBMISSION' | 'KSEF_STATUS_CHANGED'
  | 'SETTINGS_CHANGED' | 'DELIVERY_SETTINGS_CHANGED' | 'FX_SETTINGS_CHANGED'
  | 'SERVICE_CREATED' | 'SERVICE_UPDATED' | 'SERVICE_DELETED'

export type EntityType =
  | 'USER' | 'ORGANIZATION' | 'CLIENT' | 'INVOICE' | 'INVOICE_ITEM'
  | 'EXPENSE' | 'PAYMENT' | 'SERVICE' | 'MIGRATION' | 'KSEF_SUBMISSION'
  | 'SETTINGS' | 'EMAIL_EVENT' | 'FX_RATE'

export interface AuditEntry {
  id: string
  action: AuditAction
  entityType: EntityType
  entityId?: string
  actor: string // userId or 'SYSTEM'
  timestamp: Date
  details?: Record<string, any>
  before?: Record<string, any>
  after?: Record<string, any>
  success: boolean
  errorMessage?: string
}

// In-memory audit store (replace with DB in production)
const auditLog: AuditEntry[] = []

export function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const record: AuditEntry = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
  }
  auditLog.unshift(record)
  // Keep last 10000 entries in memory
  if (auditLog.length > 10000) auditLog.length = 10000
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUDIT] ${record.action} on ${record.entityType}${record.entityId ? `:${record.entityId}` : ''} by ${record.actor} — ${record.success ? 'OK' : 'FAIL'}`)
  }
  return record
}

export function getAuditLog(filters?: {
  entityType?: EntityType
  entityId?: string
  action?: AuditAction
  actor?: string
  limit?: number
  offset?: number
}): AuditEntry[] {
  let results = [...auditLog]
  if (filters?.entityType) results = results.filter(r => r.entityType === filters.entityType)
  if (filters?.entityId) results = results.filter(r => r.entityId === filters.entityId)
  if (filters?.action) results = results.filter(r => r.action === filters.action)
  if (filters?.actor) results = results.filter(r => r.actor === filters.actor)
  const offset = filters?.offset || 0
  const limit = filters?.limit || 50
  return results.slice(offset, offset + limit)
}

export function getAuditCount(): number {
  return auditLog.length
}

export function clearAuditLog(): void {
  auditLog.length = 0
}
