// @ts-nocheck
export interface ParsedInvoice {
  clientName?: string
  serviceDescription?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  vatRate?: number
  dueDays?: number
  currency?: string
}

export function parseNaturalLanguageInvoice(prompt: string): ParsedInvoice {
  const result: ParsedInvoice = {}
  const text = prompt.toLowerCase()

  // Extract client name - "for [Client Name]"
  const forMatch = prompt.match(/(?:for|dla)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż.]+)*(?:\s+(?:sp\.?\s*z\s*o\.?o\.?|s\.?a\.?|sp\.?j\.?))?)/i)
  if (forMatch) result.clientName = forMatch[1].trim()

  // Extract amount - "X,XXX PLN" or "X PLN"
  const amountMatch = text.match(/(\d[\d\s,.]*)\s*(?:pln|zł|eur|usd|gbp)/i)
  if (amountMatch) {
    result.unitPrice = parseFloat(amountMatch[1].replace(/\s/g, "").replace(",", "."))
  }

  // Extract quantity and unit - "X hours/godzin" or "X h"
  const qtyMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:hours?|godzin|hrs?|h\b)/i)
  if (qtyMatch) {
    result.quantity = parseFloat(qtyMatch[1].replace(",", "."))
    result.unit = "HOUR"
  }

  // If we have quantity and total amount, calculate unit price
  if (result.quantity && result.unitPrice) {
    // Check if the amount looks like a total (>= quantity * 50)
    if (result.unitPrice >= result.quantity * 50) {
      // It's likely a total, not a unit price
      result.unitPrice = result.unitPrice / result.quantity
    }
  }

  // If no quantity found, check for "at X PLN" pattern (rate)
  if (!result.quantity) {
    const rateMatch = text.match(/(?:at|po|@)\s*(\d[\d\s,.]*)\s*(?:pln|zł|eur|usd|gbp)?(?:\s*(?:per|\/|za)\s*(?:hour|h|godzin|day|month))?/i)
    if (rateMatch) {
      result.unitPrice = parseFloat(rateMatch[1].replace(/\s/g, "").replace(",", "."))
    }
    // Default to 1 if amount but no quantity
    result.quantity = result.quantity || 1
    result.unit = result.unit || "SERVICE"
  }

  // Extract VAT rate
  const vatMatch = text.match(/(\d+)\s*%\s*(?:vat|stawka)/i) || text.match(/vat\s*(\d+)\s*%?/i)
  if (vatMatch) {
    result.vatRate = parseInt(vatMatch[1])
  } else {
    result.vatRate = 23 // Default Polish VAT
  }

  // Extract due days
  const dueMatch = text.match(/(?:due|termin|płatność)\s*(?:in|za|w ciągu)?\s*(\d+)\s*(?:days?|dni)/i)
  if (dueMatch) {
    result.dueDays = parseInt(dueMatch[1])
  } else {
    result.dueDays = 14 // Default
  }

  // Extract service description
  const servicePatterns = [
    /(?:for|za)\s+\w+(?:\s+\w+)*?\s+(?:for|za)\s+(.+?)(?:,|\d|$)/i,
    /(?:web\s*(?:development|design|dev))/i,
    /(?:consulting|konsulting)/i,
    /(?:ui\/ux|design|projekt)/i,
    /(?:development|programowanie)/i,
    /(?:maintenance|utrzymanie)/i,
    /(?:marketing|seo)/i,
  ]
  for (const pattern of servicePatterns) {
    const match = prompt.match(pattern)
    if (match) {
      result.serviceDescription = match[1] || match[0]
      break
    }
  }

  // Currency
  if (text.includes("eur")) result.currency = "EUR"
  else if (text.includes("usd") || text.includes("$")) result.currency = "USD"
  else if (text.includes("gbp") || text.includes("£")) result.currency = "GBP"
  else result.currency = "PLN"

  return result
}

export function suggestInvoiceFields(partialData: any) {
  const suggestions: Record<string, any> = {}

  if (!partialData.vatRate) suggestions.vatRate = 23
  if (!partialData.paymentMethod) suggestions.paymentMethod = "BANK_TRANSFER"
  if (!partialData.currency) suggestions.currency = "PLN"
  if (!partialData.dueDays) suggestions.dueDays = 14

  return suggestions
}

export function generateInvoiceEmail(invoice: any, type: "send" | "reminder"): { subject: string; body: string } {
  if (type === "send") {
    return {
      subject: `Invoice ${invoice.invoiceNumber} from Fakturator`,
      body: `Dear ${invoice.client?.contactPerson || invoice.client?.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for the amount of ${invoice.total} ${invoice.currency}.\n\nPayment is due by ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nThank you for your business.\n\nBest regards,\nFakturator`,
    }
  }

  return {
    subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
    body: `Dear ${invoice.client?.contactPerson || invoice.client?.name},\n\nThis is a friendly reminder that invoice ${invoice.invoiceNumber} for ${invoice.total} ${invoice.currency} is past due.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.\n\nBest regards,\nFakturator`,
  }
}

export function detectAnomalies(invoices: any[]): string[] {
  const anomalies: string[] = []

  for (const inv of invoices) {
    if (!inv.items?.length) anomalies.push(`${inv.invoiceNumber}: No line items`)
    if (inv.total === 0) anomalies.push(`${inv.invoiceNumber}: Zero total amount`)
    if (!inv.client?.nip) anomalies.push(`${inv.invoiceNumber}: Client missing NIP`)
    if (inv.vatTotal === 0 && inv.type === "VAT") anomalies.push(`${inv.invoiceNumber}: VAT invoice with zero VAT`)
  }

  // Check for duplicates
  const numbers = invoices.map(i => i.invoiceNumber)
  const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i)
  for (const dup of duplicates) {
    anomalies.push(`Duplicate invoice number: ${dup}`)
  }

  return anomalies
}
