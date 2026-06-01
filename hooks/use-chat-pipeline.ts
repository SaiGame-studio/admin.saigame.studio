import { useState, useRef, useCallback } from 'react'
import { createConversation, streamDetectIntent, streamRequest } from '@/lib/llm-conversation-api'
import type { DetectedIntent, DetectIntentHistoryEntry } from '@/lib/llm-conversation-api'
import type { Conversation } from '@/types/llm-conversation'

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
    mainContent?: string,
    loreEntryIds?: string[],
    fallbackEntityType?: string,
    historyContext?: DetectIntentHistoryEntry[],
    generatedItems?: unknown[],
    itemDefinitionIds?: string[],
    generatedPresets?: unknown[],
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
      let resolvedIntents: DetectedIntent[] = []
      if (requestType === 'auto') {
        let detectError = ''
        await streamDetectIntent(
          gameId,
          resolvedConvId,
          userPrompt,
          historyContext ?? [],
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
      // Pre-initialise all response slots so the UI shows spinners immediately
      setChatHistory((prev) =>
        prev.map((t) => t.id !== turnId ? t : {
          ...t,
          responses: resolvedIntents.map((intent) => ({
            intentType: intent.type,
            entityType: intent.entityType ?? '',
            responseText: '',
            done: false,
            error: null,
          })),
        })
      )

      for (let i = 0; i < resolvedIntents.length; i++) {
        const intent = resolvedIntents[i]
        await streamRequest(
          gameId,
          resolvedConvId,
          intent.type,
          userPrompt,
          (chunk) =>
            setChatHistory((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t
                const responses = (t.responses ?? []).map((r, idx) =>
                  idx === i ? { ...r, responseText: r.responseText + chunk } : r
                )
                return { ...t, responses }
              })
            ),
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
          intent.type === 'lore_analyzing' && mainContent ? mainContent : undefined,
          loreEntryIds,
          (intent.type === 'lore_creating' || intent.type === 'preset_generation') ? (intent.entityType || fallbackEntityType || undefined) : undefined,
          (intent.type === 'item_generation' || intent.type === 'item_modify' || intent.type === 'preset_generation') ? intent.goals : undefined,
          intent.type === 'preset_generation' && generatedPresets && generatedPresets.length > 0
            ? generatedPresets
            : (intent.type === 'item_generation' || intent.type === 'item_modify') && generatedItems && generatedItems.length > 0
              ? generatedItems
              : undefined,
          itemDefinitionIds,
        )
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
    mainContent?: string,
    generatedItems?: unknown[],
    loreEntryIds?: string[],
    itemDefinitionIds?: string[],
    generatedPresets?: unknown[],
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
        intentType === 'lore_analyzing' && mainContent ? mainContent : undefined,
        loreEntryIds,
        undefined,
        undefined,
        intentType === 'preset_generation' && generatedPresets && generatedPresets.length > 0
          ? generatedPresets
          : (intentType === 'item_generation' || intentType === 'item_modify') && generatedItems && generatedItems.length > 0
            ? generatedItems
            : undefined,
        itemDefinitionIds,
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
