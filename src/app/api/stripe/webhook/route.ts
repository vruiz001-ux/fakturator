import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe/stripe"
import Stripe from "stripe"

// Stripe sends raw body — we need to verify the signature
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const organizationId = session.metadata?.organizationId
        const customerId = session.customer as string

        if (organizationId) {
          // Update organization subscription in Supabase
          // In production: use Supabase admin client here
          console.log(`[STRIPE] Checkout completed for org ${organizationId}, customer ${customerId}`)
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata?.organizationId
        const status = subscription.status // active, past_due, canceled, etc.

        if (organizationId) {
          console.log(`[STRIPE] Subscription ${status} for org ${organizationId}`)
          // Update: organization.subscription_status = status
          // Update: organization.subscription_plan = 'pro'
          // Update: organization.stripe_customer_id = subscription.customer
          // Update: organization.subscription_ends_at = subscription.current_period_end
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata?.organizationId

        if (organizationId) {
          console.log(`[STRIPE] Subscription cancelled for org ${organizationId}`)
          // Update: organization.subscription_status = 'cancelled'
          // Update: organization.subscription_plan = 'free'
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        console.log(`[STRIPE] Payment failed for customer ${customerId}`)
        // Send warning email, update subscription_status to 'past_due'
        break
      }

      default:
        // Unhandled event type
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
