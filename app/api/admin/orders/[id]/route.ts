import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withAdminAuth, AdminUser } from "@/lib/middleware/admin-verification";
import sendOrderStatusEmail from "@/lib/stripe/send-status-email";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAdminAuth(async (req: NextRequest, _adminUser: AdminUser) => {
  // For GET, we need to handle context separately
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  // Create authenticated admin client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // No-op for API routes
        },
      },
    },
  );

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ order: data });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PUT = withAdminAuth(async (req: NextRequest, _adminUser: AdminUser) => {
  // Extract ID from URL for PUT
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const body: Record<string, unknown> = await req.json();

  // Create authenticated admin client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // No-op for API routes
        },
      },
    },
  );

  // Get current order data to check for status change
  const { data: currentOrder } = await supabase
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
    "shipping_amount",
  ]) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
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
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PATCH = withAdminAuth(async (req: NextRequest, _adminUser: AdminUser) => {
  // Extract ID from URL for PATCH
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const body: Record<string, unknown> = await req.json();

  // Create authenticated admin client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // No-op for API routes
        },
      },
    },
  );

  // Get current order data to check for status change
  const { data: currentOrder } = await supabase
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
    "shipping_amount",
  ]) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
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
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DELETE = withAdminAuth(async (req: NextRequest, _adminUser: AdminUser) => {
  // Extract ID from URL for DELETE
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  // Create authenticated admin client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // No-op for API routes
        },
      },
    },
  );

  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
