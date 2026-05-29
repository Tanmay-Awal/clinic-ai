'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { actionsApi } from '@/lib/api/actions';
import { queryKeys } from '@/lib/react-query/query-keys';
import type {
    ActionListRequest,
    ActionListResponse,
    ActionStatsRequest,
    ActionStatsResponse,
    ActionDetail,
    CreateActionRequest,
    UpdateActionRequest,
    CallActionsResponse,
} from '@/types/actions';
import toast from 'react-hot-toast';

/**
 * Hook for action stats cards
 */
export function useActionStats(
    params?: ActionStatsRequest,
    options?: Omit<UseQueryOptions<ActionStatsResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.actions.stats(params),
        queryFn: () => actionsApi.getStats(params),
        staleTime: 60 * 1000, // 1 minute — actions change frequently
        ...options,
    });
}

/**
 * Hook for list of hotels from actions/whatsapp
 */
export function useActionHotels(
    options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.actions.hotels(),
        queryFn: () => actionsApi.getHotels(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
}

/**
 * Hook for paginated action list
 */
export function useActionsList(
    params?: ActionListRequest,
    options?: Omit<UseQueryOptions<ActionListResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.actions.list(params),
        queryFn: () => actionsApi.getList(params),
        placeholderData: (previousData) => previousData,
        staleTime: 30 * 1000,
        refetchOnMount: true,
        ...options,
    });
}

/**
 * Hook for single action detail
 */
export function useAction(
    id: string | null | undefined,
    options?: Omit<UseQueryOptions<ActionDetail>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.actions.detail(id || ''),
        queryFn: () => actionsApi.getById(id!),
        enabled: !!id,
        ...options,
    });
}

/**
 * Hook for actions linked to a specific call
 */
export function useCallActions(
    callId: string | null | undefined,
    options?: Omit<UseQueryOptions<CallActionsResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: queryKeys.actions.callActions(callId || ''),
        queryFn: () => actionsApi.getCallActions(callId!),
        enabled: !!callId,
        ...options,
    });
}

/**
 * Mutation hook for creating an action
 */
export function useCreateAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateActionRequest) => actionsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.actions.all });
            toast.success('Action created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create action');
        },
    });
}

/**
 * Mutation hook for updating an action (status change, notes)
 */
export function useUpdateAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateActionRequest }) =>
            actionsApi.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.actions.lists() });
            queryClient.invalidateQueries({ queryKey: queryKeys.actions.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.actions.stats() });
            toast.success('Action updated');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update action');
        },
    });
}
