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
  lsPresetLinks,
  lsContainerLinks,
  lsGachaPackLinks,
  lsLoreTitles,
  lsItemNames,
  lsContainerNames,
  lsGachaPackNames,
  lsPendingGachaCreate,
  lsTagApplied,
  lsItemTagCreated,
  parseLoreResponse,
  parseGeneratedItemsResponse,
  parseGeneratedPresetsResponse,
  parseGeneratedContainersResponse,
  parseGeneratedGachaPacksResponse,
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
import { listItemDefinitions, updateItemDefinition, getItemDefinition, createItemTag, deleteItemTag, listPresetDefinitions, updatePresetDefinition, listContainerDefinitions, updateContainerDefinition, getContainerDefinition, listGachaPacks, updateGachaPack, getGachaPack } from '@/lib/inventory-api'
import type { ItemDefinition, ContainerDefinition, GachaPack } from '@/types/inventory'
import type { PresetDefinition } from '@/lib/inventory-api'
import { updateGame, getGame } from '@/lib/game-api'
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
  // Preset definition saved IDs (keyed as "turnId:responseIdx:presetIdx")
  const [savedPresetDefinitionIds, setSavedPresetDefinitionIds] = useState<Record<string, string>>({})
  // Container definition saved IDs (keyed as "turnId:responseIdx:containerIdx")
  const [savedContainerDefinitionIds, setSavedContainerDefinitionIds] = useState<Record<string, string>>({})
  const [itemDefReviewOpen, setItemDefReviewOpen] = useState(false)
  const [itemDefReviewItem, setItemDefReviewItem] = useState<Record<string, unknown> | null>(null)
  const [itemDefReviewTurnId, setItemDefReviewTurnId] = useState<string | null>(null)
  const [itemDefReviewResponseIdx, setItemDefReviewResponseIdx] = useState(0)
  const [itemDefReviewItemIdx, setItemDefReviewItemIdx] = useState(0)
  const [itemInitialValues, setItemInitialValues] = useState<CreateItemInitialValues | null>(null)

  // Tag suggestion — tracks which individual tags have been applied per response
  const [appliedTagsPerResponse, setAppliedTagsPerResponse] = useState<Record<string, Record<string, true>>>({})
  const [createdItemTagsPerResponse, setCreatedItemTagsPerResponse] = useState<Record<string, Record<string, string>>>({})

  // Item code conflict dialog (shown when item_code already exists in backend)
  const [itemCodeConflictOpen, setItemCodeConflictOpen] = useState(false)
  const [itemCodeConflictExisting, setItemCodeConflictExisting] = useState<ItemDefinition | null>(null)
  const [itemCodeConflictInitialValues, setItemCodeConflictInitialValues] = useState<CreateItemInitialValues | null>(null)
  const [isApplyingConflict, setIsApplyingConflict] = useState(false)

  // Preset code conflict dialog (shown when code_name already exists in backend)
  const [presetCodeConflictOpen, setPresetCodeConflictOpen] = useState(false)
  const [presetCodeConflictExisting, setPresetCodeConflictExisting] = useState<PresetDefinition | null>(null)
  const [presetCodeConflictPendingPreset, setPresetCodeConflictPendingPreset] = useState<Record<string, unknown> | null>(null)
  const [isApplyingPresetConflict, setIsApplyingPresetConflict] = useState(false)

  // Container name conflict dialog (shown when name already exists in backend)
  const [containerNameConflictOpen, setContainerNameConflictOpen] = useState(false)
  const [containerNameConflictExisting, setContainerNameConflictExisting] = useState<ContainerDefinition | null>(null)
  const [containerNameConflictPending, setContainerNameConflictPending] = useState<{ container: Record<string, unknown>; turnId: string; responseIdx: number; containerIdx: number } | null>(null)
  const [isApplyingContainerConflict, setIsApplyingContainerConflict] = useState(false)

  // Tracks the last completed lore_creating response text (used as context for lore_analyzing)
  const [convMainContent, setConvMainContent] = useState('')
  // Tracks the last completed item_generation response parsed as array
  const [convGeneratedItems, setConvGeneratedItems] = useState<unknown[]>([])
  // Tracks the last completed preset_generation response parsed as array
  const [convGeneratedPresets, setConvGeneratedPresets] = useState<unknown[]>([])
  // Tracks the last completed container_generation response parsed as array
  const [convGeneratedContainers, setConvGeneratedContainers] = useState<unknown[]>([])
  // Tracks the last completed gacha_pack_creating response parsed as array
  const [convGeneratedGachaPacks, setConvGeneratedGachaPacks] = useState<unknown[]>([])

  // Linked content for the active conversation
  const [linkedContent, setLinkedContent] = useState<ConversationContentLink[]>([])
  const [isLoadingLinkedContent, setIsLoadingLinkedContent] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [loreEntryTitles, setLoreEntryTitles] = useState<Record<string, string>>({})
  const [itemDefinitionNames, setItemDefinitionNames] = useState<Record<string, string>>({})
  const [containerDefinitionNames, setContainerDefinitionNames] = useState<Record<string, string>>({})
  // Gacha pack saved IDs (keyed as "turnId:responseIdx:gachaPackIdx")
  const [savedGachaPackIds, setSavedGachaPackIds] = useState<Record<string, string>>({})
  const [gachaPackNames, setGachaPackNames] = useState<Record<string, string>>({})

  // Gacha pack code conflict dialog (shown when code_name already exists in backend)
  const [gachaPackCodeConflictOpen, setGachaPackCodeConflictOpen] = useState(false)
  const [gachaPackCodeConflictExisting, setGachaPackCodeConflictExisting] = useState<GachaPack | null>(null)
  const [gachaPackCodeConflictPending, setGachaPackCodeConflictPending] = useState<{ pack: Record<string, unknown>; turnId: string; responseIdx: number; gachaPackIdx: number } | null>(null)
  const [isApplyingGachaPackConflict, setIsApplyingGachaPackConflict] = useState(false)

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

  // Keep the last completed preset_generation response parsed as presets array
  useEffect(() => {
    let lastGeneratedPresets: unknown[] = []
    for (const turn of chatHistory) {
      if (!turn.responses) continue
      for (const response of turn.responses) {
        if (response.intentType === 'preset_generation' && response.done && !response.error && response.responseText) {
          const parsed = parseGeneratedPresetsResponse(response.responseText)
          if (parsed.length > 0) {
            lastGeneratedPresets = parsed
          }
        }
      }
    }
    setConvGeneratedPresets(lastGeneratedPresets)
  }, [chatHistory])

  // Keep the last completed container_generation response parsed as containers array
  useEffect(() => {
    let lastGeneratedContainers: unknown[] = []
    for (const turn of chatHistory) {
      if (!turn.responses) continue
      for (const response of turn.responses) {
        if (response.intentType === 'container_creating' && response.done && !response.error && response.responseText) {
          const parsed = parseGeneratedContainersResponse(response.responseText)
          if (parsed.length > 0) {
            lastGeneratedContainers = parsed
          }
        }
      }
    }
    setConvGeneratedContainers(lastGeneratedContainers)
  }, [chatHistory])

  // Keep the last completed gacha_pack_creating response parsed as gacha packs array
  useEffect(() => {
    let lastGeneratedGachaPacks: unknown[] = []
    for (const turn of chatHistory) {
      if (!turn.responses) continue
      for (const response of turn.responses) {
        if (response.intentType === 'gacha_pack_creating' && response.done && !response.error && response.responseText) {
          const parsed = parseGeneratedGachaPacksResponse(response.responseText)
          if (parsed.length > 0) {
            lastGeneratedGachaPacks = parsed
          }
        }
      }
    }
    setConvGeneratedGachaPacks(lastGeneratedGachaPacks)
  }, [chatHistory])

  // Reset main content and applied tag keys when switching conversations.
  useEffect(() => {
    setConvMainContent('')
    setConvGeneratedItems([])
    setConvGeneratedPresets([])
    setConvGeneratedContainers([])
    setConvGeneratedGachaPacks([])
    setAppliedTagsPerResponse({})
    setCreatedItemTagsPerResponse({})
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

  // Persist container definition names to localStorage whenever they change (survives F5)
  useEffect(() => {
    if (!activeConvId || Object.keys(containerDefinitionNames).length === 0) return
    safeSetItem(lsContainerNames(activeConvId), JSON.stringify(containerDefinitionNames))
  }, [containerDefinitionNames, activeConvId])

  // Persist gacha pack names to localStorage whenever they change (survives F5)
  useEffect(() => {
    if (!activeConvId || Object.keys(gachaPackNames).length === 0) return
    safeSetItem(lsGachaPackNames(activeConvId), JSON.stringify(gachaPackNames))
  }, [gachaPackNames, activeConvId])

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
      setContainerDefinitionNames({})
      setGachaPackNames({})
      chatHistoryConvIdRef.current = null
      clearHistory()
      setSavedLoreIds({})
      setSavedItemDefinitionIds({})
      setSavedPresetDefinitionIds({})
      setSavedContainerDefinitionIds({})
      setSavedGachaPackIds({})
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
    // Restore saved preset definition IDs from localStorage
    const rawPresetLinks = safeGetItem(lsPresetLinks(activeConvId))
    setSavedPresetDefinitionIds(rawPresetLinks ? JSON.parse(rawPresetLinks) : {})
    // Restore saved container definition IDs from localStorage
    const rawContainerLinks = safeGetItem(lsContainerLinks(activeConvId))
    setSavedContainerDefinitionIds(rawContainerLinks ? JSON.parse(rawContainerLinks) : {})
    // Restore saved gacha pack IDs from localStorage
    const rawGachaPackLinks = safeGetItem(lsGachaPackLinks(activeConvId))
    setSavedGachaPackIds(rawGachaPackLinks ? JSON.parse(rawGachaPackLinks) : {})
    // Restore cached lore titles and item names from localStorage
    const rawLoreTitles = safeGetItem(lsLoreTitles(activeConvId))
    if (rawLoreTitles) { try { setLoreEntryTitles(JSON.parse(rawLoreTitles)) } catch { setLoreEntryTitles({}) } }
    const rawItemNames = safeGetItem(lsItemNames(activeConvId))
    if (rawItemNames) { try { setItemDefinitionNames(JSON.parse(rawItemNames)) } catch { setItemDefinitionNames({}) } }
    const rawContainerNames = safeGetItem(lsContainerNames(activeConvId))
    if (rawContainerNames) { try { setContainerDefinitionNames(JSON.parse(rawContainerNames)) } catch { setContainerDefinitionNames({}) } }
    const rawGachaPackNames = safeGetItem(lsGachaPackNames(activeConvId))
    if (rawGachaPackNames) { try { setGachaPackNames(JSON.parse(rawGachaPackNames)) } catch { setGachaPackNames({}) } }
    // Restore applied game tags and created item tags from localStorage
    const rawTagApplied = safeGetItem(lsTagApplied(activeConvId))
    setAppliedTagsPerResponse(rawTagApplied ? JSON.parse(rawTagApplied) : {})
    const rawItemTagCreated = safeGetItem(lsItemTagCreated(activeConvId))
    setCreatedItemTagsPerResponse(rawItemTagCreated ? JSON.parse(rawItemTagCreated) : {})
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
        } else if (detail.contentType === 'container_definition') {
          setContainerDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }))
        } else if (detail.contentType === 'gacha_pack') {
          setGachaPackNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }))
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

  // Catch successful container creation triggered from the panel, map turn context → container ID
  useEffect(() => {
    function handleContainerCreated(e: Event) {
      const detail = (e as CustomEvent<{ containerId: string; containerName?: string; turnId: string; responseIdx: number; containerIdx: number }>).detail
      if (!activeConvId || !gameId) return
      const containerKey = `${detail.turnId}:${detail.responseIdx}:${detail.containerIdx}`
      setSavedContainerDefinitionIds(prev => {
        const updated = { ...prev, [containerKey]: detail.containerId }
        safeSetItem(lsContainerLinks(activeConvId!), JSON.stringify(updated))
        return updated
      })
      // Link the container to the conversation (same pattern as items/lore)
      void linkConversationContent(gameId, activeConvId, 'container_definition', detail.containerId)
        .then(() => void loadLinkedContent(gameId, activeConvId!))
        .catch(() => { /* silently ignore */ })
      // Cache the container name immediately if provided
      if (detail.containerName) {
        setContainerDefinitionNames(prev => ({ ...prev, [detail.containerId]: detail.containerName! }))
      }
    }
    window.addEventListener('ss:container-created', handleContainerCreated)
    return () => window.removeEventListener('ss:container-created', handleContainerCreated)
  }, [activeConvId, gameId])

  // Catch successful gacha pack creation triggered from the panel, map turn context → gacha pack ID
  useEffect(() => {
    function handleGachaPackCreated(e: Event) {
      const detail = (e as CustomEvent<{ gachaPackId: string; gachaPackName?: string; turnId: string; responseIdx: number; gachaPackIdx: number }>).detail
      if (!activeConvId || !gameId) return
      const packKey = `${detail.turnId}:${detail.responseIdx}:${detail.gachaPackIdx}`
      setSavedGachaPackIds(prev => {
        const updated = { ...prev, [packKey]: detail.gachaPackId }
        safeSetItem(lsGachaPackLinks(activeConvId!), JSON.stringify(updated))
        return updated
      })
      // Link the gacha pack to the conversation
      void linkConversationContent(gameId, activeConvId, 'gacha_pack', detail.gachaPackId)
        .then(() => void loadLinkedContent(gameId, activeConvId!))
        .catch(() => { /* silently ignore */ })
      // Cache the pack name immediately if provided
      if (detail.gachaPackName) {
        setGachaPackNames(prev => ({ ...prev, [detail.gachaPackId]: detail.gachaPackName! }))
      }
    }
    window.addEventListener('ss:gacha-pack-created', handleGachaPackCreated)
    return () => window.removeEventListener('ss:gacha-pack-created', handleGachaPackCreated)
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
      const containerLinks = items.filter(l => l.content_type === 'container_definition')
      const gachaPackLinks = items.filter(l => l.content_type === 'gacha_pack')

      const [loreResults, itemResults, containerResults, gachaPackResults] = await Promise.all([
        loreLinks.length > 0
          ? Promise.allSettled(loreLinks.map(l => getLoreEntry(gId, l.content_id)))
          : Promise.resolve([] as PromiseSettledResult<{ Title: string }>[]),
        itemLinks.length > 0
          ? Promise.allSettled(itemLinks.map(l => getItemDefinition({ gameId: gId }, l.content_id)))
          : Promise.resolve([] as PromiseSettledResult<{ item: { name: string } }>[]),
        containerLinks.length > 0
          ? Promise.allSettled(containerLinks.map(l => getContainerDefinition({ gameId: gId }, l.content_id)))
          : Promise.resolve([] as PromiseSettledResult<{ container_definition: { name: string } }>[]),
        gachaPackLinks.length > 0
          ? Promise.allSettled(gachaPackLinks.map(l => getGachaPack({ gameId: gId }, l.content_id)))
          : Promise.resolve([] as PromiseSettledResult<{ pack: { name: string } }>[]),
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

      const containerNames: Record<string, string> = {}
      containerLinks.forEach((l, i) => {
        const result = containerResults[i]
        if (result?.status === 'fulfilled') containerNames[l.content_id] = result.value.container_definition.name
      })

      const gachaPackNameMap: Record<string, string> = {}
      gachaPackLinks.forEach((l, i) => {
        const result = gachaPackResults[i]
        if (result?.status === 'fulfilled') gachaPackNameMap[l.content_id] = result.value.pack.name
      })

      // All setters fire synchronously → one React render with everything ready
      if (Object.keys(titles).length > 0) setLoreEntryTitles(prev => ({ ...prev, ...titles }))
      if (Object.keys(names).length > 0) setItemDefinitionNames(prev => ({ ...prev, ...names }))
      if (Object.keys(containerNames).length > 0) setContainerDefinitionNames(prev => ({ ...prev, ...containerNames }))
      if (Object.keys(gachaPackNameMap).length > 0) setGachaPackNames(prev => ({ ...prev, ...gachaPackNameMap }))
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
      convGeneratedPresets.length > 0 ? convGeneratedPresets : undefined,
      convGeneratedContainers.length > 0 ? convGeneratedContainers : undefined,
      convGeneratedGachaPacks.length > 0 ? convGeneratedGachaPacks : undefined,
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
    const linkedContainerIds = linkedContent
      .filter(l => l.content_type === 'container_definition')
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
      convGeneratedPresets.length > 0 ? convGeneratedPresets : undefined,
      convGeneratedContainers.length > 0 ? convGeneratedContainers : undefined,
      linkedContainerIds.length > 0 ? linkedContainerIds : undefined,
      convGeneratedGachaPacks.length > 0 ? convGeneratedGachaPacks : undefined,
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
      safeRemoveItem(lsContainerNames(deleteTarget.ID))
      safeRemoveItem(lsGachaPackLinks(deleteTarget.ID))
      safeRemoveItem(lsGachaPackNames(deleteTarget.ID))
      safeRemoveItem(lsTagApplied(deleteTarget.ID))
      safeRemoveItem(lsItemTagCreated(deleteTarget.ID))
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
      safeRemoveItem(lsGachaPackLinks(conv.ID))
      safeRemoveItem(lsGachaPackNames(conv.ID))
      safeRemoveItem(lsTagApplied(conv.ID))
      safeRemoveItem(lsItemTagCreated(conv.ID))
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
      convGeneratedPresets.length > 0 ? convGeneratedPresets : undefined,
      convGeneratedContainers.length > 0 ? convGeneratedContainers : undefined,
      convGeneratedGachaPacks.length > 0 ? convGeneratedGachaPacks : undefined,
    )
  }

  async function handleSavePresetDefinition(
    preset: Record<string, unknown>,
    _turnId: string,
    _responseIdx: number,
    _presetIdx: number,
  ) {
    if (!gameId) return
    const codeName = typeof preset.code_name === 'string' ? preset.code_name : ''

    // Check if a preset with this code_name already exists
    if (codeName) {
      try {
        const res = await listPresetDefinitions({ gameId })
        const existing = (res.definitions ?? []).find(d => d.code_name === codeName)
        if (existing) {
          setPresetCodeConflictExisting(existing)
          setPresetCodeConflictPendingPreset(preset)
          setPresetCodeConflictOpen(true)
          return
        }
      } catch {
        // If check fails, fall through to navigate
      }
    }

    navigateToCreatePreset(preset)
  }

  function navigateToCreatePreset(preset: Record<string, unknown>, overrideCodeName?: string) {
    if (!gameId) return
    const params = new URLSearchParams({ tab: 'preset', create: '1' })
    const name = typeof preset.name === 'string' ? preset.name : (typeof preset.code_name === 'string' ? preset.code_name : '')
    if (name) params.set('preset_name', name)
    if (typeof preset.preset_type === 'string' && preset.preset_type) params.set('preset_type', preset.preset_type)
    const codeName = overrideCodeName ?? (typeof preset.code_name === 'string' ? preset.code_name : '')
    if (codeName) params.set('code_name', codeName)
    if (typeof preset.max_slots === 'number') params.set('max_slots', String(preset.max_slots))
    router.push(`/games/${gameId}/items?${params.toString()}`)
  }

  async function handlePresetCodeConflictUpdate() {
    if (!presetCodeConflictExisting || !gameId) return
    const preset = presetCodeConflictPendingPreset ?? {}
    setIsApplyingPresetConflict(true)
    try {
      const patch: Record<string, unknown> = {}
      if (typeof preset.name === 'string' && preset.name.trim()) patch.name = preset.name.trim()
      if (typeof preset.max_slots === 'number') patch.max_slots = preset.max_slots
      if (typeof preset.metadata === 'object' && preset.metadata !== null) patch.metadata = preset.metadata
      if (Object.keys(patch).length > 0) {
        await updatePresetDefinition({ gameId }, presetCodeConflictExisting.id, patch)
      }
      setPresetCodeConflictOpen(false)
      router.push(`/games/${gameId}/items?tab=preset&id=${presetCodeConflictExisting.id}`)
    } catch {
      toast({ title: t('llmConversation.errorSavePresetDefinition'), variant: 'destructive' })
    } finally {
      setIsApplyingPresetConflict(false)
    }
  }

  function handlePresetCodeConflictSaveNew(newCodeName: string) {
    if (!presetCodeConflictPendingPreset) return
    setPresetCodeConflictOpen(false)
    navigateToCreatePreset(presetCodeConflictPendingPreset, newCodeName)
  }

  async function handleSaveContainerDefinition(
    container: Record<string, unknown>,
    turnId: string,
    responseIdx: number,
    containerIdx: number,
  ) {
    if (!gameId) return
    const name = typeof container.name === 'string' ? container.name.trim() : ''
    if (name) {
      try {
        const res = await listContainerDefinitions({ gameId }, { q: name, limit: 1 })
        const existing = (res.container_definitions ?? []).find(
          d => d.name.toLowerCase() === name.toLowerCase()
        ) ?? null
        if (existing) {
          setContainerNameConflictExisting(existing)
          setContainerNameConflictPending({ container, turnId, responseIdx, containerIdx })
          setContainerNameConflictOpen(true)
          return
        }
      } catch {
        // fall through to create
      }
    }
    fireOpenCreateContainer(container, undefined, turnId, responseIdx, containerIdx)
  }

  function fireOpenCreateContainer(
    container: Record<string, unknown>,
    overrideName?: string,
    turnId?: string,
    responseIdx?: number,
    containerIdx?: number,
  ) {
    const name = overrideName ?? (typeof container.name === 'string' ? container.name : '')
    window.dispatchEvent(new CustomEvent('ss:open-create-container', {
      detail: {
        name,
        container_type: typeof container.container_type === 'string' ? container.container_type : undefined,
        grid_cols: typeof container.grid_cols === 'number' ? container.grid_cols : undefined,
        grid_rows: typeof container.grid_rows === 'number' ? container.grid_rows : undefined,
        is_portable: typeof container.is_portable === 'boolean' ? container.is_portable : undefined,
        linked_item_definition_id: typeof container.linked_item_definition_id === 'string' ? container.linked_item_definition_id : undefined,
        turnId,
        responseIdx,
        containerIdx,
      },
    }))
  }

  async function handleContainerNameConflictUpdate() {
    if (!containerNameConflictExisting || !gameId || !activeConvId || !containerNameConflictPending) return
    const { container, turnId, responseIdx, containerIdx } = containerNameConflictPending
    setIsApplyingContainerConflict(true)
    try {
      const patch: Record<string, unknown> = {}
      if (typeof container.name === 'string' && container.name.trim()) patch.name = container.name.trim()
      if (typeof container.grid_cols === 'number') patch.grid_cols = container.grid_cols
      if (typeof container.grid_rows === 'number') patch.grid_rows = container.grid_rows
      if (typeof container.linked_item_definition_id === 'string' && container.linked_item_definition_id)
        patch.linked_item_definition_id = container.linked_item_definition_id
      if (container.metadata && typeof container.metadata === 'object' && !Array.isArray(container.metadata))
        patch.metadata = container.metadata
      if (Object.keys(patch).length > 0)
        await updateContainerDefinition({ gameId }, containerNameConflictExisting.id, patch as any)
      const containerKey = `${turnId}:${responseIdx}:${containerIdx}`
      const updated = { ...savedContainerDefinitionIds, [containerKey]: containerNameConflictExisting.id }
      setSavedContainerDefinitionIds(updated)
      safeSetItem(lsContainerLinks(activeConvId), JSON.stringify(updated))
      setContainerNameConflictOpen(false)
      toast({ title: t('llmConversation.containerDefSaved') })
    } catch {
      toast({ title: t('llmConversation.errorSaveContainerDefinition'), variant: 'destructive' })
    } finally {
      setIsApplyingContainerConflict(false)
    }
  }

  function handleContainerNameConflictCreateNew(newName: string) {
    if (!containerNameConflictPending) return
    const { container, turnId, responseIdx, containerIdx } = containerNameConflictPending
    setContainerNameConflictOpen(false)
    fireOpenCreateContainer(container, newName, turnId, responseIdx, containerIdx)
  }

  // ---------------------------------------------------------------------------
  // Gacha pack save / conflict resolution handlers
  // ---------------------------------------------------------------------------

  async function handleSaveGachaPack(
    pack: Record<string, unknown>,
    turnId: string,
    responseIdx: number,
    gachaPackIdx: number,
  ) {
    if (!gameId) return
    const codeName = typeof pack.code_name === 'string' ? pack.code_name : ''
    if (codeName) {
      try {
        const res = await listGachaPacks({ gameId }, { code_name: codeName, limit: 1 })
        const existing = (res.packs ?? [])[0]
        if (existing) {
          setGachaPackCodeConflictExisting(existing)
          setGachaPackCodeConflictPending({ pack, turnId, responseIdx, gachaPackIdx })
          setGachaPackCodeConflictOpen(true)
          return
        }
      } catch {
        // If check fails, fall through to open create dialog
      }
    }
    fireOpenCreateGachaPack(pack, undefined, turnId, responseIdx, gachaPackIdx)
  }

  function fireOpenCreateGachaPack(
    pack: Record<string, unknown>,
    overrideCodeName?: string,
    turnId?: string,
    responseIdx?: number,
    gachaPackIdx?: number,
  ) {
    if (!gameId) return
    const detail = {
      ...pack,
      ...(overrideCodeName !== undefined ? { code_name: overrideCodeName } : {}),
      turnId,
      responseIdx,
      gachaPackIdx,
    }
    const isOnItemsPage = gameId ? pathname === `/games/${gameId}/items` : false
    if (isOnItemsPage) {
      window.dispatchEvent(new CustomEvent('ss:open-create-gacha-pack', { detail }))
    } else {
      // Not on items page — persist data then navigate
      try {
        localStorage.setItem(lsPendingGachaCreate(gameId), JSON.stringify(detail))
      } catch { /* ignore */ }
      router.push(`/games/${gameId}/items?tab=gacha&create=1`)
    }
  }

  async function handleGachaPackCodeConflictUpdate() {
    if (!gachaPackCodeConflictExisting || !gameId || !activeConvId || !gachaPackCodeConflictPending) return
    const { pack, turnId, responseIdx, gachaPackIdx } = gachaPackCodeConflictPending
    setIsApplyingGachaPackConflict(true)
    try {
      const patch: Record<string, unknown> = {}
      if (typeof pack.name === 'string' && pack.name.trim()) patch.name = pack.name.trim()
      if (Array.isArray(pack.item_pool) && pack.item_pool.length > 0) patch.item_pool = pack.item_pool
      if (Array.isArray(pack.key_requirements)) patch.key_requirements = pack.key_requirements
      if (pack.collect_destination === 'mailbox' || pack.collect_destination === 'inventory')
        patch.collect_destination = pack.collect_destination
      if (pack.metadata && typeof pack.metadata === 'object' && !Array.isArray(pack.metadata))
        patch.metadata = pack.metadata
      if (Object.keys(patch).length > 0)
        await updateGachaPack({ gameId }, gachaPackCodeConflictExisting.id, patch as any)
      const packKey = `${turnId}:${responseIdx}:${gachaPackIdx}`
      const updated = { ...savedGachaPackIds, [packKey]: gachaPackCodeConflictExisting.id }
      setSavedGachaPackIds(updated)
      safeSetItem(lsGachaPackLinks(activeConvId), JSON.stringify(updated))
      setGachaPackCodeConflictOpen(false)
      toast({ title: t('llmConversation.gachaPackSaved') })
    } catch {
      toast({ title: t('llmConversation.errorSaveGachaPack'), variant: 'destructive' })
    } finally {
      setIsApplyingGachaPackConflict(false)
    }
  }

  function handleGachaPackCodeConflictCreateNew(newCodeName: string) {
    if (!gachaPackCodeConflictPending) return
    const { pack, turnId, responseIdx, gachaPackIdx } = gachaPackCodeConflictPending
    setGachaPackCodeConflictOpen(false)
    fireOpenCreateGachaPack(pack, newCodeName, turnId, responseIdx, gachaPackIdx)
  }

  const VALID_LORE_TYPES = ['world', 'region', 'faction', 'character', 'item_lore', 'event', 'creature', 'custom']


  async function handleApplyTagSuggestion(tag: string, turnId: string, responseIdx: number) {
    if (!gameId || !activeConvId) return
    try {
      const game = await getGame(gameId)
      const existing = game.tags ?? []
      const newTags = Array.from(new Set([...existing, tag]))
      await updateGame(gameId, { tags: newTags })
      const key = `${turnId}:${responseIdx}`
      const updated = { ...appliedTagsPerResponse, [key]: { ...(appliedTagsPerResponse[key] ?? {}), [tag]: true as const } }
      setAppliedTagsPerResponse(updated)
      safeSetItem(lsTagApplied(activeConvId), JSON.stringify(updated))
      toast({ title: t('llmConversation.tagSuggestionApplied').replace('{tag}', tag) })
    } catch {
      toast({ title: t('llmConversation.tagSuggestionApplyError'), variant: 'destructive' })
    }
  }

  async function handleRemoveGameTag(tag: string, turnId: string, responseIdx: number) {
    if (!gameId || !activeConvId) return
    try {
      const game = await getGame(gameId)
      const newTags = (game.tags ?? []).filter((t) => t !== tag)
      await updateGame(gameId, { tags: newTags })
      const key = `${turnId}:${responseIdx}`
      const copy = { ...(appliedTagsPerResponse[key] ?? {}) }
      delete copy[tag]
      const updated = { ...appliedTagsPerResponse, [key]: copy }
      setAppliedTagsPerResponse(updated)
      safeSetItem(lsTagApplied(activeConvId), JSON.stringify(updated))
      toast({ title: t('llmConversation.tagSuggestionRemovedFromGame').replace('{tag}', tag) })
    } catch {
      toast({ title: t('llmConversation.tagSuggestionRemoveFromGameError'), variant: 'destructive' })
    }
  }

  async function handleCreateItemTagFromSuggestion(tag: string, turnId: string, responseIdx: number) {
    if (!gameId || !activeConvId) return
    try {
      const tagKey = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const itemTag = await createItemTag({ gameId }, { tag_key: tagKey, label: tag })
      const key = `${turnId}:${responseIdx}`
      const updated = { ...createdItemTagsPerResponse, [key]: { ...(createdItemTagsPerResponse[key] ?? {}), [tag]: itemTag.id } }
      setCreatedItemTagsPerResponse(updated)
      safeSetItem(lsItemTagCreated(activeConvId), JSON.stringify(updated))
      toast({ title: t('llmConversation.tagSuggestionItemTagCreated').replace('{tag}', tag) })
    } catch {
      toast({ title: t('llmConversation.tagSuggestionItemTagCreateError'), variant: 'destructive' })
    }
  }

  async function handleDeleteItemTagFromSuggestion(tag: string, turnId: string, responseIdx: number) {
    if (!gameId || !activeConvId) return
    const key = `${turnId}:${responseIdx}`
    const itemTagId = createdItemTagsPerResponse[key]?.[tag]
    if (!itemTagId) return
    try {
      await deleteItemTag({ gameId }, itemTagId)
      const copy = { ...(createdItemTagsPerResponse[key] ?? {}) }
      delete copy[tag]
      const updated = { ...createdItemTagsPerResponse, [key]: copy }
      setCreatedItemTagsPerResponse(updated)
      safeSetItem(lsItemTagCreated(activeConvId), JSON.stringify(updated))
      toast({ title: t('llmConversation.tagSuggestionItemTagDeleted').replace('{tag}', tag) })
    } catch {
      toast({ title: t('llmConversation.tagSuggestionDeleteItemTagError'), variant: 'destructive' })
    }
  }

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
                  savedPresetDefinitionIds={savedPresetDefinitionIds}
                  savedContainerDefinitionIds={savedContainerDefinitionIds}
                  savedGachaPackIds={savedGachaPackIds}
                  onRetry={handleRetry}
                  onRetryResponse={handleRetryResponse}
                  onOpenLoreReview={handleOpenLoreReview}
                  onSaveItemDefinition={handleOpenItemDefinitionReview}
                  onSavePresetDefinition={handleSavePresetDefinition}
                  onSaveContainerDefinition={handleSaveContainerDefinition}
                  onSaveGachaPack={handleSaveGachaPack}
                  onApplyTagSuggestion={handleApplyTagSuggestion}
                  onRemoveGameTag={handleRemoveGameTag}
                  onCreateItemTagFromSuggestion={handleCreateItemTagFromSuggestion}
                  onDeleteItemTagFromSuggestion={handleDeleteItemTagFromSuggestion}
                  appliedTagsPerResponse={appliedTagsPerResponse}
                  createdItemTagsPerResponse={createdItemTagsPerResponse}
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
                containerDefinitionNames={containerDefinitionNames}
                gachaPackNames={gachaPackNames}
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
        presetCodeConflictOpen={presetCodeConflictOpen}
        setPresetCodeConflictOpen={setPresetCodeConflictOpen}
        presetCodeConflictExisting={presetCodeConflictExisting}
        isApplyingPresetConflict={isApplyingPresetConflict}
        onPresetCodeConflictUpdate={handlePresetCodeConflictUpdate}
        onPresetCodeConflictSaveNew={handlePresetCodeConflictSaveNew}
        containerNameConflictOpen={containerNameConflictOpen}
        setContainerNameConflictOpen={setContainerNameConflictOpen}
        containerNameConflictExisting={containerNameConflictExisting}
        isApplyingContainerConflict={isApplyingContainerConflict}
        onContainerNameConflictUpdate={handleContainerNameConflictUpdate}
        onContainerNameConflictCreateNew={handleContainerNameConflictCreateNew}
        gachaPackCodeConflictOpen={gachaPackCodeConflictOpen}
        setGachaPackCodeConflictOpen={setGachaPackCodeConflictOpen}
        gachaPackCodeConflictExisting={gachaPackCodeConflictExisting}
        isApplyingGachaPackConflict={isApplyingGachaPackConflict}
        onGachaPackCodeConflictUpdate={handleGachaPackCodeConflictUpdate}
        onGachaPackCodeConflictCreateNew={handleGachaPackCodeConflictCreateNew}
        t={t}
      />
    </>
  )
}
