import { api } from '@/lib/api-client'
import type {
  Conversation,
  ListConversationsResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
  SubmitRequestBody,
  SubmitRequestResponse,
  CreateRecordsResponse,
  RequestType,
} from '@/types/llm-conversation'

const base = (gameId: string) => `/api/v1/games/${gameId}/llm/conversations`

export async function listConversations(
  gameId: string,
  params?: { status?: 'active' | 'archived' | 'all'; limit?: number; offset?: number },
): Promise<ListConversationsResponse> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.offset != null) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return api.get(`${base(gameId)}${q ? `?${q}` : ''}`)
}

export async function createConversation(
  gameId: string,
  body: CreateConversationRequest,
): Promise<Conversation> {
  return api.post(base(gameId), body)
}

export async function getConversation(
  gameId: string,
  conversationId: string,
): Promise<Conversation> {
  return api.get(`${base(gameId)}/${conversationId}`)
}

export async function updateConversation(
  gameId: string,
  conversationId: string,
  body: UpdateConversationRequest,
): Promise<Conversation> {
  return api.patch(`${base(gameId)}/${conversationId}`, body)
}

export async function submitRequest(
  gameId: string,
  conversationId: string,
  body: SubmitRequestBody,
): Promise<SubmitRequestResponse> {
  return api.post(`${base(gameId)}/${conversationId}/requests`, body)
}

export async function archiveConversation(
  gameId: string,
  conversationId: string,
): Promise<Conversation> {
  return api.post(`${base(gameId)}/${conversationId}/archive`)
}

export async function deleteConversation(
  gameId: string,
  conversationId: string,
): Promise<void> {
  return api.delete(`${base(gameId)}/${conversationId}`)
}

export async function createRecordsFromConversation(
  gameId: string,
  conversationId: string,
): Promise<CreateRecordsResponse> {
  return api.post(`${base(gameId)}/${conversationId}/create-records`)
}

export async function listRequestTypes(): Promise<RequestType[]> {
  const res = await api.get('/api/v1/llm/request-types')
  return Array.isArray(res) ? res : (res?.request_types ?? res?.data ?? [])
}
