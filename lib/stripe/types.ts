// lib/stripe/types.ts
export interface StripeCheckoutSession {
    id: string;
    amount_total: number | null;
    customer_details?: {
        email?: string;
    } | null;
    metadata?: {
        items?: unknown[]; // or a more specific type if you know the shape
    } | null;
}