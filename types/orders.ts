// types/orders.ts
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Address {
  street: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_cents: number;
  size?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer: Customer;
  status: OrderStatus;
  total_cents: number;
  shipping_address: Address;
  billing_address?: Address;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  notes?: string;
}
