// v send-email.ts
import { Resend } from "resend";
import OrderReceiptEmail from "@/emails/OrderReceiptEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function sendOrderEmail(session: any) {
  if (!session.customer_details?.email) {
    throw new Error("Missing customer email");
  }

  // Načtení line items z Stripe
  const lineItemsRes = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items`,
    {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    }
  );
  const { data: items } = await lineItemsRes.json();

  await resend.emails.send({
    from: "noreply@yeezuz2020.store",
    to: session.customer_details.email,
    subject: "Potvrzení objednávky",
    react: OrderReceiptEmail({ session, items }),
  });

  console.log("✅ Brandovaný email poslán:", session.customer_details.email);
}
