'use client';

import * as React from 'react';
import {
  IconDashboard,
  IconFolder,
  IconInnerShadowTop,
  IconListDetails,
  IconSearch,
  IconMail,
} from '@tabler/icons-react';
import { Calendar } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { Button } from '@/components/ui/button';
import { SimpleCalendar } from '@/components/ui/simple-calendar';
import CommandPalette from '@/components/CommandPalette';
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';

const data = {
  user: {
    name: 'Admin',
    email: 'admin@yeezuz2020.cz',
    avatar: '/avatars/admin.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/admin?section=dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Objednávky',
      url: '/admin?section=orders',
      icon: IconListDetails,
    },
    {
      title: 'Sklad',
      url: '/admin?section=inventory',
      icon: IconFolder,
    },
    {
      title: 'Emaily',
      url: '/admin/emails',
      icon: IconMail,
    },
  ],
  navSecondary: [
    {
      title: 'Vyhledat',
      url: '#',
      icon: IconSearch,
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNavigate?: (section: string, orderId?: string) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date | undefined) => void;
}

// Hook to fetch order dates for calendar indicators
function useOrderDates() {
  const [orderDates, setOrderDates] = React.useState<Date[]>([]);

  React.useEffect(() => {
    const fetchOrderDates = async () => {
      try {
        const response = await fetch('/api/admin/orders/dates');
        if (response.ok) {
          const data = await response.json();
          const dates = data.dates?.map((dateStr: string) => new Date(dateStr)) || [];
          setOrderDates(dates);
        }
      } catch (error) {
        console.error('Failed to fetch order dates:', error);
      }
    };

    fetchOrderDates();
  }, []);

  return orderDates;
}

export function AppSidebar({ onNavigate, selectedDate, onDateSelect, ...props }: AppSidebarProps) {
  const [commandOpen, setCommandOpen] = React.useState(false);
  const orderDates = useOrderDates();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen); // Toggle instead of just opening
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandOpen]);

  const handleSearchClick = () => {
    setCommandOpen(true);
  };

  // Enhanced navSecondary with search handler
  const enhancedNavSecondary = data.navSecondary.map((item) =>
    item.title === 'Vyhledat' ? { ...item, onClick: handleSearchClick } : item
  );

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/admin">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">YEEZUZ2020 Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />

        {/* Calendar Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Kalendář</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="group-data-[collapsible=icon]:hidden">
              <SimpleCalendar
                selected={selectedDate}
                onSelect={onDateSelect}
                orderDates={orderDates}
                className="p-2"
              />
            </div>
            <div className="hidden group-data-[collapsible=icon]:flex justify-center p-2">
              <Button variant="ghost" size="icon" title="Kalendář">
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Navigation at bottom */}
        <div className="mt-auto">
          <NavSecondary items={enhancedNavSecondary} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        {/* Notifications in footer */}
        <div className="mb-2">
          <NotificationDropdown />
        </div>
        <NavUser user={data.user} />
      </SidebarFooter>

      {/* Command Palette */}
      {onNavigate && (
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} onNavigate={onNavigate} />
      )}
    </Sidebar>
  );
}
