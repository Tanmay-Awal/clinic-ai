import { apiClient } from '@/lib/api';
import {
  ChatbotConversationsResponse,
  ChatbotConversationDetailsResponse,
  ChatbotUserMessagesResponse,
  ChatbotSummaryResponse,
} from '@/types/chatbot';

export const chatbotApi = {
  getConversations: async (
    page: number = 1,
    limit: number = 20,
    search?: string
  ) => {
    const res = await apiClient.get<ChatbotConversationsResponse>(`/chat-bot/conversations`, {
      params: { page, limit, search: search || undefined },
    });
    return res.data;
  },

  getConversation: async (userId: number | string) => {
    const res = await apiClient.get<ChatbotConversationDetailsResponse>(`/chat-bot/conversations/${userId}`);
    return res.data;
  },

  getUserMessages: async (userId: number | string) => {
    const res = await apiClient.get<ChatbotUserMessagesResponse>(`/chat-bot/users/${userId}/messages`);
    return res.data;
  },

  getSummary: async (userId: number | string, forceRefresh: boolean = false) => {
    const params = forceRefresh ? { forceRefresh: 'true' } : undefined;
    const res = await apiClient.get<ChatbotSummaryResponse>(`/chat-bot/conversations/${userId}/summary`, { params });
    return res.data;
  },
};
