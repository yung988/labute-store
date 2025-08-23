import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function saveOrderToDb(session: any) {
  const { error } = await supabaseAdmin.from("orders").insert({
    stripe_session_id: session.id,
    customer_email: session.customer_details?.email,
    status: "paid",
    items: JSON.stringify(session.metadata?.items ?? []),
    amount_total: session.amount_total,
  });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log("✅ Order saved:", session.id);
}
