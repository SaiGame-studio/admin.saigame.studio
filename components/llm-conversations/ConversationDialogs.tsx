'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Loader2, Package, PackagePlus, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CreateItemDefinitionDialog, type CreateItemInitialValues } from '@/components/CreateItemDefinitionDialog'
import { listLoreEntries } from '@/lib/lore-api'
import type { LoreEntry } from '@/types/lore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Conversation } from '@/types/llm-conversation'
import type { ChatTurn } from '@/hooks/use-chat-pipeline'

export interface LoreDraftForm {
  lore_type: string
  title: string
  summary: string
  content: string
}


interface ConversationDialogsProps {
  // Detail dialog
  detailOpen: boolean
  setDetailOpen: (v: boolean) => void
  chatHistory: ChatTurn[]
  activeConv: Conversation | null
  convMainContent: string
  convGeneratedItems: unknown[]
  // Delete dialog
  deleteTarget: Conversation | null
  setDeleteTarget: (v: Conversation | null) => void
  onDelete: () => void
  // Create records dialog
  createRecordsConfirmOpen: boolean
  setCreateRecordsConfirmOpen: (v: boolean) => void
  isCreatingRecords: boolean
  onCreateRecords: () => void
  // Lore draft review dialog
  gameId: string
  loreDraftReviewOpen: boolean
  setLoreDraftReviewOpen: (v: boolean) => void
  loreDraftForm: LoreDraftForm
  setLoreDraftForm: (v: LoreDraftForm) => void
  isCreatingLoreRecords: boolean
  onCreateLoreRecords: (matchedLoreId?: string) => void
  // Item definition draft review dialog
  itemDefReviewOpen: boolean
  setItemDefReviewOpen: (v: boolean) => void
  itemInitialValues: CreateItemInitialValues | null
  onItemDefCreated: (itemId: string) => void
  t: (key: string) => string
}

const MARKDOWN_COMPONENTS = {
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <div id="conv-panel-dialog-md-pre-scroll-wrap" className="overflow-x-auto w-full my-2 rounded">
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

export function ConversationDialogs({
  detailOpen,
  setDetailOpen,
  chatHistory,
  activeConv,
  convMainContent,
  convGeneratedItems,
  deleteTarget,
  setDeleteTarget,
  onDelete,
  createRecordsConfirmOpen,
  setCreateRecordsConfirmOpen,
  isCreatingRecords,
  onCreateRecords,
  gameId,
  loreDraftReviewOpen,
  setLoreDraftReviewOpen,
  loreDraftForm,
  setLoreDraftForm,
  isCreatingLoreRecords,
  onCreateLoreRecords,
  itemDefReviewOpen,
  setItemDefReviewOpen,
  itemInitialValues,
  onItemDefCreated,
  t,
}: ConversationDialogsProps) {
  const { resolvedTheme } = useTheme()
  const detailGeneratedItems = convGeneratedItems.length > 0
    ? convGeneratedItems
    : (activeConv?.AccumulatedContent?.items ?? [])

  // ── Title combobox state ──
  const [titleInput, setTitleInput] = useState('')
  const [titleResults, setTitleResults] = useState<LoreEntry[]>([])
  const [isTitleSearching, setIsTitleSearching] = useState(false)
  const [showTitleDropdown, setShowTitleDropdown] = useState(false)
  const [matchedLoreEntry, setMatchedLoreEntry] = useState<LoreEntry | null>(null)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync titleInput when dialog opens and auto-detect if title already matches an existing lore
  useEffect(() => {
    if (loreDraftReviewOpen) {
      setTitleInput(loreDraftForm.title)
      setMatchedLoreEntry(null)
      setTitleResults([])
      setShowTitleDropdown(false)
      // Silently check if the pre-filled title matches an existing lore (no dropdown shown)
      if (loreDraftForm.title.trim()) {
        listLoreEntries(gameId, { q: loreDraftForm.title.trim(), limit: 8 })
          .then((res) => {
            const results = res.data ?? []
            const compareTitle = loreDraftForm.title.trim().toLowerCase()
            const exactMatch = results.find((e) => e.Title.trim().toLowerCase() === compareTitle)
            if (exactMatch) setMatchedLoreEntry(exactMatch)
          })
          .catch(() => {/* ignore */})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loreDraftReviewOpen])

  async function searchLoreTitles(q: string, currentTitle?: string) {
    setIsTitleSearching(true)
    setShowTitleDropdown(true)
    try {
      const res = await listLoreEntries(gameId, { q: q.trim() || undefined, limit: 8 })
      const results = res.data ?? []
      setTitleResults(results)
      // Auto-detect exact title match to enable "Update Lore" mode
      const compareTitle = (currentTitle ?? q).trim().toLowerCase()
      const exactMatch = results.find((e) => e.Title.trim().toLowerCase() === compareTitle)
      if (exactMatch) setMatchedLoreEntry(exactMatch)
    } catch {
      setTitleResults([])
    } finally {
      setIsTitleSearching(false)
    }
  }

  function handleTitleInput(value: string) {
    setTitleInput(value)
    setLoreDraftForm({ ...loreDraftForm, title: value })
    setMatchedLoreEntry(null)
    setShowTitleDropdown(true)
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
    titleDebounceRef.current = setTimeout(() => searchLoreTitles(value, value), 350)
  }

  function handleTitleFocus() {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
    searchLoreTitles(titleInput, titleInput)
  }

  function handleSelectLore(entry: LoreEntry) {
    setTitleInput(entry.Title)
    setLoreDraftForm({
      ...loreDraftForm,
      title: entry.Title,
      lore_type: entry.LoreType,
      // Keep draft summary and content — they are the new content to update into the selected lore
    })
    setMatchedLoreEntry(entry)
    setShowTitleDropdown(false)
    setTitleResults([])
  }
  return (
    <>
      {/* ── Full detail dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent id="conv-panel-detail-dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('llmConversation.detailTitle')}</DialogTitle>
          </DialogHeader>
          <ScrollArea id="conv-panel-detail-scroll" className="max-h-[65vh] pr-2">
            <div id="conv-panel-detail-body" className="space-y-4 text-xs">

              <section id="conv-panel-detail-goals-section">
                <p id="conv-panel-detail-goals-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  {t('llmConversation.detailGoalsLabel')}
                </p>
                {(() => {
                  const goals = [...new Set(chatHistory
                    .map((turn) => (turn as ChatTurn & { detectedGoal?: string }).detectedGoal)
                    .filter((goal): goal is string => typeof goal === 'string' && goal.trim().length > 0)
                  )]
                  return goals.length === 0 ? (
                    <p id="conv-panel-detail-goals-empty" className="text-muted-foreground italic">{t('llmConversation.detailGoalsEmpty')}</p>
                  ) : (
                    <ol id="conv-panel-detail-goals-list" className="space-y-1 list-decimal list-inside">
                      {goals.map((g, i) => (
                        <li id={`conv-panel-detail-goal-${i}`} key={i} className="bg-muted rounded px-2 py-1 leading-snug">{g}</li>
                      ))}
                    </ol>
                  )
                })()}
              </section>

              {activeConv && (
                <section id="conv-panel-detail-meta-section">
                  <p id="conv-panel-detail-meta-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('llmConversation.detailMetaLabel')}</p>
                  <div id="conv-panel-detail-meta-grid" className="space-y-1">
                    <div id="conv-panel-detail-meta-id" className="flex gap-2">
                      <span id="conv-panel-detail-meta-id-key" className="text-muted-foreground w-16 shrink-0">ID</span>
                      <span id="conv-panel-detail-meta-id-val" className="font-mono break-all">{activeConv.ID}</span>
                    </div>
                    <div id="conv-panel-detail-meta-title" className="flex gap-2">
                      <span id="conv-panel-detail-meta-title-key" className="text-muted-foreground w-16 shrink-0">{t('llmConversation.detailFieldTitle')}</span>
                      <span id="conv-panel-detail-meta-title-val">{activeConv.Title}</span>
                    </div>
                    <div id="conv-panel-detail-meta-goal" className="flex gap-2">
                      <span id="conv-panel-detail-meta-goal-key" className="text-muted-foreground w-16 shrink-0">{t('llmConversation.detailFieldGoal')}</span>
                      <span id="conv-panel-detail-meta-goal-val">{activeConv.Goal || '—'}</span>
                    </div>
                    <div id="conv-panel-detail-meta-status" className="flex gap-2">
                      <span id="conv-panel-detail-meta-status-key" className="text-muted-foreground w-16 shrink-0">{t('llmConversation.detailFieldStatus')}</span>
                      <span id="conv-panel-detail-meta-status-val">{activeConv.ArchivedAt ? t('llmConversation.detailStatusArchived') : t('llmConversation.detailStatusActive')}</span>
                    </div>
                    <div id="conv-panel-detail-meta-created" className="flex gap-2">
                      <span id="conv-panel-detail-meta-created-key" className="text-muted-foreground w-16 shrink-0">{t('llmConversation.detailFieldCreated')}</span>
                      <span id="conv-panel-detail-meta-created-val">{new Date(activeConv.CreatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              )}

              {convMainContent && (
                <section id="conv-panel-detail-main-content-section">
                  <p id="conv-panel-detail-main-content-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('llmConversation.detailMainContentLabel')}</p>
                  <pre id="conv-panel-detail-main-content-val" className="whitespace-pre-wrap break-words text-xs bg-muted rounded p-2 leading-relaxed">{convMainContent}</pre>
                </section>
              )}

              {detailGeneratedItems.length > 0 && (
                <section id="conv-panel-detail-generated-items-section">
                  <p id="conv-panel-detail-generated-items-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{t('llmConversation.detailGeneratedItemsLabel')}</p>
                  <pre id="conv-panel-detail-generated-items-val" className="whitespace-pre-wrap break-words text-xs bg-muted rounded p-2 leading-relaxed">{JSON.stringify(detailGeneratedItems, null, 2)}</pre>
                </section>
              )}

              {chatHistory.length > 0 && (
                <section id="conv-panel-detail-turns-section">
                  <p id="conv-panel-detail-turns-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    {t('llmConversation.detailTurnsLabel').replace('{count}', String(chatHistory.length))}
                  </p>
                  <div id="conv-panel-detail-turns-list" className="space-y-2">
                    {chatHistory.map((turn, i) => (
                      <div id={`conv-panel-detail-turn-${turn.id}`} key={turn.id} className="rounded border p-2 space-y-0.5">
                        <p id={`conv-panel-detail-turn-user-${turn.id}`} className="font-medium truncate">{i + 1}. {turn.userMessage}</p>
                        {turn.detectedType && (
                          <p id={`conv-panel-detail-turn-type-${turn.id}`} className="text-muted-foreground">
                            {t('llmConversation.detailTurnType')}: <span className="text-foreground">{turn.detectedType}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent id="conv-panel-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('llmConversation.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription id="conv-panel-delete-dialog-desc">
              {t('llmConversation.deleteDesc').replace('{title}', deleteTarget?.Title ?? '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="conv-panel-delete-cancel-btn">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              id="conv-panel-delete-confirm-btn"
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create records confirmation ── */}
      <AlertDialog open={createRecordsConfirmOpen} onOpenChange={(o) => { if (!o) setCreateRecordsConfirmOpen(false) }}>
        <AlertDialogContent id="conv-panel-create-records-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('llmConversation.createRecordsTitle')}</AlertDialogTitle>
            <AlertDialogDescription id="conv-panel-create-records-dialog-desc">
              {t('llmConversation.createRecordsDesc').replace('{count}', String(activeConv?.AccumulatedContent?.items?.length ?? 0))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="conv-panel-create-records-cancel-btn" disabled={isCreatingRecords}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              id="conv-panel-create-records-confirm-btn"
              onClick={onCreateRecords}
              disabled={isCreatingRecords}
            >
              {isCreatingRecords ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackagePlus className="h-3.5 w-3.5" />}
              {t('llmConversation.saveToGame')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Lore draft review ── */}
      <Dialog open={loreDraftReviewOpen} onOpenChange={setLoreDraftReviewOpen}>
        <DialogContent id="conv-panel-lore-review-dialog" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('llmConversation.loreDraftReviewTitle')}</DialogTitle>
          </DialogHeader>
          <ScrollArea id="conv-panel-lore-review-scroll" className="max-h-[60vh] pr-2">
            <div id="conv-panel-lore-review-body" className="space-y-3 text-xs">
              <div id="conv-panel-lore-review-type-row" className="flex flex-col gap-1">
                <Label id="conv-panel-lore-review-type-label" className="text-[11px]">{t('llmConversation.loreType')}</Label>
                <Select
                  value={loreDraftForm.lore_type}
                  onValueChange={(v) => setLoreDraftForm({ ...loreDraftForm, lore_type: v })}
                >
                  <SelectTrigger id="conv-panel-lore-review-type-trigger" className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent id="conv-panel-lore-review-type-content">
                    {['world', 'region', 'faction', 'character', 'item_lore', 'event', 'creature', 'custom'].map((type) => (
                      <SelectItem id={`conv-panel-lore-review-type-${type}`} key={type} value={type} className="text-xs">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div id="conv-panel-lore-review-title-row" className="flex flex-col gap-1">
                <Label id="conv-panel-lore-review-title-label" className="text-[11px]">{t('llmConversation.loreTitle')}</Label>
                <div id="conv-panel-lore-review-title-combobox" className="relative">
                  <Search id="conv-panel-lore-review-title-icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <Input
                    id="conv-panel-lore-review-title-input"
                    value={titleInput}
                    onChange={(e) => handleTitleInput(e.target.value)}
                    onFocus={handleTitleFocus}
                    onBlur={() => setTimeout(() => setShowTitleDropdown(false), 150)}
                    className="h-7 text-xs pl-7 pr-6"
                    autoComplete="off"
                  />
                  {isTitleSearching && (
                    <Loader2 id="conv-panel-lore-review-title-spinner" className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground pointer-events-none" />
                  )}
                  {showTitleDropdown && (
                    <div
                      id="conv-panel-lore-review-title-dropdown"
                      className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto"
                    >
                      {titleResults.length > 0 ? titleResults.map((entry) => (
                        <button
                          id={`conv-panel-lore-title-option-${entry.ID}`}
                          key={entry.ID}
                          type="button"
                          onMouseDown={() => handleSelectLore(entry)}
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
                        >
                          <span id={`conv-panel-lore-title-option-name-${entry.ID}`} className="flex-1 truncate font-medium">{entry.Title}</span>
                          <span id={`conv-panel-lore-title-option-type-${entry.ID}`} className="shrink-0 text-[10px] text-muted-foreground">{entry.LoreType}</span>
                        </button>
                      )) : !isTitleSearching ? (
                        <p id="conv-panel-lore-title-no-results" className="px-2.5 py-2 text-xs text-muted-foreground italic">No existing lore found — will save as new.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              <div id="conv-panel-lore-review-summary-row" className="flex flex-col gap-1">
                <Label id="conv-panel-lore-review-summary-label" className="text-[11px]">{t('llmConversation.loreSummary')}</Label>
                <Textarea
                  id="conv-panel-lore-review-summary-input"
                  value={loreDraftForm.summary}
                  onChange={(e) => setLoreDraftForm({ ...loreDraftForm, summary: e.target.value })}
                  className="text-xs min-h-[60px]"
                />
              </div>
              <div id="conv-panel-lore-review-content-row" className="flex flex-col gap-1">
                <Label id="conv-panel-lore-review-content-label" className="text-[11px]">{t('llmConversation.loreContent')}</Label>
                <div
                  id="conv-panel-lore-review-content-preview"
                  className={`prose prose-sm max-w-none text-xs border rounded p-2 break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:break-words [&_li]:break-words [&_a]:break-all${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={MARKDOWN_COMPONENTS}>
                    {loreDraftForm.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter id="conv-panel-lore-review-footer">
            <button
              id="conv-panel-lore-review-cancel-btn"
              onClick={() => setLoreDraftReviewOpen(false)}
              disabled={isCreatingLoreRecords}
              className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              id="conv-panel-lore-review-confirm-btn"
              onClick={() => onCreateLoreRecords(matchedLoreEntry?.ID)}
              disabled={isCreatingLoreRecords || !loreDraftForm.title.trim()}
              className="inline-flex items-center gap-1 rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {isCreatingLoreRecords ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
              {matchedLoreEntry ? t('llmConversation.updateLore') : t('llmConversation.saveNewLore')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Item definition draft review ── */}
      <CreateItemDefinitionDialog
        open={itemDefReviewOpen}
        gameId={gameId}
        onCreated={onItemDefCreated}
        onClose={() => setItemDefReviewOpen(false)}
        initialValues={itemInitialValues ?? undefined}
      />


    </>
  )
}
