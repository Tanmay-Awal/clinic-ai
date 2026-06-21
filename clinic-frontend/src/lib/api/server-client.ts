import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { handleApiError, logError } from '@/utils/errorHandler';

// Get API base URL from environment variable
// Supports both NEXT_PUBLIC_BACKEND_API_URL and NEXT_PUBLIC_API_URL for compatibility
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3021/api';

/**
 * Create server-side axios instance with default configuration
 * 
 * Usage in Server Components:
 * ```tsx
 * import { getServerApiClient } from '@/lib/api/server-client';
 * 
 * export default async function ServerComponent() {
 *   const apiClient = getServerApiClient();
 *   const data = await apiClient.get('/endpoint');
 *   return <div>{data.data}</div>;
 * }
 * ```
 * 
 * Usage in Server Actions:
 * ```tsx
 * 'use server';
 * import { getServerApiClient } from '@/lib/api/server-client';
 * 
 * export async function myAction() {
 *   const apiClient = getServerApiClient();
 *   const result = await apiClient.post('/endpoint', { data });
 *   return result.data;
 * }
 * ```
 */
export function getServerApiClient(token?: string): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Required for CSRF cookies
  });

  /**
   * Request interceptor - Attach auth token to requests
   */
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Get token from parameter, cookies, or headers
      let authToken = token;

      // If no token provided, try to get from cookies or headers
      if (!authToken) {
        try {
          // Try cookies first (Server Components/Actions)
          const cookieStore = await cookies();
          authToken = cookieStore.get('auth-token')?.value || undefined;
        } catch (error) {
          // cookies() can only be called in Server Components/Actions
          // Try headers as fallback (API Routes)
          try {
            const headersList = await headers();
            const authHeader = headersList.get('authorization');
            if (authHeader?.startsWith('Bearer ')) {
              authToken = authHeader.substring(7);
            }
          } catch (headerError) {
            // If both fail, token will be undefined
          }
        }
      }

      // Attach token to Authorization header if it exists
      if (authToken && config.headers) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }

      // Extract CSRF token from cookies if state changing method
      const stateChangingMethods = ['post', 'put', 'delete', 'patch'];
      if (stateChangingMethods.includes(config.method?.toLowerCase() || '')) {
        try {
          const cookieStore = await cookies();
          const csrfToken = cookieStore.get('XSRF-TOKEN')?.value;
          if (csrfToken && config.headers) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        } catch (e) {
          // Ignore error if not in server context
        }
      }

      return config;
    },
    (error: AxiosError) => {
      logError(error, 'Server Request Interceptor');
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor - Handle errors
   */
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Unwrap nested data from NestJS TransformInterceptor
      if (response.data && response.data.statusCode && 'data' in response.data) {
        response.data = response.data.data;
      }

      // Return successful responses as-is
      return response;
    },
    (error: AxiosError) => {
      // Log error for debugging
      logError(error, 'Server Response Interceptor');

      // Normalize error response structure before propagating
      if (error.response) {
        const data = error.response.data as any;
        if (typeof data !== 'object' || !data?.message) {
          error.response.data = {
            statusCode: error.response.status || 500,
            message: typeof data === 'string' && data ? data : 'An unexpected error occurred',
            error: data?.error || 'Server Error'
          };
        }
      }

      // Return rejected promise with error
      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Server-side API helper functions
 */
export const serverApi = {
  /**
   * Get current user (server-side)
   */
  getCurrentUser: async (token?: string) => {
    const apiClient = getServerApiClient(token);
    try {
      const response = await apiClient.get('/user/me');
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Generic GET request (server-side)
   */
  get: async <T = any>(endpoint: string, token?: string): Promise<T> => {
    const apiClient = getServerApiClient(token);
    try {
      const response = await apiClient.get<T>(endpoint);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Generic POST request (server-side)
   */
  post: async <T = any>(endpoint: string, data?: any, token?: string): Promise<T> => {
    const apiClient = getServerApiClient(token);
    try {
      const response = await apiClient.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Generic PUT request (server-side)
   */
  put: async <T = any>(endpoint: string, data?: any, token?: string): Promise<T> => {
    const apiClient = getServerApiClient(token);
    try {
      const response = await apiClient.put<T>(endpoint, data);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Generic PATCH request (server-side)
   */
  patch: async <T = any>(endpoint: string, data?: any, token?: string): Promise<T> => {
    const apiClient = getServerApiClient(token);
    try {
      const response = await apiClient.patch<T>(endpoint, data);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  /**
   * Generic DELETE request (server-side)
   */
  delete: async <T = any>(endpoint: string, token?: string): Promise<T> => {
    const apiClient = getServerApiClient(token);
    try {
      const response = await apiClient.delete<T>(endpoint);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },
};

// Export types for convenience
export type { AxiosResponse, AxiosError };

