# 07 - Integrate Admin Middleware into API Routes

## Description
Apply the admin verification middleware to all admin dashboard API routes.

## Time Estimate
45 minutes

## Acceptance Criteria
- [ ] All admin API routes protected with middleware
- [ ] Middleware properly integrated in route handlers
- [ ] Error responses consistent across routes
- [ ] Integration tested with various scenarios

## Relevant Files
- `app/api/admin/` - All admin API route files
- `lib/middleware/admin-verification.ts` - Created middleware
- `middleware.ts` - Next.js middleware configuration

## Dependencies
- 06-admin-middleware-creation.md (middleware must exist)

## Implementation Steps
1. Update each admin API route handler
2. Add middleware call at route entry:
   ```typescript
   import { verifyAdminRole } from '@/lib/middleware/admin-verification';
   
   export async function GET(request: NextRequest) {
     if (!(await verifyAdminRole(request))) {
       return new Response('Unauthorized', { status: 401 });
     }
     // ... rest of handler
   }
   ```
3. Test integration with real requests

## Type Safety
- Ensure request types match middleware expectations
- Use TypeScript for route parameter validation

## Testing
- Protected routes reject non-admin requests
- Admin requests pass through successfully
- Error responses are consistent
- Performance impact minimal