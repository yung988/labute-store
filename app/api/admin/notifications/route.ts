import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/admin-verification';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Shape expected by the NotificationDropdown UI (createdAt will be an ISO string)
interface AdminNotification {
  id: string;
  type: 'order' | 'payment' | 'inventory' | 'system' | 'shipping';
  title: string;
  message: string;
  isRead: boolean; // server always returns false; UI manages read state locally for now
  createdAt: string; // ISO string
  actionUrl?: string;
  orderId?: string;
}

interface ShippingOrder {
  id: number;
  status: string;
  updated_at: string;
}

interface LowStockSku {
  product_id: number;
  size: string;
  stock: number;
  products: {
    id: number;
    name: string;
  }[];
}

export const revalidate = 0;

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100);

    // Fetch recent orders (new + shipping/delivered)
    const [ordersRes, shippingRes, emailErrRes, lowStockRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('id, customer_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('orders')
        .select('id, status, updated_at')
        .in('status', ['shipped', 'delivered'])
        .order('updated_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('email_logs')
        .select('id, order_id, customer_email, subject, status, created_at')
        .in('status', ['failed', 'bounced'])
        .order('created_at', { ascending: false })
        .limit(50),
      // Low/out-of-stock inventory
      supabaseAdmin
        .from('skus')
        .select('product_id, size, stock, products ( id, name )')
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(50),
    ]);

    if (ordersRes.error)
      return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    if (shippingRes.error)
      return NextResponse.json({ error: shippingRes.error.message }, { status: 500 });
    if (emailErrRes.error)
      return NextResponse.json({ error: emailErrRes.error.message }, { status: 500 });
    if (lowStockRes.error)
      return NextResponse.json({ error: lowStockRes.error.message }, { status: 500 });

    const notifications: AdminNotification[] = [];
    const dedupe = new Set<string>();

    // New orders (status 'new' or 'paid' close to creation)
    for (const o of ordersRes.data || []) {
      const n: AdminNotification = {
        id: `order:${o.id}:created`,
        type: 'order',
        title: o.status === 'new' ? 'Nová objednávka' : 'Objednávka vytvořena',
        message:
          `Objednávka #${String(o.id).slice(-8)} ${o.customer_name ? `od ${o.customer_name}` : ''}`.trim(),
        isRead: false,
        createdAt: o.created_at,
        actionUrl: `/admin?section=orders&orderId=${o.id}`,
        orderId: String(o.id),
      };
      const key = n.id;
      if (!dedupe.has(key)) {
        notifications.push(n);
        dedupe.add(key);
      }
    }

    // Shipping / delivered updates
    for (const s of (shippingRes.data as ShippingOrder[]) || []) {
      const label = s.status === 'delivered' ? 'Doručeno' : 'Odesláno';
      const n: AdminNotification = {
        id: `shipping:${s.id}:${s.status}`,
        type: 'shipping',
        title: `Změna zásilky: ${label}`,
        message: `Objednávka #${String(s.id).slice(-8)} — ${label.toLowerCase()}`,
        isRead: false,
        createdAt: s.updated_at,
        actionUrl: `/admin?section=orders&orderId=${s.id}`,
        orderId: String(s.id),
      };
      const key = n.id;
      if (!dedupe.has(key)) {
        notifications.push(n);
        dedupe.add(key);
      }
    }

    // Email failures/bounces
    for (const e of emailErrRes.data || []) {
      const n: AdminNotification = {
        id: `email:${e.id}:${e.status}`,
        type: 'system',
        title: e.status === 'bounced' ? 'Email se vrátil (bounce)' : 'Chyba při odeslání emailu',
        message: `${e.subject} → ${e.customer_email}`,
        isRead: false,
        createdAt: e.created_at,
        actionUrl: e.order_id ? `/admin?section=orders&orderId=${e.order_id}` : undefined,
        orderId: e.order_id || undefined,
      };
      const key = n.id;
      if (!dedupe.has(key)) {
        notifications.push(n);
        dedupe.add(key);
      }
    }

    // Low/out-of-stock inventory
    for (const sku of (lowStockRes.data as LowStockSku[]) || []) {
      const product = sku.products[0];
      const isOut = sku.stock <= 0;
      const n: AdminNotification = {
        id: `inventory:${sku.product_id}:${sku.size}:${isOut ? 'out' : 'low'}`,
        type: 'inventory',
        title: isOut ? 'Vyprodáno' : 'Nízké zásoby',
        message: `${product?.name || 'Produkt'} — ${sku.size} (${sku.stock} ks)`,
        isRead: false,
        createdAt: new Date().toISOString(),
        actionUrl: `/admin?section=inventory`,
      };
      const key = n.id;
      if (!dedupe.has(key)) {
        notifications.push(n);
        dedupe.add(key);
      }
    }

    // Sort by createdAt desc and trim to requested limit
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ notifications: notifications.slice(0, limit) });
  } catch (e) {
    console.error('Admin notifications error:', e);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
});
