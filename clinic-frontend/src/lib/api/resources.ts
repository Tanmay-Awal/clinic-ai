/**
 * Centralized CLIENT-SIDE resource API exports
 * Use the factory to create APIs for any resource
 * 
 * Note: Server-side APIs are in server-resources.ts to avoid importing next/headers in client code
 */

import { createResourceApi } from './factory';
import { apiClient } from './client';
import { Call, CallDetail, CallsListParams } from '@/types/calls';

// Export parameters for calls
export interface CallsExportParams {
  startDate: string;
  endDate: string;
  category?: string;
  call_direction?: 'inbound' | 'outbound';
  call_status?: string;
}

// Client-side APIs
export const callsApi = {
  ...createResourceApi<Call, CallsListParams>('calls'),
  // Override getById to return CallDetail instead of Call
  getById: async (id: string): Promise<CallDetail> => {
    const response = await apiClient.get<CallDetail>(`/calls/${id}`);
    return response.data;
  },
  // Decrypt phone number
  decryptNumber: async (id: string): Promise<{ decryptedNumber: string | null }> => {
    const response = await apiClient.get<{ decryptedNumber: string | null }>(`/calls/${id}/decrypt-number`);
    return response.data;
  },
  // Export calls to CSV
  exportCsv: async (params: CallsExportParams): Promise<Blob> => {
    const response = await apiClient.post('/calls/export/csv', params, {
      responseType: 'blob',
    } as any);
    return response.data as Blob;
  },
};

// Example: To add a new resource, just do:
// export const usersApi = createResourceApi<User, UsersListParams>('users');

