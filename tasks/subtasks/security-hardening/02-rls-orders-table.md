# 02 - Implement RLS Policies for Orders Table

## Description
Create Row Level Security policies for the orders table to ensure only admin users can access order data.

## Time Estimate
45 minutes

## Acceptance Criteria
- [ ] RLS enabled on orders table
- [ ] Policy allowing admin users full access (SELECT, INSERT, UPDATE, DELETE)
- [ ] Policy denying access to non-admin users
- [ ] Test queries verifying policy enforcement

## Relevant Files
- `supabase/migrations/` - Migration file for RLS policies
- `lib/supabase/admin.ts` - Admin client configuration
- `app/api/admin/orders/` - Order management API routes

## Dependencies
- 01-identify-relevant-tables.md (must know table structure)

## Implementation Steps
1. Create migration file: `supabase/migrations/2024XXXX_rls_orders.sql`
2. Enable RLS: `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`
3. Create admin policy:
   ```sql
   CREATE POLICY "Admin full access to orders" ON orders
   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
   ```
4. Test with admin and non-admin queries

## Type Safety
- Ensure TypeScript types in `types/orders.ts` reflect access restrictions
- Use functional patterns for policy composition if extending

## Testing
- Run migration: `supabase db push`
- Test admin access: Query orders as admin user
- Test non-admin access: Verify access denied