"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { InfoIcon, Package, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrdersTable from "@/components/admin/OrdersTable";
import InventoryTable from "@/components/admin/InventoryTable";
import PacketaManagement from "@/components/admin/PacketaManagement";
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

  const menuItems = [
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'packeta', label: 'Packeta', icon: Truck },
  ];

  return (
    <div className="flex-1 w-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentSection === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => navigateToSection(item.id as AdminSection)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-accent text-xs p-3 rounded-md text-foreground">
            <InfoIcon size="14" strokeWidth={2} className="inline mr-2" />
            Admin-only area
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 p-6">
        {currentSection === 'orders' && (
          <div>
            <h2 className="font-bold text-2xl mb-4">Orders</h2>
            <OrdersTable onOrderClick={handleOrderClick} />
          </div>
        )}

        {currentSection === 'inventory' && (
          <div>
            <h2 className="font-bold text-2xl mb-4">Inventory Management</h2>
            <InventoryTable />
          </div>
        )}

        {currentSection === 'packeta' && (
          <div>
            <h2 className="font-bold text-2xl mb-4">Packeta Management</h2>
            <PacketaManagement />
          </div>
        )}

        {currentSection === 'order-detail' && selectedOrderId && (
          <OrderDetailView
            orderId={selectedOrderId}
            onBack={() => navigateToSection('orders')}
          />
        )}
      </div>
    </div>
  );
}
