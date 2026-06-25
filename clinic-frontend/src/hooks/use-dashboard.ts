import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import { queryKeys } from '@/lib/react-query/query-keys';
import type { DashboardParams, ReservationDashboardResponse, HousekeepingDashboardResponse, FeedbackDashboardResponse, SummaryDashboardResponse } from '@/types/dashboard';
import type { UserInteractionsResponse } from '@/types/interactions';
import type { AnalyticsInsightsResponse } from '@/types';
import toast from 'react-hot-toast';

export function useReservationDashboard(
  options?: {
    params?: DashboardParams;
  } & Omit<UseQueryOptions<ReservationDashboardResponse>, 'queryKey' | 'queryFn'>
) {
  const { params, ...queryOptions } = options || {};
  return useQuery({
    queryKey: queryKeys.dashboard.reservation(params),
    queryFn: () => dashboardApi.getReservationDashboard(params),
    staleTime: 0,
    ...queryOptions,
  });
}

export function useHousekeepingDashboard(
  options?: {
    params?: DashboardParams;
  } & Omit<UseQueryOptions<HousekeepingDashboardResponse>, 'queryKey' | 'queryFn'>
) {
  const { params, ...queryOptions } = options || {};
  return useQuery({
    queryKey: ['dashboard', 'housekeeping', params],
    queryFn: () => dashboardApi.getHousekeepingDashboard(params),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export function useUserInteractions(
  options?: Omit<UseQueryOptions<UserInteractionsResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['user-interactions'],
    queryFn: () => dashboardApi.getUserInteractions(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useFeedbackDashboard(
  options?: {
    params?: DashboardParams;
  } & Omit<UseQueryOptions<FeedbackDashboardResponse>, 'queryKey' | 'queryFn'>
) {
  const { params, ...queryOptions } = options || {};
  return useQuery({
    queryKey: ['dashboard', 'feedback', params],
    queryFn: () => dashboardApi.getFeedbackDashboard(params),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export function useSummaryDashboard(
  options?: {
    params?: DashboardParams;
  } & Omit<UseQueryOptions<SummaryDashboardResponse>, 'queryKey' | 'queryFn'>
) {
  const { params, ...queryOptions } = options || {};
  return useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => dashboardApi.getSummaryDashboard(params),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export function useAnalyticsInsights(
  options?: {
    params?: DashboardParams;
  } & Omit<UseQueryOptions<AnalyticsInsightsResponse>, 'queryKey' | 'queryFn'>
) {
  const { params, ...queryOptions } = options || {};
  return useQuery({
    queryKey: queryKeys.dashboard.analyticsInsights(params),
    queryFn: () => dashboardApi.getAnalyticsInsights(params),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    ...queryOptions,
  });
}

export function useImportDashboard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => dashboardApi.importDashboard(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('File uploaded successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload file');
    },
  });
}
