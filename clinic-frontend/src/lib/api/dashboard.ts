import { apiClient } from './client';
import type { ReservationDashboardResponse, DashboardParams, HousekeepingDashboardResponse } from '@/types/dashboard';
import type { UserInteractionsResponse } from '@/types/interactions';
import type { AnalyticsInsightsResponse } from '@/types';

export const dashboardApi = {

  getReservationDashboard: async (params?: DashboardParams): Promise<ReservationDashboardResponse> => {
    const response = await apiClient.post<ReservationDashboardResponse>('/dashboard/reservation', params || {});
    return response.data;
  },

  getHousekeepingDashboard: async (params?: DashboardParams): Promise<HousekeepingDashboardResponse> => {
    // Use provided params or default to current month
    let requestBody: { startDate: string; endDate: string } = {
      startDate: '2025-12-01',
      endDate: new Date().toISOString().split('T')[0],
    };

    // If params are provided, use them
    if (params?.startDate || params?.endDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();

      requestBody = {
        startDate: '2025-12-01',
        endDate: params.endDate || new Date(year, month + 1, 0).toISOString().split('T')[0],
      };
    }

    const response = await apiClient.post<HousekeepingDashboardResponse>(
      '/dashboard/housekeeping',
      requestBody
    );

    return response.data;
  },

  importDashboard: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/dashboard/import', formData);
    return response.data;
  },

  getUserInteractions: async (): Promise<UserInteractionsResponse> => {
    const response = await apiClient.get<UserInteractionsResponse>('/user-interactions');
    return response.data;
  },

  getAIInsights: async (category: string, dateRange: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/dashboard/insights', {
      params: { category, dateRange }
    });
    return response.data;
  },

  getFeedbackDashboard: async (params?: DashboardParams): Promise<any> => {
    const response = await apiClient.post<any>('/dashboard/feedback', params || {});
    return response.data;
  },

  getSummaryDashboard: async (params?: DashboardParams): Promise<any> => {
    const response = await apiClient.post<any>('/dashboard/summary', params || {});
    return response.data;
  },

  getAnalyticsInsights: async (params?: DashboardParams): Promise<AnalyticsInsightsResponse> => {
    const response = await apiClient.post<AnalyticsInsightsResponse>('/dashboard/analytics-insights', params || {});
    return response.data;
  },
};
