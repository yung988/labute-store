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
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Send,
  Eye,
  ArrowRight,
  Bell,
  Zap,
  Calendar
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
};

type NavigationProps = {
  onNavigateAction: (section: 'dashboard' | 'orders' | 'inventory' | 'packeta' | 'customers' | 'order-detail', orderId?: string) => void;
};

export default function Dashboard({ onNavigateAction }: NavigationProps) {
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
      pendingShipments: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

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
          todayOrders: 0,
          statusBreakdown: {},
          packetaStats: { total: 0, shipped: 0, pending: 0 },
          recentOrdersList: [],
          alerts: {
            lowStock: [],
            oldOrders: [],
            pendingShipments: 0
          }
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

      // Today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      }).length;

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

      // Calculate alerts - objednávky které jsou zaplacené ale ještě nevyřízené
      const now = new Date();
      const oldOrders = orders
        .filter(o => (o.status === 'paid' || o.status === 'new' || o.status === 'processing') && o.status !== 'shipped')
        .map(o => {
          const createdAt = new Date(o.created_at);
          const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return { ...o, days_old: daysOld };
        })
        .filter(o => o.days_old > 1) // Zkrátím na 1 den místo 3
        .slice(0, 5);

      // Get low stock items (we'll fetch this from inventory API)
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
          lowStock = inventoryData.products
            ?.filter((p: { total_stock: number; low_stock_threshold: number }) => p.total_stock <= p.low_stock_threshold)
            .map((p: { name: string; total_stock: number; low_stock_threshold: number }) => ({
              product_name: p.name,
              size: 'Všechny velikosti',
              current_stock: p.total_stock,
              threshold: p.low_stock_threshold
            }))
            .slice(0, 5) || [];
        }
      } catch {
        // Ignore inventory errors for now
      }

      const pendingShipments = orders.filter(o => 
        (o.status === 'paid' || o.status === 'new' || o.status === 'processing') && 
        !o.packeta_shipment_id && 
        o.status !== 'shipped' && 
        o.status !== 'cancelled'
      ).length;

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
          pendingShipments
        }
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

  const handleQuickAction = async (orderId: string, action: 'create_shipment' | 'mark_shipped' | 'mark_processing') => {
    setProcessingActions(prev => new Set([...prev, `${orderId}-${action}`]));
    
    try {
      if (action === 'create_shipment') {
        const response = await fetch('/api/admin/packeta/create-shipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        });
        
        if (response.ok) {
          await loadStats(); // Refresh data
        } else {
          throw new Error('Failed to create shipment');
        }
      } else if (action === 'mark_shipped' || action === 'mark_processing') {
        const response = await fetch(`/api/admin/orders/${orderId}/quick-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        
        if (response.ok) {
          await loadStats(); // Refresh data
        } else {
          throw new Error('Failed to update order status');
        }
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${orderId}-${action}`);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Zaplaceno</Badge>;
      case 'new':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Nová objednávka</Badge>;
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Truck className="w-3 h-3 mr-1" />Odesláno</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Zrušeno</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Zpracovává se</Badge>;
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
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Přehled obchodu a statistiky
          </p>
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

      {/* Alerts Section */}
      {(stats.alerts.lowStock.length > 0 || stats.alerts.oldOrders.length > 0 || stats.alerts.pendingShipments > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Upozornění</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.alerts.lowStock.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800">
                    Nízké zásoby
                  </CardTitle>
                  <Package className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">
                    {stats.alerts.lowStock.length}
                  </div>
                  <p className="text-xs text-orange-700">
                    produktů má nízké zásoby
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full text-orange-700 border-orange-300 hover:bg-orange-100"
                    onClick={() => onNavigateAction('inventory')}
                  >
                    Zobrazit sklad
                  </Button>
                </CardContent>
              </Card>
            )}

            {stats.alerts.oldOrders.length > 0 && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-800">
                    Staré objednávky
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Bell className="h-4 w-4 text-red-600" />
                    <Clock className="h-4 w-4 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-900">
                    {stats.alerts.oldOrders.length}
                  </div>
                  <p className="text-xs text-red-700">
                    objednávek čeká více než 1 den
                  </p>
                  <div className="mt-3 space-y-2">
                    {stats.alerts.oldOrders.slice(0, 2).map((order) => (
                      <div key={order.id} className="flex items-center justify-between text-xs bg-white/50 p-2 rounded">
                        <span className="font-medium">{order.customer_email}</span>
                        <span className="text-red-600">{order.days_old} dní</span>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-red-700 border-red-300 hover:bg-red-100"
                      onClick={() => onNavigateAction('orders')}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Zobrazit všechny
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.alerts.pendingShipments > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-800">
                    Čekající zásilky
                  </CardTitle>
                  <Truck className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">
                    {stats.alerts.pendingShipments}
                  </div>
                  <p className="text-xs text-blue-700">
                    objednávek čeká na vytvoření zásilky
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                    onClick={() => onNavigateAction('packeta')}
                  >
                    Spravovat zásilky
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateAction('orders')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Celkem objednávek</div>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-8 h-8 text-blue-600" />
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
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

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateAction('customers')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Zákazníci</div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-8 h-8 text-purple-600" />
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigateAction('inventory')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.recentOrders}</div>
                <div className="text-sm text-muted-foreground">Posledních 7 dní</div>
                {stats.alerts.lowStock.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Zap className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-600">{stats.alerts.lowStock.length} nízké zásoby</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-orange-600" />
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Status Breakdown */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Status objednávek
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center">
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusBadge(status)}
                  </div>
                  <div className="font-semibold">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Packeta Stats */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Packeta zásilky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Celkem zásilek</span>
                <span className="text-2xl font-bold">{stats.packetaStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600">Odesláno</span>
                <span className="font-semibold text-blue-600">{stats.packetaStats.shipped}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-600">Čeká na odeslání</span>
                <span className="font-semibold text-orange-600">{stats.packetaStats.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Poslední objednávky</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nejnovější objednávky s rychlými akcemi
          </p>
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
                      <p className="text-sm text-muted-foreground">
                        {order.customer_email}
                      </p>
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