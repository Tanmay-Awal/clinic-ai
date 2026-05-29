/**
 * Get CSRF token from cookie
 * Backend sets this in cookie: XSRF-TOKEN
 * @returns {string|null} CSRF token or null if not found
 */
export function getCsrfToken(): string | null {
  try {
    if (typeof document === 'undefined') {
      return null;
    }

    // Get all cookies
    const cookies = document.cookie.split(';');
    
    // Find the XSRF-TOKEN cookie
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith('XSRF-TOKEN=')
    );
    
    // Extract and decode the token value
    if (csrfCookie) {
      const token = csrfCookie.split('=')[1];
      return decodeURIComponent(token);
    }
    
    return null;
  } catch (error) {
    // Silent fail - don't expose errors
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting CSRF token:', error);
    }
    return null;
  }
}

/**
 * Get CSRF token from response header
 * Alternative method if cookie is not available
 * @param response - Axios response object
 * @returns {string|null} CSRF token or null if not found
 */
export function getCsrfTokenFromHeader(response: any): string | null {
  try {
    // Check for token in response header (case-insensitive)
    const token = response?.headers?.['x-csrf-token'] || 
                  response?.headers?.['X-CSRF-Token'] ||
                  response?.headers?.['X-Csrf-Token'];
    
    return token || null;
  } catch (error) {
    return null;
  }
}

