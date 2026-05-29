# Security Audit Report - Data Mining Vulnerabilities

## 🔴 CRITICAL VULNERABILITIES

### 1. **Console.log Statements Exposing Sensitive Data**
**Location:** Multiple files
**Risk:** HIGH - Exposes API endpoints, request details, and data structures

**Files Affected:**
- `src/lib/api/client.ts` (lines 18, 65-71)
  - Logs API base URL
  - Logs all API requests with URLs and headers
- `src/app/dashboard/page.tsx` (lines 100, 107, 113, 128, 136, 140, 146)
  - Logs full API response data
  - Logs timing distribution data
  - Logs aggregated call counts
- `src/utils/errorHandler.ts` (lines 120-132)
  - Logs error details including stack traces
  - Exposes error details object with potentially sensitive information

**Impact:** Attackers can:
- See all API endpoints being called
- Understand application structure
- Extract data from console logs
- Map out the application's data flow

**Recommendation:**
```typescript
// Remove or wrap in NODE_ENV check
if (process.env.NODE_ENV === 'development') {
  // Only log in development
}
// Better: Use a logging service that filters sensitive data
```

---

### 2. **Auth Token Stored in localStorage**
**Location:** `src/store/authStore.ts` (lines 38-94)
**Risk:** HIGH - Vulnerable to XSS attacks

**Issue:**
- JWT tokens stored in localStorage
- localStorage is accessible via JavaScript
- If XSS vulnerability exists, tokens can be stolen

**Impact:**
- Attackers can steal authentication tokens
- Full account compromise
- Session hijacking

**Recommendation:**
- Use httpOnly cookies instead of localStorage
- Implement token refresh mechanism
- Add CSRF protection
- Use SameSite=Strict cookie attribute

---

### 3. **Auth Token in Cookies Without Secure Flags**
**Location:** `src/store/authStore.ts` (line 54)
**Risk:** HIGH - Tokens can be intercepted

**Issue:**
```typescript
document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
```

**Missing Security Flags:**
- No `Secure` flag (should only be sent over HTTPS)
- No `HttpOnly` flag (accessible via JavaScript)
- `SameSite=Lax` is good but not enough

**Recommendation:**
```typescript
// Should be set server-side with:
// Secure; HttpOnly; SameSite=Strict; Path=/
```

---

### 4. **Error Messages Exposing System Information**
**Location:** `src/utils/errorHandler.ts` (lines 35-45)
**Risk:** MEDIUM - Information disclosure

**Issue:**
- Error messages expose API base URL
- Stack traces reveal file structure
- Error details object may contain sensitive data

**Example:**
```typescript
message: `Network error. Please check your connection and ensure the API server is running at ${error.config?.baseURL || 'the configured URL'}.`
```

**Impact:**
- Attackers learn internal infrastructure
- Can map out backend architecture
- Helps in reconnaissance phase

**Recommendation:**
- Sanitize error messages in production
- Don't expose internal URLs
- Use generic error messages for users# Frontend CSRF Token Implementation Guide

This guide shows you exactly how to implement `getCsrfToken()` in your frontend application.

## 🔍 How CSRF Tokens Work

1. **Backend sets token** in cookie: `XSRF-TOKEN`
2. **Backend sends token** in response header: `X-CSRF-Token`
3. **Frontend reads token** from cookie or header
4. **Frontend sends token** in request header: `X-CSRF-Token`

## 📋 Implementation Examples

### 1. **Vanilla JavaScript (Plain JS)**

```javascript
/**
 * Get CSRF token from cookie
 * @returns {string|null} CSRF token or null if not found
 */
function getCsrfToken() {
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
}

// Usage
const token = getCsrfToken();
if (token) {
  fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': token,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ data: 'example' })
  });
}
```

### 2. **React (Functional Component)**

```javascript
// utils/csrfToken.js
export function getCsrfToken() {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith('XSRF-TOKEN=')
  );
  
  if (csrfCookie) {
    return decodeURIComponent(csrfCookie.split('=')[1]);
  }
  
  return null;
}

// hooks/useCsrfToken.js
import { useState, useEffect } from 'react';
import { getCsrfToken } from '../utils/csrfToken';

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState(null);

  useEffect(() => {
    // Get token on mount
    const token = getCsrfToken();
    setCsrfToken(token);

    // Also get from first API call if not in cookie
    if (!token) {
      fetch('/api/calls', {
        credentials: 'include'
      })
        .then(response => {
          const tokenFromHeader = response.headers.get('X-CSRF-Token');
          if (tokenFromHeader) {
            setCsrfToken(tokenFromHeader);
          }
        });
    }
  }, []);

  return csrfToken;
}

// Usage in component
import { useCsrfToken } from './hooks/useCsrfToken';

function MyComponent() {
  const csrfToken = useCsrfToken();

  const handleSubmit = async (data) => {
    const response = await fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-CSRF-Token': csrfToken, // Use the token
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
  };

  return <button onClick={() => handleSubmit({ name: 'John' })}>Submit</button>;
}
```

### 3. **React with Axios**

```javascript
// utils/api.js
import axios from 'axios';

// Get CSRF token helper
export function getCsrfToken() {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith('XSRF-TOKEN=')
  );
  return csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : null;
}

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // IMPORTANT: Required for cookies
});

// Request interceptor - automatically add CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  const jwtToken = localStorage.getItem('token');
  
  // Add JWT token
  if (jwtToken) {
    config.headers['Authorization'] = `Bearer ${jwtToken}`;
  }
  
  // Add CSRF token for state-changing requests
  if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
});

// Response interceptor - extract CSRF token from first response
api.interceptors.response.use(
  (response) => {
    // CSRF token is automatically in cookie, but you can also get from header
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      // Token is already in cookie, but you can store it if needed
      console.log('CSRF token received:', csrfToken);
    }
    return response;
  },
  (error) => {
    // Handle CSRF errors
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('CSRF')) {
      // Refresh page to get new token
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

// Usage in component
import api from './utils/api';

function MyComponent() {
  const handleSubmit = async (data) => {
    try {
      const response = await api.post('/user/profile', data);
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <button onClick={() => handleSubmit({ name: 'John' })}>Submit</button>;
}
```

### 4. **Vue.js**

```javascript
// utils/csrfToken.js
export function getCsrfToken() {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith('XSRF-TOKEN=')
  );
  return csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : null;
}

// utils/api.js
import axios from 'axios';
import { getCsrfToken } from './csrfToken';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  const jwtToken = localStorage.getItem('token');
  
  if (jwtToken) {
    config.headers['Authorization'] = `Bearer ${jwtToken}`;
  }
  
  if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
});

export default api;

// Usage in Vue component
<template>
  <button @click="submitData">Submit</button>
</template>

<script>
import api from '@/utils/api';

export default {
  methods: {
    async submitData() {
      try {
        const response = await api.post('/user/profile', { name: 'John' });
        console.log('Success:', response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }
};
</script>
```

### 5. **Angular**

```typescript
// services/csrf-token.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsrfTokenService {
  getCsrfToken(): string | null {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith('XSRF-TOKEN=')
    );
    return csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : null;
  }
}

// services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CsrfTokenService } from './csrf-token.service';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  constructor(private csrfTokenService: CsrfTokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    const csrfToken = this.csrfTokenService.getCsrfToken();
    const jwtToken = localStorage.getItem('token');
    
    let headers = req.headers;
    
    if (jwtToken) {
      headers = headers.set('Authorization', `Bearer ${jwtToken}`);
    }
    
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      headers = headers.set('X-CSRF-Token', csrfToken);
    }
    
    const clonedReq = req.clone({
      headers,
      withCredentials: true
    });
    
    return next.handle(clonedReq);
  }
}

// app.module.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CsrfInterceptor } from './services/api.service';

@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CsrfInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

### 6. **jQuery (Legacy Support)**

```javascript
// Get CSRF token
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith('XSRF-TOKEN=')
  );
  return csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : null;
}

// Usage with jQuery AJAX
$.ajaxSetup({
  beforeSend: function(xhr, settings) {
    const csrfToken = getCsrfToken();
    const jwtToken = localStorage.getItem('token');
    
    if (jwtToken) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + jwtToken);
    }
    
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(settings.type)) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    }
    
    xhr.withCredentials = true;
  }
});

// Usage
$.ajax({
  url: '/api/user/profile',
  type: 'POST',
  contentType: 'application/json',
  data: JSON.stringify({ name: 'John' }),
  success: function(response) {
    console.log('Success:', response);
  }
});
```

## 🔧 Alternative: Get Token from Response Header

If the cookie method doesn't work, you can get the token from the first API response:

```javascript
// Get CSRF token from first API call
let csrfToken = null;

async function initializeCsrfToken() {
  try {
    const response = await fetch('/api/calls', {
      credentials: 'include'
    });
    
    // Get token from response header
    csrfToken = response.headers.get('X-CSRF-Token');
    
    // Or from response body
    const data = await response.json();
    if (data._csrf) {
      csrfToken = data._csrf;
    }
    
    return csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
}

// Call this once when app loads
initializeCsrfToken().then(token => {
  console.log('CSRF token initialized:', token);
});
```

## ✅ Complete Working Example (React)

```javascript
// utils/csrfToken.js
export function getCsrfToken() {
  try {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith('XSRF-TOKEN=')
    );
    
    if (csrfCookie) {
      const token = csrfCookie.split('=')[1];
      return decodeURIComponent(token);
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error);
  }
  
  return null;
}

// utils/api.js
import axios from 'axios';
import { getCsrfToken } from './csrfToken';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

// Add CSRF token to all requests
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCsrfToken();
    const jwtToken = localStorage.getItem('token');
    
    // Add JWT token
    if (jwtToken) {
      config.headers['Authorization'] = `Bearer ${jwtToken}`;
    }
    
    // Add CSRF token for POST/PUT/DELETE/PATCH
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method)) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle CSRF errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('CSRF')) {
      // CSRF token issue - reload to get new token
      console.warn('CSRF token invalid, reloading page...');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

// Usage in component
import api from './utils/api';

function MyComponent() {
  const handleSubmit = async () => {
    try {
      const response = await api.post('/user/profile', {
        name: 'John Doe'
      });
      console.log('Success:', response.data);
    } catch (error) {
      console.error('Error:', error.response?.data);
    }
  };

  return (
    <button onClick={handleSubmit}>
      Update Profile
    </button>
  );
}
```

## 🧪 Testing

Test if your token is being retrieved correctly:

```javascript
// Test function
function testCsrfToken() {
  const token = getCsrfToken();
  console.log('CSRF Token:', token);
  
  if (token) {
    console.log('✅ CSRF token found!');
    console.log('Token length:', token.length);
  } else {
    console.log('❌ CSRF token not found');
    console.log('All cookies:', document.cookie);
  }
}

// Run test
testCsrfToken();
```

## ⚠️ Important Notes

1. **Cookie must be accessible**: Ensure `credentials: 'include'` or `withCredentials: true` is set
2. **Token is automatically set**: Backend sets it in cookie on first request
3. **Token is long**: It's a base64 string, typically 100+ characters
4. **Token changes**: New token on each page load (this is normal)
5. **Required for POST/PUT/DELETE/PATCH**: Only needed for state-changing requests

## 🐛 Troubleshooting

**Problem**: `getCsrfToken()` returns `null`
- **Solution**: Make sure you've made at least one API call first (to get the cookie)
- **Solution**: Check browser DevTools → Application → Cookies → Look for `XSRF-TOKEN`
- **Solution**: Ensure `withCredentials: true` is set

**Problem**: CSRF token error even with token
- **Solution**: Make sure token in header matches token in cookie
- **Solution**: Check that you're sending token in `X-CSRF-Token` header (case-sensitive)
- **Solution**: Verify cookie name is exactly `XSRF-TOKEN` (case-sensitive)

**Problem**: Cookie not being set
- **Solution**: Check CORS configuration in backend
- **Solution**: Ensure frontend and backend are on same domain or CORS is properly configured
- **Solution**: Check browser console for CORS errors


- Log detailed errors server-side only

---

## 🟡 MEDIUM RISK VULNERABILITIES

### 5. **API Base URL Exposed in Client Code**
**Location:** `src/lib/api/client.ts` (lines 7-10)
**Risk:** MEDIUM - Information disclosure

**Issue:**
```typescript
const API_BASE_URL = 
  process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  'http://localhost:3021/api';
```

**Impact:**
- Backend API endpoint is visible in client bundle
- Attackers can directly target backend
- Default localhost URL may leak in production

**Recommendation:**
- Ensure environment variables are properly set
- Use API routes as proxy instead of direct backend calls
- Implement rate limiting on backend

---

### 6. **No Input Validation on File Upload**
**Location:** `src/components/DashboardHeader.tsx` (lines 41-67)
**Risk:** MEDIUM - File upload vulnerabilities

**Issue:**
- Only checks file extension
- No file size validation
- No content validation
- No virus scanning

**Impact:**
- Malicious files could be uploaded
- Potential for file-based attacks
- Storage exhaustion

**Recommendation:**
- Add file size limits
- Validate file content (not just extension)
- Scan files server-side
- Store files outside web root

---

### 7. **Stack Traces in Error Logs**
**Location:** `src/utils/errorHandler.ts` (lines 124-129)
**Risk:** MEDIUM - Information disclosure

**Issue:**
```typescript
console.error('Original error:', {
  name: error.name,
  message: error.message,
  stack: error.stack,  // ⚠️ Exposes file structure
});
```

**Impact:**
- Reveals application file structure
- Shows source code paths
- Helps attackers understand codebase

**Recommendation:**
- Remove stack traces in production
- Use error tracking service (Sentry, etc.)
- Sanitize error output

---

### 8. **Missing Content Security Policy (CSP)**
**Location:** `next.config.ts`
**Risk:** MEDIUM - XSS protection missing

**Issue:**
- No CSP headers configured
- No XSS protection
- Allows inline scripts

**Recommendation:**
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

---

## 🟢 LOW RISK / BEST PRACTICES

### 9. **dangerouslySetInnerHTML Usage**
**Location:** `src/components/ui/chart.tsx` (line 70)
**Risk:** LOW - Potential XSS if data is not sanitized

**Recommendation:**
- Ensure data is sanitized before use
- Consider using DOMPurify

---

### 10. **No Rate Limiting on Client Side**
**Risk:** LOW - API abuse possible

**Recommendation:**
- Implement client-side rate limiting
- Backend should have rate limiting
- Use debouncing for API calls

---

## 📋 SUMMARY OF RECOMMENDATIONS

### Immediate Actions Required:
1. ✅ Remove all `console.log` statements from production code
2. ✅ Move auth tokens from localStorage to httpOnly cookies
3. ✅ Add Secure and HttpOnly flags to cookies
4. ✅ Sanitize all error messages
5. ✅ Remove stack traces from production errors

### Short-term Improvements:
1. Add Content Security Policy headers
2. Implement file upload validation (size, content)
3. Add rate limiting
4. Use API routes as proxy for backend calls
5. Implement proper error tracking service

### Long-term Security Enhancements:
1. Implement CSRF protection
2. Add request signing
3. Implement API versioning
4. Add security headers (HSTS, etc.)
5. Regular security audits
6. Penetration testing

---

## 🔍 HOW ATTACKERS CAN EXPLOIT THESE

### Data Mining Attack Scenarios:

1. **Console Log Mining:**
   - Open browser DevTools
   - Monitor console for API calls
   - Extract endpoints and data structures
   - Map out application flow

2. **Token Theft:**
   - XSS attack → Access localStorage
   - Steal JWT token
   - Use token to access user account
   - Extract all user data

3. **Error Message Analysis:**
   - Trigger errors intentionally
   - Collect error messages
   - Extract system information
   - Plan targeted attacks

4. **API Endpoint Discovery:**
   - Inspect client bundle
   - Find API base URL
   - Enumerate endpoints
   - Test for vulnerabilities

---

## 🛡️ SECURITY CHECKLIST

- [ ] Remove all console.log statements
- [ ] Move tokens to httpOnly cookies
- [ ] Add Secure flag to cookies
- [ ] Sanitize error messages
- [ ] Remove stack traces
- [ ] Add CSP headers
- [ ] Validate file uploads
- [ ] Add rate limiting
- [ ] Implement CSRF protection
- [ ] Add security headers
- [ ] Set up error tracking
- [ ] Regular security audits

---

**Last Updated:** $(date)
**Severity:** HIGH - Immediate action required

