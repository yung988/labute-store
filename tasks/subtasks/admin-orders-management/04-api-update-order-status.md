# 04 - API Endpoint for Updating Order Status

## Objective

Implement a secure API endpoint to update order status and related information.

## Requirements

- Create PATCH `/api/admin/orders/[id]/status` endpoint
- Support updating order status (pending → processing → shipped → delivered)
- Allow updating tracking information when status changes to shipped
- Include validation for status transitions
- Send email notifications on status changes
- Log all status changes for audit trail

## Files to Create/Modify

- `app/api/admin/orders/[id]/status/route.ts` - New API route file
- Update `lib/stripe/send-status-email.ts` if needed for admin notifications
- Update `lib/supabase/admin.ts` for status update queries

## Acceptance Criteria

- Status updates are validated and saved correctly
- Invalid status transitions are rejected
- Email notifications are sent on status changes
- Audit trail is maintained
- Proper error handling and rollback on failures

## Dependencies

- 01-define-order-types.md
- 02-database-migration-orders.md
- 09-admin-authentication-middleware.md

## Estimated Effort

- 2-3 hours
