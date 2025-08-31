# 05 - Implement RLS Policies for Other Tables

## Description
Apply Row Level Security policies to remaining tables identified in task 01 (addresses, cart_items, etc.).

## Time Estimate
60 minutes

## Acceptance Criteria
- [ ] RLS enabled on all remaining relevant tables
- [ ] Appropriate policies for each table's access requirements
- [ ] All policies tested and documented

## Relevant Files
- `supabase/migrations/` - Consolidated RLS migration
- `lib/supabase/admin.ts` - Admin operations for these tables
- `app/api/admin/` - Related admin API routes

## Dependencies
- 01-identify-relevant-tables.md (table list)
- 02-rls-orders-table.md through 04-rls-users-table.md (patterns)

## Implementation Steps
1. Review table list from task 01
2. Create comprehensive migration for remaining tables
3. Apply appropriate policies based on sensitivity:
   - Addresses: Admin read, user self-access
   - Cart items: User self-access, admin read
   - Other tables as identified
4. Test each table's policies

## Functional Patterns
- Create reusable policy functions
- Use configuration objects for policy definitions

## Testing
- Verify admin access to all tables
- Test user-specific access where applicable
- Confirm public access restrictions