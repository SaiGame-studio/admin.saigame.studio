import { apiRequest } from "@/lib/api-client";

export type PresenceTarget = {
  kind: "guest" | "user";
  id: string;
  label: string;
  ip?: string;
  country_code?: string;
  country_name?: string;
  path?: string;
  conversation_status?: string;
  latest_user_message_id?: string;
  conversation_id?: string;
  is_online: boolean;
  last_seen_at: string;
};

export type SupportPresence = {
  counts: { guests: number; authenticated_users: number; total: number };
  targets: PresenceTarget[];
};

export type SupportMessage = {
  id: string;
  sender_kind: "guest" | "user" | "agent";
  body: string;
  created_at: string;
  read_at?: string | null;
};

export type SupportConversation = {
  id: string;
  status: string;
  subject?: string;
  messages?: SupportMessage[];
};

export const getSupportPresence = () => apiRequest("/api/v1/admin/support/presence") as Promise<SupportPresence>;
export const getSupportConversation = (visitorID: string, conversationID?: string) => {
  const query = conversationID ? `conversation_id=${encodeURIComponent(conversationID)}` : `visitor_id=${encodeURIComponent(visitorID)}`;
  return apiRequest(`/api/v1/admin/support/chat/conversations?${query}`) as Promise<{ conversation: SupportConversation | null; messages: SupportMessage[] }>;
};

export const startSupportConversation = (target: PresenceTarget, subject: string, message: string) =>
  apiRequest("/api/v1/admin/support/chat/conversations", {
    method: "POST",
    body: { target: { kind: target.kind, id: target.id, conversation_id: target.conversation_id }, subject, message },
  }) as Promise<{ conversation: SupportConversation }>;

export const deleteSupportConversation = (conversationID: string) =>
  apiRequest(`/api/v1/admin/support/chat/conversations/${encodeURIComponent(conversationID)}`, {
    method: "DELETE",
  }) as Promise<{ deleted_conversation_id: string }>;

export const updateSupportConversationSubject = (conversationID: string, subject: string) =>
  apiRequest(`/api/v1/admin/support/chat/conversations/${encodeURIComponent(conversationID)}`, { method: "PATCH", body: { subject } }) as Promise<{ conversation: SupportConversation }>;

export const createUserSupportConversation = (message: string, subject = "") =>
  apiRequest("/api/v1/support/chat/conversations", { method: "POST", body: { message, subject }, credentials: "include" }) as Promise<{ conversation: SupportConversation; messages: SupportMessage[] }>;

export const getGuestSupportConversation = (authenticated = false) =>
  apiRequest("/api/v1/support/chat/conversation", { requireAuth: authenticated, credentials: "include", suppressToast: true }) as Promise<{ conversation: SupportConversation | null; messages: SupportMessage[] }>;

export const replyToGuestSupportConversation = (message: string, authenticated = false) =>
  apiRequest("/api/v1/support/chat/messages", {
    method: "POST",
    body: { message },
    requireAuth: authenticated,
    credentials: "include",
  }) as Promise<{ conversation: SupportConversation; messages: SupportMessage[] }>;

export const markGuestSupportMessagesRead = (authenticated = false) =>
  apiRequest("/api/v1/support/chat/conversation/read", { method: "POST", requireAuth: authenticated, credentials: "include", suppressToast: true }) as Promise<{ marked_read: number }>;
