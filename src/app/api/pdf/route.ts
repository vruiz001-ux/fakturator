// @ts-nocheck
import { NextRequest, NextResponse } from "next/server"
import ReactPDF from "@react-pdf/renderer"
import { InvoicePDF } from "@/lib/pdf/invoice-pdf"
import React from "react"

export async function POST(request: NextRequest) {
  try {
    const { invoice, company } = await request.json()

    if (!invoice || !invoice.invoiceNumber) {
      return NextResponse.json({ error: "Invoice data is required" }, { status: 400 })
    }

    // Render PDF to buffer
    const pdfStream = await ReactPDF.renderToStream(
      React.createElement(InvoicePDF, { invoice, company: company || {} })
    )

    // Collect stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber.replace(/\//g, "-")}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error("PDF generation error:", err)
    return NextResponse.json({ error: err.message || "PDF generation failed" }, { status: 500 })
  }
}
