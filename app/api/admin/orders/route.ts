import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id,stripe_session_id,customer_email,customer_name,customer_phone,packeta_point_id,packeta_shipment_id,items,status,amount_total,shipping_amount,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  const body = await req.json();
  // Minimal validation
  const payload = {
    id: body.id ?? crypto.randomUUID(),
    stripe_session_id: body.stripe_session_id ?? null,
    customer_email: body.customer_email ?? null,
    customer_name: body.customer_name ?? null,
    customer_phone: body.customer_phone ?? null,
    packeta_point_id: body.packeta_point_id ?? null,
    items: body.items ?? [],
    status: body.status ?? "new",
    amount_total: body.amount_total ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data }, { status: 201 });
}
