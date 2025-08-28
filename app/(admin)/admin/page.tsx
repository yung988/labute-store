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
  Menu,
  X,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OrdersTable from "@/components/admin/OrdersTable";
import InventoryTable from "@/components/admin/InventoryTable";
import PacketaManagement from "@/components/admin/PacketaManagement";
import OrderDetailView from "@/components/admin/OrderDetailView";
import CustomerCommunication from "@/components/admin/CustomerCommunication";
import Dashboard from "@/components/admin/Dashboard";

type AdminSection = 'dashboard' | 'orders' | 'inventory' | 'packeta' | 'customers' | 'order-detail';

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

    if (section && ['dashboard', 'orders', 'inventory', 'packeta', 'customers', 'order-detail'].includes(section)) {
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
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    if (orderId) {
      url.searchParams.set('orderId', orderId);
    } else {
      url.searchParams.delete('orderId');
    }
    window.history.pushState({}, '', url.toString());
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    navigateToSection('order-detail', orderId);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - STICKY */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:sticky lg:translate-x-0 
        w-64 h-screen top-0
        bg-card border-r border-border 
        z-50 transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h1 className="text-xl font-bold">YEEZUZ2020 Store</h1>
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
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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

        {/* User info - STICKY BOTTOM */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2">
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">Administrátor</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem disabled>
                <UserIcon className="w-4 h-4 mr-2" />
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Odhlásit se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content - SCROLLABLE */}
      <div className="flex-1 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">YEEZUZ2020 Store</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <UserIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Odhlásit se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content - SCROLLABLE AREA */}
        <div className="p-6 overflow-auto">
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
