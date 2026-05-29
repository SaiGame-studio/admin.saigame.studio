'use client'

import { Bot, BookOpen, Loader2, Package, RotateCcw, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { ChatTurn } from '@/hooks/use-chat-pipeline'
import { splitItemResponseSegments } from './conversation-panel-utils'

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
  t: (key: string) => string
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
  t,
}: ConversationChatHistoryProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div id="conv-panel-content-scroll" className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 py-2">
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
                      <span id={`conv-panel-ai-response-type-${turn.id}-${idx}`} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        {t(`llmConversation.requestTypes.${response.intentType}`) || response.intentType}
                        {(response.intentType.startsWith('item_') || response.intentType === 'lore_creating') && response.entityType && (
                          <span id={`conv-panel-ai-response-entity-type-${turn.id}-${idx}`} className="rounded bg-muted/60 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-muted-foreground border">
                            {response.entityType}
                          </span>
                        )}
                      </span>
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
