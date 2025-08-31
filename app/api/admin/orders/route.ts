import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withAdminAuth, AdminUser } from "@/lib/middleware/admin-verification";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAdminAuth(async (req: NextRequest, _adminUser: AdminUser) => {
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

  // Parse pagination parameters
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100); // Max 100 per page
  const cursor = url.searchParams.get('cursor'); // ISO date string for cursor-based pagination
  const status = url.searchParams.get('status'); // Optional status filter
  const search = url.searchParams.get('search'); // Optional search query

  let query = supabase
    .from("orders")
    .select("id,stripe_session_id,customer_email,customer_name,customer_phone,packeta_point_id,packeta_shipment_id,items,status,amount_total,shipping_amount,created_at,delivery_method,delivery_address,delivery_city,delivery_postal_code,delivery_country,label_printed_at,label_printed_count", { count: 'exact' })
    .order("created_at", { ascending: false })
    .limit(limit);

  // Apply cursor-based pagination
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply search filter (simple implementation - can be enhanced)
  if (search) {
    query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calculate next cursor (last item's created_at)
  const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null;

  return NextResponse.json({
    orders: data ?? [],
    pagination: {
      count: count || 0,
      limit,
      nextCursor,
      hasMore: Boolean(nextCursor)
    }
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAdminAuth(async (req: NextRequest, _adminUser: AdminUser) => {
  const body = await req.json();

  // Enhanced validation for admin-created orders
  const requiredFields = ['customer_email', 'customer_name', 'items'];
  for (const field of requiredFields) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
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

  const payload = {
    id: body.id ?? crypto.randomUUID(),
    stripe_session_id: body.stripe_session_id ?? null,
    customer_email: body.customer_email,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone ?? null,
    packeta_point_id: body.packeta_point_id ?? null,
    items: body.items,
    status: body.status ?? "new",
    amount_total: body.amount_total ?? null,
    shipping_amount: body.shipping_amount ?? null,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data }, { status: 201 });
});
