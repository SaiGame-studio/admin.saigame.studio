import { useState, useRef, useCallback } from 'react'
import { createConversation, linkConversationContent, requestContainerCreatingPlanning, streamDetectIntent, streamRequest } from '@/lib/llm-conversation-api'
import type { DetectedIntent, DetectIntentHistoryEntry, ConversationContextIds } from '@/lib/llm-conversation-api'
import { createItemDefinition, listItemDefinitions } from '@/lib/inventory-api'
import type { Conversation } from '@/types/llm-conversation'
import type { CreateItemRequest, ItemCategory, ItemRarity } from '@/types/inventory'

export interface IntentResponse {
  intentType: string
  entityType: string
  responseText: string
  done: boolean
  error: string | null
}

export interface ChatTurn {
  id: string
  userMessage: string
  aiText: string
  detectedType: string | null
  responses?: IntentResponse[]
  done: boolean
  error: string | null
}

interface PipelineIntent extends DetectedIntent {
  autoSaveGeneratedItems?: boolean
}

const ITEM_CATEGORIES: ItemCategory[] = [
  'weapon', 'armor', 'consumable', 'currency', 'material', 'card',
  'container', 'decoration', 'gacha_pack', 'generator', 'other',
]
const ITEM_RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function parseGeneratedItemDrafts(text: string): Record<string, unknown>[] {
  const tryParse = (input: string): Record<string, unknown>[] => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed.map(asRecord).filter((v): v is Record<string, unknown> => !!v)
      const record = asRecord(parsed)
      if (!record) return []
      const generatedItems = Array.isArray(record.generated_items) ? record.generated_items : record.items
      if (Array.isArray(generatedItems)) {
        return generatedItems.map(asRecord).filter((v): v is Record<string, unknown> => !!v)
      }
      return [record]
    } catch {
      return []
    }
  }

  const direct = tryParse(text.trim())
  if (direct.length > 0) return direct

  const fenced = Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi))
  const fromFences = fenced.flatMap((match) => tryParse(match[1].trim()))
  if (fromFences.length > 0) return fromFences

  const objects: Record<string, unknown>[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        objects.push(...tryParse(text.slice(start, i + 1)))
        start = -1
      }
    }
  }
  return objects
}

function normalizeGeneratedItemDraft(item: Record<string, unknown>): CreateItemRequest | null {
  const name = typeof item.name === 'string' ? item.name.trim() : ''
  if (!name) return null

  const rawCategory = typeof item.category === 'string' ? item.category : 'container'
  const category = ITEM_CATEGORIES.includes(rawCategory as ItemCategory) ? rawCategory as ItemCategory : 'container'
  const rawRarity = typeof item.rarity === 'string' ? item.rarity : 'common'
  const rarity = ITEM_RARITIES.includes(rawRarity as ItemRarity) ? rawRarity as ItemRarity : 'common'
  const rawStats = asRecord(item.base_stats) ?? asRecord(item.attributes) ?? {}
  const base_stats = Object.fromEntries(
    Object.entries(rawStats)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
  ) as Record<string, number>
  const metadata = { ...(asRecord(item.metadata) ?? {}) }
  if (typeof item.description === 'string' && item.description.trim()) {
    metadata.description = item.description.trim()
  }

  const isStackable = typeof item.is_stackable === 'boolean' ? item.is_stackable : false
  const body: CreateItemRequest = {
    name,
    category,
    rarity,
    is_stackable: isStackable,
    grid_width: typeof item.grid_width === 'number' && item.grid_width > 0 ? item.grid_width : 1,
    grid_height: typeof item.grid_height === 'number' && item.grid_height > 0 ? item.grid_height : 1,
    base_stats,
    metadata,
    client_writable: typeof item.client_writable === 'boolean' ? item.client_writable : false,
    allow_client_update_qty: typeof item.allow_client_update_qty === 'boolean' ? item.allow_client_update_qty : false,
  }
  if (typeof item.item_code === 'string' && item.item_code.trim()) body.item_code = item.item_code.trim()
  if (isStackable) body.max_stack_size = typeof item.max_stack_size === 'number' ? item.max_stack_size : 99
  return body
}

async function createLinkedItemsFromGeneration(
  gameId: string,
  conversationId: string,
  responseText: string,
): Promise<string[]> {
  const drafts = parseGeneratedItemDrafts(responseText)
    .map(normalizeGeneratedItemDraft)
    .filter((item): item is CreateItemRequest => !!item)

  const ids: string[] = []
  for (const draft of drafts) {
    if (draft.item_code) {
      const existing = await listItemDefinitions({ gameId }, { item_code: draft.item_code, limit: 1 })
      const existingItem = (existing.items ?? [])[0]
      if (existingItem) {
        ids.push(existingItem.id)
        await linkConversationContent(gameId, conversationId, 'item_definition', existingItem.id).catch(() => {})
        continue
      }
    }

    const created = await createItemDefinition({ gameId }, draft)
    ids.push(created.item.id)
    await linkConversationContent(gameId, conversationId, 'item_definition', created.item.id).catch(() => {})
  }
  return ids
}

/**
 * Manages the sequential API pipeline triggered on each chat send:
 *   Step 1 — createConversation (regular REST)  — only when no convId is provided
 *   Step 2 — streamDetectIntent (SSE streaming) — streams chunks into chatHistory
 *
 * All dynamic values (gameId, convId, callbacks, error strings) are passed
 * directly to `send()` so the hook has zero external dependencies and never
 * becomes stale regardless of how many steps are added in the future.
 */
export function useChatPipeline() {
  const [isRunning, setIsRunning] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([])

  // Ref-based guard so the guard check inside `send` always reads the live value
  // even if the closure captured a stale `isRunning` snapshot.
  const isRunningRef = useRef(false)

  const send = useCallback(async (
    gameId: string,
    userPrompt: string,
    convId: string | null,
    requestType: string,          // 'auto' → detect-intent SSE; anything else → skip SSE
    onConvCreated: (conv: Conversation) => void,
    onConvUpdated: (conv: Conversation) => void,
    errorCreate: string,
    errorSend: string,
    requestHistory?: Array<{ request_type: string; response_text: string }>,
    loreEntryIds?: string[],
    fallbackEntityType?: string,
    historyContext?: DetectIntentHistoryEntry[],
    generatedItems?: unknown[],
    itemDefinitionIds?: string[],
    generatedPresets?: unknown[],
    generatedContainers?: unknown[],
    containerDefinitionIds?: string[],
    generatedGachaPacks?: unknown[],
    generatedEquipmentSlots?: unknown[],
    generatedCraftingRecipes?: unknown[],
  ): Promise<void> => {

    const turnId = Math.random().toString(36).slice(2) + Date.now().toString(36)
    isRunningRef.current = true
    setIsRunning(true)

    const finish = () => {
      isRunningRef.current = false
      setIsRunning(false)
    }

    try {
      // ── Step 1: ensure conversation exists (regular REST) ────────────────────
      let resolvedConvId = convId
      if (!resolvedConvId) {
        const newConv = await createConversation(gameId, {
          title: userPrompt.slice(0, 60),
          goal: userPrompt,
        })
        resolvedConvId = newConv.ID
        onConvCreated(newConv)
        // Fresh history for a brand-new conversation
        setChatHistory([])
      }

      // Suppress unused-callback warning — onConvUpdated is kept in signature for callers
      void onConvUpdated

      // Append user turn immediately so the UI feels responsive
      setChatHistory((prev) => [
        ...prev,
        { id: turnId, userMessage: userPrompt, aiText: '', detectedType: null, done: false, error: null },
      ])

      // ── Step 2: detect intent (SSE) or use explicit type ────────────────────
      // Build shared context IDs — passed to both streamDetectIntent and streamRequest
      const contextIds: ConversationContextIds = {
        lore_entry_ids: loreEntryIds ?? [],
        item_definition_ids: itemDefinitionIds ?? [],
        container_definition_ids: containerDefinitionIds ?? [],
      }

      let resolvedIntents: PipelineIntent[] = []
      if (requestType === 'auto') {
        let detectError = ''
        await streamDetectIntent(
          gameId,
          resolvedConvId,
          userPrompt,
          historyContext ?? [],
          contextIds,
          (chunk) =>
            setChatHistory((prev) =>
              prev.map((t) => (t.id === turnId ? { ...t, aiText: t.aiText + chunk } : t))
            ),
          (detectedIntents) => {
            resolvedIntents = detectedIntents
            const firstType = detectedIntents[0]?.type ?? null
            setChatHistory((prev) =>
              prev.map((t) => (t.id === turnId ? { ...t, detectedType: firstType } : t))
            )
          },
          (errMsg) => {
            detectError = errMsg
            setChatHistory((prev) =>
              prev.map((t) => (t.id === turnId ? { ...t, error: errMsg, done: true } : t))
            )
          },
        )
        if (detectError) { finish(); return }
      } else {
        resolvedIntents = [{ type: requestType }]
        // Type explicitly chosen — set immediately, skip detect-intent
        setChatHistory((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, detectedType: requestType } : t))
        )
      }

      // ── Step 3: stream each intent sequentially ──────────────────────────────
      const expandContainerPlan = async (intent: PipelineIntent): Promise<PipelineIntent[]> => {
        if (intent.type !== 'container_creating_planning') return [intent]

        const plan = await requestContainerCreatingPlanning(
          gameId,
          resolvedConvId,
          userPrompt,
          contextIds,
          {
            entityType: intent.entityType || fallbackEntityType || undefined,
            goals: intent.goals,
            history: historyContext,
          },
        )
        const plannedIntents = (plan.content?.actions ?? [])
          .map((action): PipelineIntent | null => {
            const goals = Array.isArray(action.goals)
              ? action.goals.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
              : (typeof action.goal === 'string' && action.goal.trim() ? [action.goal] : [])

            if (action.type === 'item_generation') {
              return {
                type: 'item_generation',
                entityType: action.entity_type,
                goals,
                autoSaveGeneratedItems: true,
              }
            }
            if (action.type === 'container_creating') {
              return {
                type: 'container_creating',
                entityType: action.entity_type || intent.entityType,
                goals,
              }
            }
            return null
          })
          .filter((planned): planned is PipelineIntent => !!planned)

        return plannedIntents.length > 0
          ? plannedIntents
          : [{ type: 'container_creating', entityType: intent.entityType, goals: intent.goals }]
      }

      const executionIntents = (await Promise.all(resolvedIntents.map(expandContainerPlan))).flat()

      // Pre-initialise all response slots so the UI shows spinners immediately
      setChatHistory((prev) =>
        prev.map((t) => t.id !== turnId ? t : {
          ...t,
          responses: executionIntents.map((intent) => ({
            intentType: intent.type,
            entityType: intent.entityType ?? '',
            responseText: '',
            done: false,
            error: null,
          })),
        })
      )

      // Growing history: starts with prior-turn responses, each completed intent appends its text
      const activeHistory: Array<{ request_type: string; response_text: string }> = [
        ...(requestHistory ?? []),
      ]

      for (let i = 0; i < executionIntents.length; i++) {
        const intent = executionIntents[i]
        let currentResponseText = ''
        await streamRequest(
          gameId,
          resolvedConvId,
          intent.type,
          userPrompt,
          (chunk) => {
            currentResponseText += chunk
            setChatHistory((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t
                const responses = (t.responses ?? []).map((r, idx) =>
                  idx === i ? { ...r, responseText: r.responseText + chunk } : r
                )
                return { ...t, responses }
              })
            )
          },
          (_requestId) => {
            setChatHistory((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t
                const responses = (t.responses ?? []).map((r, idx) =>
                  idx === i ? { ...r, done: true } : r
                )
                return { ...t, responses }
              })
            )
          },
          (errMsg) => {
            setChatHistory((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t
                const responses = (t.responses ?? []).map((r, idx) =>
                  idx === i ? { ...r, error: errMsg, done: true } : r
                )
                return { ...t, responses }
              })
            )
          },
          activeHistory.length > 0 ? [...activeHistory] : undefined,
          contextIds,
          (intent.type === 'lore_creating' || intent.type === 'preset_generation' || intent.type === 'container_creating' || intent.type === 'gacha_pack_creating' || intent.type === 'equipment_slot_generation' || intent.type === 'crafting_recipe_creating') ? (intent.entityType || fallbackEntityType || undefined) : undefined,
          (intent.type === 'item_generation' || intent.type === 'item_modify' || intent.type === 'generator_item_creating' || intent.type === 'preset_generation' || intent.type === 'container_creating' || intent.type === 'gacha_pack_creating' || intent.type === 'equipment_slot_generation' || intent.type === 'crafting_recipe_creating') ? intent.goals : undefined,
          intent.type === 'preset_generation' && generatedPresets && generatedPresets.length > 0
            ? generatedPresets
            : intent.type === 'container_creating' && generatedContainers && generatedContainers.length > 0
              ? generatedContainers
              : intent.type === 'gacha_pack_creating' && generatedGachaPacks && generatedGachaPacks.length > 0
                ? generatedGachaPacks
                : intent.type === 'equipment_slot_generation' && generatedEquipmentSlots && generatedEquipmentSlots.length > 0
                  ? generatedEquipmentSlots
                  : intent.type === 'crafting_recipe_creating' && generatedCraftingRecipes && generatedCraftingRecipes.length > 0
                    ? generatedCraftingRecipes
                    : (intent.type === 'item_generation' || intent.type === 'item_modify' || intent.type === 'generator_item_creating') && generatedItems && generatedItems.length > 0
                      ? generatedItems
                      : undefined
        )
        // After each completed intent, append its response to activeHistory so
        // subsequent intents in this same turn receive all prior responses as context
        if (currentResponseText) {
          activeHistory.push({ request_type: intent.type, response_text: currentResponseText })
        }
        if (intent.autoSaveGeneratedItems && currentResponseText) {
          const createdItemIds = await createLinkedItemsFromGeneration(gameId, resolvedConvId, currentResponseText)
          if (createdItemIds.length > 0) {
            contextIds.item_definition_ids = Array.from(new Set([...contextIds.item_definition_ids, ...createdItemIds]))
          }
        }
      }

      // Mark the turn complete
      setChatHistory((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, done: true } : t))
      )
      finish()
    } catch {
      // Pipeline failed — surface the error on the turn (or create a synthetic turn
      // if the failure happened before the turn was appended, e.g. createConversation threw)
      setChatHistory((prev) => {
        const hasTurn = prev.some((t) => t.id === turnId)
        if (hasTurn) {
          return prev.map((t) =>
            t.id === turnId ? { ...t, error: errorSend, done: true } : t
          )
        }
        return [
          ...prev,
          {
            id: turnId,
            userMessage: userPrompt,
            aiText: '',
            detectedType: null,
            done: true,
            error: errorCreate,
          },
        ]
      })
      finish()
    }
  }, [])

  const clearHistory = useCallback(() => {
    setChatHistory([])
  }, [])
  const removeTurn = useCallback((id: string) => {
    setChatHistory((prev) => prev.filter((t) => t.id !== id))
  }, [])
  const loadHistory = useCallback((turns: ChatTurn[]) => {
    setChatHistory(turns)
  }, [])

  const retryResponse = useCallback(async (
    gameId: string,
    convId: string,
    turnId: string,
    responseIdx: number,
    intentType: string,
    userMessage: string,
    errorSend: string,
    requestHistory?: Array<{ request_type: string; response_text: string }>,
    generatedItems?: unknown[],
    loreEntryIds?: string[],
    itemDefinitionIds?: string[],
    generatedPresets?: unknown[],
    generatedContainers?: unknown[],
    containerDefinitionIds?: string[],
    generatedGachaPacks?: unknown[],
    generatedEquipmentSlots?: unknown[],
    generatedCraftingRecipes?: unknown[],
  ): Promise<void> => {
    if (!gameId || !convId || isRunningRef.current) return

    isRunningRef.current = true
    setIsRunning(true)

    const finish = () => {
      isRunningRef.current = false
      setIsRunning(false)
    }

    // Reset this specific response to loading state
    setChatHistory((prev) =>
      prev.map((t) => {
        if (t.id !== turnId) return t
        const responses = (t.responses ?? []).map((r, idx) =>
          idx === responseIdx ? { ...r, responseText: '', error: null, done: false } : r
        )
        return { ...t, responses }
      })
    )

    try {
      await streamRequest(
        gameId,
        convId,
        intentType,
        userMessage,
        (chunk) =>
          setChatHistory((prev) =>
            prev.map((t) => {
              if (t.id !== turnId) return t
              const responses = (t.responses ?? []).map((r, idx) =>
                idx === responseIdx ? { ...r, responseText: r.responseText + chunk } : r
              )
              return { ...t, responses }
            })
          ),
        (_requestId) => {
          setChatHistory((prev) =>
            prev.map((t) => {
              if (t.id !== turnId) return t
              const responses = (t.responses ?? []).map((r, idx) =>
                idx === responseIdx ? { ...r, done: true } : r
              )
              return { ...t, responses }
            })
          )
        },
        (errMsg) => {
          setChatHistory((prev) =>
            prev.map((t) => {
              if (t.id !== turnId) return t
              const responses = (t.responses ?? []).map((r, idx) =>
                idx === responseIdx ? { ...r, error: errMsg, done: true } : r
              )
              return { ...t, responses }
            })
          )
        },
        requestHistory && requestHistory.length > 0 ? requestHistory : undefined,
        { lore_entry_ids: loreEntryIds ?? [], item_definition_ids: itemDefinitionIds ?? [], container_definition_ids: containerDefinitionIds ?? [] },
        undefined,
        undefined,
        intentType === 'preset_generation' && generatedPresets && generatedPresets.length > 0
          ? generatedPresets
          : intentType === 'container_creating' && generatedContainers && generatedContainers.length > 0
            ? generatedContainers
            : intentType === 'gacha_pack_creating' && generatedGachaPacks && generatedGachaPacks.length > 0
              ? generatedGachaPacks
              : intentType === 'equipment_slot_generation' && generatedEquipmentSlots && generatedEquipmentSlots.length > 0
                ? generatedEquipmentSlots
                : intentType === 'crafting_recipe_creating' && generatedCraftingRecipes && generatedCraftingRecipes.length > 0
                  ? generatedCraftingRecipes
                  : (intentType === 'item_generation' || intentType === 'item_modify' || intentType === 'generator_item_creating') && generatedItems && generatedItems.length > 0
                    ? generatedItems
                    : undefined,
      )
    } catch {
      setChatHistory((prev) =>
        prev.map((t) => {
          if (t.id !== turnId) return t
          const responses = (t.responses ?? []).map((r, idx) =>
            idx === responseIdx ? { ...r, error: errorSend, done: true } : r
          )
          return { ...t, responses }
        })
      )
    }

    finish()
  }, [])

  return { isRunning, chatHistory, send, retryResponse, clearHistory, loadHistory, removeTurn }
}
