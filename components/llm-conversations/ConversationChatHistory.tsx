'use client'

import { useEffect, useRef } from 'react'
import { Bot, BookOpen, Boxes, Check, Gamepad2, Loader2, Package, RotateCcw, Sparkles, Tag, Trash2, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { ChatTurn } from '@/hooks/use-chat-pipeline'
import { splitItemResponseSegments, lsScrollPos } from './conversation-panel-utils'
import { safeGetItem, safeSetItem } from '@/lib/storage-utils'

interface ConversationChatHistoryProps {
  chatHistory: ChatTurn[]
  isStreaming: boolean
  gameId: string
  activeConvId: string | null
  savedLoreIds: Record<string, string>
  loreEntryTitles: Record<string, string>
  savedItemDefinitionIds: Record<string, string>
  onRetry: (turn: { id: string; userMessage: string; detectedType: string | null }) => void
  onRetryResponse: (turnId: string, responseIdx: number, intentType: string, userMessage: string) => void
  onOpenLoreReview: (turn: ChatTurn, idx: number, responseText: string, entityType: string) => void
  onSaveItemDefinition: (item: Record<string, unknown>, turnId: string, responseIdx: number, itemIdx: number) => void
  onApplyTagSuggestion?: (tag: string, turnId: string, responseIdx: number) => void
  onRemoveGameTag?: (tag: string, turnId: string, responseIdx: number) => void
  onCreateItemTagFromSuggestion?: (tag: string, turnId: string, responseIdx: number) => void
  onDeleteItemTagFromSuggestion?: (tag: string, turnId: string, responseIdx: number) => void
  appliedTagsPerResponse?: Record<string, Record<string, true>>
  createdItemTagsPerResponse?: Record<string, Record<string, string>>
  t: (key: string) => string
}

// ---------------------------------------------------------------------------
// Tag suggestion result sub-component
// ---------------------------------------------------------------------------
interface TagSuggestionResultProps {
  responseText: string
  turnId: string
  responseIdx: number
  isDone: boolean
  isStreaming: boolean
  gameId: string
  appliedTags: Record<string, true> | undefined
  createdItemTags: Record<string, string> | undefined
  onApplyGameTag: (tag: string, turnId: string, responseIdx: number) => void
  onRemoveGameTag: (tag: string, turnId: string, responseIdx: number) => void
  onCreateItemTag: (tag: string, turnId: string, responseIdx: number) => void
  onDeleteItemTag: (tag: string, turnId: string, responseIdx: number) => void
  t: (key: string) => string
}

function TagSuggestionResult({
  responseText,
  turnId,
  responseIdx,
  isDone,
  isStreaming,
  gameId,
  appliedTags,
  createdItemTags,
  onApplyGameTag,
  onRemoveGameTag,
  onCreateItemTag,
  onDeleteItemTag,
  t,
}: TagSuggestionResultProps) {
  if (!isDone) {
    return (
      <Loader2
        id={`conv-panel-tag-suggestion-loader-${turnId}-${responseIdx}`}
        className="h-3 w-3 animate-spin text-muted-foreground"
      />
    )
  }

  let parsedTags: string[] = []
  let reasoning = ''
  try {
    const raw = JSON.parse(responseText) as Record<string, unknown>
    if (Array.isArray(raw?.tags)) parsedTags = raw.tags as string[]
    if (typeof raw?.reasoning === 'string') reasoning = raw.reasoning
  } catch { /* invalid JSON */ }

  if (parsedTags.length === 0) {
    return (
      <p
        id={`conv-panel-tag-suggestion-empty-${turnId}-${responseIdx}`}
        className="text-xs text-muted-foreground italic"
      >
        {t('llmConversation.tagSuggestionEmpty')}
      </p>
    )
  }

  return (
    <div id={`conv-panel-tag-suggestion-result-${turnId}-${responseIdx}`} className="flex flex-col gap-3">
      <div id={`conv-panel-tag-suggestion-tags-${turnId}-${responseIdx}`} className="flex flex-wrap gap-2">
        {parsedTags.map((tag) => {
          const isGameApplied = !!appliedTags?.[tag]
          const isItemCreated = !!createdItemTags?.[tag]
          return (
            <div
              key={tag}
              id={`conv-panel-tag-chip-${turnId}-${responseIdx}-${tag}`}
              className="inline-flex items-center rounded-full border bg-muted/30 text-[11px] overflow-hidden"
            >
              {/* Tag label */}
              <span
                id={`conv-panel-tag-chip-label-${turnId}-${responseIdx}-${tag}`}
                className="flex items-center gap-1 px-2.5 py-0.5 text-muted-foreground border-r"
              >
                <Tag className="h-2.5 w-2.5 shrink-0" />
                {tag}
              </span>
              {/* Apply / Remove game tag (toggle) */}
              <button
                id={`conv-panel-tag-chip-game-btn-${turnId}-${responseIdx}-${tag}`}
                type="button"
                onClick={() => isGameApplied
                  ? onRemoveGameTag(tag, turnId, responseIdx)
                  : onApplyGameTag(tag, turnId, responseIdx)
                }
                disabled={isStreaming}
                title={isGameApplied ? t('llmConversation.tagSuggestionRemoveFromGame') : t('llmConversation.tagSuggestionApply')}
                className={[
                  'group flex items-center gap-0.5 px-1.5 py-0.5 border-r transition-colors cursor-pointer',
                  isGameApplied
                    ? 'text-green-600 hover:text-red-500 hover:bg-red-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  isStreaming ? 'opacity-40 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                {isGameApplied ? (
                  <>
                    <Check  id={`conv-panel-tag-chip-game-check-${turnId}-${responseIdx}-${tag}`}  className="h-2.5 w-2.5 group-hover:hidden" />
                    <Trash2 id={`conv-panel-tag-chip-game-trash-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5 hidden group-hover:block" />
                  </>
                ) : (
                  <Tag id={`conv-panel-tag-chip-game-icon-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5" />
                )}
              </button>
              {/* Create / Delete item definition tag (toggle) */}
              <button
                id={`conv-panel-tag-chip-item-btn-${turnId}-${responseIdx}-${tag}`}
                type="button"
                onClick={() => isItemCreated
                  ? onDeleteItemTag(tag, turnId, responseIdx)
                  : onCreateItemTag(tag, turnId, responseIdx)
                }
                disabled={isStreaming}
                title={isItemCreated ? t('llmConversation.tagSuggestionDeleteItemTag') : t('llmConversation.tagSuggestionCreateItemTag')}
                className={[
                  'group flex items-center gap-0.5 px-1.5 py-0.5 transition-colors cursor-pointer',
                  isItemCreated
                    ? 'text-green-600 hover:text-red-500 hover:bg-red-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  isStreaming ? 'opacity-40 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                {isItemCreated ? (
                  <>
                    <Check  id={`conv-panel-tag-chip-item-check-${turnId}-${responseIdx}-${tag}`}  className="h-2.5 w-2.5 group-hover:hidden" />
                    <Trash2 id={`conv-panel-tag-chip-item-trash-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5 hidden group-hover:block" />
                  </>
                ) : (
                  <Boxes id={`conv-panel-tag-chip-item-icon-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {reasoning && (
        <div id={`conv-panel-tag-suggestion-reasoning-${turnId}-${responseIdx}`} className="flex flex-col gap-0.5">
          <span
            id={`conv-panel-tag-suggestion-reasoning-label-${turnId}-${responseIdx}`}
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide"
          >
            {t('llmConversation.tagSuggestionReasoning')}
          </span>
          <p
            id={`conv-panel-tag-suggestion-reasoning-text-${turnId}-${responseIdx}`}
            className="text-xs text-muted-foreground italic"
          >
            {reasoning}
          </p>
        </div>
      )}

      {/* Quick navigation links */}
      <div id={`conv-panel-tag-suggestion-links-${turnId}-${responseIdx}`} className="flex items-center gap-3">
        <Link
          id={`conv-panel-tag-suggestion-link-game-${turnId}-${responseIdx}`}
          href={`/games/${gameId}`}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Gamepad2 className="h-3 w-3" />
          {t('llmConversation.tagSuggestionViewGameDetail')}
        </Link>
        <Link
          id={`conv-panel-tag-suggestion-link-item-tags-${turnId}-${responseIdx}`}
          href={`/games/${gameId}/items?tab=tags`}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Tag className="h-3 w-3" />
          {t('llmConversation.tagSuggestionViewItemTags')}
        </Link>
      </div>
    </div>
  )
}

const MARKDOWN_COMPONENTS = {
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <div id="conv-panel-md-pre-scroll-wrap" className="overflow-x-auto w-full my-2 rounded">
      <pre {...props} style={{ overflowWrap: 'normal', wordBreak: 'normal', whiteSpace: 'pre', minWidth: 0 }} className="m-0">
        {children}
      </pre>
    </div>
  ),
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props} style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
      {children}
    </a>
  ),
}

export function ConversationChatHistory({
  chatHistory,
  isStreaming,
  gameId,
  activeConvId,
  savedLoreIds,
  loreEntryTitles,
  savedItemDefinitionIds,
  onRetry,
  onRetryResponse,
  onOpenLoreReview,
  onSaveItemDefinition,
  onApplyTagSuggestion,
  onRemoveGameTag,
  onCreateItemTagFromSuggestion,
  onDeleteItemTagFromSuggestion,
  appliedTagsPerResponse,
  createdItemTagsPerResponse,
  t,
}: ConversationChatHistoryProps) {
  const { resolvedTheme } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore scroll position when switching to a different conversation
  useEffect(() => {
    if (!activeConvId) return
    const saved = safeGetItem(lsScrollPos(activeConvId))
    if (!saved) return
    const pos = parseInt(saved, 10)
    if (!Number.isFinite(pos)) return
    // Wait one animation frame so the list has rendered before scrolling
    const raf = requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId])

  function handleScroll() {
    if (isStreaming) return
    if (!activeConvId || !scrollRef.current) return
    const pos = scrollRef.current.scrollTop
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      safeSetItem(lsScrollPos(activeConvId), String(pos))
    }, 300)
  }

  return (
    <div
      id="conv-panel-content-scroll"
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 py-2"
    >
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
            <Bot className="h-4 w-4 shrink-0 text-primary mt-3" />
            <div id={`conv-panel-ai-msg-content-${turn.id}`} className="flex-1 min-w-0">
              {turn.error ? (
                <div id={`conv-panel-ai-error-row-${turn.id}`} className="flex items-center gap-2">
                  <p id={`conv-panel-ai-error-${turn.id}`} className="text-xs text-destructive">{turn.error}</p>
                  <button
                    id={`conv-panel-ai-retry-btn-${turn.id}`}
                    onClick={() => onRetry(turn)}
                    disabled={isStreaming}
                    className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                    title={t('common.retry')}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t('common.retry')}
                  </button>
                </div>
              ) : (turn.responses?.length ?? 0) > 0 ? (
                <div id={`conv-panel-ai-responses-${turn.id}`} className="flex flex-col gap-3">
                  {turn.responses!.map((response, idx) => (
                    <div key={idx} id={`conv-panel-ai-response-${turn.id}-${idx}`} className="flex flex-col gap-1">
                      <div id={`conv-panel-ai-response-type-${turn.id}-${idx}`} className="flex items-center gap-2 my-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background shadow-sm px-2.5 py-1 text-[11px] font-medium text-foreground shrink-0">
                          <Sparkles className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-primary font-semibold">
                            {t(`llmConversation.requestTypes.${response.intentType}`) || response.intentType}
                          </span>
                          {(response.intentType.startsWith('item_') || response.intentType === 'lore_creating') && response.entityType && (
                            <span id={`conv-panel-ai-response-entity-type-${turn.id}-${idx}`} className="rounded-full bg-muted px-2 py-0.5 text-[10px] normal-case font-medium text-muted-foreground">
                              {response.entityType}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                      </div>
                      {response.error ? (
                        <div id={`conv-panel-ai-response-error-wrap-${turn.id}-${idx}`} className="flex items-center gap-2 flex-wrap">
                          <p id={`conv-panel-ai-response-error-${turn.id}-${idx}`} className="text-xs text-destructive">{response.error}</p>
                          <button
                            id={`conv-panel-ai-response-retry-btn-${turn.id}-${idx}`}
                            onClick={() => onRetryResponse(
                              turn.id, idx,
                              response.intentType,
                              turn.userMessage,
                            )}
                            disabled={isStreaming || !activeConvId}
                            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                            title={t('common.retry')}
                          >
                            <RotateCcw className="h-3 w-3" />
                            {t('common.retry')}
                          </button>
                        </div>
                      ) : response.intentType === 'tag_suggestion' ? (
                        <TagSuggestionResult
                          responseText={response.responseText ?? ''}
                          turnId={turn.id}
                          responseIdx={idx}
                          isDone={!!response.done}
                          isStreaming={isStreaming}
                          gameId={gameId}
                          appliedTags={appliedTagsPerResponse?.[`${turn.id}:${idx}`]}
                          createdItemTags={createdItemTagsPerResponse?.[`${turn.id}:${idx}`]}
                          onApplyGameTag={onApplyTagSuggestion ?? (() => {})}
                          onRemoveGameTag={onRemoveGameTag ?? (() => {})}
                          onCreateItemTag={onCreateItemTagFromSuggestion ?? (() => {})}
                          onDeleteItemTag={onDeleteItemTagFromSuggestion ?? (() => {})}
                          t={t}
                        />
                      ) : response.responseText ? (
                        (response.intentType === 'item_generation' || response.intentType === 'item_modify') ? (
                          <div id={`conv-panel-ai-response-text-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitItemResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div key={segIdx} id={`conv-panel-segment-item-${turn.id}-${idx}-${seg.itemIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-segment-item-json-${turn.id}-${idx}-${seg.itemIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const itemKey = `${turn.id}:${idx}:${seg.itemIdx}`
                                    const savedItemId = savedItemDefinitionIds[itemKey]
                                    const itemName = typeof seg.item.name === 'string' ? seg.item.name : `Item ${seg.itemIdx + 1}`
                                    return savedItemId ? (
                                      <Link
                                        id={`conv-panel-item-link-${turn.id}-${idx}-${seg.itemIdx}`}
                                        href={`/games/${gameId}/items/${savedItemId}`}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-primary hover:bg-accent transition-colors max-w-[240px]"
                                        title={itemName}
                                      >
                                        <Package className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-item-link-label-${turn.id}-${idx}-${seg.itemIdx}`} className="truncate">{itemName}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-item-btn-${turn.id}-${idx}-${seg.itemIdx}`}
                                        onClick={() => onSaveItemDefinition(seg.item, turn.id, idx, seg.itemIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <Package className="h-3 w-3" />
                                        <span id={`conv-panel-save-item-btn-label-${turn.id}-${idx}-${seg.itemIdx}`}>{t('llmConversation.saveAsItemDefinition')}: {itemName}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              )
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : (
                          <>
                            <div
                              id={`conv-panel-ai-response-text-${turn.id}-${idx}`}
                              className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                {response.responseText}
                              </ReactMarkdown>
                              {!response.done && (
                                <Loader2 id={`conv-panel-ai-response-cursor-${turn.id}-${idx}`} className="inline h-3 w-3 animate-spin ml-1 align-middle text-muted-foreground" />
                              )}
                            </div>
                          </>
                        )
                      ) : !response.done ? (
                        <Loader2 id={`conv-panel-ai-response-spinner-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : null}

                      {!response.error && response.responseText && response.intentType === 'lore_creating' && response.done && (
                        <div id={`conv-panel-response-actions-${turn.id}-${idx}`} className="flex flex-wrap gap-1 mt-1">
                          {(() => {
                            const linkKey = `${turn.id}:${idx}`
                            const savedLoreId = savedLoreIds[linkKey]
                            return savedLoreId ? (
                              <Link
                                id={`conv-panel-lore-link-${turn.id}-${idx}`}
                                href={`/games/${gameId}/lore?lore_id=${savedLoreId}`}
                                className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-primary hover:bg-accent transition-colors max-w-[240px]"
                                title={loreEntryTitles[savedLoreId] ?? t('llmConversation.viewLore')}
                              >
                                <BookOpen className="h-3 w-3 shrink-0" />
                                <span className="truncate">{loreEntryTitles[savedLoreId] ?? t('llmConversation.viewLore')}</span>
                              </Link>
                            ) : (
                              <button
                                id={`conv-panel-save-lore-btn-${turn.id}-${idx}`}
                                onClick={() => onOpenLoreReview(turn, idx, response.responseText, response.entityType)}
                                className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                <BookOpen className="h-3 w-3" />
                                {t('llmConversation.saveAsLore')}
                              </button>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : !turn.done ? (
                <Loader2 id={`conv-panel-ai-spinner-${turn.id}`} className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
