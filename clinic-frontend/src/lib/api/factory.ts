import { apiClient } from './client';
import { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * Generic API factory for creating resource-specific API functions
 * This eliminates the need to create separate files for each resource
 */

/**
 * Client-side API factory
 * Creates standard CRUD operations for any resource
 */
export function createResourceApi<T, TListParams extends PaginationParams = PaginationParams>(
  resourceName: string
) {
  return {
    /**
     * Get paginated list
     */
    getList: async (params?: TListParams): Promise<PaginatedResponse<T>> => {
      // Build request body with all params
      const requestBody: any = {
        page: params?.page || 1,
        limit: params?.limit || 10,
      };
      
      // Add all other params (search, category, call_direction, sort_by, sort_order, etc.)
      if (params) {
        Object.keys(params).forEach(key => {
          if (key !== 'page' && key !== 'limit' && params[key as keyof TListParams] !== undefined) {
            requestBody[key] = params[key as keyof TListParams];
          }
        });
      }
      
      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] POST /${resourceName}`, requestBody);
      }
      
      const response = await apiClient.post<PaginatedResponse<T>>(`/${resourceName}`, requestBody);
      return response.data;
    },

    /**
     * Get single item by ID
     */
    getById: async (id: string): Promise<T> => {
      const response = await apiClient.get<T>(`/${resourceName}/${id}`);
      return response.data;
    },

    /**
     * Create new item
     */
    create: async (data: Partial<T>): Promise<T> => {
      const response = await apiClient.post<T>(`/${resourceName}`, data);
      return response.data;
    },

    /**
     * Update item by ID
     */
    update: async (id: string, data: Partial<T>): Promise<T> => {
      const response = await apiClient.put<T>(`/${resourceName}/${id}`, data);
      return response.data;
    },

    /**
     * Delete item by ID
     */
    delete: async (id: string): Promise<void> => {
      await apiClient.delete(`/${resourceName}/${id}`);
    },
  };
}


