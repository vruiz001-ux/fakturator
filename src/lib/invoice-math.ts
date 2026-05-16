// Pure invoice arithmetic. No I/O — fully unit-testable.
// Shared by the create form, the Ninja importer, and credit notes.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface LineItemInput {
  quantity: number
  unitPrice: number
  vatRate: number
  /** Ninja "uses_inclusive_taxes" — unitPrice already contains VAT */
  inclusive?: boolean
}

export interface ComputedLineItem {
  netAmount: number
  vatAmount: number
  grossAmount: number
}

export function computeLineItem(it: LineItemInput): ComputedLineItem {
  const qty = Number(it.quantity) || 0
  const unitPrice = Number(it.unitPrice) || 0
  const vatRate = Number(it.vatRate) || 0

  if (it.inclusive && vatRate > 0) {
    const grossAmount = round2(qty * unitPrice)
    const netAmount = round2(grossAmount / (1 + vatRate / 100))
    return { netAmount, vatAmount: round2(grossAmount - netAmount), grossAmount }
  }
  const netAmount = round2(qty * unitPrice)
  const vatAmount = vatRate > 0 ? round2(netAmount * (vatRate / 100)) : 0
  return { netAmount, vatAmount, grossAmount: round2(netAmount + vatAmount) }
}

export interface InvoiceTotals {
  subtotal: number
  vatTotal: number
  total: number
}

export function sumTotals(items: ComputedLineItem[]): InvoiceTotals {
  return {
    subtotal: round2(items.reduce((s, x) => s + x.netAmount, 0)),
    vatTotal: round2(items.reduce((s, x) => s + x.vatAmount, 0)),
    total: round2(items.reduce((s, x) => s + x.grossAmount, 0)),
  }
}
