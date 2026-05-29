import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PUSH_OPT_OUT_KEY } from '@/lib/constants';

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role?: string;
  is_admin?: boolean;
  created_at: string;
  updated_at: string | null;
  total_call_minutes?: number;
  call_minutes_left?: number;
  plan_type?: string;
  timezone?: string; // User's timezone e.g. "Europe/London"
  whatsapp_bot_enabled?: boolean;
  [key: string]: any; // Allow additional user properties
}

export interface RoleAware {
  role?: string;
  is_admin?: boolean;
}

/**
 * Check if the user has the "actions" role (restricted to Actions tab only)
 */
export const hasActionsOnlyRole = (user: RoleAware | null): boolean =>
  (user?.role || '').toLowerCase() === 'actions';

/**
 * Check if user is an admin or system admin
 * Prefers the is_admin flag from backend if available
 */
export const isAdmin = (user: RoleAware | null): boolean => {
  if (user?.is_admin !== undefined) return user.is_admin;
  const normalizedRole = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  return normalizedRole === 'admin' || normalizedRole === 'systemadmin';
};

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

// Safe localStorage access
const getStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { },
    };
  }
  return localStorage;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
        });

        // Set cookies for middleware access (optional - for SSR protection)
        // NOTE: HttpOnly flag must be set server-side for true security.
        // These client-side cookies are only for middleware route protection (UX guard).
        // For production, both tokens and roles should be stored in httpOnly cookies set by the backend.
        // WARNING: The user-role cookie is client-writable, so middleware RBAC based on it
        // is a UX convenience only, NOT a security boundary. Server-side API endpoints must
        // enforce their own RBAC independently of this cookie.
        if (typeof document !== 'undefined') {
          const isSecure = window.location.protocol === 'https:';
          const secureFlag = isSecure ? '; Secure' : '';
          document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict${secureFlag}`; // 7 days
          if (user.role) {
            document.cookie = `user-role=${user.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict${secureFlag}`;
          }
        }
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });

        // Clear localStorage - remove all items to ensure clean logout
        try {
          const storage = getStorage();
          storage.removeItem('auth-storage');
          // Clear any other app-related localStorage items
          // Only iterate if storage is actually localStorage (not the mock object)
          if (typeof window !== 'undefined' && window.localStorage === storage) {
            const keysToRemove: string[] = [];
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (key && (key.startsWith('auth-') || key.startsWith('react-query-'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(key => storage.removeItem(key));
          }
        } catch (error) {
          // Silent fail - don't expose errors
          if (process.env.NODE_ENV === 'development') {
            console.error('Error clearing auth storage:', error);
          }
        }

        // Clear sessionStorage as well
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            const sessionKeysToRemove: string[] = [];
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key && (key.startsWith('auth-') || key.startsWith('react-query-'))) {
                sessionKeysToRemove.push(key);
              }
            }
            sessionKeysToRemove.forEach(key => window.sessionStorage.removeItem(key));
          } catch (error) {
            // Silent fail
          }
        }

        // Clear all cookies related to auth
        if (typeof document !== 'undefined') {
          // Clear cookies
          document.cookie = 'auth-token=; path=/; max-age=0';
          document.cookie = 'user-role=; path=/; max-age=0';
          // Clear any other auth-related cookies
          document.cookie.split(';').forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.startsWith('auth-') || name.startsWith('XSRF-')) {
              document.cookie = `${name}=; path=/; max-age=0`;
              document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0`;
            }
          });
        }

        // Set push opt-out flag so the "Enable notifications" banner shows on next login.
        // This ensures a freshly-logged-in user sees the opt-in prompt again.
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(PUSH_OPT_OUT_KEY, 'true');
          }
        } catch {
          // Silent fail
        }

        // Unsubscribe from browser push (fire-and-forget, no auth needed)
        // This stops the browser from receiving pushes; backend auto-deactivates on 410
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
              if (sub) sub.unsubscribe();
            });
          }).catch(() => {});
        }
      },

      updateUser: (user: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Helper function to get user's full name
 */
export const getUserFullName = (user: User | null): string => {
  if (!user) return '';
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.first_name) return user.first_name;
  if (user.last_name) return user.last_name;
  return user.email;
};

