'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    // Simulace nové objednávky po 3 sekundách
    const timer1 = setTimeout(() => {
      showNotificationToast({
        type: 'order',
        title: 'Nová objednávka!',
        message: 'Objednávka #12346 byla právě vytvořena.',
        actionUrl: '/admin?section=orders&orderId=12346',
      });
    }, 3000);

    // Simulace problému s platbou po 8 sekundách
    const timer2 = setTimeout(() => {
      showNotificationToast({
        type: 'payment',
        title: 'Problém s platbou',
        message: 'Platba pro objednávku #12347 vyžaduje pozornost.',
        actionUrl: '/admin?section=orders&orderId=12347',
      });
    }, 8000);

    // Simulace low stock po 15 sekundách
    const timer3 = setTimeout(() => {
      showNotificationToast({
        type: 'inventory',
        title: 'Nízký sklad!',
        message: 'Produkt "Premium Hoodie" má pouze 1 kus na skladě.',
        actionUrl: '/admin?section=inventory',
      });
    }, 15000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return null; // Tato komponenta nevrací žádný JSX, pouze spravuje toasty
}
