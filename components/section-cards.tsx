"use client";
import { useEffect, useState } from "react";
import { IconTrendingDown, IconTrendingUp, IconShoppingCart, IconUsers, IconTruck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type AdminStats = {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  todayOrders: number;
  recentOrders: number;
  pendingShipments: number;
  lowStockItems: number;
};

export function SectionCards() {
  const [stats, setStats] = useState<AdminStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    todayOrders: 0,
    recentOrders: 0,
    pendingShipments: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = createClient();

        // Get orders stats
        const { data: orders } = await supabase
          .from('orders')
          .select('amount_total, created_at, customer_email, status, packeta_shipment_id')
          .order('created_at', { ascending: false });

        if (orders) {
          const totalOrders = orders.length;
          const totalRevenue = orders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
          const uniqueEmails = new Set(orders.filter(o => o.customer_email).map(o => o.customer_email));
          const totalCustomers = uniqueEmails.size;

          // Today's orders
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayOrders = orders.filter(o => {
            const orderDate = new Date(o.created_at);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
          }).length;

          // Recent orders (last 7 days)
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          const recentOrders = orders.filter(o => new Date(o.created_at) > lastWeek).length;

          // Pending shipments
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
            todayOrders,
            recentOrders,
            pendingShipments,
            lowStockItems: 0, // Will be loaded from inventory API
          });
        }
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Celkový obrat</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {(stats.totalRevenue / 100).toFixed(0)} Kč
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +{stats.todayOrders} dnes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Růst tržeb <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {stats.recentOrders} objednávek za posledních 7 dní
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Celkem objednávek</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalOrders}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconShoppingCart className="size-3 mr-1" />
              {stats.todayOrders} dnes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Aktivní prodej <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {stats.recentOrders} objednávek tento týden
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Zákazníci</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalCustomers}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconUsers className="size-3 mr-1" />
              Registrovaní
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Zákaznická základna <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Aktivní uživatelé obchodu
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Čekající zásilky</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.pendingShipments}
          </CardTitle>
          <CardAction>
            <Badge variant={stats.pendingShipments > 0 ? "destructive" : "outline"}>
              <IconTruck className="size-3 mr-1" />
              {stats.pendingShipments > 0 ? 'Vyžaduje pozornost' : 'Vše OK'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.pendingShipments > 0 ? 'Vyžaduje akci' : 'Vše zpracováno'} {stats.pendingShipments > 0 ? <IconTrendingDown className="size-4" /> : <IconTrendingUp className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Objednávky čekající na odeslání
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
