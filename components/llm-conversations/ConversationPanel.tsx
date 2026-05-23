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
  ChevronRight,
  Loader2,
  Minus,
  MoreVertical,
  Pencil,
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
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/lib/i18n/use-translation'
import { safeGetItem, safeSetItem } from '@/lib/storage-utils'
import {
  listConversations,
  createConversation,
  getConversation,
  updateConversation,
  submitRequest,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  createRecordsFromConversation,
  listRequestTypes,
} from '@/lib/llm-conversation-api'
import type { Conversation, ItemDraft, LoreDraft, RequestType } from '@/types/llm-conversation'
import { ApiError } from '@/lib/api-client'

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
const LS_PANEL_OPEN = 'ss_conv_panel_open'
const LS_PANEL_MINIMIZED = 'ss_conv_panel_minimized'
const LS_PANEL_WIDTH = 'ss_conv_panel_width'
const LS_SIDEBAR_WIDTH = 'ss_conv_sidebar_width'
const LS_SIDEBAR_SPLIT = 'ss_conv_sidebar_split'
const lsActiveConv = (gameId: string) => `ss_conv_active_${gameId}`

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
// Rarity badge color map
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  uncommon: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  legendary: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const pollingRequestSentAtRef = useRef<string | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Archive/delete dialogs

  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)

  // Create records dialog
  const [showCreateRecordsConfirm, setShowCreateRecordsConfirm] = useState(false)
  const [isCreatingRecords, setIsCreatingRecords] = useState(false)

  // Request types (fetched from API, mapped to i18n labels)
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([])
  const [selectedRequestType, setSelectedRequestType] = useState<string>('auto')
  // Detected request type from the last submit response (scoped to active conversation)
  const [convDetectedType, setConvDetectedType] = useState<string | null>(null)

  // Intent error: show retry buttons
  const [intentError, setIntentError] = useState(false)

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
  // Persist UI state to localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => { safeSetItem(LS_PANEL_OPEN, String(isOpen)) }, [isOpen])
  useEffect(() => { safeSetItem(LS_PANEL_MINIMIZED, String(isMinimized)) }, [isMinimized])

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
        setSelectedRequestType('auto')
      })
      .catch(() => {
        toast({ title: t('llmConversation.errorLoadRequestTypes'), variant: 'destructive' })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setConvDetectedType(null)
      return
    }
    setConvDetectedType(null)
    safeSetItem(lsActiveConv(gameId), activeConvId)
    loadConversation(gameId, activeConvId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, gameId])

  // ---------------------------------------------------------------------------
  // Stop polling when component unmounts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

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
      setActiveConv(null)
    } finally {
      setIsLoadingConv(false)
    }
  }

  async function handleSend(requestType?: string) {
    if (!gameId || !message.trim()) return
    setIsSubmitting(true)
    setIntentError(false)
    const sentAt = new Date().toISOString()

    // Auto-create a dummy conversation to get an ID if none is active
    let convId = activeConvId
    if (!convId) {
      try {
        const title = message.trim().slice(0, 60)
        const newConv = await createConversation(gameId, { title, goal: message.trim() })
        setActiveConvs((prev) => [newConv, ...prev])
        setActiveConvId(newConv.ID)
        setActiveConv(newConv)
        convId = newConv.ID
      } catch {
        toast({ title: t('llmConversation.errorCreate'), variant: 'destructive' })
        setIsSubmitting(false)
        return
      }
    }

    const resolvedType = requestType ?? (selectedRequestType && selectedRequestType !== 'auto' ? selectedRequestType : undefined)

    try {
      const submitRes = await submitRequest(gameId, convId, {
        user_prompt: message.trim(),
        ...(resolvedType ? { request_type: resolvedType } : {}),
      })
      setConvDetectedType(submitRes.detected_request_type ?? null)
      setMessage('')
      pollingRequestSentAtRef.current = sentAt
      setIsPolling(true)
      startPolling(gameId, convId, sentAt)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setIntentError(true)
      } else {
        toast({ title: t('llmConversation.errorSend'), variant: 'destructive' })
      }
    } finally {
      setIsSubmitting(false)
    }
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

  const startPolling = useCallback((gId: string, convId: string, sentAt: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const conv = await getConversation(gId, convId)
        if (conv.UpdatedAt > sentAt) {
          setActiveConv(conv)
          setActiveConvs((prev) => prev.map((c) => (c.ID === conv.ID ? conv : c)))
          setIsPolling(false)
          pollingRequestSentAtRef.current = null
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        }
      } catch {
        setIsPolling(false)
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      }
    }, 2000)
  }, [])

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

  async function handleCreateRecords() {
    if (!gameId || !activeConv) return
    setIsCreatingRecords(true)
    try {
      const res = await createRecordsFromConversation(gameId, activeConv.ID)
      toast({
        title: t('llmConversation.recordsCreated').replace('{count}', String(res.created_count)),
      })
    } catch {
      toast({ title: t('llmConversation.errorCreateRecords'), variant: 'destructive' })
    } finally {
      setIsCreatingRecords(false)
      setShowCreateRecordsConfirm(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const items: ItemDraft[] = activeConv?.AccumulatedContent?.items ?? []
  const loreEntries: LoreDraft[] = activeConv?.AccumulatedContent?.lore ?? []
  const canCreateItems = items.length > 0

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
        {/* ── Panel header ── */}
        <div id="conv-panel-header" className="flex h-12 shrink-0 items-center justify-between border-b px-3">
          <div id="conv-panel-header-title" className="flex items-center gap-2 font-semibold text-sm">
            <Bot className="h-4 w-4 text-primary" />
            {t('llmConversation.title')}
          </div>
          <div id="conv-panel-header-actions" className="flex items-center gap-1">
            <Button
              id="conv-panel-btn-close"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
              title={t('common.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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
                        <li id={`conv-panel-active-item-${conv.ID}`} key={conv.ID} className="grid grid-cols-[1fr_auto] w-full">
                          <button
                            id={`conv-panel-active-btn-${conv.ID}`}
                            onClick={() => setActiveConvId(conv.ID)}
                            className={[
                              'min-w-0 overflow-hidden text-left pl-2.5 py-1.5 text-xs leading-tight hover:bg-accent transition-colors',
                              conv.ID === activeConvId ? 'bg-accent font-medium' : '',
                            ].join(' ')}
                          >
                            <div id={`conv-panel-active-title-${conv.ID}`} className="truncate">{conv.Title}</div>
                          </button>
                          <button
                            id={`conv-panel-active-archive-btn-${conv.ID}`}
                            onClick={(e) => { e.stopPropagation(); handleArchive(conv) }}
                            className={[
                              'ml-0.5 mr-1 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors',
                              conv.ID === activeConvId ? 'bg-accent' : '',
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
                        <li id={`conv-panel-archived-item-${conv.ID}`} key={conv.ID} className="grid grid-cols-[1fr_auto] w-full">
                          <button
                            id={`conv-panel-archived-btn-${conv.ID}`}
                            onClick={() => setActiveConvId(conv.ID)}
                            className={[
                              'min-w-0 overflow-hidden text-left pl-2.5 py-1.5 text-xs leading-tight hover:bg-accent transition-colors opacity-70',
                              conv.ID === activeConvId ? 'bg-accent font-medium opacity-100' : '',
                            ].join(' ')}
                          >
                            <div id={`conv-panel-archived-title-${conv.ID}`} className="truncate">{conv.Title}</div>
                          </button>
                          <button
                            id={`conv-panel-archived-unarchive-btn-${conv.ID}`}
                            onClick={(e) => { e.stopPropagation(); handleUnarchive(conv) }}
                            className={[
                              'ml-0.5 mr-0.5 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors',
                              conv.ID === activeConvId ? 'bg-accent' : '',
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
            {!activeConv && !isLoadingConv ? (
              <div id="conv-panel-empty-state" className="flex flex-1 items-center justify-center p-4 text-center">
                <div id="conv-panel-empty-state-inner">
                  <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p id="conv-panel-empty-state-text" className="text-xs text-muted-foreground">{t('llmConversation.selectOrCreate')}</p>
                </div>
              </div>
            ) : isLoadingConv ? (
              <div id="conv-panel-loading-state" className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeConv ? (
              <>
                {/* Conv header */}
                <div id="conv-panel-conv-header" className="shrink-0 border-b px-3 py-2 space-y-1">
                  {/* Title row */}
                  <div id="conv-panel-title-row" className="flex items-start justify-between gap-1">
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
                  </div>

                  {/* Goal row — hidden */}
                </div>

                {/* Scrollable content area */}
                <ScrollArea id="conv-panel-content-scroll" className="flex-1 px-3 py-2">
                  {/* Summary */}
                  {activeConv.Summary ? (
                    <div id="conv-panel-summary-box" className="mb-3 rounded-md bg-muted/50 p-2.5">
                      <p id="conv-panel-summary-label" className="text-xs font-medium text-primary mb-1">{t('llmConversation.summary')}</p>
                      <p id="conv-panel-summary-text" className="text-xs leading-relaxed whitespace-pre-wrap">{activeConv.Summary}</p>
                    </div>
                  ) : (
                    <div id="conv-panel-no-summary" className="mb-3 rounded-md border border-dashed p-4 text-center">
                      <Sparkles className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                      <p id="conv-panel-no-summary-text" className="text-xs text-muted-foreground">{t('llmConversation.noSummaryYet')}</p>
                    </div>
                  )}

                  {/* Polling indicator */}
                  {isPolling && (
                    <div id="conv-panel-polling-indicator" className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('llmConversation.processing')}
                    </div>
                  )}

                  {/* Intent error */}
                  {intentError && (
                    <div id="conv-panel-intent-error" className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-2">
                      <p id="conv-panel-intent-error-text" className="text-xs text-destructive">{t('llmConversation.intentError')}</p>
                      <div id="conv-panel-intent-error-actions" className="flex gap-2">
                        <Button
                          id="conv-panel-intent-retry-btn"
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-7"
                          onClick={() => { setIntentError(false); handleSend() }}
                        >
                          {t('common.retry')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Accumulated Items */}
                  {items.length > 0 && (
                    <div id="conv-panel-items-section" className="mb-3">
                      <div id="conv-panel-items-header" className="flex items-center justify-between mb-1.5">
                        <p id="conv-panel-items-label" className="text-xs font-medium">{t('llmConversation.generatedItems')} ({items.length})</p>
                        <Button
                          id="conv-panel-save-to-game-btn"
                          size="sm"
                          variant="default"
                          className="h-6 text-xs px-2"
                          onClick={() => setShowCreateRecordsConfirm(true)}
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          {t('llmConversation.saveToGame')}
                        </Button>
                      </div>
                      <ul id="conv-panel-items-list" className="space-y-1.5">
                        {items.map((item, i) => (
                          <li id={`conv-panel-item-draft-${i}`} key={i} className="rounded border p-2 text-xs">
                            <div id={`conv-panel-item-draft-header-${i}`} className="flex items-center gap-1.5 mb-0.5">
                              <span id={`conv-panel-item-draft-name-${i}`} className="font-medium">{item.name}</span>
                              <span id={`conv-panel-item-draft-rarity-${i}`} className={`rounded px-1 py-0.5 text-[10px] font-medium ${RARITY_COLORS[item.rarity] ?? ''}`}>
                                {item.rarity}
                              </span>
                            </div>
                            <p id={`conv-panel-item-draft-desc-${i}`} className="text-muted-foreground leading-snug">{item.description}</p>
                            {Object.keys(item.attributes ?? {}).length > 0 && (
                              <div id={`conv-panel-item-draft-attrs-${i}`} className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(item.attributes).map(([k, v]) => (
                                  <span id={`conv-panel-item-draft-attr-${i}-${k}`} key={k} className="rounded bg-muted px-1 py-0.5 text-[10px]">
                                    {k}: {v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Accumulated Lore */}
                  {loreEntries.length > 0 && (
                    <div id="conv-panel-lore-section" className="mb-3">
                      <p id="conv-panel-lore-label" className="text-xs font-medium mb-1.5">{t('llmConversation.generatedLore')} ({loreEntries.length})</p>
                      <ul id="conv-panel-lore-list" className="space-y-1.5">
                        {loreEntries.map((entry, i) => (
                          <li id={`conv-panel-lore-entry-${i}`} key={i} className="rounded border p-2 text-xs">
                            <div id={`conv-panel-lore-header-${i}`} className="flex items-center gap-1.5 mb-0.5">
                              <span id={`conv-panel-lore-name-${i}`} className="font-medium">{entry.name}</span>
                              {entry.era && (
                                <span id={`conv-panel-lore-era-${i}`} className="text-muted-foreground">· {entry.era}</span>
                              )}
                            </div>
                            <p id={`conv-panel-lore-desc-${i}`} className="text-muted-foreground leading-snug">{entry.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ScrollArea>

              </>
            ) : null}

            {/* Message input — always visible */}
            <div id="conv-panel-input-area" className="shrink-0 border-t p-2 space-y-1.5">
              {/* Request type selector + conversation detected type */}
              <div id="conv-panel-request-type-row" className="flex gap-1.5 items-center">
                <Select
                  value={selectedRequestType}
                  onValueChange={setSelectedRequestType}
                  disabled={isSubmitting || isPolling || requestTypes.length === 0}
                >
                  <SelectTrigger id="conv-panel-request-type-trigger" className="h-7 text-xs w-1/2">
                    <SelectValue id="conv-panel-request-type-value" placeholder={t('llmConversation.requestTypeLabel')} />
                  </SelectTrigger>
                  <SelectContent id="conv-panel-request-type-content">
                    {requestTypes.map((rt) => (
                      <SelectItem id={`conv-panel-request-type-option-${rt.key}`} key={rt.key} value={rt.key} className="text-xs">
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span
                  id="conv-panel-conv-detected-type"
                  className="w-1/2 h-7 flex items-center px-2 rounded-md border border-dashed text-xs text-muted-foreground truncate"
                  title={convDetectedType ?? ''}
                >
                  {convDetectedType
                    ? (t(`llmConversation.requestTypes.${convDetectedType}`) || convDetectedType)
                    : '---'}
                </span>
              </div>
              <div id="conv-panel-textarea-row" className="flex gap-1.5">
                <Textarea
                  id="conv-panel-message-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('llmConversation.messagePlaceholder')}
                  className="text-xs min-h-[56px] resize-none flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button
                  id="conv-panel-send-btn"
                  size="icon"
                  className="h-auto w-8 self-end shrink-0"
                  disabled={isSubmitting || isPolling || !message.trim()}
                  onClick={() => handleSend()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* ── Create records confirmation ── */}
      <AlertDialog open={showCreateRecordsConfirm} onOpenChange={setShowCreateRecordsConfirm}>
        <AlertDialogContent id="conv-panel-create-records-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle id="conv-panel-create-records-dialog-title">{t('llmConversation.createRecordsTitle')}</AlertDialogTitle>
            <AlertDialogDescription id="conv-panel-create-records-dialog-desc">
              {t('llmConversation.createRecordsDesc').replace('{count}', String(items.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="conv-panel-create-records-cancel-btn" disabled={isCreatingRecords}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction id="conv-panel-create-records-confirm-btn" onClick={handleCreateRecords} disabled={isCreatingRecords}>
              {isCreatingRecords && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
