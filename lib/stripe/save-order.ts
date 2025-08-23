import { createClient } from "@/lib/supabase/server";

interface Session {
  id: string;
  customer_details?: {
    email?: string | null;
  } | null;
  metadata?: {
    items?: unknown[];
  } | null;
  amount_total: number | null;
}

export default async function saveOrderToDb(session: Session) {
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
