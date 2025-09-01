'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  CreditCard,
  Package,
  Truck,
  AlertTriangle,
  Bell,
  Dot,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Notification, NotificationType, getNotificationColor } from './notifications-data';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const getIcon = (type: NotificationType) => {
  const iconProps = { className: 'h-4 w-4' };

  switch (type) {
    case 'order':
      return <ShoppingCart {...iconProps} />;
    case 'payment':
      return <CreditCard {...iconProps} />;
    case 'inventory':
      return <Package {...iconProps} />;
    case 'shipping':
      return <Truck {...iconProps} />;
    case 'system':
      return <AlertTriangle {...iconProps} />;
    default:
      return <Bell {...iconProps} />;
  }
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Právě teď';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const handleAction = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer',
        !notification.isRead && 'bg-muted/30'
      )}
      onClick={handleAction}
    >
      {/* Icon with color */}
      <div className={cn('flex-shrink-0 mt-0.5', getNotificationColor(notification.type))}>
        {getIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'text-sm font-medium truncate',
                !notification.isRead && 'font-semibold'
              )}
            >
              {notification.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(notification.createdAt)}
              </span>

              {notification.actionUrl && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>

          {/* Unread indicator and actions */}
          <div className="flex items-center gap-1">
            {!notification.isRead && <Dot className="h-6 w-6 text-blue-600 flex-shrink-0" />}

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
