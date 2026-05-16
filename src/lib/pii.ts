// Structured-PII redaction for at-rest audit logs (GDPR).
// Pure — safe to import anywhere.

// Redact emails, IBANs, tax IDs, and phone numbers from free text.
// Order matters: emails before IBAN before tax IDs before phones.
export function redactPii(text: string): string {
  if (!text) return text
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, "[IBAN]")
    .replace(/\b([A-Z]{2})?\d{8,12}\b/g, (m) => (/\d{8,}/.test(m) ? "[TAXID]" : m))
    .replace(/\+?\d[\d\s().-]{6,}\d/g, (m) =>
      m.replace(/\D/g, "").length >= 7 ? "[PHONE]" : m
    )
}
