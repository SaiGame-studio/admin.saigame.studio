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

export interface DetectedIntentResult {
  intents: DetectedIntent[]
  detectedLanguage?: string
}

export interface ContainerCreatingPlanAction {
  type: string
  entity_type?: string
  goal?: string
  goals?: string[]
  depends_on?: number[]
}

export interface ContainerCreatingPlanResponse {
  request_id: string
  conversation_id: string
  detected_request_type: string
  status: string
  content: {
    language?: string
    summary?: string
    requires_linked_item_definition?: boolean
    actions?: ContainerCreatingPlanAction[]
    clarification?: string
  }
}

export interface CraftingRecipePlanningAction {
  type: string
  entity_type?: string
  goal?: string
  goals?: string[]
  item_code?: string
  item_definition_ids?: string[]
  depends_on?: number[]
}

export interface CraftingRecipePlanningResponse {
  request_id: string
  conversation_id: string
  detected_request_type: string
  status: string
  prompt_version?: string
  content?: {
    language?: string
    summary?: string
    requires_item_generation?: boolean
    actions?: CraftingRecipePlanningAction[]
    clarification?: string
  }
}

export interface GachaPackPlanningAction {
  type: string
  entity_type?: string
  goal?: string
  goals?: string[]
  item_code?: string
  item_definition_ids?: string[]
  depends_on?: number[]
}

export interface GachaPackPlanningResponse {
  request_id: string
  conversation_id: string
  detected_request_type: string
  status: string
  prompt_version?: string
  content?: {
    language?: string
    summary?: string
    requires_item_generation?: boolean
    actions?: GachaPackPlanningAction[]
    clarification?: string
  }
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

function normalizeDetectedIntents(payload: Record<string, unknown>): DetectedIntentResult {
  let intents: DetectedIntent[] = []

  const detectedRequestType = typeof payload.detected_request_type === 'string'
    ? payload.detected_request_type
    : (typeof payload.Type === 'string' ? payload.Type : '')
  if (detectedRequestType) {
    const rawGoals = Array.isArray(payload.goals) ? payload.goals : payload.Goals
    const rawGoal = typeof payload.goal === 'string'
      ? payload.goal
      : (typeof payload.Goal === 'string' ? payload.Goal : '')
    const detectedGoals = Array.isArray(rawGoals)
      ? rawGoals.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
      : (rawGoal.trim().length > 0 ? [rawGoal] : [])
    intents = [{
      type: detectedRequestType,
      entityType: typeof payload.entity_type === 'string'
        ? payload.entity_type
        : (typeof payload.EntityType === 'string' ? payload.EntityType : undefined),
      ...(detectedGoals.length > 0 ? { goals: detectedGoals } : {}),
    }]
  } else if (Array.isArray(payload.detected_intents) && payload.detected_intents.length > 0) {
    intents = (payload.detected_intents as Array<{ type?: string; entity_type?: string; goal?: string; goals?: string[]; Type?: string; EntityType?: string; Goal?: string; Goals?: string[] }>)
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
    container_creating_planning: 2,
    gacha_pack_creating_planning: 2,
    crafting_recipe_creating_planning: 2,
    crafting_recipe_creating: 3,
  }
  intents = [...intents].sort((a, b) => {
    const rankA = INTENT_ORDER[a.type] ?? 2
    const rankB = INTENT_ORDER[b.type] ?? 2
    return rankA - rankB
  })
  return {
    intents,
    detectedLanguage: typeof payload.detected_language === 'string'
      ? payload.detected_language
      : (typeof payload.DetectedLanguage === 'string' ? payload.DetectedLanguage : undefined),
  }
}

export async function streamDetectIntent(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  history: DetectIntentHistoryEntry[],
  contextIds: ConversationContextIds,
  onChunk: (text: string) => void,
  onDone: (result: DetectedIntentResult) => void,
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

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    const payload = await res.json() as Record<string, unknown>
    onDone(normalizeDetectedIntents(payload))
    return
  }

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
        onDone(normalizeDetectedIntents(evt as Record<string, unknown>))
        return
      } else if (evt.type === 'error') {
        onError(evt.message ?? 'Unknown error')
        return
      } else if (evt.detected_request_type || evt.detected_intents) {
        onDone(normalizeDetectedIntents(evt as Record<string, unknown>))
        return
      }
    }
  }

  const leftover = buf.trim()
  if (leftover) {
    try {
      const payloadText = leftover.startsWith('data: ') ? leftover.slice(6) : leftover
      const evt = JSON.parse(payloadText) as Record<string, unknown>
      if (evt.detected_request_type || evt.detected_intents) {
        onDone(normalizeDetectedIntents(evt))
      }
    } catch {
      // Ignore incomplete trailing SSE fragments.
    }
  }
}

export async function requestContainerCreatingPlanning(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  contextIds: ConversationContextIds,
  options?: {
    entityType?: string
    goals?: string[]
    history?: DetectIntentHistoryEntry[]
  },
): Promise<ContainerCreatingPlanResponse> {
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
    lore_entry_ids: contextIds.lore_entry_ids,
    item_definition_ids: contextIds.item_definition_ids,
    container_definition_ids: contextIds.container_definition_ids,
  }
  if (options?.entityType) body.entity_type = options.entityType
  if (options?.goals?.length) body.goals = options.goals
  if (options?.history?.length) body.history = options.history

  return api.post(`${base(gameId)}/${conversationId}/requests/container-creating-planning`, body)
}

export async function requestCraftingRecipeCreatingPlanning(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  contextIds: ConversationContextIds,
  options?: {
    language?: string
    entityType?: string
    goals?: string[]
    history?: DetectIntentHistoryEntry[]
  },
): Promise<CraftingRecipePlanningResponse> {
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
    lore_entry_ids: contextIds.lore_entry_ids,
    item_definition_ids: contextIds.item_definition_ids,
  }
  if (options?.language) body.language = options.language
  if (options?.entityType) body.entity_type = options.entityType
  if (options?.goals?.length) body.goals = options.goals
  if (options?.history?.length) body.history = options.history

  return api.post(`${base(gameId)}/${conversationId}/requests/crafting-recipe-creating-planning`, body)
}

export async function requestGachaPackCreatingPlanning(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  contextIds: ConversationContextIds,
  options?: {
    language?: string
    entityType?: string
    goals?: string[]
    history?: DetectIntentHistoryEntry[]
  },
): Promise<GachaPackPlanningResponse> {
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
    lore_entry_ids: contextIds.lore_entry_ids,
    item_definition_ids: contextIds.item_definition_ids,
    container_definition_ids: contextIds.container_definition_ids,
  }
  if (options?.language) body.language = options.language
  if (options?.entityType) body.entity_type = options.entityType
  if (options?.goals?.length) body.goals = options.goals
  if (options?.history?.length) body.history = options.history

  return api.post(`${base(gameId)}/${conversationId}/requests/gacha-pack-creating-planning`, body)
}

function requestPathForType(requestType: string): string {
  return requestType.replace(/_/g, '-')
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

  const urlType = requestPathForType(requestType)
  const body: Record<string, unknown> = {
    user_prompt: userPrompt,
  }
  // Always send context IDs so the backend has full linked entity context.
  // To add a new ID type: add it to ConversationContextIds and include it here.
  body.lore_entry_ids = contextIds?.lore_entry_ids ?? []
  body.item_definition_ids = contextIds?.item_definition_ids ?? []
  body.container_definition_ids = contextIds?.container_definition_ids ?? []
  if ((requestType === 'lore_creating' || requestType === 'item_generation' || requestType === 'item_modify' || requestType === 'generator_item_creating' || requestType === 'preset_generation' || requestType === 'container_creating' || requestType === 'gacha_pack_creating' || requestType === 'equipment_slot_generation' || requestType === 'crafting_recipe_creating') && entityType) {
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
