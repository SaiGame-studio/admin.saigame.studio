'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bot, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/lib/i18n/use-translation'
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage-utils'
import {
  listConversations,
  getConversation,
  updateConversation,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  createRecordsFromConversation,
  listRequestTypes,
  linkConversationContent,
  listConversationContent,
  unlinkConversationContent,
} from '@/lib/llm-conversation-api'
import { useChatPipeline, ChatTurn } from '@/hooks/use-chat-pipeline'
import type { Conversation, RequestType, ConversationContentLink } from '@/types/llm-conversation'
import { useConvPanelResize } from '@/hooks/use-conv-panel-resize'
import {
  LS_PANEL_OPEN,
  LS_PANEL_MINIMIZED,
  LS_ARCHIVED_COLLAPSED,
  lsActiveConv,
  lsConvHistory,
  lsLoreLinks,
  parseLoreResponse,
  extractGameId,
} from './conversation-panel-utils'
import { ConversationSidebar } from './ConversationSidebar'
import { ConversationHeader } from './ConversationHeader'
import { ConversationChatHistory } from './ConversationChatHistory'
import { ConversationLinkedContent } from './ConversationLinkedContent'
import { ConversationInputArea } from './ConversationInputArea'
import { ConversationDialogs } from './ConversationDialogs'
import type { LoreDraftForm } from './ConversationDialogs'
import { createLoreEntry, getLoreEntry, updateLoreEntry } from '@/lib/lore-api'
import type { LoreEntry } from '@/types/lore'

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LLMConversationPanel() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useTranslation()

  const gameId = extractGameId(pathname)

  // Defer rendering until after hydration to avoid localStorage mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Panel visibility state
  const [isOpen, setIsOpen] = useState(() => safeGetItem(LS_PANEL_OPEN) === 'true')
  const [isMinimized, setIsMinimized] = useState(() => safeGetItem(LS_PANEL_MINIMIZED) === 'true')

  // Sidebar state — two separate lists
  const [activeConvs, setActiveConvs] = useState<Conversation[]>([])
  const [isLoadingActive, setIsLoadingActive] = useState(false)
  const [archivedConvs, setArchivedConvs] = useState<Conversation[]>([])
  const [isLoadingArchived, setIsLoadingArchived] = useState(false)
  const [isArchivedCollapsed, setIsArchivedCollapsed] = useState<boolean>(
    () => safeGetItem(LS_ARCHIVED_COLLAPSED) !== 'false'
  )

  // Active conversation
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [isLoadingConv, setIsLoadingConv] = useState(false)

  // Inline title/goal editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [editGoalValue, setEditGoalValue] = useState('')

  // Message input
  const [message, setMessage] = useState('')

  // When we create a conversation ourselves in handleSend, skip loadConversation in the useEffect
  const justCreatedConvIdRef = useRef<string | null>(null)

  // Chat pipeline — sequential: createConversation (REST) → streamDetectIntent (SSE)
  const { isRunning: isStreaming, chatHistory, send: runPipeline, retryResponse, clearHistory, loadHistory, removeTurn } = useChatPipeline()

  // Request type selector
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([])
  const [selectedRequestType, setSelectedRequestType] = useState<string>('auto')
  // When selectedRequestType was resolved by auto-detection, stores the detected key so
  // the trigger can display "Auto - [label]" instead of just the label.
  const [autoDetectedType, setAutoDetectedType] = useState<string | null>(null)

  // Archive/delete dialogs
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)

  // Create records
  const [isCreatingRecords, setIsCreatingRecords] = useState(false)
  const [createRecordsConfirmOpen, setCreateRecordsConfirmOpen] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)

  // Saved lore IDs per turn response (keyed as "turnId:responseIdx")
  const [savedLoreIds, setSavedLoreIds] = useState<Record<string, string>>({})

  // Lore draft review
  const [loreDraftReviewOpen, setLoreDraftReviewOpen] = useState(false)
  const [loreDraftReviewTurn, setLoreDraftReviewTurn] = useState<ChatTurn | null>(null)
  const [loreDraftReviewResponseIdx, setLoreDraftReviewResponseIdx] = useState(0)
  const [loreDraftForm, setLoreDraftForm] = useState<LoreDraftForm>({ lore_type: 'custom', title: '', summary: '', content: '' })
  const [isCreatingLoreRecords, setIsCreatingLoreRecords] = useState(false)

  // Tracks the last completed lore_creating response text (used as context for lore_analyzing)
  const [convMainContent, setConvMainContent] = useState('')

  // Linked content for the active conversation
  const [linkedContent, setLinkedContent] = useState<ConversationContentLink[]>([])
  const [isLoadingLinkedContent, setIsLoadingLinkedContent] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [loreEntryTitles, setLoreEntryTitles] = useState<Record<string, string>>({})

  // Resize state via hook
  const { panelWidth, handleResizeMouseDown, sidebarWidth, handleSidebarResizeMouseDown, activeSectionHeight, handleSplitResizeMouseDown, sidebarBodyRef } = useConvPanelResize()

  useEffect(() => { safeSetItem(LS_ARCHIVED_COLLAPSED, String(isArchivedCollapsed)) }, [isArchivedCollapsed])

  // ---------------------------------------------------------------------------
  // Fetch request types once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    listRequestTypes()
      .then((keys) => {
        const auto: RequestType = { key: 'auto', label: t('llmConversation.requestTypes.auto') }
        const mapped: RequestType[] = keys.map((k) => ({
          key: k,
          label: t(`llmConversation.requestTypes.${k}`) || k,
        }))
        setRequestTypes([auto, ...mapped])
      })
      .catch(() => {
        toast({ title: t('llmConversation.errorLoadRequestTypes'), variant: 'destructive' })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // After auto-detection completes, update the display label only.
  // selectedRequestType stays 'auto' so every send re-runs detect-intent.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const lastTurn = chatHistory[chatHistory.length - 1]
    if (lastTurn?.done && lastTurn.detectedType && !lastTurn.error) {
      setAutoDetectedType(lastTurn.detectedType)
    }
  }, [chatHistory])

  // ---------------------------------------------------------------------------
  // Persist UI state to localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    safeSetItem(LS_PANEL_OPEN, String(isOpen))
    window.dispatchEvent(new Event('ss:conv-state-changed'))
  }, [isOpen])
  useEffect(() => { safeSetItem(LS_PANEL_MINIMIZED, String(isMinimized)) }, [isMinimized])

  // Persist completed chat turns for the active conversation
  useEffect(() => {
    if (!activeConvId || chatHistory.length === 0) return
    const completedTurns = chatHistory.filter((t) => t.done)
    if (completedTurns.length > 0) {
      safeSetItem(lsConvHistory(activeConvId), JSON.stringify(completedTurns))
    }
  }, [chatHistory, activeConvId])

  // Keep the last completed lore_creating response as conversation main content
  useEffect(() => {
    let lastContent = ''
    for (const turn of chatHistory) {
      if (!turn.responses) continue
      for (const response of turn.responses) {
        if (response.intentType === 'lore_creating' && response.done && !response.error && response.responseText) {
          lastContent = response.responseText
        }
      }
    }
    setConvMainContent(lastContent)
  }, [chatHistory])

  // Reset main content when switching conversations
  useEffect(() => {
    setConvMainContent('')
  }, [activeConvId])

  // ---------------------------------------------------------------------------
  // Load conversations when game changes or panel opens
  // ---------------------------------------------------------------------------
  const prevGameIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!gameId) {
      // Reset when no game is selected
      setActiveConvs([])
      setArchivedConvs([])
      setActiveConvId(null)
      setActiveConv(null)
      prevGameIdRef.current = null
      return
    }

    if (gameId !== prevGameIdRef.current) {
      // Game changed — flush state
      prevGameIdRef.current = gameId
      setActiveConvs([])
      setArchivedConvs([])
      setActiveConv(null)

      const savedConvId = safeGetItem(lsActiveConv(gameId))
      setActiveConvId(savedConvId ?? null)

      if (isOpen) loadBothLists(gameId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  useEffect(() => {
    if (isOpen && gameId) {
      loadBothLists(gameId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ---------------------------------------------------------------------------
  // Load active conversation when activeConvId changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!gameId || !activeConvId) {
      setActiveConv(null)
      setLinkedContent([])
      setLoreEntryTitles({})
      clearHistory()
      setSavedLoreIds({})
      if (gameId) safeRemoveItem(lsActiveConv(gameId))
      return
    }
    safeSetItem(lsActiveConv(gameId), activeConvId)
    // Skip re-fetching when the conversation was just created by handleSend
    if (justCreatedConvIdRef.current === activeConvId) {
      justCreatedConvIdRef.current = null
      return
    }
    // Restore chat history from localStorage
    clearHistory()
    const raw = safeGetItem(lsConvHistory(activeConvId))
    if (raw) {
      try { loadHistory(JSON.parse(raw)) } catch { loadHistory([]) }
    } else {
      loadHistory([])
    }
    // Restore saved lore IDs from localStorage
    const rawLoreLinks = safeGetItem(lsLoreLinks(activeConvId))
    setSavedLoreIds(rawLoreLinks ? JSON.parse(rawLoreLinks) : {})
    loadConversation(gameId, activeConvId)
    loadLinkedContent(gameId, activeConvId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, gameId])

  // Listen for externally created conversations (e.g. from lore link button)
  useEffect(() => {
    function handleExternalConvCreated(e: Event) {
      const detail = (e as CustomEvent<{ convId: string; gameId: string }>).detail
      if (detail.gameId === gameId) {
        setActiveConvId(detail.convId)
      }
    }
    window.addEventListener('ss:conv-external-created', handleExternalConvCreated)
    return () => window.removeEventListener('ss:conv-external-created', handleExternalConvCreated)
  }, [gameId])

  // Reload linked content when an external action links new content to the active conversation
  useEffect(() => {
    function handleContentLinked(e: Event) {
      const detail = (e as CustomEvent<{ convId: string; gameId: string }>).detail
      if (detail.gameId === gameId && detail.convId === activeConvId) {
        void loadLinkedContent(gameId, activeConvId)
      }
    }
    window.addEventListener('ss:conv-content-linked', handleContentLinked)
    return () => window.removeEventListener('ss:conv-content-linked', handleContentLinked)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, activeConvId])

  // ---------------------------------------------------------------------------
  // API calls
  // ---------------------------------------------------------------------------
  async function loadActiveConvs(gId: string) {
    setIsLoadingActive(true)
    try {
      const res = await listConversations(gId, { status: 'active' })
      setActiveConvs(res.conversations ?? [])
    } catch {
      // silently ignore
    } finally {
      setIsLoadingActive(false)
    }
  }

  async function loadArchivedConvs(gId: string) {
    setIsLoadingArchived(true)
    try {
      const res = await listConversations(gId, { status: 'archived' })
      setArchivedConvs(res.conversations ?? [])
    } catch {
      // silently ignore
    } finally {
      setIsLoadingArchived(false)
    }
  }

  function loadBothLists(gId: string) {
    loadActiveConvs(gId)
    loadArchivedConvs(gId)
  }

  async function loadConversation(gId: string, convId: string) {
    setIsLoadingConv(true)
    try {
      const conv = await getConversation(gId, convId)
      setActiveConv(conv)
    } catch {
      // Conversation no longer exists (deleted/archived) — clear stale ID so the
      // next send will go through the create-conversation step instead of failing.
      setActiveConv(null)
      setActiveConvId(null)
    } finally {
      setIsLoadingConv(false)
    }
  }

  async function loadLinkedContent(gId: string, convId: string) {
    setIsLoadingLinkedContent(true)
    try {
      const items = await listConversationContent(gId, convId)
      setLinkedContent(items)
      const loreLinks = items.filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
      if (loreLinks.length > 0) {
        const entries = await Promise.allSettled(
          loreLinks.map(l => getLoreEntry(gId, l.content_id))
        )
        const titles: Record<string, string> = {}
        loreLinks.forEach((l, i) => {
          const result = entries[i]
          if (result.status === 'fulfilled') titles[l.content_id] = result.value.Title
        })
        setLoreEntryTitles(prev => ({ ...prev, ...titles }))
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoadingLinkedContent(false)
    }
  }

  async function handleUnlinkContent(linkId: string, contentType: string, contentId: string) {
    if (!gameId || !activeConvId) return
    const convId: string = activeConvId
    setUnlinkingId(linkId)
    try {
      await unlinkConversationContent(gameId, convId, contentType, contentId)
      setLinkedContent(prev => prev.filter(l => l.id !== linkId))
    } catch {
      // silently ignore
    } finally {
      setUnlinkingId(null)
    }
  }

  function handleRetry(turn: { id: string; userMessage: string; detectedType: string | null }) {
    if (!gameId || isStreaming) return
    // If detect-intent already succeeded, skip it and use the resolved type directly.
    // Otherwise fall back to the current selector (may re-run detect-intent).
    const retryType = turn.detectedType ?? selectedRequestType
    // Derive fallback entityType from history (excluding the turn being retried)
    const allResponses = chatHistory
      .filter(t => t.id !== turn.id)
      .flatMap(t => t.responses ?? [])
      .filter(r => r.entityType)
    const fallbackEntityType = allResponses[allResponses.length - 1]?.entityType
    removeTurn(turn.id)
    void runPipeline(
      gameId,
      turn.userMessage,
      activeConvId,
      retryType,
      (newConv) => {
        justCreatedConvIdRef.current = newConv.ID
        setActiveConvs((prev) => [newConv, ...prev])
        setActiveConvId(newConv.ID)
        setActiveConv(newConv)
      },
      (updatedConv) => {
        setActiveConv(updatedConv)
        setActiveConvs((prev) => prev.map((c) => (c.ID === updatedConv.ID ? updatedConv : c)))
      },
      t('llmConversation.errorCreate'),
      t('llmConversation.errorSend'),
      convMainContent || undefined,
      undefined,
      fallbackEntityType || undefined,
    )
  }

  function handleSend() {
    if (!gameId || !message.trim() || isStreaming) return
    const userPrompt = message.trim()
    setMessage('')
    const linkedLoreIds = linkedContent
      .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
      .map(l => l.content_id)
    // Fall back to the last known entityType from history when the current turn
    // doesn't produce one (e.g. "update the current content" follow-up requests)
    const allResponses = chatHistory.flatMap(t => t.responses ?? []).filter(r => r.entityType)
    const fallbackEntityType = allResponses[allResponses.length - 1]?.entityType
    // Build history context from completed turns to help intent detection
    const historyContext = chatHistory
      .filter(t => t.done && t.detectedType && !t.error)
      .map(t => ({
        user_prompt: t.userMessage,
        request_type: t.detectedType!,
      }))
    void runPipeline(
      gameId,
      userPrompt,
      activeConvId,
      selectedRequestType,
      (newConv) => {
        justCreatedConvIdRef.current = newConv.ID
        setActiveConvs((prev) => [newConv, ...prev])
        setActiveConvId(newConv.ID)
        setActiveConv(newConv)
      },
      (updatedConv) => {
        setActiveConv(updatedConv)
        setActiveConvs((prev) => prev.map((c) => (c.ID === updatedConv.ID ? updatedConv : c)))
      },
      t('llmConversation.errorCreate'),
      t('llmConversation.errorSend'),
      convMainContent || undefined,
      linkedLoreIds.length > 0 ? linkedLoreIds : undefined,
      fallbackEntityType || undefined,
      historyContext.length > 0 ? historyContext : undefined,
    )
  }
  async function handleSaveTitle() {
    if (!gameId || !activeConv || !editTitleValue.trim()) {
      setEditingTitle(false)
      return
    }
    try {
      const updated = await updateConversation(gameId, activeConv.ID, { title: editTitleValue.trim() })
      setActiveConv(updated)
      setActiveConvs((prev) => prev.map((c) => (c.ID === updated.ID ? updated : c)))
      setArchivedConvs((prev) => prev.map((c) => (c.ID === updated.ID ? updated : c)))
    } catch {
      toast({ title: t('llmConversation.errorUpdate'), variant: 'destructive' })
    } finally {
      setEditingTitle(false)
    }
  }

  async function handleSaveGoal() {
    if (!gameId || !activeConv || !editGoalValue.trim()) {
      setEditingGoal(false)
      return
    }
    try {
      const updated = await updateConversation(gameId, activeConv.ID, { goal: editGoalValue.trim() })
      setActiveConv(updated)
    } catch {
      toast({ title: t('llmConversation.errorUpdate'), variant: 'destructive' })
    } finally {
      setEditingGoal(false)
    }
  }


  async function handleArchive(conv: Conversation) {
    if (!gameId) return
    try {
      const archived = await archiveConversation(gameId, conv.ID)
      setActiveConvs((prev) => prev.filter((c) => c.ID !== conv.ID))
      setArchivedConvs((prev) => [archived, ...prev])
      if (activeConvId === conv.ID) {
        setActiveConvId(null)
        setActiveConv(null)
      }
      toast({ title: t('llmConversation.archived') })
    } catch {
      toast({ title: t('llmConversation.errorArchive'), variant: 'destructive' })
    }
  }

  async function handleUnarchive(conv: Conversation) {
    if (!gameId) return
    try {
      const restored = await unarchiveConversation(gameId, conv.ID)
      setArchivedConvs((prev) => prev.filter((c) => c.ID !== conv.ID))
      setActiveConvs((prev) => [restored, ...prev])
      toast({ title: t('llmConversation.unarchived') })
    } catch {
      toast({ title: t('llmConversation.errorUnarchive'), variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!gameId || !deleteTarget) return
    try {
      await deleteConversation(gameId, deleteTarget.ID)
      safeRemoveItem(lsConvHistory(deleteTarget.ID))
      safeRemoveItem(lsLoreLinks(deleteTarget.ID))
      const remainingActive = activeConvs.filter((c) => c.ID !== deleteTarget.ID)
      const remainingArchived = archivedConvs.filter((c) => c.ID !== deleteTarget.ID)
      setActiveConvs(remainingActive)
      setArchivedConvs(remainingArchived)
      if (activeConvId === deleteTarget.ID) {
        safeRemoveItem(lsActiveConv(gameId))
        const fallback = remainingActive[0] ?? remainingArchived[0]
        setActiveConvId(fallback?.ID ?? null)
        setActiveConv(null)
      }
      toast({ title: t('llmConversation.deleted') })
    } catch {
      toast({ title: t('llmConversation.errorDelete'), variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleCreateRecords() {
    if (!gameId || !activeConvId) return
    setIsCreatingRecords(true)
    try {
      const loreEntryIds = linkedContent
        .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
        .map(l => l.content_id)
      const result = await createRecordsFromConversation(
        gameId,
        activeConvId,
        loreEntryIds.length > 0 ? loreEntryIds : undefined,
      )
      toast({ title: t('llmConversation.recordsCreated').replace('{count}', String(result.created_count)) })
      // Refresh conversation and linked content
      await loadConversation(gameId, activeConvId)
      void loadLinkedContent(gameId, activeConvId)
    } catch {
      toast({ title: t('llmConversation.errorCreateRecords'), variant: 'destructive' })
    } finally {
      setIsCreatingRecords(false)
      setCreateRecordsConfirmOpen(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Wrapper handlers for sub-components
  // ---------------------------------------------------------------------------
  function handleRetryResponse(
    turnId: string,
    responseIdx: number,
    intentType: string,
    userMessage: string,
  ) {
    if (!gameId || !activeConvId) return
    void retryResponse(
      gameId,
      activeConvId,
      turnId,
      responseIdx,
      intentType,
      userMessage,
      t('llmConversation.errorSend'),
      convMainContent || undefined,
    )
  }

  const VALID_LORE_TYPES = ['world', 'region', 'faction', 'character', 'item_lore', 'event', 'creature', 'custom']

  function handleOpenLoreReview(turn: ChatTurn, idx: number, responseText: string, entityType: string) {
    const parsed = parseLoreResponse(responseText)
    const defaultType = VALID_LORE_TYPES.includes(entityType) ? entityType : 'custom'
    setLoreDraftReviewTurn(turn)
    setLoreDraftReviewResponseIdx(idx)
    setLoreDraftForm({
      lore_type: defaultType,
      title: parsed.title,
      summary: parsed.summary,
      content: parsed.content,
    })
    setLoreDraftReviewOpen(true)
  }

  async function handleCreateLoreRecords(matchedLoreId?: string) {
    if (!gameId || !activeConvId || !loreDraftReviewTurn) return
    setIsCreatingLoreRecords(true)
    try {
      const loreBody = {
        lore_type: VALID_LORE_TYPES.includes(loreDraftForm.lore_type) ? loreDraftForm.lore_type : 'custom',
        title: loreDraftForm.title,
        summary: loreDraftForm.summary,
        content: loreDraftForm.content,
      }
      const entry: LoreEntry = matchedLoreId
        ? await updateLoreEntry(gameId, matchedLoreId, loreBody)
        : await createLoreEntry(gameId, loreBody)
      // Link lore to conversation
      await linkConversationContent(gameId, activeConvId, 'lore', entry.ID)
      // Persist the lore ID link
      const linkKey = `${loreDraftReviewTurn.id}:${loreDraftReviewResponseIdx}`
      const updated = { ...savedLoreIds, [linkKey]: entry.ID }
      setSavedLoreIds(updated)
      safeSetItem(lsLoreLinks(activeConvId), JSON.stringify(updated))
      // Refresh linked content
      void loadLinkedContent(gameId, activeConvId)
      toast({ title: t('llmConversation.loreCreated') })
      setLoreDraftReviewOpen(false)
    } catch {
      toast({ title: t('llmConversation.errorCreateLore'), variant: 'destructive' })
    } finally {
      setIsCreatingLoreRecords(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Don't render when not on a game page, or before client hydration
  // ---------------------------------------------------------------------------
  if (!gameId || !mounted) return null

  // ---------------------------------------------------------------------------
  // Minimized state — floating button
  // ---------------------------------------------------------------------------
  if (!isOpen || isMinimized) {
    return (
      <button
        id="conv-panel-minimized-btn"
        onClick={() => { setIsOpen(true); setIsMinimized(false) }}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        title={t('llmConversation.title')}
      >
        <Bot className="h-5 w-5" />
      </button>
    )
  }

  // ---------------------------------------------------------------------------
  // Full panel
  // ---------------------------------------------------------------------------
  return (
    <>
      <div
        id="conv-panel-root"
        className="fixed right-0 top-14 lg:top-[60px] z-40 flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-60px)] flex-col border-l bg-background shadow-2xl"
        style={{ width: panelWidth }}
      >
        {/* Resize handle (left edge) */}
        <div
          id="conv-panel-resize-left"
          onMouseDown={handleResizeMouseDown}
          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-muted border-r border-l hover:bg-primary/40 transition-colors z-10 flex flex-col items-center justify-center gap-1 group"
        >
          <span id="conv-panel-resize-left-dot-1" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
          <span id="conv-panel-resize-left-dot-2" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
          <span id="conv-panel-resize-left-dot-3" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
        </div>

        {/* Body: sidebar + conversation view */}
        <div id="conv-panel-body" className="flex flex-1 min-h-0">
          <ConversationSidebar
            sidebarWidth={sidebarWidth}
            sidebarBodyRef={sidebarBodyRef}
            handleSidebarResizeMouseDown={handleSidebarResizeMouseDown}
            activeSectionHeight={activeSectionHeight}
            handleSplitResizeMouseDown={handleSplitResizeMouseDown}
            isArchivedCollapsed={isArchivedCollapsed}
            setIsArchivedCollapsed={setIsArchivedCollapsed}
            activeConvs={activeConvs}
            archivedConvs={archivedConvs}
            activeConvId={activeConvId}
            isLoadingActive={isLoadingActive}
            isLoadingArchived={isLoadingArchived}
            onSelectConv={(convId) => { clearHistory(); setActiveConvId(convId) }}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            t={t}
          />

          {/* Conversation view */}
          <div id="conv-panel-view" className="flex flex-1 flex-col min-w-0">
            {!activeConv && !isLoadingConv && !isStreaming && chatHistory.length === 0 ? (
              <div id="conv-panel-empty-state" className="flex flex-1 items-center justify-center p-4 text-center relative">
                <Button
                  id="conv-panel-btn-close"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7"
                  onClick={() => setIsOpen(false)}
                  title={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div id="conv-panel-empty-state-inner">
                  <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p id="conv-panel-empty-state-text" className="text-xs text-muted-foreground">{t('llmConversation.selectOrCreate')}</p>
                </div>
              </div>
            ) : isLoadingConv && !isStreaming ? (
              <div id="conv-panel-loading-state" className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {activeConv && (
                  <ConversationHeader
                    activeConv={activeConv}
                    activeConvId={activeConvId}
                    chatHistory={chatHistory}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    editTitleValue={editTitleValue}
                    setEditTitleValue={setEditTitleValue}
                    onSaveTitle={handleSaveTitle}
                    onBack={() => { setActiveConvId(null); setActiveConv(null) }}
                    onClose={() => setIsOpen(false)}
                    onArchive={handleArchive}
                    onDelete={(conv) => setDeleteTarget(conv)}
                    onOpenDetail={() => setDetailOpen(true)}
                    t={t}
                  />
                )}

                <ConversationChatHistory
                  chatHistory={chatHistory}
                  isStreaming={isStreaming}
                  gameId={gameId}
                  activeConvId={activeConvId}
                  savedLoreIds={savedLoreIds}
                  loreEntryTitles={loreEntryTitles}
                  isCreatingRecords={isCreatingRecords}
                  onRetry={handleRetry}
                  onRetryResponse={handleRetryResponse}
                  onSaveToGame={() => setCreateRecordsConfirmOpen(true)}
                  onOpenLoreReview={handleOpenLoreReview}
                  t={t}
                />
              </>
            )}

            {activeConvId && (linkedContent.length > 0 || isLoadingLinkedContent) && (
              <ConversationLinkedContent
                gameId={gameId}
                linkedContent={linkedContent}
                isLoadingLinkedContent={isLoadingLinkedContent}
                unlinkingId={unlinkingId}
                loreEntryTitles={loreEntryTitles}
                onUnlink={(linkId, contentType, contentId) => { void handleUnlinkContent(linkId, contentType, contentId) }}
                t={t}
              />
            )}

            <ConversationInputArea
              message={message}
              setMessage={setMessage}
              isStreaming={isStreaming}
              requestTypes={requestTypes}
              selectedRequestType={selectedRequestType}
              setSelectedRequestType={setSelectedRequestType}
              autoDetectedType={autoDetectedType}
              setAutoDetectedType={setAutoDetectedType}
              onSend={handleSend}
              t={t}
            />
          </div>
        </div>
      </div>

      <ConversationDialogs
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        chatHistory={chatHistory}
        activeConv={activeConv}
        convMainContent={convMainContent}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        onDelete={handleDelete}
        createRecordsConfirmOpen={createRecordsConfirmOpen}
        setCreateRecordsConfirmOpen={setCreateRecordsConfirmOpen}
        isCreatingRecords={isCreatingRecords}
        onCreateRecords={handleCreateRecords}
        gameId={gameId}
        loreDraftReviewOpen={loreDraftReviewOpen}
        setLoreDraftReviewOpen={setLoreDraftReviewOpen}
        loreDraftForm={loreDraftForm}
        setLoreDraftForm={setLoreDraftForm}
        isCreatingLoreRecords={isCreatingLoreRecords}
        onCreateLoreRecords={handleCreateLoreRecords}
        t={t}
      />
    </>
  )
}
