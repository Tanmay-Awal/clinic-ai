import { apiClient } from './client';
import { useAuthStore, User } from '@/store/authStore';
import { handleApiError, formatErrorMessage } from '@/utils/errorHandler';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  [key: string]: any;
}

export const authApi = {

  login: async (credentials: LoginCredentials): Promise<{ token: string; user: User }> => {
    try {
      const response = await apiClient.post<LoginResponse>('/user/login', credentials);
      const { access_token, user } = response.data;

      // Update auth store (map access_token to token for internal use)
      useAuthStore.getState().login(access_token, user);

      return { token: access_token, user };
    } catch (error) {
      const apiError = handleApiError(error);
      
      // For login endpoint, 401 should mean invalid credentials, not session expired
      // So we use the API's error message directly instead of formatErrorMessage
      let errorMessage: string;
      if (apiError.status === 401) {
        // Use the API's error message if available, otherwise default to invalid credentials
        errorMessage = apiError.message || 'Invalid email or password';
      } else {
        errorMessage = formatErrorMessage(apiError);
      }
      
      // Don't show toast here - let the calling component handle it
      throw new Error(errorMessage);
    }
  },

  register: async (data: RegisterData): Promise<{ token: string; user: User }> => {
    try {
      const response = await apiClient.post<LoginResponse>('/user/register', data);
      const { access_token, user } = response.data;

      // Update auth store (map access_token to token for internal use)
      useAuthStore.getState().login(access_token, user);

      return { token: access_token, user };
    } catch (error) {
      const apiError = handleApiError(error);
      
      // For register endpoint, 401 should mean invalid credentials, not session expired
      let errorMessage: string;
      if (apiError.status === 401) {
        errorMessage = apiError.message || 'Invalid registration data';
      } else {
        errorMessage = formatErrorMessage(apiError);
      }
      
      throw new Error(errorMessage);
    }
  },


  logout: async (): Promise<void> => {
    // Deactivate push subscription in backend BEFORE clearing auth (needs JWT)
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await apiClient.delete('/notifications/unsubscribe', { data: { endpoint: subscription.endpoint } });
        }
      }
    } catch {
      // Silent fail — don't block logout
    }

    // Clear local auth state + browser push + opt-out flag (all handled in store)
    useAuthStore.getState().logout();

    try {
      await Promise.race([
        apiClient.post('/user/logout'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timeout')), 3000)
        )
      ]);
    } catch (error: any) {
      // Silent fail - logout endpoint may not be available (404 is expected)
      // Don't log 404 errors for logout endpoint as it's optional
      if (error?.response?.status !== 404 && process.env.NODE_ENV === 'development') {
        console.warn('Logout endpoint error (non-404):', error);
      }
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await apiClient.get<User>('/user/profile');
      const user = response.data;

      // Update user in store
      useAuthStore.getState().updateUser(user);

      return user;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(formatErrorMessage(apiError));
    }
  },

  refreshToken: async (): Promise<string> => {
    try {
      const response = await apiClient.post<{ access_token: string }>('/user/refresh');
      const { access_token } = response.data;

      // Update token in store
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().login(access_token, currentUser);
      }

      return access_token;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(formatErrorMessage(apiError));
    }
  },
};

