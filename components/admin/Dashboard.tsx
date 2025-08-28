"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Package,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DashboardStats = {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  recentOrders: number;
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
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    recentOrders: 0,
    statusBreakdown: {},
    packetaStats: { total: 0, shipped: 0, pending: 0 },
    recentOrdersList: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      
      // Get all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw new Error(ordersError.message);

      if (!orders) {
        setStats({
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
          recentOrders: 0,
          statusBreakdown: {},
          packetaStats: { total: 0, shipped: 0, pending: 0 },
          recentOrdersList: []
        });
        return;
      }

      // Calculate stats
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
      
      // Unique customers
      const uniqueEmails = new Set(orders.filter(o => o.customer_email).map(o => o.customer_email));
      const totalCustomers = uniqueEmails.size;

      // Recent orders (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentOrders = orders.filter(o => new Date(o.created_at) > lastWeek).length;

      // Status breakdown
      const statusBreakdown: Record<string, number> = {};
      orders.forEach(order => {
        statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
      });

      // Packeta stats
      const packetaOrders = orders.filter(o => o.packeta_shipment_id);
      const packetaStats = {
        total: packetaOrders.length,
        shipped: packetaOrders.filter(o => o.status === 'shipped').length,
        pending: packetaOrders.filter(o => o.status !== 'shipped').length
      };

      // Recent orders list (last 10)
      const recentOrdersList = orders.slice(0, 10);

      setStats({
        totalOrders,
        totalRevenue,
        totalCustomers,
        recentOrders,
        statusBreakdown,
        packetaStats,
        recentOrdersList
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Zaplaceno</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Truck className="w-3 h-3 mr-1" />Odesláno</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Zrušeno</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Zpracovává se</Badge>;
      case 'new':
        return <Badge variant="outline">Nová</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Přehled obchodu a statistiky</p>
        </div>
        <Button onClick={loadStats} variant="outline" disabled={loading}>
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

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Celkem objednávek</div>
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
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.recentOrders}</div>
                <div className="text-sm text-muted-foreground">Posledních 7 dní</div>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Status objednávek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(status)}
                  </div>
                  <div className="font-semibold">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Packeta Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Packeta zásilky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Celkem zásilek</span>
                <div className="text-2xl font-bold">{stats.packetaStats.total}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600">Odesláno</span>
                <div className="font-semibold text-blue-600">{stats.packetaStats.shipped}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-600">Čeká na odeslání</span>
                <div className="font-semibold text-orange-600">{stats.packetaStats.pending}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Poslední objednávky</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrdersList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatím žádné objednávky
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentOrdersList.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {order.customer_name || 'Nezadáno'} ({order.customer_email})
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">
                        {order.amount_total ? `${(order.amount_total / 100).toFixed(2)} Kč` : '-'}
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
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