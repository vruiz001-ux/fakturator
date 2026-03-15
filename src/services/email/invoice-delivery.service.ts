// @ts-nocheck

import { sendEmail, validateRecipients } from './email.service'
import { generateInvoiceEmailTemplate, generateInvoiceEmailSubject } from './email-templates.service'

export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RESENT'

export interface DeliveryRecipients {
  to: string[]
  cc: string[]
  bcc: string[]
}

export interface InvoiceDeliveryResult {
  eventId: string
  status: DeliveryStatus
  recipients: DeliveryRecipients
  subject: string
  sentAt?: Date
  error?: string
}

// Resolve recipients for an invoice from client + company settings
export function resolveRecipients(
  client: {
    email?: string
    invoiceEmail?: string
    invoiceEmailCc?: string[]
    invoiceEmailBcc?: string[]
    financeEmail?: string
    autoSendInvoices?: boolean
  },
  companyDefaults: {
    defaultInternalCc?: string[]
  },
  overrides?: Partial<DeliveryRecipients>
): DeliveryRecipients {
  if (overrides?.to?.length) {
    return {
      to: overrides.to,
      cc: overrides.cc || [],
      bcc: overrides.bcc || [],
    }
  }

  const to: string[] = []
  if (client.invoiceEmail) to.push(client.invoiceEmail)
  else if (client.email) to.push(client.email)
  if (client.financeEmail && !to.includes(client.financeEmail)) to.push(client.financeEmail)

  const cc = [
    ...(client.invoiceEmailCc || []),
    ...(companyDefaults.defaultInternalCc || []),
  ]
  const bcc = client.invoiceEmailBcc || []

  return { to, cc, bcc }
}

// Check if an invoice is eligible for auto-send
export function canAutoSend(invoice: {
  status: string
  type: string
}, client: { autoSendInvoices?: boolean }, alreadySent: boolean): { eligible: boolean; reason?: string } {
  if (alreadySent) return { eligible: false, reason: 'Invoice has already been auto-sent' }
  if (!['SENT', 'PAID'].includes(invoice.status) && invoice.status !== 'DRAFT') {
    // Allow sending for SENT status (which means "issued")
  }
  if (invoice.status === 'CANCELLED' || invoice.status === 'CORRECTED') {
    return { eligible: false, reason: `Invoice status ${invoice.status} is not eligible for sending` }
  }
  if (client.autoSendInvoices === false) {
    return { eligible: false, reason: 'Auto-send is disabled for this client' }
  }
  return { eligible: true }
}

// Main delivery function
export async function deliverInvoice(
  invoice: any,
  client: any,
  companySettings: any,
  deliverySettings: any,
  options?: {
    recipientOverrides?: Partial<DeliveryRecipients>
    isResend?: boolean
    triggeredBy?: string
  }
): Promise<InvoiceDeliveryResult> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Resolve recipients
  const recipients = resolveRecipients(client, deliverySettings, options?.recipientOverrides)

  // Validate
  const { valid: validTo, invalid: invalidTo } = validateRecipients(recipients.to)
  if (validTo.length === 0) {
    return {
      eventId,
      status: 'FAILED',
      recipients,
      subject: '',
      error: invalidTo.length > 0
        ? `Invalid recipient emails: ${invalidTo.join(', ')}`
        : 'No recipients configured for this client',
    }
  }

  // Generate email content
  const subject = generateInvoiceEmailSubject(invoice, companySettings, deliverySettings?.defaultSubjectTemplate)
  const body = generateInvoiceEmailTemplate(invoice, client, companySettings)

  // Send
  const result = await sendEmail({
    to: validTo,
    cc: recipients.cc,
    bcc: recipients.bcc,
    subject,
    body,
    htmlBody: body,
    // In production: attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
  })

  return {
    eventId,
    status: result.success ? (options?.isResend ? 'RESENT' : 'SENT') : 'FAILED',
    recipients: { to: validTo, cc: recipients.cc, bcc: recipients.bcc },
    subject,
    sentAt: result.success ? result.timestamp : undefined,
    error: result.error,
  }
}
