import { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * Server-side API factory
 * Creates standard CRUD operations for server components/actions
 * 
 * NOTE: This file should ONLY be imported in Server Components, Server Actions, or API Routes
 * It uses dynamic imports to avoid bundling server code in client bundles
 */
export function createServerResourceApi<T, TListParams extends PaginationParams = PaginationParams>(
  resourceName: string
) {
  return {
    /**
     * Get paginated list (server-side)
     */
    getList: async (params?: TListParams): Promise<PaginatedResponse<T>> => {
      // Dynamic import to avoid bundling server code in client
      const { getServerApiClient } = await import('./server-client');
      const apiClient = getServerApiClient();
      const response = await apiClient.post<PaginatedResponse<T>>(`/${resourceName}`, {
        page: params?.page || 1,
        limit: params?.limit || 10,
        ...params,
      });
      return response.data;
    },

    /**
     * Get single item by ID (server-side)
     */
    getById: async (id: string): Promise<T> => {
      const { getServerApiClient } = await import('./server-client');
      const apiClient = getServerApiClient();
      const response = await apiClient.get<T>(`/${resourceName}/${id}`);
      return response.data;
    },

    /**
     * Create new item (server-side)
     */
    create: async (data: Partial<T>): Promise<T> => {
      const { getServerApiClient } = await import('./server-client');
      const apiClient = getServerApiClient();
      const response = await apiClient.post<T>(`/${resourceName}`, data);
      return response.data;
    },

    /**
     * Update item by ID (server-side)
     */
    update: async (id: string, data: Partial<T>): Promise<T> => {
      const { getServerApiClient } = await import('./server-client');
      const apiClient = getServerApiClient();
      const response = await apiClient.put<T>(`/${resourceName}/${id}`, data);
      return response.data;
    },

    /**
     * Delete item by ID (server-side)
     */
    delete: async (id: string): Promise<void> => {
      const { getServerApiClient } = await import('./server-client');
      const apiClient = getServerApiClient();
      await apiClient.delete(`/${resourceName}/${id}`);
    },
  };
}

