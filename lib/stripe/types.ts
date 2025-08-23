// lib/stripe/types.ts
export interface StripeCheckoutSession {
    id: string;
    amount_total: number;
    customer_details?: {
        email?: string;
    };
    metadata?: {
        items?: unknown[]; // or a more specific type if you know the shape
    };
}