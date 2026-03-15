import { format, formatDistanceToNow } from "date-fns"
import { INVOICE_STATUSES, CURRENCIES } from "./constants"

export function formatCurrency(amount: number, currency = "EUR"): string {
  const curr = CURRENCIES.find((c) => c.value === currency)
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: Date | string, fmt = "dd.MM.yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, fmt)
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd.MM.yyyy HH:mm")
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatNIP(nip: string): string {
  const clean = nip.replace(/\D/g, "")
  if (clean.length !== 10) return nip
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8, 10)}`
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getStatusColor(status: string): string {
  const found = INVOICE_STATUSES.find((s) => s.value === status)
  return found?.color ?? "bg-slate-100 text-slate-700"
}

export function getStatusLabel(status: string): string {
  const found = INVOICE_STATUSES.find((s) => s.value === status)
  return found?.label ?? status
}

export function calculateVAT(netAmount: number, vatRate: number): number {
  if (vatRate < 0) return 0
  return Math.round(netAmount * (vatRate / 100) * 100) / 100
}

export function calculateGross(netAmount: number, vatRate: number): number {
  return netAmount + calculateVAT(netAmount, vatRate)
}

export function calculateNet(grossAmount: number, vatRate: number): number {
  if (vatRate < 0) return grossAmount
  return Math.round((grossAmount / (1 + vatRate / 100)) * 100) / 100
}
