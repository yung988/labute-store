'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CommandPaletteTrigger from '@/components/CommandPaletteTrigger';
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';
import { NotificationSystem } from '@/components/admin/NotificationSystem';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';

// Lazy load admin components
const ConsolidatedOrdersTable = React.lazy(
  () => import('@/components/admin/ConsolidatedOrdersTable')
);
const PacketaManagement = React.lazy(() => import('@/components/admin/PacketaManagement'));
const OrderDetailView = React.lazy(() => import('@/components/admin/OrderDetailView'));
const Dashboard = React.lazy(() => import('@/components/admin/Dashboard'));
const EmailCommunication = React.lazy(() => import('@/components/admin/EmailCommunication'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
      <p className="text-muted-foreground">Načítání...</p>
    </div>
  </div>
);

type AdminSection = 'dashboard' | 'orders' | 'packeta' | 'order-detail' | 'emails';

export default function AdminPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/auth/login');
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

    if (section && ['dashboard', 'orders', 'packeta', 'order-detail', 'emails'].includes(section)) {
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
  };

  const handleOrderClick = (orderId: string) => {
    navigateToSection('order-detail', orderId);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
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

  const getSectionTitle = (section: AdminSection): string => {
    const titles = {
      dashboard: 'Dashboard',
      orders: 'Objednávky',
      packeta: 'Packeta',
      'order-detail': 'Detail objednávky',
      emails: 'Emailová komunikace',
    };
    return titles[section] || 'Admin';
  };

  const handleSidebarNavigate = (section: string) => {
    navigateToSection(section as AdminSection);
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar currentSection={currentSection} onNavigateAction={handleSidebarNavigate} />
        <SidebarInset className="relative z-10 ml-64">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/admin">YEEZUZ2020 Admin</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getSectionTitle(currentSection)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="ml-auto flex items-center gap-2 px-4">
              <div className="hidden md:block max-w-sm">
                <CommandPaletteTrigger
                  onNavigate={(section, orderId) =>
                    navigateToSection(section as AdminSection, orderId)
                  }
                />
              </div>
              <NotificationDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <UserIcon className="h-4 w-4" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Odhlásit se
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="md:hidden mb-4">
              <CommandPaletteTrigger
                onNavigate={(section, orderId) =>
                  navigateToSection(section as AdminSection, orderId)
                }
              />
            </div>

            <div className="flex-1 rounded-xl bg-card p-4 shadow-sm">
              {currentSection === 'dashboard' && (
                <Suspense fallback={<LoadingSpinner />}>
                  <Dashboard onNavigateAction={navigateToSection} />
                </Suspense>
              )}

              {currentSection === 'orders' && (
                <div>
                  <h2 className="text-3xl font-bold mb-6">Konsolidované objednávky</h2>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ConsolidatedOrdersTable
                      onOrderClick={handleOrderClick}
                      onCommunicateWith={handleOrderClick}
                    />
                  </Suspense>
                </div>
              )}

              {currentSection === 'packeta' && (
                <div>
                  <h2 className="text-3xl font-bold mb-6">Packeta Management</h2>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PacketaManagement />
                  </Suspense>
                </div>
              )}

              {currentSection === 'emails' && (
                <Suspense fallback={<LoadingSpinner />}>
                  <EmailCommunication onOrderClick={(id) => navigateToSection('order-detail', id)} />
                </Suspense>
              )}

              {currentSection === 'order-detail' && selectedOrderId && (
                <Suspense fallback={<LoadingSpinner />}>
                  <OrderDetailView
                    orderId={selectedOrderId}
                    onBack={() => navigateToSection('orders')}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </SidebarInset>
        <NotificationSystem />
      </SidebarProvider>
    </div>
  );
}
