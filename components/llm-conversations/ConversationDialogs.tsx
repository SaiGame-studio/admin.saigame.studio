'use client'

import { BookOpen, Loader2, PackagePlus } from 'lucide-react'
import { useTheme } from 'next-themes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  loreDraftReviewOpen: boolean
  setLoreDraftReviewOpen: (v: boolean) => void
  loreDraftForm: LoreDraftForm
  setLoreDraftForm: (v: LoreDraftForm) => void
  isCreatingLoreRecords: boolean
  onCreateLoreRecords: () => void
  t: (key: string) => string
}

export function ConversationDialogs({
  detailOpen,
  setDetailOpen,
  chatHistory,
  activeConv,
  convMainContent,
  deleteTarget,
  setDeleteTarget,
  onDelete,
  createRecordsConfirmOpen,
  setCreateRecordsConfirmOpen,
  isCreatingRecords,
  onCreateRecords,
  loreDraftReviewOpen,
  setLoreDraftReviewOpen,
  loreDraftForm,
  setLoreDraftForm,
  isCreatingLoreRecords,
  onCreateLoreRecords,
  t,
}: ConversationDialogsProps) {
  const { resolvedTheme } = useTheme()
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
                  const goals = [...new Set(chatHistory.filter((turn) => turn.detectedGoal).map((turn) => turn.detectedGoal!))]
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
            <AlertDialogTitle id="conv-panel-delete-dialog-title">{t('llmConversation.deleteTitle')}</AlertDialogTitle>
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
            <AlertDialogTitle id="conv-panel-create-records-dialog-title">{t('llmConversation.createRecordsTitle')}</AlertDialogTitle>
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
            <DialogTitle id="conv-panel-lore-review-title">{t('llmConversation.loreDraftReviewTitle')}</DialogTitle>
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
                <Input
                  id="conv-panel-lore-review-title-input"
                  value={loreDraftForm.title}
                  onChange={(e) => setLoreDraftForm({ ...loreDraftForm, title: e.target.value })}
                  className="h-7 text-xs"
                />
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
                  className={`prose prose-sm max-w-none text-xs border rounded p-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0${resolvedTheme?.includes('dark') ? ' prose-invert' : ''}`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
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
              onClick={onCreateLoreRecords}
              disabled={isCreatingLoreRecords || !loreDraftForm.title.trim()}
              className="inline-flex items-center gap-1 rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {isCreatingLoreRecords ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
              {t('llmConversation.saveLore')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
