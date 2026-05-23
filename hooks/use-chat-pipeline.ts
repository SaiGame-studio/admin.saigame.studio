import { useState, useRef, useCallback } from 'react'
import { createConversation, streamDetectIntent, streamRequest, updateConversation } from '@/lib/llm-conversation-api'
import type { Conversation } from '@/types/llm-conversation'

export interface ChatTurn {
  id: string
  userMessage: string
  aiText: string
  responseText: string
  detectedType: string | null
  detectedLanguage: string | null
  detectedEntityType: string | null
  detectedGoal: string | null
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
        { id: turnId, userMessage: userPrompt, aiText: '', responseText: '', detectedType: null, detectedLanguage: null, detectedEntityType: null, detectedGoal: null, done: false, error: null },
      ])

      // ── Step 2: detect intent (SSE) or use explicit type ────────────────────
      let resolvedType = requestType
      let resolvedLanguage = ''
      let resolvedEntityType = ''
      let resolvedGoal = ''
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
            setChatHistory((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t
                return {
                  ...t,
                  ...(fields.detectedType       ? { detectedType:       fields.detectedType }             : {}),
                  ...(fields.detectedLanguage   ? { detectedLanguage:   fields.detectedLanguage }         : {}),
                  ...(fields.detectedEntityType ? { detectedEntityType: fields.detectedEntityType }       : {}),
                  ...(fields.detectedGoal       ? { detectedGoal:       fields.detectedGoal }             : {}),
                }
              })
            )
          },
          (detectedType, detectedLanguage, detectedEntityType, detectedGoal) => {
            resolvedType = detectedType
            resolvedLanguage = detectedLanguage
            resolvedEntityType = detectedEntityType
            resolvedGoal = detectedGoal
            setChatHistory((prev) =>
              prev.map((t) => (t.id === turnId ? { ...t, detectedType, detectedLanguage, detectedEntityType: detectedEntityType || null, detectedGoal: detectedGoal || null } : t))
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

      // ── Step 3: stream request endpoint ─────────────────────────────────────
      await streamRequest(
        gameId,
        resolvedConvId,
        resolvedType,
        userPrompt,
        (chunk) =>
          setChatHistory((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, responseText: t.responseText + chunk } : t))
          ),
        (_requestId) => {
          setChatHistory((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, done: true } : t))
          )
          finish()
        },
        (errMsg) => {
          setChatHistory((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, error: errMsg, done: true } : t))
          )
          finish()
        },
        entityType ?? (resolvedEntityType || undefined),
        resolvedLanguage,
      )
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
            done: true,
            error: errorCreate,
          },
        ]
      })
      finish()
    }
  }, [])

  const clearHistory = useCallback(() => setChatHistory([]), [])
  const loadHistory = useCallback((turns: ChatTurn[]) => setChatHistory(turns), [])

  return { isRunning, chatHistory, send, clearHistory, loadHistory }
}
