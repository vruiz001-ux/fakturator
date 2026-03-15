import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured")
    _stripe = new Stripe(key)
  }
  return _stripe
}

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    limits: { invoices: 5, clients: 3 },
    features: ["5 invoices/month", "3 clients", "Basic dashboard"],
  },
  pro: {
    name: "Pro",
    price: 10,
    currency: "eur",
    limits: { invoices: Infinity, clients: Infinity },
    features: [
      "Unlimited invoices",
      "Unlimited clients",
      "Full analytics + FX",
      "Ninja Invoice import",
      "Email delivery",
      "PDF export",
      "KSeF compliance",
      "AI Assistant",
    ],
  },
} as const

export type PlanType = keyof typeof PLANS

export function isPro(subscriptionStatus?: string): boolean {
  return subscriptionStatus === "active" || subscriptionStatus === "trialing"
}
