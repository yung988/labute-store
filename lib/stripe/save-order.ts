import { createClient } from "@/lib/supabase/server";

export default async function saveOrderToDb(session: any) {
  const supabase = await createClient();

  const { error } = await supabase.from("orders").insert({
    id: session.id,
    stripe_session_id: session.id,
    customer_email: session.customer_details?.email,
    status: "paid",
    items: JSON.stringify(session.metadata?.items ?? []),
  });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log("✅ Order saved:", session.id);
}
