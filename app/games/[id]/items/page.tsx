"use client";
import { useEffect, useState, useCallback } from "react";
import { toSafeCodeName } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Search, RefreshCw, Package, Eye, Copy, ExternalLink, Hammer, Pencil, Save, X, ChevronUp, Loader2, ZoomIn, ZoomOut, Info, Tag, Lock, Archive, Zap, Shield, LayoutTemplate, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ITEMS_TABS } from "@/lib/items-tabs";
import { SheetDescription, } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { listItemDefinitions, createItemDefinition, getItemDefinition, listEquipmentSlots, getEquipmentSlot, createEquipmentSlot, updateEquipmentSlot, deleteEquipmentSlot, listPresetDefinitions, deletePresetDefinition, type ItemTag, type PresetDefinition, } from "@/lib/inventory-api";
import type { ItemDefinition, ItemCategory, ItemRarity, CreateItemRequest, ContainerDefinition, GachaPack, EquipmentSlot, } from "@/types/inventory";
import { RARITY_COLORS } from "@/types/inventory";
import { GameNavButtons } from "@/components/GameNavButtons";
import { CopyButton } from "@/components/CopyButton";
import { CraftingTab } from "@/components/crafting/crafting-tab";
import { EquipmentsTab, EquipmentSlotSheet } from '@/components/EquipmentsTab';
import { CreateItemDefinitionDialog } from '@/components/CreateItemDefinitionDialog';
import { GachaPackSheet } from "./_components/GachaPackSheet";
import { ExplanationPanel } from "./_components/ExplanationPanel";
import { CreatePresetDefinitionSheet } from "./_components/CreatePresetDefinitionSheet";
import { DeleteGachaPackDialog } from "./_components/DeleteGachaPackDialog";
import { EditPresetDefinitionSheet } from "./_components/EditPresetDefinitionSheet";
import { CreateContainerDefinitionDialog } from "./_components/create-container-definition-dialog";
import { EditContainerDefinitionDialog } from "./_components/edit-container-definition-dialog";
import { ItemsPageContainerSection } from "./_components/items-page-container-section";
import { ItemsPageGachaSection } from "./_components/items-page-gacha-section";
import { ItemsPageGeneratorSection } from "./_components/items-page-generator-section";
import { ItemsPagePresetsSection } from "./_components/items-page-presets-section";
import { ItemsPageTagsSection } from "./_components/items-page-tags-section";
import { useContainerPageState } from "./_hooks/use-container-page-state";
import { useContainerPage } from "./_hooks/use-container-page";
import { useGachaPageState } from "./_hooks/use-gacha-page-state";
import { useGachaPage } from "./_hooks/use-gacha-page";
import { useItemsCataloguePage } from "./_hooks/use-items-catalogue-page";
import { EMPTY_KEY_ROW, EMPTY_ROW, emptyGachaForm, type ContainerDraftValues, type GachaLLMRow, type KeyReqRow, normalizeContainerDraftValues, type PoolRow } from "./_hooks/items-page-state-types";
import { createConversation, linkConversationContent } from '@/lib/llm-conversation-api';
import { safeGetItem, safeSetItem } from '@/lib/storage-utils';
function RarityBadge({ rarity }: {
    rarity: ItemRarity;
}) {
    const c = RARITY_COLORS[rarity];
    if (!c) {
        return (<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-gray-400 border-gray-400 bg-gray-400/10 capitalize w-fit">
        {rarity}
      </span>);
    }
    return (<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${c.text} ${c.border} ${c.bg} capitalize w-fit`}>
      {rarity}
    </span>);
}
function prettyCategory(s: string): string {
    return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function formatPct(pct: number): string {
    if (pct === 0)
        return "0%";
    if (pct >= 1)
        return pct.toFixed(2) + "%";
    if (pct >= 0.01)
        return pct.toFixed(4) + "%";
    if (pct >= 0.0001)
        return pct.toFixed(6) + "%";
    return pct.toFixed(10).replace(/\.?0+$/, "") + "%";
}
function DropBar({ weight, total }: {
    weight: number;
    total: number;
}) {
    const pct = total > 0 ? Math.min((weight / total) * 100, 100) : 0;
    return (<div className="flex items-center gap-1.5 min-w-[400px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
        {formatPct(pct)}
      </span>
    </div>);
}
/** Resolve a __REF:ITEM_CODE placeholder to the actual item definition ID.
 *  Returns the original value unchanged if it is not a __REF: placeholder
 *  or no matching item is found. */
function resolveGachaRef(rawId: string, items: ItemDefinition[]): string {
    if (!rawId.startsWith('__REF:'))
        return rawId;
    const code = rawId.slice(6); // strip "__REF:"
    const found = items.find((it) => it.item_code?.toUpperCase() === code.toUpperCase());
    return found ? found.id : rawId;
}
/** Search the API to resolve __REF:ITEM_CODE placeholders to actual item definition IDs.
 *  Returns a map of item_code -> item_definition_id for every ref that was found. */
async function resolveGachaRefCodes(rawIds: string[], gameId: string): Promise<Record<string, string>> {
    const refCodes = [...new Set(rawIds.filter((id) => id.startsWith('__REF:')).map((id) => id.slice(6)))];
    const codeToId: Record<string, string> = {};
    if (refCodes.length === 0)
        return codeToId;
    await Promise.allSettled(refCodes.map((code) => listItemDefinitions({ gameId }, { item_code: code, limit: 1 })
        .then((res) => {
        const found = (res.items ?? [])[0];
        if (found)
            codeToId[code] = found.id;
    })
        .catch(() => { })));
    return codeToId;
}
/** Apply a code->id map: if rawId is __REF:CODE, return the resolved ID when available,
 *  otherwise keep the placeholder so the form can still show the unresolved ref. */
function applyRefCodeMap(rawId: string, codeToId: Record<string, string>): string {
    if (!rawId.startsWith('__REF:'))
        return rawId;
    return codeToId[rawId.slice(6)] ?? rawId;
}
export default function GameItemsPage() {
    const params = useParams() as {
        id: string;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { t } = useTranslation();
    const gameId = params.id;
    const [gameName, setGameName] = useState("");
    const [studioId, setStudioId] = useState("");
    const [maxItems, setMaxItems] = useState<number | null>(null);
    const [itemUsage, setItemUsage] = useState<number | null>(null);
    const [maxEquipmentSlots, setMaxEquipmentSlots] = useState<number | null>(null);
    const [equipmentSlotsUsage, setEquipmentSlotsUsage] = useState<number | null>(null);
    const [items, setItems] = useState<ItemDefinition[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    // filters
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterRarity, setFilterRarity] = useState<string>("all");
    const [searchName, setSearchName] = useState("");
    const [debouncedName, setDebouncedName] = useState("");
    const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
    const [tagFilterOpen, setTagFilterOpen] = useState(false);
    const [filterAllowClientUpdateQty, setFilterAllowClientUpdateQty] = useState<string>("all");
    // pagination
    const LIMIT = 50;
    const [offset, setOffset] = useState(0);
    // modal
    const [showCreate, setShowCreate] = useState(false);
    const [createInitCategory, setCreateInitCategory] = useState<ItemCategory | undefined>(undefined);
    const [categories, setCategories] = useState<ItemCategory[]>([]);
    const [rarities, setRarities] = useState<ItemRarity[]>([]);
    // tab state management
    const [activeTab, setActiveTab] = useState<string>("catalogue");
    // containers tab state
    const CONTAINER_LIMIT = 50;
    const {
        containerDefs,
        setContainerDefs,
        containerTotal,
        setContainerTotal,
        containerLoading,
        setContainerLoading,
        containerError,
        setContainerError,
        containerOffset,
        setContainerOffset,
        showCreateContainer,
        setShowCreateContainer,
        createContainerInitialValues,
        setCreateContainerInitialValues,
        createContainerConvContext,
        setCreateContainerConvContext,
        editingContainer,
        setEditingContainer,
        editingContainerDraft,
        setEditingContainerDraft,
        editingContainerConvContext,
        setEditingContainerConvContext,
        deletingContainer,
        setDeletingContainer,
        deleteContainerLoading,
        setDeleteContainerLoading,
        containerSearch,
        setContainerSearch,
        containerSearchDebounced,
        setContainerSearchDebounced,
        containerAllItems,
        setContainerAllItems,
        containerTypeOptions,
        setContainerTypeOptions,
        expandedContainerId,
        setExpandedContainerId,
        containerDetailCache,
        setContainerDetailCache,
        containerDetailLoading,
        setContainerDetailLoading,
        editingField,
        setEditingField,
        editValue,
        setEditValue,
        editValue2,
        setEditValue2,
        containerItemsOnly,
        setContainerItemsOnly,
        metadataRows,
        setMetadataRows,
        containerSubTab,
        setContainerSubTab,
        updatingContainerId,
        setUpdatingContainerId,
    } = useContainerPageState();
    // generator tab state
    const [generatorItems, setGeneratorItems] = useState<ItemDefinition[]>([]);
    const [generatorLoading, setGeneratorLoading] = useState(false);
    const [generatorError, setGeneratorError] = useState<string | null>(null);
    const [generatorRefreshKey, setGeneratorRefreshKey] = useState(0);
    // equipments tab state
    const [equipmentSlots, setEquipmentSlots] = useState<EquipmentSlot[]>([]);
    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentError, setEquipmentError] = useState<string | null>(null);
    // tags tab state
    const [itemTags, setItemTags] = useState<ItemTag[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagsError, setTagsError] = useState<string | null>(null);
    // track which item is being updated
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    // explanation panel state
    const [showExplanationPanel, setShowExplanationPanel] = useState(false);
    const [explanationTopic, setExplanationTopic] = useState<'write_props' | 'update_qty' | null>(null);
    // preset tab state
    const [presetDefs, setPresetDefs] = useState<PresetDefinition[]>([]);
    const [presetLoading, setPresetLoading] = useState(false);
    const [presetError, setPresetError] = useState<string | null>(null);
    const [presetSearch, setPresetSearch] = useState("");
    const [presetSearchDebounced, setPresetSearchDebounced] = useState("");
    const [showCreatePreset, setShowCreatePreset] = useState(false);
    const [createPresetInitialValues, setCreatePresetInitialValues] = useState<{
        name?: string;
        preset_type?: string;
        code_name?: string;
        max_slots?: number;
    } | undefined>(undefined);
    const [createPresetTurnContext, setCreatePresetTurnContext] = useState<{
        turnId: string;
        responseIdx: number;
        presetIdx: number;
        convId: string;
    } | null>(null);
    const [editingPreset, setEditingPreset] = useState<PresetDefinition | null>(null);
    const [deletingPreset, setDeletingPreset] = useState<PresetDefinition | null>(null);
    const [deletePresetLoading, setDeletePresetLoading] = useState(false);
    // gacha tab state
    const {
        gachaPacks,
        setGachaPacks,
        gachaAllItems,
        setGachaAllItems,
        gachaLoading,
        setGachaLoading,
        gachaError,
        setGachaError,
        gameLimits,
        setGameLimits,
        expandedPack,
        setExpandedPack,
        gachaSheetOpen,
        setGachaSheetOpen,
        editingPack,
        setEditingPack,
        formSaving,
        setFormSaving,
        gachaForm,
        setGachaForm,
        createGachaConvContext,
        setCreateGachaConvContext,
        deletingPack,
        setDeletingPack,
        deletePackLoading,
        setDeletePackLoading,
        togglingId,
        setTogglingId,
        gachaSearch,
        setGachaSearch,
        gachaSearchDebounced,
        setGachaSearchDebounced,
        suppressGachaAutoOpenRef,
    } = useGachaPageState();
    // conversation panel integration
    const [convPanelOpen, setConvPanelOpen] = useState(false);
    const [convActiveId, setConvActiveId] = useState<string | null>(null);
    const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
    const [linkingContainerId, setLinkingContainerId] = useState<string | null>(null);
    const [linkingPresetId, setLinkingPresetId] = useState<string | null>(null);
    useEffect(() => {
        function readPanelState() {
            setConvPanelOpen(safeGetItem('ss_conv_panel_open') === 'true');
            setConvActiveId(safeGetItem(`ss_conv_active_${gameId}`) ?? null);
        }
        readPanelState();
        const handler = () => readPanelState();
        window.addEventListener('storage', handler);
        window.addEventListener('ss:conv-state-changed', handler);
        function handleOpenCreateContainer(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            setCreateContainerInitialValues({
                name: detail.name,
                code_name: detail.code_name ?? (typeof detail.name === 'string' ? toSafeCodeName(detail.name) : undefined),
                container_type: detail.container_type,
                grid_cols: detail.grid_cols,
                grid_rows: detail.grid_rows,
                is_portable: detail.is_portable,
                linked_item_definition_id: detail.linked_item_definition_id,
                linked_item_definition_name: detail.linked_item_definition_name,
                linked_item_definition_code: detail.linked_item_definition_code,
                metadata: detail.metadata,
            });
            if (detail.turnId !== undefined) {
                setCreateContainerConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, containerIdx: detail.containerIdx });
            }
            else {
                setCreateContainerConvContext(undefined);
            }
            setActiveTab('containers');
            setShowCreateContainer(true);
        }
        window.addEventListener('ss:open-create-container', handleOpenCreateContainer);
        async function handleOpenEditContainer(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            const containerId = typeof detail.containerId === 'string' ? detail.containerId : '';
            const providedDefinition = detail.definition && typeof detail.definition === 'object'
                ? detail.definition as ContainerDefinition
                : null;
            const providedDraft = normalizeContainerDraftValues(detail.container ?? detail.initialValues ?? null);
            const context = detail.turnId !== undefined
                ? { turnId: detail.turnId, responseIdx: detail.responseIdx, containerIdx: detail.containerIdx }
                : undefined;
            setActiveTab('containers');
            setShowCreateContainer(false);
            setEditingContainerConvContext(context);
            setEditingContainerDraft(providedDraft);
            setEditingContainer(null);
            const matched = providedDefinition ?? containerDefs.find((def) => def.id === containerId) ?? null;
            if (matched) {
                setEditingContainer(matched);
                return;
            }
            if (!containerId) {
                toast({ title: t('items.failedToLoadContainerDefinition'), variant: 'destructive' });
                return;
            }
            try {
                const res = await getContainerDefinition({ gameId }, containerId);
                setEditingContainer(res.container_definition);
            }
            catch {
                toast({ title: t('items.failedToLoadContainerDefinition'), variant: 'destructive' });
            }
        }
        window.addEventListener('ss:open-edit-container', handleOpenEditContainer);
        async function handleOpenCreateGachaPack(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            const rawPool = Array.isArray(detail.item_pool) && detail.item_pool.length > 0
                ? detail.item_pool.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    weight: String(r.weight ?? 1),
                    quantity_min: String(r.quantity_min ?? 1),
                    quantity_max: String(r.quantity_max ?? 1),
                }))
                : [EMPTY_ROW()];
            const rawKeyReqs = Array.isArray(detail.key_requirements) && detail.key_requirements.length > 0
                ? detail.key_requirements.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    quantity: String(r.quantity ?? 1),
                }))
                : [EMPTY_KEY_ROW()];
            const allRawIds = [
                ...rawPool.map((r: PoolRow) => r.item_definition_id),
                ...rawKeyReqs.map((r: KeyReqRow) => r.item_definition_id),
            ];
            const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
            const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const meta = (detail.metadata ?? {}) as Record<string, unknown>;
            setEditingPack(null);
            setGachaForm({
                name: typeof detail.name === 'string' ? detail.name : '',
                code_name: typeof detail.code_name === 'string' ? detail.code_name : '',
                collect_destination: detail.collect_destination === 'inventory' ? 'inventory' : 'mailbox',
                is_enabled: detail.is_enabled !== false,
                mailbox_title: typeof meta.mailbox_title === 'string' ? meta.mailbox_title : '',
                mailbox_body: typeof meta.mailbox_body === 'string' ? meta.mailbox_body : '',
                pool,
                keyReqs,
            });
            if (detail.turnId !== undefined) {
                setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
            }
            else {
                setCreateGachaConvContext(undefined);
            }
            setActiveTab('gacha');
            setGachaSheetOpen(true);
        }
        window.addEventListener('ss:open-create-gacha-pack', handleOpenCreateGachaPack);
        async function handleOpenEditGachaPack(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            const existingPack = detail.existingPack as GachaPack | undefined;
            if (!existingPack)
                return;
            const llmData = (detail.llmData ?? {}) as Record<string, unknown>;
            const rawPool = Array.isArray(llmData.item_pool) && llmData.item_pool.length > 0
                ? llmData.item_pool.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    weight: String(r.weight ?? 1),
                    quantity_min: String(r.quantity_min ?? 1),
                    quantity_max: String(r.quantity_max ?? 1),
                }))
                : existingPack.item_pool.map((r) => ({
                    item_definition_id: r.item_definition_id,
                    weight: String(r.weight),
                    quantity_min: String(r.quantity_min),
                    quantity_max: String(r.quantity_max),
                }));
            const rawKeyReqs = Array.isArray(llmData.key_requirements) && llmData.key_requirements.length > 0
                ? llmData.key_requirements.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    quantity: String(r.quantity ?? 1),
                }))
                : (existingPack.key_requirements ?? []).map((r) => ({
                    item_definition_id: r.item_definition_id,
                    quantity: String(r.quantity),
                }));
            const allRawIds = [
                ...rawPool.map((r) => r.item_definition_id),
                ...rawKeyReqs.map((r) => r.item_definition_id),
            ];
            const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
            const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const existingMeta = (existingPack.metadata ?? {}) as Record<string, unknown>;
            const llmMeta = (llmData.metadata && typeof llmData.metadata === 'object' && !Array.isArray(llmData.metadata))
                ? llmData.metadata as Record<string, unknown>
                : existingMeta;
            setEditingPack(existingPack);
            setGachaForm({
                name: typeof llmData.name === 'string' && llmData.name.trim() ? llmData.name : existingPack.name,
                code_name: existingPack.code_name ?? '',
                collect_destination: llmData.collect_destination === 'inventory' || llmData.collect_destination === 'mailbox'
                    ? llmData.collect_destination
                    : existingPack.collect_destination ?? 'mailbox',
                is_enabled: existingPack.is_enabled,
                mailbox_title: typeof llmMeta.mailbox_title === 'string' ? llmMeta.mailbox_title : '',
                mailbox_body: typeof llmMeta.mailbox_body === 'string' ? llmMeta.mailbox_body : '',
                pool,
                keyReqs,
            });
            if (detail.turnId !== undefined) {
                setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
            }
            const newParams = new URLSearchParams(window.location.search);
            newParams.set('editPack', existingPack.id);
            router.replace(`${window.location.pathname}?${newParams.toString()}`);
            setActiveTab('gacha');
            setGachaSheetOpen(true);
        }
        window.addEventListener('ss:open-edit-gacha-pack', handleOpenEditGachaPack);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('ss:conv-state-changed', handler);
            window.removeEventListener('ss:open-create-container', handleOpenCreateContainer);
            window.removeEventListener('ss:open-edit-container', handleOpenEditContainer);
            window.removeEventListener('ss:open-create-gacha-pack', handleOpenCreateGachaPack);
            window.removeEventListener('ss:open-edit-gacha-pack', handleOpenEditGachaPack);
        };
    }, [gameId, containerDefs, toast, t]);
    // initialize tab from URL params
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "containers" || tab === "catalogue" || tab === "gacha" || tab === "generators" || tab === "equipments" || tab === "tags" || tab === "preset" || tab === "crafting") {
            setActiveTab(tab);
        }
        const cst = searchParams.get("csubtab");
        if (cst === "definitions" || cst === "slot-guide")
            setContainerSubTab(cst);
        // initialize container/gacha search from URL `q` param
        const q = searchParams.get("q");
        if (q && tab === "preset")
            setPresetSearch(q);
        else if (q && tab !== "gacha")
            setContainerSearch(q);
        else if (q && tab === "gacha")
            setGachaSearch(q);
        // initialize preset search from URL `id` param
        const presetId = searchParams.get("id");
        if (presetId && tab === "preset")
            setPresetSearch(presetId);
        // initialize container search from URL `id` param
        const containerId = searchParams.get("id");
        if (containerId && tab === "containers")
            setContainerSearch(containerId);
        if (tab === "containers" && searchParams.get("editContainer")) {
            const editContainerId = searchParams.get("editContainer");
            if (editContainerId) {
                const pendingKey = `ss_pending_container_edit_${gameId}`;
                const pendingRaw = safeGetItem(pendingKey);
                let pendingDraft: ContainerDraftValues | undefined;
                if (pendingRaw) {
                    try {
                        pendingDraft = normalizeContainerDraftValues(JSON.parse(pendingRaw));
                    }
                    catch {
                        pendingDraft = undefined;
                    }
                    finally {
                        safeRemoveItem(pendingKey);
                    }
                }
                const target = containerDefs.find((def) => def.id === editContainerId);
                if (target) {
                    setEditingContainerDraft(pendingDraft);
                    setEditingContainer(target);
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("editContainer");
                    const nextQuery = newParams.toString();
                    router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
                }
                else {
                    void (async () => {
                        try {
                            const res = await getContainerDefinition({ gameId }, editContainerId);
                            setEditingContainerDraft(pendingDraft);
                            setEditingContainer(res.container_definition);
                            const newParams = new URLSearchParams(searchParams.toString());
                            newParams.delete("editContainer");
                            const nextQuery = newParams.toString();
                            router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
                        }
                        catch {
                            toast({ title: t('items.failedToLoadContainerDefinition'), variant: 'destructive' });
                        }
                    })();
                }
            }
        }
        // auto-open create preset sheet from URL params
        if (tab === "preset" && searchParams.get("create") === "1") {
            const iv: {
                name?: string;
                preset_type?: string;
                code_name?: string;
                max_slots?: number;
            } = {};
            const pName = searchParams.get("preset_name");
            const pType = searchParams.get("preset_type");
            const pCode = searchParams.get("code_name");
            const pSlots = searchParams.get("max_slots");
            if (pName)
                iv.name = pName;
            if (pType)
                iv.preset_type = pType;
            if (pCode)
                iv.code_name = pCode;
            if (pSlots && !isNaN(Number(pSlots)))
                iv.max_slots = Number(pSlots);
            setCreatePresetInitialValues(iv);
            setShowCreatePreset(true);
            // Restore turn context stored by ConversationPanel before navigation
            const pendingTurnRaw = safeGetItem(`ss_pending_preset_turn_${gameId}`);
            if (pendingTurnRaw) {
                try {
                    setCreatePresetTurnContext(JSON.parse(pendingTurnRaw));
                    // Remove immediately so it's not re-consumed on next open
                    localStorage.removeItem(`ss_pending_preset_turn_${gameId}`);
                }
                catch { /* ignore malformed data */ }
            }
        }
        // auto-open preset edit sheet from URL params
        if (tab === "preset" && searchParams.get("editPreset")) {
            const presetEditId = searchParams.get("editPreset");
            const target = presetDefs.find((def) => def.id === presetEditId);
            if (target) {
                setEditingPreset(target);
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete("editPreset");
                const nextQuery = newParams.toString();
                router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
            }
        }
        // auto-open gacha create sheet from LLM (data stored in localStorage)
        if (tab === "gacha" && searchParams.get("create") === "1") {
            const pendingRaw = safeGetItem(`ss_pending_gacha_create_${gameId}`);
            if (pendingRaw) {
                void (async () => {
                    try {
                        const detail = JSON.parse(pendingRaw);
                        const rawPool = Array.isArray(detail.item_pool) && detail.item_pool.length > 0
                            ? detail.item_pool.map((r: GachaLLMRow) => ({
                                item_definition_id: String(r.item_definition_id ?? ''),
                                weight: String(r.weight ?? 1),
                                quantity_min: String(r.quantity_min ?? 1),
                                quantity_max: String(r.quantity_max ?? 1),
                            }))
                            : [EMPTY_ROW()];
                        const rawKeyReqs = Array.isArray(detail.key_requirements) && detail.key_requirements.length > 0
                            ? detail.key_requirements.map((r: GachaLLMRow) => ({
                                item_definition_id: String(r.item_definition_id ?? ''),
                                quantity: String(r.quantity ?? 1),
                            }))
                            : [EMPTY_KEY_ROW()];
                        const allRawIds = [
                            ...rawPool.map((r: PoolRow) => r.item_definition_id),
                            ...rawKeyReqs.map((r: KeyReqRow) => r.item_definition_id),
                        ];
                        const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
                        const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                        const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                        const meta = (detail.metadata ?? {}) as Record<string, unknown>;
                        setEditingPack(null);
                        setGachaForm({
                            name: typeof detail.name === 'string' ? detail.name : '',
                            code_name: typeof detail.code_name === 'string' ? detail.code_name : '',
                            collect_destination: detail.collect_destination === 'inventory' ? 'inventory' : 'mailbox',
                            is_enabled: detail.is_enabled !== false,
                            mailbox_title: typeof meta.mailbox_title === 'string' ? meta.mailbox_title : '',
                            mailbox_body: typeof meta.mailbox_body === 'string' ? meta.mailbox_body : '',
                            pool,
                            keyReqs,
                        });
                        if (detail.turnId !== undefined) {
                            setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
                        }
                        localStorage.removeItem(`ss_pending_gacha_create_${gameId}`);
                        setGachaSheetOpen(true);
                    }
                    catch { /* ignore parse errors */ }
                })();
            }
        }
        // auto-open equipment slot create sheet from LLM navigation (data stored in localStorage)
        if (tab === "equipments" && searchParams.get("create") === "1") {
            const pendingEquipRaw = safeGetItem(`ss_pending_equipment_slot_create_${gameId}`);
            if (pendingEquipRaw) {
                try {
                    const detail = JSON.parse(pendingEquipRaw);
                    localStorage.removeItem(`ss_pending_equipment_slot_create_${gameId}`);
                    window.dispatchEvent(new CustomEvent('ss:open-create-equipment-slot', { detail }));
                }
                catch { /* ignore parse errors */ }
            }
        }
        // auto-open equipment slot edit sheet from LLM navigation (data stored in localStorage)
        if (tab === "equipments" && searchParams.get("editFromLLM") === "1") {
            const pendingEditRaw = safeGetItem(`ss_pending_equipment_slot_edit_${gameId}`);
            if (pendingEditRaw) {
                try {
                    const detail = JSON.parse(pendingEditRaw);
                    localStorage.removeItem(`ss_pending_equipment_slot_edit_${gameId}`);
                    window.dispatchEvent(new CustomEvent('ss:open-edit-equipment-slot', { detail }));
                }
                catch { /* ignore parse errors */ }
            }
        }
        // auto-open gacha edit sheet from LLM navigation (data stored in localStorage)
        if (tab === "gacha" && searchParams.get("editFromLLM") === "1") {
            const pendingRaw = safeGetItem(`ss_pending_gacha_edit_${gameId}`);
            if (pendingRaw) {
                void (async () => {
                    try {
                        const detail = JSON.parse(pendingRaw);
                        const existingPack = detail.existingPack as GachaPack | undefined;
                        if (existingPack) {
                            const llmData = (detail.llmData ?? {}) as Record<string, unknown>;
                            const rawPool = Array.isArray(llmData.item_pool) && llmData.item_pool.length > 0
                                ? llmData.item_pool.map((r: GachaLLMRow) => ({
                                    item_definition_id: String(r.item_definition_id ?? ''),
                                    weight: String(r.weight ?? 1),
                                    quantity_min: String(r.quantity_min ?? 1),
                                    quantity_max: String(r.quantity_max ?? 1),
                                }))
                                : existingPack.item_pool.map((r) => ({
                                    item_definition_id: r.item_definition_id,
                                    weight: String(r.weight),
                                    quantity_min: String(r.quantity_min),
                                    quantity_max: String(r.quantity_max),
                                }));
                            const rawKeyReqs = Array.isArray(llmData.key_requirements) && llmData.key_requirements.length > 0
                                ? llmData.key_requirements.map((r: GachaLLMRow) => ({
                                    item_definition_id: String(r.item_definition_id ?? ''),
                                    quantity: String(r.quantity ?? 1),
                                }))
                                : (existingPack.key_requirements ?? []).map((r) => ({
                                    item_definition_id: r.item_definition_id,
                                    quantity: String(r.quantity),
                                }));
                            const allRawIds = [
                                ...rawPool.map((r: PoolRow) => r.item_definition_id),
                                ...rawKeyReqs.map((r: KeyReqRow) => r.item_definition_id),
                            ];
                            const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
                            const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                            const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                            const existingMeta = (existingPack.metadata ?? {}) as Record<string, unknown>;
                            const llmMeta = (llmData.metadata && typeof llmData.metadata === 'object' && !Array.isArray(llmData.metadata))
                                ? llmData.metadata as Record<string, unknown>
                                : existingMeta;
                            setEditingPack(existingPack);
                            setGachaForm({
                                name: typeof llmData.name === 'string' && llmData.name.trim() ? llmData.name : existingPack.name,
                                code_name: existingPack.code_name ?? '',
                                collect_destination: llmData.collect_destination === 'inventory' || llmData.collect_destination === 'mailbox'
                                    ? llmData.collect_destination
                                    : existingPack.collect_destination ?? 'mailbox',
                                is_enabled: existingPack.is_enabled,
                                mailbox_title: typeof llmMeta.mailbox_title === 'string' ? llmMeta.mailbox_title : '',
                                mailbox_body: typeof llmMeta.mailbox_body === 'string' ? llmMeta.mailbox_body : '',
                                pool,
                                keyReqs,
                            });
                            if (detail.turnId !== undefined) {
                                setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
                            }
                            localStorage.removeItem(`ss_pending_gacha_edit_${gameId}`);
                            suppressGachaAutoOpenRef.current = true;
                            const newParams = new URLSearchParams(searchParams.toString());
                            newParams.delete('editFromLLM');
                            newParams.set('editPack', existingPack.id);
                            router.replace(`${window.location.pathname}?${newParams.toString()}`);
                            setGachaSheetOpen(true);
                        }
                    }
                    catch { /* ignore parse errors */ }
                })();
            }
        }
    }, [searchParams, gameId, presetDefs, containerDefs, router, toast, t]);
    // update URL when tab changes
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`${window.location.pathname}?tab=${value}`);
    };
    const handleContainerSubTabChange = (value: string) => {
        const v = value as "definitions" | "slot-guide";
        setContainerSubTab(v);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("csubtab", v);
        router.replace(`${window.location.pathname}?${newParams.toString()}`);
    };
    // debounce name filter
    useEffect(() => {
        const t = setTimeout(() => setDebouncedName(searchName), 300);
        return () => clearTimeout(t);
    }, [searchName]);
    // debounce container search
    useEffect(() => {
        const t = setTimeout(() => setContainerSearchDebounced(containerSearch), 250);
        return () => clearTimeout(t);
    }, [containerSearch]);
    // debounce gacha search
    useEffect(() => {
        const t = setTimeout(() => setGachaSearchDebounced(gachaSearch), 250);
        return () => clearTimeout(t);
    }, [gachaSearch]);
    // debounce preset search
    useEffect(() => {
        const t = setTimeout(() => setPresetSearchDebounced(presetSearch), 250);
        return () => clearTimeout(t);
    }, [presetSearch]);
    // sync container search to URL
    useEffect(() => {
        if (activeTab === 'gacha')
            return;
        const newParams = new URLSearchParams(searchParams.toString());
        if (containerSearchDebounced) {
            newParams.set("q", containerSearchDebounced);
        }
        else {
            newParams.delete("q");
        }
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [containerSearchDebounced]); // eslint-disable-line react-hooks/exhaustive-deps
    // sync gacha search to URL
    useEffect(() => {
        if (activeTab !== 'gacha')
            return;
        const newParams = new URLSearchParams(searchParams.toString());
        if (gachaSearchDebounced) {
            newParams.set("q", gachaSearchDebounced);
        }
        else {
            newParams.delete("q");
        }
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [gachaSearchDebounced]); // eslint-disable-line react-hooks/exhaustive-deps
    // fetch categories, rarities & tags from API on mount
    useEffect(() => {
        Promise.all([fetchItemCategories(), fetchItemRarities()])
            .then(([cats, rars]) => { setCategories(cats); setRarities(rars); })
            .catch(() => { });
    }, []);
    useEffect(() => {
        if (!gameId)
            return;
        listItemTags({ gameId }, { limit: 200, offset: 0 })
            .then((res) => setItemTags(res.tags ?? []))
            .catch(() => { });
    }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
    const {
        loadGameInfo,
        fetchItems,
        handleUpdateItemField,
        handleLinkItemToConversation,
        totalPages,
        currentPage,
    } = useItemsCataloguePage({
        gameId,
        limit: LIMIT,
        total,
        offset,
        filterCategory,
        filterRarity,
        debouncedName,
        selectedTagKeys,
        filterAllowClientUpdateQty,
        convActiveId,
        t,
        toast,
        setGameName,
        setStudioId,
        setMaxItems,
        setItemUsage,
        setGameLimits,
        setMaxEquipmentSlots,
        setEquipmentSlotsUsage,
        setLoading,
        setError,
        setItems,
        setTotal,
        setOffset,
        setUpdatingItemId,
        setConvActiveId,
        setLinkingItemId,
        setCategories,
        setRarities,
        setItemTags,
    });
    // Content linking helpers
    // Link a preset definition to the active (or a newly created) conversation
    async function handleLinkPresetToConversation(def: PresetDefinition) {
        setLinkingPresetId(def.id);
        try {
            let convId: string | null = convActiveId;
            if (!convId) {
                const newConv = await createConversation(gameId, {
                    title: `Preset: ${def.name}`,
                    goal: t('items.linkToConvGoal').replace('{name}', def.name),
                });
                convId = newConv.ID;
            }
            safeSetItem(`ss_conv_active_${gameId}`, convId);
            setConvActiveId(convId);
            await linkConversationContent(gameId, convId, 'preset_definition', def.id);
            window.dispatchEvent(new CustomEvent('ss:conv-external-created', { detail: { convId, gameId } }));
            window.dispatchEvent(new CustomEvent('ss:conv-content-linked', { detail: { convId, gameId, contentType: 'preset_definition', contentId: def.id, contentName: def.name } }));
            toast({ title: t('items.linkToConvSuccess'), description: def.name });
        }
        catch (err: unknown) {
            toast({
                variant: 'destructive',
                title: t('items.linkToConvFailed'),
                description: err instanceof Error ? err.message : undefined,
            });
        }
        finally {
            setLinkingPresetId(null);
        }
    }
    const {
        fetchContainerDefs,
        handleLinkContainerToConversation,
        handleDeleteContainer,
        filteredContainerDefs,
        containerTotalPages,
        containerCurrentPage,
        getItemName,
        handleContainerRowClick,
        handleUpdateContainerField,
        handleSaveInlineEdit,
    } = useContainerPage({
        gameId,
        activeTab,
        containerLimit: CONTAINER_LIMIT,
        containerOffset,
        containerTotal,
        containerDefs,
        containerSearchDebounced,
        containerAllItems,
        items,
        expandedContainerId,
        containerDetailCache,
        deletingContainer,
        editingField,
        editValue,
        editValue2,
        metadataRows,
        convActiveId,
        t,
        toast,
        loadGameInfo,
        setContainerLoading,
        setContainerError,
        setContainerDefs,
        setContainerTotal,
        setContainerAllItems,
        setContainerTypeOptions,
        setDeleteContainerLoading,
        setDeletingContainer,
        setExpandedContainerId,
        setEditingField,
        setMetadataRows,
        setContainerDetailLoading,
        setContainerDetailCache,
        setUpdatingContainerId,
        setConvActiveId,
        setLinkingContainerId,
    });
    const {
        fetchGachaData,
        filteredGachaPacks,
        gachaCloseSheet,
        gachaOpenCreate,
        gachaOpenEdit,
        handleGachaSave,
        handleGachaToggle,
        handleGachaDelete,
        gachaItemShortName,
    } = useGachaPage({
        gameId,
        activeTab,
        searchParams,
        router,
        gachaLoading,
        gachaPacks,
        gachaAllItems,
        gachaSheetOpen,
        gachaForm,
        editingPack,
        deletingPack,
        gachaSearchDebounced,
        createGachaConvContext,
        suppressGachaAutoOpenRef,
        t,
        toast,
        loadGameInfo,
        emptyGachaForm,
        resolveGachaRef,
        emptyRow: EMPTY_ROW,
        emptyKeyRow: EMPTY_KEY_ROW,
        setGachaLoading,
        setGachaError,
        setGachaPacks,
        setGachaAllItems,
        setGachaSheetOpen,
        setEditingPack,
        setGachaForm,
        setFormSaving,
        setDeletePackLoading,
        setDeletingPack,
        setTogglingId,
        setCreateGachaConvContext,
    });
    // Preset definitions
    const fetchPresetDefs = useCallback(async () => {
        if (!gameId)
            return;
        setPresetLoading(true);
        setPresetError(null);
        try {
            const result = await listPresetDefinitions({ gameId });
            setPresetDefs(result.definitions ?? []);
        }
        catch (err: any) {
            setPresetError(err?.message ?? 'Failed to load preset definitions');
        }
        finally {
            setPresetLoading(false);
        }
    }, [gameId]);
    useEffect(() => {
        if (activeTab === 'preset') {
            fetchPresetDefs();
        }
    }, [activeTab, fetchPresetDefs]);
    const filteredPresetDefs = presetSearchDebounced
        ? presetDefs.filter((d) => d.name.toLowerCase().includes(presetSearchDebounced.toLowerCase()) ||
            d.preset_type.toLowerCase().includes(presetSearchDebounced.toLowerCase()) ||
            d.id.toLowerCase().includes(presetSearchDebounced.toLowerCase()))
        : presetDefs;
    return (<div id="game-items-page" className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{t('items.itemsContainers')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:justify-between md:items-center md:gap-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.push(`/games/${gameId}`)}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
              {t('items.itemCatalogue')}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 flex-wrap text-sm">
              {maxItems != null
            ? (() => {
                const used = itemUsage ?? total;
                return <>
                    <span className={used >= maxItems ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {maxItems.toLocaleString()} {t('items.itemsUnit')}
                    </span>
                    <span className="inline-block h-1.5 w-20 shrink-0 rounded-full bg-muted overflow-hidden align-middle sm:w-24">
                      <span className={`block h-full rounded-full transition-all ${used >= maxItems ? "bg-destructive" : used / maxItems >= 0.8 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min((used / maxItems) * 100, 100)}%` }}/>
                    </span>
                    <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0" title="Manage plugins / raise limits">
                      <Hammer className="h-3.5 w-3.5"/>
                    </Link>
                  </>;
            })()
            : total > 0 ? `${total} ${t('items.itemsDefined')}` : t('items.noItemsYet')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="items"/>
        </div>
      </div>

      {/* Tabs */}
      <Tabs id="game-items-tabs" value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
            <TabsList className="w-auto inline-flex">
              {ITEMS_TABS.map(({ key, icon: Icon, labelKey }) => (<TabsTrigger key={key} value={key} className="whitespace-nowrap">
                  <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0"/>{t(labelKey)}
                </TabsTrigger>))}
            </TabsList>
          </div>

        <TabsContent value="crafting" className="space-y-4">
          <CraftingTab gameId={gameId} studioId={studioId}/>
        </TabsContent>

        <TabsContent value="catalogue" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.itemDefinitions')}</h2>
              <p className="text-sm text-muted-foreground">
                {total > 0 ? `${total.toLocaleString()} ${t('items.itemsDefined')}` : t('items.noItemsYet')}
              </p>
            </div>
            <div id="items-catalogue-toolbar-controls" className="flex flex-col items-end gap-2">
              <div id="items-catalogue-toolbar-primary-row" className="flex items-center gap-2 flex-wrap justify-end">
                {/* Clear all */}
                {(searchName || filterCategory !== "all" || filterRarity !== "all" || filterAllowClientUpdateQty !== "all" || selectedTagKeys.length > 0) && (<button id="items-catalogue-clear-filters-btn" className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => { setSearchName(""); setFilterCategory("all"); setFilterRarity("all"); setFilterAllowClientUpdateQty("all"); setSelectedTagKeys([]); }}>
                    Clear
                  </button>)}
                {/* Catalogue search */}
                <div id="items-catalogue-search-controls" className="relative">
                <div id="items-catalogue-search-input-wrap" className="relative">
                  <Search id="items-catalogue-search-input-icon" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                  <input id="items-catalogue-search-input" type="text" placeholder={t('items.searchByNameIdOrCode')} value={searchName} onChange={(e) => setSearchName(e.target.value)} className="h-8 w-[400px] rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"/>
                  {searchName && (<button id="items-catalogue-search-clear-btn" type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchName("")}>
                    <X id="items-catalogue-search-clear-icon" className="h-3.5 w-3.5"/>
                  </button>)}
                </div>
                </div>
                <Button id="items-catalogue-refresh-btn" variant="outline" size="icon" className="h-8 w-8" onClick={fetchItems} disabled={loading} title="Refresh">
                  <RefreshCw id="items-catalogue-refresh-icon" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
                </Button>
                <Button id="items-catalogue-new-item-btn" size="sm" className="h-8" onClick={() => setShowCreate(true)}>
                  <Plus id="items-catalogue-new-item-icon" className="h-4 w-4 mr-1"/>
                  {t('items.newItem')}
                </Button>
              </div>
              <div id="items-catalogue-toolbar-filter-row" className="flex items-center gap-2 flex-wrap justify-end">
                {/* Category */}
                <select id="items-catalogue-category-filter" className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">{t('items.allCategories')}</option>
                  {categories.map((c) => (<option key={c} value={c}>{prettyCategory(c)}</option>))}
                </select>
                {/* Rarity */}
                <select id="items-catalogue-rarity-filter" className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize" value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)}>
                  <option value="all">{t('items.allRarities')}</option>
                  {rarities.map((r) => (<option key={r} value={r} className="capitalize">{r}</option>))}
                </select>
                {/* Allow Client Update Qty */}
                <select id="items-catalogue-qty-filter" className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={filterAllowClientUpdateQty} onChange={(e) => setFilterAllowClientUpdateQty(e.target.value)}>
                  <option value="all">{t('items.allQtyPermissions')}</option>
                  <option value="true">{t('items.canUpdateQty')}</option>
                  <option value="false">{t('items.cannotUpdateQty')}</option>
                </select>
                {/* Tags filter */}
                {itemTags.length > 0 && (<Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5">
                        <Tag className="h-3.5 w-3.5"/>
                        {t('items.tabTags')}
                        {selectedTagKeys.length > 0 && (<span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold">
                            {selectedTagKeys.length}
                          </span>)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('items.searchTagsIn')}/>
                        <CommandList>
                          <CommandEmpty>{t('items.noTagsFound')}</CommandEmpty>
                          <CommandGroup>
                            {itemTags.map((tag) => {
                const active = selectedTagKeys.includes(tag.tag_key);
                return (<CommandItem key={tag.tag_key} value={tag.label || tag.tag_key} onSelect={() => {
                        setSelectedTagKeys((prev) => active ? prev.filter((k) => k !== tag.tag_key) : [...prev, tag.tag_key]);
                    }}>
                                <span className="mr-2 h-3 w-3 shrink-0 rounded-full border" style={{ background: tag.color ?? "#A855F7", borderColor: tag.color ?? "#A855F7" }}/>
                                <span className="flex-1 truncate">{tag.label || tag.tag_key}</span>
                                {active && <Check className="h-3.5 w-3.5 ml-1 shrink-0"/>}
                              </CommandItem>);
            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>)}
              </div>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : error ? (<div className="p-6 text-center text-destructive">{error}</div>) : items.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">{t('items.noItemsFound')}</p>
                  <p className="text-sm mt-1">
                    {(filterCategory !== "all" || filterRarity !== "all" || debouncedName || selectedTagKeys.length > 0)
                ? t('items.noItemsDesc')
                : t('items.noItemsNewDesc')}
                  </p>
                </div>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      {convPanelOpen && <TableHead id="items-table-header-link-conv" className="text-center w-10"/>}
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.itemCode')}</TableHead>
                      <TableHead className="text-center">{t('items.category')}</TableHead>
                      <TableHead className="text-center">{t('items.rarity')}</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('items.writePropsHeader')}</span>
                          <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExplanationTopic('write_props');
                setShowExplanationPanel(true);
            }} title="Learn more about Write Props">
                            <span className="text-[10px] font-bold">?</span>
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('items.updateQtyHeader')}</span>
                          <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExplanationTopic('update_qty');
                setShowExplanationPanel(true);
            }} title="Learn more about Update Qty">
                            <span className="text-[10px] font-bold">?</span>
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">{t('items.stackable')}</TableHead>
                      {!convPanelOpen && <TableHead className="text-center">{t('items.gridHeader')}</TableHead>}
                      {!convPanelOpen && <TableHead className="text-center">{t('items.actionsHeader')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (<TableRow key={item.id} className="hover:bg-muted/40">
                        {convPanelOpen && (<TableCell id={`items-row-${item.id}-link-conv-cell`} className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button id={`items-row-${item.id}-link-conv-btn`} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-500" disabled={linkingItemId === item.id} onClick={() => handleLinkItemToConversation(item)}>
                                    {linkingItemId === item.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        : (<span id={`items-row-${item.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                          <Bot className="h-3.5 w-3.5"/>
                                          <Plus className="h-2.5 w-2.5 stroke-[3]"/>
                                        </span>)}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent id={`items-row-${item.id}-link-conv-tooltip`} side="top">
                                  {t('items.linkToConv')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>)}
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <Link href={`/games/${gameId}/items/${item.id}`} className="hover:text-primary hover:underline font-medium">
                              {item.name}
                            </Link>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-muted-foreground">{item.id}</span>
                              <CopyButton text={item.id} size="h-3 w-3"/>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.item_code ? (<div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
                              <CopyButton text={item.item_code} size="h-3 w-3"/>
                            </div>) : (<span className="text-muted-foreground text-xs">—</span>)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs w-fit mx-auto">
                            {prettyCategory(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <RarityBadge rarity={item.rarity}/>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center cursor-pointer hover:opacity-80" onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateItemField(item.id, { client_writable: !item.client_writable });
                }}>
                            <span className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${updatingItemId === item.id ? 'opacity-50' : ''} ${item.client_writable ? 'bg-green-100 border-green-300' : 'bg-muted border-muted-foreground'}`}>
                              <span className={`h-5 w-5 rounded-full transition-all ${item.client_writable ? 'ml-auto bg-green-500' : 'bg-muted-foreground'}`}/>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center cursor-pointer hover:opacity-80" onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateItemField(item.id, { allow_client_update_qty: !item.allow_client_update_qty });
                }}>
                            <span className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${updatingItemId === item.id ? 'opacity-50' : ''} ${item.allow_client_update_qty ? 'bg-blue-100 border-blue-300' : 'bg-muted border-muted-foreground'}`}>
                              <span className={`h-5 w-5 rounded-full transition-all ${item.allow_client_update_qty ? 'ml-auto bg-blue-500' : 'bg-muted-foreground'}`}/>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_stackable ? (<span className="text-green-500 text-sm font-medium">
                              {t('common.yes')} {item.max_stack_size != null ? item.max_stack_size.toLocaleString() : ""}
                            </span>) : (<span className="text-muted-foreground text-sm">{t('common.no')}</span>)}
                        </TableCell>
                        {!convPanelOpen && (<TableCell className="text-center text-sm text-muted-foreground">
                            {item.grid_width} × {item.grid_height}
                          </TableCell>)}
                        {!convPanelOpen && (<TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" asChild title="Edit">
                                  <Link href={`/games/${gameId}/items/${item.id}`}>
                                    <Pencil className="h-4 w-4"/>
                                  </Link>
                                </Button>
                            </div>
                          </TableCell>)}
                      </TableRow>))}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (<div className="flex items-center justify-between gap-3 mt-4 text-sm text-muted-foreground flex-wrap">
              <span>
                Page {currentPage} of {totalPages} - {total} items
              </span>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
                  {t('common.previous')}
                </Button>
                <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
                  {t('common.next')}
                </Button>
              </div>
            </div>)}
        </TabsContent>

        <TabsContent value="containers" className="space-y-4">
          <Tabs value={containerSubTab} onValueChange={handleContainerSubTabChange} className="space-y-4">
            <div className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
              <TabsList className="w-auto inline-flex">
                <TabsTrigger value="definitions" className="whitespace-nowrap">{t('items.subTabDefinitions')}</TabsTrigger>
                <TabsTrigger value="slot-guide" className="whitespace-nowrap">{t('items.subTabSlotGuide')}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="slot-guide" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary"/>
                    {t('items.containerSlotGuideTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('items.containerSlotGuideDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">

                  {/* Overview */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t('items.containerSlotOverviewTitle')}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t('items.containerSlotOverviewText')}
                    </p>
                  </div>

                  <Separator />

                  {/* Diagram */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">{t('items.containerSlotDiagramTitle')}</h3>
                    <div className="border rounded-md p-4 bg-muted/20 overflow-x-auto">
                      <MermaidDiagram chart={(isDark) => `flowchart TB
  subgraph SETUP["SETUP - Definitions"]
    direction LR
    A["ItemDefinition\ncategory: character\nitem_code: warrior\nid: uuid-warrior-def"]
    M["Slot Restrictions\nslot_0: helmet\nslot_1: armor\nslot_2: boots\nslot_3: gloves\nslot_4: weapon\nslot_5: shield"]
    B["ContainerDefinition\nname: hero_warrior_slots\ntype: equipment\ngrid: 6x1\nlinked_item_def_id: ItemDefinition"]
    A -- "linked_item_definition_id" --> B
    B -. "reverse lookup" .-> A
    M -. "attached metadata" .-> B
  end

  subgraph RUNTIME["RUNTIME - Instances"]
    direction LR
    C["InventoryItem\nid: uuid-my-warrior\nitem_definition_id:\n  uuid-warrior-def"]
    D["ContainerInstance\nitem_container_definition_id:\n  hero_warrior_slots\nowner_user_id: player-uuid\nslots: [0][1][2][3][4][5]"]
    E["InventoryItem\nitem: sword\ncontainer_id: D\ngrid_x: 4  grid_y: 0"]
    C -- "grant -> auto-creates" --> D
    D -. "owner_user_id (not item id)" .-> C
    E -- "POST /inventory/move -> slot 4" --> D
  end

  style A fill:${isDark ? "#1e3a5f" : "#eff6ff"},stroke:${isDark ? "#60a5fa" : "#93c5fd"},color:${isDark ? "#bfdbfe" : "#1e40af"}
  style B fill:${isDark ? "#431407" : "#fff7ed"},stroke:${isDark ? "#f97316" : "#fb923c"},color:${isDark ? "#fed7aa" : "#9a3412"}
  style M fill:${isDark ? "#1e293b" : "#f8fafc"},stroke:${isDark ? "#475569" : "#cbd5e1"},stroke-dasharray:4,color:${isDark ? "#94a3b8" : "#64748b"}
  style C fill:${isDark ? "#052e16" : "#f0fdf4"},stroke:${isDark ? "#4ade80" : "#86efac"},color:${isDark ? "#bbf7d0" : "#166534"}
  style D fill:${isDark ? "#422006" : "#fef9c3"},stroke:${isDark ? "#f59e0b" : "#fbbf24"},color:${isDark ? "#fde68a" : "#92400e"}
  style E fill:${isDark ? "#2e1065" : "#faf5ff"},stroke:${isDark ? "#a855f7" : "#c4b5fd"},color:${isDark ? "#e9d5ff" : "#6b21a8"}
  style SETUP fill:${isDark ? "#1c1c1e" : "#f8fafc"},stroke:${isDark ? "#374151" : "#e2e8f0"}
  style RUNTIME fill:${isDark ? "#1c1c1e" : "#f8fafc"},stroke:${isDark ? "#374151" : "#e2e8f0"}`} className="[&_svg]:max-w-full [&_svg]:h-auto"/>
                      <p className="text-xs text-muted-foreground text-center mt-2 italic">{t('items.containerSlotDiagramCaption')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 1 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                      {t('items.containerSlotStep1Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7">{t('items.containerSlotStep1Desc')}</p>
                    <div className="pl-7 space-y-2">
                      <div className="rounded-md border bg-muted/40 p-3 space-y-1.5 font-mono text-xs">
                        <div><span className="text-muted-foreground">name:</span> <span>"hero_warrior_slots"</span></div>
                        <div><span className="text-muted-foreground">container_type:</span> <span>"equipment"</span></div>
                        <div><span className="text-muted-foreground">grid_cols:</span> <span>6</span></div>
                        <div><span className="text-muted-foreground">grid_rows:</span> <span>1</span></div>
                        <div><span className="text-muted-foreground">is_portable:</span> <span>false</span></div>
                        <div><span className="text-muted-foreground">linked_item_definition_id:</span> <span>"&lt;hero_item_def_id&gt;"</span></div>
                      </div>
                      <p className="text-muted-foreground text-xs">{t('items.containerSlotStep1Note')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 2 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                      {t('items.containerSlotStep2Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7 leading-relaxed">{t('items.containerSlotStep2Desc')}</p>
                  </div>

                  <Separator />

                  {/* Step 3 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                      {t('items.containerSlotStep3Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7">{t('items.containerSlotStep3Desc')}</p>
                    <div className="pl-7 space-y-2">
                      <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1.5">
                        <div><span className="text-muted-foreground">"slot_0_allowed_tags":</span> <span>"helmet"</span></div>
                        <div><span className="text-muted-foreground">"slot_1_allowed_tags":</span> <span>"armor"</span></div>
                        <div><span className="text-muted-foreground">"slot_2_allowed_tags":</span> <span>"boots"</span></div>
                        <div><span className="text-muted-foreground">"slot_3_allowed_tags":</span> <span>"gloves"</span></div>
                        <div><span className="text-muted-foreground">"slot_4_allowed_tags":</span> <span>"weapon,sword,axe"</span></div>
                        <div><span className="text-muted-foreground">"slot_5_allowed_tags":</span> <span>"shield,offhand"</span></div>
                      </div>
                      <p className="text-muted-foreground text-xs">{t('items.containerSlotStep3Note')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 4 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">4</span>
                      {t('items.containerSlotStep4Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7 leading-relaxed">{t('items.containerSlotStep4Desc')}</p>
                    <ul className="pl-7 list-disc list-inside text-muted-foreground space-y-1 text-xs">
                      <li><code className="bg-muted px-1 rounded">owner_user_id</code> - {t('items.containerSlotStep4Bullet1')}</li>
                      <li><code className="bg-muted px-1 rounded">item_container_definition_id</code> - {t('items.containerSlotStep4Bullet2')}</li>
                      <li>{t('items.containerSlotStep4Bullet3')}</li>
                    </ul>
                  </div>

                  <Separator />

                  {/* Step 5 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">5</span>
                      {t('items.containerSlotStep5Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7 leading-relaxed">{t('items.containerSlotStep5Desc')}</p>
                    <div className="pl-7 space-y-2">
                      <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1">
                        <div className="text-muted-foreground font-sans text-[11px] mb-2">// POST /inventory/move - Equip vao slot 4 (weapon)</div>
                        <div><span className="text-muted-foreground">item_id:</span> <span>&lt;item_id_for_equip&gt;</span></div>
                        <div><span className="text-muted-foreground">target_container_id:</span> <span>&lt;hero_equipment_container_id&gt;</span></div>
                        <div><span className="text-muted-foreground">grid_x:</span> <span>4</span></div>
                        <div><span className="text-muted-foreground">grid_y:</span> <span>0</span></div>
                      </div>
                      <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1">
                        <div className="text-muted-foreground font-sans text-[11px] mb-2">// POST /inventory/move - Unequip (ve main inventory)</div>
                        <div><span className="text-muted-foreground">item_id:</span> <span>&lt;item_id_for_unequip&gt;</span></div>
                        <div><span className="text-muted-foreground">target_container_id:</span> <span>&lt;player_main_inventory_container_id&gt;</span></div>
                        <div className="text-muted-foreground font-sans text-[11px] mt-1">// grid_x/grid_y optional - server tu tim vi tri trong</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Summary table */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t('items.containerSlotCompareTitle')}</h3>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">{t('items.containerSlotCompareCriteria')}</TableHead>
                            <TableHead className="text-xs">{t('items.containerSlotCompareEqSlotDef')}</TableHead>
                            <TableHead className="text-xs">{t('items.containerSlotCompareContainer')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareScope')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotScopeEq')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotScopeContainer')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareMultiHero')}</TableCell>
                            <TableCell className="text-xs text-destructive">{t('items.containerSlotMultiHeroEq')}</TableCell>
                            <TableCell className="text-xs text-amber-600 font-medium">{t('items.containerSlotMultiHeroContainer')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareRestrictions')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotRestrictEq')}</TableCell>
                            <TableCell className="text-xs text-green-600 font-medium">{t('items.containerSlotRestrictContainer')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareAutoCreate')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotAutoEq')}</TableCell>
                            <TableCell className="text-xs text-green-600 font-medium">{t('items.containerSlotAutoContainer')}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        <TabsContent value="definitions" className="space-y-4">
          <ItemsPageContainerSection
            t={t}
            gameId={gameId}
            convPanelOpen={convPanelOpen}
            containerTotal={containerTotal}
            containerSearch={containerSearch}
            containerSearchDebounced={containerSearchDebounced}
            filteredContainerDefs={filteredContainerDefs}
            containerLoading={containerLoading}
            containerError={containerError}
            linkingContainerId={linkingContainerId}
            expandedContainerId={expandedContainerId}
            containerDetailCache={containerDetailCache}
            containerDetailLoading={containerDetailLoading}
            editingField={editingField}
            editValue={editValue}
            editValue2={editValue2}
            containerItemsOnly={containerItemsOnly}
            containerAllItems={containerAllItems}
            metadataRows={metadataRows}
            containerTotalPages={containerTotalPages}
            containerCurrentPage={containerCurrentPage}
            containerOffset={containerOffset}
            containerLimit={CONTAINER_LIMIT}
            setContainerSearch={setContainerSearch}
            setShowCreateContainer={setShowCreateContainer}
            setDeletingContainer={setDeletingContainer}
            setEditingField={setEditingField}
            setEditValue={setEditValue}
            setEditValue2={setEditValue2}
            setContainerItemsOnly={setContainerItemsOnly}
            setMetadataRows={setMetadataRows}
            setContainerOffset={setContainerOffset}
            fetchContainerDefs={fetchContainerDefs}
            handleLinkContainerToConversation={handleLinkContainerToConversation}
            handleContainerRowClick={handleContainerRowClick}
            getItemName={getItemName}
            handleSaveInlineEdit={handleSaveInlineEdit}
            handleUpdateContainerField={handleUpdateContainerField}
          />
          </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="gacha" className="space-y-4">
          <ItemsPageGachaSection
            gameId={gameId}
            gachaPacks={gachaPacks}
            filteredGachaPacks={filteredGachaPacks}
            gachaAllItems={gachaAllItems}
            gachaLoading={gachaLoading}
            gachaError={gachaError}
            gameLimits={gameLimits}
            gachaSearch={gachaSearch}
            setGachaSearch={setGachaSearch}
            expandedPack={expandedPack}
            setExpandedPack={setExpandedPack}
            togglingId={togglingId}
            setDeletingPack={setDeletingPack}
            fetchGachaData={fetchGachaData}
            gachaOpenCreate={gachaOpenCreate}
            gachaOpenEdit={gachaOpenEdit}
            handleGachaToggle={handleGachaToggle}
            gachaItemShortName={gachaItemShortName}
          />
        </TabsContent>
        {/* Generators tab */}
        <TabsContent value="generators" className="space-y-4">
          <ItemsPageGeneratorSection studioId={studioId} gameId={gameId} generatorItems={generatorItems} setGeneratorItems={setGeneratorItems} generatorLoading={generatorLoading} setGeneratorLoading={setGeneratorLoading} generatorError={generatorError} setGeneratorError={setGeneratorError} activeTab={activeTab} refreshKey={generatorRefreshKey} onAddGenerator={() => {
            setCreateInitCategory("generator" as ItemCategory);
            setShowCreate(true);
        }}/>
        </TabsContent>
        {/* Equipments tab */}
        <TabsContent value="equipments" className="space-y-4">
          <EquipmentsTab gameId={gameId} slots={equipmentSlots} setSlots={setEquipmentSlots} loading={equipmentLoading} setLoading={setEquipmentLoading} error={equipmentError} setError={setEquipmentError} activeTab={activeTab} maxEquipmentSlots={maxEquipmentSlots} equipmentSlotsUsage={equipmentSlotsUsage} onLoadGameInfo={loadGameInfo}/>
        </TabsContent>
        {/* Tags tab */}
        <TabsContent value="tags" className="space-y-4">
          <ItemsPageTagsSection
            gameId={gameId}
            tags={itemTags}
            setTags={setItemTags}
            loading={tagsLoading}
            setLoading={setTagsLoading}
            error={tagsError}
            setError={setTagsError}
            activeTab={activeTab}
          />
        </TabsContent>
        <TabsContent value="preset" className="space-y-4">
          <ItemsPagePresetsSection
            t={t}
            convPanelOpen={convPanelOpen}
            linkingPresetId={linkingPresetId}
            presetDefs={presetDefs}
            presetSearch={presetSearch}
            presetSearchDebounced={presetSearchDebounced}
            filteredPresetDefs={filteredPresetDefs}
            presetLoading={presetLoading}
            presetError={presetError}
            setPresetSearch={setPresetSearch}
            fetchPresetDefs={fetchPresetDefs}
            setShowCreatePreset={setShowCreatePreset}
            handleLinkPresetToConversation={handleLinkPresetToConversation}
            setEditingPreset={setEditingPreset}
            setDeletingPreset={setDeletingPreset}
          />
        </TabsContent>
      </Tabs>

      { /* Create Item Modal */ }
      <CreateItemDefinitionDialog
        open={showCreate}
        studioId={studioId}
        gameId={gameId}
        onCreated={(_id) => {
          fetchItems();
          loadGameInfo();
          if (activeTab === "generators")
            setGeneratorRefreshKey((k) => k + 1);
          if (activeTab === "gacha")
            fetchGachaData();
        }}
        onClose={() => {
          setShowCreate(false);
          setCreateInitCategory(undefined);
        }}
        categories={categories}
        rarities={rarities}
        initialCategory={createInitCategory}
      />
      { /* Create Container Definition Modal */ }
      <CreateContainerDefinitionDialog
        open={showCreateContainer}
        gameId={gameId}
        allItems={containerAllItems}
        containerTypeOptions={containerTypeOptions}
        initialValues={createContainerInitialValues}
        onCreated={(id) => {
          fetchContainerDefs();
          loadGameInfo();
          if (createContainerConvContext) {
            const { turnId, responseIdx, containerIdx } = createContainerConvContext;
            window.dispatchEvent(new CustomEvent('ss:container-created', { detail: { containerId: id, containerName: createContainerInitialValues?.name, containerCodeName: createContainerInitialValues?.code_name, turnId, responseIdx, containerIdx } }));
          }
        }}
        onClose={() => {
          setShowCreateContainer(false);
          setCreateContainerInitialValues(undefined);
          setCreateContainerConvContext(undefined);
        }}
      />
      {editingContainer && (
        <EditContainerDefinitionDialog
          open={!!editingContainer}
          gameId={gameId}
          definition={editingContainer}
          initialValues={editingContainerDraft}
          allItems={containerAllItems}
          onUpdated={(updated) => {
            fetchContainerDefs();
            loadGameInfo();
            if (editingContainerConvContext) {
              const { turnId, responseIdx, containerIdx } = editingContainerConvContext;
              window.dispatchEvent(new CustomEvent('ss:container-updated', {
                detail: {
                  containerId: updated.id,
                  containerName: updated.name,
                  containerCodeName: updated.code_name,
                  turnId,
                  responseIdx,
                  containerIdx,
                },
              }));
            }
          }}
          onClose={() => {
            setEditingContainer(null);
            setEditingContainerDraft(undefined);
            setEditingContainerConvContext(undefined);
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("editContainer");
            const nextQuery = newParams.toString();
            router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
          }}
        />
      )}
      {/* Delete Container Definition Confirmation */}
      {deletingContainer && (
        <Dialog open={!!deletingContainer} onOpenChange={(v) => {
          if (!v)
            setDeletingContainer(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('items.deleteContainerTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('items.deleteContainerConfirm')}{" "}
              <span className="font-semibold text-foreground">"{deletingContainer.name}"</span>?
              {t('items.cannotUndone')}
            </p>
            {deletingContainer.container_type === 'inventory' && (
              <p className="text-xs text-destructive mt-1">{t('items.systemContainerCannotDelete')}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={deleteContainerLoading}>{t('common.cancel')}</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteContainer} disabled={deleteContainerLoading || deletingContainer.container_type === 'inventory'}>
                {deleteContainerLoading ? t('items.deleting') : t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <GachaPackSheet
        open={gachaSheetOpen}
        editingPack={editingPack}
        gameId={gameId}
        gachaForm={gachaForm}
        setGachaForm={setGachaForm}
        formSaving={formSaving}
        gachaAllItems={gachaAllItems}
        onClose={gachaCloseSheet}
        onSave={handleGachaSave}
        onReloadItems={fetchGachaData}
        onCreateItem={(category) => {
          setCreateInitCategory(category);
          setShowCreate(true);
        }}
      />
      <DeleteGachaPackDialog pack={deletingPack} loading={deletePackLoading} onConfirm={handleGachaDelete} onClose={() => setDeletingPack(null)} />
      {/* Preset Create Sheet */}
      <CreatePresetDefinitionSheet open={showCreatePreset} gameId={gameId} initialValues={createPresetInitialValues} turnContext={createPresetTurnContext} onCreated={fetchPresetDefs} onClose={() => { setShowCreatePreset(false); setCreatePresetInitialValues(undefined); setCreatePresetTurnContext(null); }}/>
      {/* Preset Edit Sheet */}
      {editingPreset && (<EditPresetDefinitionSheet open={!!editingPreset} gameId={gameId} definition={editingPreset} onUpdated={fetchPresetDefs} onClose={() => setEditingPreset(null)}/>)}
      {/* Preset Delete Confirmation */}
      <AlertDialog open={!!deletingPreset} onOpenChange={(o) => {
        if (!o)
            setDeletingPreset(null);
    }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deletePreset')} "{deletingPreset?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deletePresetDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePresetLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={async () => {
        if (!deletingPreset)
            return;
        setDeletePresetLoading(true);
        try {
            await deletePresetDefinition({ gameId }, deletingPreset.id);
            toast({ title: t('items.presetDeleted') });
            setDeletingPreset(null);
            fetchPresetDefs();
        }
        catch (err: any) {
            if (err?.status === 403) {
                toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionDeletePreset') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setDeletePresetLoading(false);
        }
    }} disabled={deletePresetLoading}>
              {deletePresetLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ExplanationPanel open={showExplanationPanel} topic={explanationTopic} onOpenChange={setShowExplanationPanel} />
    </div>
  );
}

