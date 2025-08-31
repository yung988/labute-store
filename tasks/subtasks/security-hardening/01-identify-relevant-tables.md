# 01 - Identify Relevant Tables for RLS

## Description
Analyze the database schema to identify all tables that require Row Level Security (RLS) policies for admin dashboard access control.

## Time Estimate
30 minutes

## Acceptance Criteria
- [ ] List of all database tables used by admin dashboard
- [ ] Classification of tables by sensitivity level (public, protected, admin-only)
- [ ] Identification of foreign key relationships affecting RLS
- [ ] Documentation of current RLS status for each table

## Relevant Files
- `supabase/migrations/` - Database schema files
- `lib/supabase/admin.ts` - Admin database client
- `app/api/admin/` - Admin API routes using these tables

## Dependencies
- None (foundation task)

## Implementation Steps
1. Review migration files in `supabase/migrations/`
2. Examine admin API routes to identify accessed tables
3. Classify tables by access requirements
4. Document findings in this file

## Output
Identified tables from codebase analysis:

### Admin-Only Tables (Require RLS with admin role verification)
- **orders** - Core order management, customer data, financial info
- **products** - Product catalog management
- **skus** - Stock keeping units with inventory levels
- **product_images** - Product image assets
- **webhook_events** - Stripe/payment webhooks (sensitive)

### Protected Tables (User-specific access)
- None identified - all admin operations are admin-only

### Public Tables (Anonymous read access)
- None identified - all tables require authentication for admin dashboard

### Current RLS Status
- **orders**: Partial RLS implemented (database-security-migration.sql)
- **products**: Basic public read policy exists
- **skus**: Basic public read policy exists
- **product_images**: Basic public read policy exists
- **webhook_events**: New table, no policies yet

### Foreign Key Relationships
- orders.customer_id → auth.users(id)
- skus.product_id → products(id) [assumed]
- product_images.product_id → products(id) [assumed]

### Security Issues Identified
- Service role key used in admin.ts (high risk)
- Mixed authentication patterns in API routes
- No comprehensive input validation
- No audit logging system