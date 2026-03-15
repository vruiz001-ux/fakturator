export interface ExpenseValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string; code: string }>
}

export function validateExpense(expense: {
  description?: string
  date?: string
  netAmount?: number
  vatRate?: number
  currency?: string
  categoryId?: string
}): ExpenseValidationResult {
  const errors: Array<{ field: string; message: string; code: string }> = []

  if (!expense.description?.trim()) errors.push({ field: 'description', message: 'Description is required', code: 'REQUIRED' })
  if (!expense.date) errors.push({ field: 'date', message: 'Date is required', code: 'REQUIRED' })
  if (expense.netAmount === undefined || expense.netAmount <= 0) errors.push({ field: 'netAmount', message: 'Net amount must be positive', code: 'INVALID_VALUE' })
  if (expense.vatRate === undefined || expense.vatRate < 0) errors.push({ field: 'vatRate', message: 'VAT rate cannot be negative', code: 'INVALID_VALUE' })

  const validCurrencies = ['PLN', 'EUR', 'USD', 'GBP', 'CHF']
  if (expense.currency && !validCurrencies.includes(expense.currency)) {
    errors.push({ field: 'currency', message: `Unsupported currency: ${expense.currency}`, code: 'INVALID_CURRENCY' })
  }

  return { valid: errors.length === 0, errors }
}

export function validateFxRebill(expense: {
  grossAmount: number
  currency: string
  isBillable?: boolean
  isRebilled?: boolean
  fxLocked?: boolean
  clientId?: string
}): { eligible: boolean; reason?: string } {
  if (!expense.isBillable) return { eligible: false, reason: 'Expense is not marked as billable' }
  if (expense.isRebilled) return { eligible: false, reason: 'Expense has already been rebilled' }
  if (expense.fxLocked) return { eligible: false, reason: 'FX conversion is locked' }
  if (!expense.clientId) return { eligible: false, reason: 'No client assigned to this expense' }
  if (expense.grossAmount <= 0) return { eligible: false, reason: 'Expense amount must be positive' }
  return { eligible: true }
}
