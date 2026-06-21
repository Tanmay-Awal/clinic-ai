import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { handleApiError, logError } from '@/utils/errorHandler';
import { getCsrfToken, getCsrfTokenFromHeader } from '@/utils/csrfToken';

// Get API base URL from environment variable
// Supports both NEXT_PUBLIC_BACKEND_API_URL and NEXT_PUBLIC_API_URL for compatibility
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3021/api';

/**
 * Create axios instance with default configuration
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // IMPORTANT: Required for CSRF cookies
  });

  /**
   * Request interceptor - Attach auth token to requests
   */
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Get token from Zustand store
      const token = useAuthStore.getState().token;

      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }

      // Set default Content-Type if not already set and data is not FormData
      // FormData needs to let axios set Content-Type automatically with boundary
      // Don't set Content-Type for blob responses (export endpoints)
      if (!config.headers['Content-Type'] && !(config.data instanceof FormData) && config.responseType !== 'blob') {
        config.headers['Content-Type'] = 'application/json';
      }

      // If data is FormData, remove Content-Type to let axios handle it
      if (config.data instanceof FormData && config.headers['Content-Type']) {
        delete config.headers['Content-Type'];
      }

      // Don't attach token to auth-related endpoints (login, register, forgot-password, reset-password)
      // These endpoints don't require authentication and shouldn't send stale tokens
      const authEndpoints = ['/user/login', '/user/register', '/user/forgot-password', '/user/reset-password'];
      const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));

      // Attach JWT token to Authorization header if it exists and it's not an auth endpoint
      if (token && !isAuthEndpoint) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
      // CSRF protection is required for these methods to prevent cross-site request forgery
      const stateChangingMethods = ['post', 'put', 'delete', 'patch'];
      if (stateChangingMethods.includes(config.method?.toLowerCase() || '')) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }

      return config;
    },
    (error: AxiosError) => {
      logError(error, 'Request Interceptor');
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor - Handle 401 errors globally and extract CSRF tokens
   */
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Extract CSRF token from response header if available
      // This ensures we have the latest token even if cookie wasn't set
      const csrfTokenFromHeader = getCsrfTokenFromHeader(response);
      if (csrfTokenFromHeader && typeof document !== 'undefined') {
        // Token is already in cookie (set by backend), but we can verify it matches
        // The cookie is automatically managed by the browser
      }

      // Unwrap nested data from NestJS TransformInterceptor
      if (response.data && response.data.statusCode && 'data' in response.data) {
        response.data = response.data.data;
      }

      // Return successful responses as-is
      return response;
    },
    (error: AxiosError) => {
      const status = error.response?.status;

      // Handle 401 Unauthorized - Token expired or invalid
      if (status === 401) {
        const authStore = useAuthStore.getState();

        // Clear auth state (removes token from localStorage and cookies)
        authStore.logout();

        // Only redirect if we're in the browser
        if (typeof window !== 'undefined') {
          // Get current path to preserve it for redirect after login
          const currentPath = window.location.pathname;

          // Define auth-related pages where we shouldn't show the session expired message
          // These are pages where 401 is expected (login, register, etc.)
          const authPages = ['/login', '/forgot-password', '/reset-password', '/register'];
          const isOnAuthPage = authPages.some(page =>
            currentPath === page || currentPath.startsWith(`${page}/`)
          );

          // Only show toast and redirect if NOT on an auth page
          if (!isOnAuthPage) {
            // Show toast notification with clear message
            // Dynamically import toast to avoid SSR issues
            import('react-hot-toast').then(({ default: toast }) => {
              toast.error('Your session has expired. Please log in again.', {
                duration: 3000,
              });
            });

            // Redirect to login with return URL after short delay for better UX
            setTimeout(() => {
              const returnUrl = encodeURIComponent(currentPath + window.location.search);
              window.location.href = `/login?returnUrl=${returnUrl}`;
            }, 2000);

            // Reject the promise to prevent further processing
            return Promise.reject(error);
          }

          // If on auth page, silently reject without showing toast
          // This prevents showing "session expired" message when user is already on login page
          // The error will be handled by the login/register form itself
        }

        // Reject the promise even if not in browser (for SSR)
        return Promise.reject(error);
      }

      // Handle CSRF token errors (403 Forbidden)
      if (status === 403) {
        const errorData = error.response?.data as { message?: string } | undefined;
        const errorMessage = errorData?.message || '';
        if (errorMessage.toLowerCase().includes('csrf') ||
          errorMessage.toLowerCase().includes('token')) {
          // CSRF token issue - reload page to get new token
          if (typeof window !== 'undefined') {
            // Show user-friendly message
            import('react-hot-toast').then(({ default: toast }) => {
              toast.error('Security token expired. Please try again.');
            });

            // Redirect to login after short delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            return Promise.reject(error);
          }
        }
      }

      // Log error for debugging (only if not 401 and not 404 for logout endpoint)
      // Suppress 404 errors for optional endpoints like /user/logout
      const isOptionalEndpoint = error.config?.url?.includes('/user/logout');
      if (status !== 401 && !(status === 404 && isOptionalEndpoint)) {
        logError(error, 'Response Interceptor');
      }

      // Normalize error response structure before propagating to UI
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

      // Return rejected promise with normalized error
      return Promise.reject(error);
    }
  );

  return instance;
};

// Export the configured axios instance
export const apiClient = createAxiosInstance();

// Export types for convenience
export type { AxiosResponse, AxiosError };

