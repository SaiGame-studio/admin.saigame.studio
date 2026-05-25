export interface Conversation {
  ID: string
  StudioID: string
  GameID: string
  Title: string
  Goal: string
  Summary: string
  AccumulatedContent: AccumulatedContent
  CreatedBy: string
  CreatedAt: string
  UpdatedAt: string
  ArchivedAt: string | null
  DeletedAt: string | null
}

export interface AccumulatedContent {
  items?: ItemDraft[]
  lore?: LoreDraft[]
}

export interface ItemDraft {
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  description: string
  attributes: Record<string, number>
}

export interface LoreDraft {
  lore_type: string
  title: string
  summary?: string
  content: string
}

export interface ListConversationsResponse {
  conversations: Conversation[]
  total: number
  limit: number
  offset: number
  status: string
}

export interface CreateConversationRequest {
  title: string
  goal: string
}

export interface UpdateConversationRequest {
  title?: string
  goal?: string
}

export interface RequestType {
  key: string
  label: string
}

export interface SubmitRequestBody {
  user_prompt: string
  request_type?: string
  lore_entry_ids?: string[]
  goals?: string[]
}

export interface SubmitRequestResponse {
  request_id: string
  conversation_id: string
  detected_request_type: string
  resolved_system_prompt_id: string | null
  status: string
}

export interface CreateRecordsResponse {
  created_count: number
  item_definition_ids: string[]
}

export interface CreateLoreRecordsResponse {
  created_count: number
  lore_entry_ids: string[]
}

export type ConversationStatus = 'active' | 'archived' | 'deleted'

export interface ConversationContentLink {
  id: string
  conversation_id: string
  content_type: string
  content_id: string
  linked_by: string | null
  created_at: string
}

export function getConversationStatus(conv: Conversation): ConversationStatus {
  if (conv.DeletedAt) return 'deleted'
  if (conv.ArchivedAt) return 'archived'
  return 'active'
}
