'use client';

import { toast } from 'sonner';
import { Bell, ShoppingCart, CreditCard, Package, Truck, AlertTriangle } from 'lucide-react';
import { NotificationType } from './notifications-data';

interface NotificationToastProps {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

const getNotificationIcon = (type: NotificationType) => {
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

export const showNotificationToast = ({
  type,
  title,
  message,
  actionUrl,
}: NotificationToastProps) => {
  const icon = getNotificationIcon(type);

  toast(title, {
    description: message,
    icon,
    action: actionUrl
      ? {
          label: 'Zobrazit',
          onClick: () => (window.location.href = actionUrl),
        }
      : undefined,
    duration: 5000,
  });
};

// Mock funkce pro simulaci real-time notifikací
export function NotificationSystem() {
  // Automatické mock toasty jsou zakázané - používá se pouze pro manuální volání showNotificationToast
  return null; // Tato komponenta nevrací žádný JSX, pouze spravuje toasty
}

// Funkce pro spuštění mock notifikací (volitelně)
export function startMockNotifications() {
  const notifications = [
    {
      type: 'order' as const,
      title: 'Nová objednávka',
      message: 'Objednávka #12345 byla vytvořena',
      actionUrl: '/admin?section=orders&orderId=12345',
    },
    {
      type: 'payment' as const,
      title: 'Problém s platbou',
      message: 'Platba pro objednávku #12344 byla zamítnuta',
      actionUrl: '/admin?section=orders&orderId=12344',
    },
    {
      type: 'inventory' as const,
      title: 'Nízký sklad',
      message: 'Produkt "Basic Tee" má pouze 2 kusy na skladě',
      actionUrl: '/admin?section=inventory',
    },
  ];

  // Spusť notifikace s různými zpožděními
  notifications.forEach((notification, index) => {
    setTimeout(
      () => {
        showNotificationToast(notification);
      },
      (index + 1) * 3000
    ); // 3s, 6s, 9s
  });
}
