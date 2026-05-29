export interface ChatbotConversation {
  id: number;
  user_id: number;
  name: string | null;
  phone: string | null;
  persona: string | null;
  title: string | null;
  started_at: string;
  last_message_at: string | null;
  preview?: string | null;
}

export interface ChatbotArtifact {
  id: number;
  kind: string;
  status: string;
  mime: string | null;
  r2_key: string | null;
  url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  ready_at: string | null;
}

export interface ChatbotMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  tool_calls: any;
  tool_call_id: string | null;
  created_at: string;
  imageUrl?: string | null;
  artifacts?: ChatbotArtifact[];
}

export interface ChatbotConversationsResponse {
  data: ChatbotConversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ChatbotDetailMessage {
  id: number | string;
  role: string;
  content: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export interface ChatbotConversationBlock {
  conversation: {
    id: number;
    title: string | null;
    persona: string | null;
    createdAt: string;
    updatedAt: string;
  };
  messages: ChatbotDetailMessage[];
}

export type ChatbotConversationDetailsResponse = ChatbotConversationBlock[];

export interface ChatbotKeyEntity {
  type: string;
  value: string;
}

export interface ChatbotSummaryResponse {
  summary: string[] | null;
  sentiment_meter: number | null;
  call_outcome: string | null;
  customer_name: string | null;
  persona: string | null;
  key_entities: ChatbotKeyEntity[] | null;
  notes: string | null;
  is_cached: boolean;
  created_at: string;
}

export interface ChatbotUserMessagesResponse {
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    created_at: string;
  };
  conversations: Array<{
    id: number;
    persona: string | null;
    title: string | null;
    started_at: string;
    last_message_at: string | null;
  }>;
  messages: ChatbotMessage[];
  orphan_artifacts: ChatbotArtifact[];
  totals: {
    conversations: number;
    messages: number;
    artifacts: number;
  };
}
