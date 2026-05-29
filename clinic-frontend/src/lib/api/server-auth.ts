import { serverApi } from './server-client';
import { User } from '@/store/authStore';

/**
 * Server-side authentication API functions
 * 
 * Usage in Server Components:
 * ```tsx
 * import { serverAuthApi } from '@/lib/api/server-auth';
 * 
 * export default async function ProfilePage() {
 *   const user = await serverAuthApi.getCurrentUser();
 *   return <div>{user.email}</div>;
 * }
 * ```
 * 
 * Usage in Server Actions:
 * ```tsx
 * 'use server';
 * import { serverAuthApi } from '@/lib/api/server-auth';
 * 
 * export async function updateProfile(data: any) {
 *   const user = await serverAuthApi.getCurrentUser();
 *   // ... update logic
 * }
 * ```
 */
export const serverAuthApi = {
  /**
   * Get current user (server-side)
   * Automatically gets token from cookies
   */
  getCurrentUser: async (token?: string): Promise<User> => {
    return serverApi.getCurrentUser(token) as Promise<User>;
  },
};

