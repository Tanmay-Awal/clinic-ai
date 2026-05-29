import axios from 'axios';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/utils/csrfToken';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3021/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // Important for handling cookies/sessions if used
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        // Get token from localStorage (assuming you store it as 'token' or 'accessToken')
        // Modify this key based on your actual auth logic
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        const stateChangingMethods = ['post', 'put', 'delete', 'patch'];
        if (stateChangingMethods.includes(config.method?.toLowerCase() || '')) {
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle Errors (e.g. 401 Force Logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Force logout and redirect on token expiration
            import('@/store/authStore').then(({ useAuthStore }) => {
                useAuthStore.getState().logout();
                toast.error('Session expired. Please login again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            });
        }
        return Promise.reject(error);
    }
);

export default api;
