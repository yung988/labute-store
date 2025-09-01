/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hasEnvVars } from '../utils';

/**
 * Type-safe admin user interface
 */
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export function isAdminUser(user: unknown): user is AdminUser {
  const u = user as Record<string, unknown>;
  return Boolean(
    u &&
      typeof u === 'object' &&
      typeof u.id === 'string' &&
      typeof u.email === 'string' &&
      (u.role === 'admin' ||
        u.role === 'superadmin' ||
        (u.user_metadata as Record<string, unknown>)?.role === 'admin' ||
        (u.user_metadata as Record<string, unknown>)?.role === 'superadmin' ||
        (u.app_metadata as Record<string, unknown>)?.role === 'admin' ||
        (u.app_metadata as Record<string, unknown>)?.role === 'superadmin')
  );
}

export function verifyAdminRoleFromClaims(claims: unknown): boolean {
  const c = claims as Record<string, unknown>;
  if (!c) return false;

  // Check multiple possible locations for admin role
  const roleChecks = [
    c.role === 'admin',
    c.role === 'superadmin',
    (c.user_metadata as Record<string, unknown>)?.role === 'admin',
    (c.user_metadata as Record<string, unknown>)?.role === 'superadmin',
    (c.app_metadata as Record<string, unknown>)?.role === 'admin',
    (c.app_metadata as Record<string, unknown>)?.role === 'superadmin',
  ];

  return roleChecks.some((check) => check === true);
}

/**
 * Middleware function to verify admin access for protected routes
 */
export async function verifyAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  user?: AdminUser;
  error?: string;
}> {
  try {
    // Skip if env vars not configured
    if (!hasEnvVars) {
      return { isValid: false, error: 'Environment not configured' };
    }

    // Create server client for auth verification
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op for verification
          },
        },
      }
    );

    // Get user data
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { isValid: false, error: `Auth error: ${error.message}` };
    }

    if (!data?.user) {
      return { isValid: false, error: 'No user found' };
    }

    const user = data.user;

    // Check admin role in user metadata
    const userRole = user.user_metadata?.role || user.app_metadata?.role;

    if (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'shopmanager') {
      return { isValid: false, error: 'Insufficient permissions - admin role required' };
    }

    // Create admin user object
    const adminUser: AdminUser = {
      id: user.id,
      email: user.email || '',
      role: 'admin',
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    };

    return { isValid: true, user: adminUser };
  } catch (error) {
    return {
      isValid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Higher-order function to create admin-protected API route handler
 */
export function withAdminAuth(
  handler: (request: NextRequest, user: AdminUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const verification = await verifyAdminAccess(request);

    if (!verification.isValid) {
      return NextResponse.json(
        {
          error: verification.error || 'Unauthorized',
          code: 'ADMIN_ACCESS_DENIED',
        },
        { status: 403 }
      );
    }

    if (!verification.user) {
      return NextResponse.json(
        { error: 'Admin user not found', code: 'ADMIN_USER_MISSING' },
        { status: 403 }
      );
    }

    return handler(request, verification.user);
  };
}

/**
 * Utility function to create admin redirect response
 */
export function createAdminRedirect(request: NextRequest, message?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';

  if (message) {
    url.searchParams.set('message', message);
  }

  return NextResponse.redirect(url);
}

/**
 * Utility function to create admin error response
 */
export function createAdminErrorResponse(message: string, status = 403): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: 'ADMIN_ACCESS_DENIED',
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
