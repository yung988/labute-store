// Export all email templates
export { default as OrderConfirmation } from './OrderConfirmation';
export { default as ShippingConfirmation } from './ShippingConfirmation';
export { default as DeliveredConfirmation } from './DeliveredConfirmation';

// Export theme and utilities
export { emailTheme, emailStyles, BRAND, createEmailStyle } from './theme';

// Type definitions for email props
export interface OrderItem {
  name: string;
  qty: number;
  price: string;
  imageUrl?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderConfirmationProps {
  orderId: string;
  items: OrderItem[];
  total: string;
  customerName?: string;
  customerEmail: string;
  shippingAddress?: ShippingAddress;
  orderDate?: string;
}

export interface ShippingConfirmationProps {
  orderId: string;
  trackingUrl: string;
  trackingNumber?: string;
  customerName?: string;
  customerEmail: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  carrierName?: string;
}

export interface DeliveredConfirmationProps {
  orderId: string;
  feedbackUrl: string;
  customerName?: string;
  customerEmail: string;
  deliveryDate?: string;
  productNames?: string[];
}
