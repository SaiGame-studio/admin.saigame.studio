import { useState, useRef, useCallback } from 'react'
import { createConversation, requestContainerCreatingPlanning, requestCraftingRecipeCreatingPlanning, requestGachaPackCreatingPlanning, streamDetectIntent, streamRequest } from '@/lib/llm-conversation-api'
import type { DetectedIntent, DetectIntentHistoryEntry, ConversationContextIds } from '@/lib/llm-conversation-api'
import type { Conversation } from '@/types/llm-conversation'
import type { ItemCategory, ItemRarity } from '@/types/inventory'

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
}

const ITEM_CATEGORIES: ItemCategory[] = [
  'weapon', 'armor', 'consumable', 'currency', 'material', 'card',
  'container', 'decoration', 'gacha_pack', 'generator', 'other',
]
const ITEM_RARITIES: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

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
      let detectedLanguage: string | undefined
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
          (result) => {
            resolvedIntents = result.intents
            detectedLanguage = result.detectedLanguage
            const firstType = result.intents[0]?.type ?? null
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
      const expandPlannedIntent = async (intent: PipelineIntent): Promise<PipelineIntent[]> => {
        if (intent.type !== 'container_creating_planning' && intent.type !== 'crafting_recipe_creating_planning' && intent.type !== 'gacha_pack_creating_planning') return [intent]

        const goals = intent.goals ?? []
        const entityType = intent.entityType || fallbackEntityType || undefined
        const mapAction = (action: { type: string; entity_type?: string; goal?: string; goals?: string[] }): PipelineIntent | null => {
          const actionGoals = Array.isArray(action.goals)
            ? action.goals.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
            : (typeof action.goal === 'string' && action.goal.trim() ? [action.goal] : [])

          if (action.type === 'item_generation') {
            return {
              type: 'item_generation',
              entityType: action.entity_type,
              goals: actionGoals,
            }
          }
          if (action.type === 'container_creating') {
            return {
              type: 'container_creating',
              entityType: action.entity_type || entityType,
              goals: actionGoals,
            }
          }
          if (action.type === 'gacha_pack_creating') {
            return {
              type: 'gacha_pack_creating',
              entityType: action.entity_type || entityType,
              goals: actionGoals,
            }
          }
          if (action.type === 'crafting_recipe_creating') {
            return {
              type: 'crafting_recipe_creating',
              entityType: action.entity_type || entityType,
              goals: actionGoals,
            }
          }
          return null
        }

        const plan = intent.type === 'container_creating_planning'
          ? await requestContainerCreatingPlanning(
              gameId,
              resolvedConvId,
              userPrompt,
              contextIds,
              {
                entityType,
                goals,
                history: historyContext,
              },
            )
          : intent.type === 'crafting_recipe_creating_planning'
            ? await requestCraftingRecipeCreatingPlanning(
                gameId,
                resolvedConvId,
                userPrompt,
                contextIds,
                {
                  language: detectedLanguage,
                  entityType,
                  goals,
                  history: historyContext,
                },
              )
            : await requestGachaPackCreatingPlanning(
                gameId,
                resolvedConvId,
                userPrompt,
                contextIds,
                {
                  language: detectedLanguage,
                  entityType,
                  goals,
                  history: historyContext,
                },
              )

        const plannedIntents = (plan.content?.actions ?? [])
          .map((action) => mapAction(action))
          .filter((planned): planned is PipelineIntent => !!planned)

        return plannedIntents.length > 0
          ? plannedIntents
          : (
            intent.type === 'container_creating_planning'
              ? [{ type: 'container_creating', entityType, goals }]
              : intent.type === 'crafting_recipe_creating_planning'
                ? [{ type: 'crafting_recipe_creating', entityType, goals }]
                : [{ type: 'gacha_pack_creating', entityType, goals }]
          )
      }

      const executionIntents = (await Promise.all(resolvedIntents.map(expandPlannedIntent))).flat()

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
