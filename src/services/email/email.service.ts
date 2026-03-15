// @ts-nocheck

export interface EmailMessage {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  htmlBody?: string
  attachments?: { filename: string; content: Buffer | string; contentType: string }[]
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp: Date
}

// Mock email sender - replace with SMTP/SendGrid/SES in production
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  console.log(`[EMAIL] Sending to: ${message.to.join(', ')}`)
  console.log(`[EMAIL] Subject: ${message.subject}`)
  console.log(`[EMAIL] CC: ${message.cc?.join(', ') || 'none'}`)

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))

  // Mock: 95% success rate
  const success = Math.random() > 0.05

  return {
    success,
    messageId: success ? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : undefined,
    error: success ? undefined : 'SMTP connection timeout',
    timestamp: new Date(),
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateRecipients(recipients: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  for (const r of recipients) {
    if (validateEmail(r.trim())) valid.push(r.trim())
    else invalid.push(r.trim())
  }
  return { valid, invalid }
}
