'use client';
import { useEffect, useRef, useState, } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bot, ExternalLink, Hammer, Loader2, PackagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/use-translation';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage-utils';
import { listConversations, getConversation, updateConversation, archiveConversation, unarchiveConversation, deleteConversation, createRecordsFromConversation, listRequestTypes, linkConversationContent, listConversationContent, unlinkConversationContent, getGameLLMTokenBalance, type TokenUsageInfo, type GameLLMTokenBalance, } from '@/lib/llm-conversation-api';
import { useChatPipeline, ChatTurn } from '@/hooks/use-chat-pipeline';
import type { Conversation, RequestType, ConversationContentLink } from '@/types/llm-conversation';
import { useConvPanelResize } from '@/hooks/use-conv-panel-resize';
import { LS_PANEL_OPEN, LS_PANEL_MINIMIZED, LS_ARCHIVED_COLLAPSED, lsActiveConv, lsConvHistory, lsLoreLinks, lsItemLinks, lsPresetLinks, lsContainerLinks, lsGachaPackLinks, lsEquipmentSlotLinks, lsCraftingRecipeLinks, lsLoreTitles, lsItemNames, lsEntityLinks, lsEntityNames, lsContainerNames, lsGachaPackNames, lsEquipmentSlotNames, lsCraftingRecipeNames, lsEntityPoolLinks, lsEntityPoolNames, lsEntityPoolKeys, lsQuestLinks, lsQuestNames, lsQuestCodes, lsConvTokenUsage, lsPendingCraftingRecipeCreate, lsPendingCraftingRecipeEdit, lsPendingGachaCreate, lsPendingGachaEdit, lsPendingEquipmentSlotCreate, lsPendingEquipmentSlotEdit, lsPendingEntityDefinitionCreate, lsPendingEntityPoolCreate, lsPendingEntityPoolEdit, lsPendingQuestCreate, lsPendingQuestEdit, lsTagApplied, lsItemTagCreated, parseLoreResponse, parseGeneratedItemsResponse, parseGeneratedEntityDefinitionsResponse, parseGeneratedPresetsResponse, parseGeneratedContainersResponse, parseGeneratedGachaPacksResponse, parseGeneratedEquipmentSlotsResponse, parseGeneratedCraftingRecipesResponse, parseGeneratedEntityPoolsResponse, extractGameId, } from './conversation-panel-utils';
import { ConversationSidebar } from './ConversationSidebar';
import { ConversationHeader } from './ConversationHeader';
import { ConversationChatHistory } from './ConversationChatHistory';
import { ConversationLinkedContent } from './ConversationLinkedContent';
import { ConversationInputArea } from './ConversationInputArea';
import { ConversationDialogs } from './ConversationDialogs';
import type { LoreDraftForm } from './ConversationDialogs';
import { createLoreEntry, getLoreEntry, updateLoreEntry } from '@/lib/lore-api';
import type { LoreEntry } from '@/types/lore';
import { CreateItemDefinitionDialog, type CreateItemInitialValues, type CreateItemInitialGenPoolEntry } from '@/components/CreateItemDefinitionDialog';
import { listEntityDefinitions, getEntityDefinition, getEntityPool, listEntityPools, createEntityPool, createEntityPoolEntry, deleteEntityPoolEntry, updateEntityDefinition, updateEntityPool } from '@/lib/entity-definition-api';
import type { EntityDefinition, EntityPool, UpdateEntityDefinitionRequest } from '@/types/entity-definition';
import { listItemDefinitions, getItemDefinition, createItemTag, deleteItemTag, listPresetDefinitions, updatePresetDefinition, listContainerDefinitions, getContainerDefinition, listGachaPacks, getGachaPack, listEquipmentSlots } from '@/lib/inventory-api';
import type { ItemDefinition, ContainerDefinition, GachaPack, EquipmentSlot } from '@/types/inventory';
import type { PresetDefinition } from '@/lib/inventory-api';
import { getCraftingRecipe, getCraftingRecipeByKey } from '@/lib/crafting-api';
import type { CraftingRecipe } from '@/types/crafting';
import { listQuestDefinitions } from '@/lib/quest-api';
import type { QuestDefinition } from '@/lib/quest-api';
import { updateGame, getGame } from '@/lib/game-api';
import { useEscapeLayer } from '@/hooks/use-escape-manager';
import { toSafeCodeName } from '@/lib/utils';
function formatContainerLabel(container?: Pick<ContainerDefinition, 'name' | 'code_name'> | null): string {
    if (!container)
        return '';
    const name = typeof container.name === 'string' ? container.name.trim() : '';
    const codeName = typeof container.code_name === 'string' ? container.code_name.trim() : '';
    if (name && codeName)
        return `${name} (${codeName})`;
    return name || codeName;
}
// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LLMConversationPanel() {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useTranslation();
    const gameId = extractGameId(pathname);
    // Defer rendering until after hydration to avoid localStorage mismatch
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    // Panel visibility state — suppress if URL contains noconvpanel=1 (e.g. links opened from the panel itself)
    const [isOpen, setIsOpen] = useState(() => {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('noconvpanel') === '1')
            return false;
        return safeGetItem(LS_PANEL_OPEN) === 'true';
    });
    const [isMinimized, setIsMinimized] = useState(() => safeGetItem(LS_PANEL_MINIMIZED) === 'true');
    // Token balance
    const [tokenBalance, setTokenBalance] = useState<GameLLMTokenBalance | null>(null);
    const [conversationTokenUsage, setConversationTokenUsage] = useState<number | null>(null);
    // Sidebar state — two separate lists
    const [activeConvs, setActiveConvs] = useState<Conversation[]>([]);
    const [isLoadingActive, setIsLoadingActive] = useState(false);
    const [archivedConvs, setArchivedConvs] = useState<Conversation[]>([]);
    const [isLoadingArchived, setIsLoadingArchived] = useState(false);
    const [isArchivedCollapsed, setIsArchivedCollapsed] = useState<boolean>(() => safeGetItem(LS_ARCHIVED_COLLAPSED) !== 'false');
    // Active conversation
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [isLoadingConv, setIsLoadingConv] = useState(false);
    const activeConvIdRef = useRef<string | null>(null);
    // Inline title/goal editing
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingGoal, setEditingGoal] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [editGoalValue, setEditGoalValue] = useState('');
    // Message input
    const [message, setMessage] = useState('');
    // When we create a conversation ourselves in handleSend, skip loadConversation in the useEffect
    const justCreatedConvIdRef = useRef<string | null>(null);
    // Tracks which convId "owns" the current chatHistory.
    // Prevents the persist effect from writing a previous conversation's turns
    // into a different conversation's localStorage key when switching.
    const chatHistoryConvIdRef = useRef<string | null>(null);
    // Chat pipeline — sequential: createConversation (REST) → streamDetectIntent (SSE)
    const { isRunning: isStreaming, chatHistory, send: runPipeline, retryResponse, clearHistory, loadHistory, removeTurn } = useChatPipeline();
    // Request type selector
    const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
    const [selectedRequestType, setSelectedRequestType] = useState<string>('auto');
    // When selectedRequestType was resolved by auto-detection, stores the detected key so
    // the trigger can display "Auto - [label]" instead of just the label.
    const [autoDetectedType, setAutoDetectedType] = useState<string | null>(null);
    // Archive/delete dialogs
    const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
    // Create records
    const [isCreatingRecords, setIsCreatingRecords] = useState(false);
    const [createRecordsConfirmOpen, setCreateRecordsConfirmOpen] = useState(false);
    // Detail dialog
    const [detailOpen, setDetailOpen] = useState(false);
    // Saved lore IDs per turn response (keyed as "turnId:responseIdx")
    const [savedLoreIds, setSavedLoreIds] = useState<Record<string, string>>({});
    // Lore draft review
    const [loreDraftReviewOpen, setLoreDraftReviewOpen] = useState(false);
    const [loreDraftReviewTurn, setLoreDraftReviewTurn] = useState<ChatTurn | null>(null);
    const [loreDraftReviewResponseIdx, setLoreDraftReviewResponseIdx] = useState(0);
    const [loreDraftForm, setLoreDraftForm] = useState<LoreDraftForm>({ lore_type: 'custom', title: '', summary: '', content: '' });
    const [isCreatingLoreRecords, setIsCreatingLoreRecords] = useState(false);
    // Item definition draft review
    const [savedItemDefinitionIds, setSavedItemDefinitionIds] = useState<Record<string, string>>({});
    // Entity definition saved IDs (keyed as "turnId:responseIdx:entityDefinitionIdx")
    const [savedEntityDefinitionIds, setSavedEntityDefinitionIds] = useState<Record<string, string>>({});
    // Preset definition saved IDs (keyed as "turnId:responseIdx:presetIdx")
    const [savedPresetDefinitionIds, setSavedPresetDefinitionIds] = useState<Record<string, string>>({});
    // Container definition saved IDs (keyed as "turnId:responseIdx:containerIdx")
    const [savedContainerDefinitionIds, setSavedContainerDefinitionIds] = useState<Record<string, string>>({});
    // Quest definition saved IDs (keyed as "turnId:responseIdx:questDefinitionIdx")
    const [savedQuestDefinitionIds, setSavedQuestDefinitionIds] = useState<Record<string, string>>({});
    const [itemDefReviewOpen, setItemDefReviewOpen] = useState(false);
    const [itemDefReviewItem, setItemDefReviewItem] = useState<Record<string, unknown> | null>(null);
    const [itemDefReviewTurnId, setItemDefReviewTurnId] = useState<string | null>(null);
    const [itemDefReviewResponseIdx, setItemDefReviewResponseIdx] = useState(0);
    const [itemDefReviewItemIdx, setItemDefReviewItemIdx] = useState(0);
    const [itemInitialValues, setItemInitialValues] = useState<CreateItemInitialValues | null>(null);
    const [entityDefinitionNames, setEntityDefinitionNames] = useState<Record<string, string>>({});
    const [entityDefinitionConflictOpen, setEntityDefinitionConflictOpen] = useState(false);
    const [entityDefinitionConflictExisting, setEntityDefinitionConflictExisting] = useState<EntityDefinition | null>(null);
    const [entityDefinitionConflictReviewOpen, setEntityDefinitionConflictReviewOpen] = useState(false);
    const [entityDefinitionConflictReviewData, setEntityDefinitionConflictReviewData] = useState<UpdateEntityDefinitionRequest | null>(null);
    const [entityDefinitionConflictPending, setEntityDefinitionConflictPending] = useState<{
        entityDefinition: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        entityDefinitionIdx: number;
    } | null>(null);
    const [isApplyingEntityDefinitionConflict, setIsApplyingEntityDefinitionConflict] = useState(false);
    const [entityPoolConflictOpen, setEntityPoolConflictOpen] = useState(false);
    const [entityPoolConflictExisting, setEntityPoolConflictExisting] = useState<EntityPool | null>(null);
    const [entityPoolConflictReviewOpen, setEntityPoolConflictReviewOpen] = useState(false);
    const [entityPoolConflictReviewData, setEntityPoolConflictReviewData] = useState<Record<string, unknown> | null>(null);
    const [entityPoolConflictPending, setEntityPoolConflictPending] = useState<{
        entityPool: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        entityPoolIdx: number;
    } | null>(null);
    const [isApplyingEntityPoolConflict, setIsApplyingEntityPoolConflict] = useState(false);
    const [questDefinitionNames, setQuestDefinitionNames] = useState<Record<string, string>>({});
    const [questDefinitionCodes, setQuestDefinitionCodes] = useState<Record<string, string>>({});
    const [questCodeConflictOpen, setQuestCodeConflictOpen] = useState(false);
    const [questCodeConflictExisting, setQuestCodeConflictExisting] = useState<QuestDefinition | null>(null);
    const [questCodeConflictPending, setQuestCodeConflictPending] = useState<{
        questDefinition: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        questDefinitionIdx: number;
    } | null>(null);
    const [newQuestCodeInput, setNewQuestCodeInput] = useState('');
    // Tag suggestion — tracks which individual tags have been applied per response
    const [appliedTagsPerResponse, setAppliedTagsPerResponse] = useState<Record<string, Record<string, true>>>({});
    const [createdItemTagsPerResponse, setCreatedItemTagsPerResponse] = useState<Record<string, Record<string, string>>>({});
    // Item code conflict dialog (shown when item_code already exists in backend)
    const [itemCodeConflictOpen, setItemCodeConflictOpen] = useState(false);
    const [itemCodeConflictExisting, setItemCodeConflictExisting] = useState<ItemDefinition | null>(null);
    const [itemCodeConflictInitialValues, setItemCodeConflictInitialValues] = useState<CreateItemInitialValues | null>(null);
    const [itemCodeConflictTurnId, setItemCodeConflictTurnId] = useState<string | null>(null);
    const [itemCodeConflictResponseIdx, setItemCodeConflictResponseIdx] = useState(0);
    const [itemCodeConflictItemIdx, setItemCodeConflictItemIdx] = useState(0);
    const [itemCodeConflictEditOpen, setItemCodeConflictEditOpen] = useState(false);
    // Preset code conflict dialog (shown when code_name already exists in backend)
    const [presetCodeConflictOpen, setPresetCodeConflictOpen] = useState(false);
    const [presetCodeConflictExisting, setPresetCodeConflictExisting] = useState<PresetDefinition | null>(null);
    const [presetCodeConflictPendingPreset, setPresetCodeConflictPendingPreset] = useState<Record<string, unknown> | null>(null);
    const [presetConflictTurnContext, setPresetConflictTurnContext] = useState<{
        turnId: string;
        responseIdx: number;
        presetIdx: number;
    } | null>(null);
    const isApplyingPresetConflict = false;
    // Container name conflict dialog (shown when name already exists in backend)
    const [containerNameConflictOpen, setContainerNameConflictOpen] = useState(false);
    const [containerNameConflictExisting, setContainerNameConflictExisting] = useState<ContainerDefinition | null>(null);
    const [containerNameConflictPending, setContainerNameConflictPending] = useState<{
        container: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        containerIdx: number;
    } | null>(null);
    // Tracks the last completed item_generation response parsed as array
    const [convGeneratedItems, setConvGeneratedItems] = useState<unknown[]>([]);
    // Tracks the last completed entity_definition_generation response parsed as array
    const [convGeneratedEntityDefinitions, setConvGeneratedEntityDefinitions] = useState<unknown[]>([]);
    // Tracks the last completed preset_generation response parsed as array
    const [convGeneratedPresets, setConvGeneratedPresets] = useState<unknown[]>([]);
    // Tracks the last completed container_generation response parsed as array
    const [convGeneratedContainers, setConvGeneratedContainers] = useState<unknown[]>([]);
    // Tracks the last completed gacha_pack_creating response parsed as array
    const [convGeneratedGachaPacks, setConvGeneratedGachaPacks] = useState<unknown[]>([]);
    // Tracks the last completed equipment_slot_generation response parsed as array
    const [convGeneratedEquipmentSlots, setConvGeneratedEquipmentSlots] = useState<unknown[]>([]);
    // Tracks the last completed crafting_recipe_creating response parsed as array
    const [convGeneratedCraftingRecipes, setConvGeneratedCraftingRecipes] = useState<unknown[]>([]);
    // Tracks the last completed entity_pool_creating response parsed as array
    const [convGeneratedEntityPools, setConvGeneratedEntityPools] = useState<unknown[]>([]);
    // Linked content for the active conversation
    const [linkedContent, setLinkedContent] = useState<ConversationContentLink[]>([]);
    const [isLoadingLinkedContent, setIsLoadingLinkedContent] = useState(false);
    const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
    const [loreEntryTitles, setLoreEntryTitles] = useState<Record<string, string>>({});
    const [itemDefinitionNames, setItemDefinitionNames] = useState<Record<string, string>>({});
    const [containerDefinitionNames, setContainerDefinitionNames] = useState<Record<string, string>>({});
    const [presetDefinitionNames, setPresetDefinitionNames] = useState<Record<string, string>>({});
    // Gacha pack saved IDs (keyed as "turnId:responseIdx:gachaPackIdx")
    const [savedGachaPackIds, setSavedGachaPackIds] = useState<Record<string, string>>({});
    const [gachaPackNames, setGachaPackNames] = useState<Record<string, string>>({});
    // Equipment slot saved IDs (keyed as "turnId:responseIdx:equipmentSlotIdx")
    const [savedEquipmentSlotIds, setSavedEquipmentSlotIds] = useState<Record<string, string>>({});
    const [equipmentSlotNames, setEquipmentSlotNames] = useState<Record<string, string>>({});
    // Crafting recipe saved IDs (keyed as "turnId:responseIdx:craftingRecipeIdx")
    const [savedCraftingRecipeIds, setSavedCraftingRecipeIds] = useState<Record<string, string>>({});
    const [craftingRecipeNames, setCraftingRecipeNames] = useState<Record<string, string>>({});
    // Entity pool saved IDs (keyed as "turnId:responseIdx:entityPoolIdx")
    const [savedEntityPoolIds, setSavedEntityPoolIds] = useState<Record<string, string>>({});
    const [entityPoolNames, setEntityPoolNames] = useState<Record<string, string>>({});
    const [entityPoolKeys, setEntityPoolKeys] = useState<Record<string, string>>({});
    const [entityDefinitionKeyToId, setEntityDefinitionKeyToId] = useState<Record<string, string>>({});
    // Crafting recipe key conflict dialog (shown when recipe_key already exists in backend)
    const [craftingRecipeConflictOpen, setCraftingRecipeConflictOpen] = useState(false);
    const [craftingRecipeConflictExisting, setCraftingRecipeConflictExisting] = useState<CraftingRecipe | null>(null);
    const [craftingRecipeConflictPending, setCraftingRecipeConflictPending] = useState<{
        recipe: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        craftingRecipeIdx: number;
    } | null>(null);
    const [isApplyingCraftingRecipeConflict, setIsApplyingCraftingRecipeConflict] = useState(false);
    const [craftingRecipeReviewOpen, setCraftingRecipeReviewOpen] = useState(false);
    const [craftingRecipeReviewData, setCraftingRecipeReviewData] = useState<Record<string, unknown> | null>(null);
    const [newCraftingRecipeKeyInput, setNewCraftingRecipeKeyInput] = useState('');
    // Gacha pack code conflict dialog (shown when code_name already exists in backend)
    const [gachaPackCodeConflictOpen, setGachaPackCodeConflictOpen] = useState(false);
    const [gachaPackCodeConflictExisting, setGachaPackCodeConflictExisting] = useState<GachaPack | null>(null);
    const [gachaPackCodeConflictPending, setGachaPackCodeConflictPending] = useState<{
        pack: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        gachaPackIdx: number;
    } | null>(null);
    const [isApplyingGachaPackConflict, setIsApplyingGachaPackConflict] = useState(false);
    // Equipment slot key conflict dialog (shown when slot_key already exists in backend)
    const [equipmentSlotKeyConflictOpen, setEquipmentSlotKeyConflictOpen] = useState(false);
    const [equipmentSlotKeyConflictExisting, setEquipmentSlotKeyConflictExisting] = useState<EquipmentSlot | null>(null);
    const [equipmentSlotKeyConflictPending, setEquipmentSlotKeyConflictPending] = useState<{
        slot: Record<string, unknown>;
        turnId: string;
        responseIdx: number;
        equipmentSlotIdx: number;
    } | null>(null);
    const [isApplyingEquipmentSlotConflict, setIsApplyingEquipmentSlotConflict] = useState(false);
    // Resize state via hook
    const { panelWidth, handleResizeMouseDown, sidebarWidth, handleSidebarResizeMouseDown, activeSectionHeight, handleSplitResizeMouseDown, sidebarBodyRef } = useConvPanelResize();
    useEffect(() => { safeSetItem(LS_ARCHIVED_COLLAPSED, String(isArchivedCollapsed)); }, [isArchivedCollapsed]);
    // ---------------------------------------------------------------------------
    // Fetch request types once on mount
    // ---------------------------------------------------------------------------
    useEffect(() => {
        listRequestTypes()
            .then((keys) => {
            const auto: RequestType = { key: 'auto', label: t('llmConversation.requestTypes.auto') };
            const mapped: RequestType[] = keys.map((k) => ({
                key: k,
                label: t(`llmConversation.requestTypes.${k}`) || k,
            }));
            setRequestTypes([auto, ...mapped]);
        })
            .catch(() => {
            toast({ title: t('llmConversation.errorLoadRequestTypes'), variant: 'destructive' });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // ---------------------------------------------------------------------------
    // After auto-detection completes, update the display label only.
    // selectedRequestType stays 'auto' so every send re-runs detect-intent.
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const lastTurn = chatHistory[chatHistory.length - 1];
        if (lastTurn?.done && lastTurn.detectedType && !lastTurn.error) {
            setAutoDetectedType(lastTurn.detectedType);
        }
    }, [chatHistory]);
    // ---------------------------------------------------------------------------
    // Persist UI state to localStorage
    // ---------------------------------------------------------------------------
    useEffect(() => {
        safeSetItem(LS_PANEL_OPEN, String(isOpen));
        window.dispatchEvent(new Event('ss:conv-state-changed'));
    }, [isOpen]);
    useEffect(() => { safeSetItem(LS_PANEL_MINIMIZED, String(isMinimized)); }, [isMinimized]);
    // External toggle via custom event (e.g. from GameNavButtons)
    useEffect(() => {
        const handleToggle = () => {
            setIsOpen((prev) => {
                if (!prev) {
                    setIsMinimized(false);
                    return true;
                }
                return false;
            });
        };
        window.addEventListener('ss:conv-toggle', handleToggle);
        return () => window.removeEventListener('ss:conv-toggle', handleToggle);
    }, []);
    // Close panel on Escape — but only when no layered dialog is open.
    // Each registered layer pops one-at-a-time; see hooks/use-escape-manager.ts.
    // Keep the conversation itself below any nested dialog/panel layers.
    useEscapeLayer(isOpen, () => setIsOpen(false), -1);
    // Persist completed chat turns for the active conversation
    useEffect(() => {
        if (!activeConvId || chatHistory.length === 0)
            return;
        // Guard: only persist when chatHistory actually belongs to the active conversation.
        // When switching to an empty conv the previous conv's turns are still in chatHistory
        // (preserved for context) — skip writing so we don't corrupt the new conv's key.
        if (chatHistoryConvIdRef.current !== activeConvId)
            return;
        const completedTurns = chatHistory.filter((t) => t.done);
        if (completedTurns.length > 0) {
            safeSetItem(lsConvHistory(activeConvId), JSON.stringify(completedTurns));
        }
    }, [chatHistory, activeConvId]);
    // Keep the last completed item_generation response parsed as generated items array
    useEffect(() => {
        let lastGeneratedItems: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if ((response.intentType === 'item_generation' || response.intentType === 'generator_item_creating') && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedItemsResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedItems = parsed;
                    }
                }
            }
        }
        setConvGeneratedItems(lastGeneratedItems);
    }, [chatHistory]);
    // Keep the last completed entity_definition_generation response parsed as entity definitions array
    useEffect(() => {
        let lastGeneratedEntityDefinitions: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'entity_definition_generation' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedEntityDefinitionsResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedEntityDefinitions = parsed;
                    }
                }
            }
        }
        setConvGeneratedEntityDefinitions(lastGeneratedEntityDefinitions);
    }, [chatHistory]);
    // Keep the last completed preset_generation response parsed as presets array
    useEffect(() => {
        let lastGeneratedPresets: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'preset_generation' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedPresetsResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedPresets = parsed;
                    }
                }
            }
        }
        setConvGeneratedPresets(lastGeneratedPresets);
    }, [chatHistory]);
    // Keep the last completed container_generation response parsed as containers array
    useEffect(() => {
        let lastGeneratedContainers: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'container_creating' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedContainersResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedContainers = parsed;
                    }
                }
            }
        }
        setConvGeneratedContainers(lastGeneratedContainers);
    }, [chatHistory]);
    // Keep the last completed gacha_pack_creating response parsed as gacha packs array
    useEffect(() => {
        let lastGeneratedGachaPacks: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'gacha_pack_creating' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedGachaPacksResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedGachaPacks = parsed;
                    }
                }
            }
        }
        setConvGeneratedGachaPacks(lastGeneratedGachaPacks);
    }, [chatHistory]);
    // Keep the last completed equipment_slot_generation response parsed as equipment slots array
    useEffect(() => {
        let lastGeneratedEquipmentSlots: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'equipment_slot_generation' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedEquipmentSlotsResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedEquipmentSlots = parsed;
                    }
                }
            }
        }
        setConvGeneratedEquipmentSlots(lastGeneratedEquipmentSlots);
    }, [chatHistory]);
    // Keep the last completed crafting_recipe_creating response parsed as recipes array
    useEffect(() => {
        let lastGeneratedCraftingRecipes: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'crafting_recipe_creating' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedCraftingRecipesResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedCraftingRecipes = parsed;
                    }
                }
            }
        }
        setConvGeneratedCraftingRecipes(lastGeneratedCraftingRecipes);
    }, [chatHistory]);
    // Keep the last completed entity_pool_creating response parsed as pools array
    useEffect(() => {
        let lastGeneratedEntityPools: unknown[] = [];
        for (const turn of chatHistory) {
            if (!turn.responses)
                continue;
            for (const response of turn.responses) {
                if (response.intentType === 'entity_pool_creating' && response.done && !response.error && response.responseText) {
                    const parsed = parseGeneratedEntityPoolsResponse(response.responseText);
                    if (parsed.length > 0) {
                        lastGeneratedEntityPools = parsed;
                    }
                }
            }
        }
        setConvGeneratedEntityPools(lastGeneratedEntityPools);
    }, [chatHistory]);
    // Reset applied tag keys when switching conversations.
    useEffect(() => {
        setConvGeneratedItems([]);
        setConvGeneratedEntityDefinitions([]);
        setConvGeneratedPresets([]);
        setConvGeneratedContainers([]);
        setConvGeneratedGachaPacks([]);
        setConvGeneratedEquipmentSlots([]);
        setConvGeneratedCraftingRecipes([]);
        setConvGeneratedEntityPools([]);
        setAppliedTagsPerResponse({});
        setCreatedItemTagsPerResponse({});
        setEntityDefinitionNames({});
        setSavedEntityPoolIds({});
        setEntityPoolNames({});
        setEntityDefinitionKeyToId({});
    }, [activeConvId]);
    // Persist lore entry titles to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(loreEntryTitles).length === 0)
            return;
        safeSetItem(lsLoreTitles(activeConvId), JSON.stringify(loreEntryTitles));
    }, [loreEntryTitles, activeConvId]);
    // Persist item definition names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(itemDefinitionNames).length === 0)
            return;
        safeSetItem(lsItemNames(activeConvId), JSON.stringify(itemDefinitionNames));
    }, [itemDefinitionNames, activeConvId]);
    // Persist entity definition names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(entityDefinitionNames).length === 0)
            return;
        safeSetItem(lsEntityNames(activeConvId), JSON.stringify(entityDefinitionNames));
    }, [entityDefinitionNames, activeConvId]);
    // Persist container definition names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(containerDefinitionNames).length === 0)
            return;
        safeSetItem(lsContainerNames(activeConvId), JSON.stringify(containerDefinitionNames));
    }, [containerDefinitionNames, activeConvId]);
    // Persist gacha pack names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(gachaPackNames).length === 0)
            return;
        safeSetItem(lsGachaPackNames(activeConvId), JSON.stringify(gachaPackNames));
    }, [gachaPackNames, activeConvId]);
    // Persist equipment slot names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(equipmentSlotNames).length === 0)
            return;
        safeSetItem(lsEquipmentSlotNames(activeConvId), JSON.stringify(equipmentSlotNames));
    }, [equipmentSlotNames, activeConvId]);
    // Persist crafting recipe names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(craftingRecipeNames).length === 0)
            return;
        safeSetItem(lsCraftingRecipeNames(activeConvId), JSON.stringify(craftingRecipeNames));
    }, [craftingRecipeNames, activeConvId]);
    // Persist entity pool names to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(entityPoolNames).length === 0)
            return;
        safeSetItem(lsEntityPoolNames(activeConvId), JSON.stringify(entityPoolNames));
    }, [entityPoolNames, activeConvId]);
    // Persist entity pool keys to localStorage whenever they change (survives F5)
    useEffect(() => {
        if (!activeConvId || Object.keys(entityPoolKeys).length === 0)
            return;
        safeSetItem(lsEntityPoolKeys(activeConvId), JSON.stringify(entityPoolKeys));
    }, [entityPoolKeys, activeConvId]);
    // ---------------------------------------------------------------------------
    // Load conversations when game changes or panel opens
    // ---------------------------------------------------------------------------
    const prevGameIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (!gameId) {
            // Reset when no game is selected
            setActiveConvs([]);
            setArchivedConvs([]);
            setActiveConvId(null);
            setActiveConv(null);
            prevGameIdRef.current = null;
            return;
        }
        if (gameId !== prevGameIdRef.current) {
            // Game changed — flush state
            prevGameIdRef.current = gameId;
            setActiveConvs([]);
            setArchivedConvs([]);
            setActiveConv(null);
            const savedConvId = safeGetItem(lsActiveConv(gameId));
            setActiveConvId(savedConvId ?? null);
            if (isOpen)
                loadBothLists(gameId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId]);
    useEffect(() => {
        if (isOpen && gameId) {
            loadBothLists(gameId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    // ---------------------------------------------------------------------------
    // Load active conversation when activeConvId changes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        activeConvIdRef.current = activeConvId;
        setEntityDefinitionConflictOpen(false);
        setEntityDefinitionConflictExisting(null);
        setEntityDefinitionConflictReviewOpen(false);
        setEntityDefinitionConflictReviewData(null);
        setEntityDefinitionConflictPending(null);
        setIsApplyingEntityDefinitionConflict(false);
        if (!gameId || !activeConvId) {
            setActiveConv(null);
            setConversationTokenUsage(null);
            setLinkedContent([]);
            setLoreEntryTitles({});
            setItemDefinitionNames({});
            setEntityDefinitionNames({});
            setEntityPoolNames({});
            setEntityPoolKeys({});
            setQuestDefinitionNames({});
            setQuestDefinitionCodes({});
            setContainerDefinitionNames({});
            setPresetDefinitionNames({});
            setGachaPackNames({});
            chatHistoryConvIdRef.current = null;
            clearHistory();
            setSavedLoreIds({});
            setSavedItemDefinitionIds({});
            setSavedEntityDefinitionIds({});
            setSavedPresetDefinitionIds({});
            setSavedContainerDefinitionIds({});
            setSavedGachaPackIds({});
            setSavedEntityPoolIds({});
            if (gameId) {
                safeRemoveItem(lsActiveConv(gameId));
                window.dispatchEvent(new Event('ss:conv-state-changed'));
            }
            return;
        }
        safeSetItem(lsActiveConv(gameId), activeConvId);
        const rawTokenUsage = safeGetItem(lsConvTokenUsage(activeConvId));
        const parsedTokenUsage = rawTokenUsage ? Number(rawTokenUsage) : 0;
        setConversationTokenUsage(Number.isFinite(parsedTokenUsage) && parsedTokenUsage >= 0 ? parsedTokenUsage : 0);
        window.dispatchEvent(new Event('ss:conv-state-changed'));
        // Skip re-fetching when the conversation was just created by handleSend
        if (justCreatedConvIdRef.current === activeConvId) {
            justCreatedConvIdRef.current = null;
            return;
        }
        // Restore chat history from localStorage.
        // Always clear history when switching conversations to avoid showing stale content.
        const raw = safeGetItem(lsConvHistory(activeConvId));
        chatHistoryConvIdRef.current = activeConvId;
        clearHistory();
        if (raw) {
            try {
                loadHistory(JSON.parse(raw));
            }
            catch {
                loadHistory([]);
            }
        }
        // Restore saved lore IDs from localStorage
        const rawLoreLinks = safeGetItem(lsLoreLinks(activeConvId));
        setSavedLoreIds(rawLoreLinks ? JSON.parse(rawLoreLinks) : {});
        // Restore saved item definition IDs from localStorage
        const rawItemLinks = safeGetItem(lsItemLinks(activeConvId));
        setSavedItemDefinitionIds(rawItemLinks ? JSON.parse(rawItemLinks) : {});
        // Restore saved entity definition IDs from localStorage
        const rawEntityLinks = safeGetItem(lsEntityLinks(activeConvId));
        setSavedEntityDefinitionIds(rawEntityLinks ? JSON.parse(rawEntityLinks) : {});
        // Restore saved preset definition IDs from localStorage
        const rawPresetLinks = safeGetItem(lsPresetLinks(activeConvId));
        setSavedPresetDefinitionIds(rawPresetLinks ? JSON.parse(rawPresetLinks) : {});
        // Restore saved container definition IDs from localStorage
        const rawContainerLinks = safeGetItem(lsContainerLinks(activeConvId));
        setSavedContainerDefinitionIds(rawContainerLinks ? JSON.parse(rawContainerLinks) : {});
        setPresetDefinitionNames({});
        // Restore saved gacha pack IDs from localStorage
        const rawGachaPackLinks = safeGetItem(lsGachaPackLinks(activeConvId));
        setSavedGachaPackIds(rawGachaPackLinks ? JSON.parse(rawGachaPackLinks) : {});
        // Restore saved equipment slot IDs from localStorage
        const rawEquipmentSlotLinks = safeGetItem(lsEquipmentSlotLinks(activeConvId));
        setSavedEquipmentSlotIds(rawEquipmentSlotLinks ? JSON.parse(rawEquipmentSlotLinks) : {});
        // Restore saved crafting recipe IDs from localStorage
        const rawCraftingRecipeLinks = safeGetItem(lsCraftingRecipeLinks(activeConvId));
        setSavedCraftingRecipeIds(rawCraftingRecipeLinks ? JSON.parse(rawCraftingRecipeLinks) : {});
        // Restore saved entity pool IDs from localStorage
        const rawEntityPoolLinks = safeGetItem(lsEntityPoolLinks(activeConvId));
        setSavedEntityPoolIds(rawEntityPoolLinks ? JSON.parse(rawEntityPoolLinks) : {});
        // Restore cached entity pool keys from localStorage
        const rawEntityPoolKeys = safeGetItem(lsEntityPoolKeys(activeConvId));
        if (rawEntityPoolKeys) {
            try {
                setEntityPoolKeys(JSON.parse(rawEntityPoolKeys));
            }
            catch {
                setEntityPoolKeys({});
            }
        }
        // Restore cached lore titles and item names from localStorage
        const rawLoreTitles = safeGetItem(lsLoreTitles(activeConvId));
        if (rawLoreTitles) {
            try {
                setLoreEntryTitles(JSON.parse(rawLoreTitles));
            }
            catch {
                setLoreEntryTitles({});
            }
        }
        const rawItemNames = safeGetItem(lsItemNames(activeConvId));
        if (rawItemNames) {
            try {
                setItemDefinitionNames(JSON.parse(rawItemNames));
            }
            catch {
                setItemDefinitionNames({});
            }
        }
        const rawEntityNames = safeGetItem(lsEntityNames(activeConvId));
        if (rawEntityNames) {
            try {
                setEntityDefinitionNames(JSON.parse(rawEntityNames));
            }
            catch {
                setEntityDefinitionNames({});
            }
        }
        const rawContainerNames = safeGetItem(lsContainerNames(activeConvId));
        if (rawContainerNames) {
            try {
                setContainerDefinitionNames(JSON.parse(rawContainerNames));
            }
            catch {
                setContainerDefinitionNames({});
            }
        }
        const rawGachaPackNames = safeGetItem(lsGachaPackNames(activeConvId));
        if (rawGachaPackNames) {
            try {
                setGachaPackNames(JSON.parse(rawGachaPackNames));
            }
            catch {
                setGachaPackNames({});
            }
        }
        const rawEquipmentSlotNames = safeGetItem(lsEquipmentSlotNames(activeConvId));
        if (rawEquipmentSlotNames) {
            try {
                setEquipmentSlotNames(JSON.parse(rawEquipmentSlotNames));
            }
            catch {
                setEquipmentSlotNames({});
            }
        }
        const rawCraftingRecipeNames = safeGetItem(lsCraftingRecipeNames(activeConvId));
        if (rawCraftingRecipeNames) {
            try {
                setCraftingRecipeNames(JSON.parse(rawCraftingRecipeNames));
            }
            catch {
                setCraftingRecipeNames({});
            }
        }
        const rawEntityPoolNames = safeGetItem(lsEntityPoolNames(activeConvId));
        if (rawEntityPoolNames) {
            try {
                setEntityPoolNames(JSON.parse(rawEntityPoolNames));
            }
            catch {
                setEntityPoolNames({});
            }
        }
        const rawQuestLinks = safeGetItem(lsQuestLinks(activeConvId));
        if (rawQuestLinks) {
            try {
                setSavedQuestDefinitionIds(JSON.parse(rawQuestLinks));
            }
            catch {
                setSavedQuestDefinitionIds({});
            }
        }
        const rawQuestNames = safeGetItem(lsQuestNames(activeConvId));
        if (rawQuestNames) {
            try {
                setQuestDefinitionNames(JSON.parse(rawQuestNames));
            }
            catch {
                setQuestDefinitionNames({});
            }
        }
        const rawQuestCodes = safeGetItem(lsQuestCodes(activeConvId));
        if (rawQuestCodes) {
            try {
                setQuestDefinitionCodes(JSON.parse(rawQuestCodes));
            }
            catch {
                setQuestDefinitionCodes({});
            }
        }
        // Restore applied game tags and created item tags from localStorage
        const rawTagApplied = safeGetItem(lsTagApplied(activeConvId));
        setAppliedTagsPerResponse(rawTagApplied ? JSON.parse(rawTagApplied) : {});
        const rawItemTagCreated = safeGetItem(lsItemTagCreated(activeConvId));
        setCreatedItemTagsPerResponse(rawItemTagCreated ? JSON.parse(rawItemTagCreated) : {});
        loadConversation(gameId, activeConvId);
        loadLinkedContent(gameId, activeConvId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConvId, gameId]);
    useEffect(() => {
        if (!activeConvId || conversationTokenUsage == null)
            return;
        safeSetItem(lsConvTokenUsage(activeConvId), String(conversationTokenUsage));
    }, [activeConvId, conversationTokenUsage]);
    // Listen for externally created conversations (e.g. from lore link button)
    useEffect(() => {
        function handleExternalConvCreated(e: Event) {
            const detail = (e as CustomEvent<{
                convId: string;
                gameId: string;
            }>).detail;
            if (detail.gameId === gameId) {
                setActiveConvId(detail.convId);
                loadActiveConvs(gameId);
            }
        }
        window.addEventListener('ss:conv-external-created', handleExternalConvCreated);
        return () => window.removeEventListener('ss:conv-external-created', handleExternalConvCreated);
    }, [gameId]);
    // Reload linked content when an external action links new content to the active conversation
    useEffect(() => {
        function handleContentLinked(e: Event) {
            const detail = (e as CustomEvent<{
                convId: string;
                gameId: string;
                contentType?: string;
                contentId?: string;
                contentName?: string;
            }>).detail;
            if (detail.gameId !== gameId)
                return;
            if (detail.contentId && detail.contentName && detail.contentType) {
                // Cache the name immediately so it's available when linkedContent renders
                if (detail.contentType === 'item_definition') {
                    setItemDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'entity_definition') {
                    setEntityDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'entity_pool') {
                    setEntityPoolNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                    if (detail.convId) {
                        const rawEntityPoolLinks = safeGetItem(lsEntityPoolLinks(detail.convId));
                        if (rawEntityPoolLinks) {
                            try {
                                setSavedEntityPoolIds(JSON.parse(rawEntityPoolLinks));
                            }
                            catch {
                                setSavedEntityPoolIds({});
                            }
                        }
                        else {
                            setSavedEntityPoolIds({});
                        }
                    }
                }
                else if (detail.contentType === 'lore_entry' || detail.contentType === 'lore') {
                    setLoreEntryTitles(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'container_definition') {
                    setContainerDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'preset_definition') {
                    setPresetDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'gacha_pack') {
                    setGachaPackNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'crafting_recipe') {
                    setCraftingRecipeNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                else if (detail.contentType === 'quest_definition') {
                    setQuestDefinitionNames(prev => ({ ...prev, [detail.contentId!]: detail.contentName! }));
                }
                // Inject a synthetic link entry so it shows with its name right away,
                // before loadLinkedContent returns. The API call replaces it with the real entry.
                setLinkedContent(prev => {
                    if (prev.some(l => l.content_id === detail.contentId && l.content_type === detail.contentType))
                        return prev;
                    return [...prev, {
                            id: `synth-${detail.contentId!}`,
                            conversation_id: detail.convId,
                            content_type: detail.contentType!,
                            content_id: detail.contentId!,
                            linked_by: null,
                            created_at: new Date().toISOString(),
                        }];
                });
            }
            // Use detail.convId directly — avoids race where activeConvId hasn't updated yet
            void loadLinkedContent(gameId, detail.convId);
        }
        window.addEventListener('ss:conv-content-linked', handleContentLinked);
        return () => window.removeEventListener('ss:conv-content-linked', handleContentLinked);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId]);
    // Catch successful entity creation triggered from the entity page, map turn context → entity ID
    useEffect(() => {
        function handleEntityCreated(e: Event) {
            const detail = (e as CustomEvent<{
                entityId: string;
                entityName?: string;
                turnId: string;
                responseIdx: number;
                entityDefinitionIdx: number;
                convId?: string;
                gameId?: string;
            }>).detail;
            if (!gameId)
                return;
            if (detail.gameId && detail.gameId !== gameId)
                return;
            const convId = detail.convId ?? activeConvId;
            if (!convId)
                return;
            const entityKey = `${detail.turnId}:${detail.responseIdx}:${detail.entityDefinitionIdx}`;
            setSavedEntityDefinitionIds(prev => {
                const updated = { ...prev, [entityKey]: detail.entityId };
                safeSetItem(lsEntityLinks(convId), JSON.stringify(updated));
                return updated;
            });
            if (detail.entityName) {
                setEntityDefinitionNames(prev => ({ ...prev, [detail.entityId]: detail.entityName! }));
                const existingRaw = safeGetItem(lsEntityNames(convId));
                let existingNames: Record<string, string> = {};
                if (existingRaw) {
                    try {
                        existingNames = JSON.parse(existingRaw) as Record<string, string>;
                    }
                    catch {
                        existingNames = {};
                    }
                }
                safeSetItem(lsEntityNames(convId), JSON.stringify({ ...existingNames, [detail.entityId]: detail.entityName }));
            }
            void linkConversationContent(gameId, convId, 'entity_definition', detail.entityId)
                .then(() => void loadLinkedContent(gameId, convId))
                .catch(() => { });
        }
        window.addEventListener('ss:entity-created', handleEntityCreated);
        return () => window.removeEventListener('ss:entity-created', handleEntityCreated);
    }, [activeConvId, gameId]);
    // Catch successful container creation triggered from the panel, map turn context → container ID
    useEffect(() => {
        function handleContainerCreated(e: Event) {
            const detail = (e as CustomEvent<{
                containerId: string;
                containerName?: string;
                containerCodeName?: string;
                turnId: string;
                responseIdx: number;
                containerIdx: number;
            }>).detail;
            if (!activeConvId || !gameId)
                return;
            const containerKey = `${detail.turnId}:${detail.responseIdx}:${detail.containerIdx}`;
            setSavedContainerDefinitionIds(prev => {
                const updated = { ...prev, [containerKey]: detail.containerId };
                safeSetItem(lsContainerLinks(activeConvId!), JSON.stringify(updated));
                return updated;
            });
            // Link the container to the conversation (same pattern as items/lore)
            void linkConversationContent(gameId, activeConvId, 'container_definition', detail.containerId)
                .then(() => void loadLinkedContent(gameId, activeConvId!))
                .catch(() => { });
            // Cache the container name immediately if provided
            if (detail.containerName || detail.containerCodeName) {
                setContainerDefinitionNames(prev => ({ ...prev, [detail.containerId]: formatContainerLabel({ name: detail.containerName ?? '', code_name: detail.containerCodeName ?? '' }) }));
            }
        }
        window.addEventListener('ss:container-created', handleContainerCreated);
        return () => window.removeEventListener('ss:container-created', handleContainerCreated);
    }, [activeConvId, gameId]);
    // Catch successful container updates triggered from the items panel, map turn context â†’ container ID
    useEffect(() => {
        function handleContainerUpdated(e: Event) {
            const detail = (e as CustomEvent<{
                containerId: string;
                containerName?: string;
                containerCodeName?: string;
                turnId: string;
                responseIdx: number;
                containerIdx: number;
            }>).detail;
            if (!activeConvId || !gameId)
                return;
            const containerKey = `${detail.turnId}:${detail.responseIdx}:${detail.containerIdx}`;
            setSavedContainerDefinitionIds(prev => {
                const updated = { ...prev, [containerKey]: detail.containerId };
                safeSetItem(lsContainerLinks(activeConvId!), JSON.stringify(updated));
                return updated;
            });
            void linkConversationContent(gameId, activeConvId, 'container_definition', detail.containerId)
                .then(() => void loadLinkedContent(gameId, activeConvId!))
                .catch(() => { });
            if (detail.containerName || detail.containerCodeName) {
                setContainerDefinitionNames(prev => ({ ...prev, [detail.containerId]: formatContainerLabel({ name: detail.containerName ?? '', code_name: detail.containerCodeName ?? '' }) }));
            }
        }
        window.addEventListener('ss:container-updated', handleContainerUpdated);
        return () => window.removeEventListener('ss:container-updated', handleContainerUpdated);
    }, [activeConvId, gameId]);
    // Catch successful preset creation triggered from the panel, map turn context → preset ID
    useEffect(() => {
        function handlePresetCreated(e: Event) {
            const detail = (e as CustomEvent<{
                presetId: string;
                presetName?: string;
                turnId: string;
                responseIdx: number;
                presetIdx: number;
            }>).detail;
            if (!activeConvId || !gameId)
                return;
            const presetKey = `${detail.turnId}:${detail.responseIdx}:${detail.presetIdx}`;
            setSavedPresetDefinitionIds(prev => {
                const updated = { ...prev, [presetKey]: detail.presetId };
                safeSetItem(lsPresetLinks(activeConvId!), JSON.stringify(updated));
                return updated;
            });
            void linkConversationContent(gameId, activeConvId, 'preset_definition', detail.presetId)
                .then(() => void loadLinkedContent(gameId, activeConvId!))
                .catch(() => { });
            if (detail.presetName) {
                // no preset name cache currently, but consistent with container pattern
            }
        }
        window.addEventListener('ss:preset-created', handlePresetCreated);
        return () => window.removeEventListener('ss:preset-created', handlePresetCreated);
    }, [activeConvId, gameId]);
    // Catch successful gacha pack creation triggered from the panel, map turn context → gacha pack ID
    useEffect(() => {
        function handleGachaPackCreated(e: Event) {
            const detail = (e as CustomEvent<{
                gachaPackId: string;
                gachaPackName?: string;
                turnId: string;
                responseIdx: number;
                gachaPackIdx: number;
            }>).detail;
            if (!activeConvId || !gameId)
                return;
            const packKey = `${detail.turnId}:${detail.responseIdx}:${detail.gachaPackIdx}`;
            setSavedGachaPackIds(prev => {
                const updated = { ...prev, [packKey]: detail.gachaPackId };
                safeSetItem(lsGachaPackLinks(activeConvId!), JSON.stringify(updated));
                return updated;
            });
            // Link the gacha pack to the conversation
            void linkConversationContent(gameId, activeConvId, 'gacha_pack', detail.gachaPackId)
                .then(() => void loadLinkedContent(gameId, activeConvId!))
                .catch(() => { });
            // Cache the pack name immediately if provided
            if (detail.gachaPackName) {
                setGachaPackNames(prev => ({ ...prev, [detail.gachaPackId]: detail.gachaPackName! }));
            }
        }
        window.addEventListener('ss:gacha-pack-created', handleGachaPackCreated);
        return () => window.removeEventListener('ss:gacha-pack-created', handleGachaPackCreated);
    }, [activeConvId, gameId]);
    // Catch successful equipment slot creation triggered from the panel
    useEffect(() => {
        function handleEquipmentSlotCreated(e: Event) {
            const detail = (e as CustomEvent<{
                id: string;
                slot_key?: string;
                name?: string;
                turnId: string;
                responseIdx: number;
                equipmentSlotIdx: number;
            }>).detail;
            if (!activeConvId || !gameId)
                return;
            const slotKey = `${detail.turnId}:${detail.responseIdx}:${detail.equipmentSlotIdx}`;
            setSavedEquipmentSlotIds(prev => {
                const updated = { ...prev, [slotKey]: detail.id };
                safeSetItem(lsEquipmentSlotLinks(activeConvId!), JSON.stringify(updated));
                return updated;
            });
            const slotName = detail.name ?? detail.slot_key;
            if (slotName) {
                setEquipmentSlotNames(prev => ({ ...prev, [detail.id]: slotName }));
            }
            void linkConversationContent(gameId, activeConvId, 'equipment_slot', detail.id)
                .then(() => void loadLinkedContent(gameId, activeConvId!))
                .catch(() => { });
        }
        window.addEventListener('ss:equipment-slot-created', handleEquipmentSlotCreated);
        return () => window.removeEventListener('ss:equipment-slot-created', handleEquipmentSlotCreated);
    }, [activeConvId, gameId]);
    // Catch successful crafting recipe creation triggered from the crafting sheet.
    useEffect(() => {
        function handleCraftingRecipeCreated(e: Event) {
            const detail = (e as CustomEvent<{
                id: string;
                name?: string;
                turnId: string;
                responseIdx: number;
                craftingRecipeIdx: number;
                convId?: string;
                gameId?: string;
            }>).detail;
            if (!activeConvId || !gameId)
                return;
            if (detail.gameId && detail.gameId !== gameId)
                return;
            if (detail.convId && detail.convId !== activeConvId)
                return;
            const recipeKey = `${detail.turnId}:${detail.responseIdx}:${detail.craftingRecipeIdx}`;
            setSavedCraftingRecipeIds(prev => {
                const updated = { ...prev, [recipeKey]: detail.id };
                safeSetItem(lsCraftingRecipeLinks(activeConvId!), JSON.stringify(updated));
                return updated;
            });
            if (detail.name) {
                setCraftingRecipeNames(prev => {
                    const next = { ...prev, [detail.id]: detail.name! };
                    safeSetItem(lsCraftingRecipeNames(activeConvId!), JSON.stringify(next));
                    return next;
                });
            }
            void linkConversationContent(gameId, activeConvId, 'crafting_recipe', detail.id)
                .then(() => void loadLinkedContent(gameId, activeConvId!))
                .catch(() => { });
        }
        window.addEventListener('ss:crafting-recipe-created', handleCraftingRecipeCreated);
        return () => window.removeEventListener('ss:crafting-recipe-created', handleCraftingRecipeCreated);
    }, [activeConvId, gameId]);
    // Catch successful quest creation triggered from the quest page, map turn context → quest ID
    useEffect(() => {
        function handleQuestCreated(e: Event) {
            const detail = (e as CustomEvent<{
                questId: string;
                questName?: string;
                questCodeName?: string;
                turnId?: string;
                responseIdx?: number;
                questDefinitionIdx?: number;
                convId?: string;
                gameId?: string;
            }>).detail;
            if (!gameId)
                return;
            if (detail.gameId && detail.gameId !== gameId)
                return;
            const convId = detail.convId ?? activeConvId;
            if (!convId)
                return;
            if (detail.turnId !== undefined && detail.responseIdx !== undefined && detail.questDefinitionIdx !== undefined) {
                const questKey = `${detail.turnId}:${detail.responseIdx}:${detail.questDefinitionIdx}`;
                setSavedQuestDefinitionIds(prev => {
                    const updated = { ...prev, [questKey]: detail.questId };
                    safeSetItem(lsQuestLinks(convId), JSON.stringify(updated));
                    return updated;
                });
            }
            if (detail.questName) {
                setQuestDefinitionNames(prev => {
                    const next = { ...prev, [detail.questId]: detail.questName! };
                    safeSetItem(lsQuestNames(convId), JSON.stringify(next));
                    return next;
                });
            }
            if (detail.questCodeName) {
                setQuestDefinitionCodes(prev => {
                    const next = { ...prev, [detail.questId]: detail.questCodeName! };
                    safeSetItem(lsQuestCodes(convId), JSON.stringify(next));
                    return next;
                });
            }
            void linkConversationContent(gameId, convId, 'quest_definition', detail.questId)
                .then(() => void loadLinkedContent(gameId, convId))
                .catch(() => { });
        }
        window.addEventListener('ss:quest-created', handleQuestCreated);
        return () => window.removeEventListener('ss:quest-created', handleQuestCreated);
    }, [activeConvId, gameId]);
    // ---------------------------------------------------------------------------
    // API calls
    // ---------------------------------------------------------------------------
    async function loadActiveConvs(gId: string) {
        setIsLoadingActive(true);
        try {
            const res = await listConversations(gId, { status: 'active' });
            setActiveConvs(res.conversations ?? []);
        }
        catch {
            // silently ignore
        }
        finally {
            setIsLoadingActive(false);
        }
    }
    async function loadArchivedConvs(gId: string) {
        setIsLoadingArchived(true);
        try {
            const res = await listConversations(gId, { status: 'archived' });
            setArchivedConvs(res.conversations ?? []);
        }
        catch {
            // silently ignore
        }
        finally {
            setIsLoadingArchived(false);
        }
    }
    function loadBothLists(gId: string) {
        loadActiveConvs(gId);
        loadArchivedConvs(gId);
        getGameLLMTokenBalance(gId).then(setTokenBalance).catch(() => { });
    }
    function handleConversationTokenUsage(convId: string | null, usage: TokenUsageInfo) {
        if (!convId)
            return;
        const totalTokens = usage.totalTokens;
        if (typeof totalTokens !== 'number' || !Number.isFinite(totalTokens) || totalTokens <= 0)
            return;
        const existingRaw = safeGetItem(lsConvTokenUsage(convId));
        const existing = existingRaw ? Number(existingRaw) : 0;
        const next = (Number.isFinite(existing) && existing >= 0 ? existing : 0) + totalTokens;
        safeSetItem(lsConvTokenUsage(convId), String(next));
        if (activeConvIdRef.current === convId) {
            setConversationTokenUsage(next);
        }
    }
    useEffect(() => {
        const handler = (e: Event) => {
            const gId = gameId;
            if (!gId)
                return;
            const detail = (e as CustomEvent<{
                gameId: string;
            }>).detail;
            if (detail?.gameId !== gId)
                return;
            getGameLLMTokenBalance(gId).then(setTokenBalance).catch(() => { });
        };
        window.addEventListener('llm-tokens:refresh', handler);
        return () => window.removeEventListener('llm-tokens:refresh', handler);
    }, [gameId]);
    // Reload token balance whenever a pipeline run completes (isStreaming: true → false)
    const prevIsStreamingRef = useRef(false);
    useEffect(() => {
        if (prevIsStreamingRef.current && !isStreaming && gameId) {
            getGameLLMTokenBalance(gameId).then(setTokenBalance).catch(() => { });
        }
        prevIsStreamingRef.current = isStreaming;
    }, [isStreaming, gameId]);
    async function loadConversation(gId: string, convId: string) {
        setIsLoadingConv(true);
        try {
            const conv = await getConversation(gId, convId);
            setActiveConv(conv);
        }
        catch {
            // Conversation no longer exists (deleted/archived) — clear stale ID so the
            // next send will go through the create-conversation step instead of failing.
            setActiveConv(null);
            setActiveConvId(null);
        }
        finally {
            setIsLoadingConv(false);
        }
    }
    async function loadLinkedContent(gId: string, convId: string) {
        setIsLoadingLinkedContent(true);
        try {
            const items = await listConversationContent(gId, convId);
            // Fetch lore titles and item names in parallel BEFORE calling setLinkedContent.
            // This way setLinkedContent and the name setters fire synchronously in the same
            // React batch → a single render that already has names, no "Item" flash.
            const loreLinks = items.filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry');
            const itemLinks = items.filter(l => l.content_type === 'item_definition');
            const entityLinks = items.filter(l => l.content_type === 'entity_definition');
            const entityPoolLinks = items.filter(l => l.content_type === 'entity_pool');
            const containerLinks = items.filter(l => l.content_type === 'container_definition');
            const presetLinks = items.filter(l => l.content_type === 'preset_definition');
            const gachaPackLinks = items.filter(l => l.content_type === 'gacha_pack');
            const craftingRecipeLinks = items.filter(l => l.content_type === 'crafting_recipe');
            const [loreResults, itemResults, entityResults, entityPoolResults, containerResults, presetResult, gachaPackResults, craftingRecipeResults] = await Promise.all([
                loreLinks.length > 0
                    ? Promise.allSettled(loreLinks.map(l => getLoreEntry(gId, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<{
                        Title: string;
                    }>[]),
                itemLinks.length > 0
                    ? Promise.allSettled(itemLinks.map(l => getItemDefinition({ gameId: gId }, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<{
                        item: {
                            name: string;
                        };
                    }>[]),
                entityLinks.length > 0
                    ? Promise.allSettled(entityLinks.map(l => getEntityDefinition(gId, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<EntityDefinition>[]),
                entityPoolLinks.length > 0
                    ? Promise.allSettled(entityPoolLinks.map(l => getEntityPool(gId, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<{
                        name: string;
                        pool_key: string;
                    }>[]),
                containerLinks.length > 0
                    ? Promise.allSettled(containerLinks.map(l => getContainerDefinition({ gameId: gId }, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<{
                        container_definition: {
                            name: string;
                        };
                    }>[]),
                presetLinks.length > 0
                    ? listPresetDefinitions({ gameId: gId })
                    : Promise.resolve({ definitions: [] as PresetDefinition[] }),
                gachaPackLinks.length > 0
                    ? Promise.allSettled(gachaPackLinks.map(l => getGachaPack({ gameId: gId }, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<{
                        pack: {
                            name: string;
                        };
                    }>[]),
                craftingRecipeLinks.length > 0
                    ? Promise.allSettled(craftingRecipeLinks.map(l => getCraftingRecipe({ gameId: gId }, l.content_id)))
                    : Promise.resolve([] as PromiseSettledResult<{
                        name: string;
                    }>[]),
            ]);
            // Build name maps synchronously (no more awaits after this point)
            const titles: Record<string, string> = {};
            loreLinks.forEach((l, i) => {
                const result = loreResults[i];
                if (result?.status === 'fulfilled')
                    titles[l.content_id] = result.value.Title;
            });
            const names: Record<string, string> = {};
            itemLinks.forEach((l, i) => {
                const result = itemResults[i];
                if (result?.status === 'fulfilled')
                    names[l.content_id] = result.value.item.name;
            });
            const entityNames: Record<string, string> = {};
            entityLinks.forEach((l, i) => {
                const result = entityResults[i];
                if (result?.status === 'fulfilled')
                    entityNames[l.content_id] = result.value.name;
            });
            const entityPoolNameMap: Record<string, string> = {};
            const entityPoolKeyMap: Record<string, string> = {};
            const entityKeyMap: Record<string, string> = {};
            entityPoolLinks.forEach((l, i) => {
                const result = entityPoolResults[i];
                if (result?.status === 'fulfilled') {
                    entityPoolNameMap[l.content_id] = result.value.name;
                    entityPoolKeyMap[l.content_id] = result.value.pool_key;
                }
            });
            entityLinks.forEach((l, i) => {
                const result = entityResults[i];
                if (result?.status === 'fulfilled' && result.value.entity_key) {
                    entityKeyMap[result.value.entity_key] = l.content_id;
                }
            });
            const containerNames: Record<string, string> = {};
            containerLinks.forEach((l, i) => {
                const result = containerResults[i];
                if (result?.status === 'fulfilled')
                    containerNames[l.content_id] = formatContainerLabel(result.value.container_definition);
            });
            const presetNames: Record<string, string> = {};
            if (presetLinks.length > 0) {
                presetLinks.forEach((l) => {
                    const found = presetResult.definitions?.find((d) => d.id === l.content_id);
                    if (found)
                        presetNames[l.content_id] = found.name;
                });
            }
            const gachaPackNameMap: Record<string, string> = {};
            gachaPackLinks.forEach((l, i) => {
                const result = gachaPackResults[i];
                if (result?.status === 'fulfilled')
                    gachaPackNameMap[l.content_id] = result.value.pack.name;
            });
            const craftingRecipeNameMap: Record<string, string> = {};
            craftingRecipeLinks.forEach((l, i) => {
                const result = craftingRecipeResults[i];
                if (result?.status === 'fulfilled')
                    craftingRecipeNameMap[l.content_id] = result.value.name;
            });
            // All setters fire synchronously → one React render with everything ready
            if (Object.keys(titles).length > 0)
                setLoreEntryTitles(prev => ({ ...prev, ...titles }));
            if (Object.keys(names).length > 0)
                setItemDefinitionNames(prev => ({ ...prev, ...names }));
            if (Object.keys(entityNames).length > 0)
                setEntityDefinitionNames(prev => ({ ...prev, ...entityNames }));
            if (Object.keys(entityKeyMap).length > 0)
                setEntityDefinitionKeyToId(prev => ({ ...prev, ...entityKeyMap }));
            if (Object.keys(entityPoolNameMap).length > 0)
                setEntityPoolNames(prev => ({ ...prev, ...entityPoolNameMap }));
            if (Object.keys(entityPoolKeyMap).length > 0)
                setEntityPoolKeys(prev => ({ ...prev, ...entityPoolKeyMap }));
            if (Object.keys(containerNames).length > 0)
                setContainerDefinitionNames(prev => ({ ...prev, ...containerNames }));
            if (Object.keys(presetNames).length > 0)
                setPresetDefinitionNames(prev => ({ ...prev, ...presetNames }));
            if (Object.keys(gachaPackNameMap).length > 0)
                setGachaPackNames(prev => ({ ...prev, ...gachaPackNameMap }));
            if (Object.keys(craftingRecipeNameMap).length > 0)
                setCraftingRecipeNames(prev => ({ ...prev, ...craftingRecipeNameMap }));
            setLinkedContent(items);
        }
        catch {
            // silently ignore
        }
        finally {
            setIsLoadingLinkedContent(false);
        }
    }
    async function handleUnlinkContent(linkId: string, contentType: string, contentId: string) {
        if (!gameId || !activeConvId)
            return;
        const convId: string = activeConvId;
        setUnlinkingId(linkId);
        try {
            await unlinkConversationContent(gameId, convId, contentType, contentId);
            setLinkedContent(prev => prev.filter(l => l.id !== linkId));
        }
        catch {
            // silently ignore
        }
        finally {
            setUnlinkingId(null);
        }
    }
    function handleRetry(turn: {
        id: string;
        userMessage: string;
        detectedType: string | null;
    }) {
        if (!gameId || isStreaming)
            return;
        // If detect-intent already succeeded, skip it and use the resolved type directly.
        // Otherwise fall back to the current selector (may re-run detect-intent).
        const retryType = turn.detectedType ?? selectedRequestType;
        // Derive fallback entityType from history (excluding the turn being retried)
        const allResponses = chatHistory
            .filter(t => t.id !== turn.id)
            .flatMap(t => t.responses ?? [])
            .filter(r => r.entityType);
        const fallbackEntityType = allResponses[allResponses.length - 1]?.entityType;
        const generatedItemsForRequest = convGeneratedItems.length > 0
            ? convGeneratedItems
            : (activeConv?.AccumulatedContent?.items ?? []);
        const convIdForUsage = activeConvId;
        removeTurn(turn.id);
        const retryLinkedLoreIds = linkedContent
            .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
            .map(l => l.content_id);
        const retryLinkedItemIds = linkedContent
            .filter(l => l.content_type === 'item_definition')
            .map(l => l.content_id);
        const retryLinkedEntityIds = linkedContent
            .filter(l => l.content_type === 'entity_definition')
            .map(l => l.content_id);
        const retryLinkedContainerIds = linkedContent
            .filter(l => l.content_type === 'container_definition')
            .map(l => l.content_id);
        const retryHistory = chatHistory.filter(t => t.id !== turn.id);
        const retryHistoryContext = retryHistory
            .filter(t => t.done && t.detectedType && !t.error)
            .map(t => ({
            user_prompt: t.userMessage,
            request_type: t.detectedType!,
            response_text: (t.responses ?? [])
                .filter(r => r.done && !r.error && r.responseText)
                .map(r => r.responseText)
                .join('\n\n') || undefined,
        }));
        const retryRequestHistory = retryHistory
            .flatMap(t => (t.responses ?? [])
            .filter(r => r.done && !r.error && r.responseText && r.intentType)
            .map(r => ({ request_type: r.intentType!, response_text: r.responseText })));
        void runPipeline(gameId, turn.userMessage, activeConvId, retryType, (newConv) => {
            justCreatedConvIdRef.current = newConv.ID;
            chatHistoryConvIdRef.current = newConv.ID;
            setActiveConvs((prev) => [newConv, ...prev]);
            setActiveConvId(newConv.ID);
            setActiveConv(newConv);
        }, (updatedConv) => {
            setActiveConv(updatedConv);
            setActiveConvs((prev) => prev.map((c) => (c.ID === updatedConv.ID ? updatedConv : c)));
        }, t('llmConversation.errorCreate'), t('llmConversation.errorSend'), t('llmConversation.errorTokenQuotaExceeded'), retryRequestHistory.length > 0 ? retryRequestHistory : undefined, retryLinkedLoreIds.length > 0 ? retryLinkedLoreIds : undefined, fallbackEntityType || undefined, retryHistoryContext.length > 0 ? retryHistoryContext : undefined, generatedItemsForRequest.length > 0 ? generatedItemsForRequest : undefined, retryLinkedItemIds.length > 0 ? retryLinkedItemIds : undefined, retryLinkedEntityIds.length > 0 ? retryLinkedEntityIds : undefined, convGeneratedPresets.length > 0 ? convGeneratedPresets : undefined, convGeneratedContainers.length > 0 ? convGeneratedContainers : undefined, retryLinkedContainerIds.length > 0 ? retryLinkedContainerIds : undefined, convGeneratedGachaPacks.length > 0 ? convGeneratedGachaPacks : undefined, convGeneratedEquipmentSlots.length > 0 ? convGeneratedEquipmentSlots : undefined, convGeneratedCraftingRecipes.length > 0 ? convGeneratedCraftingRecipes : undefined, convGeneratedEntityDefinitions.length > 0 ? convGeneratedEntityDefinitions : undefined, convGeneratedEntityPools.length > 0 ? convGeneratedEntityPools : undefined, (usage) => handleConversationTokenUsage(convIdForUsage, usage));
    }
    function handleSend() {
        if (!gameId || !message.trim() || isStreaming)
            return;
        const userPrompt = message.trim();
        setMessage('');
        // If chatHistory was preserved from a previous conversation (context browsing),
        // clear it now and claim ownership for the current conversation before sending.
        if (chatHistoryConvIdRef.current !== activeConvId) {
            clearHistory();
            chatHistoryConvIdRef.current = activeConvId;
        }
        const linkedLoreIds = linkedContent
            .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
            .map(l => l.content_id);
        const linkedItemIds = linkedContent
            .filter(l => l.content_type === 'item_definition')
            .map(l => l.content_id);
        const linkedEntityIds = linkedContent
            .filter(l => l.content_type === 'entity_definition')
            .map(l => l.content_id);
        const linkedContainerIds = linkedContent
            .filter(l => l.content_type === 'container_definition')
            .map(l => l.content_id);
        // Fall back to the last known entityType from history when the current turn
        // doesn't produce one (e.g. "update the current content" follow-up requests)
        const allResponses = chatHistory.flatMap(t => t.responses ?? []).filter(r => r.entityType);
        const fallbackEntityType = allResponses[allResponses.length - 1]?.entityType;
        const generatedItemsForRequest = convGeneratedItems.length > 0
            ? convGeneratedItems
            : (activeConv?.AccumulatedContent?.items ?? []);
        // Build history context from completed turns to help intent detection
        const historyContext = chatHistory
            .filter(t => t.done && t.detectedType && !t.error)
            .map(t => ({
            user_prompt: t.userMessage,
            request_type: t.detectedType!,
            response_text: (t.responses ?? [])
                .filter(r => r.done && !r.error && r.responseText)
                .map(r => r.responseText)
                .join('\n\n') || undefined,
        }));
        // Build request history for streamRequest calls
        const requestHistory = chatHistory
            .flatMap(t => (t.responses ?? [])
            .filter(r => r.done && !r.error && r.responseText && r.intentType)
            .map(r => ({ request_type: r.intentType!, response_text: r.responseText })));
        void runPipeline(gameId, userPrompt, activeConvId, selectedRequestType, (newConv) => {
            justCreatedConvIdRef.current = newConv.ID;
            chatHistoryConvIdRef.current = newConv.ID;
            setActiveConvs((prev) => [newConv, ...prev]);
            setActiveConvId(newConv.ID);
            setActiveConv(newConv);
        }, (updatedConv) => {
            setActiveConv(updatedConv);
            setActiveConvs((prev) => prev.map((c) => (c.ID === updatedConv.ID ? updatedConv : c)));
        }, t('llmConversation.errorCreate'), t('llmConversation.errorSend'), t('llmConversation.errorTokenQuotaExceeded'), requestHistory.length > 0 ? requestHistory : undefined, linkedLoreIds.length > 0 ? linkedLoreIds : undefined, fallbackEntityType || undefined, historyContext.length > 0 ? historyContext : undefined, generatedItemsForRequest.length > 0 ? generatedItemsForRequest : undefined, linkedItemIds.length > 0 ? linkedItemIds : undefined, linkedEntityIds.length > 0 ? linkedEntityIds : undefined, convGeneratedPresets.length > 0 ? convGeneratedPresets : undefined, convGeneratedContainers.length > 0 ? convGeneratedContainers : undefined, linkedContainerIds.length > 0 ? linkedContainerIds : undefined, convGeneratedGachaPacks.length > 0 ? convGeneratedGachaPacks : undefined, convGeneratedEquipmentSlots.length > 0 ? convGeneratedEquipmentSlots : undefined, convGeneratedCraftingRecipes.length > 0 ? convGeneratedCraftingRecipes : undefined, convGeneratedEntityDefinitions.length > 0 ? convGeneratedEntityDefinitions : undefined, convGeneratedEntityPools.length > 0 ? convGeneratedEntityPools : undefined);
    }
    async function handleSaveTitle() {
        if (!gameId || !activeConv || !editTitleValue.trim()) {
            setEditingTitle(false);
            return;
        }
        try {
            const updated = await updateConversation(gameId, activeConv.ID, { title: editTitleValue.trim() });
            setActiveConv(updated);
            setActiveConvs((prev) => prev.map((c) => (c.ID === updated.ID ? updated : c)));
            setArchivedConvs((prev) => prev.map((c) => (c.ID === updated.ID ? updated : c)));
        }
        catch {
            toast({ title: t('llmConversation.errorUpdate'), variant: 'destructive' });
        }
        finally {
            setEditingTitle(false);
        }
    }
    async function handleSaveGoal() {
        if (!gameId || !activeConv || !editGoalValue.trim()) {
            setEditingGoal(false);
            return;
        }
        try {
            const updated = await updateConversation(gameId, activeConv.ID, { goal: editGoalValue.trim() });
            setActiveConv(updated);
        }
        catch {
            toast({ title: t('llmConversation.errorUpdate'), variant: 'destructive' });
        }
        finally {
            setEditingGoal(false);
        }
    }
    async function handleArchive(conv: Conversation) {
        if (!gameId)
            return;
        try {
            const archived = await archiveConversation(gameId, conv.ID);
            setActiveConvs((prev) => prev.filter((c) => c.ID !== conv.ID));
            setArchivedConvs((prev) => [archived, ...prev]);
            if (activeConvId === conv.ID) {
                setActiveConvId(null);
                setActiveConv(null);
            }
            toast({ title: t('llmConversation.archived') });
        }
        catch {
            toast({ title: t('llmConversation.errorArchive'), variant: 'destructive' });
        }
    }
    async function handleUnarchive(conv: Conversation) {
        if (!gameId)
            return;
        try {
            const restored = await unarchiveConversation(gameId, conv.ID);
            setArchivedConvs((prev) => prev.filter((c) => c.ID !== conv.ID));
            setActiveConvs((prev) => [restored, ...prev]);
            toast({ title: t('llmConversation.unarchived') });
        }
        catch {
            toast({ title: t('llmConversation.errorUnarchive'), variant: 'destructive' });
        }
    }
    async function handleDelete() {
        if (!gameId || !deleteTarget)
            return;
        try {
            await deleteConversation(gameId, deleteTarget.ID);
            safeRemoveItem(lsConvHistory(deleteTarget.ID));
            safeRemoveItem(lsLoreLinks(deleteTarget.ID));
            safeRemoveItem(lsLoreTitles(deleteTarget.ID));
            safeRemoveItem(lsItemNames(deleteTarget.ID));
            safeRemoveItem(lsEntityNames(deleteTarget.ID));
            safeRemoveItem(lsEntityLinks(deleteTarget.ID));
            safeRemoveItem(lsContainerNames(deleteTarget.ID));
            safeRemoveItem(lsGachaPackLinks(deleteTarget.ID));
            safeRemoveItem(lsGachaPackNames(deleteTarget.ID));
            safeRemoveItem(lsEquipmentSlotLinks(deleteTarget.ID));
            safeRemoveItem(lsEquipmentSlotNames(deleteTarget.ID));
            safeRemoveItem(lsCraftingRecipeLinks(deleteTarget.ID));
            safeRemoveItem(lsCraftingRecipeNames(deleteTarget.ID));
            safeRemoveItem(lsQuestLinks(deleteTarget.ID));
            safeRemoveItem(lsQuestNames(deleteTarget.ID));
            safeRemoveItem(lsQuestCodes(deleteTarget.ID));
            safeRemoveItem(lsConvTokenUsage(deleteTarget.ID));
            safeRemoveItem(lsTagApplied(deleteTarget.ID));
            safeRemoveItem(lsItemTagCreated(deleteTarget.ID));
            const remainingActive = activeConvs.filter((c) => c.ID !== deleteTarget.ID);
            const remainingArchived = archivedConvs.filter((c) => c.ID !== deleteTarget.ID);
            setActiveConvs(remainingActive);
            setArchivedConvs(remainingArchived);
            if (activeConvId === deleteTarget.ID) {
                safeRemoveItem(lsActiveConv(gameId));
                const fallback = remainingActive[0] ?? remainingArchived[0];
                setActiveConvId(fallback?.ID ?? null);
                setActiveConv(null);
            }
            toast({ title: t('llmConversation.deleted') });
            loadArchivedConvs(gameId);
        }
        catch {
            toast({ title: t('llmConversation.errorDelete'), variant: 'destructive' });
        }
        finally {
            setDeleteTarget(null);
        }
    }
    async function handleDeleteDirect(conv: Conversation) {
        if (!gameId)
            return;
        try {
            await deleteConversation(gameId, conv.ID);
            safeRemoveItem(lsConvHistory(conv.ID));
            safeRemoveItem(lsLoreLinks(conv.ID));
            safeRemoveItem(lsLoreTitles(conv.ID));
            safeRemoveItem(lsItemNames(conv.ID));
            safeRemoveItem(lsEntityNames(conv.ID));
            safeRemoveItem(lsEntityLinks(conv.ID));
            safeRemoveItem(lsGachaPackLinks(conv.ID));
            safeRemoveItem(lsGachaPackNames(conv.ID));
            safeRemoveItem(lsEquipmentSlotLinks(conv.ID));
            safeRemoveItem(lsEquipmentSlotNames(conv.ID));
            safeRemoveItem(lsTagApplied(conv.ID));
            safeRemoveItem(lsItemTagCreated(conv.ID));
            safeRemoveItem(lsQuestLinks(conv.ID));
            safeRemoveItem(lsQuestNames(conv.ID));
            safeRemoveItem(lsQuestCodes(conv.ID));
            safeRemoveItem(lsConvTokenUsage(conv.ID));
            setArchivedConvs((prev) => prev.filter((c) => c.ID !== conv.ID));
            if (activeConvId === conv.ID) {
                safeRemoveItem(lsActiveConv(gameId));
                setActiveConvId(null);
                setActiveConv(null);
            }
            toast({ title: t('llmConversation.deleted') });
            loadArchivedConvs(gameId);
        }
        catch {
            toast({ title: t('llmConversation.errorDelete'), variant: 'destructive' });
        }
    }
    async function handleCreateRecords() {
        if (!gameId || !activeConvId)
            return;
        setIsCreatingRecords(true);
        try {
            const loreEntryIds = linkedContent
                .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
                .map(l => l.content_id);
            const result = await createRecordsFromConversation(gameId, activeConvId, loreEntryIds.length > 0 ? loreEntryIds : undefined);
            toast({ title: t('llmConversation.recordsCreated').replace('{count}', String(result.created_count)) });
            // Refresh conversation and linked content
            await loadConversation(gameId, activeConvId);
            void loadLinkedContent(gameId, activeConvId);
        }
        catch {
            toast({ title: t('llmConversation.errorCreateRecords'), variant: 'destructive' });
        }
        finally {
            setIsCreatingRecords(false);
            setCreateRecordsConfirmOpen(false);
        }
    }
    // ---------------------------------------------------------------------------
    // Wrapper handlers for sub-components
    // ---------------------------------------------------------------------------
    function handleRetryResponse(turnId: string, responseIdx: number, intentType: string, userMessage: string, planningAction?: Record<string, unknown>) {
        if (!gameId || !activeConvId)
            return;
        const convIdForUsage = activeConvId;
        const generatedItemsForRequest = convGeneratedItems.length > 0
            ? convGeneratedItems
            : (activeConv?.AccumulatedContent?.items ?? []);
        const retryLinkedLoreIds = linkedContent
            .filter(l => l.content_type === 'lore' || l.content_type === 'lore_entry')
            .map(l => l.content_id);
        const retryLinkedItemIds = linkedContent
            .filter(l => l.content_type === 'item_definition')
            .map(l => l.content_id);
        const retryLinkedEntityIds = linkedContent
            .filter(l => l.content_type === 'entity_definition')
            .map(l => l.content_id);
        const retryLinkedContainerIds = linkedContent
            .filter(l => l.content_type === 'container_definition')
            .map(l => l.content_id);
        const responseRequestHistory = chatHistory
            .flatMap(t => (t.responses ?? [])
            .filter(r => r.done && !r.error && r.responseText && r.intentType)
            .map(r => ({ request_type: r.intentType!, response_text: r.responseText })));
        void retryResponse(gameId, activeConvId, turnId, responseIdx, intentType, userMessage, t('llmConversation.errorSend'), t('llmConversation.errorTokenQuotaExceeded'), planningAction, responseRequestHistory.length > 0 ? responseRequestHistory : undefined, generatedItemsForRequest.length > 0 ? generatedItemsForRequest : undefined, retryLinkedLoreIds.length > 0 ? retryLinkedLoreIds : undefined, retryLinkedItemIds.length > 0 ? retryLinkedItemIds : undefined, retryLinkedEntityIds.length > 0 ? retryLinkedEntityIds : undefined, convGeneratedPresets.length > 0 ? convGeneratedPresets : undefined, convGeneratedContainers.length > 0 ? convGeneratedContainers : undefined, retryLinkedContainerIds.length > 0 ? retryLinkedContainerIds : undefined, convGeneratedGachaPacks.length > 0 ? convGeneratedGachaPacks : undefined, convGeneratedEquipmentSlots.length > 0 ? convGeneratedEquipmentSlots : undefined, convGeneratedCraftingRecipes.length > 0 ? convGeneratedCraftingRecipes : undefined, convGeneratedEntityDefinitions.length > 0 ? convGeneratedEntityDefinitions : undefined, convGeneratedEntityPools.length > 0 ? convGeneratedEntityPools : undefined, (usage) => handleConversationTokenUsage(convIdForUsage, usage));
    }
    async function handleSavePresetDefinition(preset: Record<string, unknown>, turnId: string, responseIdx: number, presetIdx: number) {
        if (!gameId)
            return;
        const codeName = typeof preset.code_name === 'string' ? preset.code_name : '';
        // Check if a preset with this code_name already exists
        if (codeName) {
            try {
                const res = await listPresetDefinitions({ gameId });
                const existing = (res.definitions ?? []).find(d => d.code_name === codeName);
                if (existing) {
                    setPresetCodeConflictExisting(existing);
                    setPresetCodeConflictPendingPreset(preset);
                    setPresetConflictTurnContext({ turnId, responseIdx, presetIdx });
                    setPresetCodeConflictOpen(true);
                    return;
                }
            }
            catch {
                // If check fails, fall through to navigate
            }
        }
        navigateToCreatePreset(preset, undefined, turnId, responseIdx, presetIdx);
    }
    function navigateToCreatePreset(preset: Record<string, unknown>, overrideCodeName?: string, turnId?: string, responseIdx?: number, presetIdx?: number) {
        if (!gameId)
            return;
        const params = new URLSearchParams({ tab: 'preset', create: '1' });
        const name = typeof preset.name === 'string' ? preset.name : (typeof preset.code_name === 'string' ? preset.code_name : '');
        if (name)
            params.set('preset_name', name);
        if (typeof preset.preset_type === 'string' && preset.preset_type)
            params.set('preset_type', preset.preset_type);
        const codeName = overrideCodeName ?? (typeof preset.code_name === 'string' ? preset.code_name : '');
        if (codeName)
            params.set('code_name', codeName);
        if (typeof preset.max_slots === 'number')
            params.set('max_slots', String(preset.max_slots));
        // Store turn context in localStorage so the items page can dispatch ss:preset-created
        if (turnId !== undefined && responseIdx !== undefined && presetIdx !== undefined && activeConvId) {
            safeSetItem(`ss_pending_preset_turn_${gameId}`, JSON.stringify({ turnId, responseIdx, presetIdx, convId: activeConvId }));
        }
        router.push(`/games/${gameId}/items?${params.toString()}`);
    }
    function handlePresetCodeConflictUpdate() {
        if (!presetCodeConflictExisting || !gameId)
            return;
        const presetId = presetCodeConflictExisting.id;
        setPresetCodeConflictOpen(false);
        setPresetCodeConflictPendingPreset(null);
        setPresetConflictTurnContext(null);
        const params = new URLSearchParams({
            tab: 'preset',
            id: presetId,
            editPreset: presetId,
        });
        router.push(`/games/${gameId}/items?${params.toString()}`);
    }
    function handlePresetCodeConflictSaveNew(newCodeName: string) {
        if (!presetCodeConflictPendingPreset)
            return;
        setPresetCodeConflictOpen(false);
        const ctx = presetConflictTurnContext;
        setPresetConflictTurnContext(null);
        navigateToCreatePreset(presetCodeConflictPendingPreset, newCodeName, ctx?.turnId, ctx?.responseIdx, ctx?.presetIdx);
    }
    async function handleSaveContainerDefinition(container: Record<string, unknown>, turnId: string, responseIdx: number, containerIdx: number) {
        if (!gameId)
            return;
        let resolvedContainer = container;
        try {
            resolvedContainer = await resolveContainerLinkedItemRef(container);
        }
        catch (err: any) {
            toast({
                title: t('llmConversation.errorSaveContainerDefinition'),
                description: err?.message,
                variant: 'destructive',
            });
            return;
        }
        const name = typeof resolvedContainer.name === 'string' ? resolvedContainer.name.trim() : '';
        const codeNameRaw = typeof resolvedContainer.code_name === 'string' ? resolvedContainer.code_name.trim() : '';
        const codeName = codeNameRaw && /^[a-z][a-z0-9_]{0,63}$/.test(codeNameRaw)
            ? codeNameRaw
            : (name ? toSafeCodeName(name) : codeNameRaw);
        if (codeName) {
            try {
                const res = await listContainerDefinitions({ gameId }, { code_name: codeName, limit: 20 });
                const existing = (res.container_definitions ?? []).find(d => d.code_name?.trim() === codeName || (!d.code_name && d.name.trim() === name)) ?? null;
                if (existing) {
                    setContainerNameConflictExisting(existing);
                    setContainerNameConflictPending({ container: { ...resolvedContainer, code_name: codeName }, turnId, responseIdx, containerIdx });
                    setContainerNameConflictOpen(true);
                    return;
                }
            }
            catch {
                // fall through to create
            }
        }
        fireOpenCreateContainer({ ...resolvedContainer, code_name: codeName }, undefined, turnId, responseIdx, containerIdx);
    }
    async function resolveContainerLinkedItemRef(container: Record<string, unknown>): Promise<Record<string, unknown>> {
        if (!gameId)
            return container;
        const rawLinkedItemId = typeof container.linked_item_definition_id === 'string'
            ? container.linked_item_definition_id.trim()
            : '';
        if (!rawLinkedItemId.startsWith('__REF:'))
            return container;
        const itemCode = rawLinkedItemId.slice('__REF:'.length).trim();
        if (!itemCode) {
            throw new Error('Invalid linked item reference.');
        }
        const res = await listItemDefinitions({ gameId }, { item_code: itemCode, limit: 1 });
        const item = (res.items ?? []).find((candidate) => candidate.item_code === itemCode) ?? null;
        if (!item) {
            throw new Error(`Could not find item definition with item_code "${itemCode}".`);
        }
        return {
            ...container,
            linked_item_definition_id: item.id,
            linked_item_definition_name: item.name,
            linked_item_definition_code: item.item_code,
        };
    }
    function fireOpenCreateContainer(container: Record<string, unknown>, overrideCodeName?: string, turnId?: string, responseIdx?: number, containerIdx?: number) {
        const name = typeof container.name === 'string' ? container.name : '';
        const baseCodeName = typeof container.code_name === 'string' ? container.code_name.trim() : '';
        const codeName = (overrideCodeName ?? '').trim() || baseCodeName || (name ? toSafeCodeName(name) : '');
        window.dispatchEvent(new CustomEvent('ss:open-create-container', {
            detail: {
                name,
                code_name: codeName,
                container_type: typeof container.container_type === 'string' ? container.container_type : undefined,
                grid_cols: typeof container.grid_cols === 'number' ? container.grid_cols : undefined,
                grid_rows: typeof container.grid_rows === 'number' ? container.grid_rows : undefined,
                is_portable: typeof container.is_portable === 'boolean' ? container.is_portable : undefined,
                linked_item_definition_id: typeof container.linked_item_definition_id === 'string' ? container.linked_item_definition_id : undefined,
                linked_item_definition_name: typeof container.linked_item_definition_name === 'string' ? container.linked_item_definition_name : undefined,
                linked_item_definition_code: typeof container.linked_item_definition_code === 'string' ? container.linked_item_definition_code : undefined,
                metadata: container.metadata && typeof container.metadata === 'object' && !Array.isArray(container.metadata)
                    ? container.metadata
                    : undefined,
                turnId,
                responseIdx,
                containerIdx,
            },
        }));
    }
    function handleContainerNameConflictUpdate() {
        if (!containerNameConflictExisting)
            return;
        const containerId = containerNameConflictExisting.id;
        const itemsPath = `/games/${gameId}/items`;
        const pendingKey = `ss_pending_container_edit_${gameId}`;
        const pendingDraft = containerNameConflictPending?.container;
        setContainerNameConflictOpen(false);
        setContainerNameConflictExisting(null);
        setContainerNameConflictPending(null);
        if (pathname === itemsPath) {
            safeRemoveItem(pendingKey);
            window.dispatchEvent(new CustomEvent('ss:open-edit-container', {
                detail: {
                    containerId,
                    definition: containerNameConflictExisting,
                    container: pendingDraft,
                    turnId: containerNameConflictPending?.turnId,
                    responseIdx: containerNameConflictPending?.responseIdx,
                    containerIdx: containerNameConflictPending?.containerIdx,
                },
            }));
            return;
        }
        if (pendingDraft) {
            safeSetItem(pendingKey, JSON.stringify(pendingDraft));
        }
        else {
            safeRemoveItem(pendingKey);
        }
        const next = new URLSearchParams();
        next.set('tab', 'containers');
        next.set('editContainer', containerId);
        router.push(`${itemsPath}?${next.toString()}`);
    }
    function handleContainerNameConflictCreateNew(newName: string) {
        if (!containerNameConflictPending)
            return;
        const { container, turnId, responseIdx, containerIdx } = containerNameConflictPending;
        setContainerNameConflictOpen(false);
        fireOpenCreateContainer({ ...container, code_name: newName }, newName, turnId, responseIdx, containerIdx);
    }
    // ---------------------------------------------------------------------------
    // Gacha pack save / conflict resolution handlers
    // ---------------------------------------------------------------------------
    async function handleSaveGachaPack(pack: Record<string, unknown>, turnId: string, responseIdx: number, gachaPackIdx: number) {
        if (!gameId)
            return;
        const codeName = typeof pack.code_name === 'string' ? pack.code_name : '';
        if (codeName) {
            try {
                const res = await listGachaPacks({ gameId }, { code_name: codeName, limit: 1 });
                const existing = (res.packs ?? [])[0];
                if (existing) {
                    setGachaPackCodeConflictExisting(existing);
                    setGachaPackCodeConflictPending({ pack, turnId, responseIdx, gachaPackIdx });
                    setGachaPackCodeConflictOpen(true);
                    return;
                }
            }
            catch {
                // If check fails, fall through to open create dialog
            }
        }
        fireOpenCreateGachaPack(pack, undefined, turnId, responseIdx, gachaPackIdx);
    }
    function fireOpenCreateGachaPack(pack: Record<string, unknown>, overrideCodeName?: string, turnId?: string, responseIdx?: number, gachaPackIdx?: number) {
        if (!gameId)
            return;
        const detail = {
            ...pack,
            ...(overrideCodeName !== undefined ? { code_name: overrideCodeName } : {}),
            turnId,
            responseIdx,
            gachaPackIdx,
        };
        const isOnItemsPage = gameId ? pathname === `/games/${gameId}/items` : false;
        if (isOnItemsPage) {
            window.dispatchEvent(new CustomEvent('ss:open-create-gacha-pack', { detail }));
        }
        else {
            // Not on items page — persist data then navigate
            try {
                localStorage.setItem(lsPendingGachaCreate(gameId), JSON.stringify(detail));
            }
            catch { /* ignore */ }
            router.push(`/games/${gameId}/items?tab=gacha&create=1`);
        }
    }
    async function handleGachaPackCodeConflictUpdate() {
        if (!gachaPackCodeConflictExisting || !gameId || !gachaPackCodeConflictPending)
            return;
        const { pack, turnId, responseIdx, gachaPackIdx } = gachaPackCodeConflictPending;
        setGachaPackCodeConflictOpen(false);
        fireOpenEditGachaPack(gachaPackCodeConflictExisting, pack, turnId, responseIdx, gachaPackIdx);
    }
    function fireOpenEditGachaPack(existingPack: GachaPack, llmData: Record<string, unknown>, turnId: string, responseIdx: number, gachaPackIdx: number) {
        if (!gameId)
            return;
        const detail = { existingPack, llmData, turnId, responseIdx, gachaPackIdx };
        const isOnItemsPage = pathname === `/games/${gameId}/items`;
        if (isOnItemsPage) {
            window.dispatchEvent(new CustomEvent('ss:open-edit-gacha-pack', { detail }));
        }
        else {
            try {
                localStorage.setItem(lsPendingGachaEdit(gameId), JSON.stringify(detail));
            }
            catch { /* ignore */ }
            router.push(`/games/${gameId}/items?tab=gacha&editFromLLM=1`);
        }
    }
    function handleGachaPackCodeConflictCreateNew(newCodeName: string) {
        if (!gachaPackCodeConflictPending)
            return;
        const { pack, turnId, responseIdx, gachaPackIdx } = gachaPackCodeConflictPending;
        setGachaPackCodeConflictOpen(false);
        fireOpenCreateGachaPack(pack, newCodeName, turnId, responseIdx, gachaPackIdx);
    }
    async function fireOpenCreateEquipmentSlot(slot: Record<string, unknown>, turnId: string, responseIdx: number, equipmentSlotIdx: number) {
        if (!gameId)
            return;
        const slotKey = typeof slot.slot_key === 'string' ? slot.slot_key.trim() : '';
        if (slotKey) {
            try {
                const res = await listEquipmentSlots({ gameId }, { slot_key: slotKey, limit: 1 });
                const existing = res.slots?.find((s) => s.slot_key === slotKey) ?? null;
                if (existing) {
                    setEquipmentSlotKeyConflictExisting(existing);
                    setEquipmentSlotKeyConflictPending({ slot, turnId, responseIdx, equipmentSlotIdx });
                    setEquipmentSlotKeyConflictOpen(true);
                    return;
                }
            }
            catch { /* network error — fall through to create */ }
        }
        dispatchCreateEquipmentSlot(slot, turnId, responseIdx, equipmentSlotIdx);
    }
    function dispatchCreateEquipmentSlot(slot: Record<string, unknown>, turnId: string, responseIdx: number, equipmentSlotIdx: number) {
        if (!gameId)
            return;
        const detail = { slot, turnId, responseIdx, equipmentSlotIdx };
        const isOnItemsPage = pathname === `/games/${gameId}/items`;
        if (isOnItemsPage) {
            window.dispatchEvent(new CustomEvent('ss:open-create-equipment-slot', { detail }));
        }
        else {
            try {
                localStorage.setItem(lsPendingEquipmentSlotCreate(gameId), JSON.stringify(detail));
            }
            catch { /* ignore */ }
            router.push(`/games/${gameId}/items?tab=equipments&create=1`);
        }
    }
    function handleEquipmentSlotKeyConflictUpdate() {
        if (!equipmentSlotKeyConflictExisting || !equipmentSlotKeyConflictPending)
            return;
        const { slot, turnId, responseIdx, equipmentSlotIdx } = equipmentSlotKeyConflictPending;
        setEquipmentSlotKeyConflictOpen(false);
        fireOpenEditEquipmentSlot(equipmentSlotKeyConflictExisting, slot, turnId, responseIdx, equipmentSlotIdx);
    }
    function fireOpenEditEquipmentSlot(existingSlot: EquipmentSlot, llmData: Record<string, unknown>, turnId: string, responseIdx: number, equipmentSlotIdx: number) {
        if (!gameId)
            return;
        const detail = { existingSlot, llmData, turnId, responseIdx, equipmentSlotIdx };
        const isOnItemsPage = pathname === `/games/${gameId}/items`;
        if (isOnItemsPage) {
            window.dispatchEvent(new CustomEvent('ss:open-edit-equipment-slot', { detail }));
        }
        else {
            try {
                localStorage.setItem(lsPendingEquipmentSlotEdit(gameId), JSON.stringify(detail));
            }
            catch { /* ignore */ }
            router.push(`/games/${gameId}/items?tab=equipments&editFromLLM=1`);
        }
    }
    function handleEquipmentSlotKeyConflictCreateNew(newSlotKey: string) {
        if (!equipmentSlotKeyConflictPending)
            return;
        const { slot, turnId, responseIdx, equipmentSlotIdx } = equipmentSlotKeyConflictPending;
        setEquipmentSlotKeyConflictOpen(false);
        dispatchCreateEquipmentSlot({ ...slot, slot_key: newSlotKey }, turnId, responseIdx, equipmentSlotIdx);
    }
    function handleBuyTokens() {
        window.dispatchEvent(new Event('ss:open-buy-tokens'));
    }
    function openCraftingRecipeCreate(recipe: Record<string, unknown>, turnId: string, responseIdx: number, craftingRecipeIdx: number) {
        if (!gameId || !activeConvId)
            return;
        const pending = {
            recipe,
            turnId,
            responseIdx,
            craftingRecipeIdx,
            convId: activeConvId,
            gameId,
        };
        safeSetItem(lsPendingCraftingRecipeCreate(gameId), JSON.stringify(pending));
        const params = new URLSearchParams({ tab: 'crafting', create: '1' });
        router.push(`/games/${gameId}/items?${params.toString()}`);
    }
    function mergeCraftingRecipeDraft(existingRecipe: CraftingRecipe, draft: Record<string, unknown>) {
        const draftMetadata = draft.metadata && typeof draft.metadata === 'object' && !Array.isArray(draft.metadata)
            ? draft.metadata as Record<string, unknown>
            : undefined;
        const existingMetadata = existingRecipe.metadata && typeof existingRecipe.metadata === 'object' && !Array.isArray(existingRecipe.metadata)
            ? existingRecipe.metadata as Record<string, unknown>
            : {};
        return {
            ...existingRecipe,
            ...draft,
            recipe_key: existingRecipe.recipe_key,
            inputs: Array.isArray(draft.inputs)
                ? draft.inputs
                : existingRecipe.inputs,
            outputs: Array.isArray(draft.outputs)
                ? draft.outputs
                : existingRecipe.outputs,
            metadata: draftMetadata
                ? {
                    ...existingMetadata,
                    ...draftMetadata,
                }
                : existingMetadata,
        };
    }
    function openCraftingRecipeEdit(existingRecipe: CraftingRecipe, recipe: Record<string, unknown>, turnId: string, responseIdx: number, craftingRecipeIdx: number) {
        if (!gameId || !activeConvId)
            return;
        const pending = {
            existingRecipe,
            recipe,
            turnId,
            responseIdx,
            craftingRecipeIdx,
            convId: activeConvId,
            gameId,
        };
        safeSetItem(lsPendingCraftingRecipeEdit(gameId), JSON.stringify(pending));
        const params = new URLSearchParams({ tab: 'crafting', editFromLLM: '1' });
        router.push(`/games/${gameId}/items?${params.toString()}`);
    }
    function openCraftingRecipeReview(existingRecipe: CraftingRecipe, recipe: Record<string, unknown>, turnId: string, responseIdx: number, craftingRecipeIdx: number) {
        if (!gameId || !activeConvId)
            return;
        const merged = mergeCraftingRecipeDraft(existingRecipe, recipe);
        const pending = {
            existingRecipe,
            recipe: merged,
            turnId,
            responseIdx,
            craftingRecipeIdx,
            convId: activeConvId,
            gameId,
        };
        safeSetItem(lsPendingCraftingRecipeEdit(gameId), JSON.stringify(pending));
        setCraftingRecipeReviewData(merged);
        setCraftingRecipeReviewOpen(true);
    }
    async function handleSaveCraftingRecipe(recipe: Record<string, unknown>, turnId: string, responseIdx: number, craftingRecipeIdx: number) {
        if (!gameId || !activeConvId)
            return;
        const recipeKey = typeof recipe.recipe_key === 'string' ? recipe.recipe_key.trim() : '';
        if (!recipeKey) {
            toast({
                title: t('llmConversation.errorSaveCraftingRecipe'),
                description: t('crafting.nameAndKeyRequired'),
                variant: 'destructive',
            });
            return;
        }
        try {
            const existing = await getCraftingRecipeByKey({ gameId }, recipeKey, { suppressToast: true });
            setCraftingRecipeConflictExisting(existing);
            setCraftingRecipeConflictPending({ recipe, turnId, responseIdx, craftingRecipeIdx });
            setCraftingRecipeConflictOpen(true);
        }
        catch (err: any) {
            if (err?.status !== 404) {
                toast({
                    title: t('llmConversation.errorSaveCraftingRecipe'),
                    description: err?.message,
                    variant: 'destructive',
                });
                return;
            }
            try {
                openCraftingRecipeCreate(recipe, turnId, responseIdx, craftingRecipeIdx);
            }
            catch (createErr: any) {
                toast({
                    title: t('llmConversation.errorSaveCraftingRecipe'),
                    description: createErr?.message,
                    variant: 'destructive',
                });
            }
        }
    }
    function handleCraftingRecipeConflictUpdate() {
        if (!craftingRecipeConflictExisting || !craftingRecipeConflictPending)
            return;
        setIsApplyingCraftingRecipeConflict(true);
        try {
            const { recipe, turnId, responseIdx, craftingRecipeIdx } = craftingRecipeConflictPending;
            setCraftingRecipeConflictOpen(false);
            openCraftingRecipeReview(craftingRecipeConflictExisting, recipe, turnId, responseIdx, craftingRecipeIdx);
        }
        finally {
            setIsApplyingCraftingRecipeConflict(false);
        }
    }
    function handleCraftingRecipeConflictCreateNew() {
        if (!craftingRecipeConflictPending)
            return;
        const nextRecipeKey = newCraftingRecipeKeyInput.trim();
        if (!nextRecipeKey)
            return;
        const { recipe, turnId, responseIdx, craftingRecipeIdx } = craftingRecipeConflictPending;
        setCraftingRecipeConflictOpen(false);
        setCraftingRecipeConflictExisting(null);
        setCraftingRecipeConflictPending(null);
        openCraftingRecipeCreate({
            ...recipe,
            recipe_key: nextRecipeKey,
        }, turnId, responseIdx, craftingRecipeIdx);
    }
    const craftingRecipeConflictDescription = craftingRecipeConflictExisting
        ? t('llmConversation.craftingRecipeConflictDesc').replace('{key}', craftingRecipeConflictExisting.recipe_key)
        : '';
    function handleCraftingRecipeReviewConfirm() {
        if (!craftingRecipeReviewData || !craftingRecipeConflictExisting || !craftingRecipeConflictPending)
            return;
        const { turnId, responseIdx, craftingRecipeIdx } = craftingRecipeConflictPending;
        setCraftingRecipeReviewOpen(false);
        openCraftingRecipeEdit(craftingRecipeConflictExisting, craftingRecipeReviewData, turnId, responseIdx, craftingRecipeIdx);
        setCraftingRecipeReviewData(null);
        setCraftingRecipeConflictPending(null);
        setCraftingRecipeConflictExisting(null);
    }
    function handleCraftingRecipeReviewCancel() {
        setCraftingRecipeReviewOpen(false);
        setCraftingRecipeReviewData(null);
        setCraftingRecipeConflictOpen(true);
    }
    useEffect(() => {
        if (craftingRecipeConflictOpen && craftingRecipeConflictExisting?.recipe_key) {
            setNewCraftingRecipeKeyInput(`${craftingRecipeConflictExisting.recipe_key}_2`);
        }
        else if (!craftingRecipeConflictOpen) {
            setNewCraftingRecipeKeyInput('');
        }
    }, [craftingRecipeConflictOpen, craftingRecipeConflictExisting?.recipe_key]);
    const VALID_LORE_TYPES = ['world', 'region', 'faction', 'character', 'item_lore', 'event', 'creature', 'custom'];
    async function handleApplyTagSuggestion(tag: string, turnId: string, responseIdx: number) {
        if (!gameId || !activeConvId)
            return;
        try {
            const game = await getGame(gameId);
            const existing = game.tags ?? [];
            const newTags = Array.from(new Set([...existing, tag]));
            await updateGame(gameId, { tags: newTags });
            const key = `${turnId}:${responseIdx}`;
            const updated = { ...appliedTagsPerResponse, [key]: { ...(appliedTagsPerResponse[key] ?? {}), [tag]: true as const } };
            setAppliedTagsPerResponse(updated);
            safeSetItem(lsTagApplied(activeConvId), JSON.stringify(updated));
            toast({ title: t('llmConversation.tagSuggestionApplied').replace('{tag}', tag) });
        }
        catch {
            toast({ title: t('llmConversation.tagSuggestionApplyError'), variant: 'destructive' });
        }
    }
    async function handleRemoveGameTag(tag: string, turnId: string, responseIdx: number) {
        if (!gameId || !activeConvId)
            return;
        try {
            const game = await getGame(gameId);
            const newTags = (game.tags ?? []).filter((t) => t !== tag);
            await updateGame(gameId, { tags: newTags });
            const key = `${turnId}:${responseIdx}`;
            const copy = { ...(appliedTagsPerResponse[key] ?? {}) };
            delete copy[tag];
            const updated = { ...appliedTagsPerResponse, [key]: copy };
            setAppliedTagsPerResponse(updated);
            safeSetItem(lsTagApplied(activeConvId), JSON.stringify(updated));
            toast({ title: t('llmConversation.tagSuggestionRemovedFromGame').replace('{tag}', tag) });
        }
        catch {
            toast({ title: t('llmConversation.tagSuggestionRemoveFromGameError'), variant: 'destructive' });
        }
    }
    async function handleCreateItemTagFromSuggestion(tag: string, turnId: string, responseIdx: number) {
        if (!gameId || !activeConvId)
            return;
        try {
            const tagKey = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const itemTag = await createItemTag({ gameId }, { tag_key: tagKey, label: tag });
            const key = `${turnId}:${responseIdx}`;
            const updated = { ...createdItemTagsPerResponse, [key]: { ...(createdItemTagsPerResponse[key] ?? {}), [tag]: itemTag.id } };
            setCreatedItemTagsPerResponse(updated);
            safeSetItem(lsItemTagCreated(activeConvId), JSON.stringify(updated));
            toast({ title: t('llmConversation.tagSuggestionItemTagCreated').replace('{tag}', tag) });
        }
        catch {
            toast({ title: t('llmConversation.tagSuggestionItemTagCreateError'), variant: 'destructive' });
        }
    }
    async function handleDeleteItemTagFromSuggestion(tag: string, turnId: string, responseIdx: number) {
        if (!gameId || !activeConvId)
            return;
        const key = `${turnId}:${responseIdx}`;
        const itemTagId = createdItemTagsPerResponse[key]?.[tag];
        if (!itemTagId)
            return;
        try {
            await deleteItemTag({ gameId }, itemTagId);
            const copy = { ...(createdItemTagsPerResponse[key] ?? {}) };
            delete copy[tag];
            const updated = { ...createdItemTagsPerResponse, [key]: copy };
            setCreatedItemTagsPerResponse(updated);
            safeSetItem(lsItemTagCreated(activeConvId), JSON.stringify(updated));
            toast({ title: t('llmConversation.tagSuggestionItemTagDeleted').replace('{tag}', tag) });
        }
        catch {
            toast({ title: t('llmConversation.tagSuggestionDeleteItemTagError'), variant: 'destructive' });
        }
    }
    function handleOpenLoreReview(turn: ChatTurn, idx: number, responseText: string, entityType: string) {
        const parsed = parseLoreResponse(responseText);
        const defaultType = VALID_LORE_TYPES.includes(entityType) ? entityType : 'custom';
        setLoreDraftReviewTurn(turn);
        setLoreDraftReviewResponseIdx(idx);
        setLoreDraftForm({
            lore_type: defaultType,
            title: parsed.title,
            summary: parsed.summary,
            content: parsed.content,
        });
        setLoreDraftReviewOpen(true);
    }
    async function handleCreateLoreRecords(matchedLoreId?: string) {
        if (!gameId || !activeConvId || !loreDraftReviewTurn)
            return;
        setIsCreatingLoreRecords(true);
        try {
            const loreBody = {
                lore_type: VALID_LORE_TYPES.includes(loreDraftForm.lore_type) ? loreDraftForm.lore_type : 'custom',
                title: loreDraftForm.title,
                summary: loreDraftForm.summary,
                content: loreDraftForm.content,
            };
            const entry: LoreEntry = matchedLoreId
                ? await updateLoreEntry(gameId, matchedLoreId, loreBody)
                : await createLoreEntry(gameId, loreBody);
            // Immediately cache the title so the linked content badge shows the name right away
            setLoreEntryTitles(prev => ({ ...prev, [entry.ID]: entry.Title }));
            // Link lore to conversation
            await linkConversationContent(gameId, activeConvId, 'lore', entry.ID);
            // Persist the lore ID link
            const linkKey = `${loreDraftReviewTurn.id}:${loreDraftReviewResponseIdx}`;
            const updated = { ...savedLoreIds, [linkKey]: entry.ID };
            setSavedLoreIds(updated);
            safeSetItem(lsLoreLinks(activeConvId), JSON.stringify(updated));
            // Refresh linked content
            void loadLinkedContent(gameId, activeConvId);
            toast({ title: t('llmConversation.loreCreated') });
            setLoreDraftReviewOpen(false);
        }
        catch {
            toast({ title: t('llmConversation.errorCreateLore'), variant: 'destructive' });
        }
        finally {
            setIsCreatingLoreRecords(false);
        }
    }
    function buildEntityDefinitionDraft(entityDefinition: Record<string, unknown>, turnId: string, responseIdx: number, entityDefinitionIdx: number) {
        const rawMetadata = entityDefinition.metadata;
        const metadata = rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
            ? { ...(rawMetadata as Record<string, unknown>) }
            : undefined;
        const description = typeof entityDefinition.description === 'string' ? entityDefinition.description.trim()
            : typeof metadata?.description === 'string' ? String(metadata.description).trim()
                : '';
        if (metadata) {
            metadata.description = description || metadata.description;
        }
        return {
            entityDefinition,
            entity_key: typeof entityDefinition.entity_key === 'string' ? entityDefinition.entity_key.trim() : '',
            entity_type: typeof entityDefinition.entity_type === 'string' && entityDefinition.entity_type.trim()
                ? entityDefinition.entity_type.trim()
                : 'other',
            name: typeof entityDefinition.name === 'string' ? entityDefinition.name.trim() : '',
            description,
            rarity: typeof entityDefinition.rarity === 'string' ? entityDefinition.rarity.trim() : '',
            icon_url: typeof entityDefinition.icon_url === 'string' ? entityDefinition.icon_url.trim() : '',
            stats: entityDefinition.stats && typeof entityDefinition.stats === 'object' && !Array.isArray(entityDefinition.stats)
                ? entityDefinition.stats as Record<string, unknown>
                : undefined,
            abilities: Array.isArray(entityDefinition.abilities) ? entityDefinition.abilities : undefined,
            metadata,
            is_active: typeof entityDefinition.is_active === 'boolean' ? entityDefinition.is_active : true,
            turnId,
            responseIdx,
            entityDefinitionIdx,
            convId: activeConvId,
            gameId,
        };
    }
    function fireOpenCreateEntityDefinition(draft: ReturnType<typeof buildEntityDefinitionDraft>) {
        if (!gameId)
            return;
        const isOnEntitiesPage = pathname === `/games/${gameId}/entities`;
        if (isOnEntitiesPage) {
            window.dispatchEvent(new CustomEvent('ss:open-create-entity-definition', { detail: draft }));
        }
        else {
            safeSetItem(lsPendingEntityDefinitionCreate(gameId), JSON.stringify(draft));
            router.push(`/games/${gameId}/entities?tab=entities&create=1`);
        }
    }
    async function handleSaveEntityDefinition(entityDefinition: Record<string, unknown>, turnId: string, responseIdx: number, entityDefinitionIdx: number) {
        if (!gameId)
            return;
        const draft = buildEntityDefinitionDraft(entityDefinition, turnId, responseIdx, entityDefinitionIdx);
        const entityKey = draft.entity_key;
        if (entityKey) {
            try {
                const results = await listEntityDefinitions(gameId, { search: entityKey });
                const existing = (results ?? []).find((candidate) => candidate.entity_key === entityKey) ?? null;
                if (existing) {
                    setEntityDefinitionConflictExisting(existing);
                    setEntityDefinitionConflictPending({ entityDefinition, turnId, responseIdx, entityDefinitionIdx });
                    setEntityDefinitionConflictReviewData(buildEntityDefinitionUpdatePayload(existing, entityDefinition));
                    setEntityDefinitionConflictOpen(true);
                    return;
                }
            }
            catch {
                // fall through to create flow on lookup errors
            }
        }
        fireOpenCreateEntityDefinition(draft);
    }
    function buildEntityDefinitionUpdatePayload(existing: EntityDefinition, entityDefinition: Record<string, unknown>): UpdateEntityDefinitionRequest {
        const rawMetadata = entityDefinition.metadata;
        const metadata = rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
            ? { ...(existing.metadata ?? {}), ...(rawMetadata as Record<string, unknown>) }
            : (existing.metadata ? { ...existing.metadata } : undefined);
        const description = typeof entityDefinition.description === 'string' ? entityDefinition.description.trim()
            : typeof metadata?.description === 'string' ? String(metadata.description).trim()
                : existing.description;
        if (metadata) {
            metadata.description = description || metadata.description;
        }
        const stats = entityDefinition.stats && typeof entityDefinition.stats === 'object' && !Array.isArray(entityDefinition.stats)
            ? entityDefinition.stats as Record<string, unknown>
            : existing.stats;
        const abilities = Array.isArray(entityDefinition.abilities)
            ? entityDefinition.abilities as EntityDefinition['abilities']
            : existing.abilities;
        return {
            entity_type: typeof entityDefinition.entity_type === 'string' && entityDefinition.entity_type.trim()
                ? entityDefinition.entity_type.trim() as EntityDefinition['entity_type']
                : existing.entity_type,
            name: typeof entityDefinition.name === 'string' && entityDefinition.name.trim()
                ? entityDefinition.name.trim()
                : existing.name,
            description: description ? description : undefined,
            icon_url: typeof entityDefinition.icon_url === 'string' && entityDefinition.icon_url.trim()
                ? entityDefinition.icon_url.trim()
                : existing.icon_url,
            rarity: typeof entityDefinition.rarity === 'string' && entityDefinition.rarity.trim()
                ? entityDefinition.rarity.trim() as EntityDefinition['rarity']
                : existing.rarity,
            stats,
            abilities,
            metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
        };
    }
    function openEntityDefinitionConflictReview() {
        if (!entityDefinitionConflictExisting || !entityDefinitionConflictPending)
            return;
        setEntityDefinitionConflictReviewData(buildEntityDefinitionUpdatePayload(entityDefinitionConflictExisting, entityDefinitionConflictPending.entityDefinition));
        setEntityDefinitionConflictReviewOpen(true);
    }
    async function handleEntityDefinitionConflictUpdate(reviewData?: UpdateEntityDefinitionRequest) {
        if (!entityDefinitionConflictExisting || !entityDefinitionConflictPending || !gameId || !activeConvId)
            return;
        const { entityDefinition, turnId, responseIdx, entityDefinitionIdx } = entityDefinitionConflictPending;
        setIsApplyingEntityDefinitionConflict(true);
        try {
            const payload = reviewData ?? buildEntityDefinitionUpdatePayload(entityDefinitionConflictExisting, entityDefinition);
            const updated = await updateEntityDefinition(gameId, entityDefinitionConflictExisting.id, payload);
            const entityKey = `${turnId}:${responseIdx}:${entityDefinitionIdx}`;
            setSavedEntityDefinitionIds(prev => {
                const next = { ...prev, [entityKey]: updated.id };
                safeSetItem(lsEntityLinks(activeConvId), JSON.stringify(next));
                return next;
            });
            setEntityDefinitionNames(prev => ({ ...prev, [updated.id]: updated.name }));
            const existingNamesRaw = safeGetItem(lsEntityNames(activeConvId));
            let existingNames: Record<string, string> = {};
            if (existingNamesRaw) {
                try {
                    existingNames = JSON.parse(existingNamesRaw) as Record<string, string>;
                }
                catch {
                    existingNames = {};
                }
            }
            safeSetItem(lsEntityNames(activeConvId), JSON.stringify({ ...existingNames, [updated.id]: updated.name }));
            void linkConversationContent(gameId, activeConvId, 'entity_definition', updated.id)
                .then(() => void loadLinkedContent(gameId, activeConvId))
                .catch(() => { });
            setEntityDefinitionConflictOpen(false);
            setEntityDefinitionConflictReviewOpen(false);
            setEntityDefinitionConflictPending(null);
            setEntityDefinitionConflictExisting(null);
            setEntityDefinitionConflictReviewData(null);
            toast({ title: t('llmConversation.entityDefinitionSaved'), description: updated.name });
        }
        catch (err: any) {
            toast({ variant: 'destructive', title: t('llmConversation.errorSaveEntityDefinition'), description: err?.message });
        }
        finally {
            setIsApplyingEntityDefinitionConflict(false);
        }
    }
    function handleEntityDefinitionConflictSaveNew(newEntityKey: string) {
        if (!entityDefinitionConflictPending)
            return;
        const nextKey = newEntityKey.trim();
        if (!nextKey)
            return;
        const { entityDefinition, turnId, responseIdx, entityDefinitionIdx } = entityDefinitionConflictPending;
        setEntityDefinitionConflictOpen(false);
        setEntityDefinitionConflictExisting(null);
        setEntityDefinitionConflictPending(null);
        setEntityDefinitionConflictReviewOpen(false);
        setEntityDefinitionConflictReviewData(null);
        fireOpenCreateEntityDefinition({
            ...buildEntityDefinitionDraft(entityDefinition, turnId, responseIdx, entityDefinitionIdx),
            entity_key: nextKey,
        });
    }
    function buildEntityPoolDraft(entityPool: Record<string, unknown>, turnId: string, responseIdx: number, entityPoolIdx: number) {
        const rawMetadata = entityPool.metadata;
        const metadata = rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
            ? { ...(rawMetadata as Record<string, unknown>) }
            : undefined;
        const description = typeof entityPool.description === 'string' ? entityPool.description.trim()
            : typeof metadata?.description === 'string' ? String(metadata.description).trim()
                : '';
        const entries = Array.isArray(entityPool.entries)
            ? entityPool.entries.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)).map((entry) => {
                const record = entry as Record<string, unknown>;
                return {
                    entity_definition_id: typeof record.entity_definition_id === 'string' ? record.entity_definition_id.trim() : '',
                    weight: typeof record.weight === 'number'
                        ? record.weight
                        : (typeof record.weight === 'string' ? Number(record.weight) : NaN),
                };
            })
            : [];
        return {
            entityPool,
            pool_key: typeof entityPool.pool_key === 'string' ? entityPool.pool_key.trim() : '',
            name: typeof entityPool.name === 'string' ? entityPool.name.trim() : '',
            description,
            is_active: typeof entityPool.is_active === 'boolean' ? entityPool.is_active : true,
            metadata,
            entries,
            turnId,
            responseIdx,
            entityPoolIdx,
        };
    }
    async function resolveEntityPoolEntityDefinitionMap(): Promise<Record<string, string>> {
        const keyToId = { ...entityDefinitionKeyToId };
        const linkedEntityIds = linkedContent
            .filter((link) => link.content_type === 'entity_definition')
            .map((link) => link.content_id);
        const missingIds = linkedEntityIds.filter((id) => !Object.values(keyToId).includes(id));
        if (missingIds.length === 0)
            return keyToId;
        const results = await Promise.allSettled(missingIds.map((id) => getEntityDefinition(gameId!, id)));
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled' && result.value.entity_key) {
                keyToId[result.value.entity_key] = missingIds[idx];
            }
        });
        return keyToId;
    }
    async function fireOpenCreateEntityPool(draft: Record<string, unknown>, context: {
        turnId: string;
        responseIdx: number;
        entityPoolIdx: number;
    }) {
        if (!gameId || !activeConvId)
            return;
        const resolvedDraft = await resolveEntityPoolDraftForCreate(draft);
        const payload = {
            ...resolvedDraft,
            turnId: context.turnId,
            responseIdx: context.responseIdx,
            entityPoolIdx: context.entityPoolIdx,
            convId: activeConvId,
            gameId,
        };
        safeSetItem(lsPendingEntityPoolCreate(gameId), JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('ss:open-create-entity-pool', { detail: payload }));
        router.push(`/games/${gameId}/entities?tab=pools&create=1`);
    }
    async function fireOpenEditEntityPool(existingPoolId: string, draft: Record<string, unknown>, context: {
        turnId: string;
        responseIdx: number;
        entityPoolIdx: number;
    }) {
        if (!gameId || !activeConvId)
            return;
        const resolvedDraft = await resolveEntityPoolDraftForCreate(draft);
        const payload = {
            ...resolvedDraft,
            existingPoolId,
            turnId: context.turnId,
            responseIdx: context.responseIdx,
            entityPoolIdx: context.entityPoolIdx,
            convId: activeConvId,
            gameId,
        };
        safeSetItem(lsPendingEntityPoolEdit(gameId), JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('ss:open-edit-entity-pool', { detail: payload }));
        router.push(`/games/${gameId}/entities?tab=pools&editPool=${existingPoolId}`);
    }
    async function resolveEntityPoolDraftForCreate(entityPool: Record<string, unknown>) {
        const entries = Array.isArray(entityPool.entries) ? entityPool.entries : [];
        const resolvedEntries: Record<string, unknown>[] = [];
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry))
                continue;
            const record = entry as Record<string, unknown>;
            const rawId = String(record.entity_definition_id ?? '').trim();
            if (!rawId.startsWith('__REF:')) {
                resolvedEntries.push({
                    ...record,
                    entity_definition_id: rawId,
                    entity_definition_name: typeof record.entity_definition_name === 'string'
                        ? record.entity_definition_name
                        : (typeof record.entity_name === 'string' ? record.entity_name : rawId),
                    entity_definition_key: typeof record.entity_definition_key === 'string'
                        ? record.entity_definition_key
                        : (typeof record.entity_key === 'string' ? record.entity_key : rawId),
                });
                continue;
            }
            const entityKey = rawId.slice('__REF:'.length).trim();
            if (!entityKey) {
                resolvedEntries.push({
                    ...record,
                    entity_definition_id: rawId,
                });
                continue;
            }
            try {
                const results = await listEntityDefinitions(gameId!, { search: entityKey });
                const entity = (results ?? []).find((candidate) => candidate.entity_key === entityKey) ?? null;
                if (!entity)
                    throw new Error(`Entity "${entityKey}" not found.`);
                resolvedEntries.push({
                    ...record,
                    entity_definition_id: entity.id,
                    entity_definition_name: entity.name,
                    entity_definition_key: entity.entity_key,
                });
            }
            catch {
                resolvedEntries.push({
                    ...record,
                    entity_definition_id: rawId,
                    entity_definition_name: typeof record.entity_definition_name === 'string'
                        ? record.entity_definition_name
                        : entityKey,
                    entity_definition_key: typeof record.entity_definition_key === 'string'
                        ? record.entity_definition_key
                        : entityKey,
                });
            }
        }
        return {
            ...entityPool,
            entries: resolvedEntries,
        };
    }
    async function handleSaveEntityPool(entityPool: Record<string, unknown>, turnId: string, responseIdx: number, entityPoolIdx: number) {
        if (!gameId || !activeConvId)
            return;
        const draft = buildEntityPoolDraft(entityPool, turnId, responseIdx, entityPoolIdx);
        const isValidPoolKey = /^[a-z][a-z0-9_]{0,63}$/.test(draft.pool_key);
        if (!draft.pool_key || !isValidPoolKey || !draft.name || !draft.description || draft.entries.length === 0) {
            toast({ title: t('llmConversation.errorSaveEntityPool'), variant: 'destructive' });
            return;
        }
        try {
            const pools = await listEntityPools(gameId);
            const existing = pools.find((candidate) => candidate.pool_key === draft.pool_key) ?? null;
            if (existing) {
                setEntityPoolConflictExisting(existing);
                setEntityPoolConflictPending({ entityPool, turnId, responseIdx, entityPoolIdx });
                setEntityPoolConflictReviewOpen(false);
                setEntityPoolConflictOpen(true);
                return;
            }
            await fireOpenCreateEntityPool(draft, { turnId, responseIdx, entityPoolIdx });
        }
        catch (err: any) {
            toast({ variant: 'destructive', title: t('llmConversation.errorSaveEntityPool'), description: err?.message });
        }
    }
    async function handleEntityPoolConflictUpdate(reviewData?: Record<string, unknown>) {
        if (!entityPoolConflictExisting || !entityPoolConflictPending || !gameId || !activeConvId)
            return;
        setIsApplyingEntityPoolConflict(true);
        try {
            const { entityPool, turnId, responseIdx, entityPoolIdx } = entityPoolConflictPending;
            const draftSource = reviewData ?? entityPool;
            await fireOpenEditEntityPool(entityPoolConflictExisting.id, draftSource, { turnId, responseIdx, entityPoolIdx });
            setEntityPoolConflictOpen(false);
            setEntityPoolConflictReviewOpen(false);
            setEntityPoolConflictExisting(null);
            setEntityPoolConflictPending(null);
            setEntityPoolConflictReviewData(null);
        }
        catch (err: any) {
            toast({ variant: 'destructive', title: t('llmConversation.errorSaveEntityPool'), description: err?.message });
        }
        finally {
            setIsApplyingEntityPoolConflict(false);
        }
    }
    function handleEntityPoolConflictSaveNew(newPoolKey: string) {
        if (!entityPoolConflictPending || !gameId || !activeConvId)
            return;
        const nextKey = newPoolKey.trim();
        if (!nextKey || !/^[a-z][a-z0-9_]{0,63}$/.test(nextKey)) {
            toast({ title: t('llmConversation.errorSaveEntityPool'), variant: 'destructive' });
            return;
        }
        const { entityPool, turnId, responseIdx, entityPoolIdx } = entityPoolConflictPending;
        void (async () => {
            setIsApplyingEntityPoolConflict(true);
            try {
                const draft = buildEntityPoolDraft(entityPool, turnId, responseIdx, entityPoolIdx);
                await fireOpenCreateEntityPool({ ...draft, pool_key: nextKey }, { turnId, responseIdx, entityPoolIdx });
                setEntityPoolConflictOpen(false);
                setEntityPoolConflictReviewOpen(false);
                setEntityPoolConflictExisting(null);
                setEntityPoolConflictPending(null);
                setEntityPoolConflictReviewData(null);
            }
            catch (err: any) {
                toast({ variant: 'destructive', title: t('llmConversation.errorSaveEntityPool'), description: err?.message });
            }
            finally {
                setIsApplyingEntityPoolConflict(false);
            }
        })();
    }
    function openQuestDefinitionCreate(questDefinition: Record<string, unknown>, turnId?: string, responseIdx?: number, questDefinitionIdx?: number) {
        if (!gameId || !activeConvId)
            return;
        const pending = {
            questDefinition,
            turnId,
            responseIdx,
            questDefinitionIdx,
            convId: activeConvId,
            gameId,
        };
        const isOnQuestsPage = pathname === `/games/${gameId}/quests`;
        if (isOnQuestsPage) {
            window.dispatchEvent(new CustomEvent('ss:open-create-quest-definition', { detail: pending }));
        }
        else {
            safeSetItem(lsPendingQuestCreate(gameId), JSON.stringify(pending));
            router.push(`/games/${gameId}/quests?create=1`);
        }
    }
    function openQuestDefinitionEdit(existingQuestId: string, questDefinition: Record<string, unknown>, turnId?: string, responseIdx?: number, questDefinitionIdx?: number) {
        if (!gameId || !activeConvId)
            return;
        const pending = {
            existingQuestId,
            questDefinition,
            turnId,
            responseIdx,
            questDefinitionIdx,
            convId: activeConvId,
            gameId,
        };
        const isOnQuestsPage = pathname === `/games/${gameId}/quests`;
        if (isOnQuestsPage) {
            window.dispatchEvent(new CustomEvent('ss:open-edit-quest-definition', { detail: pending }));
        }
        else {
            safeSetItem(lsPendingQuestEdit(gameId), JSON.stringify(pending));
            router.push(`/games/${gameId}/quests?editQuestId=${existingQuestId}`);
        }
    }
    async function handleSaveQuestDefinition(questDefinition: Record<string, unknown>, turnId: string, responseIdx: number, questDefinitionIdx: number) {
        if (!gameId)
            return;
        const codeName = typeof questDefinition.code_name === 'string' ? questDefinition.code_name.trim() : '';
        if (codeName) {
            try {
                const game = await getGame(gameId);
                const res = await listQuestDefinitions(game.studio_id, gameId, { limit: 1000 });
                const existing = (res.quests ?? []).find((quest) => (quest.code_name ?? '').trim() === codeName) ?? null;
                if (existing) {
                    setQuestCodeConflictExisting(existing);
                    setQuestCodeConflictPending({ questDefinition, turnId, responseIdx, questDefinitionIdx });
                    setNewQuestCodeInput(`${existing.code_name ?? codeName}_2`);
                    setQuestCodeConflictOpen(true);
                    return;
                }
            }
            catch {
                // Fall through to create flow if lookup fails.
            }
        }
        openQuestDefinitionCreate(questDefinition, turnId, responseIdx, questDefinitionIdx);
    }
    function handleQuestCodeConflictUpdate() {
        if (!questCodeConflictExisting || !questCodeConflictPending)
            return;
        const { questDefinition, turnId, responseIdx, questDefinitionIdx } = questCodeConflictPending;
        setQuestCodeConflictOpen(false);
        setQuestCodeConflictExisting(null);
        setQuestCodeConflictPending(null);
        openQuestDefinitionEdit(questCodeConflictExisting.id, questDefinition, turnId, responseIdx, questDefinitionIdx);
    }
    function handleQuestCodeConflictSaveNew(newCodeName: string) {
        if (!questCodeConflictPending)
            return;
        const nextCode = newCodeName.trim();
        if (!nextCode) {
            toast({ title: t('common.error'), variant: 'destructive' });
            return;
        }
        const { questDefinition, turnId, responseIdx, questDefinitionIdx } = questCodeConflictPending;
        setQuestCodeConflictOpen(false);
        setQuestCodeConflictExisting(null);
        setQuestCodeConflictPending(null);
        openQuestDefinitionCreate({ ...questDefinition, code_name: nextCode }, turnId, responseIdx, questDefinitionIdx);
    }
    useEffect(() => {
        if (questCodeConflictOpen && questCodeConflictExisting?.code_name) {
            setNewQuestCodeInput(`${questCodeConflictExisting.code_name}_2`);
        }
        else if (!questCodeConflictOpen) {
            setNewQuestCodeInput('');
        }
    }, [questCodeConflictOpen, questCodeConflictExisting?.code_name]);
    const questCodeConflictDescription = questCodeConflictExisting
        ? t('llmConversation.questCodeConflictDesc').replace('{code}', questCodeConflictExisting.code_name ?? '')
        : '';
    async function handleOpenItemDefinitionReview(item: Record<string, unknown>, turnId: string, responseIdx: number, itemIdx: number) {
        const name = typeof item.name === 'string' ? item.name : '';
        const rarity = typeof item.rarity === 'string' ? item.rarity : 'common';
        const category = typeof item.category === 'string' ? item.category : 'other';
        const description = typeof item.description === 'string' ? item.description
            : typeof (item.metadata as Record<string, unknown>)?.description === 'string'
                ? (item.metadata as Record<string, unknown>).description as string
                : '';
        const rawStats = (item.base_stats ?? item.attributes);
        const stats = rawStats && typeof rawStats === 'object' && !Array.isArray(rawStats)
            ? Object.entries(rawStats as Record<string, unknown>).map(([k, v]) => ({ key: k, value: String(v) }))
            : [];
        const item_code = typeof item.item_code === 'string' ? item.item_code.trim() : undefined;
        // Resolve generator config — replace __REF:ITEM_CODE with actual item_definition_id
        let gen_output_pool: CreateItemInitialGenPoolEntry[] | undefined;
        let gen_interval_seconds: string | undefined;
        let gen_tick_capacity: string | undefined;
        let gen_collect_destination: 'mailbox' | 'inventory' | undefined;
        if (category === 'generator' && gameId) {
            const genCfg = (item.metadata as Record<string, unknown>)?.generator_config as Record<string, unknown> | undefined;
            if (genCfg) {
                if (genCfg.production_interval_seconds != null)
                    gen_interval_seconds = String(genCfg.production_interval_seconds);
                if (genCfg.tick_capacity != null)
                    gen_tick_capacity = String(genCfg.tick_capacity);
                if (genCfg.collect_destination === 'mailbox' || genCfg.collect_destination === 'inventory') {
                    gen_collect_destination = genCfg.collect_destination;
                }
                const rawPool = Array.isArray(genCfg.output_pool) ? (genCfg.output_pool as Record<string, unknown>[]) : [];
                if (rawPool.length > 0) {
                    // Collect all __REF: item codes that need resolving
                    const refCodes = rawPool
                        .map((e) => String(e.item_definition_id ?? ''))
                        .filter((id) => id.startsWith('__REF:'))
                        .map((id) => id.slice(6));
                    const codeToId: Record<string, string> = {};
                    if (refCodes.length > 0) {
                        await Promise.allSettled(refCodes.map((code) => listItemDefinitions({ gameId }, { item_code: code, limit: 1 })
                            .then((res) => {
                            const found = (res.items ?? [])[0];
                            if (found)
                                codeToId[code] = found.id;
                        })
                            .catch(() => { })));
                    }
                    gen_output_pool = rawPool.map((e) => {
                        const rawId = String(e.item_definition_id ?? '');
                        const resolvedId = rawId.startsWith('__REF:')
                            ? (codeToId[rawId.slice(6)] ?? '')
                            : rawId;
                        return {
                            item_definition_id: resolvedId,
                            drop_rate: e.drop_rate != null ? String(e.drop_rate) : '1',
                            quantity_min: e.quantity_min != null ? String(e.quantity_min) : '1',
                            quantity_max: e.quantity_max != null ? String(e.quantity_max) : '1',
                            collect_cap: e.collect_cap != null ? String(e.collect_cap) : '5',
                            initial_output: e.initial_output != null ? String(e.initial_output) : '0',
                        };
                    });
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
            metadata_entries: Object.entries(item.metadata ?? {})
                .filter(([key]) => !['description', 'generator_config', 'gacha_pack_ids', 'gacha_pack_id', 'linked_container_definition_id', 'craft_recipe_input_ids', 'craft_recipe_output_ids'].includes(key))
                .map(([key, value]) => ({
                key,
                value: typeof value === 'string' ? value : JSON.stringify(value),
            })),
            client_writable: typeof item.client_writable === 'boolean' ? item.client_writable : false,
            allow_client_update_qty: typeof item.allow_client_update_qty === 'boolean' ? item.allow_client_update_qty : false,
            gen_output_pool,
            gen_interval_seconds,
            gen_tick_capacity,
            gen_collect_destination,
        };
        // If item_code is provided, check whether an item with this code already exists via API.
        if (item_code && gameId) {
            try {
                const res = await listItemDefinitions({ gameId }, { item_code, limit: 1 });
                const existing = (res.items ?? [])[0];
                if (existing) {
                    // Show confirmation dialog — let user choose update vs save as new
                    setItemCodeConflictExisting(existing);
                    setItemCodeConflictInitialValues(initialValues);
                    setItemCodeConflictTurnId(turnId);
                    setItemCodeConflictResponseIdx(responseIdx);
                    setItemCodeConflictItemIdx(itemIdx);
                    setItemCodeConflictEditOpen(false);
                    setItemCodeConflictOpen(true);
                    return;
                }
            }
            catch {
                // If check fails, fall through to create dialog
            }
        }
        setItemDefReviewItem(item);
        setItemDefReviewTurnId(turnId);
        setItemDefReviewResponseIdx(responseIdx);
        setItemDefReviewItemIdx(itemIdx);
        setItemInitialValues(initialValues);
        setItemDefReviewOpen(true);
    }
    /** User chose to update the existing item by opening the item editor panel */
    function handleItemCodeConflictUpdate() {
        if (!itemCodeConflictExisting || !itemCodeConflictInitialValues || !gameId)
            return;
        setItemCodeConflictOpen(false);
        setItemCodeConflictEditOpen(true);
    }
    function handleItemCodeConflictEditApplied(itemId: string) {
        setItemCodeConflictEditOpen(false);
        if (!activeConvId || !gameId)
            return;
        const convId = activeConvId as string;
        const gId = gameId as string;
        if (itemCodeConflictTurnId !== null) {
            const itemKey = `${itemCodeConflictTurnId}:${itemCodeConflictResponseIdx}:${itemCodeConflictItemIdx}`;
            const updated = { ...savedItemDefinitionIds, [itemKey]: itemId };
            setSavedItemDefinitionIds(updated);
            safeSetItem(lsItemLinks(convId), JSON.stringify(updated));
        }
        linkConversationContent(gId, convId, 'item_definition', itemId)
            .then(() => loadLinkedContent(gId, convId))
            .catch(() => { });
    }
    /** User chose to save as a new item (optionally with a different item_code) */
    function handleItemCodeConflictSaveNew(newItemCode: string) {
        if (!itemCodeConflictInitialValues)
            return;
        const updatedValues: CreateItemInitialValues = {
            ...itemCodeConflictInitialValues,
            item_code: newItemCode.trim() || undefined,
        };
        setItemCodeConflictOpen(false);
        setItemInitialValues(updatedValues);
        setItemDefReviewOpen(true);
    }
    function handleItemDefCreated(itemId: string) {
        if (!activeConvId || !itemDefReviewTurnId)
            return;
        const itemKey = `${itemDefReviewTurnId}:${itemDefReviewResponseIdx}:${itemDefReviewItemIdx}`;
        const updated = { ...savedItemDefinitionIds, [itemKey]: itemId };
        setSavedItemDefinitionIds(updated);
        safeSetItem(lsItemLinks(activeConvId), JSON.stringify(updated));
        setItemDefReviewOpen(false);
        // Link the created item definition to the active conversation
        linkConversationContent(gameId!, activeConvId, 'item_definition', itemId)
            .then(() => loadLinkedContent(gameId!, activeConvId))
            .catch(() => { });
    }
    // ---------------------------------------------------------------------------
    // Don't render when not on a game page, or before client hydration
    // ---------------------------------------------------------------------------
    if (!gameId || !mounted)
        return null;
    // ---------------------------------------------------------------------------
    // Minimized / closed — render nothing (open via GameNavButtons)
    // ---------------------------------------------------------------------------
    if (!isOpen || isMinimized)
        return null;
    // ---------------------------------------------------------------------------
    // Full panel
    // ---------------------------------------------------------------------------
    return (<>
      <div id="conv-panel-root" className="fixed right-0 top-14 lg:top-[60px] z-40 flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-60px)] flex-col border-l bg-background shadow-2xl" style={{ width: panelWidth }}>
        {/* Resize handle (left edge) */}
        <div id="conv-panel-resize-left" onMouseDown={handleResizeMouseDown} className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-muted border-r border-l hover:bg-primary/40 transition-colors z-10 flex flex-col items-center justify-center gap-1 group">
          <span id="conv-panel-resize-left-dot-1" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
          <span id="conv-panel-resize-left-dot-2" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
          <span id="conv-panel-resize-left-dot-3" className="w-0.5 h-2.5 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors"/>
        </div>

        {/* Body: sidebar + conversation view */}
        <div id="conv-panel-body" className="flex flex-1 min-h-0">
          <ConversationSidebar sidebarWidth={sidebarWidth} sidebarBodyRef={sidebarBodyRef} handleSidebarResizeMouseDown={handleSidebarResizeMouseDown} activeSectionHeight={activeSectionHeight} handleSplitResizeMouseDown={handleSplitResizeMouseDown} isArchivedCollapsed={isArchivedCollapsed} setIsArchivedCollapsed={setIsArchivedCollapsed} activeConvs={activeConvs} archivedConvs={archivedConvs} activeConvId={activeConvId} isLoadingActive={isLoadingActive} isLoadingArchived={isLoadingArchived} onSelectConv={(convId) => { setActiveConvId(convId); }} onArchive={handleArchive} onUnarchive={handleUnarchive} onDelete={handleDeleteDirect} tokenBalance={tokenBalance} gameId={gameId} t={t}/>

          {/* Conversation view */}
          <div id="conv-panel-view" className="flex flex-1 flex-col min-w-0">
            {!activeConv && !isLoadingConv && !isStreaming && chatHistory.length === 0 ? (<div id="conv-panel-empty-state" className="flex flex-1 items-center justify-center p-4 text-center relative">
                <Button id="conv-panel-btn-close" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => setIsOpen(false)} title={t('common.close')}>
                  <X className="h-4 w-4"/>
                </Button>
                <div id="conv-panel-empty-state-inner">
                  <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                  <p id="conv-panel-empty-state-text" className="text-xs text-muted-foreground">{t('llmConversation.selectOrCreate')}</p>
                </div>
              </div>) : isLoadingConv && !isStreaming ? (<div id="conv-panel-loading-state" className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
              </div>) : (<>
                {activeConv && (<ConversationHeader activeConv={activeConv} activeConvId={activeConvId} chatHistory={chatHistory} conversationTokenUsage={conversationTokenUsage} editingTitle={editingTitle} setEditingTitle={setEditingTitle} editTitleValue={editTitleValue} setEditTitleValue={setEditTitleValue} onSaveTitle={handleSaveTitle} onBack={() => { setActiveConvId(null); setActiveConv(null); }} onClose={() => setIsOpen(false)} onArchive={handleArchive} onDelete={(conv) => setDeleteTarget(conv)} onOpenDetail={() => setDetailOpen(true)} t={t}/>)}

                <ConversationChatHistory chatHistory={chatHistory} isStreaming={isStreaming} gameId={gameId} activeConvId={activeConvId} savedLoreIds={savedLoreIds} loreEntryTitles={loreEntryTitles} savedItemDefinitionIds={savedItemDefinitionIds} savedEntityDefinitionIds={savedEntityDefinitionIds} savedPresetDefinitionIds={savedPresetDefinitionIds} savedContainerDefinitionIds={savedContainerDefinitionIds} savedGachaPackIds={savedGachaPackIds} savedEquipmentSlotIds={savedEquipmentSlotIds} savedCraftingRecipeIds={savedCraftingRecipeIds} savedEntityPoolIds={savedEntityPoolIds} savedQuestDefinitionIds={savedQuestDefinitionIds} craftingRecipeNames={craftingRecipeNames} entityPoolNames={entityPoolNames} questDefinitionNames={questDefinitionNames} premiumTokensRemaining={tokenBalance?.premium_tokens_remaining ?? null} onRetry={handleRetry} onRetryResponse={handleRetryResponse} onOpenLoreReview={handleOpenLoreReview} onSaveItemDefinition={handleOpenItemDefinitionReview} onSaveEntityDefinition={handleSaveEntityDefinition} onSavePresetDefinition={handleSavePresetDefinition} onSaveContainerDefinition={handleSaveContainerDefinition} onSaveGachaPack={handleSaveGachaPack} onSaveEquipmentSlot={fireOpenCreateEquipmentSlot} onSaveCraftingRecipe={handleSaveCraftingRecipe} onSaveEntityPool={handleSaveEntityPool} onSaveQuestDefinition={handleSaveQuestDefinition} onBuyTokens={handleBuyTokens} onApplyTagSuggestion={handleApplyTagSuggestion} onRemoveGameTag={handleRemoveGameTag} onCreateItemTagFromSuggestion={handleCreateItemTagFromSuggestion} onDeleteItemTagFromSuggestion={handleDeleteItemTagFromSuggestion} appliedTagsPerResponse={appliedTagsPerResponse} createdItemTagsPerResponse={createdItemTagsPerResponse} t={t}/>
              </>)}

            {activeConvId && (linkedContent.length > 0 || isLoadingLinkedContent) && (<ConversationLinkedContent gameId={gameId} linkedContent={linkedContent} isLoadingLinkedContent={isLoadingLinkedContent} unlinkingId={unlinkingId} loreEntryTitles={loreEntryTitles} itemDefinitionNames={itemDefinitionNames} entityDefinitionNames={entityDefinitionNames} containerDefinitionNames={containerDefinitionNames} presetDefinitionNames={presetDefinitionNames} gachaPackNames={gachaPackNames} entityPoolNames={entityPoolNames} entityPoolKeys={entityPoolKeys} questDefinitionNames={questDefinitionNames} craftingRecipeNames={craftingRecipeNames} onUnlink={(linkId, contentType, contentId) => { void handleUnlinkContent(linkId, contentType, contentId); }} t={t}/>)}

            <ConversationInputArea message={message} setMessage={setMessage} isStreaming={isStreaming} requestTypes={requestTypes} selectedRequestType={selectedRequestType} setSelectedRequestType={setSelectedRequestType} autoDetectedType={autoDetectedType} setAutoDetectedType={setAutoDetectedType} onSend={handleSend} t={t}/>
          </div>
        </div>
      </div>

      <Dialog open={craftingRecipeConflictOpen} onOpenChange={(open) => {
            if (!open && !isApplyingCraftingRecipeConflict) {
                setCraftingRecipeConflictOpen(false);
                setCraftingRecipeConflictExisting(null);
                setCraftingRecipeConflictPending(null);
            }
        }}>
        <DialogContent id="crafting-recipe-conflict-dialog-root">
          <DialogHeader id="crafting-recipe-conflict-dialog-header">
            <DialogTitle id="crafting-recipe-conflict-dialog-title">{t('llmConversation.craftingRecipeConflictTitle')}</DialogTitle>
            <DialogDescription id="crafting-recipe-conflict-dialog-desc">
              {craftingRecipeConflictDescription}
            </DialogDescription>
          </DialogHeader>

          {craftingRecipeConflictExisting && (<Link id="crafting-recipe-conflict-existing-link" href={`/games/${gameId}/items?tab=crafting&expanded=${craftingRecipeConflictExisting.id}&noconvpanel=1`} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <Hammer id="crafting-recipe-conflict-existing-link-icon" className="h-4 w-4 shrink-0 text-muted-foreground"/>
              <span id="crafting-recipe-conflict-existing-link-name" className="flex-1 truncate">{craftingRecipeConflictExisting.name}</span>
              <code id="crafting-recipe-conflict-existing-link-key" className="text-xs bg-muted-foreground/20 px-1 rounded">{craftingRecipeConflictExisting.recipe_key}</code>
              <ExternalLink id="crafting-recipe-conflict-existing-link-ext-icon" className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
            </Link>)}

          <Button id="crafting-recipe-conflict-update-btn" type="button" disabled={isApplyingCraftingRecipeConflict} onClick={handleCraftingRecipeConflictUpdate} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black">
            {isApplyingCraftingRecipeConflict
            ? <><Loader2 id="crafting-recipe-conflict-update-spinner" className="h-4 w-4 animate-spin"/>{t('llmConversation.craftingRecipeConflictUpdating')}</>
            : <><Hammer id="crafting-recipe-conflict-update-icon" className="h-4 w-4"/>{t('llmConversation.craftingRecipeConflictUpdate')}</>}
          </Button>

          <div id="crafting-recipe-conflict-divider" className="relative flex items-center gap-2">
            <div id="crafting-recipe-conflict-divider-left" className="flex-1 border-t border-border"/>
            <span id="crafting-recipe-conflict-divider-label" className="text-xs text-muted-foreground">{t('common.or')}</span>
            <div id="crafting-recipe-conflict-divider-right" className="flex-1 border-t border-border"/>
          </div>

          <div id="crafting-recipe-conflict-save-new-section" className="space-y-2">
            <Label id="crafting-recipe-conflict-new-key-label" htmlFor="crafting-recipe-conflict-new-key-input" className="text-xs text-muted-foreground">
              {t('llmConversation.craftingRecipeConflictNewKeyLabel')}
            </Label>
            <Input id="crafting-recipe-conflict-new-key-input" value={newCraftingRecipeKeyInput} onChange={(e) => setNewCraftingRecipeKeyInput(e.target.value)} disabled={isApplyingCraftingRecipeConflict} className="font-mono"/>
            <Button id="crafting-recipe-conflict-save-new-btn" type="button" disabled={isApplyingCraftingRecipeConflict || !newCraftingRecipeKeyInput.trim()} onClick={handleCraftingRecipeConflictCreateNew} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50">
              <PackagePlus id="crafting-recipe-conflict-save-new-icon" className="h-4 w-4"/>
              {t('llmConversation.craftingRecipeConflictSaveNew')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={craftingRecipeReviewOpen} onOpenChange={(open) => {
            if (!open) {
                handleCraftingRecipeReviewCancel();
            }
        }}>
        <DialogContent id="crafting-recipe-review-dialog-root" className="max-w-4xl">
          <DialogHeader id="crafting-recipe-review-dialog-header">
            <DialogTitle id="crafting-recipe-review-dialog-title">{t('llmConversation.craftingRecipeReviewTitle')}</DialogTitle>
            <DialogDescription id="crafting-recipe-review-dialog-desc">
              {t('llmConversation.craftingRecipeReviewDesc')}
            </DialogDescription>
          </DialogHeader>

          <div id="crafting-recipe-review-json-section" className="space-y-2">
            <div id="crafting-recipe-review-json-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('llmConversation.craftingRecipeReviewJson')}
            </div>
            <ScrollArea id="crafting-recipe-review-json-scroll" className="h-[52vh] rounded-md border border-border bg-muted/30">
              <pre id="crafting-recipe-review-json-preview" className="min-h-full p-4 text-xs leading-5 text-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(craftingRecipeReviewData ?? {}, null, 2)}
              </pre>
            </ScrollArea>
          </div>

          <div id="crafting-recipe-review-actions" className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button id="crafting-recipe-review-back-btn" type="button" variant="outline" onClick={handleCraftingRecipeReviewCancel} className="sm:min-w-32">
              {t('llmConversation.craftingRecipeReviewBack')}
            </Button>
            <Button id="crafting-recipe-review-confirm-btn" type="button" onClick={handleCraftingRecipeReviewConfirm} className="sm:min-w-40 inline-flex items-center justify-center gap-2" disabled={!craftingRecipeReviewData || !craftingRecipeConflictExisting || !craftingRecipeConflictPending}>
              <Hammer id="crafting-recipe-review-confirm-icon" className="h-4 w-4"/>
              {t('llmConversation.craftingRecipeReviewConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={questCodeConflictOpen} onOpenChange={(open) => {
            if (!open) {
                setQuestCodeConflictOpen(false);
                setQuestCodeConflictExisting(null);
                setQuestCodeConflictPending(null);
            }
        }}>
        <DialogContent id="quest-code-conflict-dialog-root">
          <DialogHeader id="quest-code-conflict-dialog-header">
            <DialogTitle id="quest-code-conflict-dialog-title">{t('llmConversation.questCodeConflictTitle')}</DialogTitle>
            <DialogDescription id="quest-code-conflict-dialog-desc">
              {questCodeConflictDescription}
            </DialogDescription>
          </DialogHeader>

          {questCodeConflictExisting && (<Link id="quest-code-conflict-existing-link" href={`/games/${gameId}/quests?editQuestId=${questCodeConflictExisting.id}&noconvpanel=1`} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <Hammer id="quest-code-conflict-existing-link-icon" className="h-4 w-4 shrink-0 text-muted-foreground"/>
              <span id="quest-code-conflict-existing-link-name" className="flex-1 truncate">{questCodeConflictExisting.name}</span>
              <code id="quest-code-conflict-existing-link-code" className="text-xs bg-muted-foreground/20 px-1 rounded">{questCodeConflictExisting.code_name ?? ''}</code>
              <ExternalLink id="quest-code-conflict-existing-link-ext-icon" className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
            </Link>)}

          <Button id="quest-code-conflict-update-btn" type="button" onClick={handleQuestCodeConflictUpdate} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black" disabled={!questCodeConflictExisting || !questCodeConflictPending}>
            <Hammer id="quest-code-conflict-update-icon" className="h-4 w-4"/>
            {t('llmConversation.questCodeConflictUpdate')}
          </Button>

          <div id="quest-code-conflict-divider" className="relative flex items-center gap-2">
            <div id="quest-code-conflict-divider-left" className="flex-1 border-t border-border"/>
            <span id="quest-code-conflict-divider-label" className="text-xs text-muted-foreground">{t('common.or')}</span>
            <div id="quest-code-conflict-divider-right" className="flex-1 border-t border-border"/>
          </div>

          <div id="quest-code-conflict-save-new-section" className="space-y-2">
            <Label id="quest-code-conflict-new-code-label" htmlFor="quest-code-conflict-new-code-input" className="text-xs text-muted-foreground">
              {t('llmConversation.questCodeConflictNewCodeLabel')}
            </Label>
            <Input id="quest-code-conflict-new-code-input" value={newQuestCodeInput} onChange={(e) => setNewQuestCodeInput(e.target.value)} className="font-mono"/>
            <Button id="quest-code-conflict-save-new-btn" type="button" onClick={() => handleQuestCodeConflictSaveNew(newQuestCodeInput)} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-black" disabled={!questCodeConflictPending}>
              <PackagePlus id="quest-code-conflict-save-new-icon" className="h-4 w-4"/>
              {t('llmConversation.questCodeConflictSaveNew')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConversationDialogs detailOpen={detailOpen} setDetailOpen={setDetailOpen} chatHistory={chatHistory} activeConv={activeConv} convGeneratedItems={convGeneratedItems} deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget} onDelete={handleDelete} createRecordsConfirmOpen={createRecordsConfirmOpen} setCreateRecordsConfirmOpen={setCreateRecordsConfirmOpen} isCreatingRecords={isCreatingRecords} onCreateRecords={handleCreateRecords} gameId={gameId} loreDraftReviewOpen={loreDraftReviewOpen} setLoreDraftReviewOpen={setLoreDraftReviewOpen} loreDraftForm={loreDraftForm} setLoreDraftForm={setLoreDraftForm} isCreatingLoreRecords={isCreatingLoreRecords} onCreateLoreRecords={handleCreateLoreRecords} itemDefReviewOpen={itemDefReviewOpen} setItemDefReviewOpen={setItemDefReviewOpen} itemInitialValues={itemInitialValues} onItemDefCreated={handleItemDefCreated} entityDefinitionConflictOpen={entityDefinitionConflictOpen} setEntityDefinitionConflictOpen={setEntityDefinitionConflictOpen} entityDefinitionConflictExisting={entityDefinitionConflictExisting} entityDefinitionConflictReviewOpen={entityDefinitionConflictReviewOpen} setEntityDefinitionConflictReviewOpen={setEntityDefinitionConflictReviewOpen} entityDefinitionConflictReviewData={entityDefinitionConflictReviewData} isApplyingEntityDefinitionConflict={isApplyingEntityDefinitionConflict} onEntityDefinitionConflictUpdate={handleEntityDefinitionConflictUpdate} onEntityDefinitionConflictReview={openEntityDefinitionConflictReview} onEntityDefinitionConflictSaveNew={handleEntityDefinitionConflictSaveNew} entityPoolConflictOpen={entityPoolConflictOpen} setEntityPoolConflictOpen={setEntityPoolConflictOpen} entityPoolConflictExisting={entityPoolConflictExisting} entityPoolConflictReviewOpen={entityPoolConflictReviewOpen} setEntityPoolConflictReviewOpen={setEntityPoolConflictReviewOpen} entityPoolConflictReviewData={entityPoolConflictReviewData} isApplyingEntityPoolConflict={isApplyingEntityPoolConflict} onEntityPoolConflictUpdate={handleEntityPoolConflictUpdate} onEntityPoolConflictReview={() => handleEntityPoolConflictUpdate()} onEntityPoolConflictSaveNew={handleEntityPoolConflictSaveNew} itemCodeConflictOpen={itemCodeConflictOpen} setItemCodeConflictOpen={setItemCodeConflictOpen} itemCodeConflictExisting={itemCodeConflictExisting} onItemCodeConflictUpdate={handleItemCodeConflictUpdate} onItemCodeConflictSaveNew={handleItemCodeConflictSaveNew} presetCodeConflictOpen={presetCodeConflictOpen} setPresetCodeConflictOpen={setPresetCodeConflictOpen} presetCodeConflictExisting={presetCodeConflictExisting} isApplyingPresetConflict={isApplyingPresetConflict} onPresetCodeConflictUpdate={handlePresetCodeConflictUpdate} onPresetCodeConflictSaveNew={handlePresetCodeConflictSaveNew} containerNameConflictOpen={containerNameConflictOpen} setContainerNameConflictOpen={setContainerNameConflictOpen} containerNameConflictExisting={containerNameConflictExisting} onContainerNameConflictUpdate={handleContainerNameConflictUpdate} onContainerNameConflictCreateNew={handleContainerNameConflictCreateNew} gachaPackCodeConflictOpen={gachaPackCodeConflictOpen} setGachaPackCodeConflictOpen={setGachaPackCodeConflictOpen} gachaPackCodeConflictExisting={gachaPackCodeConflictExisting} isApplyingGachaPackConflict={isApplyingGachaPackConflict} onGachaPackCodeConflictUpdate={handleGachaPackCodeConflictUpdate} onGachaPackCodeConflictCreateNew={handleGachaPackCodeConflictCreateNew} equipmentSlotKeyConflictOpen={equipmentSlotKeyConflictOpen} setEquipmentSlotKeyConflictOpen={setEquipmentSlotKeyConflictOpen} equipmentSlotKeyConflictExisting={equipmentSlotKeyConflictExisting} isApplyingEquipmentSlotConflict={isApplyingEquipmentSlotConflict} onEquipmentSlotKeyConflictUpdate={handleEquipmentSlotKeyConflictUpdate} onEquipmentSlotKeyConflictCreateNew={handleEquipmentSlotKeyConflictCreateNew} t={t}/>
      {itemCodeConflictExisting && itemCodeConflictInitialValues && (<CreateItemDefinitionDialog open={itemCodeConflictEditOpen} gameId={gameId} mode="edit" itemId={itemCodeConflictExisting.id} initialValues={itemCodeConflictInitialValues} onCreated={() => { }} onUpdated={handleItemCodeConflictEditApplied} onClose={() => setItemCodeConflictEditOpen(false)} initialCategory={itemCodeConflictInitialValues.category}/>)}
    </>);
}
