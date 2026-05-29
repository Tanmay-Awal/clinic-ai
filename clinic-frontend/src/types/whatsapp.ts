export interface WaCustomer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaConversation {
  [key: string]: any; // Allow indexing for dynamic sorting
  id: string;
  customer_id: string;
  customer?: WaCustomer;
  name?: string; // Derived from customer or set explicitly
  phone?: string; // Masked display phone
  active_hotel: string | null;
  status: string | null;
  started_at: string;
  last_message_at: string;
}

export interface WaMessage {
  id: string;
  conversation_id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  created_at: string;
}

export interface ConversationsResponse {
  data: WaConversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface MessagesResponse {
  conversation: {
    name: string;
    phone: string;
    active_hotel: string | null;
    status: string | null;
    started_at: string;
    last_message_at: string;
  };
  messages: WaMessage[];
}

export interface PhoneResponse {
  phone: string | null;
}

export interface MergedConversation {
  id: string;
  convIds: string[];
  last_message_at: string | null;
  preview: string;
  name: string | null;
  displayPhone: string;
}

export interface WaKeyEntity {
  type: string;
  value: string;
}

export interface SummaryResponse {
  summary: string[] | null;
  sentiment_meter: number | null;
  call_outcome: string | null;
  customer_name: string | null;
  hotel: string | null;
  key_entities: WaKeyEntity[] | null;
  notes: string | null;
  is_cached: boolean;
  created_at: string;
}
