/**
 * SERVER-SIDE resource API exports
 * Only import this in Server Components, Server Actions, or API Routes
 * 
 * This file is separate to avoid importing next/headers in client code
 */

import { createServerResourceApi } from './server-factory';
import { Call, CallsListParams } from '@/types/calls';

// Server-side APIs
export const serverCallsApi = createServerResourceApi<Call, CallsListParams>('calls');

// Example: To add a new resource, just do:
// export const serverUsersApi = createServerResourceApi<User, UsersListParams>('users');

