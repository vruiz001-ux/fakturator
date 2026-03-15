import Link from "next/link"
import {
  Zap,
  FileText,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Receipt,
  ArrowLeftRight,
} from "lucide-react"

const features = [
  {
    icon: FileText,
    title: "Smart Invoicing",
    description: "AI-powered invoice creation with Polish compliance. Auto-fill, natural language input, VAT calculations, and PDF generation built in.",
  },
  {
    icon: Receipt,
    title: "Expense Recovery",
    description: "Track, assign, and rebill expenses to clients automatically. Never lose money on project costs again with smart expense matching.",
  },
  {
    icon: ArrowLeftRight,
    title: "Easy Migration",
    description: "Switch from Ninja Invoice in minutes with full history import. Clients, invoices, and settings migrate seamlessly.",
  },
  {
    icon: BarChart3,
    title: "Business Intelligence",
    description: "Real-time dashboard with revenue, expenses, and actionable KPIs. Track profitability per client, service, and time period.",
  },
]

const highlights = [
  "Full Polish VAT invoice support",
  "NIP validation and auto-lookup",
  "PLN and EUR currency support",
  "Expense rebilling and recovery",
  "Ninja Invoice migration wizard",
  "Client expense tracking",
  "Service performance analytics",
  "PDF generation and email workflows",
  "KSeF compliance readiness",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Fakturator</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <Sparkles className="h-4 w-4" />
            Smart Business Console for Polish Companies
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            Your business,
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {" "}fully in control
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Smart Business Console for Polish companies. AI invoicing, expense recovery and rebilling,
            Ninja Invoice migration, real-time dashboard, and KSeF compliance — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200"
            >
              Start Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              See Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Everything you need to run your business
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              AI invoicing, expense recovery, easy migration, and smart analytics.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Built for Polish businesses</h2>
            <p className="mt-3 text-lg text-slate-500">
              Comprehensive invoicing that meets Polish legal requirements and KSeF standards.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg p-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Ready to take control of your business?
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Join businesses across Poland using Fakturator to invoice smarter, recover expenses, and grow with confidence.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Fakturator</span>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Fakturator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
