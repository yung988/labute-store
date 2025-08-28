"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users,
  Settings,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OrdersTable from "@/components/admin/OrdersTable";
import InventoryTable from "@/components/admin/InventoryTable";
import PacketaManagement from "@/components/admin/PacketaManagement";
import OrderDetailView from "@/components/admin/OrderDetailView";
import CustomerCommunication from "@/components/admin/CustomerCommunication";
import Dashboard from "@/components/admin/Dashboard";

type AdminSection = 'dashboard' | 'orders' | 'inventory' | 'packeta' | 'customers' | 'settings' | 'order-detail';

export default function AdminPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/auth/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') as AdminSection;
    const orderId = urlParams.get('orderId');

    if (section && ['dashboard', 'orders', 'inventory', 'packeta', 'customers', 'settings', 'order-detail'].includes(section)) {
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
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    navigateToSection('order-detail', orderId);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Načítání...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'orders', label: 'Objednávky', icon: ShoppingCart },
    { id: 'packeta', label: 'Packeta', icon: Truck },
    { id: 'customers', label: 'Zákazníci', icon: Users },
    { id: 'inventory', label: 'Skladem', icon: Package },
    { id: 'settings', label: 'Nastavení', icon: Settings },
  ];

  return (
    <div className="flex-1 w-full flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:relative lg:translate-x-0 
        w-64 h-full bg-card border-r border-border 
        z-50 transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentSection === item.id ? "default" : "ghost"}
                className="w-full justify-start h-10"
                onClick={() => navigateToSection(item.id as AdminSection)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">Administrátor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold capitalize">
            {currentSection === 'order-detail' ? 'Detail objednávky' : 
             menuItems.find(item => item.id === currentSection)?.label || currentSection}
          </h2>
          <div />
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {currentSection === 'dashboard' && (
            <Dashboard />
          )}

          {currentSection === 'orders' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Objednávky</h2>
              <OrdersTable onOrderClick={handleOrderClick} />
            </div>
          )}

          {currentSection === 'inventory' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Správa skladem</h2>
              <InventoryTable />
            </div>
          )}

          {currentSection === 'packeta' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Packeta Management</h2>
              <PacketaManagement />
            </div>
          )}

          {currentSection === 'customers' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Zákazníci</h2>
              <CustomerCommunication />
            </div>
          )}

          {currentSection === 'settings' && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Nastavení</h2>
              <div className="text-muted-foreground">Nastavení bude implementováno později...</div>
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
    </div>
  );
}
