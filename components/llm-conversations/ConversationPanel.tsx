'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import {
  Archive,
  ArchiveRestore,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Minus,
  MoreVertical,
  Pencil,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  listRequestTypes,
} from '@/lib/llm-conversation-api'
import { useChatPipeline } from '@/hooks/use-chat-pipeline'
import type { Conversation, RequestType } from '@/types/llm-conversation'

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
const LS_PANEL_OPEN = 'ss_conv_panel_open'
const LS_PANEL_MINIMIZED = 'ss_conv_panel_minimized'
const LS_PANEL_WIDTH = 'ss_conv_panel_width'
const LS_SIDEBAR_WIDTH = 'ss_conv_sidebar_width'
const LS_SIDEBAR_SPLIT = 'ss_conv_sidebar_split'
const lsActiveConv = (gameId: string) => `ss_conv_active_${gameId}`
const lsConvHistory = (convId: string) => `ss_conv_history_${convId}`

const PANEL_MIN_WIDTH = 320
const PANEL_MAX_WIDTH = 1200
const PANEL_DEFAULT_WIDTH = 380

const SIDEBAR_MIN_WIDTH = 100
const SIDEBAR_MAX_WIDTH = 500
const SIDEBAR_DEFAULT_WIDTH = 140

const SPLIT_MIN = 60
const SPLIT_DEFAULT = 180

// ---------------------------------------------------------------------------
// Helper to extract game_id from pathname "/games/[id]/..."
// ---------------------------------------------------------------------------
function extractGameId(pathname: string): string | null {
  const match = pathname.match(/^\/games\/([^/]+)/)
  return match ? match[1] : null
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LLMConversationPanel() {
  const pathname = usePathname()
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
  const { isRunning: isStreaming, chatHistory, send: runPipeline, clearHistory, loadHistory, removeTurn } = useChatPipeline()

  // Request type selector
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([])
  const [selectedRequestType, setSelectedRequestType] = useState<string>('auto')
  // When selectedRequestType was resolved by auto-detection, stores the detected key so
  // the trigger can display "Auto - [label]" instead of just the label.
  const [autoDetectedType, setAutoDetectedType] = useState<string | null>(null)
  const [autoDetectedEntityType, setAutoDetectedEntityType] = useState<string | null>(null)
  // Tracks whether the most recent send used auto mode, so the chatHistory watcher
  // knows when to apply the auto-detection label update.
  const sentWithAutoRef = useRef(false)

  // Archive/delete dialogs
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)

  // Panel width (horizontal resize)
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = safeGetItem(LS_PANEL_WIDTH)
    const parsed = saved ? parseInt(saved, 10) : NaN
    return isNaN(parsed) ? PANEL_DEFAULT_WIDTH : Math.min(Math.max(parsed, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH)
  })
  const isResizingRef = useRef(false)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(0)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = panelWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return
      // Panel is anchored to the right; dragging left increases width
      const delta = resizeStartXRef.current - ev.clientX
      const newWidth = Math.min(Math.max(resizeStartWidthRef.current + delta, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH)
      setPanelWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [panelWidth])

  useEffect(() => { safeSetItem(LS_PANEL_WIDTH, String(panelWidth)) }, [panelWidth])

  // Sidebar width (horizontal resize)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = safeGetItem(LS_SIDEBAR_WIDTH)
    const parsed = saved ? parseInt(saved, 10) : NaN
    return isNaN(parsed) ? SIDEBAR_DEFAULT_WIDTH : Math.min(Math.max(parsed, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
  })
  const isSidebarResizingRef = useRef(false)
  const sidebarResizeStartXRef = useRef(0)
  const sidebarResizeStartWidthRef = useRef(0)

  const handleSidebarResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isSidebarResizingRef.current = true
    sidebarResizeStartXRef.current = e.clientX
    sidebarResizeStartWidthRef.current = sidebarWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isSidebarResizingRef.current) return
      const delta = ev.clientX - sidebarResizeStartXRef.current
      const newWidth = Math.min(Math.max(sidebarResizeStartWidthRef.current + delta, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH)
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      isSidebarResizingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

  useEffect(() => { safeSetItem(LS_SIDEBAR_WIDTH, String(sidebarWidth)) }, [sidebarWidth])

  // Sidebar vertical split (active section height)
  const [activeSectionHeight, setActiveSectionHeight] = useState<number>(() => {
    const saved = safeGetItem(LS_SIDEBAR_SPLIT)
    const parsed = saved ? parseInt(saved, 10) : NaN
    return isNaN(parsed) ? SPLIT_DEFAULT : Math.max(parsed, SPLIT_MIN)
  })
  const isSplitResizingRef = useRef(false)
  const splitResizeStartYRef = useRef(0)
  const splitResizeStartHeightRef = useRef(0)
  const sidebarBodyRef = useRef<HTMLDivElement>(null)

  const handleSplitResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isSplitResizingRef.current = true
    splitResizeStartYRef.current = e.clientY
    splitResizeStartHeightRef.current = activeSectionHeight

    const onMouseMove = (ev: MouseEvent) => {
      if (!isSplitResizingRef.current) return
      const delta = ev.clientY - splitResizeStartYRef.current
      const containerHeight = sidebarBodyRef.current?.clientHeight ?? 0
      const maxHeight = containerHeight > 0 ? containerHeight - SPLIT_MIN - 4 : 9999
      const newHeight = Math.min(Math.max(splitResizeStartHeightRef.current + delta, SPLIT_MIN), maxHeight)
      setActiveSectionHeight(newHeight)
    }

    const onMouseUp = () => {
      isSplitResizingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [activeSectionHeight])

  useEffect(() => { safeSetItem(LS_SIDEBAR_SPLIT, String(activeSectionHeight)) }, [activeSectionHeight])

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
    if (!sentWithAutoRef.current) return
    const lastTurn = chatHistory[chatHistory.length - 1]
    if (lastTurn?.done && lastTurn.detectedType && !lastTurn.error) {
      setAutoDetectedType(lastTurn.detectedType)
      setAutoDetectedEntityType(lastTurn.detectedEntityType ?? null)
      sentWithAutoRef.current = false
    }
  }, [chatHistory])

  // ---------------------------------------------------------------------------
  // Persist UI state to localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => { safeSetItem(LS_PANEL_OPEN, String(isOpen)) }, [isOpen])
  useEffect(() => { safeSetItem(LS_PANEL_MINIMIZED, String(isMinimized)) }, [isMinimized])

  // Persist completed chat turns for the active conversation
  useEffect(() => {
    if (!activeConvId || chatHistory.length === 0) return
    const completedTurns = chatHistory.filter((t) => t.done)
    if (completedTurns.length > 0) {
      safeSetItem(lsConvHistory(activeConvId), JSON.stringify(completedTurns))
    }
  }, [chatHistory, activeConvId])

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
      clearHistory()
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
    loadConversation(gameId, activeConvId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, gameId])

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

  function handleRetry(turn: { id: string; userMessage: string; detectedType: string | null; detectedEntityType: string | null }) {
    if (!gameId || isStreaming) return
    // If detect-intent already succeeded, skip it and use the resolved type directly.
    // Otherwise fall back to the current selector (may re-run detect-intent).
    const retryType = turn.detectedType ?? selectedRequestType
    const retryEntityType = turn.detectedEntityType ?? undefined
    removeTurn(turn.id)
    sentWithAutoRef.current = retryType === 'auto'
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
      retryEntityType,
    )
  }

  function handleSend() {
    if (!gameId || !message.trim() || isStreaming) return
    const userPrompt = message.trim()
    sentWithAutoRef.current = selectedRequestType === 'auto'
    setMessage('')
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
      const remainingActive = activeConvs.filter((c) => c.ID !== deleteTarget.ID)
      const remainingArchived = archivedConvs.filter((c) => c.ID !== deleteTarget.ID)
      setActiveConvs(remainingActive)
      setArchivedConvs(remainingArchived)
      if (activeConvId === deleteTarget.ID) {
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
        onClick={() => {
          setIsOpen(true)
          setIsMinimized(false)
        }}
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
      <div id="conv-panel-root" className="fixed right-0 top-14 lg:top-[60px] z-40 flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-60px)] flex-col border-l bg-background shadow-2xl" style={{ width: panelWidth }}>
        {/* ── Resize handle (left edge) ── */}
        <div
          id="conv-panel-resize-left"
          onMouseDown={handleResizeMouseDown}
          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-muted border-r border-l hover:bg-primary/40 transition-colors z-10 flex flex-col items-center justify-center gap-1 group"
        >
          <span id="conv-panel-resize-left-dot-1" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
          <span id="conv-panel-resize-left-dot-2" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
          <span id="conv-panel-resize-left-dot-3" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
        </div>
        {/* ── Body: sidebar + conversation view ── */}
        <div id="conv-panel-body" className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div id="conv-panel-sidebar" className="relative flex shrink-0 flex-col border-r" style={{ width: sidebarWidth }}>
            {/* Two stacked sections with vertical drag divider */}
            <div ref={sidebarBodyRef} id="conv-panel-sidebar-body" className="flex flex-1 flex-col min-h-0 overflow-hidden">
              {/* Active section */}
              <div id="conv-panel-active-section" className="flex flex-col overflow-hidden" style={{ height: activeSectionHeight }}>
                <div id="conv-panel-active-header" className="flex h-7 shrink-0 items-center border-b bg-muted/40 px-2">
                  <span id="conv-panel-active-label" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('llmConversation.tabActive')}
                  </span>
                  {isLoadingActive && <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <ScrollArea className="flex-1">
                  {!isLoadingActive && activeConvs.length === 0 ? (
                    <p id="conv-panel-active-empty" className="p-2.5 text-xs text-muted-foreground">{t('llmConversation.noConversations')}</p>
                  ) : (
                    <ul id="conv-panel-active-list" className="py-0.5 w-full">
                      {activeConvs.map((conv) => (
                        <li id={`conv-panel-active-item-${conv.ID}`} key={conv.ID} className={['group grid grid-cols-[1fr_auto] w-full', conv.ID === activeConvId ? 'bg-accent' : ''].join(' ')}>
                          <button
                            id={`conv-panel-active-btn-${conv.ID}`}
                            onClick={() => { clearHistory(); setActiveConvId(conv.ID) }}
                            className={[
                              'min-w-0 overflow-hidden text-left pl-2.5 py-1.5 text-xs leading-tight hover:bg-accent transition-colors',
                              conv.ID === activeConvId ? 'font-medium' : '',
                            ].join(' ')}
                          >
                            <div id={`conv-panel-active-title-${conv.ID}`} className="truncate">{conv.Title}</div>
                          </button>
                          <button
                            id={`conv-panel-active-archive-btn-${conv.ID}`}
                            onClick={(e) => { e.stopPropagation(); handleArchive(conv) }}
                            className={[
                              'mr-1 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100',
                              conv.ID === activeConvId ? 'opacity-100' : '',
                            ].join(' ')}
                            title={t('llmConversation.archive')}
                          >
                            <Archive className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>

              {/* Vertical drag divider */}
              <div
                id="conv-panel-resize-vertical"
                onMouseDown={handleSplitResizeMouseDown}
                className="flex h-1.5 shrink-0 cursor-ns-resize items-center justify-center gap-1 border-y bg-muted hover:bg-primary/30 transition-colors group"
              >
                <span id="conv-panel-resize-vertical-dot-1" className="h-0.5 w-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
                <span id="conv-panel-resize-vertical-dot-2" className="h-0.5 w-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
                <span id="conv-panel-resize-vertical-dot-3" className="h-0.5 w-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
              </div>

              {/* Archived section */}
              <div id="conv-panel-archived-section" className="flex flex-1 flex-col overflow-hidden min-h-0">
                <div id="conv-panel-archived-header" className="flex h-7 shrink-0 items-center border-b bg-muted/40 px-2">
                  <span id="conv-panel-archived-label" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('llmConversation.tabArchived')}
                  </span>
                  {isLoadingArchived && <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <ScrollArea className="flex-1">
                  {!isLoadingArchived && archivedConvs.length === 0 ? (
                    <p id="conv-panel-archived-empty" className="p-2.5 text-xs text-muted-foreground">{t('llmConversation.noConversations')}</p>
                  ) : (
                    <ul id="conv-panel-archived-list" className="py-0.5 w-full">
                      {archivedConvs.map((conv) => (
                        <li id={`conv-panel-archived-item-${conv.ID}`} key={conv.ID} className={['group grid grid-cols-[1fr_auto] w-full', conv.ID === activeConvId ? 'bg-accent' : ''].join(' ')}>
                          <button
                            id={`conv-panel-archived-btn-${conv.ID}`}
                            onClick={() => { clearHistory(); setActiveConvId(conv.ID) }}
                            className={[
                              'min-w-0 overflow-hidden text-left pl-2.5 py-1.5 text-xs leading-tight hover:bg-accent transition-colors opacity-70',
                              conv.ID === activeConvId ? 'font-medium opacity-100' : '',
                            ].join(' ')}
                          >
                            <div id={`conv-panel-archived-title-${conv.ID}`} className="truncate">{conv.Title}</div>
                          </button>
                          <button
                            id={`conv-panel-archived-unarchive-btn-${conv.ID}`}
                            onClick={(e) => { e.stopPropagation(); handleUnarchive(conv) }}
                            className={[
                              'mr-0.5 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100',
                              conv.ID === activeConvId ? 'opacity-100' : '',
                            ].join(' ')}
                            title={t('llmConversation.unarchive')}
                          >
                            <ArchiveRestore className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Horizontal resize handle (right edge) */}
            <div
              id="conv-panel-resize-right"
              onMouseDown={handleSidebarResizeMouseDown}
              className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-muted border-l border-r hover:bg-primary/40 transition-colors z-10 flex flex-col items-center justify-center gap-1 group"
            >
              <span id="conv-panel-resize-right-dot-1" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
              <span id="conv-panel-resize-right-dot-2" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
              <span id="conv-panel-resize-right-dot-3" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
            </div>
          </div>

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
                {/* Conv header — only when conversation is loaded */}
                {activeConv && <div id="conv-panel-conv-header" className="shrink-0 border-b px-3 py-2 space-y-1">
                  {/* Title row */}
                  <div id="conv-panel-title-row" className="flex items-start justify-between gap-1">
                    {/* Back to list */}
                    <Button
                      id="conv-panel-btn-back"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => { setActiveConvId(null); setActiveConv(null) }}
                      title={t('llmConversation.backToList')}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {editingTitle ? (
                      <Input
                        id="conv-panel-title-input"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle() }}
                        autoFocus
                        className="text-sm h-7 font-semibold"
                      />
                    ) : (
                      <button
                        id="conv-panel-title-btn"
                        className="flex-1 text-left text-sm font-semibold hover:underline line-clamp-1"
                        onClick={() => { setEditTitleValue(activeConv.Title); setEditingTitle(true) }}
                        title={t('llmConversation.editTitle')}
                      >
                        {activeConv.Title}
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button id="conv-panel-menu-trigger" variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent id="conv-panel-menu-content" align="end">
                        <DropdownMenuItem id="conv-panel-menu-edit-title" onClick={() => { setEditTitleValue(activeConv.Title); setEditingTitle(true) }}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          {t('llmConversation.editTitle')}
                        </DropdownMenuItem>
                        <DropdownMenuItem id="conv-panel-menu-detail" onClick={() => setDetailOpen(true)}>
                          <Info className="mr-2 h-3.5 w-3.5" />
                          Full detail
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!activeConv.ArchivedAt && (
                          <DropdownMenuItem id="conv-panel-menu-archive" onClick={() => handleArchive(activeConv)}>
                            <Archive className="mr-2 h-3.5 w-3.5" />
                            {t('llmConversation.archive')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          id="conv-panel-menu-delete"
                          onClick={() => setDeleteTarget(activeConv)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      id="conv-panel-btn-close"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setIsOpen(false)}
                      title={t('common.close')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Goal row — hidden */}
                </div>}

                {/* Sticky meta bar — conversation ID + detected language */}
                {activeConvId && (
                  <div id="conv-panel-meta-row" className="shrink-0 flex items-center justify-between gap-2 border-b bg-background px-3 py-1">
                    <p id="conv-panel-conv-id" className="text-[10px] text-muted-foreground/50 font-mono truncate">
                      {activeConvId}
                    </p>
                    {(() => {
                      const lang = [...chatHistory].reverse().find((t) => t.detectedLanguage)?.detectedLanguage ?? 'en'
                      return (
                        <span id="conv-panel-detected-lang" className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
                          {lang}
                        </span>
                      )
                    })()}
                  </div>
                )}

                {/* Scrollable content area */}
                <ScrollArea id="conv-panel-content-scroll" className="flex-1 px-3 py-2">
                  {/* Chat history */}
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
                              <p id={`conv-panel-ai-error-${turn.id}`} className="text-xs text-destructive">
                                {turn.error}
                              </p>
                              <button
                                id={`conv-panel-ai-retry-btn-${turn.id}`}
                                onClick={() => handleRetry(turn)}
                                disabled={isStreaming}
                                className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                                title="Retry"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Retry
                              </button>
                            </div>
                          ) : turn.responseText ? (
                            <p id={`conv-panel-ai-text-${turn.id}`} className="text-xs leading-relaxed whitespace-pre-wrap">
                              {turn.responseText}
                              {!turn.done && <Loader2 id={`conv-panel-ai-cursor-${turn.id}`} className="inline h-3 w-3 animate-spin ml-1 align-middle text-muted-foreground" />}
                            </p>
                          ) : !turn.done ? (
                            <Loader2 id={`conv-panel-ai-spinner-${turn.id}`} className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}

                </ScrollArea>

              </>
            )}

            {/* Message input — always visible */}
            <div id="conv-panel-input-area" className="shrink-0 border-t p-2">
              <div id="conv-panel-input-box" className="flex flex-col rounded-xl border bg-background">
                {/* Textarea */}
                <Textarea
                  id="conv-panel-message-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('llmConversation.messagePlaceholder')}
                  className="min-h-[60px] resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-xs px-3 py-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
              </div>


              {/* Bottom toolbar: request type + send */}
              <div id="conv-panel-input-toolbar" className="flex items-center gap-1.5 pt-1.5">
                  <Select
                    value={selectedRequestType}
                    onValueChange={(v) => { setSelectedRequestType(v); setAutoDetectedType(null); setAutoDetectedEntityType(null) }}
                    disabled={isStreaming || requestTypes.length === 0}
                  >
                    <SelectTrigger id="conv-panel-request-type-trigger" className="h-7 text-xs flex-1">
                      <span id="conv-panel-request-type-value" className="flex-1 text-left truncate">
                        {(() => {
                          if (autoDetectedType && selectedRequestType === 'auto') {
                            const detectedLabel = t(`llmConversation.requestTypes.${autoDetectedType}`) || (requestTypes.find((rt) => rt.key === autoDetectedType)?.label ?? autoDetectedType)
                            const entityLabel = autoDetectedEntityType
                              ? (t(`llmConversation.entityTypes.${autoDetectedEntityType}`) || autoDetectedEntityType)
                              : null
                            return entityLabel
                              ? `Auto - ${detectedLabel} - ${entityLabel}`
                              : `Auto - ${detectedLabel}`
                          }
                          return t(`llmConversation.requestTypes.${selectedRequestType}`) || (requestTypes.find((rt) => rt.key === selectedRequestType)?.label ?? selectedRequestType)
                        })()}
                      </span>
                    </SelectTrigger>
                    <SelectContent id="conv-panel-request-type-content">
                      {requestTypes.map((rt) => (
                        <SelectItem id={`conv-panel-request-type-option-${rt.key}`} key={rt.key} value={rt.key} className="text-xs">
                          {t(`llmConversation.requestTypes.${rt.key}`) || rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    id="conv-panel-send-btn"
                    size="sm"
                    className="h-7 px-3 rounded-lg shrink-0 gap-1.5"
                    disabled={isStreaming || !message.trim()}
                    onClick={() => handleSend()}
                  >
                    {isStreaming ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {t('llmConversation.send')}
                  </Button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full detail dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent id="conv-panel-detail-dialog" className="max-w-lg">
          <DialogHeader>
            <DialogTitle id="conv-panel-detail-dialog-title">Conversation Detail</DialogTitle>
          </DialogHeader>
          <ScrollArea id="conv-panel-detail-scroll" className="max-h-[65vh] pr-2">
            <div id="conv-panel-detail-body" className="space-y-4 text-xs">

              {/* Goals / intents sent to backend */}
              <section id="conv-panel-detail-goals-section">
                <p id="conv-panel-detail-goals-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Goals sent with each request</p>
                {(() => {
                  const goals = [...new Set(chatHistory.filter((t) => t.detectedGoal).map((t) => t.detectedGoal!))]
                  return goals.length === 0 ? (
                    <p id="conv-panel-detail-goals-empty" className="text-muted-foreground italic">No goals detected yet.</p>
                  ) : (
                    <ol id="conv-panel-detail-goals-list" className="space-y-1 list-decimal list-inside">
                      {goals.map((g, i) => (
                        <li id={`conv-panel-detail-goal-${i}`} key={i} className="bg-muted rounded px-2 py-1 leading-snug">{g}</li>
                      ))}
                    </ol>
                  )
                })()}
              </section>

              {/* Conversation metadata */}
              {activeConv && (
                <section id="conv-panel-detail-meta-section">
                  <p id="conv-panel-detail-meta-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Conversation</p>
                  <div id="conv-panel-detail-meta-grid" className="space-y-1">
                    <div id="conv-panel-detail-meta-id" className="flex gap-2">
                      <span id="conv-panel-detail-meta-id-key" className="text-muted-foreground w-16 shrink-0">ID</span>
                      <span id="conv-panel-detail-meta-id-val" className="font-mono break-all">{activeConv.ID}</span>
                    </div>
                    <div id="conv-panel-detail-meta-title" className="flex gap-2">
                      <span id="conv-panel-detail-meta-title-key" className="text-muted-foreground w-16 shrink-0">Title</span>
                      <span id="conv-panel-detail-meta-title-val">{activeConv.Title}</span>
                    </div>
                    <div id="conv-panel-detail-meta-goal" className="flex gap-2">
                      <span id="conv-panel-detail-meta-goal-key" className="text-muted-foreground w-16 shrink-0">Goal</span>
                      <span id="conv-panel-detail-meta-goal-val">{activeConv.Goal || '—'}</span>
                    </div>
                    <div id="conv-panel-detail-meta-status" className="flex gap-2">
                      <span id="conv-panel-detail-meta-status-key" className="text-muted-foreground w-16 shrink-0">Status</span>
                      <span id="conv-panel-detail-meta-status-val">{activeConv.ArchivedAt ? 'archived' : 'active'}</span>
                    </div>
                    <div id="conv-panel-detail-meta-created" className="flex gap-2">
                      <span id="conv-panel-detail-meta-created-key" className="text-muted-foreground w-16 shrink-0">Created</span>
                      <span id="conv-panel-detail-meta-created-val">{new Date(activeConv.CreatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Turn history */}
              {chatHistory.length > 0 && (
                <section id="conv-panel-detail-turns-section">
                  <p id="conv-panel-detail-turns-label" className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Turn history ({chatHistory.length})</p>
                  <div id="conv-panel-detail-turns-list" className="space-y-2">
                    {chatHistory.map((turn, i) => (
                      <div id={`conv-panel-detail-turn-${turn.id}`} key={turn.id} className="rounded border p-2 space-y-0.5">
                        <p id={`conv-panel-detail-turn-user-${turn.id}`} className="font-medium truncate">{i + 1}. {turn.userMessage}</p>
                        {turn.detectedType && (
                          <p id={`conv-panel-detail-turn-type-${turn.id}`} className="text-muted-foreground">Type: <span className="text-foreground">{turn.detectedType}</span></p>
                        )}
                        {turn.detectedGoal && (
                          <p id={`conv-panel-detail-turn-goal-${turn.id}`} className="text-muted-foreground">Goal: <span className="text-foreground">{turn.detectedGoal}</span></p>
                        )}
                        {turn.detectedLanguage && (
                          <p id={`conv-panel-detail-turn-lang-${turn.id}`} className="text-muted-foreground">Language: <span className="text-foreground">{turn.detectedLanguage}</span></p>
                        )}
                        {turn.detectedEntityType && (
                          <p id={`conv-panel-detail-turn-entity-${turn.id}`} className="text-muted-foreground">Entity: <span className="text-foreground">{turn.detectedEntityType}</span></p>
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
            <AlertDialogAction id="conv-panel-delete-confirm-btn" onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </>
  )
}
