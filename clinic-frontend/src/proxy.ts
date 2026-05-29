import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes
 * 
 * Note: The deprecation warning about "proxy" is a false positive in Next.js 16.
 * This middleware.ts file is the correct and standard way to handle route protection.
 * 
 * Public routes:
 * - / (landing page)
 * - /login
 * - /forgot-password
 * - /reset-password
 * 
 * All other routes require authentication
 */

const RATE_LIMIT_DURATION = Number(process.env.RATE_LIMIT_DURATION) || 60 * 1000; // Default 1 minute
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 50; // Default 50 requests
// In-memory store for rate limiting
// Note: This works best in a single-instance environment (like a Docker container).
// For serverless/distributed environments, consider using an external store like Redis.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function proxy(request: NextRequest) {

  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();

  const rateLimitData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

  // Reset if the time window has passed
  if (now - rateLimitData.lastReset > RATE_LIMIT_DURATION) {
    rateLimitData.count = 0;
    rateLimitData.lastReset = now;
  }

  rateLimitData.count++;
  rateLimitMap.set(ip, rateLimitData);

  if (rateLimitData.count > RATE_LIMIT_MAX_REQUESTS) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const { pathname } = request.nextUrl;

  // Define public routes
  const publicRoutes = ['/', '/login', '/forgot-password', '/reset-password', '/health'];
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(route);
  });

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const token = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value?.toLowerCase();

  // If no token, redirect to login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access control (RBAC)
  // Restricted routes for the "actions" role — these users can only access /actions
  const actionsRestrictedRoutes = ['/dashboard', '/calls', '/insights', '/outbound', '/admin'];

  if (userRole === 'actions') {
    const isRestricted = actionsRestrictedRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    
    if (isRestricted) {
      // Redirect to actions page if they try to access a restricted route
      return NextResponse.redirect(new URL('/actions', request.url));
    }
  }

  // Redirect to dashboard if trying to access login/register while authenticated
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

