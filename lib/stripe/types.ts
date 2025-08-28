// lib/stripe/types.ts
export interface StripeCheckoutSession {
    id: string;
    amount_total: number | null;
    customer_details?: {
        email?: string;
    } | null;
    metadata?: {
        items?: unknown[];
        customer_first_name?: string;
        customer_last_name?: string;
        customer_phone?: string;
        delivery_method?: string;
        delivery_address?: string;
        delivery_city?: string;
        delivery_postal_code?: string;
        packeta_point_id?: string;
    } | null;
    custom_fields?: Array<{
        key: string;
        text?: {
            value: string | null;
        };
    }>;
}

// Product data for Stripe catalog
export interface ProductData {
    id: string;
    name: string;
    description?: string;
    images: string[];
    price_cents: number;
    currency: string;
    metadata?: Record<string, string>;
}