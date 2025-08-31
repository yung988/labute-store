# 04 - Implement RLS Policies for Users Table

## Description
Set up Row Level Security for the users table with appropriate access controls for admin dashboard.

## Time Estimate
45 minutes

## Acceptance Criteria
- [ ] RLS enabled on users table
- [ ] Admin policy for user management
- [ ] User policy for self-access (if needed)
- [ ] Policies tested and verified

## Relevant Files
- `supabase/migrations/` - RLS policies migration
- `lib/supabase/admin.ts` - Admin user operations
- `app/api/admin/users/` - User management API
- `types/users.ts` - User type definitions

## Dependencies
- 01-identify-relevant-tables.md
- 03-rls-products-table.md (pattern consistency)

## Implementation Steps
1. Create migration file for users RLS
2. Enable RLS and define policies:
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Admin access to all users" ON users
   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
   
   CREATE POLICY "Users can read own data" ON users
   FOR SELECT USING (auth.uid() = id);
   ```
3. Test admin and user access scenarios

## Type Safety Considerations
- Define admin-only user fields in types
- Use discriminated unions for user access levels

## Testing
- Admin can view/manage all users
- Users can only access their own data
- Non-authenticated users denied access