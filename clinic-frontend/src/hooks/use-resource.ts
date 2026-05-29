'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { PaginatedResponse, PaginationParams } from '@/types/api';
import toast from 'react-hot-toast';

/**
 * Generic hook factory for list queries
 * Works with any resource that follows the paginated response pattern
 */
export function createUseListHook<T, TParams extends PaginationParams = PaginationParams>(
  resourceName: string,
  queryKeyFactory: (params?: TParams) => readonly unknown[],
  apiFunction: (params?: TParams) => Promise<PaginatedResponse<T>>
) {
  return function useList(
    params?: TParams,
    options?: Omit<UseQueryOptions<PaginatedResponse<T>>, 'queryKey' | 'queryFn'>
  ) {
    const query = useQuery({
      queryKey: queryKeyFactory(params),
      queryFn: () => apiFunction(params),
      placeholderData: (previousData) => previousData,
      ...options,
    });

    return {
      data: query.data?.data,
      pagination: query.data?.pagination,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error as Error | null,
      refetch: query.refetch,
    };
  };
}

/**
 * Generic hook factory for detail queries
 */
export function createUseItemHook<T>(
  resourceName: string,
  queryKeyFactory: (id: string) => readonly unknown[],
  apiFunction: (id: string) => Promise<T>
) {
  return function useItem(
    id: string | null | undefined,
    options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
  ) {
    const query = useQuery({
      queryKey: queryKeyFactory(id || ''),
      queryFn: () => apiFunction(id!),
      enabled: !!id,
      ...options,
    });

    return {
      data: query.data,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error as Error | null,
      refetch: query.refetch,
    };
  };
}

/**
 * Generic hook factory for mutations
 */
export function createUseMutationsHook<T>(
  resourceName: string,
  queryKeyFactory: {
    lists: () => readonly unknown[];
    details: () => readonly unknown[];
  },
  apiFunctions: {
    create?: (data: Partial<T>) => Promise<T>;
    update?: (id: string, data: Partial<T>) => Promise<T>;
    delete?: (id: string) => Promise<void>;
  }
) {
  return {
    useCreate: apiFunctions.create
      ? () => {
          const queryClient = useQueryClient();
          return useMutation({
            mutationFn: apiFunctions.create!,
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: queryKeyFactory.lists() });
              toast.success(`${resourceName} created successfully`);
            },
            onError: (error: Error) => {
              toast.error(error.message || `Failed to create ${resourceName}`);
            },
          });
        }
      : undefined,

    useUpdate: apiFunctions.update
      ? () => {
          const queryClient = useQueryClient();
          return useMutation({
            mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
              apiFunctions.update!(id, data),
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: queryKeyFactory.lists() });
              queryClient.invalidateQueries({ queryKey: queryKeyFactory.details() });
              toast.success(`${resourceName} updated successfully`);
            },
            onError: (error: Error) => {
              toast.error(error.message || `Failed to update ${resourceName}`);
            },
          });
        }
      : undefined,

    useDelete: apiFunctions.delete
      ? () => {
          const queryClient = useQueryClient();
          return useMutation({
            mutationFn: apiFunctions.delete!,
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: queryKeyFactory.lists() });
              toast.success(`${resourceName} deleted successfully`);
            },
            onError: (error: Error) => {
              toast.error(error.message || `Failed to delete ${resourceName}`);
            },
          });
        }
      : undefined,
  };
}

