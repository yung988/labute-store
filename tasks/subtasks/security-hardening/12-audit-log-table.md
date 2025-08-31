# 12 - Create Audit Log Table

## Description
Design and create a database table for comprehensive audit logging of admin actions.

## Time Estimate
30 minutes

## Acceptance Criteria
- [ ] Audit log table created with proper schema
- [ ] RLS policies applied to audit table
- [ ] Indexes for efficient querying
- [ ] Migration file created and tested

## Relevant Files
- `supabase/migrations/` - Audit table migration
- `types/audit.ts` - Audit log types
- `lib/supabase/admin.ts` - Admin operations for audit

## Dependencies
- 01-identify-relevant-tables.md (table creation patterns)

## Implementation Steps
1. Create migration: `supabase/migrations/2024XXXX_create_audit_log.sql`
2. Define table schema:
   ```sql
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     action VARCHAR(255) NOT NULL,
     resource_type VARCHAR(100) NOT NULL,
     resource_id UUID,
     changes JSONB,
     ip_address INET,
     user_agent TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
3. Add RLS and indexes
4. Test table creation

## Type Safety
- Define TypeScript interfaces for audit entries
- Use discriminated unions for action types

## Testing
- Table creation successful
- RLS policies prevent unauthorized access
- Indexes improve query performance