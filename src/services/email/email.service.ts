import { Resend } from "resend"

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

// Production email sender using Resend
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY

  // Fallback to mock if no API key configured
  if (!apiKey) {
    console.warn("[EMAIL] No RESEND_API_KEY — using mock sender")
    return mockSendEmail(message)
  }

  try {
    const resend = new Resend(apiKey)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Fakturator <invoices@fakturator.pl>",
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.htmlBody || message.body,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === "string" ? Buffer.from(a.content) : a.content,
        contentType: a.contentType,
      })),
    })

    if (error) {
      return { success: false, error: error.message, timestamp: new Date() }
    }

    return {
      success: true,
      messageId: data?.id,
      timestamp: new Date(),
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Email send failed",
      timestamp: new Date(),
    }
  }
}

// Mock sender for development
async function mockSendEmail(message: EmailMessage): Promise<EmailSendResult> {
  console.log(`[EMAIL-MOCK] To: ${message.to.join(", ")} | Subject: ${message.subject}`)
  await new Promise((r) => setTimeout(r, 100))
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
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
