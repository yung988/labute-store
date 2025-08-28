"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { InfoIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrdersTable from "@/components/admin/OrdersTable";
import InventoryTable from "@/components/admin/InventoryTable";
import PacketaManagement from "@/components/admin/PacketaManagement";
import StripeManagement from "@/components/admin/StripeManagement";
import OrderDetailView from "@/components/admin/OrderDetailView";




type AdminSection = 'orders' | 'inventory' | 'packeta' | 'order-detail';

export default function AdminPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<AdminSection>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/auth/login");
        return;
      }

      // Role check is now handled by middleware, just set user
      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Load section from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') as AdminSection;
    const orderId = urlParams.get('orderId');

    if (section && ['orders', 'inventory', 'packeta', 'stripe', 'order-detail'].includes(section)) {
      setCurrentSection(section);
      if (orderId) {
        setSelectedOrderId(orderId);
      }
    }
  }, []);

  const navigateToSection = (section: AdminSection, orderId?: string) => {
    setCurrentSection(section);
    if (orderId) {
      setSelectedOrderId(orderId);
    }
  };

  const handleOrderClick = (orderId: string) => {
    navigateToSection('order-detail', orderId);
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is an admin-only page. You must be authenticated to view it.
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={currentSection} onValueChange={(value) => navigateToSection(value as AdminSection)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="packeta">Packeta</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div>
            <h2 className="font-bold text-2xl mb-4">Orders</h2>
            <OrdersTable onOrderClick={handleOrderClick} />
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div>
            <h2 className="font-bold text-2xl mb-4">Inventory Management</h2>
            <InventoryTable />
          </div>
        </TabsContent>

        <TabsContent value="packeta" className="space-y-4">
          <div>
            <h2 className="font-bold text-2xl mb-4">Packeta Management</h2>
            <PacketaManagement />
          </div>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-4">
          <StripeManagement />
        </TabsContent>

        {currentSection === 'order-detail' && selectedOrderId && (
          <OrderDetailView
            orderId={selectedOrderId}
            onBack={() => navigateToSection('orders')}
          />
        )}
      </Tabs>
    </div>
  );
}
