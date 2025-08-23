import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const body: Record<string, unknown> = await _req.json();
  const { id } = context.params;

  const updates: Record<string, unknown> = {};
  for (const key of [
    "stripe_session_id",
    "customer_email",
    "customer_name",
    "customer_phone",
    "packeta_point_id",
    "items",
    "status",
    "amount_total",
  ]) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const { error } = await supabaseAdmin.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
