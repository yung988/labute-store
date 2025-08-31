# 03 - Implement RLS Policies for Products Table

## Description
Implement Row Level Security policies for the products table with admin-only access control.

## Time Estimate
45 minutes

## Acceptance Criteria
- [ ] RLS enabled on products table
- [ ] Admin policy for full CRUD operations
- [ ] Public read policy for published products (if applicable)
- [ ] Verified policy enforcement

## Relevant Files
- `supabase/migrations/` - RLS migration
- `lib/supabase/admin.ts` - Admin database operations
- `app/api/admin/products/` - Product management routes
- `types/products.ts` - Product type definitions

## Dependencies
- 01-identify-relevant-tables.md
- 02-rls-orders-table.md (similar pattern)

## Implementation Steps
1. Create migration: `supabase/migrations/2024XXXX_rls_products.sql`
2. Enable RLS and create policies:
   ```sql
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Admin full access to products" ON products
   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
   
   CREATE POLICY "Public read published products" ON products
   FOR SELECT USING (published = true);
   ```
3. Test policies with different user roles

## Functional Patterns
- Use pure functions for product access logic
- Implement type guards for admin vs public access

## Testing
- Admin CRUD operations
- Public read access to published products
- Access denial for unpublished products to non-admins