# 08 - Move Order Management to Server-side Operations

## Description
Refactor order management operations to run exclusively on the server-side for enhanced security.

## Time Estimate
60 minutes

## Acceptance Criteria
- [ ] All order CRUD operations moved to server-side
- [ ] Client-side order modifications removed
- [ ] Server-side validation implemented
- [ ] Operations tested for security and functionality

## Relevant Files
- `app/api/admin/orders/` - Server-side order API
- `components/admin/OrdersTable.tsx` - Client component to update
- `lib/supabase/admin.ts` - Admin database operations
- `types/orders.ts` - Order type definitions

## Dependencies
- 02-rls-orders-table.md (RLS policies in place)
- 07-middleware-integration.md (admin routes protected)

## Implementation Steps
1. Review current order management implementation
2. Move all order operations to API routes
3. Update client components to use API calls
4. Add server-side validation and business logic
5. Test complete order management flow

## Functional Patterns
- Pure functions for order business logic
- Immutable order state updates
- Type-safe operation results

## Testing
- Order creation via API
- Order updates with validation
- Order deletion with proper checks
- Client components work with new API