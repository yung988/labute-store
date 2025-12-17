'use client';

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from './NotificationItem';
import { type Notification } from './notifications-data';

interface ApiNotification {
  id: string;
  type: 'order' | 'payment' | 'inventory' | 'system' | 'shipping';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  orderId?: string;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications =
    filter === 'all' ? notifications : notifications.filter((n) => !n.isRead);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Still update UI optimistically
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications/read-all', {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Still update UI optimistically
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Still update UI optimistically
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  // Auto-mark as read when dropdown opens
  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      // Mark all unread notifications as read after a short delay
      setTimeout(() => {
        const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
        unreadIds.forEach((id) => markAsRead(id));
      }, 1000); // 1 second delay to allow user to see the notifications
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications?limit=25', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        const list: Notification[] = (json.notifications || []).map((n: ApiNotification) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        }));
        if (!cancelled) setNotifications(list);
      } catch (e) {
        // Silently ignore; keep current
        console.warn('Notifications fetch failed', e);
      }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <div className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground">
          <div className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
          <span className="group-data-[collapsible=icon]:hidden">Notifikace</span>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[500px] p-0 z-[100]" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0 text-base font-semibold">Notifikace</DropdownMenuLabel>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className={filter === 'unread' ? 'bg-muted' : ''}
            >
              <Filter className="h-3 w-3" />
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                title="Označit vše jako přečtené"
              >
                <CheckCheck className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {filter === 'unread' ? 'Žádné nepřečtené notifikace' : 'Žádné notifikace'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                  {index < filteredNotifications.length - 1 && (
                    <div className="mx-2 my-1">
                      <div className="h-px bg-border" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-3">
              <Button variant="outline" size="sm" className="w-full">
                Zobrazit všechny notifikace
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
