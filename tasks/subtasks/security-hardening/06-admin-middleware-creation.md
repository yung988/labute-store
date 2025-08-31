# 06 - Create Admin Role Verification Middleware

## Description
Develop middleware function to verify admin role for protected admin dashboard routes.

## Time Estimate
45 minutes

## Acceptance Criteria
- [ ] Middleware function created in `lib/middleware/admin-verification.ts`
- [ ] Type-safe admin role checking
- [ ] Proper error handling and responses
- [ ] Unit tests for middleware logic

## Relevant Files
- `lib/supabase/server.ts` - Server-side auth utilities
- `middleware.ts` - Next.js middleware file
- `types/auth.ts` - Authentication types

## Dependencies
- None (independent middleware creation)

## Implementation Steps
1. Create `lib/middleware/admin-verification.ts`
2. Implement verification function:
   ```typescript
   export async function verifyAdminRole(request: NextRequest): Promise<boolean> {
     const token = getTokenFromRequest(request);
     const user = await getUserFromToken(token);
     return user?.role === 'admin';
   }
   ```
3. Add error response helpers
4. Create unit tests

## Functional Patterns
- Pure function for role verification
- Immutable request/response handling
- Type guards for admin user type

## Testing
- Valid admin token: access granted
- Invalid token: access denied
- Non-admin user: access denied
- Malformed request: proper error response