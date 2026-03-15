// @ts-nocheck
import React from "react"
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

// Register Inter font
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZg.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZg.ttf", fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9, padding: 40, color: "#334155" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  companyName: { fontSize: 16, fontWeight: 700, color: "#4f46e5" },
  companyDetails: { fontSize: 8, color: "#64748b", marginTop: 4, lineHeight: 1.5 },
  invoiceTitle: { fontSize: 20, fontWeight: 700, textAlign: "right", color: "#0f172a" },
  statusBadge: { fontSize: 8, color: "#4f46e5", marginTop: 4, textAlign: "right" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 7, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { fontSize: 8, color: "#64748b" },
  value: { fontSize: 8, fontWeight: 600, color: "#0f172a" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginVertical: 15 },
  // Table
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 6, marginBottom: 6 },
  tableHeaderCell: { fontSize: 7, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  tableCell: { fontSize: 8, color: "#334155" },
  tableCellBold: { fontSize: 8, fontWeight: 600, color: "#0f172a" },
  // Totals
  totalsContainer: { marginTop: 15, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", marginBottom: 4 },
  grandTotal: { flexDirection: "row", width: 200, justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1.5, borderTopColor: "#4f46e5", marginTop: 4 },
  grandTotalLabel: { fontSize: 11, fontWeight: 700, color: "#0f172a" },
  grandTotalValue: { fontSize: 11, fontWeight: 700, color: "#4f46e5" },
  // Footer
  footer: { position: "absolute", bottom: 30, left: 40, right: 40 },
  footerDivider: { borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", marginBottom: 8 },
  footerRow: { flexDirection: "row", gap: 30 },
  footerLabel: { fontSize: 7, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 },
  footerValue: { fontSize: 8, color: "#334155", fontFamily: "Courier" },
  footerNote: { fontSize: 7, color: "#94a3b8", textAlign: "center", marginTop: 8 },
})

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency", currency, minimumFractionDigits: 2,
  }).format(amount)
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string
    status: string
    issueDate: string
    saleDate?: string
    dueDate: string
    paymentMethod: string
    currency: string
    subtotal: number
    vatTotal: number
    total: number
    paidAmount: number
    notes?: string
    items: Array<{
      description: string
      quantity: number
      unit: string
      unitPrice: number
      vatRate: number
      netAmount: number
      vatAmount: number
      grossAmount: number
    }>
    client?: {
      name: string
      nip?: string
      address?: string
      postalCode?: string
      city?: string
    }
  }
  company: {
    name: string
    address?: string
    city?: string
    postalCode?: string
    nip?: string
    email?: string
    phone?: string
    bankName?: string
    bankAccount?: string
  }
}

export function InvoicePDF({ invoice, company }: InvoicePDFProps) {
  const cur = invoice.currency || "EUR"

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{company.name || "Fakturator"}</Text>
            <Text style={s.companyDetails}>
              {company.address && `${company.address}\n`}
              {(company.postalCode || company.city) && `${company.postalCode || ""} ${company.city || ""}\n`}
              {company.nip && `NIP: ${company.nip}\n`}
              {company.email && company.email}
            </Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>{invoice.invoiceNumber}</Text>
            <Text style={s.statusBadge}>{invoice.status}</Text>
          </View>
        </View>

        {/* Bill To + Dates */}
        <View style={{ flexDirection: "row", gap: 40 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Bill To</Text>
            <Text style={s.tableCellBold}>{invoice.client?.name || "—"}</Text>
            <Text style={s.companyDetails}>
              {invoice.client?.address && `${invoice.client.address}\n`}
              {(invoice.client?.postalCode || invoice.client?.city) && `${invoice.client.postalCode || ""} ${invoice.client.city || ""}\n`}
              {invoice.client?.nip && `NIP: ${invoice.client.nip}`}
            </Text>
          </View>
          <View style={{ width: 180 }}>
            <View style={s.row}><Text style={s.label}>Issue Date</Text><Text style={s.value}>{invoice.issueDate}</Text></View>
            {invoice.saleDate && <View style={s.row}><Text style={s.label}>Sale Date</Text><Text style={s.value}>{invoice.saleDate}</Text></View>}
            <View style={s.row}><Text style={s.label}>Due Date</Text><Text style={s.value}>{invoice.dueDate}</Text></View>
            <View style={s.row}><Text style={s.label}>Payment</Text><Text style={s.value}>{invoice.paymentMethod?.replace("_", " ")}</Text></View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Line Items Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, { width: 20 }]}>#</Text>
          <Text style={[s.tableHeaderCell, { flex: 1 }]}>Description</Text>
          <Text style={[s.tableHeaderCell, { width: 40, textAlign: "right" }]}>Qty</Text>
          <Text style={[s.tableHeaderCell, { width: 50, textAlign: "right" }]}>Price</Text>
          <Text style={[s.tableHeaderCell, { width: 35, textAlign: "right" }]}>VAT</Text>
          <Text style={[s.tableHeaderCell, { width: 65, textAlign: "right" }]}>Net</Text>
          <Text style={[s.tableHeaderCell, { width: 65, textAlign: "right" }]}>Gross</Text>
        </View>

        {invoice.items.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.tableCell, { width: 20 }]}>{i + 1}</Text>
            <Text style={[s.tableCellBold, { flex: 1 }]}>{item.description}</Text>
            <Text style={[s.tableCell, { width: 40, textAlign: "right" }]}>{item.quantity}</Text>
            <Text style={[s.tableCell, { width: 50, textAlign: "right" }]}>{formatAmount(item.unitPrice, cur)}</Text>
            <Text style={[s.tableCell, { width: 35, textAlign: "right" }]}>{item.vatRate}%</Text>
            <Text style={[s.tableCell, { width: 65, textAlign: "right" }]}>{formatAmount(item.netAmount, cur)}</Text>
            <Text style={[s.tableCellBold, { width: 65, textAlign: "right" }]}>{formatAmount(item.grossAmount, cur)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsContainer}>
          <View style={s.totalRow}>
            <Text style={s.label}>Subtotal (Net)</Text>
            <Text style={s.value}>{formatAmount(invoice.subtotal, cur)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.label}>VAT</Text>
            <Text style={s.value}>{formatAmount(invoice.vatTotal, cur)}</Text>
          </View>
          <View style={s.grandTotal}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <Text style={s.grandTotalValue}>{formatAmount(invoice.total, cur)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={[s.section, { marginTop: 20 }]}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.tableCell}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer — Bank Details */}
        <View style={s.footer}>
          <View style={s.footerDivider} />
          <View style={s.footerRow}>
            {company.bankName && (
              <View>
                <Text style={s.footerLabel}>BIC</Text>
                <Text style={s.footerValue}>{company.bankName}</Text>
              </View>
            )}
            {company.bankAccount && (
              <View>
                <Text style={s.footerLabel}>IBAN</Text>
                <Text style={s.footerValue}>{company.bankAccount}</Text>
              </View>
            )}
          </View>
          <Text style={s.footerNote}>Generated by Fakturator · fakturator.pl</Text>
        </View>
      </Page>
    </Document>
  )
}
