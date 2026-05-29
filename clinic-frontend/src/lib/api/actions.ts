import { apiClient } from './client';
import type {
    ActionListRequest,
    ActionListResponse,
    ActionStatsRequest,
    ActionStatsResponse,
    ActionDetail,
    CreateActionRequest,
    UpdateActionRequest,
    CallActionsResponse,
    PushSubscribeRequest,
} from '@/types/actions';

export const actionsApi = {
    /** POST /api/actions/stats — summary cards */
    getStats: async (params?: ActionStatsRequest): Promise<ActionStatsResponse> => {
        const response = await apiClient.post<ActionStatsResponse>('/actions/stats', params || {});
        return response.data;
    },

    /** GET /api/actions/hotels — list of hotels from whatsapp conversations */
    getHotels: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/actions/hotels');
        return response.data;
    },

    /** POST /api/actions/list — paginated, filterable list */
    getList: async (params?: ActionListRequest): Promise<ActionListResponse> => {
        const response = await apiClient.post<ActionListResponse>('/actions/list', {
            page: params?.page || 1,
            limit: params?.limit || 20,
            ...params,
        });
        return response.data;
    },

    /** GET /api/actions/:id — full detail */
    getById: async (id: string): Promise<ActionDetail> => {
        const response = await apiClient.get<ActionDetail>(`/actions/${id}`);
        return response.data;
    },

    /** GET /api/actions/:id/decrypt-number — unmask phone */
    decryptNumber: async (id: string): Promise<{ decryptedNumber: string | null }> => {
        const response = await apiClient.get<{ decryptedNumber: string | null }>(`/actions/${id}/decrypt-number`);
        return response.data;
    },

    /** PUT /api/actions/:id — update status/notes */
    update: async (id: string, data: UpdateActionRequest): Promise<ActionDetail> => {
        const response = await apiClient.put<ActionDetail>(`/actions/${id}`, data);
        return response.data;
    },

    /** POST /api/actions/create — manual action creation */
    create: async (data: CreateActionRequest): Promise<ActionDetail> => {
        const response = await apiClient.post<ActionDetail>('/actions/create', data);
        return response.data;
    },

    /** GET /api/actions/by-call/:id — actions linked to a call */
    getCallActions: async (callId: string): Promise<CallActionsResponse> => {
        const response = await apiClient.get<CallActionsResponse>(`/actions/by-call/${callId}`);
        return response.data;
    },

    /** POST /api/notifications/subscribe — register push subscription */
    subscribePush: async (data: PushSubscribeRequest): Promise<void> => {
        await apiClient.post('/notifications/subscribe', data);
    },

    /** DELETE /api/notifications/unsubscribe — remove push subscription */
    unsubscribePush: async (endpoint: string): Promise<void> => {
        await apiClient.delete('/notifications/unsubscribe', { data: { endpoint } });
    },

    /** GET /api/notifications/vapid-public-key — get VAPID key for push subscription */
    getVapidPublicKey: async (): Promise<string | undefined> => {
        const response = await apiClient.get<{ key: string }>('/notifications/vapid-public-key');
        return response.data?.key;
    },
};
