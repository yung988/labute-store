import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAdminAuth } from '@/lib/middleware/admin-verification';

type DashboardStats = {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  recentOrders: number;
  todayOrders: number;
  statusBreakdown: Record<string, number>;
  packetaStats: {
    total: number;
    shipped: number;
    pending: number;
  };
  supportStats: {
    openTickets: number;
    inProgressTickets: number;
    totalTickets: number;
    pendingReturns: number;
    urgentTickets: number;
  };
  recentOrdersList: Array<{
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    status: string;
    amount_total: number | null;
    created_at: string;
  }>;
  alerts: {
    oldOrders: Array<{
      id: string;
      customer_name: string | null;
      customer_email: string | null;
      status: string;
      created_at: string;
      days_old: number;
    }>;
    pendingShipments: number;
  };
  chartData: {
    dailyOrders: Array<{
      date: string;
      orders: number;
      revenue: number;
    }>;
    statusChart: Array<{
      status: string;
      count: number;
      color: string;
    }>;
    monthlyTrend: Array<{
      month: string;
      orders: number;
      revenue: number;
    }>;
  };
};

const statusColors: Record<string, string> = {
  paid: '#10b981',
  new: '#10b981',
  shipped: '#3b82f6',
  cancelled: '#ef4444',
  processing: '#f59e0b',
};

const statusLabels: Record<string, string> = {
  paid: 'Zaplaceno',
  new: 'Nové',
  shipped: 'Odesláno',
  cancelled: 'Zrušeno',
  processing: 'Zpracovává se',
};

async function handler(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const selectedDateStr = url.searchParams.get('date');

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    // Build date filter if selected
    let dateFilter: { start?: string; end?: string } = {};
    if (selectedDateStr) {
      const selectedDate = new Date(selectedDateStr);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
      };
    }

    // Parallel queries for better performance
    const [
      totalCountResult,
      revenueResult,
      customersResult,
      statusBreakdownResult,
      recentOrdersListResult,
      packetaResult,
      oldOrdersResult,
      pendingShipmentsResult,
      dailyOrdersResult,
      monthlyTrendResult,
      // Support stats
      supportTicketsResult,
      returnsResult,
    ] = await Promise.all([
      // Total orders count
      dateFilter.start
        ? supabaseAdmin
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dateFilter.start)
            .lte('created_at', dateFilter.end!)
        : supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),

      // Total revenue
      dateFilter.start
        ? supabaseAdmin
            .from('orders')
            .select('amount_total')
            .gte('created_at', dateFilter.start)
            .lte('created_at', dateFilter.end!)
        : supabaseAdmin.from('orders').select('amount_total'),

      // Unique customers
      dateFilter.start
        ? supabaseAdmin
            .from('orders')
            .select('customer_email')
            .gte('created_at', dateFilter.start)
            .lte('created_at', dateFilter.end!)
            .not('customer_email', 'is', null)
        : supabaseAdmin
            .from('orders')
            .select('customer_email')
            .not('customer_email', 'is', null),

      // Status breakdown - all statuses
      dateFilter.start
        ? supabaseAdmin
            .from('orders')
            .select('status')
            .gte('created_at', dateFilter.start)
            .lte('created_at', dateFilter.end!)
        : supabaseAdmin.from('orders').select('status'),

      // Recent orders list (last 10)
      supabaseAdmin
        .from('orders')
        .select('id,customer_name,customer_email,status,amount_total,created_at')
        .order('created_at', { ascending: false })
        .limit(10),

      // Packeta stats
      dateFilter.start
        ? supabaseAdmin
            .from('orders')
            .select('status,packeta_shipment_id')
            .not('packeta_shipment_id', 'is', null)
            .gte('created_at', dateFilter.start)
            .lte('created_at', dateFilter.end!)
        : supabaseAdmin
            .from('orders')
            .select('status,packeta_shipment_id')
            .not('packeta_shipment_id', 'is', null),

      // Old orders (waiting > 1 day)
      supabaseAdmin
        .from('orders')
        .select('id,customer_name,customer_email,status,created_at')
        .in('status', ['paid', 'new', 'processing'])
        .lt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(5),

      // Pending shipments count
      supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['paid', 'new', 'processing'])
        .is('packeta_shipment_id', null),

      // Daily orders for last 30 days (for chart)
      supabaseAdmin
        .from('orders')
        .select('created_at,amount_total')
        .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),

      // Monthly trend for last 6 months
      supabaseAdmin
        .from('orders')
        .select('created_at,amount_total')
        .gte('created_at', new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),

      // Support tickets
      supabaseAdmin
        .from('support_tickets')
        .select('id,status,priority')
        .order('created_at', { ascending: false }),

      // Return requests
      supabaseAdmin
        .from('return_requests')
        .select('id,status')
        .order('created_at', { ascending: false }),
    ]);

    // Calculate total revenue
    const totalRevenue = (revenueResult.data || []).reduce(
      (sum, o) => sum + (o.amount_total || 0),
      0
    );

    // Calculate unique customers
    const uniqueEmails = new Set(
      (customersResult.data || []).map((o) => o.customer_email).filter(Boolean)
    );

    // Calculate status breakdown
    const statusBreakdown: Record<string, number> = {};
    (statusBreakdownResult.data || []).forEach((order) => {
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
    });

    // Calculate recent orders (last 7 days)
    const recentOrders = (statusBreakdownResult.data || []).length;

    // Calculate today's orders
    const todayStr = today.toISOString().split('T')[0];
    const todayOrders = (dailyOrdersResult.data || []).filter((o) =>
      o.created_at.startsWith(todayStr)
    ).length;

    // Packeta stats
    const packetaOrders = packetaResult.data || [];
    const packetaStats = {
      total: packetaOrders.length,
      shipped: packetaOrders.filter((o) => o.status === 'shipped').length,
      pending: packetaOrders.filter((o) => o.status !== 'shipped').length,
    };

    // Old orders with days calculation
    const oldOrders = (oldOrdersResult.data || []).map((o) => {
      const createdAt = new Date(o.created_at);
      const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return { ...o, days_old: daysOld };
    });

    // Generate daily orders chart data
    const dailyOrdersMap = new Map<string, { orders: number; revenue: number }>();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    last30Days.forEach((date) => {
      dailyOrdersMap.set(date, { orders: 0, revenue: 0 });
    });

    (dailyOrdersResult.data || []).forEach((order) => {
      const date = order.created_at.split('T')[0];
      if (dailyOrdersMap.has(date)) {
        const current = dailyOrdersMap.get(date)!;
        dailyOrdersMap.set(date, {
          orders: current.orders + 1,
          revenue: current.revenue + (order.amount_total || 0) / 100,
        });
      }
    });

    const dailyOrders = last30Days.map((date) => ({
      date,
      ...dailyOrdersMap.get(date)!,
    }));

    // Generate monthly trend chart data
    const monthlyTrendMap = new Map<string, { orders: number; revenue: number }>();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' }),
      };
    });

    last6Months.forEach(({ key }) => {
      monthlyTrendMap.set(key, { orders: 0, revenue: 0 });
    });

    (monthlyTrendResult.data || []).forEach((order) => {
      const date = new Date(order.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrendMap.has(key)) {
        const current = monthlyTrendMap.get(key)!;
        monthlyTrendMap.set(key, {
          orders: current.orders + 1,
          revenue: current.revenue + (order.amount_total || 0) / 100,
        });
      }
    });

    const monthlyTrend = last6Months.map(({ key, label }) => ({
      month: label,
      ...monthlyTrendMap.get(key)!,
    }));

    // Generate status chart data
    const statusChart = Object.entries(statusBreakdown).map(([status, count]) => ({
      status: statusLabels[status] || status,
      count,
      color: statusColors[status] || '#6b7280',
    }));

    // Calculate support stats
    const tickets = supportTicketsResult.data || [];
    const returns = returnsResult.data || [];

    const supportStats = {
      openTickets: tickets.filter(t => t.status === 'open').length,
      inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
      totalTickets: tickets.length,
      pendingReturns: returns.filter(r => r.status === 'pending').length,
      urgentTickets: tickets.filter(t => t.priority === 'urgent' && ['open', 'in_progress'].includes(t.status)).length,
    };

    const stats: DashboardStats = {
      totalOrders: totalCountResult.count || 0,
      totalRevenue,
      totalCustomers: uniqueEmails.size,
      recentOrders,
      todayOrders,
      statusBreakdown,
      packetaStats,
      supportStats,
      recentOrdersList: recentOrdersListResult.data || [],
      alerts: {
        oldOrders,
        pendingShipments: pendingShipmentsResult.count || 0,
      },
      chartData: {
        dailyOrders,
        statusChart,
        monthlyTrend,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
