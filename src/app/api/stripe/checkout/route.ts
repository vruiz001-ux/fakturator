import { NextRequest, NextResponse } from "next/server"
import { getStripe, PLANS } from "@/lib/stripe/stripe"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, organizationId } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        organizationId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://fakturator-app.netlify.app"}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://fakturator-app.netlify.app"}/settings?cancelled=true`,
      subscription_data: {
        metadata: {
          userId,
          organizationId,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create checkout session" }, { status: 500 })
  }
}
