export const VAT_RATES = [
  { value: 23, label: "23%" },
  { value: 8, label: "8%" },
  { value: 5, label: "5%" },
  { value: 0, label: "0%" },
  { value: -1, label: "zw. (exempt)" },
  { value: -2, label: "np. (not applicable)" },
] as const

export const CURRENCIES = [
  { value: "PLN", label: "PLN - Polish Zloty", symbol: "zł" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
  { value: "GBP", label: "GBP - British Pound", symbol: "£" },
] as const

export const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "ONLINE", label: "Online Payment" },
  { value: "OTHER", label: "Other" },
] as const

export const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "PAID", label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  { value: "PARTIALLY_PAID", label: "Partially Paid", color: "bg-amber-100 text-amber-700" },
  { value: "OVERDUE", label: "Overdue", color: "bg-red-100 text-red-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-slate-100 text-slate-500" },
  { value: "CORRECTED", label: "Corrected", color: "bg-purple-100 text-purple-700" },
] as const

export const INVOICE_TYPES = [
  { value: "VAT", label: "VAT Invoice" },
  { value: "PROFORMA", label: "Proforma Invoice" },
  { value: "CORRECTION", label: "Correction Invoice" },
  { value: "ADVANCE", label: "Advance Invoice" },
  { value: "RECURRING", label: "Recurring Invoice" },
] as const

export const UNITS = [
  { value: "HOUR", label: "Hour", short: "hr" },
  { value: "PIECE", label: "Piece", short: "pc" },
  { value: "SERVICE", label: "Service", short: "svc" },
  { value: "PROJECT", label: "Project", short: "proj" },
  { value: "MONTH", label: "Month", short: "mo" },
  { value: "DAY", label: "Day", short: "day" },
  { value: "KG", label: "Kilogram", short: "kg" },
  { value: "M2", label: "Square meter", short: "m²" },
  { value: "OTHER", label: "Other", short: "" },
] as const

export const DEFAULT_PAYMENT_DAYS = 14

export const KSEF_STATUSES = [
  { value: "PENDING", label: "Pending", color: "bg-slate-100 text-slate-700" },
  { value: "VALIDATED", label: "Validated", color: "bg-blue-100 text-blue-700" },
  { value: "SUBMITTED", label: "Submitted", color: "bg-amber-100 text-amber-700" },
  { value: "ACCEPTED", label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "ERROR", label: "Error", color: "bg-red-100 text-red-700" },
] as const

export const POLISH_INVOICE_REQUIRED_FIELDS = [
  "invoiceNumber",
  "issueDate",
  "saleDate",
  "sellerName",
  "sellerNip",
  "sellerAddress",
  "buyerName",
  "buyerNip",
  "buyerAddress",
  "items",
  "subtotal",
  "vatTotal",
  "total",
  "paymentMethod",
  "dueDate",
  "currency",
] as const
