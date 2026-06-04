import { api } from '@/lib/api-client'
import { getValidToken } from '@/lib/auth-utils'
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
  loreEntryIds?: string[],
): Promise<CreateRecordsResponse> {
  return api.post(`${base(gameId)}/${conversationId}/create-records`, {
    ...(loreEntryIds && loreEntryIds.length > 0 ? { lore_entry_ids: loreEntryIds } : {}),
  })
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
  contentType: string,
  contentId: string,
): Promise<void> {
  return api.delete(`${base(gameId)}/${conversationId}/content/${contentType}/${contentId}`)
}

export async function listRequestTypes(): Promise<string[]> {
  const res = await api.get('/api/v1/llm/request-types')
  const arr: unknown = Array.isArray(res) ? res : (res?.request_types ?? res?.data ?? [])
  return (Array.isArray(arr) ? arr : []) as string[]
}

export interface GameLLMTokenBalance {
  game_id: string
  free_tokens_remaining: number
  premium_tokens_remaining: number
}

export async function getGameLLMTokenBalance(gameId: string): Promise<GameLLMTokenBalance> {
  return api.get(`/api/v1/games/${gameId}/llm-tokens/balance`)
}

export interface DetectedIntent {
  type: string
  entityType?: string
  goals?: string[]
}

export interface DetectIntentHistoryEntry {
  user_prompt: string
  request_type: string
  goal?: string
  response_text?: string
}

/**
 * All linked-entity ID arrays sent as context to every LLM API call.
 * Add new ID fields here — both streamDetectIntent and streamRequest will
 * automatically include them in their request bodies.
 */
export interface ConversationContextIds {
  lore_entry_ids: string[]
  item_definition_ids: string[]
  container_definition_ids: string[]
}

export async function streamDetectIntent(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  history: DetectIntentHistoryEntry[],
  contextIds: ConversationContextIds,
  onChunk: (text: string) => void,
  onDone: (intents: DetectedIntent[]) => void,
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
      body: JSON.stringify({
        user_prompt: userPrompt,
        lore_entry_ids: contextIds.lore_entry_ids,
        item_definition_ids: contextIds.item_definition_ids,
        container_definition_ids: contextIds.container_definition_ids,
        ...(history.length > 0 ? { history } : {}),
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
        // Support both new format (detected_request_type) and old format (detected_intents array)
        let intents: DetectedIntent[] = []
        if (evt.detected_request_type) {
          const detectedGoals = Array.isArray(evt.goals)
            ? (evt.goals as unknown[]).filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
            : (typeof evt.goal === 'string' && evt.goal.trim().length > 0 ? [evt.goal] : [])
          intents = [{ type: evt.detected_request_type as string, ...(detectedGoals.length > 0 ? { goals: detectedGoals } : {}) }]
        } else if (Array.isArray(evt.detected_intents) && evt.detected_intents.length > 0) {
          intents = (evt.detected_intents as Array<{ type?: string; entity_type?: string; goal?: string; goals?: string[]; Type?: string; EntityType?: string; Goal?: string; Goals?: string[] }>)
            .map((i) => {
              const rawGoals = Array.isArray(i.goals) ? i.goals : i.Goals
              const rawGoal = typeof i.goal === 'string' ? i.goal : i.Goal
              const detectedGoals = Array.isArray(rawGoals)
                ? rawGoals.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
                : (typeof rawGoal === 'string' && rawGoal.trim().length > 0 ? [rawGoal] : [])
              return {
                type: i.type ?? i.Type ?? '',
                entityType: i.entity_type ?? i.EntityType ?? '',
                ...(detectedGoals.length > 0 ? { goals: detectedGoals } : {}),
              }
            })
            .filter((i) => i.type)
        }
        const INTENT_ORDER: Record<string, number> = {
          lore_creating: 0,
          lore_analyzing: 0,
          lore_updating: 0,
          item_generation: 1,
          item_modify: 1,
          generator_item_creating: 1,
          crafting_recipe_creating: 2,
        }
        const sortedIntents = [...intents].sort((a, b) => {
          const rankA = INTENT_ORDER[a.type] ?? 2
          const rankB = INTENT_ORDER[b.type] ?? 2
          return rankA - rankB
        })
        onDone(sortedIntents)
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
  requestHistory?: Array<{ request_type: string; response_text: string }>,
  contextIds?: ConversationContextIds,
  entityType?: string,
  goals?: string[],
  generatedItems?: unknown[],
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) throw new Error('API URL is not configured.')

  const token = getValidToken()
  if (!token) throw new Error('Not authenticated.')

  const urlType = requestType.replace(/_/g, '-')
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
  }
  // Always send context IDs so the backend has full linked entity context.
  // To add a new ID type: add it to ConversationContextIds and include it here.
  body.lore_entry_ids = contextIds?.lore_entry_ids ?? []
  body.item_definition_ids = contextIds?.item_definition_ids ?? []
  body.container_definition_ids = contextIds?.container_definition_ids ?? []
  if ((requestType === 'lore_creating' || requestType === 'preset_generation' || requestType === 'container_creating' || requestType === 'gacha_pack_creating' || requestType === 'equipment_slot_generation' || requestType === 'crafting_recipe_creating') && entityType) {
    body.entity_type = entityType
  }
  if ((requestType === 'item_generation' || requestType === 'item_modify' || requestType === 'generator_item_creating' || requestType === 'preset_generation' || requestType === 'container_creating' || requestType === 'gacha_pack_creating' || requestType === 'equipment_slot_generation' || requestType === 'crafting_recipe_creating') && goals && goals.length > 0) {
    body.goals = goals
  }
  if ((requestType === 'item_generation' || requestType === 'item_modify' || requestType === 'generator_item_creating' || requestType === 'preset_generation' || requestType === 'container_creating' || requestType === 'gacha_pack_creating' || requestType === 'equipment_slot_generation' || requestType === 'crafting_recipe_creating') && Array.isArray(generatedItems) && generatedItems.length > 0) {
    body.generated_items = generatedItems
  }
  if (requestHistory && requestHistory.length > 0) {
    body.request_history = requestHistory
  }
  const res = await fetch(
    `${apiUrl}${base(gameId)}/${conversationId}/requests/${urlType}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
