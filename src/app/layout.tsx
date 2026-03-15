import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
})

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fakturator.pl"

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Fakturator - AI-Powered Business Console for Poland",
    template: "%s | Fakturator",
  },
  description:
    "Smart invoicing, expense recovery, business intelligence, and KSeF compliance for modern businesses in Poland. AI-powered, PLN and EUR support.",
  keywords: [
    "invoicing Poland",
    "faktura VAT",
    "AI invoicing",
    "KSeF",
    "expense rebilling",
    "business console",
    "Polish invoice software",
    "Ninja Invoice alternative",
    "fakturator",
  ],
  authors: [{ name: "Fakturator" }],
  creator: "Fakturator",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Fakturator",
    title: "Fakturator - AI-Powered Business Console for Poland",
    description:
      "Smart invoicing, expense recovery, business intelligence, and KSeF compliance. AI-powered with PLN and EUR support.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fakturator - AI-Powered Business Console",
    description:
      "Smart invoicing, expense recovery, and business intelligence for Polish businesses.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
