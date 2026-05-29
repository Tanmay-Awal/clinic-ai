import { apiClient } from '@/lib/api';
import { ConversationsResponse, MessagesResponse, PhoneResponse, SummaryResponse } from '@/types/whatsapp';

export const whatsappApi = {
  getConversations: async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    hotel?: string,
    status?: string,
    sortBy?: string,
    sortOrder?: string
  ) => {
    const res = await apiClient.get<ConversationsResponse>(`/whatsapp/conversations`, {
      params: { page, limit, search, hotel, status, sortBy, sortOrder }
    });
    return res.data;
  },

  getMessages: async (conversationId: string) => {
    const res = await apiClient.get<MessagesResponse>(`/whatsapp/conversations/${conversationId}/messages`);
    return res.data;
  },

  getPhone: async (conversationId: string) => {
    const res = await apiClient.get<PhoneResponse>(`/whatsapp/conversations/${conversationId}/phone`);
    return res.data;
  },

  getSummary: async (conversationId: string, forceRefresh: boolean = false) => {
    const params = forceRefresh ? { forceRefresh: 'true' } : undefined;
    const res = await apiClient.get<SummaryResponse>(`/whatsapp/conversations/${conversationId}/summary`, { params });
    return res.data;
  },
};
