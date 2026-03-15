import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe/stripe"

// Create Stripe Customer Portal session for managing subscription
export async function POST(request: NextRequest) {
  try {
    const { stripeCustomerId } = await request.json()

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer ID" }, { status: 400 })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://fakturator-app.netlify.app"}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
