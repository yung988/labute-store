'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Send,
  ArrowRight,
  Calendar,
  TrendingUp,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAdminContext } from '@/context/AdminContext';
import { Order } from '@/types/orders';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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
  recentOrdersList: Array<{
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    status: string;
    amount_total: number | null;
    created_at: string;
  }>;
  alerts: {
    lowStock: Array<{
      product_name: string;
      size: string;
      current_stock: number;
      threshold: number;
    }>;
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

type NavigationProps = {
  onNavigateAction: (
    section: 'dashboard' | 'orders' | 'packeta' | 'order-detail',
    orderId?: string
  ) => void;
};

const chartConfig = {
  orders: {
    label: 'Objednávky',
    color: 'hsl(var(--chart-1))',
  },
  revenue: {
    label: 'Tržby',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const statusColors = {
  paid: '#10b981',
  new: '#10b981',
  shipped: '#3b82f6',
  cancelled: '#ef4444',
  processing: '#f59e0b',
};

export default function EnhancedDashboard({ onNavigateAction }: NavigationProps) {
  const { selectedDate } = useAdminContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    recentOrders: 0,
    todayOrders: 0,
    statusBreakdown: {},
    packetaStats: { total: 0, shipped: 0, pending: 0 },
    recentOrdersList: [],
    alerts: {
      lowStock: [],
      oldOrders: [],
      pendingShipments: 0,
    },
    chartData: {
      dailyOrders: [],
      statusChart: [],
      monthlyTrend: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Get all orders (with optional date filtering)
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

      // Apply date filter if selected
      if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw new Error(ordersError.message);

      if (!orders) {
        setStats({
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          recentOrders: 0,
          todayOrders: 0,
          statusBreakdown: {},
          packetaStats: { total: 0, shipped: 0, pending: 0 },
          recentOrdersList: [],
          alerts: {
            lowStock: [],
            oldOrders: [],
            pendingShipments: 0,
          },
          chartData: {
            dailyOrders: [],
            statusChart: [],
            monthlyTrend: [],
          },
        });
        return;
      }

      // Calculate basic stats
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount_total || 0), 0);

      // Unique customers
      const uniqueEmails = new Set(
        orders.filter((o) => o.customer_email).map((o) => o.customer_email)
      );
      const totalCustomers = uniqueEmails.size;

      // Recent orders (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentOrders = orders.filter((o) => new Date(o.created_at) > lastWeek).length;

      // Today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter((o) => {
        const orderDate = new Date(o.created_at);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      }).length;

      // Status breakdown
      const statusBreakdown: Record<string, number> = {};
      orders.forEach((order) => {
        statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
      });

      // Packeta stats
      const packetaOrders = orders.filter((o) => o.packeta_shipment_id);
      const packetaStats = {
        total: packetaOrders.length,
        shipped: packetaOrders.filter((o) => o.status === 'shipped').length,
        pending: packetaOrders.filter((o) => o.status !== 'shipped').length,
      };

      // Recent orders list (last 10)
      const recentOrdersList = orders.slice(0, 10);

      // Calculate alerts
      const now = new Date();
      const oldOrders = orders
        .filter(
          (o) =>
            (o.status === 'paid' || o.status === 'new' || o.status === 'processing') &&
            o.status !== 'shipped'
        )
        .map((o) => {
          const createdAt = new Date(o.created_at);
          const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return { ...o, days_old: daysOld };
        })
        .filter((o) => o.days_old > 1)
        .slice(0, 5);

      // Get low stock items
      let lowStock: Array<{
        product_name: string;
        size: string;
        current_stock: number;
        threshold: number;
      }> = [];

      try {
        const inventoryRes = await fetch('/api/admin/inventory');
        if (inventoryRes.ok) {
          const inventoryData = await inventoryRes.json();
          lowStock =
            inventoryData.products
              ?.filter(
                (p: { total_stock: number; low_stock_threshold: number }) =>
                  p.total_stock <= p.low_stock_threshold
              )
              .map((p: { name: string; total_stock: number; low_stock_threshold: number }) => ({
                product_name: p.name,
                size: 'Všechny velikosti',
                current_stock: p.total_stock,
                threshold: p.low_stock_threshold,
              }))
              .slice(0, 5) || [];
        }
      } catch {
        // Ignore inventory errors for now
      }

      const pendingShipments = orders.filter(
        (o) =>
          (o.status === 'paid' || o.status === 'new' || o.status === 'processing') &&
          !o.packeta_shipment_id &&
          o.status !== 'shipped' &&
          o.status !== 'cancelled'
      ).length;

      // Generate chart data
      const dailyOrders = generateDailyOrdersChart(orders);
      const statusChart = Object.entries(statusBreakdown).map(([status, count]) => ({
        status: getStatusLabel(status),
        count,
        color: statusColors[status as keyof typeof statusColors] || '#6b7280',
      }));
      const monthlyTrend = generateMonthlyTrendChart(orders);

      setStats({
        totalOrders,
        totalRevenue,
        totalCustomers,
        recentOrders,
        todayOrders,
        statusBreakdown,
        packetaStats,
        recentOrdersList,
        alerts: {
          lowStock,
          oldOrders,
          pendingShipments,
        },
        chartData: {
          dailyOrders,
          statusChart,
          monthlyTrend,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const generateDailyOrdersChart = (orders: Order[]) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map((date) => {
      const dayOrders = orders.filter((order) => order.created_at.startsWith(date));
      return {
        date,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, order) => sum + (order.total_cents || 0), 0) / 100,
      };
    });
  };

  const generateMonthlyTrendChart = (orders: Order[]) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' }),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
      };
    });

    return last6Months.map(({ month, year, monthIndex }) => {
      const monthOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getFullYear() === year && orderDate.getMonth() === monthIndex;
      });
      return {
        month,
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum, order) => sum + (order.total_cents || 0), 0) / 100,
      };
    });
  };

  const handleQuickAction = async (
    orderId: string,
    action: 'create_shipment' | 'mark_shipped' | 'mark_processing'
  ) => {
    setProcessingActions((prev) => new Set([...prev, `${orderId}-${action}`]));

    try {
      if (action === 'create_shipment') {
        const response = await fetch('/api/admin/packeta/create-shipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (response.ok) {
          await loadStats();
        } else {
          throw new Error('Failed to create shipment');
        }
      } else if (action === 'mark_shipped' || action === 'mark_processing') {
        const response = await fetch(`/api/admin/orders/${orderId}/quick-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        if (response.ok) {
          await loadStats();
        } else {
          throw new Error('Failed to update order status');
        }
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    } finally {
      setProcessingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(`${orderId}-${action}`);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Zaplaceno
          </Badge>
        );
      case 'new':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Nová objednávka
          </Badge>
        );
      case 'shipped':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Truck className="w-3 h-3 mr-1" />
            Odesláno
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Zrušeno
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Zpracovává se
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'Zaplaceno',
      new: 'Nové',
      shipped: 'Odesláno',
      cancelled: 'Zrušeno',
      processing: 'Zpracovává se',
    };
    return labels[status] || status;
  };

  if (loading && stats.totalOrders === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání statistik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {selectedDate
              ? `Data pro ${selectedDate.toLocaleDateString('cs-CZ')}`
              : 'Přehled vašeho e-shopu a objednávek'}
          </p>
          {selectedDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Vyberte jiný den v kalendáři nebo klikněte na &quot;Dnes&quot; pro aktuální data
            </p>
          )}
        </div>
        <Button onClick={loadStats} variant="outline" disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Obnovit
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateAction('orders')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Celkem objednávek</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">{stats.recentOrders} za týden</span>
                </div>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{(stats.totalRevenue / 100).toFixed(0)} Kč</div>
                <div className="text-sm text-muted-foreground">Celkový obrat</div>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">{stats.todayOrders} dnes</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Zákazníci</div>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600">Unikátní emaily</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.alerts.pendingShipments}</div>
                <div className="text-sm text-muted-foreground">Čekající zásilky</div>
                <div className="flex items-center gap-1 mt-1">
                  <Package className="w-3 h-3 text-orange-500" />
                  <span className="text-xs text-orange-600">K vyřízení</span>
                </div>
              </div>
              <Truck className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Denní objednávky (30 dní)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <AreaChart data={stats.chartData.dailyOrders}>
                <defs>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
                  }
                />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('cs-CZ')}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--color-orders)"
                  fillOpacity={1}
                  fill="url(#fillOrders)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Měsíční tržby (6 měsíců)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={stats.chartData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => [`${value} Kč`, 'Tržby']}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown and Alerts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Status objednávek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData.statusChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {stats.chartData.statusChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {stats.chartData.statusChart.map((item) => (
                <div key={item.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.status}</span>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Upozornění
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.alerts.oldOrders.length > 0 || stats.alerts.pendingShipments > 0 ? (
              <div className="space-y-4">
                {stats.alerts.oldOrders.length > 0 && (
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium text-red-800">Staré objednávky</h4>
                    <p className="text-sm text-red-600 mb-2">
                      {stats.alerts.oldOrders.length} objednávek čeká více než 1 den
                    </p>
                    <div className="space-y-1">
                      {stats.alerts.oldOrders.slice(0, 3).map((order) => (
                        <div key={order.id} className="text-xs text-muted-foreground">
                          {order.customer_email} - {order.days_old} dní
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => onNavigateAction('orders')}
                    >
                      Zobrazit všechny
                    </Button>
                  </div>
                )}

                {stats.alerts.pendingShipments > 0 && (
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-blue-800">Čekající zásilky</h4>
                    <p className="text-sm text-blue-600 mb-2">
                      {stats.alerts.pendingShipments} objednávek čeká na vytvoření zásilky
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => onNavigateAction('orders')}
                    >
                      Spravovat zásilky
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Žádná upozornění</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Poslední objednávky</CardTitle>
          <p className="text-sm text-muted-foreground">Nejnovější objednávky s rychlými akcemi</p>
        </CardHeader>
        <CardContent>
          {stats.recentOrdersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Zatím žádné objednávky</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentOrdersList.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center space-x-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div
                      className="cursor-pointer"
                      onClick={() => onNavigateAction('order-detail', order.id)}
                    >
                      <p className="text-sm font-medium leading-none">
                        {order.customer_name || 'Nezadáno'}
                      </p>
                      <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {order.amount_total ? `${(order.amount_total / 100).toFixed(2)} Kč` : '-'}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-1">
                      {(order.status === 'paid' || order.status === 'new') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-green-600 border-green-300 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(order.id, 'create_shipment');
                          }}
                          disabled={processingActions.has(`${order.id}-create_shipment`)}
                          title="Vytvořit zásilku"
                        >
                          {processingActions.has(`${order.id}-create_shipment`) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                      )}

                      {order.status === 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(order.id, 'mark_shipped');
                          }}
                          disabled={processingActions.has(`${order.id}-mark_shipped`)}
                          title="Označit jako odesláno"
                        >
                          {processingActions.has(`${order.id}-mark_shipped`) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Truck className="h-3 w-3" />
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => onNavigateAction('order-detail', order.id)}
                        title="Zobrazit detail"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
