'use client';

import * as React from 'react';
import {
  IconDashboard,
  IconInnerShadowTop,
  IconListDetails,
  IconPackage,
  IconHelp,
  IconSettings,
  IconMail,
} from '@tabler/icons-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentSection?: string;
  onNavigateAction?: (section: string) => void;
}

const defaultData = {
  user: {
    name: 'Admin',
    email: 'admin@yeezuz2020.cz',
    avatar: '/avatars/admin.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '#',
      icon: IconDashboard,
      id: 'dashboard',
    },
    {
      title: 'Objednávky',
      url: '#',
      icon: IconListDetails,
      id: 'orders',
    },
    {
      title: 'Packeta',
      url: '#',
      icon: IconPackage,
      id: 'packeta',
    },
    {
      title: 'Emaily',
      url: '#',
      icon: IconMail,
      id: 'emails',
    },
  ],
  navSecondary: [
    {
      title: 'Nastavení',
      url: '#',
      icon: IconSettings,
    },
    {
      title: 'Nápověda',
      url: '#',
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ currentSection, onNavigateAction, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset" className="border-r bg-sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconInnerShadowTop className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">YEEZUZ2020</span>
                  <span className="truncate text-xs">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={defaultData.navMain}
          currentSection={currentSection}
          onNavigateAction={onNavigateAction}
        />
        <NavSecondary items={defaultData.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  );
}
