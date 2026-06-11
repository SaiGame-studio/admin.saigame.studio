'use client'

import { useEffect, useRef } from 'react'
import { Bot, BookOpen, Check, Dices, Gamepad2, Hammer, Layers, LayoutTemplate, Loader2, Package, RotateCcw, Archive, ScrollText, Sparkles, Tag, Trash2, X, Plus, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { ChatTurn } from '@/hooks/use-chat-pipeline'
import { splitItemResponseSegments, splitEntityDefinitionResponseSegments, splitPresetResponseSegments, splitContainerResponseSegments, splitGachaPackResponseSegments, splitEquipmentSlotResponseSegments, splitCraftingRecipeResponseSegments, splitEntityPoolResponseSegments, splitQuestDefinitionResponseSegments, lsScrollPos } from './conversation-panel-utils'
import { safeGetItem, safeSetItem } from '@/lib/storage-utils'

interface ConversationChatHistoryProps {
  chatHistory: ChatTurn[]
  isStreaming: boolean
  gameId: string
  activeConvId: string | null
  savedLoreIds: Record<string, string>
  loreEntryTitles: Record<string, string>
  savedItemDefinitionIds: Record<string, string>
  savedEntityDefinitionIds: Record<string, string>
  savedPresetDefinitionIds: Record<string, string>
  savedContainerDefinitionIds: Record<string, string>
  savedGachaPackIds: Record<string, string>
  savedEquipmentSlotIds: Record<string, string>
  savedCraftingRecipeIds: Record<string, string>
  savedEntityPoolIds: Record<string, string>
  savedQuestDefinitionIds: Record<string, string>
  craftingRecipeNames: Record<string, string>
  entityPoolNames: Record<string, string>
  questDefinitionNames: Record<string, string>
  premiumTokensRemaining: number | null
  onRetry: (turn: { id: string; userMessage: string; detectedType: string | null }) => void
  onRetryResponse: (turnId: string, responseIdx: number, intentType: string, userMessage: string, planningAction?: Record<string, unknown>) => void
  onOpenLoreReview: (turn: ChatTurn, idx: number, responseText: string, entityType: string) => void
  onSaveItemDefinition: (item: Record<string, unknown>, turnId: string, responseIdx: number, itemIdx: number) => void
  onSaveEntityDefinition: (entityDefinition: Record<string, unknown>, turnId: string, responseIdx: number, entityDefinitionIdx: number) => void
  onSavePresetDefinition: (preset: Record<string, unknown>, turnId: string, responseIdx: number, presetIdx: number) => void
  onSaveContainerDefinition: (container: Record<string, unknown>, turnId: string, responseIdx: number, containerIdx: number) => void
  onSaveGachaPack: (pack: Record<string, unknown>, turnId: string, responseIdx: number, gachaPackIdx: number) => void
  onSaveEquipmentSlot: (slot: Record<string, unknown>, turnId: string, responseIdx: number, equipmentSlotIdx: number) => void
  onSaveCraftingRecipe: (recipe: Record<string, unknown>, turnId: string, responseIdx: number, craftingRecipeIdx: number) => void
  onSaveEntityPool: (entityPool: Record<string, unknown>, turnId: string, responseIdx: number, entityPoolIdx: number) => void
  onSaveQuestDefinition: (questDefinition: Record<string, unknown>, turnId: string, responseIdx: number, questDefinitionIdx: number) => void
  onBuyTokens: () => void
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
                    ? 'text-sky-600 hover:text-red-500 hover:bg-sky-500/10'
                    : 'text-sky-600 hover:text-sky-700 hover:bg-sky-500/10',
                  isStreaming ? 'opacity-40 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                {isGameApplied ? (
                  <>
                    <Check  id={`conv-panel-tag-chip-game-check-${turnId}-${responseIdx}-${tag}`}  className="h-2.5 w-2.5 group-hover:hidden" />
                    <Trash2 id={`conv-panel-tag-chip-game-trash-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5 hidden group-hover:block" />
                  </>
                ) : (
                  <Gamepad2 id={`conv-panel-tag-chip-game-icon-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5" />
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
                    ? 'text-amber-600 hover:text-red-500 hover:bg-amber-500/10'
                    : 'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10',
                  isStreaming ? 'opacity-40 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                {isItemCreated ? (
                  <>
                    <Check  id={`conv-panel-tag-chip-item-check-${turnId}-${responseIdx}-${tag}`}  className="h-2.5 w-2.5 group-hover:hidden" />
                    <Trash2 id={`conv-panel-tag-chip-item-trash-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5 hidden group-hover:block" />
                  </>
                ) : (
                  <Tag id={`conv-panel-tag-chip-item-icon-${turnId}-${responseIdx}-${tag}`} className="h-2.5 w-2.5" />
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
          className="flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-700 transition-colors hover:bg-sky-500/20 hover:text-sky-800"
        >
          <Gamepad2 className="h-3 w-3 text-sky-600" />
          {t('llmConversation.tagSuggestionViewGameDetail')}
        </Link>
        <Link
          id={`conv-panel-tag-suggestion-link-item-tags-${turnId}-${responseIdx}`}
          href={`/games/${gameId}/items?tab=tags`}
          className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 transition-colors hover:bg-amber-500/20 hover:text-amber-800"
        >
          <Tag className="h-3 w-3 text-amber-600" />
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
  savedEntityDefinitionIds,
  savedPresetDefinitionIds,
  savedContainerDefinitionIds,
  savedGachaPackIds,
  savedEquipmentSlotIds,
  savedCraftingRecipeIds,
  savedEntityPoolIds,
  savedQuestDefinitionIds,
  craftingRecipeNames,
  entityPoolNames,
  questDefinitionNames,
  premiumTokensRemaining,
  onRetry,
  onRetryResponse,
  onOpenLoreReview,
  onSaveItemDefinition,
  onSaveEntityDefinition,
  onSavePresetDefinition,
  onSaveContainerDefinition,
  onSaveGachaPack,
  onSaveEquipmentSlot,
  onSaveCraftingRecipe,
  onSaveEntityPool,
  onSaveQuestDefinition,
  onBuyTokens,
  onApplyTagSuggestion,
  onRemoveGameTag,
  onCreateItemTagFromSuggestion,
  onDeleteItemTagFromSuggestion,
  appliedTagsPerResponse,
  createdItemTagsPerResponse,
  t,
}: ConversationChatHistoryProps) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function isTokenQuotaError(message: string): boolean {
    return /lm token quota exceeded|token quota exceeded|quota exceeded|payment required|http 402|402\b/i.test(message)
  }

  function isRetryDisabledForTokenQuotaError(): boolean {
    return typeof premiumTokensRemaining === 'number' && premiumTokensRemaining <= 0
  }

  function openItemDetail(itemId: string) {
    const payload = { itemId, nonce: Date.now() }
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('ss:item-detail-reload', JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('ss:item-detail-reload', { detail: payload }))
    }
    router.push(`/games/${gameId}/items/${itemId}`)
  }

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

  function renderEntityDefinitionResponse(
    turn: ChatTurn,
    response: NonNullable<ChatTurn['responses']>[number],
    idx: number,
  ) {
    const segments = splitEntityDefinitionResponseSegments(response.responseText)

    return (
      <div id={`conv-panel-ai-response-entity-defs-${turn.id}-${idx}`} className="flex flex-col gap-1">
        {segments.map((seg, segIdx) => {
          if (seg.type === 'text') {
            return (
              <div key={segIdx} id={`conv-panel-entity-def-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                  {seg.text}
                </ReactMarkdown>
              </div>
            )
          }

          if (seg.type === 'entityDefinition') {
            const entityKey = `${turn.id}:${idx}:${seg.entityDefinitionIdx}`
            const savedEntityId = savedEntityDefinitionIds[entityKey]
            const entityName = typeof seg.entityDefinition.name === 'string' ? seg.entityDefinition.name : `Entity ${seg.entityDefinitionIdx + 1}`
            const entityType = typeof seg.entityDefinition.entity_type === 'string' ? seg.entityDefinition.entity_type : ''

            return (
              <div key={segIdx} id={`conv-panel-entity-def-segment-${turn.id}-${idx}-${seg.entityDefinitionIdx}`} className="flex flex-col gap-1">
                <div id={`conv-panel-entity-def-segment-json-${turn.id}-${idx}-${seg.entityDefinitionIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                    {seg.text}
                  </ReactMarkdown>
                </div>
                {savedEntityId ? (
                  <Link
                    id={`conv-panel-entity-link-${turn.id}-${idx}-${seg.entityDefinitionIdx}`}
                    href={`/games/${gameId}/entities?expanded=${savedEntityId}`}
                    className="self-start inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                    title={entityName}
                  >
                    <Shield className="h-3 w-3 shrink-0" />
                    <span id={`conv-panel-entity-link-label-${turn.id}-${idx}-${seg.entityDefinitionIdx}`} className="truncate">{t('llmConversation.viewEntityDefinition')}: {entityName}</span>
                  </Link>
                ) : (
                  <button
                    id={`conv-panel-save-entity-btn-${turn.id}-${idx}-${seg.entityDefinitionIdx}`}
                    onClick={() => onSaveEntityDefinition(seg.entityDefinition, turn.id, idx, seg.entityDefinitionIdx)}
                    className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                  >
                    <Shield className="h-3 w-3" />
                    <span id={`conv-panel-save-entity-btn-label-${turn.id}-${idx}-${seg.entityDefinitionIdx}`}>{t('llmConversation.saveAsEntityDefinition')}: {entityName}{entityType ? ` (${entityType})` : ''}</span>
                  </button>
                )}
              </div>
            )
          }

          return null
        })}
        {!response.done && (
          <Loader2 id={`conv-panel-ai-response-cursor-entity-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    )
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
                  {isTokenQuotaError(turn.error) ? (
                    <>
                      <button
                        id={`conv-panel-ai-retry-btn-${turn.id}`}
                        onClick={() => onRetry(turn)}
                        disabled={isStreaming || isRetryDisabledForTokenQuotaError()}
                        className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                        title={t('common.retry')}
                      >
                        <RotateCcw className="h-3 w-3" />
                        {t('common.retry')}
                      </button>
                      <button
                        id={`conv-panel-ai-buy-token-btn-${turn.id}`}
                        onClick={onBuyTokens}
                        className="shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        title={t('llmConversation.buyTokens')}
                      >
                        <Plus className="h-3 w-3" />
                        {t('llmConversation.buyTokens')}
                      </button>
                    </>
                  ) : (
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
                  )}
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
                          {(response.intentType.startsWith('item_') || response.intentType === 'lore_creating' || response.intentType === 'preset_generation' || response.intentType === 'entity_definition_generation') && response.entityType && (
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
                          {isTokenQuotaError(response.error) ? (
                            <>
                              <button
                                id={`conv-panel-ai-response-retry-btn-${turn.id}-${idx}`}
                                onClick={() => onRetryResponse(
                                  turn.id, idx,
                                  response.intentType,
                                  turn.userMessage,
                                  response.planningAction,
                                )}
                                disabled={isStreaming || !activeConvId || isRetryDisabledForTokenQuotaError()}
                                className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                                title={t('common.retry')}
                              >
                                <RotateCcw className="h-3 w-3" />
                                {t('common.retry')}
                              </button>
                              <button
                                id={`conv-panel-ai-response-buy-token-btn-${turn.id}-${idx}`}
                                onClick={onBuyTokens}
                                className="shrink-0 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                title={t('llmConversation.buyTokens')}
                              >
                                <Plus className="h-3 w-3" />
                                {t('llmConversation.buyTokens')}
                              </button>
                            </>
                          ) : (
                            <button
                              id={`conv-panel-ai-response-retry-btn-${turn.id}-${idx}`}
                              onClick={() => onRetryResponse(
                                turn.id, idx,
                                response.intentType,
                                turn.userMessage,
                                response.planningAction,
                              )}
                              disabled={isStreaming || !activeConvId}
                              className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                              title={t('common.retry')}
                            >
                              <RotateCcw className="h-3 w-3" />
                              {t('common.retry')}
                            </button>
                          )}
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
                        (response.intentType === 'item_generation' || response.intentType === 'item_modify' || response.intentType === 'generator_item_creating') ? (
                          <div id={`conv-panel-ai-response-text-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitItemResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'item' ? (
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
                                      <button
                                        id={`conv-panel-item-link-${turn.id}-${idx}-${seg.itemIdx}`}
                                        type="button"
                                        onClick={() => openItemDetail(savedItemId)}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={itemName}
                                      >
                                        <Package className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-item-link-label-${turn.id}-${idx}-${seg.itemIdx}`} className="truncate">{itemName}</span>
                                      </button>
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
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'entity_definition_generation' ? (
                          renderEntityDefinitionResponse(turn, response, idx)
                        ) : response.intentType === 'preset_generation' ? (
                          <div id={`conv-panel-ai-response-presets-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitPresetResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-preset-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'preset' ? (
                                <div key={segIdx} id={`conv-panel-preset-segment-${turn.id}-${idx}-${seg.presetIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-preset-segment-json-${turn.id}-${idx}-${seg.presetIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const presetKey = `${turn.id}:${idx}:${seg.presetIdx}`
                                    const savedPresetId = savedPresetDefinitionIds[presetKey]
                                    const presetName = typeof seg.preset.name === 'string' ? seg.preset.name : (typeof seg.preset.code_name === 'string' ? seg.preset.code_name : `Preset ${seg.presetIdx + 1}`)
                                    return savedPresetId ? (
                                      <Link
                                        id={`conv-panel-preset-link-${turn.id}-${idx}-${seg.presetIdx}`}
                                        href={`/games/${gameId}/items?tab=preset&q=${savedPresetId}`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={presetName}
                                      >
                                        <LayoutTemplate className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-preset-link-label-${turn.id}-${idx}-${seg.presetIdx}`} className="truncate">{presetName}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-preset-btn-${turn.id}-${idx}-${seg.presetIdx}`}
                                        onClick={() => onSavePresetDefinition(seg.preset, turn.id, idx, seg.presetIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <LayoutTemplate className="h-3 w-3" />
                                        <span id={`conv-panel-save-preset-btn-label-${turn.id}-${idx}-${seg.presetIdx}`}>{t('llmConversation.saveAsPresetDefinition')}: {presetName}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'container_creating' ? (
                          <div id={`conv-panel-ai-response-containers-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitContainerResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-container-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'container' ? (
                                <div key={segIdx} id={`conv-panel-container-segment-${turn.id}-${idx}-${seg.containerIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-container-segment-json-${turn.id}-${idx}-${seg.containerIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const containerKey = `${turn.id}:${idx}:${seg.containerIdx}`
                                    const savedContainerId = savedContainerDefinitionIds[containerKey]
                                    const containerName = typeof seg.container.name === 'string' ? seg.container.name : `Container ${seg.containerIdx + 1}`
                                    const containerCodeName = typeof seg.container.code_name === 'string' ? seg.container.code_name : ''
                                    const containerLabel = containerCodeName ? `${containerName} (${containerCodeName})` : containerName
                                    const gridCols = typeof seg.container.grid_cols === 'number' ? seg.container.grid_cols : ''
                                    const gridRows = typeof seg.container.grid_rows === 'number' ? seg.container.grid_rows : ''
                                    const sizeLabel = gridCols && gridRows ? ` (${gridCols}×${gridRows})` : ''
                                    return savedContainerId ? (
                                      <Link
                                        id={`conv-panel-container-link-${turn.id}-${idx}-${seg.containerIdx}`}
                                        href={`/games/${gameId}/items?tab=containers&q=${savedContainerId}`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={containerLabel}
                                      >
                                        <Archive className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-container-link-label-${turn.id}-${idx}-${seg.containerIdx}`} className="truncate">{t('llmConversation.viewContainerDefinition')}: {containerLabel}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-container-btn-${turn.id}-${idx}-${seg.containerIdx}`}
                                        onClick={() => onSaveContainerDefinition(seg.container, turn.id, idx, seg.containerIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <Archive className="h-3 w-3" />
                                        <span id={`conv-panel-save-container-btn-label-${turn.id}-${idx}-${seg.containerIdx}`}>{t('llmConversation.saveAsContainerDefinition')}: {containerLabel}{sizeLabel}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'gacha_pack_creating' ? (
                          <div id={`conv-panel-ai-response-gacha-packs-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitGachaPackResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-gacha-pack-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'gachaPack' ? (
                                <div key={segIdx} id={`conv-panel-gacha-pack-segment-${turn.id}-${idx}-${seg.gachaPackIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-gacha-pack-segment-json-${turn.id}-${idx}-${seg.gachaPackIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const packKey = `${turn.id}:${idx}:${seg.gachaPackIdx}`
                                    const savedPackId = savedGachaPackIds[packKey]
                                    const packName = typeof seg.gachaPack.name === 'string' ? seg.gachaPack.name : (typeof seg.gachaPack.code_name === 'string' ? seg.gachaPack.code_name : `Gacha Pack ${seg.gachaPackIdx + 1}`)
                                    return savedPackId ? (
                                      <Link
                                        id={`conv-panel-gacha-pack-link-${turn.id}-${idx}-${seg.gachaPackIdx}`}
                                        href={`/games/${gameId}/items?tab=gacha&q=${savedPackId}`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={packName}
                                      >
                                        <Dices className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-gacha-pack-link-label-${turn.id}-${idx}-${seg.gachaPackIdx}`} className="truncate">{t('llmConversation.viewGachaPack')}: {packName}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-gacha-pack-btn-${turn.id}-${idx}-${seg.gachaPackIdx}`}
                                        onClick={() => onSaveGachaPack(seg.gachaPack, turn.id, idx, seg.gachaPackIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <Dices className="h-3 w-3" />
                                        <span id={`conv-panel-save-gacha-pack-btn-label-${turn.id}-${idx}-${seg.gachaPackIdx}`}>{t('llmConversation.saveAsGachaPack')}: {packName}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-gacha-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'equipment_slot_generation' ? (
                          <div id={`conv-panel-ai-response-equipment-slots-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitEquipmentSlotResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-equipment-slot-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'equipmentSlot' ? (
                                <div key={segIdx} id={`conv-panel-equipment-slot-segment-${turn.id}-${idx}-${seg.equipmentSlotIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-equipment-slot-segment-json-${turn.id}-${idx}-${seg.equipmentSlotIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const slotKey = `${turn.id}:${idx}:${seg.equipmentSlotIdx}`
                                    const savedSlotId = savedEquipmentSlotIds[slotKey]
                                    const displayKey = typeof seg.equipmentSlot.slot_key === 'string' ? seg.equipmentSlot.slot_key : `Slot ${seg.equipmentSlotIdx + 1}`
                                    return savedSlotId ? (
                                      <Link
                                        id={`conv-panel-equipment-slot-link-${turn.id}-${idx}-${seg.equipmentSlotIdx}`}
                                        href={`/games/${gameId}/items?tab=equipments&noconvpanel=1&q=${encodeURIComponent(displayKey)}&subtab=list`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={displayKey}
                                      >
                                        <Layers className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-equipment-slot-link-label-${turn.id}-${idx}-${seg.equipmentSlotIdx}`} className="truncate">{t('llmConversation.viewEquipmentSlot')}: {displayKey}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-equipment-slot-btn-${turn.id}-${idx}-${seg.equipmentSlotIdx}`}
                                        onClick={() => onSaveEquipmentSlot(seg.equipmentSlot, turn.id, idx, seg.equipmentSlotIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <Layers className="h-3 w-3" />
                                        <span id={`conv-panel-save-equipment-slot-btn-label-${turn.id}-${idx}-${seg.equipmentSlotIdx}`}>{t('llmConversation.saveAsEquipmentSlot')}: {displayKey}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-equipment-slot-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'crafting_recipe_creating' ? (
                          <div id={`conv-panel-ai-response-crafting-recipes-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitCraftingRecipeResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-crafting-recipe-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'craftingRecipe' ? (
                                <div key={segIdx} id={`conv-panel-crafting-recipe-segment-${turn.id}-${idx}-${seg.craftingRecipeIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-crafting-recipe-segment-json-${turn.id}-${idx}-${seg.craftingRecipeIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const recipeKey = `${turn.id}:${idx}:${seg.craftingRecipeIdx}`
                                    const savedRecipeId = savedCraftingRecipeIds[recipeKey]
                                    const recipeName = typeof seg.craftingRecipe.name === 'string' ? seg.craftingRecipe.name : (typeof seg.craftingRecipe.recipe_key === 'string' ? seg.craftingRecipe.recipe_key : `Recipe ${seg.craftingRecipeIdx + 1}`)
                                    const linkedName = savedRecipeId ? (craftingRecipeNames[savedRecipeId] ?? recipeName) : recipeName
                                    return savedRecipeId ? (
                                      <Link
                                        id={`conv-panel-crafting-recipe-link-${turn.id}-${idx}-${seg.craftingRecipeIdx}`}
                                        href={`/games/${gameId}/items?tab=crafting&expanded=${savedRecipeId}`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={linkedName}
                                      >
                                        <Hammer className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-crafting-recipe-link-label-${turn.id}-${idx}-${seg.craftingRecipeIdx}`} className="truncate">{t('llmConversation.viewCraftingRecipe')}: {linkedName}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-crafting-recipe-btn-${turn.id}-${idx}-${seg.craftingRecipeIdx}`}
                                        onClick={() => onSaveCraftingRecipe(seg.craftingRecipe, turn.id, idx, seg.craftingRecipeIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Hammer className="h-3 w-3" />
                                        <span id={`conv-panel-save-crafting-recipe-btn-label-${turn.id}-${idx}-${seg.craftingRecipeIdx}`}>{t('llmConversation.saveAsCraftingRecipe')}: {recipeName}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-crafting-recipe-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'entity_pool_creating' ? (
                          <div id={`conv-panel-ai-response-entity-pools-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitEntityPoolResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-entity-pool-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'entityPool' ? (
                                <div key={segIdx} id={`conv-panel-entity-pool-segment-${turn.id}-${idx}-${seg.entityPoolIdx}`} className="flex flex-col gap-1">
                                  <div id={`conv-panel-entity-pool-segment-json-${turn.id}-${idx}-${seg.entityPoolIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                      {seg.text}
                                    </ReactMarkdown>
                                  </div>
                                  {(() => {
                                    const poolKey = `${turn.id}:${idx}:${seg.entityPoolIdx}`
                                    const savedPoolId = savedEntityPoolIds[poolKey]
                                    const metadata = seg.entityPool.metadata && typeof seg.entityPool.metadata === 'object' && !Array.isArray(seg.entityPool.metadata)
                                      ? (seg.entityPool.metadata as Record<string, unknown>)
                                      : undefined
                                    const poolName = typeof seg.entityPool.name === 'string'
                                      ? seg.entityPool.name
                                      : (typeof seg.entityPool.pool_key === 'string' ? seg.entityPool.pool_key : `Entity Pool ${seg.entityPoolIdx + 1}`)
                                    const rawDescription = typeof seg.entityPool.description === 'string'
                                      ? seg.entityPool.description.trim()
                                      : (typeof metadata?.description === 'string'
                                        ? String(metadata.description).trim()
                                        : '')
                                    const poolKeyValue = typeof seg.entityPool.pool_key === 'string' ? seg.entityPool.pool_key.trim() : ''
                                    const entries = Array.isArray(seg.entityPool.entries) ? seg.entityPool.entries : []
                                    const entriesCount = entries.length
                                    const entriesHaveValidWeights = entries.every((entry) => {
                                      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
                                      const weight = (entry as Record<string, unknown>).weight
                                      const numericWeight = typeof weight === 'number' ? weight : Number(weight)
                                      return Number.isFinite(numericWeight) && numericWeight >= 0
                                    })
                                    const isValidPoolKey = /^[a-z][a-z0-9_]{0,63}$/.test(poolKeyValue)
                                    const canSave = Boolean(poolKeyValue && isValidPoolKey && poolName.trim() && rawDescription && entriesCount > 0 && entriesHaveValidWeights)
                                    const linkedName = savedPoolId ? (entityPoolNames[savedPoolId] ?? poolName) : poolName
                                    return savedPoolId ? (
                                      <Link
                                        id={`conv-panel-entity-pool-link-${turn.id}-${idx}-${seg.entityPoolIdx}`}
                                        href={`/games/${gameId}/entities?tab=pools&poolExpanded=${savedPoolId}${poolKeyValue ? `&poolKey=${encodeURIComponent(poolKeyValue)}` : ''}`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={linkedName}
                                      >
                                        <Layers className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-entity-pool-link-label-${turn.id}-${idx}-${seg.entityPoolIdx}`} className="truncate">{t('llmConversation.viewEntityPool')}: {linkedName}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-entity-pool-btn-${turn.id}-${idx}-${seg.entityPoolIdx}`}
                                        onClick={() => onSaveEntityPool(seg.entityPool, turn.id, idx, seg.entityPoolIdx)}
                                        disabled={!canSave}
                                        title={!canSave ? t('llmConversation.errorSaveEntityPool') : undefined}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <Layers className="h-3 w-3" />
                                        <span id={`conv-panel-save-entity-pool-btn-label-${turn.id}-${idx}-${seg.entityPoolIdx}`}>{t('llmConversation.saveAsEntityPool')}: {poolName}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-entity-pool-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : response.intentType === 'quest_definition_generation' ? (
                          <div id={`conv-panel-ai-response-quest-defs-${turn.id}-${idx}`} className="flex flex-col gap-1">
                            {splitQuestDefinitionResponseSegments(response.responseText).map((seg, segIdx) =>
                              seg.type === 'text' ? (
                                <div key={segIdx} id={`conv-panel-quest-def-segment-text-${turn.id}-${idx}-${segIdx}`} className={`prose prose-sm max-w-none text-xs break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs [&_h5]:text-xs [&_h6]:text-xs [&_p]:text-xs [&_p]:break-words [&_li]:text-xs [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                                    {seg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : seg.type === 'questDefinition' ? (
                                <div key={segIdx} id={`conv-panel-quest-def-segment-${turn.id}-${idx}-${seg.questDefinitionIdx}`} className="flex flex-col gap-1">
                                  {(() => {
                                    const quest = seg.questDefinition
                                    const codeName = typeof quest.code_name === 'string' ? quest.code_name.trim() : ''
                                    const questName = typeof quest.name === 'string' ? quest.name.trim() : ''
                                    const description = typeof quest.description === 'string' ? quest.description.trim() : ''
                                    const questType = typeof quest.quest_type === 'string' ? quest.quest_type.trim() : ''
                                    const conditions = quest.conditions && typeof quest.conditions === 'object' && !Array.isArray(quest.conditions)
                                      ? (quest.conditions as Record<string, unknown>)
                                      : null
                                    const rewards = Array.isArray(quest.rewards) ? quest.rewards : []
                                    const renderConditionNode = (node: unknown, depth = 0): React.ReactNode => {
                                      if (!node || typeof node !== 'object' || Array.isArray(node)) return null
                                      const record = node as Record<string, unknown>
                                      const isLeaf = typeof record.type === 'string'
                                      const normalizeRef = (value: string): string => {
                                        const raw = value.trim()
                                        return raw.startsWith('__REF:') ? raw : `__REF:${raw}`
                                      }
                                      const collectItemRefs = (value: unknown): string[] => {
                                        if (!value) return []
                                        if (typeof value === 'string') {
                                          const raw = value.trim()
                                          if (!raw) return []
                                          return [normalizeRef(raw)]
                                        }
                                        if (Array.isArray(value)) {
                                          return value.flatMap((entry) => collectItemRefs(entry))
                                        }
                                        if (typeof value === 'object') {
                                          const itemRecord = value as Record<string, unknown>
                                          const refs: string[] = []
                                          const directId = typeof itemRecord.item_definition_id === 'string' ? itemRecord.item_definition_id.trim() : ''
                                          const directCode = typeof itemRecord.item_code === 'string' ? itemRecord.item_code.trim() : ''
                                          if (directId) refs.push(normalizeRef(directId))
                                          if (!refs.length && directCode) refs.push(normalizeRef(directCode))
                                          return refs
                                        }
                                        return []
                                      }
                                      const collectDeepItemRefs = (value: unknown, keyHint = ''): string[] => {
                                        if (!value) return []
                                        if (typeof value === 'string') {
                                          const raw = value.trim()
                                          if (!raw) return []
                                          if (!/item|ref|code/i.test(keyHint)) return []
                                          return [normalizeRef(raw)]
                                        }
                                        if (Array.isArray(value)) {
                                          return value.flatMap((entry) => collectDeepItemRefs(entry, keyHint))
                                        }
                                        if (typeof value === 'object') {
                                          const recordValue = value as Record<string, unknown>
                                          return Object.entries(recordValue).flatMap(([key, nested]) => {
                                            const nextHint = `${keyHint}.${key}`
                                            if (/item(_definition)?_ids?$/i.test(key) || /item_definition/i.test(key) || key === 'item_code') {
                                              return collectItemRefs(nested)
                                            }
                                            if (key === 'items' || key === 'required_items' || /item/i.test(key)) {
                                              return collectDeepItemRefs(nested, nextHint)
                                            }
                                            return collectDeepItemRefs(nested, nextHint)
                                          })
                                        }
                                      return []
                                      }
                                      const renderRewardNode = (reward: unknown, depth = 0): React.ReactNode => {
                                        if (!reward || typeof reward !== 'object' || Array.isArray(reward)) return null
                                        const record = reward as Record<string, unknown>
                                        const rewardType = typeof record.reward_type === 'string' ? record.reward_type.trim() : ''
                                        const itemRefs = [
                                          ...collectItemRefs(record.item_definition_id),
                                          ...collectItemRefs(record.item_definition_ids),
                                          ...collectItemRefs(record.item_definition),
                                          ...collectItemRefs(record.item_definitions),
                                          ...collectDeepItemRefs(record),
                                        ]
                                        const quantityMin = record.quantity_min != null ? String(record.quantity_min) : ''
                                        const quantityMax = record.quantity_max != null ? String(record.quantity_max) : ''
                                        const quantity = record.quantity != null ? String(record.quantity) : ''
                                        const valueText = quantityMin || quantityMax
                                          ? `${quantityMin || '0'} - ${quantityMax || quantityMin || '0'}`
                                          : (quantity || '—')
                                        const rewardDetails = record.details && typeof record.details === 'object' && !Array.isArray(record.details)
                                          ? (record.details as Record<string, unknown>)
                                          : null

                                        return (
                                          <div className={`px-2 py-1.5 space-y-3 ${depth === 0 ? '' : 'ml-4 pl-3 border-l-2 border-border/40'}`}>
                                            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                reward_type
                                              </div>
                                              <div className="font-mono text-xs break-words text-foreground/90 text-left">
                                                {rewardType || 'item'}
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                Item Definition
                                              </div>
                                              <div className="space-y-1 text-left">
                                                {itemRefs.length > 0 ? (
                                                  itemRefs.map((itemRef, itemRefIdx) => (
                                                    <div key={`quest-reward-item-${depth}-${itemRefIdx}`} className="font-mono text-foreground/90 break-all text-xs">
                                                      {itemRef}
                                                    </div>
                                                  ))
                                                ) : (
                                                  <div className="text-xs text-muted-foreground">—</div>
                                                )}
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                quantity
                                              </div>
                                              <div className="font-mono text-xs break-words text-foreground/90 text-left">
                                                {valueText}
                                              </div>
                                            </div>

                                            {rewardDetails ? (
                                              <div className="space-y-0.5">
                                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                  {t('common.details')}
                                                </div>
                                                <div className="rounded border border-dashed border-border/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-words">
                                                  {JSON.stringify(rewardDetails, null, 2)}
                                                </div>
                                              </div>
                                            ) : null}
                                          </div>
                                        )
                                      }

                                      if (!isLeaf) {
                                        const operator = typeof record.operator === 'string' ? record.operator : 'AND'
                                        const clauses = Array.isArray(record.clauses) ? record.clauses : []
                                        return (
                                          <div className={`space-y-2 ${depth === 0 ? '' : 'ml-4 pl-3 border-l border-border/40'}`}>
                                            <div className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-background">
                                              {operator}
                                            </div>
                                            <div className="space-y-2">
                                              {clauses.length > 0 ? clauses.map((clause, clauseIdx) => (
                                                <div key={`quest-condition-${depth}-${clauseIdx}`}>
                                                  {renderConditionNode(clause, depth + 1)}
                                                </div>
                                              )) : (
                                                <div className="text-xs text-muted-foreground italic">
                                                  {t('quest.noConditions')}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      }

                                      const type = typeof record.type === 'string' ? record.type.trim() : ''
                                      const target = record.target != null ? String(record.target) : ''
                                      const directItemRefs = [
                                        ...collectItemRefs(record.item_definition_id),
                                        ...collectItemRefs(record.item_definition_ids),
                                        ...collectItemRefs(record.item_definition),
                                        ...collectItemRefs(record.item_definitions),
                                        ...collectDeepItemRefs(record),
                                      ]
                                      const itemRefs = Array.from(new Set(directItemRefs))
                                      const packs = record.packs && typeof record.packs === 'object' && !Array.isArray(record.packs)
                                        ? (record.packs as Record<string, unknown>)
                                        : null
                                      const details = record.details && typeof record.details === 'object' && !Array.isArray(record.details)
                                        ? (record.details as Record<string, unknown>)
                                        : null

                                      return (
                                        <div className={`px-2 py-1.5 space-y-3 ${depth === 0 ? '' : 'ml-4 pl-3 border-l-2 border-border/40'}`}>
                                          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              type
                                            </div>
                                            <div className="font-mono text-xs break-words text-foreground/90 text-left">
                                              {type || 'condition'}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              Item Definition
                                            </div>
                                            <div className="space-y-1 text-left">
                                              {itemRefs.length > 0 ? (
                                                itemRefs.map((itemRef, itemRefIdx) => (
                                                  <div key={`quest-condition-direct-item-${depth}-${itemRefIdx}`} className="font-mono text-foreground/90 break-all text-xs">
                                                    {itemRef}
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="text-xs text-muted-foreground">—</div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              target
                                            </div>
                                            <div className="font-mono text-xs break-words text-foreground/90 text-left">
                                              {target || '—'}
                                            </div>
                                          </div>

                                          {packs ? (
                                            <div className="space-y-1">
                                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                packs
                                              </div>
                                              <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">gacha_pack_id</div>
                                                  <div className="font-mono text-xs break-all text-foreground/90">
                                                    {typeof packs.gacha_pack_id === 'string' ? packs.gacha_pack_id : '—'}
                                                  </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">quantity</div>
                                                  <div className="font-mono text-xs text-foreground/90">
                                                    {packs.quantity != null ? String(packs.quantity) : '1'}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ) : null}

                                          {details ? (
                                            <div className="space-y-0.5">
                                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                {t('common.details')}
                                              </div>
                                              <div className="rounded border border-dashed border-border/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-words">
                                                {JSON.stringify(details, null, 2)}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    }

                                    const renderRewardNode = (reward: unknown, depth = 0): React.ReactNode => {
                                      if (!reward || typeof reward !== 'object' || Array.isArray(reward)) return null
                                      const record = reward as Record<string, unknown>
                                      const normalizeRef = (value: string): string => {
                                        const raw = value.trim()
                                        return raw.startsWith('__REF:') ? raw : `__REF:${raw}`
                                      }
                                      const collectItemRefs = (value: unknown): string[] => {
                                        if (!value) return []
                                        if (typeof value === 'string') {
                                          const raw = value.trim()
                                          return raw ? [normalizeRef(raw)] : []
                                        }
                                        if (Array.isArray(value)) {
                                          return value.flatMap((entry) => collectItemRefs(entry))
                                        }
                                        if (typeof value === 'object') {
                                          const itemRecord = value as Record<string, unknown>
                                          const refs: string[] = []
                                          const directId = typeof itemRecord.item_definition_id === 'string' ? itemRecord.item_definition_id.trim() : ''
                                          const directCode = typeof itemRecord.item_code === 'string' ? itemRecord.item_code.trim() : ''
                                          if (directId) refs.push(normalizeRef(directId))
                                          if (!refs.length && directCode) refs.push(normalizeRef(directCode))
                                          return refs
                                        }
                                        return []
                                      }
                                      const rewardType = typeof record.reward_type === 'string' ? record.reward_type.trim() : ''
                                      const itemRefs = [
                                        ...collectItemRefs(record.item_definition_id),
                                        ...collectItemRefs(record.item_definition_ids),
                                        ...collectItemRefs(record.item_definition),
                                        ...collectItemRefs(record.item_definitions),
                                      ]
                                      const quantityMin = record.quantity_min != null ? String(record.quantity_min) : ''
                                      const quantityMax = record.quantity_max != null ? String(record.quantity_max) : ''
                                      const quantity = record.quantity != null ? String(record.quantity) : ''
                                      const valueText = quantityMin || quantityMax
                                        ? `${quantityMin || '0'} - ${quantityMax || quantityMin || '0'}`
                                        : (quantity || '—')
                                      const rewardDetails = record.details && typeof record.details === 'object' && !Array.isArray(record.details)
                                        ? (record.details as Record<string, unknown>)
                                        : null

                                      return (
                                        <div className={`px-2 py-1.5 space-y-3 ${depth === 0 ? '' : 'ml-4 pl-3 border-l-2 border-border/40'}`}>
                                          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              reward_type
                                            </div>
                                            <div className="font-mono text-xs break-words text-foreground/90 text-left">
                                              {rewardType || 'item'}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              Item Definition
                                            </div>
                                            <div className="space-y-1 text-left">
                                              {itemRefs.length > 0 ? (
                                                itemRefs.map((itemRef, itemRefIdx) => (
                                                  <div key={`quest-reward-item-${depth}-${itemRefIdx}`} className="font-mono text-foreground/90 break-all text-xs">
                                                    {itemRef}
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="text-xs text-muted-foreground">—</div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              quantity
                                            </div>
                                            <div className="font-mono text-xs break-words text-foreground/90 text-left">
                                              {valueText}
                                            </div>
                                          </div>
                                          {rewardDetails ? (
                                            <div className="space-y-0.5">
                                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                {t('common.details')}
                                              </div>
                                              <div className="rounded border border-dashed border-border/40 p-2 text-[11px] font-mono whitespace-pre-wrap break-words">
                                                {JSON.stringify(rewardDetails, null, 2)}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      )
                                    }

                                    const renderRewards = (): React.ReactNode => {
                                      if (rewards.length === 0) {
                                        return <div className="text-xs break-words text-foreground/90">—</div>
                                      }

                                      return (
                                        <div className="space-y-2">
                                          {rewards.map((reward, rewardIdx) => (
                                            <div key={`quest-reward-${turn.id}-${idx}-${seg.questDefinitionIdx}-${rewardIdx}`}>
                                              {renderRewardNode(reward, 0)}
                                            </div>
                                          ))}
                                        </div>
                                      )
                                    }

                                    return (
                                      <div
                                        id={`conv-panel-quest-def-summary-${turn.id}-${idx}-${seg.questDefinitionIdx}`}
                                        className="rounded-xl bg-muted/25 px-3 py-2 text-xs space-y-2"
                                      >
                                        <div className="grid gap-2 sm:grid-cols-2">
                                          <div className="space-y-0.5">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              {t('quest.codeName')}
                                            </div>
                                            <div className="font-mono text-xs break-all">
                                              {codeName || questName || `Quest ${seg.questDefinitionIdx + 1}`}
                                            </div>
                                          </div>
                                          <div className="space-y-0.5">
                                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                              {t('quest.type')}
                                            </div>
                                            <div className="text-xs break-words">
                                              {questType || 'Unknown'}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {t('quest.description')}
                                          </div>
                                          <div className="text-xs leading-5 break-words text-foreground/90">
                                            {description || '—'}
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {t('quest.conditions')}
                                          </div>
                                          <div className="space-y-2">
                                            {conditions ? renderConditionNode(conditions) : (
                                              <div className="text-xs break-words text-foreground/90">
                                                —
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            rewards
                                          </div>
                                          <div className="space-y-2">
                                            {renderRewards()}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })()}
                                  <div
                                    id={`conv-panel-quest-def-segment-json-${turn.id}-${idx}-${seg.questDefinitionIdx}`}
                                    className="rounded-md border border-border/60 bg-background/80 p-3 text-xs font-mono whitespace-pre overflow-x-auto break-words"
                                  >
                                    {JSON.stringify(seg.questDefinition, null, 2)}
                                  </div>
                                  {(() => {
                                    const questKey = `${turn.id}:${idx}:${seg.questDefinitionIdx}`
                                    const savedQuestId = savedQuestDefinitionIds[questKey]
                                    const questCodeName = typeof seg.questDefinition.code_name === 'string'
                                      ? seg.questDefinition.code_name.trim()
                                      : ''
                                    const questName = typeof seg.questDefinition.name === 'string'
                                      ? seg.questDefinition.name
                                      : (typeof seg.questDefinition.code_name === 'string' ? seg.questDefinition.code_name : `Quest ${seg.questDefinitionIdx + 1}`)
                                    const linkedName = savedQuestId ? (questDefinitionNames[savedQuestId] ?? questName) : questName
                                    return savedQuestId ? (
                                      <Link
                                        id={`conv-panel-quest-link-${turn.id}-${idx}-${seg.questDefinitionIdx}`}
                                        href={`/games/${gameId}/quests?${new URLSearchParams({
                                          q: savedQuestId,
                                          expandQuest: savedQuestId,
                                        }).toString()}`}
                                        className="self-start inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors px-2 py-0.5 text-[10px] max-w-[240px]"
                                        title={linkedName}
                                      >
                                        <ScrollText className="h-3 w-3 shrink-0" />
                                        <span id={`conv-panel-quest-link-label-${turn.id}-${idx}-${seg.questDefinitionIdx}`} className="truncate">{t('llmConversation.viewQuestDefinition')}: {linkedName}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        id={`conv-panel-save-quest-btn-${turn.id}-${idx}-${seg.questDefinitionIdx}`}
                                        onClick={() => onSaveQuestDefinition(seg.questDefinition, turn.id, idx, seg.questDefinitionIdx)}
                                        className="self-start inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors my-[10px]"
                                      >
                                        <ScrollText className="h-3 w-3" />
                                        <span id={`conv-panel-save-quest-btn-label-${turn.id}-${idx}-${seg.questDefinitionIdx}`}>{t('llmConversation.saveAsQuestDefinition')}: {questName}</span>
                                      </button>
                                    )
                                  })()}
                                </div>
                              ) : null
                            )}
                            {!response.done && (
                              <Loader2 id={`conv-panel-ai-response-cursor-quest-${turn.id}-${idx}`} className="h-3 w-3 animate-spin text-muted-foreground" />
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
