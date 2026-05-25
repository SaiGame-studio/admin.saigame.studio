'use client'

import { BookOpen, Bot, Loader2, PackagePlus, RotateCcw, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ChatTurn } from '@/hooks/use-chat-pipeline'
import type { LoreEntry } from '@/types/lore'

interface ConversationChatHistoryProps {
  chatHistory: ChatTurn[]
  isStreaming: boolean
  gameId: string
  activeConvId: string | null
  savedLoreIds: Record<string, string>
  loreDetails: Record<string, LoreEntry>
  isCreatingRecords: boolean
  onRetry: (turn: { id: string; userMessage: string; detectedType: string | null; detectedEntityType: string | null }) => void
  onRetryResponse: (turnId: string, responseIdx: number, intentType: string, entityType: string, userMessage: string, detectedLanguage: string) => void
  onSaveToGame: () => void
  onOpenLoreReview: (turn: ChatTurn, idx: number, responseText: string, entityType: string) => void
  t: (key: string) => string
}

export function ConversationChatHistory({
  chatHistory,
  isStreaming,
  gameId,
  activeConvId,
  savedLoreIds,
  loreDetails,
  isCreatingRecords,
  onRetry,
  onRetryResponse,
  onSaveToGame,
  onOpenLoreReview,
  t,
}: ConversationChatHistoryProps) {
  const router = useRouter()

  return (
    <ScrollArea id="conv-panel-content-scroll" className="flex-1 px-3 py-2">
      {chatHistory.map((turn) => (
        <div id={`conv-panel-turn-${turn.id}`} key={turn.id} className="mb-4">
          {/* User message */}
          <div id={`conv-panel-user-msg-${turn.id}`} className="flex justify-end mb-2">
            <span
              id={`conv-panel-user-msg-text-${turn.id}`}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs max-w-[80%] break-words"
            >
              {turn.userMessage}
            </span>
          </div>

          {/* AI response */}
          <div id={`conv-panel-ai-msg-${turn.id}`} className="flex items-start gap-2">
            <Bot className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <div id={`conv-panel-ai-msg-content-${turn.id}`} className="flex-1 min-w-0">
              {turn.detectedType && (
                <div id={`conv-panel-ai-detected-row-${turn.id}`} className="mb-1.5 flex items-center gap-2 flex-wrap">
                  <span
                    id={`conv-panel-ai-detected-type-${turn.id}`}
                    className="inline-flex items-center gap-1 text-xs border border-primary/50 text-primary rounded-md px-2 py-0.5"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    {t(`llmConversation.requestTypes.${turn.detectedType}`) || turn.detectedType}
                  </span>
                  {turn.detectedGoal && (
                    <span
                      id={`conv-panel-ai-detected-goal-${turn.id}`}
                      className="text-[10px] text-muted-foreground leading-none"
                    >
                      {turn.detectedGoal}
                    </span>
                  )}
                </div>
              )}

              {turn.error ? (
                <div id={`conv-panel-ai-error-row-${turn.id}`} className="flex items-center gap-2">
                  <p id={`conv-panel-ai-error-${turn.id}`} className="text-xs text-destructive">{turn.error}</p>
                  <button
                    id={`conv-panel-ai-retry-btn-${turn.id}`}
                    onClick={() => onRetry(turn)}
                    disabled={isStreaming}
                    className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    title="Retry"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              ) : (turn.responses?.length ?? 0) > 0 ? (
                <div id={`conv-panel-ai-responses-${turn.id}`} className="flex flex-col gap-3">
                  {turn.responses!.map((response, idx) => (
                    <div key={idx} id={`conv-panel-ai-response-${turn.id}-${idx}`} className="flex flex-col gap-1">
                      <span id={`conv-panel-ai-response-type-${turn.id}-${idx}`} className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        {t(`llmConversation.requestTypes.${response.intentType}`) || response.intentType}
                      </span>
                      {response.error ? (
                        <div id={`conv-panel-ai-response-error-wrap-${turn.id}-${idx}`} className="flex items-center gap-2 flex-wrap">
                          <p id={`conv-panel-ai-response-error-${turn.id}-${idx}`} className="text-xs text-destructive">{response.error}</p>
                          <button
                            id={`conv-panel-ai-response-retry-btn-${turn.id}-${idx}`}
                            onClick={() => onRetryResponse(
                              turn.id, idx,
                              response.intentType,
                              response.entityType,
                              turn.userMessage,
                              turn.detectedLanguage ?? '',
                            )}
                            disabled={isStreaming || !activeConvId}
                            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </button>
                        </div>
                      ) : response.responseText ? (
                        <p id={`conv-panel-ai-response-text-${turn.id}-${idx}`} className="text-xs leading-relaxed whitespace-pre-wrap">
                          {response.responseText}
                          {!response.done && (
                            <Loader2 id={`conv-panel-ai-response-cursor-${turn.id}-${idx}`} className="inline h-3 w-3 animate-spin ml-1 align-middle text-muted-foreground" />
                          )}
                        </p>
                      ) : !response.done ? (
                        <Loader2 id={`conv-panel-ai-response-spinner-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : null}

                      {!response.error && response.responseText && (
                        <div id={`conv-panel-response-actions-${turn.id}-${idx}`} className="flex flex-wrap gap-1 mt-1">
                          {response.intentType === 'item_generation' && (
                            <button
                              id={`conv-panel-turn-create-items-btn-${turn.id}-${idx}`}
                              onClick={onSaveToGame}
                              disabled={isCreatingRecords || !response.done}
                              className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                            >
                              <PackagePlus className="h-3 w-3" />
                              {t('llmConversation.saveToGame')}
                            </button>
                          )}
                          {response.intentType === 'lore_building' && (
                            <span id={`conv-panel-turn-lore-wrap-${turn.id}-${idx}`} className="inline-flex items-center gap-1.5">
                              <button
                                id={`conv-panel-turn-create-lore-btn-${turn.id}-${idx}`}
                                onClick={() => onOpenLoreReview(turn, idx, response.responseText, response.entityType)}
                                disabled={!response.done || !!savedLoreIds[`${turn.id}:${idx}`]}
                                className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                              >
                                <BookOpen className="h-3 w-3" />
                                {t('llmConversation.saveAsLore')}
                              </button>
                              {savedLoreIds[`${turn.id}:${idx}`] && (
                                <button
                                  id={`conv-panel-turn-lore-link-${turn.id}-${idx}`}
                                  type="button"
                                  onClick={() => router.push(`/games/${gameId}/lore?lore_id=${savedLoreIds[`${turn.id}:${idx}`]}`)}
                                  className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <BookOpen className="h-2.5 w-2.5" />
                                  {loreDetails[savedLoreIds[`${turn.id}:${idx}`]]?.Title ?? t('llmConversation.contentType.lore_entry')}
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : turn.responseText ? (
                <p id={`conv-panel-ai-text-${turn.id}`} className="text-xs leading-relaxed whitespace-pre-wrap">
                  {turn.responseText}
                  {!turn.done && (
                    <Loader2 id={`conv-panel-ai-cursor-${turn.id}`} className="inline h-3 w-3 animate-spin ml-1 align-middle text-muted-foreground" />
                  )}
                </p>
              ) : !turn.done ? (
                <Loader2 id={`conv-panel-ai-spinner-${turn.id}`} className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : null}

              {/* Legacy action buttons for turns loaded from localStorage without responses[] */}
              {!turn.error && !(turn.responses?.length) && (turn.detectedIntents?.length || turn.detectedType) && turn.responseText && (
                <div id={`conv-panel-turn-actions-${turn.id}`} className="flex flex-wrap gap-1 mt-2">
                  {(turn.detectedIntents ?? (turn.detectedType ? [{ type: turn.detectedType, entityType: turn.detectedEntityType ?? '', goal: '' }] : [])).map((intent) => (
                    <span key={intent.type}>
                      {intent.type === 'item_generation' && (
                        <button
                          id={`conv-panel-turn-create-items-btn-${turn.id}`}
                          onClick={onSaveToGame}
                          disabled={isCreatingRecords || !turn.done}
                          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                        >
                          <PackagePlus className="h-3 w-3" />
                          {t('llmConversation.saveToGame')}
                        </button>
                      )}
                      {intent.type === 'lore_building' && (
                        <span id={`conv-panel-turn-lore-wrap-${turn.id}-legacy`} className="inline-flex items-center gap-1.5">
                          <button
                            id={`conv-panel-turn-create-lore-btn-${turn.id}`}
                            onClick={() => onOpenLoreReview(turn, -1, turn.responseText, intent.entityType)}
                            disabled={!turn.done || !!savedLoreIds[`${turn.id}:-1`]}
                            className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
                          >
                            <BookOpen className="h-3 w-3" />
                            {t('llmConversation.saveAsLore')}
                          </button>
                          {savedLoreIds[`${turn.id}:-1`] && (
                            <button
                              id={`conv-panel-turn-lore-link-${turn.id}-legacy`}
                              type="button"
                              onClick={() => router.push(`/games/${gameId}/lore?lore_id=${savedLoreIds[`${turn.id}:-1`]}`)}
                              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <BookOpen className="h-2.5 w-2.5" />
                              {loreDetails[savedLoreIds[`${turn.id}:-1`]]?.Title ?? t('llmConversation.contentType.lore_entry')}
                            </button>
                          )}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </ScrollArea>
  )
}
