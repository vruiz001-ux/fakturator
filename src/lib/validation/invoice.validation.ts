export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export function validateInvoice(invoice: {
  clientId?: string
  invoiceNumber?: string
  issueDate?: string | Date
  dueDate?: string | Date
  items?: Array<{
    description?: string
    quantity?: number
    unitPrice?: number
    vatRate?: number
    netAmount?: number
    vatAmount?: number
    grossAmount?: number
  }>
  subtotal?: number
  vatTotal?: number
  total?: number
  currency?: string
  paymentMethod?: string
}, sellerNip?: string, buyerNip?: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Required fields
  if (!invoice.clientId) errors.push({ field: 'clientId', message: 'Client is required', code: 'REQUIRED' })
  if (!invoice.invoiceNumber) errors.push({ field: 'invoiceNumber', message: 'Invoice number is required', code: 'REQUIRED' })
  if (!invoice.issueDate) errors.push({ field: 'issueDate', message: 'Issue date is required', code: 'REQUIRED' })
  if (!invoice.dueDate) errors.push({ field: 'dueDate', message: 'Due date is required', code: 'REQUIRED' })
  if (!invoice.currency) errors.push({ field: 'currency', message: 'Currency is required', code: 'REQUIRED' })
  if (!invoice.paymentMethod) errors.push({ field: 'paymentMethod', message: 'Payment method is required', code: 'REQUIRED' })

  // Date validation
  if (invoice.issueDate && invoice.dueDate) {
    const issue = new Date(invoice.issueDate)
    const due = new Date(invoice.dueDate)
    if (due < issue) errors.push({ field: 'dueDate', message: 'Due date must be after issue date', code: 'DATE_ORDER' })
  }

  // Items validation
  if (!invoice.items || invoice.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one line item is required', code: 'REQUIRED' })
  } else {
    invoice.items.forEach((item, i) => {
      if (!item.description?.trim()) errors.push({ field: `items[${i}].description`, message: `Line item ${i + 1}: description is required`, code: 'REQUIRED' })
      if (!item.quantity || item.quantity <= 0) errors.push({ field: `items[${i}].quantity`, message: `Line item ${i + 1}: quantity must be positive`, code: 'INVALID_VALUE' })
      if (item.unitPrice === undefined || item.unitPrice < 0) errors.push({ field: `items[${i}].unitPrice`, message: `Line item ${i + 1}: unit price cannot be negative`, code: 'INVALID_VALUE' })

      // Verify calculation integrity
      if (item.quantity && item.unitPrice !== undefined) {
        const expectedNet = Math.round(item.quantity * item.unitPrice * 100) / 100
        if (item.netAmount !== undefined && Math.abs(item.netAmount - expectedNet) > 0.01) {
          errors.push({ field: `items[${i}].netAmount`, message: `Line item ${i + 1}: net amount calculation mismatch (expected ${expectedNet}, got ${item.netAmount})`, code: 'CALC_MISMATCH' })
        }
      }

      if (item.netAmount !== undefined && item.vatRate !== undefined) {
        const expectedVat = item.vatRate > 0 ? Math.round(item.netAmount * (item.vatRate / 100) * 100) / 100 : 0
        if (item.vatAmount !== undefined && Math.abs(item.vatAmount - expectedVat) > 0.01) {
          warnings.push({ field: `items[${i}].vatAmount`, message: `Line item ${i + 1}: VAT amount may be miscalculated (expected ${expectedVat}, got ${item.vatAmount})`, code: 'CALC_WARNING' })
        }
      }
    })

    // Verify totals
    if (invoice.items.length > 0) {
      const calcSubtotal = invoice.items.reduce((s, i) => s + (i.netAmount || 0), 0)
      const calcVatTotal = invoice.items.reduce((s, i) => s + (i.vatAmount || 0), 0)
      const calcTotal = calcSubtotal + calcVatTotal

      if (invoice.subtotal !== undefined && Math.abs(invoice.subtotal - calcSubtotal) > 0.01) {
        errors.push({ field: 'subtotal', message: `Subtotal mismatch: expected ${calcSubtotal.toFixed(2)}, got ${invoice.subtotal.toFixed(2)}`, code: 'TOTAL_MISMATCH' })
      }
      if (invoice.total !== undefined && Math.abs(invoice.total - calcTotal) > 0.01) {
        errors.push({ field: 'total', message: `Total mismatch: expected ${calcTotal.toFixed(2)}, got ${invoice.total.toFixed(2)}`, code: 'TOTAL_MISMATCH' })
      }
    }
  }

  // NIP validation
  if (sellerNip && !validateNIP(sellerNip)) {
    errors.push({ field: 'sellerNip', message: 'Invalid seller NIP format', code: 'INVALID_NIP' })
  }
  if (buyerNip && !validateNIP(buyerNip)) {
    warnings.push({ field: 'buyerNip', message: 'Buyer NIP format may be invalid', code: 'INVALID_NIP' })
  }

  // Currency validation
  const validCurrencies = ['PLN', 'EUR', 'USD', 'GBP', 'CHF']
  if (invoice.currency && !validCurrencies.includes(invoice.currency)) {
    errors.push({ field: 'currency', message: `Unsupported currency: ${invoice.currency}`, code: 'INVALID_CURRENCY' })
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateNIP(nip: string): boolean {
  const clean = nip.replace(/[\s-]/g, '')
  if (clean.length !== 10 || !/^\d{10}$/.test(clean)) return false

  // NIP checksum validation (Polish algorithm)
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i]) * weights[i]
  }
  return sum % 11 === parseInt(clean[9])
}

export function validateInvoiceStateTransition(currentStatus: string, newStatus: string): { valid: boolean; reason?: string } {
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
    OVERDUE: ['PAID', 'PARTIALLY_PAID', 'CANCELLED'],
    PAID: ['CORRECTED'],
    CANCELLED: [],
    CORRECTED: [],
  }

  const allowed = validTransitions[currentStatus]
  if (!allowed) return { valid: false, reason: `Unknown current status: ${currentStatus}` }
  if (!allowed.includes(newStatus)) return { valid: false, reason: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}` }
  return { valid: true }
}
