/**
 * Server-side API examples
 * 
 * These are example functions showing how to use the server-side API client
 * in Server Components, Server Actions, and API Routes.
 */

import { serverApi } from './server-client';

export interface ExampleData {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Example: Server Component
 * 
 * Usage:
 * ```tsx
 * import { fetchServerData } from '@/lib/api/server-example';
 * 
 * export default async function MyServerComponent() {
 *   const data = await fetchServerData();
 *   return <div>{data.map(item => <div key={item.id}>{item.name}</div>)}</div>;
 * }
 * ```
 */
export async function fetchServerData(): Promise<ExampleData[]> {
  try {
    return await serverApi.get<ExampleData[]>('/protected/data');
  } catch (error) {
    console.error('Error fetching server data:', error);
    throw error;
  }
}

/**
 * Example: Server Action
 * 
 * Usage:
 * ```tsx
 * 'use server';
 * import { createServerData } from '@/lib/api/server-example';
 * 
 * export async function MyServerAction(formData: FormData) {
 *   const name = formData.get('name');
 *   const result = await createServerData({ name });
 *   return result;
 * }
 * ```
 */
export async function createServerData(data: Partial<ExampleData>): Promise<ExampleData> {
  try {
    return await serverApi.post<ExampleData>('/protected/data', data);
  } catch (error) {
    console.error('Error creating server data:', error);
    throw error;
  }
}

/**
 * Example: Server Action with explicit token
 * 
 * Usage:
 * ```tsx
 * 'use server';
 * import { updateServerData } from '@/lib/api/server-example';
 * 
 * export async function MyServerAction(id: string, data: any, token: string) {
 *   const result = await updateServerData(id, data, token);
 *   return result;
 * }
 * ```
 */
export async function updateServerData(
  id: string,
  data: Partial<ExampleData>,
  token?: string
): Promise<ExampleData> {
  try {
    return await serverApi.put<ExampleData>(`/protected/data/${id}`, data, token);
  } catch (error) {
    console.error('Error updating server data:', error);
    throw error;
  }
}

/**
 * Example: API Route handler
 * 
 * Usage in app/api/example/route.ts:
 * ```tsx
 * import { NextRequest, NextResponse } from 'next/server';
 * import { fetchServerData } from '@/lib/api/server-example';
 * 
 * export async function GET(request: NextRequest) {
 *   try {
 *     const token = request.cookies.get('auth-token')?.value;
 *     const data = await fetchServerData();
 *     return NextResponse.json(data);
 *   } catch (error) {
 *     return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
 *   }
 * }
 * ```
 */

