import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';

/**
 * Server-side helper functions for authentication
 */

/**
 * Get auth token from cookies (Server Components/Actions)
 * 
 * Usage:
 * ```tsx
 * import { getServerToken } from '@/lib/api/server-helpers';
 * 
 * export default async function ServerComponent() {
 *   const token = await getServerToken();
 *   // Use token...
 * }
 * ```
 */
export async function getServerToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth-token')?.value;
  } catch (error) {
    // cookies() can only be called in Server Components/Actions
    return undefined;
  }
}

/**
 * Get auth token from request headers (API Routes)
 * 
 * Usage:
 * ```tsx
 * import { NextRequest } from 'next/server';
 * import { getTokenFromRequest } from '@/lib/api/server-helpers';
 * 
 * export async function GET(request: NextRequest) {
 *   const token = getTokenFromRequest(request);
 *   // Use token...
 * }
 * ```
 */
export function getTokenFromRequest(request: NextRequest): string | undefined {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie as fallback
  const cookieToken = request.cookies.get('auth-token')?.value;
  return cookieToken;
}

/**
 * Get auth token from headers (Server Components/Actions)
 * 
 * Usage:
 * ```tsx
 * import { getTokenFromHeaders } from '@/lib/api/server-helpers';
 * 
 * export default async function ServerComponent() {
 *   const token = await getTokenFromHeaders();
 *   // Use token...
 * }
 * ```
 */
export async function getTokenFromHeaders(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
}

