import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import sendOrderStatusEmail from "@/lib/stripe/send-status-email";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ order: data });
}

export async function PUT(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const body: Record<string, unknown> = await _req.json();
  const { id } = await context.params;

  // Get current order data to check for status change
  const { data: currentOrder } = await supabaseAdmin
    .from("orders")
    .select("status, customer_email")
    .eq("id", id)
    .single();

  const updates: Record<string, unknown> = {};
  for (const key of [
    "stripe_session_id",
    "customer_email", 
    "customer_name",
    "customer_phone",
    "packeta_point_id",
    "packeta_shipment_id",
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

  // Send status email if status changed and customer has email
  if (body.status && body.status !== currentOrder?.status && data.customer_email) {
    try {
      await sendOrderStatusEmail(data, currentOrder?.status);
    } catch (emailError) {
      console.error("Failed to send status email:", emailError);
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({ order: data });
}

export async function PATCH(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const body: Record<string, unknown> = await _req.json();
  const { id } = await context.params;

  // Get current order data to check for status change
  const { data: currentOrder } = await supabaseAdmin
    .from("orders")
    .select("status, customer_email")
    .eq("id", id)
    .single();

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

  // Send status email if status changed and customer has email
  if (body.status && body.status !== currentOrder?.status && data.customer_email) {
    try {
      await sendOrderStatusEmail(data, currentOrder?.status);
    } catch (emailError) {
      console.error("Failed to send status email:", emailError);
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({ order: data });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { error } = await supabaseAdmin.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
