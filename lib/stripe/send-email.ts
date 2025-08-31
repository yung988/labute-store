// v send-email.ts
import { Resend } from "resend";
import OrderReceiptEmail from "@/app/emails/OrderReceiptEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

interface Session {
  id: string;
  customer_details?: {
    email?: string | null;
  } | null;
  amount_total: number | null;
}

export default async function sendOrderEmail(session: Session) {
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

  const maskEmail = (e?: string | null) => {
    if (!e) return "[hidden]";
    const [user, domain] = e.split("@");
    if (!domain) return "[hidden]";
    const maskedUser = user.length <= 2 ? "**" : user[0] + "***" + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  };
  console.log("✅ Brandovaný email poslán:", maskEmail(session.customer_details.email ?? undefined));
}
