# 09 - Move Inventory Updates to Server-side

## Description
Implement server-side inventory management operations to prevent client-side manipulation.

## Time Estimate
60 minutes

## Acceptance Criteria
- [ ] Inventory updates moved to secure API endpoints
- [ ] Client-side inventory modifications removed
- [ ] Server-side validation for inventory changes
- [ ] Atomic inventory operations implemented

## Relevant Files
- `app/api/admin/inventory/` - Inventory management API
- `components/admin/InventoryTable.tsx` - Client component
- `lib/inventory.ts` - Inventory utilities
- `types/products.ts` - Product inventory types

## Dependencies
- 03-rls-products-table.md (RLS for products)
- 07-middleware-integration.md (protected routes)
- 08-server-side-order-management.md (similar pattern)

## Implementation Steps
1. Create server-side inventory API routes
2. Implement atomic inventory update operations
3. Add validation for inventory changes
4. Update client components to use API
5. Test inventory management flow

## Functional Patterns
- Pure functions for inventory calculations
- Immutable inventory state
- Transaction-based updates for consistency

## Testing
- Inventory increase/decrease operations
- Validation prevents negative inventory
- Concurrent update handling
- Client integration works correctly