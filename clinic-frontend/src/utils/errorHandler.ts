import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export const handleApiError = (error: unknown): ApiError => {
  // Axios errors
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data;

    // Handle different error formats
    if (data?.message) {
      return {
        message: data.message,
        status,
        code: data.code,
        details: data.details,
      };
    }

    if (data?.error) {
      return {
        message: typeof data.error === 'string' ? data.error : data.error.message || 'An error occurred',
        status,
        details: data.error,
      };
    }

    // Network errors - sanitized to not expose internal URLs
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return {
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
        status: 0,
        // Don't expose internal URLs or endpoint details in production
        details: process.env.NODE_ENV === 'development' ? {
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          method: error.config?.method,
        } : undefined,
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        message: 'Request timeout. Please try again.',
        code: 'TIMEOUT',
      };
    }

    // Default axios error
    return {
      message: error.message || 'An unexpected error occurred',
      status,
      code: error.code,
    };
  }

  // Generic Error objects
  if (error instanceof Error) {
    return {
      message: error.message || 'An error occurred',
    };
  }

  // Unknown error type
  return {
    message: 'An unexpected error occurred',
  };
};


export const formatErrorMessage = (error: ApiError): string => {
  if (error.status === 400) {
    return error.message || 'Invalid request. Please check your input.';
  }
  if (error.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (error.status === 404) {
    return 'The requested resource was not found.';
  }
  if (error.status === 422) {
    return error.message || 'Validation error. Please check your input.';
  }
  if (error.status === 429) {
    return 'Too many requests. Please try again later.';
  }
  if (error.status && error.status >= 500) {
    return 'Server error. Please try again later.';
  }

  return error.message || 'An unexpected error occurred';
};

export const logError = (error: unknown, context?: string): void => {
  try {
    const apiError = handleApiError(error);
    
    // Only log errors in development mode
    if (process.env.NODE_ENV === 'development') {
      // Always include message, then conditionally add other properties
      const errorInfo: Record<string, any> = {
        message: apiError.message || 'Unknown error',
      };
      
      if (apiError.status) errorInfo.status = apiError.status;
      if (apiError.code) errorInfo.code = apiError.code;
      // Only include details in development
      if (apiError.details && process.env.NODE_ENV === 'development') {
        errorInfo.details = apiError.details;
      }
      
      // Only log if we have at least a message
      if (errorInfo.message) {
        // eslint-disable-next-line no-console
        console.error(`[Error${context ? ` in ${context}` : ''}]:`, errorInfo);
      }
      
      // Log original error separately for debugging (development only)
      // Never log stack traces in production
      if (error instanceof Error) {
        // eslint-disable-next-line no-console
        console.error('Original error:', {
          name: error.name,
          message: error.message,
          // Stack traces only in development
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        });
      } else if (error && typeof error === 'object') {
        // eslint-disable-next-line no-console
        console.error('Original error object:', error);
      }
    }
    // In production, errors should be sent to error tracking service (e.g., Sentry)
    // instead of console logging

  } catch (logError) {
    // Silent fail - don't expose errors in error handler
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in logError:', logError);
    }
  }
};

