import { z } from 'zod';

// ============================================================================
// ORDER VALIDATION SCHEMAS
// ============================================================================

export const OrderStatusSchema = z.enum([
  'new',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const OrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  sku_id: z.string().uuid('Invalid SKU ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000, 'Quantity too large'),
  price_cents: z.number().int().min(0, 'Price cannot be negative'),
  size: z.string().min(1, 'Size is required').max(10, 'Size too long'),
});

export const OrderCreateSchema = z.object({
  id: z.string().uuid().optional(),
  customer_email: z.string().email('Invalid email format').max(255, 'Email too long'),
  customer_name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  customer_phone: z
    .string()
    .regex(/^(\+420|\+421)?[0-9]{9}$/, 'Invalid Czech/Slovak phone number')
    .optional(),
  packeta_point_id: z.string().max(100, 'Packeta point ID too long').optional(),
  items: z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
  status: OrderStatusSchema.default('new'),
  amount_total: z.number().int().min(0, 'Total amount cannot be negative').optional(),
  shipping_amount: z.number().int().min(0, 'Shipping amount cannot be negative').optional(),
  stripe_session_id: z.string().max(255, 'Stripe session ID too long').optional(),
});

export const OrderUpdateSchema = z.object({
  customer_email: z.string().email('Invalid email format').max(255, 'Email too long').optional(),
  customer_name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  customer_phone: z
    .string()
    .regex(/^(\+420|\+421)?[0-9]{9}$/, 'Invalid Czech/Slovak phone number')
    .optional(),
  packeta_point_id: z.string().max(100, 'Packeta point ID too long').optional(),
  packeta_shipment_id: z.string().max(100, 'Packeta shipment ID too long').optional(),
  items: z.array(OrderItemSchema).optional(),
  status: OrderStatusSchema.optional(),
  amount_total: z.number().int().min(0, 'Total amount cannot be negative').optional(),
  shipping_amount: z.number().int().min(0, 'Shipping amount cannot be negative').optional(),
  stripe_session_id: z.string().max(255, 'Stripe session ID too long').optional(),
  stripe_invoice_id: z.string().max(255, 'Stripe invoice ID too long').optional(),
});

// ============================================================================
// PRODUCT VALIDATION SCHEMAS
// ============================================================================

export const ProductImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  is_main_image: z.boolean().default(false),
});

export const SkuSchema = z.object({
  size: z.string().min(1, 'Size is required').max(10, 'Size too long'),
  stock: z.number().int().min(0, 'Stock cannot be negative').max(10000, 'Stock too large'),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .max(100, 'Slug too long'),
  price_cents: z.number().int().min(0, 'Price cannot be negative').max(10000000, 'Price too high'),
  product_images: z.array(ProductImageSchema).max(10, 'Too many images').optional(),
  skus: z.array(SkuSchema).min(1, 'Product must have at least one SKU'),
});

export const ProductUpdateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long').optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .max(100, 'Slug too long')
    .optional(),
  price_cents: z
    .number()
    .int()
    .min(0, 'Price cannot be negative')
    .max(10000000, 'Price too high')
    .optional(),
  product_images: z.array(ProductImageSchema).max(10, 'Too many images').optional(),
  skus: z.array(SkuSchema).optional(),
});

// ============================================================================
// INVENTORY VALIDATION SCHEMAS
// ============================================================================

export const InventoryUpdateSchema = z.object({
  sku_id: z.string().uuid('Invalid SKU ID'),
  stock_change: z
    .number()
    .int()
    .min(-1000, 'Stock change too large')
    .max(1000, 'Stock change too large'),
  reason: z.enum(['sale', 'return', 'adjustment', 'restock']),
});

// ============================================================================
// USER/ADMIN VALIDATION SCHEMAS
// ============================================================================

export const AdminUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  role: z.literal('admin'),
  user_metadata: z
    .object({
      role: z.literal('admin').optional(),
    })
    .optional(),
  app_metadata: z
    .object({
      role: z.literal('admin').optional(),
    })
    .optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type OrderUpdateInput = z.infer<typeof OrderUpdateSchema>;
export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type InventoryUpdateInput = z.infer<typeof InventoryUpdateSchema>;
export type AdminUser = z.infer<typeof AdminUserSchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validates order creation input
 */
export function validateOrderCreate(input: unknown): {
  success: boolean;
  data?: OrderCreateInput;
  errors?: z.ZodIssue[];
} {
  const result = OrderCreateSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error.issues };
}

/**
 * Validates order update input
 */
export function validateOrderUpdate(input: unknown): {
  success: boolean;
  data?: OrderUpdateInput;
  errors?: z.ZodIssue[];
} {
  const result = OrderUpdateSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error.issues };
}

/**
 * Validates product creation input
 */
export function validateProductCreate(input: unknown): {
  success: boolean;
  data?: ProductCreateInput;
  errors?: z.ZodIssue[];
} {
  const result = ProductCreateSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error.issues };
}

/**
 * Validates product update input
 */
export function validateProductUpdate(input: unknown): {
  success: boolean;
  data?: ProductUpdateInput;
  errors?: z.ZodIssue[];
} {
  const result = ProductUpdateSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error.issues };
}

/**
 * Validates inventory update input
 */
export function validateInventoryUpdate(input: unknown): {
  success: boolean;
  data?: InventoryUpdateInput;
  errors?: z.ZodIssue[];
} {
  const result = InventoryUpdateSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error.issues };
}

/**
 * Sanitizes string input by trimming and removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous HTML characters
    .slice(0, 1000); // Limit length
}

/**
 * Sanitizes email input
 */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>\"'&]/g, '')
    .slice(0, 255);
}
