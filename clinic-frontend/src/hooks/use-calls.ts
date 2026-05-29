'use client';

import { createUseListHook, createUseItemHook, createUseMutationsHook } from './use-resource';
import { callsApi } from '@/lib/api/resources';
import { queryKeys } from '@/lib/react-query/query-keys';
import { Call, CallDetail, CallsListParams } from '@/types/calls';

/**
 * Hook for fetching paginated list of calls
 * 
 * @example
 * ```tsx
 * const { data, pagination, isLoading } = useCallsList({ page: 1, limit: 20 });
 * ```
 */
export const useCallsList = createUseListHook<Call, CallsListParams>(
  'calls',
  (params) => queryKeys.calls.list(params),
  (params) => callsApi.getList(params)
);

/**
 * Hook for fetching a single call by ID (returns CallDetail with transcripts and analysis)
 * 
 * @example
 * ```tsx
 * const { data: call, isLoading } = useCall('call-123');
 * ```
 */
export const useCall = createUseItemHook<CallDetail>(
  'calls',
  (id) => queryKeys.calls.detail(id),
  (id) => callsApi.getById(id)
);

/**
 * Mutation hooks for calls
 */
export const {
  useCreate: useCreateCall,
  useUpdate: useUpdateCall,
  useDelete: useDeleteCall,
} = createUseMutationsHook<Call>(
  'calls',
  {
    lists: () => queryKeys.calls.lists(),
    details: () => queryKeys.calls.details(),
  },
  {
    create: callsApi.create,
    update: callsApi.update,
    delete: callsApi.delete,
  }
);
