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
        <script
          dangerouslySetInnerHTML={{
            __html: `
try{
  // Fix corrupted/duplicate invoice data in all storage keys
  var keys=Object.keys(localStorage).filter(function(k){return k.indexOf("fakturator_data")===0});
  keys.forEach(function(key){
    try{
      var raw=localStorage.getItem(key);
      if(!raw)return;
      var d=JSON.parse(raw);
      if(d&&d.invoices&&Array.isArray(d.invoices)){
        // Deduplicate by invoice number
        var seen={};
        d.invoices=d.invoices.filter(function(inv){
          var n=inv.invoiceNumber;
          if(seen[n])return false;
          seen[n]=true;
          inv.currency="EUR";
          return true;
        });
        localStorage.setItem(key,JSON.stringify(d));
      }
    }catch(e){localStorage.removeItem(key)}
  });
}catch(e){}
`,
          }}
        />
        {children}
      </body>
    </html>
  )
}
