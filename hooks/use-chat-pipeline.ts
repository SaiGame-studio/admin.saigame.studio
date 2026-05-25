import { useState, useRef, useCallback } from 'react'
import { createConversation, streamDetectIntent, streamRequest, updateConversation } from '@/lib/llm-conversation-api'
import type { Conversation } from '@/types/llm-conversation'

export interface IntentResponse {
  intentType: string
  entityType: string
  goal: string
  responseText: string
  done: boolean
  error: string | null
}

export interface ChatTurn {
  id: string
  userMessage: string
  aiText: string
  responseText: string
  detectedType: string | null
  detectedLanguage: string | null
  detectedEntityType: string | null
  detectedGoal: string | null
  detectedIntents: { type: string; entityType: string; goal: string }[] | null
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

  // Accumulated goals from all detect-intent calls in this conversation session.
  const accumulatedGoalsRef = useRef<string[]>([])

  const send = useCallback(async (
    gameId: string,
    userPrompt: string,
    convId: string | null,
    requestType: string,          // 'auto' → detect-intent SSE; anything else → skip SSE
    onConvCreated: (conv: Conversation) => void,
    onConvUpdated: (conv: Conversation) => void,
    errorCreate: string,
    errorSend: string,
    entityType?: string,
  ): Promise<void> => {
    if (!gameId || !userPrompt.trim() || isRunningRef.current) return

    const turnId = Math.random().toString(36).slice(2) + Date.now().toString(36)
    isRunningRef.current = true
    setIsRunning(true)

    const finish = () => {
      isRunningRef.current = false
      setIsRunning(false)
    }

    try {
      // ── Step 1: ensure conversation exists (regular REST) ────────────────────
      const isNewConversation = !convId
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

      // Append user turn immediately so the UI feels responsive
      setChatHistory((prev) => [
        ...prev,
        { id: turnId, userMessage: userPrompt, aiText: '', responseText: '', detectedType: null, detectedLanguage: null, detectedEntityType: null, detectedGoal: null, detectedIntents: null, done: false, error: null },
      ])

      // ── Step 2: detect intent (SSE) or use explicit type ────────────────────
      let resolvedType = requestType
      let resolvedLanguage = ''
      let resolvedEntityType = ''
      let resolvedGoal = ''
      let resolvedIntents: { type: string; entityType: string; goal: string }[] = []
      if (requestType === 'auto') {
        let detectError = ''
        await streamDetectIntent(
          gameId,
          resolvedConvId,
          userPrompt,
          (chunk) =>
            setChatHistory((prev) =>
              prev.map((t) => (t.id === turnId ? { ...t, aiText: t.aiText + chunk } : t))
            ),
          (fields) => {
            if (fields.detectedType)       resolvedType         = fields.detectedType
            if (fields.detectedLanguage)   resolvedLanguage     = fields.detectedLanguage
            if (fields.detectedEntityType) resolvedEntityType   = fields.detectedEntityType
            if (fields.detectedGoal)       resolvedGoal         = fields.detectedGoal
            if (fields.detectedGoal && !accumulatedGoalsRef.current.includes(fields.detectedGoal)) {
              accumulatedGoalsRef.current = [...accumulatedGoalsRef.current, fields.detectedGoal]
            }
            setChatHistory((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t
                return {
                  ...t,
                  ...(fields.detectedType       ? { detectedType:       fields.detectedType }             : {}),
                  ...(fields.detectedLanguage   ? { detectedLanguage:   fields.detectedLanguage }         : {}),
                  ...(fields.detectedEntityType ? { detectedEntityType: fields.detectedEntityType }       : {}),
                  ...(fields.detectedGoal       ? { detectedGoal:       fields.detectedGoal }             : {}),
                  ...(fields.detectedIntents    ? { detectedIntents:    fields.detectedIntents }          : {}),
                }
              })
            )
          },
          (detectedType, detectedLanguage, detectedEntityType, detectedGoal, detectedIntents) => {
            resolvedType = detectedType
            resolvedLanguage = detectedLanguage
            resolvedEntityType = detectedEntityType
            resolvedGoal = detectedGoal
            resolvedIntents = detectedIntents
            if (detectedGoal && !accumulatedGoalsRef.current.includes(detectedGoal)) {
              accumulatedGoalsRef.current = [...accumulatedGoalsRef.current, detectedGoal]
            }
            setChatHistory((prev) =>
              prev.map((t) => (t.id === turnId ? { ...t, detectedType, detectedLanguage, detectedEntityType: detectedEntityType || null, detectedGoal: detectedGoal || null, detectedIntents: detectedIntents.length > 0 ? detectedIntents : null } : t))
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
        // Update conversation title & goal from detected goal — only for the first detect-intent
        if (resolvedGoal && resolvedConvId && isNewConversation) {
          try {
            const updatedConv = await updateConversation(gameId, resolvedConvId, {
              title: resolvedGoal.slice(0, 80),
              goal: resolvedGoal,
            })
            onConvUpdated(updatedConv)
          } catch {
            // Non-fatal — pipeline continues
          }
        }
      } else {
        // Type explicitly chosen — set immediately, skip detect-intent
        setChatHistory((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, detectedType: requestType } : t))
        )
      }

      // ── Step 3: stream one request per detected intent, sequentially ────────
      const intentsToProcess = resolvedIntents.length > 0
        ? resolvedIntents
        : [{ type: resolvedType, entityType: entityType ?? resolvedEntityType ?? '', goal: resolvedGoal }]

      // Pre-initialise response slots so the UI shows spinners immediately
      setChatHistory((prev) =>
        prev.map((t) => t.id !== turnId ? t : {
          ...t,
          responses: intentsToProcess.map((intent) => ({
            intentType: intent.type,
            entityType: intent.entityType,
            goal: intent.goal,
            responseText: '',
            done: false,
            error: null,
          })),
        })
      )

      for (let i = 0; i < intentsToProcess.length; i++) {
        const intent = intentsToProcess[i]
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
          intent.entityType || (entityType ?? undefined),
          resolvedLanguage,
          accumulatedGoalsRef.current.length > 0 ? [...accumulatedGoalsRef.current] : undefined,
        )
      }

      // All intents done — mark the whole turn complete
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
            responseText: '',
            detectedType: null,
            detectedLanguage: null,
            detectedEntityType: null,
            detectedGoal: null,
            detectedIntents: null,
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
    accumulatedGoalsRef.current = []
  }, [])
  const removeTurn = useCallback((id: string) => {
    setChatHistory((prev) => prev.filter((t) => t.id !== id))
  }, [])
  const loadHistory = useCallback((turns: ChatTurn[]) => {
    setChatHistory(turns)
    // Repopulate accumulated goals so they are sent on the next request
    const seen = new Set<string>()
    const restored: string[] = []
    for (const turn of turns) {
      if (turn.detectedGoal && !seen.has(turn.detectedGoal)) {
        seen.add(turn.detectedGoal)
        restored.push(turn.detectedGoal)
      }
    }
    accumulatedGoalsRef.current = restored
  }, [])

  const retryResponse = useCallback(async (
    gameId: string,
    convId: string,
    turnId: string,
    responseIdx: number,
    intentType: string,
    entityType: string,
    userMessage: string,
    language: string,
    errorSend: string,
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
        entityType || undefined,
        language,
        accumulatedGoalsRef.current.length > 0 ? [...accumulatedGoalsRef.current] : undefined,
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
