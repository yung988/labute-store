'use client';
import React, { useState, useEffect, Suspense } from 'react';

export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { NotificationSystem } from '@/components/admin/NotificationSystem';

// layout handled by app/(admin)/admin/layout.tsx

// Lazy load admin components
const OrdersTable = React.lazy(() => import('@/components/admin/OrdersTable'));
const InventoryTable = React.lazy(() => import('@/components/admin/InventoryTable'));
const OrderDetailView = React.lazy(() => import('@/components/admin/OrderDetailView'));

const EnhancedDashboard = React.lazy(() => import('@/components/admin/EnhancedDashboard'));
const EmailClientContent = React.lazy(() => import('@/components/admin/EmailClientContent'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
      <p className="text-muted-foreground">Načítání...</p>
    </div>
  </div>
);

type AdminSection = 'dashboard' | 'orders' | 'inventory' | 'order-detail' | 'emails' | 'packeta';

export default function AdminPage() {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
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
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') as AdminSection;
    const orderId = urlParams.get('orderId');
    const email = urlParams.get('email');

    if (
      section &&
      ['dashboard', 'orders', 'inventory', 'order-detail', 'emails'].includes(section)
    ) {
      setCurrentSection(section);
      if (orderId) {
        setSelectedOrderId(orderId);
      }
      if (email) {
        setSelectedEmail(email);
      }
    }
  }, []);

  const navigateToSection = (section: AdminSection, orderId?: string) => {
    if (typeof window === 'undefined') return;
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

  const handleNavigateToEmails = (orderId?: string, customerEmail?: string) => {
    if (typeof window === 'undefined') return;
    setSelectedOrderId(orderId || null);
    setSelectedEmail(customerEmail || null);

    const url = new URL(window.location.href);
    url.searchParams.set('section', 'emails');
    if (orderId) {
      url.searchParams.set('orderId', orderId);
    }
    if (customerEmail) {
      url.searchParams.set('email', customerEmail);
    } else {
      url.searchParams.delete('email');
    }
    window.history.pushState({}, '', url.toString());
    navigateToSection('emails', orderId);
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

  return (
    <>
      {/* Main content */}
      <div className="space-y-6">
        {currentSection === 'dashboard' && (
          <Suspense fallback={<LoadingSpinner />}>
            <EnhancedDashboard onNavigateAction={navigateToSection} />
          </Suspense>
        )}

        {currentSection === 'orders' && (
          <Suspense fallback={<LoadingSpinner />}>
            <OrdersTable
              onOrderClick={handleOrderClick}
              onNavigateToEmails={handleNavigateToEmails}
            />
          </Suspense>
        )}

        {currentSection === 'inventory' && (
          <Suspense fallback={<LoadingSpinner />}>
            <InventoryTable />
          </Suspense>
        )}

        {currentSection === 'emails' && (
          <Suspense fallback={<LoadingSpinner />}>
            <EmailClientContent
              onOrderClick={(id: string) => navigateToSection('order-detail', id)}
              initialOrderId={selectedOrderId || undefined}
              initialEmail={selectedEmail || undefined}
            />
          </Suspense>
        )}

        {currentSection === 'order-detail' && selectedOrderId && (
          <Suspense fallback={<LoadingSpinner />}>
            <OrderDetailView
              orderId={selectedOrderId}
              onBack={() => navigateToSection('orders')}
              onNavigateToEmails={handleNavigateToEmails}
            />
          </Suspense>
        )}
      </div>

      <NotificationSystem />
    </>
  );
}
