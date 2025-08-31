import { updateSession } from "@/lib/supabase/middleware";
import { verifyAdminAccess, createAdminRedirect } from "@/lib/middleware/admin-verification";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // First run the existing session update
  const sessionResponse = await updateSession(request);

  // Additional admin verification for /admin routes
  if (request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/api/admin")) {

    const verification = await verifyAdminAccess(request);

    if (!verification.isValid) {
      // Return admin redirect for page routes
      if (!request.nextUrl.pathname.startsWith("/api/")) {
        return createAdminRedirect(request, verification.error);
      }

      // Return JSON error for API routes
      return new Response(
        JSON.stringify({
          error: verification.error || 'Admin access denied',
          code: 'ADMIN_ACCESS_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
