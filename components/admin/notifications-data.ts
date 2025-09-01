export type NotificationType = 'order' | 'payment' | 'inventory' | 'system' | 'shipping';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  orderId?: string;
}

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'order',
    title: 'Nová objednávka',
    message: 'Objednávka #12345 byla vytvořena',
    isRead: false,
    createdAt: new Date('2024-01-10T14:30:00'),
    actionUrl: '/admin?section=orders&orderId=12345',
    orderId: '12345',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Problém s platbou',
    message: 'Platba pro objednávku #12344 byla zamítnuta',
    isRead: false,
    createdAt: new Date('2024-01-10T14:15:00'),
    actionUrl: '/admin?section=orders&orderId=12344',
    orderId: '12344',
  },
  {
    id: '3',
    type: 'inventory',
    title: 'Nízký sklad',
    message: 'Produkt "Basic Tee" má pouze 2 kusy na skladě',
    isRead: true,
    createdAt: new Date('2024-01-10T13:45:00'),
    actionUrl: '/admin?section=inventory',
  },
  {
    id: '4',
    type: 'shipping',
    title: 'Změna statusu zásilky',
    message: 'Objednávka #12343 byla odeslána',
    isRead: false,
    createdAt: new Date('2024-01-10T12:20:00'),
    actionUrl: '/admin?section=orders&orderId=12343',
    orderId: '12343',
  },
  {
    id: '5',
    type: 'system',
    title: 'Systémové upozornění',
    message: 'Plánovaná údržba systému dnes v 02:00',
    isRead: true,
    createdAt: new Date('2024-01-10T10:00:00'),
  },
  {
    id: '6',
    type: 'order',
    title: 'Nová objednávka',
    message: 'Objednávka #12342 byla vytvořena',
    isRead: true,
    createdAt: new Date('2024-01-10T09:30:00'),
    actionUrl: '/admin?section=orders&orderId=12342',
    orderId: '12342',
  },
];

export const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return 'ShoppingCart';
    case 'payment':
      return 'CreditCard';
    case 'inventory':
      return 'Package';
    case 'shipping':
      return 'Truck';
    case 'system':
      return 'AlertTriangle';
    default:
      return 'Bell';
  }
};

export const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return 'text-blue-600';
    case 'payment':
      return 'text-red-600';
    case 'inventory':
      return 'text-orange-600';
    case 'shipping':
      return 'text-green-600';
    case 'system':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
};
