import { api } from '@/lib/api-client'
import { getValidToken } from '@/lib/auth-utils'
import { parse, STR, OBJ } from 'partial-json'
import type {
  Conversation,
  ListConversationsResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
  SubmitRequestBody,
  SubmitRequestResponse,
  CreateRecordsResponse,
  CreateLoreRecordsResponse,
  RequestType,
  ConversationContentLink,
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

export async function unarchiveConversation(
  gameId: string,
  conversationId: string,
): Promise<Conversation> {
  return api.post(`${base(gameId)}/${conversationId}/unarchive`)
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

export async function createLoreRecordsFromConversation(
  gameId: string,
  conversationId: string,
): Promise<CreateLoreRecordsResponse> {
  return api.post(`${base(gameId)}/${conversationId}/create-lore-records`)
}

export async function linkConversationContent(
  gameId: string,
  conversationId: string,
  contentType: string,
  contentId: string,
): Promise<void> {
  return api.post(`${base(gameId)}/${conversationId}/content`, {
    content_type: contentType,
    content_id: contentId,
  })
}

export async function listConversationContent(
  gameId: string,
  conversationId: string,
): Promise<ConversationContentLink[]> {
  const res = await api.get(`${base(gameId)}/${conversationId}/content`)
  return (res?.items ?? []) as ConversationContentLink[]
}

export async function unlinkConversationContent(
  gameId: string,
  conversationId: string,
  linkId: string,
): Promise<void> {
  return api.delete(`${base(gameId)}/${conversationId}/content/${linkId}`)
}

export async function listRequestTypes(): Promise<string[]> {
  const res = await api.get('/api/v1/llm/request-types')
  const arr: unknown = Array.isArray(res) ? res : (res?.request_types ?? res?.data ?? [])
  return (Array.isArray(arr) ? arr : []) as string[]
}

export async function streamDetectIntent(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  onPartial: (fields: { detectedType?: string; detectedLanguage?: string; detectedEntityType?: string; detectedGoal?: string; detectedIntents?: { type: string; entityType: string; goal: string }[] }) => void,
  onDone: (detectedType: string, detectedLanguage: string, detectedEntityType: string, detectedGoal: string, detectedIntents: { type: string; entityType: string; goal: string }[]) => void,
  onError: (message: string) => void,
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) throw new Error('API URL is not configured.')

  const token = getValidToken()
  if (!token) throw new Error('Not authenticated.')

  const res = await fetch(
    `${apiUrl}${base(gameId)}/${conversationId}/detect-intent`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_prompt: userPrompt }),
    },
  )

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let accText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop()!

    for (const part of parts) {
      if (!part.startsWith('data: ')) continue
      const evt = JSON.parse(part.slice(6))

      if (evt.type === 'chunk') {
        const chunk = evt.text ?? ''
        accText += chunk
        onChunk(chunk)
        try {
          const p = parse(accText, STR | OBJ) as Record<string, unknown>
          if (p && typeof p === 'object') {
            const rawIntents = Array.isArray(p.intents)
              ? (p.intents as { type?: string; entity_type?: string; goal?: string }[])
              : []
            const first = rawIntents[0]
            const detectedIntents = rawIntents.map((i) => ({
              type: i.type ?? '',
              entityType: i.entity_type ?? '',
              goal: i.goal ?? '',
            }))
            onPartial({
              ...(p.language                       ? { detectedLanguage:   String(p.language) }          : {}),
              ...(first?.type                      ? { detectedType:       first.type }                  : {}),
              ...(first?.entity_type               ? { detectedEntityType: first.entity_type }           : {}),
              ...(first?.goal                      ? { detectedGoal:       first.goal }                  : {}),
              ...(detectedIntents.length > 0       ? { detectedIntents }                                 : {}),
            })
          }
        } catch { /* partial parse failed — ignore */ }
      } else if (evt.type === 'done') {
        const rawIntents: { Type?: string; EntityType?: string; Goal?: string }[] =
          Array.isArray(evt.detected_intents) ? evt.detected_intents : []
        const firstIntent = rawIntents[0] ?? {}
        const detectedIntents = rawIntents.map((i) => ({
          type: i.Type ?? '',
          entityType: i.EntityType ?? '',
          goal: i.Goal ?? '',
        }))
        onDone(
          firstIntent.Type ?? '',
          evt.detected_language ?? '',
          firstIntent.EntityType ?? '',
          firstIntent.Goal ?? '',
          detectedIntents,
        )
        return
      } else if (evt.type === 'error') {
        onError(evt.message ?? 'Unknown error')
        return
      }
    }
  }
}

export async function streamRequest(
  gameId: string,
  conversationId: string,
  requestType: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  onDone: (requestId: string) => void,
  onError: (message: string) => void,
  entityType?: string,
  language?: string,
  goals?: string[],
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) throw new Error('API URL is not configured.')

  const token = getValidToken()
  if (!token) throw new Error('Not authenticated.')

  const urlType = requestType.replace(/_/g, '-')
  const res = await fetch(
    `${apiUrl}${base(gameId)}/${conversationId}/requests/${urlType}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_prompt: userPrompt,
        entity_type: entityType ?? 'custom',
        language: language ?? '',
        lore_entry_ids: [],
        ...(goals && goals.length > 0 ? { goals } : {}),
      }),
    },
  )

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop()!

    for (const part of parts) {
      if (!part.startsWith('data: ')) continue
      const evt = JSON.parse(part.slice(6))

      if (evt.type === 'chunk') {
        onChunk(evt.text ?? '')
      } else if (evt.type === 'done') {
        onDone(evt.request_id ?? '')
        return
      } else if (evt.type === 'error') {
        onError(evt.message ?? 'Unknown error')
        return
      }
    }
  }
}
