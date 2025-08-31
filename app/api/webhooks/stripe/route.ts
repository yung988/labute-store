import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import saveOrderToDb from "@/lib/stripe/save-order";
import sendOrderEmail from "@/lib/stripe/send-email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const buf = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Invalid signature", err);
    return new NextResponse("Webhook signature error", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Type guard to ensure we have required data
    if (!session.amount_total) {
      console.error("❌ Missing amount_total in session");
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    const sessionData = {
      id: session.id,
      amount_total: session.amount_total,
      customer_details: session.customer_details ? {
        email: session.customer_details.email || undefined
      } : undefined,
      metadata: session.metadata,
      custom_fields: session.custom_fields,
      invoice: session.invoice ? session.invoice : undefined,
      shipping_cost: session.shipping_cost ? {
        amount_total: session.shipping_cost.amount_total ?? undefined
      } : undefined
    };

    try {
      await saveOrderToDb(sessionData);
      await sendOrderEmail(sessionData);
    } catch (err) {
      console.error("❌ Processing error:", err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
