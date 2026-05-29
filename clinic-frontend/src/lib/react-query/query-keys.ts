/**
 * Centralized query keys factory
 * Ensures consistent cache key generation across the app
 */

export const queryKeys = {
  // Calls
  calls: {
    all: ['calls'] as const,
    lists: () => [...queryKeys.calls.all, 'list'] as const,
    list: (params?: unknown) =>
      [...queryKeys.calls.lists(), params] as const,
    details: () => [...queryKeys.calls.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.calls.details(), id] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    reservation: (params?: unknown) => [...queryKeys.dashboard.all, 'reservation', params] as const,
    analyticsInsights: (params?: unknown) => [...queryKeys.dashboard.all, 'analytics-insights', params] as const,
  },

  // Actions
  actions: {
    all: ['actions'] as const,
    lists: () => [...queryKeys.actions.all, 'list'] as const,
    list: (params?: unknown) =>
      [...queryKeys.actions.lists(), params] as const,
    details: () => [...queryKeys.actions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.actions.details(), id] as const,
    stats: (params?: unknown) =>
      [...queryKeys.actions.all, 'stats', params] as const,
    callActions: (callId: string) =>
      [...queryKeys.actions.all, 'call', callId] as const,
    hotels: () => [...queryKeys.actions.all, 'hotels'] as const,
  },

  // Add more resources here following the same pattern
  // users: {
  //   all: ['users'] as const,
  //   lists: () => [...queryKeys.users.all, 'list'] as const,
  //   list: (params?: Record<string, unknown>) => 
  //     [...queryKeys.users.lists(), params] as const,
  //   details: () => [...queryKeys.users.all, 'detail'] as const,
  //   detail: (id: string) => [...queryKeys.users.details(), id] as const,
  // },
};

