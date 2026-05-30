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
  getGameLLMTokenBalance,
  type GameLLMTokenBalance,
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
  lsItemLinks,
  lsLoreTitles,
  lsItemNames,
  parseLoreResponse,
  parseGeneratedItemsResponse,
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
import { type CreateItemInitialValues, type CreateItemInitialGenPoolEntry } from '@/components/CreateItemDefinitionDialog'
import { listItemDefinitions, updateItemDefinition, getItemDefinition } from '@/lib/inventory-api'
import type { ItemDefinition } from '@/types/inventory'
import { useEscapeLayer } from '@/hooks/use-escape-manager'

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

  // Panel visibility state — suppress if URL contains noconvpanel=1 (e.g. links opened from the panel itself)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('noconvpanel') === '1') return false
    return safeGetItem(LS_PANEL_OPEN) === 'true'
  })
  const [isMinimized, setIsMinimized] = useState(() => safeGetItem(LS_PANEL_MINIMIZED) === 'true')

  // Token balance
  const [tokenBalance, setTokenBalance] = useState<GameLLMTokenBalance | null>(null)

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

  // Tracks which convId "owns" the current chatHistory.
  // Prevents the persist effect from writing a previous conversation's turns
  // into a different conversation's localStorage key when switching.
  const chatHistoryConvIdRef = useRef<string | null>(null)

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

  // Item definition draft review
  const [savedItemDefinitionIds, setSavedItemDefinitionIds] = useState<Record<string, string>>({})
  const [itemDefReviewOpen, setItemDefReviewOpen] = useState(false)
  const [itemDefReviewItem, setItemDefReviewItem] = useState<Record<string, unknown> | null>(null)
  const [itemDefReviewTurnId, setItemDefReviewTurnId] = useState<string | null>(null)
  const [itemDefReviewResponseIdx, setItemDefReviewResponseIdx] = useState(0)
  const [itemDefReviewItemIdx, setItemDefReviewItemIdx] = useState(0)
  const [itemInitialValues, setItemInitialValues] = useState<CreateItemInitialValues | null>(null)

  // Item code conflict dialog (shown when item_code already exists in backend)
  const [itemCodeConflictOpen, setItemCodeConflictOpen] = useState(false)
  const [itemCodeConflictExisting, setItemCodeConflictExisting] = useState<ItemDefinition | null>(null)
  const [itemCodeConflictInitialValues, setItemCodeConflictInitialValues] = useState<CreateItemInitialValues | null>(null)
  const [isApplyingConflict, setIsApplyingConflict] = useState(false)

  // Tracks the last completed lore_creating response text (used as context for lore_analyzing)
  const [convMainContent, setConvMainContent] = useState('')
  // Tracks the last completed item_generation response parsed as array
  const [convGeneratedItems, setConvGeneratedItems] = useState<unknown[]>([])

  // Linked content for the active conversation
  const [linkedContent, setLinkedContent] = useState<ConversationContentLink[]>([])
  const [isLoadingLinkedContent, setIsLoadingLinkedContent] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [loreEntryTitles, setLoreEntryTitles] = useState<Record<string, string>>({})
  const [itemDefinitionNames, setItemDefinitionNames] = useState<Record<string, string>>({})

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

  // External toggle via custom event (e.g. from GameNavButtons)
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => {
        if (!prev) { setIsMinimized(false); return true }
        return false
      })
    }
    window.addEventListener('ss:conv-toggle', handleToggle)
    return () => window.removeEventListener('ss:conv-toggle', handleToggle)
  }, [])

  // Close panel on Escape — but only when no layered dialog is open.
  // Each registered layer pops one-at-a-time; see hooks/use-escape-manager.ts.
  useEscapeLayer(isOpen, () => setIsOpen(false))

  // Persist completed chat turns for the active conversation
  useEffect(() => {
    if (!activeConvId || chatHistory.length === 0) return
    // Guard: only persist when chatHistory actually belongs to the active conversation.
    // When switching to an empty conv the previous conv's turns are still in chatHistory
    // (preserved for context) — skip writing so we don't corrupt the new conv's key.
    if (chatHistoryConvIdRef.current !== activeConvId) return
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

  // Keep the last completed item_generation response parsed as generated items array
  useEffect(() => {
    let lastGeneratedItems: unknown[] = []
    for (const turn of chatHistory) {
      if (!turn.responses) continue
      for (const response of turn.responses) {
        if (response.intentType === 'item_generation' && response.done && !response.error && response.responseText) {
          const parsed = parseGeneratedItemsResponse(response.responseText)
          if (parsed.length > 0) {
            lastGeneratedItems = parsed
          }
        }
      }
    }
    setConvGeneratedItems(lastGeneratedItems)
  }, [chatHistory])

  // Reset main content when switching conversations.
  useEffect(() => {
    setConvMainContent('')
    setConvGeneratedItems([])
  }, [activeConvId])

  // Persist lore entry titles to localStorage whenever they change (survives F5)
  useEffect(() => {
    if (!activeConvId || Object.keys(loreEntryTitles).length === 0) return
    safeSetItem(lsLoreTitles(activeConvId), JSON.stringify(loreEntryTitles))
  }, [loreEntryTitles, activeConvId])

  // Persist item definition names to localStorage whenever they change (survives F5)
  useEffect(() => {
    if (!activeConvId || Object.keys(itemDefinitionNames).length === 0) return
    safeSetItem(lsItemNames(activeConvId), JSON.stringify(itemDefinitionNames))
  }, [itemDefinitionNames, activeConvId])

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
      setItemDefinitionNames({})
      chatHistoryConvIdRef.current = null
      clearHistory()
      setSavedLoreIds({})
      setSavedItemDefinitionIds({})
      if (gameId) {
        safeRemoveItem(lsActiveConv(gameId))
        window.dispatchEvent(new Event('ss:conv-state-changed'))
      }
      return
    }
    safeSetItem(lsActiveConv(gameId), activeConvId)
    window.dispatchEvent(new Event('ss:conv-state-changed'))
    // Skip re-fetching when the conversation was just created by handleSend
    if (justCreatedConvIdRef.current === activeConvId) {
      justCreatedConvIdRef.current = null
      return
    }
    // Restore chat history from localStorage.
    // Always clear history when switching conversations to avoid showing stale content.
    const raw = safeGetItem(lsConvHistory(activeConvId))
    chatHistoryConvIdRef.current = activeConvId
    clearHistory()
    if (raw) {
      try { loadHistory(JSON.parse(raw)) } catch { loadHistory([]) }
    }
    // Restore saved lore IDs from localStorage
    const rawLoreLinks = safeGetItem(lsLoreLinks(activeConvId))
    setSavedLoreIds(rawLoreLinks ? JSON.parse(rawLoreLinks) : {})
    // Restore saved item definition IDs from localStorage
    const rawItemLinks = safeGetItem(lsItemLinks(activeConvId))
    setSavedItemDefinitionIds(rawItemLinks ? JSON.parse(rawItemLinks) : {})
    // Restore cached lore titles and item names from localStorage
    const rawLoreTitles = safeGetItem(lsLoreTitles(activeConvId))
    if (rawLoreTitles) { try { setLoreEntryTitles(JSON.parse(rawLoreTitles)) } catch { setLoreEntryTitles({}) } }
    const rawItemNames = safeGetItem(lsItemNames(activeConvId))
    if (rawItemNames) { try { setItemDefinitionNames(JSON.parse(rawItemNames)) } catch { setItemDefinitionNames({}) } }
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
        loadActiveConvs(gameId)
      }
    }
    window.addEventListener('ss:conv-external-created', handleExternalConvCreated)
    return () => window.removeEventListener('ss:conv-external-created', handleExternalConvCreated)
  }, [gameId])

  // Reload linked content when an external action links new content to the active conversation
  useEffect(() => {
    function handleContentLinked(e: Event) {
      const detail = (e as CustomEvent<{ convId: string; gameId: string; contentType?: string; contentId?: string; contentName?: string }>).detail
      if (detail.gameId !== gameId) return
      if (detail.contentId && detail.contentName && detail.contentType) {
        // Cache the name immediately so it's available when linkedContent renders
        if (detail.contentType === 'item_definition') {
          setItemDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }))
        } else if (detail.contentType === 'lore_entry' || detail.contentType === 'lore') {
          setLoreEntryTitles(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }))
        }
        // Inject a synthetic link entry so it shows with its name right away,
        // before loadLinkedContent returns. The API call replaces it with the real entry.
        setLinkedContent(prev => {
          if (prev.some(l => l.content_id === detail.contentId && l.content_type === detail.contentType)) return prev
          return [...prev, {
            id: `synth-${detail.contentId!}`,
            conversation_id: detail.convId,
            content_type: detail.contentType!,
            content_id: detail.contentId!,
            linked_by: null,
            created_at: new Date().toISOString(),
          }]
        })
      }
      // Use detail.convId directly — avoids race where activeConvId hasn't updated yet
      void loadLinkedContent(gameId, detail.convId)
    }
    window.addEventListener('ss:conv-content-linked', handleContentLinked)
    return () => window.removeEventListener('ss:conv-content-linked', handleContentLinked)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

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
    getGameLLMTokenBalance(gId).then(setTokenBalance).catch(() => {})
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

      // Fetch lore titles and item names in parallel BEFORE calling setLinkedContent.
      // This way setLinkedContent and the name setters fire synchronously in the same
      // React batch → a single render that already has names, no "Item" flash.
      const loreLinks = items.filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
      const itemLinks = items.filter(l => l.content_type === 'item_definition')

      const [loreResults, itemResults] = await Promise.all([
        loreLinks.length > 0
          ? Promise.allSettled(loreLinks.map(l => getLoreEntry(gId, l.content_id)))
          : Promise.resolve([] as PromiseSettledResult<{ Title: string }>[]),
        itemLinks.length > 0
          ? Promise.allSettled(itemLinks.map(l => getItemDefinition({ gameId: gId }, l.content_id)))
          : Promise.resolve([] as PromiseSettledResult<{ item: { name: string } }>[]),
      ])

      // Build name maps synchronously (no more awaits after this point)
      const titles: Record<string, string> = {}
      loreLinks.forEach((l, i) => {
        const result = loreResults[i]
        if (result?.status === 'fulfilled') titles[l.content_id] = result.value.Title
      })

      const names: Record<string, string> = {}
      itemLinks.forEach((l, i) => {
        const result = itemResults[i]
        if (result?.status === 'fulfilled') names[l.content_id] = result.value.item.name
      })

      // All three setters fire synchronously → one React render with everything ready
      if (Object.keys(titles).length > 0) setLoreEntryTitles(prev => ({ ...prev, ...titles }))
      if (Object.keys(names).length > 0) setItemDefinitionNames(prev => ({ ...prev, ...names }))
      setLinkedContent(items)
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
    const generatedItemsForRequest = convGeneratedItems.length > 0
      ? convGeneratedItems
      : (activeConv?.AccumulatedContent?.items ?? [])
    removeTurn(turn.id)
    const retryLinkedLoreIds = linkedContent
      .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
      .map(l => l.content_id)
    const retryLinkedItemIds = linkedContent
      .filter(l => l.content_type === 'item_definition')
      .map(l => l.content_id)
    void runPipeline(
      gameId,
      turn.userMessage,
      activeConvId,
      retryType,
      (newConv) => {
        justCreatedConvIdRef.current = newConv.ID
        chatHistoryConvIdRef.current = newConv.ID
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
      retryLinkedLoreIds.length > 0 ? retryLinkedLoreIds : undefined,
      fallbackEntityType || undefined,
      undefined,
      generatedItemsForRequest.length > 0 ? generatedItemsForRequest : undefined,
      retryLinkedItemIds.length > 0 ? retryLinkedItemIds : undefined,
    )
  }

  function handleSend() {
    if (!gameId || !message.trim() || isStreaming) return
    const userPrompt = message.trim()
    setMessage('')
    // If chatHistory was preserved from a previous conversation (context browsing),
    // clear it now and claim ownership for the current conversation before sending.
    if (chatHistoryConvIdRef.current !== activeConvId) {
      clearHistory()
      chatHistoryConvIdRef.current = activeConvId
    }
    const linkedLoreIds = linkedContent
      .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
      .map(l => l.content_id)
    const linkedItemIds = linkedContent
      .filter(l => l.content_type === 'item_definition')
      .map(l => l.content_id)
    // Fall back to the last known entityType from history when the current turn
    // doesn't produce one (e.g. "update the current content" follow-up requests)
    const allResponses = chatHistory.flatMap(t => t.responses ?? []).filter(r => r.entityType)
    const fallbackEntityType = allResponses[allResponses.length - 1]?.entityType
    const generatedItemsForRequest = convGeneratedItems.length > 0
      ? convGeneratedItems
      : (activeConv?.AccumulatedContent?.items ?? [])
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
        chatHistoryConvIdRef.current = newConv.ID
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
      generatedItemsForRequest.length > 0 ? generatedItemsForRequest : undefined,
      linkedItemIds.length > 0 ? linkedItemIds : undefined,
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
      safeRemoveItem(lsLoreTitles(deleteTarget.ID))
      safeRemoveItem(lsItemNames(deleteTarget.ID))
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
      loadArchivedConvs(gameId)
    } catch {
      toast({ title: t('llmConversation.errorDelete'), variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  async function handleDeleteDirect(conv: Conversation) {
    if (!gameId) return
    try {
      await deleteConversation(gameId, conv.ID)
      safeRemoveItem(lsConvHistory(conv.ID))
      safeRemoveItem(lsLoreLinks(conv.ID))
      safeRemoveItem(lsLoreTitles(conv.ID))
      safeRemoveItem(lsItemNames(conv.ID))
      setArchivedConvs((prev) => prev.filter((c) => c.ID !== conv.ID))
      if (activeConvId === conv.ID) {
        safeRemoveItem(lsActiveConv(gameId))
        setActiveConvId(null)
        setActiveConv(null)
      }
      toast({ title: t('llmConversation.deleted') })
      loadArchivedConvs(gameId)
    } catch {
      toast({ title: t('llmConversation.errorDelete'), variant: 'destructive' })
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
    const generatedItemsForRequest = convGeneratedItems.length > 0
      ? convGeneratedItems
      : (activeConv?.AccumulatedContent?.items ?? [])
    const retryLinkedLoreIds = linkedContent
      .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
      .map(l => l.content_id)
    const retryLinkedItemIds = linkedContent
      .filter(l => l.content_type === 'item_definition')
      .map(l => l.content_id)
    void retryResponse(
      gameId,
      activeConvId,
      turnId,
      responseIdx,
      intentType,
      userMessage,
      t('llmConversation.errorSend'),
      convMainContent || undefined,
      generatedItemsForRequest.length > 0 ? generatedItemsForRequest : undefined,
      retryLinkedLoreIds.length > 0 ? retryLinkedLoreIds : undefined,
      retryLinkedItemIds.length > 0 ? retryLinkedItemIds : undefined,
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
      // Immediately cache the title so the linked content badge shows the name right away
      setLoreEntryTitles(prev => ({ ...prev, [entry.ID]: entry.Title }))
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

  async function handleOpenItemDefinitionReview(
    item: Record<string, unknown>,
    turnId: string,
    responseIdx: number,
    itemIdx: number,
  ) {
    const name = typeof item.name === 'string' ? item.name : ''
    const rarity = typeof item.rarity === 'string' ? item.rarity : 'common'
    const category = typeof item.category === 'string' ? item.category : 'other'
    const description =
      typeof item.description === 'string' ? item.description
      : typeof (item.metadata as Record<string, unknown>)?.description === 'string'
        ? (item.metadata as Record<string, unknown>).description as string
        : ''
    const rawStats = (item.base_stats ?? item.attributes)
    const stats = rawStats && typeof rawStats === 'object' && !Array.isArray(rawStats)
      ? Object.entries(rawStats as Record<string, unknown>).map(([k, v]) => ({ key: k, value: String(v) }))
      : []
    const item_code = typeof item.item_code === 'string' ? item.item_code.trim() : undefined

    // Resolve generator config — replace __REF:ITEM_CODE with actual item_definition_id
    let gen_output_pool: CreateItemInitialGenPoolEntry[] | undefined
    let gen_interval_seconds: string | undefined
    let gen_tick_capacity: string | undefined
    let gen_collect_destination: 'mailbox' | 'inventory' | undefined
    if (category === 'generator' && gameId) {
      const genCfg = (item.metadata as Record<string, unknown>)?.generator_config as Record<string, unknown> | undefined
      if (genCfg) {
        if (genCfg.production_interval_seconds != null) gen_interval_seconds = String(genCfg.production_interval_seconds)
        if (genCfg.tick_capacity != null) gen_tick_capacity = String(genCfg.tick_capacity)
        if (genCfg.collect_destination === 'mailbox' || genCfg.collect_destination === 'inventory') {
          gen_collect_destination = genCfg.collect_destination
        }
        const rawPool = Array.isArray(genCfg.output_pool) ? (genCfg.output_pool as Record<string, unknown>[]) : []
        if (rawPool.length > 0) {
          // Collect all __REF: item codes that need resolving
          const refCodes = rawPool
            .map((e) => String(e.item_definition_id ?? ''))
            .filter((id) => id.startsWith('__REF:'))
            .map((id) => id.slice(6))
          const codeToId: Record<string, string> = {}
          if (refCodes.length > 0) {
            await Promise.allSettled(
              refCodes.map((code) =>
                listItemDefinitions({ gameId }, { item_code: code, limit: 1 })
                  .then((res) => { const found = (res.items ?? [])[0]; if (found) codeToId[code] = found.id })
                  .catch(() => {})
              )
            )
          }
          gen_output_pool = rawPool.map((e) => {
            const rawId = String(e.item_definition_id ?? '')
            const resolvedId = rawId.startsWith('__REF:')
              ? (codeToId[rawId.slice(6)] ?? '')
              : rawId
            return {
              item_definition_id: resolvedId,
              drop_rate: e.drop_rate != null ? String(e.drop_rate) : '1',
              quantity_min: e.quantity_min != null ? String(e.quantity_min) : '1',
              quantity_max: e.quantity_max != null ? String(e.quantity_max) : '1',
              collect_cap: e.collect_cap != null ? String(e.collect_cap) : '5',
              initial_output: e.initial_output != null ? String(e.initial_output) : '0',
            }
          })
        }
      }
    }

    const initialValues: CreateItemInitialValues = {
      name, item_code, category: category as never, rarity: rarity as never,
      is_stackable: typeof item.is_stackable === 'boolean' ? item.is_stackable : false,
      max_stack_size: item.max_stack_size != null ? String(item.max_stack_size) : '99',
      grid_width: item.grid_width != null ? String(item.grid_width) : '1',
      grid_height: item.grid_height != null ? String(item.grid_height) : '1',
      stats, description,
      client_writable: typeof item.client_writable === 'boolean' ? item.client_writable : false,
      allow_client_update_qty: typeof item.allow_client_update_qty === 'boolean' ? item.allow_client_update_qty : false,
      gen_output_pool,
      gen_interval_seconds,
      gen_tick_capacity,
      gen_collect_destination,
    }

    // If item_code is provided, check whether an item with this code already exists via API.
    if (item_code && gameId) {
      try {
        const res = await listItemDefinitions({ gameId }, { item_code, limit: 1 })
        const existing = (res.items ?? [])[0]
        if (existing) {
          // Show confirmation dialog — let user choose update vs save as new
          setItemCodeConflictExisting(existing)
          setItemCodeConflictInitialValues(initialValues)
          setItemCodeConflictOpen(true)
          return
        }
      } catch {
        // If check fails, fall through to create dialog
      }
    }

    setItemDefReviewItem(item)
    setItemDefReviewTurnId(turnId)
    setItemDefReviewResponseIdx(responseIdx)
    setItemDefReviewItemIdx(itemIdx)
    setItemInitialValues(initialValues)
    setItemDefReviewOpen(true)
  }

  /** User chose to update the existing item with SSE data then navigate to it */
  async function handleItemCodeConflictUpdate() {
    if (!itemCodeConflictExisting || !itemCodeConflictInitialValues || !gameId) return
    const values = itemCodeConflictInitialValues
    const existing = itemCodeConflictExisting
    const patch: Record<string, unknown> = {}
    if (values.name?.trim())                patch.name = values.name.trim()
    if (values.item_code !== undefined)     patch.item_code = values.item_code?.trim() || undefined
    if (values.category)                    patch.category = values.category
    if (values.rarity)                      patch.rarity = values.rarity
    if (values.is_stackable !== undefined)  patch.is_stackable = values.is_stackable
    if (values.max_stack_size != null && values.max_stack_size !== '') {
      patch.max_stack_size = Number(values.max_stack_size) || null
    }
    if (values.grid_width != null)          patch.grid_width = Number(values.grid_width) || 1
    if (values.grid_height != null)         patch.grid_height = Number(values.grid_height) || 1
    if (values.client_writable !== undefined)        patch.client_writable = values.client_writable
    if (values.allow_client_update_qty !== undefined) patch.allow_client_update_qty = values.allow_client_update_qty
    if (values.stats && values.stats.length > 0) {
      const base_stats: Record<string, number> = {}
      values.stats.forEach(({ key, value }) => {
        if (key.trim()) base_stats[key.trim()] = Number(value) || 0
      })
      patch.base_stats = base_stats
    }
    if (values.description?.trim()) {
      patch.metadata = { ...(existing.metadata ?? {}), description: values.description.trim() }
    }
    setIsApplyingConflict(true)
    try {
      await updateItemDefinition({ gameId }, existing.id, patch)
      setItemCodeConflictOpen(false)
      setIsOpen(false)
      router.push(`/games/${gameId}/items/${existing.id}`)
      router.refresh()
      toast({ title: t('llmConversation.sseUpdateApplied'), description: existing.name })
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('llmConversation.sseUpdateFailed'), description: err?.message })
    } finally {
      setIsApplyingConflict(false)
    }
  }

  /** User chose to save as a new item (optionally with a different item_code) */
  function handleItemCodeConflictSaveNew(newItemCode: string) {
    if (!itemCodeConflictInitialValues) return
    const updatedValues: CreateItemInitialValues = {
      ...itemCodeConflictInitialValues,
      item_code: newItemCode.trim() || undefined,
    }
    setItemCodeConflictOpen(false)
    setItemInitialValues(updatedValues)
    setItemDefReviewOpen(true)
  }

  function handleItemDefCreated(itemId: string) {
    if (!activeConvId || !itemDefReviewTurnId) return
    const itemKey = `${itemDefReviewTurnId}:${itemDefReviewResponseIdx}:${itemDefReviewItemIdx}`
    const updated = { ...savedItemDefinitionIds, [itemKey]: itemId }
    setSavedItemDefinitionIds(updated)
    safeSetItem(lsItemLinks(activeConvId), JSON.stringify(updated))
    setItemDefReviewOpen(false)
    // Link the created item definition to the active conversation
    linkConversationContent(gameId!, activeConvId, 'item_definition', itemId)
      .then(() => loadLinkedContent(gameId!, activeConvId))
      .catch(() => {/* silent — linking is best-effort */})
  }

  // ---------------------------------------------------------------------------
  // Don't render when not on a game page, or before client hydration
  // ---------------------------------------------------------------------------
  if (!gameId || !mounted) return null

  // ---------------------------------------------------------------------------
  // Minimized / closed — render nothing (open via GameNavButtons)
  // ---------------------------------------------------------------------------
  if (!isOpen || isMinimized) return null

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
            onSelectConv={(convId) => { setActiveConvId(convId) }}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            onDelete={handleDeleteDirect}
            tokenBalance={tokenBalance}
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
                  savedItemDefinitionIds={savedItemDefinitionIds}
                  onRetry={handleRetry}
                  onRetryResponse={handleRetryResponse}
                  onOpenLoreReview={handleOpenLoreReview}
                  onSaveItemDefinition={handleOpenItemDefinitionReview}
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
                itemDefinitionNames={itemDefinitionNames}
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
        convGeneratedItems={convGeneratedItems}
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
        itemDefReviewOpen={itemDefReviewOpen}
        setItemDefReviewOpen={setItemDefReviewOpen}
        itemInitialValues={itemInitialValues}
        onItemDefCreated={handleItemDefCreated}
        itemCodeConflictOpen={itemCodeConflictOpen}
        setItemCodeConflictOpen={setItemCodeConflictOpen}
        itemCodeConflictExisting={itemCodeConflictExisting}
        isApplyingConflict={isApplyingConflict}
        onItemCodeConflictUpdate={handleItemCodeConflictUpdate}
        onItemCodeConflictSaveNew={handleItemCodeConflictSaveNew}
        t={t}
      />
    </>
  )
}
