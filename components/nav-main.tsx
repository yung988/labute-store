'use client';

import { type Icon } from '@tabler/icons-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function NavMain({
  items,
  currentSection,
  onNavigateAction,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
    id?: string;
  }[];
  currentSection?: string;
  onNavigateAction?: (section: string) => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigace</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={currentSection === item.id}
                onClick={() => {
                  if (onNavigateAction && item.id) {
                    onNavigateAction(item.id);
                  }
                }}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
