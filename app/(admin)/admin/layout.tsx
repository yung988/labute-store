'use client';

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AdminProvider } from '@/context/AdminContext';

const getSectionTitle = (section: string): string => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    orders: 'Objednávky',
    inventory: 'Sklad',
    'order-detail': 'Detail objednávky',
    emails: 'Emailová komunikace',
    packeta: 'Packeta',
    support: 'Zákaznická podpora',
  };
  return titles[section] || 'Admin Panel';
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState<Date>();

  const currentSection =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('section') || 'dashboard'
      : 'dashboard';
  const pageTitle = getSectionTitle(currentSection);

  const handleNavigate = React.useCallback(
    (section: string, orderId?: string) => {
      const url = new URL('/admin', window.location.origin);
      url.searchParams.set('section', section);
      if (orderId) {
        url.searchParams.set('orderId', orderId);
      }
      router.push(url.toString());
    },
    [router]
  );

  const handleDateSelect = React.useCallback((date: Date | undefined) => {
    setSelectedDate(date);
  }, []);

  return (
    <AdminProvider value={{ selectedDate, onDateSelect: handleDateSelect }}>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
          } as React.CSSProperties
        }
      >
        <AppSidebar
          onNavigate={handleNavigate}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{pageTitle}</h2>
              {selectedDate && (
                <span className="text-sm text-muted-foreground">
                  • {selectedDate.toLocaleDateString('cs-CZ')}
                </span>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminProvider>
  );
}
