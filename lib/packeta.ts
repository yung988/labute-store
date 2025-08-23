export interface PacketaPoint {
  id: string;
  name?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  currency?: string;
  dressingRoom?: boolean;
  creditCardPayment?: boolean;
  maxWeight?: number;
}