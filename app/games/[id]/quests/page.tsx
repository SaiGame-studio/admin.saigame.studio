"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Plus, RefreshCw, Trash2, Pencil, ScrollText, Loader2, Clock, ArrowLeft, ChevronsUpDown, Check, Hammer, ExternalLink, Search, X, ChevronDown, ChevronRight, Wand2, Mail, Zap, } from "lucide-react";
import { toSlugUnderscore } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { listGachaPacks, listItemDefinitions } from "@/lib/inventory-api";
import type { GachaPack, ItemDefinition, Paginated } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { useEscapeLayer } from "@/hooks/use-escape-manager";
import { getGame } from "@/lib/game-api";
import { fetchStudioWithCache } from "@/lib/studio-api";
import { ApiError } from "@/lib/api-client";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/storage-utils";
import type { Studio } from "@/types/studio";
import { listQuestDefinitions, listQuestTypes, listQuestConditionTypes, createQuestDefinition, updateQuestDefinition, deleteQuestDefinition, isConditionLeaf, type QuestDefinition, type QuestType, type QuestReward, type QuestConditionLeaf, type QuestConditionGroup, type ItemRequirement, type CreateQuestDefinitionRequest, type UpdateQuestDefinitionRequest, type QuestConditionTypeOption, } from "@/lib/quest-api";
import { GameNavButtons } from "@/components/GameNavButtons";
import { useTranslation } from "@/lib/i18n/use-translation";
import { DailyTab } from "./DailyTab";
import { ChainTab } from "./ChainTab";
import { SettingsTab } from "./SettingsTab";
import { QuestDeliveryOverride } from "./QuestDeliveryOverride";
import {
    DEFAULT_QUEST_EXPIRATION_MINUTES,
    QuestExpirationSettings,
    QuestExpirationToggle,
} from "./QuestExpirationField";
import { stripQuestUiFields } from "./questPayloadUtils";
import { getQuestApiErrorMessage } from "./questApiErrorUtils";
import type { Game } from "@/types/game";
import { lsPendingQuestCreate, lsPendingQuestEdit } from "@/components/llm-conversations/conversation-panel-utils";
// ─── Tab config ────────────────────────────────────────────────────────────────
type TabValue = "definitions" | "chains" | "daily" | "battle-pass" | "world-quest" | "settings";
// Module-level cache so the same items?limit=200 request is only fired once per gameId
// across ConditionEditor, RewardEditor, and the DefinitionsTab row display.
const itemDefsCache = new Map<string, Promise<Paginated<ItemDefinition>>>();
function getItemDefsCached(gameId: string, limit = 200): Promise<Paginated<ItemDefinition>> {
    const key = `${gameId}:${limit}`;
    let p = itemDefsCache.get(key);
    if (!p) {
        p = listItemDefinitions({ gameId }, { limit }).catch((e) => {
            itemDefsCache.delete(key);
            throw e;
        });
        itemDefsCache.set(key, p);
    }
    return p;
}
function mergeItemDefs(base: ItemDefinition[], extra: ItemDefinition[]): ItemDefinition[] {
    const merged = new Map<string, ItemDefinition>();
    for (const def of base)
        merged.set(def.id, def);
    for (const def of extra) {
        if (!merged.has(def.id))
            merged.set(def.id, def);
    }
    return [...merged.values()];
}
const TABS: {
    value: TabValue;
    labelKey: string;
}[] = [
    { value: "definitions", labelKey: "quest.tabDefinitions" },
    { value: "chains", labelKey: "quest.tabChains" },
    { value: "daily", labelKey: "quest.tabDaily" },
    { value: "battle-pass", labelKey: "quest.tabBattlePass" },
    { value: "world-quest", labelKey: "quest.tabWorldQuest" },
    { value: "settings", labelKey: "quest.tabSettings" },
];
const VALID_TABS = new Set<string>(TABS.map((t) => t.value));
// ─── Constants ─────────────────────────────────────────────────────────────────
const QUEST_TYPES: {
    value: QuestType;
    labelKey: string;
    descKey: string;
}[] = [
    { value: "one_time", labelKey: "quest.typeOneTime", descKey: "quest.typeOneTimeDesc" },
    { value: "daily", labelKey: "quest.typeDaily", descKey: "quest.typeDailyDesc" },
    { value: "repeatable", labelKey: "quest.typeRepeatable", descKey: "quest.typeRepeatableDesc" },
    { value: "battle_pass_task", labelKey: "quest.typeBattlePassTask", descKey: "quest.typeBattlePassTaskDesc" },
    { value: "chain", labelKey: "quest.typeChain", descKey: "quest.typeChainDesc" },
];
const KNOWN_CONDITION_TYPES = [
    { value: "login", labelKey: "quest.condLogin", descKey: "quest.condLoginDesc" },
    { value: "collect_and_keep", labelKey: "quest.condCollectAndKeep", descKey: "quest.condCollectAndKeepDesc" },
    { value: "collect_and_submit", labelKey: "quest.condCollectAndSubmit", descKey: "quest.condCollectAndSubmitDesc" },
    { value: "collect_and_submit_all", labelKey: "quest.condCollectAndSubmitAll", descKey: "quest.condCollectAndSubmitAllDesc" },
    { value: "not_have_item", labelKey: "quest.condNotHaveItem", descKey: "quest.condNotHaveItemDesc" },
    { value: "gacha_opened", labelKey: "quest.condGachaOpened", descKey: "quest.condGachaOpenedDesc" },
];
const DEFAULT_CONDITIONS: QuestConditionGroup = { operator: "AND", clauses: [] };
type QuestDefinitionForm = CreateQuestDefinitionRequest & Pick<UpdateQuestDefinitionRequest, "sort_order">;
const DEFAULT_FORM: QuestDefinitionForm = {
    name: "",
    code_name: "",
    description: "",
    quest_type: "one_time",
    conditions: { operator: "AND", clauses: [] },
    is_active: true,
    sort_order: 0,
    rewards: [],
};
// ─── Helper ────────────────────────────────────────────────────────────────────
function questTypeBadgeVariant(type: QuestType) {
    switch (type) {
        case "one_time": return "default";
        case "daily": return "secondary";
        case "repeatable": return "outline";
        case "battle_pass_task": return "outline";
        case "chain": return "secondary";
        default: return "outline";
    }
}
// ─── Condition Editor ───────────────────────────────────────────────────────
interface ConditionEditorProps {
    conditions: QuestConditionGroup;
    onChange: (c: QuestConditionGroup) => void;
    gameId: string;
    prefetchedItemDefs?: ItemDefinition[];
}
function genClauseId(type: string) {
    const prefix: Record<string, string> = {
        login: "login",
        collect_and_keep: "hold",
        collect_and_submit: "submit",
        not_have_item: "nohave",
        gacha_opened: "gacha",
    };
    const p = prefix[type] ?? type.split("_")[0];
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${p}_${rand}`;
}
function newLeaf(): QuestConditionLeaf {
    return { clause_id: genClauseId("login"), type: "login", target: 1 };
}
function ConditionEditor({ conditions, onChange, gameId, prefetchedItemDefs = [] }: ConditionEditorProps) {
    const { t } = useTranslation();
    const [conditionTypes, setConditionTypes] = useState<QuestConditionTypeOption[]>([]);
    const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([]);
    const [gachaPacksLoading, setGachaPacksLoading] = useState(false);
    const [gachaPopoverOpen, setGachaPopoverOpen] = useState<number | null>(null);
    const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([]);
    const [itemDefsLoading, setItemDefsLoading] = useState(false);
    const [itemPopoverOpen, setItemPopoverOpen] = useState<{
        clause: number;
        item: number;
    } | null>(null);
    useEffect(() => {
        if (!gameId)
            return;
        listQuestConditionTypes(gameId)
            .then((res) => setConditionTypes(res.condition_types ?? []))
            .catch(() => setConditionTypes([]));
    }, [gameId]);
    useEffect(() => {
        if (!gameId)
            return;
        setGachaPacksLoading(true);
        listGachaPacks({ gameId })
            .then((res) => setGachaPacks(res.packs ?? []))
            .catch(() => setGachaPacks([]))
            .finally(() => setGachaPacksLoading(false));
    }, [gameId]);
    useEffect(() => {
        if (!gameId)
            return;
        setItemDefsLoading(true);
        getItemDefsCached(gameId)
            .then((res) => setItemDefs(res.items ?? []))
            .catch(() => setItemDefs([]))
            .finally(() => setItemDefsLoading(false));
    }, [gameId]);
    const mergedItemDefs = useMemo(() => mergeItemDefs(itemDefs, prefetchedItemDefs), [itemDefs, prefetchedItemDefs]);
    const setOperator = (op: 'AND' | 'OR') => onChange({ ...conditions, operator: op });
    const resolveItemDef = useCallback((rawValue: string) => {
        const normalized = rawValue.trim();
        if (!normalized)
            return null;
        const refCode = normalized.startsWith("__REF:") ? normalized.slice("__REF:".length).trim() : "";
        return (mergedItemDefs.find((def) => def.id === normalized ||
            def.item_code === normalized ||
            (refCode ? def.id === refCode || def.item_code === refCode : false)) ?? null);
    }, [mergedItemDefs]);
    const addClause = () => onChange({ ...conditions, clauses: [...conditions.clauses, newLeaf()] });
    const removeClause = (i: number) => onChange({ ...conditions, clauses: conditions.clauses.filter((_, idx) => idx !== i) });
    const updateLeaf = (i: number, patch: Partial<QuestConditionLeaf>) => onChange({
        ...conditions,
        clauses: conditions.clauses.map((c, idx) => idx === i && isConditionLeaf(c) ? { ...c, ...patch } : c),
    });
    const updateItem = (clauseIdx: number, itemIdx: number, patch: Partial<ItemRequirement>) => {
        const clause = conditions.clauses[clauseIdx];
        if (!isConditionLeaf(clause))
            return;
        const nextPatch: Partial<ItemRequirement> = { ...patch };
        if (typeof patch.item_definition_id === "string" && patch.item_definition_id.trim()) {
            const resolved = resolveItemDef(patch.item_definition_id);
            if (resolved) {
                nextPatch.item_definition_id = resolved.id;
                nextPatch.item_definition_name = resolved.name;
                nextPatch.item_definition_code = resolved.item_code;
            }
        }
        const items = (clause.items ?? []).map((it, ii) => (ii === itemIdx ? { ...it, ...nextPatch } : it));
        updateLeaf(clauseIdx, { items });
    };
    const addItem = (clauseIdx: number) => {
        const clause = conditions.clauses[clauseIdx];
        if (!isConditionLeaf(clause))
            return;
        updateLeaf(clauseIdx, { items: [...(clause.items ?? []), { item_definition_id: "", quantity: 1 }] });
    };
    const removeItem = (clauseIdx: number, itemIdx: number) => {
        const clause = conditions.clauses[clauseIdx];
        if (!isConditionLeaf(clause))
            return;
        updateLeaf(clauseIdx, { items: (clause.items ?? []).filter((_, ii) => ii !== itemIdx) });
    };
    useEffect(() => {
        const collectTypes = new Set(conditionTypes.filter((option) => option.uses_items).map((option) => option.type));
        for (let i = 0; i < conditions.clauses.length; i++) {
            const clause = conditions.clauses[i];
            if (!isConditionLeaf(clause))
                continue;
            if (!collectTypes.has(clause.type))
                continue;
            const directId = typeof clause.item_definition_id === "string" ? clause.item_definition_id.trim() : "";
            const currentItems = clause.items ?? [];
            if (currentItems.length === 0) {
                if (!directId)
                    continue;
                const resolved = resolveItemDef(directId);
                updateLeaf(i, {
                    items: [{
                            item_definition_id: resolved?.id ?? directId,
                            item_definition_name: resolved?.name,
                            item_definition_code: resolved?.item_code,
                            quantity: 1,
                        }],
                });
                continue;
            }
            const normalizedItems = currentItems.map((item) => {
                const rawId = String(item.item_definition_id ?? "").trim();
                if (!rawId)
                    return item;
                const resolved = resolveItemDef(rawId);
                if (!resolved)
                    return item;
                if (item.item_definition_id === resolved.id &&
                    item.item_definition_name === resolved.name &&
                    item.item_definition_code === resolved.item_code) {
                    return item;
                }
                return {
                    ...item,
                    item_definition_id: resolved.id,
                    item_definition_name: resolved.name,
                    item_definition_code: resolved.item_code,
                };
            });
            const changed = normalizedItems.some((item, idx) => item !== currentItems[idx]);
            if (changed) {
                updateLeaf(i, { items: normalizedItems as ItemRequirement[] });
            }
        }
    }, [conditionTypes, conditions, resolveItemDef, updateLeaf]);
    const handleTypeChange = (i: number, v: string) => {
        const clause = conditions.clauses[i];
        if (!isConditionLeaf(clause))
            return;
        const clause_id = genClauseId(v);
        const selectedType = conditionTypes.find((option) => option.type === v);
        if (selectedType?.uses_items) {
            updateLeaf(i, { type: v, clause_id, target: undefined, items: clause.items ?? [], packs: undefined, details: undefined });
        }
        else if (v === "gacha_opened") {
            updateLeaf(i, { type: v, clause_id, items: undefined, target: undefined, packs: clause.packs ?? { gacha_pack_id: "", quantity: 1 }, details: undefined });
        }
        else {
            // login — no items, no packs
            updateLeaf(i, { type: v, clause_id, items: undefined, target: undefined, packs: undefined, details: undefined });
        }
    };
    return (<div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('quest.conditions')}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('quest.operator')}</span>
          <Select value={conditions.operator} onValueChange={(v) => setOperator(v as 'AND' | 'OR')}>
            <SelectTrigger className="h-7 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" className="h-7" onClick={addClause}>
            <Plus className="h-3 w-3 mr-1"/> {t('quest.clause')}
          </Button>
        </div>
      </div>

      {conditions.clauses.length === 0 && (<p className="text-xs text-muted-foreground border border-dashed rounded px-3 py-4 text-center">
          {t('quest.noConditions')}
        </p>)}

      {conditions.clauses.map((clause, i) => {
            if (!isConditionLeaf(clause))
                return (<div key={i} className="border rounded p-2 text-xs text-muted-foreground">
            {t('quest.nestedGroupEdit')} <Button type="button" variant="ghost" size="sm" className="h-5 text-destructive" onClick={() => removeClause(i)}>{t('common.remove')}</Button>
          </div>);
            return (<div key={i} className="border rounded p-3 space-y-2 bg-muted/30">
            {/* Row 1: type + clause_id + remove */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{t('quest.type')}</Label>
                <Select value={clause.type} onValueChange={(v) => handleTypeChange(i, v)}>
                  <SelectTrigger className="h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionTypes.map((option) => {
                        const known = KNOWN_CONDITION_TYPES.find((item) => item.value === option.type);
                        const label = known ? t(known.labelKey) : option.type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
                        return <SelectItem id={`quest-condition-${i}-type-option-${option.type}`} key={option.type} value={option.type}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-32 shrink-0">
                <Label className="text-xs text-muted-foreground">
                  {t('quest.clauseId')} <span className="text-red-500">*</span>
                </Label>
                <Input className={`h-7 text-xs${!clause.clause_id.trim() ? " border-red-500 focus-visible:ring-red-500" : ""}`} placeholder={t('quest.clauseIdPlaceholder')} value={clause.clause_id} onChange={(e) => updateLeaf(i, { clause_id: e.target.value })}/>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeClause(i)}>
                <Trash2 className="h-3.5 w-3.5"/>
              </Button>
            </div>
            {(() => {
                const selectedType = conditionTypes.find((option) => option.type === clause.type);
                if (!selectedType)
                    return null;
                const translationKey = `quest.conditionMessages.${selectedType.message_code}`;
                const translatedDescription = t(translationKey);
                return (<p id={`quest-condition-${i}-type-description-${clause.clause_id || "new"}`} className="mr-9 text-xs leading-5 text-muted-foreground">
                  {translatedDescription === translationKey ? selectedType.description : translatedDescription}
                </p>);
            })()}

            {/* Row 2: type-specific fields */}
            {conditionTypes.find((option) => option.type === clause.type)?.uses_items ? (<div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t('quest.requiredItems')}</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addItem(i)}>
                    <Plus className="h-3 w-3 mr-0.5"/> {t('quest.addItem')}
                  </Button>
                </div>
                {(clause.items ?? []).length === 0 && (<p className="text-xs text-muted-foreground">{t('quest.noItemsAdded')}</p>)}
                {(clause.items ?? []).map((item, ii) => (<div key={ii} className="flex gap-1 items-center">
                    <Popover open={itemPopoverOpen?.clause === i && itemPopoverOpen?.item === ii} onOpenChange={(o) => setItemPopoverOpen(o ? { clause: i, item: ii } : null)}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" className="h-7 flex-1 justify-between text-xs font-normal">
                          <span className="truncate">
                            {item.item_definition_id
                            ? (item.item_definition_name
                                ?? mergedItemDefs.find((d) => d.id === item.item_definition_id)?.name
                                ?? item.item_definition_id)
                            : (itemDefsLoading ? t('common.loading') : t('quest.selectItem'))}
                          </span>
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50"/>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('quest.searchItem')} className="h-8"/>
                          <CommandList>
                            <CommandEmpty>
                              {itemDefsLoading ? t('common.loading') : t('common.noItemsFound')}
                            </CommandEmpty>
                            <CommandGroup>
                              {mergedItemDefs.map((def) => (<CommandItem key={def.id} value={`${def.name} ${def.item_code} ${def.id}`} onSelect={() => {
                                updateItem(i, ii, {
                                    item_definition_id: def.id,
                                    item_definition_name: def.name,
                                    item_definition_code: def.item_code,
                                });
                                setItemPopoverOpen(null);
                            }}>
                                  <Check className={`mr-2 h-3 w-3 ${item.item_definition_id === def.id ? "opacity-100" : "opacity-0"}`}/>
                                  <div>
                                    <p className="text-sm">{def.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      <span className="font-mono">{def.item_code}</span>
                                      <span className="ml-1 opacity-50">{def.category} · {def.rarity}</span>
                                    </p>
                                  </div>
                                </CommandItem>))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {item.item_definition_id && (<Link href={`/games/${gameId}/items/${item.item_definition_id}`} target="_blank" className="shrink-0">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors"/>
                      </Link>)}
                    <Input type="number" min={1} placeholder="Qty" className="h-7 w-20 text-xs" value={item.quantity} onChange={(e) => updateItem(i, ii, { quantity: Number(e.target.value) })}/>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeItem(i, ii)}>
                      <Trash2 className="h-3 w-3"/>
                    </Button>
                  </div>))}
              </div>) : clause.type === "gacha_opened" ? (<div className="flex gap-2 items-end">
                {/* Gacha Pack — flex-1, aligns under Type */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('quest.gachaPack')} <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={gachaPopoverOpen === i} onOpenChange={(o) => setGachaPopoverOpen(o ? i : null)}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox" className="h-7 w-full justify-between text-xs font-normal">
                        <span className="truncate">
                          {clause.packs?.gacha_pack_id
                        ? (gachaPacks.find((p) => p.id === clause.packs?.gacha_pack_id)?.name
                            ?? clause.packs.gacha_pack_id)
                        : (gachaPacksLoading ? t('common.loading') : t('quest.selectGachaPack'))}
                        </span>
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50"/>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('quest.searchPack')} className="h-8"/>
                        <CommandList>
                          <CommandEmpty>
                            {gachaPacksLoading ? t('common.loading') : t('common.noItemsFound')}
                          </CommandEmpty>
                          <CommandGroup>
                            {gachaPacks.map((pack) => (<CommandItem key={pack.id} value={`${pack.name} ${pack.id}`} onSelect={() => {
                            updateLeaf(i, {
                                packs: { gacha_pack_id: pack.id, quantity: clause.packs?.quantity ?? 1 },
                            });
                            setGachaPopoverOpen(null);
                        }}>
                                <Check className={`mr-2 h-3 w-3 ${clause.packs?.gacha_pack_id === pack.id
                            ? "opacity-100"
                            : "opacity-0"}`}/>
                                <div>
                                  <p className="text-sm">{pack.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{pack.id}</p>
                                </div>
                              </CommandItem>))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {clause.packs?.gacha_pack_id && (<Link href={`/games/${gameId}/items?tab=gacha&editPack=${clause.packs.gacha_pack_id}`} target="_blank" className="shrink-0 mt-auto mb-1">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors"/>
                  </Link>)}
                {/* Quantity — w-32, aligns under Clause ID */}
                <div className="w-32 shrink-0 space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('quest.quantity')}</Label>
                  <Input type="number" min={1} className="h-7" value={clause.packs?.quantity ?? 1} onChange={(e) => updateLeaf(i, { packs: { gacha_pack_id: clause.packs?.gacha_pack_id ?? "", quantity: Number(e.target.value) } })}/>
                </div>
                {/* Spacer — w-7, aligns under delete button */}
                <div className="w-7 shrink-0"/>
              </div>) : (
                /* login — no extra fields needed */
                <p className="text-xs text-muted-foreground">{t('quest.noExtraFields')}</p>)}
          </div>);
        })}
    </div>);
}
// ─── Reward Editor ─────────────────────────────────────────────────────────────
interface RewardEditorProps {
    rewards: QuestReward[];
    onChange: (rewards: QuestReward[]) => void;
    gameId: string;
    prefetchedItemDefs?: ItemDefinition[];
}
function RewardEditor({ rewards, onChange, gameId, prefetchedItemDefs = [] }: RewardEditorProps) {
    const { t } = useTranslation();
    const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([]);
    const [itemDefsLoading, setItemDefsLoading] = useState(false);
    const [rewardItemPopover, setRewardItemPopover] = useState<number | null>(null);
    useEffect(() => {
        if (!gameId)
            return;
        setItemDefsLoading(true);
        getItemDefsCached(gameId)
            .then((res) => setItemDefs(res.items ?? []))
            .catch(() => setItemDefs([]))
            .finally(() => setItemDefsLoading(false));
    }, [gameId]);
    const mergedItemDefs = useMemo(() => mergeItemDefs(itemDefs, prefetchedItemDefs), [itemDefs, prefetchedItemDefs]);
    const addReward = () => onChange([...rewards, { reward_type: "item", item_definition_id: "", quantity_min: 1, quantity_max: 1 }]);
    const removeReward = (i: number) => onChange(rewards.filter((_, idx) => idx !== i));
    const updateReward = (i: number, patch: Partial<QuestReward>) => onChange(rewards.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    return (<div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('quest.rewards')}</Label>
        <Button type="button" size="sm" variant="outline" onClick={addReward}>
          <Plus className="h-3 w-3 mr-1"/> {t('quest.addReward')}
        </Button>
      </div>
      {rewards.length === 0 && (<p className="text-sm text-muted-foreground">{t('quest.noRewards')}</p>)}
      {rewards.map((r, i) => (<div key={i} className="flex gap-2 items-start border rounded p-2">
          <div className="flex-1 space-y-2">
            <div className="space-y-2">
                <div className="flex items-center gap-1">
                <Popover open={rewardItemPopover === i} onOpenChange={(o) => setRewardItemPopover(o ? i : null)}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="h-8 w-full justify-between text-sm font-normal">
                      <span className="truncate">
                        {r.item_definition_id
                ? (r.item_definition_name
                    ?? mergedItemDefs.find((d) => d.id === r.item_definition_id)?.name
                    ?? r.item_definition_id)
                : (itemDefsLoading ? t('common.loading') : t('quest.selectItem'))}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50"/>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('quest.searchItem')} className="h-8"/>
                      <CommandList>
                        <CommandEmpty>{itemDefsLoading ? t('common.loading') : t('common.noItemsFound')}</CommandEmpty>
                        <CommandGroup>
                          {mergedItemDefs.map((def) => (<CommandItem key={def.id} value={`${def.name} ${def.item_code} ${def.id}`} onSelect={() => {
                    updateReward(i, { item_definition_id: def.id });
                    setRewardItemPopover(null);
                }}>
                              <Check className={`mr-2 h-3 w-3 ${r.item_definition_id === def.id ? "opacity-100" : "opacity-0"}`}/>
                              <div>
                                <p className="text-sm">{def.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-mono">{def.item_code}</span>
                                  <span className="ml-1 opacity-50">{def.category} · {def.rarity}</span>
                                </p>
                              </div>
                            </CommandItem>))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {r.item_definition_id && (<Link href={`/games/${gameId}/items/${r.item_definition_id}`} className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors" title={t('quest.openItem')}>
                    <ExternalLink className="h-3.5 w-3.5"/>
                  </Link>)}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('quest.minQty')}</Label>
                    <Input type="number" min={1} placeholder="1" value={r.quantity_min ?? ""} onChange={(e) => updateReward(i, { quantity_min: Number(e.target.value) })} className="h-8"/>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('quest.maxQty')}</Label>
                    <Input type="number" min={1} placeholder="1" value={r.quantity_max ?? ""} onChange={(e) => updateReward(i, { quantity_max: Number(e.target.value) })} className="h-8"/>
                  </div>
                </div>
              </div>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeReward(i)}>
            <Trash2 className="h-4 w-4"/>
          </Button>
        </div>))}
    </div>);
}
// ─── Definitions Tab ──────────────────────────────────────────────────────────
function DefinitionsTab({ game, editQuestId, onGameUpdate }: {
    game: Game | null;
    editQuestId?: string | null;
    onGameUpdate?: (g: Game) => void;
}) {
    const { t } = useTranslation();
    const { id: gameId } = useParams() as {
        id: string;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [quests, setQuests] = useState<QuestDefinition[]>([]);
    const [totalQuests, setTotalQuests] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
    // Item definitions for expanded row display
    const [rowItemDefs, setRowItemDefs] = useState<ItemDefinition[]>([]);
    const [rowGachaPacks, setRowGachaPacks] = useState<GachaPack[]>([]);
    useEffect(() => {
        if (!gameId)
            return;
        getItemDefsCached(gameId)
            .then((res) => setRowItemDefs(res.items ?? []))
            .catch(() => setRowItemDefs([]));
    }, [gameId]);
    useEffect(() => {
        if (!gameId)
            return;
        listGachaPacks({ gameId })
            .then((res) => setRowGachaPacks(res.packs ?? []))
            .catch(() => setRowGachaPacks([]));
    }, [gameId]);
    // Pagination
    const limit = 50;
    // Dialogs
    const [createOpen, setCreateOpen] = useState(false);
    const [editQuest, setEditQuest] = useState<QuestDefinition | null>(null);
    const [deleteQuest, setDeleteQuest] = useState<QuestDefinition | null>(null);
    // Form state
    const [form, setForm] = useState<QuestDefinitionForm>({ ...DEFAULT_FORM });
    const [autoSlug, setAutoSlug] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [createQuestConvContext, setCreateQuestConvContext] = useState<{
        turnId: string;
        responseIdx: number;
        questDefinitionIdx: number;
        convId: string;
        gameId: string;
    } | null>(null);
    const [createQuestResolvedItemDefs, setCreateQuestResolvedItemDefs] = useState<ItemDefinition[]>([]);
    const [editQuestResolvedItemDefs, setEditQuestResolvedItemDefs] = useState<ItemDefinition[]>([]);
    const [editQuestConvContext, setEditQuestConvContext] = useState<{
        turnId: string;
        responseIdx: number;
        questDefinitionIdx: number;
        convId: string;
        gameId: string;
    } | null>(null);
    // Filters — initialized from URL so F5 preserves them
    const [filterSearch, setFilterSearch] = useState(() => searchParams.get("q") ?? "");
    const [filterType, setFilterType] = useState(() => searchParams.get("type") ?? "all");
    const [filterActive, setFilterActive] = useState(() => searchParams.get("active") ?? "all");
    const [sortBy, setSortBy] = useState(() => searchParams.get("sortBy") ?? "updated_at");
    const [sortOrder, setSortOrder] = useState(() => searchParams.get("sortOrder") ?? "desc");
    // Sync filter state → URL
    useEffect(() => {
        const sp = new URLSearchParams(searchParams.toString());
        if (filterSearch)
            sp.set("q", filterSearch);
        else
            sp.delete("q");
        if (filterType !== "all")
            sp.set("type", filterType);
        else
            sp.delete("type");
        if (filterActive !== "all")
            sp.set("active", filterActive);
        else
            sp.delete("active");
        if (sortBy !== "updated_at")
            sp.set("sortBy", sortBy);
        else
            sp.delete("sortBy");
        if (sortOrder !== "desc")
            sp.set("sortOrder", sortOrder);
        else
            sp.delete("sortOrder");
        router.replace(`/games/${gameId}/quests?${sp.toString()}`, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterSearch, filterType, filterActive, sortBy, sortOrder]);
    useEffect(() => {
        const nextSearch = searchParams.get("q") ?? "";
        if (nextSearch !== filterSearch)
            setFilterSearch(nextSearch);
        const nextType = searchParams.get("type") ?? "all";
        if (nextType !== filterType)
            setFilterType(nextType);
        const nextActive = searchParams.get("active") ?? "all";
        if (nextActive !== filterActive)
            setFilterActive(nextActive);
        const nextSortBy = searchParams.get("sortBy") ?? "updated_at";
        if (nextSortBy !== sortBy)
            setSortBy(nextSortBy);
        const nextSortOrder = searchParams.get("sortOrder") ?? "desc";
        if (nextSortOrder !== sortOrder)
            setSortOrder(nextSortOrder);
        const expandQuest = searchParams.get("expandQuest");
        if (expandQuest !== expandedQuestId)
            setExpandedQuestId(expandQuest);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
    // Quest type options:
    // - Prefer i18n labels/descriptions for known quest types
    // - Keep API-provided values as fallback for unknown future types
    const [apiQuestTypes, setApiQuestTypes] = useState<{
        value: string;
        description?: string;
    }[]>([]);
    useEffect(() => {
        listQuestTypes().then((data) => {
            if (data?.quest_types?.length) {
                setApiQuestTypes(data.quest_types.map((qt) => ({
                    value: qt.value,
                    description: qt.description,
                })));
            }
        }).catch(() => { });
    }, []);
    const questTypeOptions = useMemo(() => {
        const knownTypeMap = new Map(QUEST_TYPES.map((qt) => [qt.value, { label: t(qt.labelKey), description: t(qt.descKey) }]));
        const sourceTypes = apiQuestTypes.length > 0
            ? apiQuestTypes.map((qt) => qt.value)
            : QUEST_TYPES.map((qt) => qt.value);
        return sourceTypes.map((value) => {
            const known = knownTypeMap.get(value as QuestType);
            const apiInfo = apiQuestTypes.find((qt) => qt.value === value);
            return {
                value,
                label: known?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                description: known?.description ?? (apiInfo?.description ?? ""),
            };
        });
    }, [apiQuestTypes, t]);
    const filteredQuests = useMemo(() => {
        let result = quests;
        if (filterSearch.trim()) {
            const q = filterSearch.toLowerCase();
            result = result.filter((d) => d.name.toLowerCase().includes(q) ||
                (d.code_name ?? "").toLowerCase().includes(q) ||
                (d.description ?? "").toLowerCase().includes(q) ||
                d.id.toLowerCase().includes(q));
        }
        if (filterType !== "all") {
            result = result.filter((d) => d.quest_type === filterType);
        }
        return result;
    }, [quests, filterSearch, filterType]);
    const hasActiveFilters = filterSearch.trim() !== "" || filterType !== "all" || filterActive !== "all" || sortBy !== "updated_at" || sortOrder !== "desc";
    const clearFilters = () => { setFilterSearch(""); setFilterType("all"); setFilterActive("all"); setSortBy("updated_at"); setSortOrder("desc"); };
    // ── Data loading ─────────────────────────────────────────────────────────────
    const loadQuests = useCallback(async (after?: string) => {
        if (!game)
            return;
        try {
            const res = await listQuestDefinitions(game.studio_id, gameId, {
                status: filterActive === "active" ? true : filterActive === "inactive" ? false : undefined,
                limit,
                after,
                sort_by: sortBy,
                order: sortOrder,
            });
            const newQuests = res.quests ?? [];
            if (after) {
                setQuests((prev) => [...prev, ...newQuests]);
            } else {
                setQuests(newQuests);
            }
            if (res.total !== undefined) {
                setTotalQuests(res.total);
            }
            setHasNextPage(newQuests.length === limit);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : "Failed to load quest definitions";
            setError(msg);
        }
    }, [game, gameId, limit, filterActive, sortBy, sortOrder]);
    
    useEffect(() => {
        if (!game)
            return;
        setLoading(true);
        setError(null);
        loadQuests().finally(() => setLoading(false));
    }, [game, loadQuests]);
    
    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasNextPage || quests.length === 0) return;
        setLoadingMore(true);
        const lastQuestId = quests[quests.length - 1].id;
        await loadQuests(lastQuestId);
        setLoadingMore(false);
    }, [loadingMore, hasNextPage, quests, loadQuests]);
    // ── Edit ─────────────────────────────────────────────────────────────────────
    const openEdit = useCallback(async (q: QuestDefinition, draft?: Partial<QuestDefinitionForm>, turnContext?: {
        turnId: string;
        responseIdx: number;
        questDefinitionIdx: number;
        convId: string;
        gameId: string;
    } | null) => {
        const nextName = typeof draft?.name === "string" && draft.name.trim() ? draft.name : q.name;
        const nextCodeName = typeof draft?.code_name === "string" ? draft.code_name : (q.code_name ?? "");
        const nextDescription = typeof draft?.description === "string" ? draft.description : (q.description ?? "");
        const nextQuestType = (draft?.quest_type as QuestType) ?? q.quest_type;
        const nextConditions = (draft?.conditions ?? q.conditions ?? { operator: "AND", clauses: [] }) as QuestConditionGroup;
        const nextIsActive = typeof draft?.is_active === "boolean" ? draft.is_active : q.is_active;
        const nextSortOrder = typeof draft?.sort_order === "number" ? draft.sort_order : q.sort_order;
        const nextExpireAfterMinutes = nextQuestType === "daily"
            ? (typeof q.expire_after_minutes === "number" ? null : undefined)
            : (typeof draft?.expire_after_minutes === "number" || draft?.expire_after_minutes === null
                ? draft.expire_after_minutes
                : q.expire_after_minutes);
        const nextRewards = Array.isArray(draft?.rewards) ? (draft.rewards as QuestReward[]) : (q.rewards ?? []);
        const nextMetadata = draft?.metadata && typeof draft.metadata === "object" && !Array.isArray(draft.metadata)
            ? draft.metadata as Record<string, unknown>
            : (q.metadata ?? undefined);
        const nextForm: QuestDefinitionForm = {
            name: nextName,
            code_name: nextCodeName,
            description: nextDescription,
            quest_type: nextQuestType,
            conditions: nextConditions,
            is_active: nextIsActive,
            sort_order: nextSortOrder,
            expire_after_minutes: nextExpireAfterMinutes,
            rewards: nextRewards,
            metadata: nextMetadata as Record<string, unknown> | undefined,
        };
        const prepared = await resolveQuestDraftForCreate(nextForm);
        setForm(prepared.draft);
        setEditQuestResolvedItemDefs(prepared.resolvedItemDefs);
        setAutoSlug(false);
        setEditQuest(q);
        setEditQuestConvContext(turnContext ?? null);
        // Reflect the edit target in the URL so the link can be shared
        const sp = new URLSearchParams(searchParams.toString());
        sp.set("editQuestId", q.id);
        sp.delete("tab"); // definitions is the default tab, keep URL clean
        router.replace(`/games/${gameId}/quests?${sp.toString()}`, { scroll: false });
    }, [gameId, router, searchParams]);
    // Auto-open edit sheet when ?editQuestId=<id> is in the URL (shared link or pencil click)
    const handledEditQuestId = useRef<string | null>(null);
    useEffect(() => {
        if (!editQuestId || editQuestId === handledEditQuestId.current || quests.length === 0)
            return;
        const q = quests.find((qd) => qd.id === editQuestId);
        if (!q)
            return;
        const pendingRaw = safeGetItem(lsPendingQuestEdit(gameId));
        if (pendingRaw) {
            try {
                const detail = JSON.parse(pendingRaw) as Record<string, unknown>;
                const draft = (detail.questDefinition && typeof detail.questDefinition === "object" && !Array.isArray(detail.questDefinition))
                    ? detail.questDefinition as Partial<QuestDefinitionForm>
                    : (detail as Partial<QuestDefinitionForm>);
                const turnContext = {
                    turnId: typeof detail.turnId === "string" ? detail.turnId : "",
                    responseIdx: typeof detail.responseIdx === "number" ? detail.responseIdx : Number(detail.responseIdx ?? 0),
                    questDefinitionIdx: typeof detail.questDefinitionIdx === "number" ? detail.questDefinitionIdx : Number(detail.questDefinitionIdx ?? 0),
                    convId: typeof detail.convId === "string" ? detail.convId : "",
                    gameId: typeof detail.gameId === "string" ? detail.gameId : gameId,
                };
                void openEdit(q, draft, turnContext).catch(() => { });
            }
            catch {
                void openEdit(q).catch(() => { });
            }
            finally {
                safeRemoveItem(lsPendingQuestEdit(gameId));
            }
            handledEditQuestId.current = editQuestId;
            return;
        }
        void openEdit(q).catch(() => { });
        handledEditQuestId.current = editQuestId;
    }, [editQuestId, gameId, quests, openEdit]);
    const refresh = async () => {
        setRefreshing(true);
        await loadQuests(offset);
        setRefreshing(false);
    };
    // ── Create ───────────────────────────────────────────────────────────────────
    const resolveQuestDraftForCreate = useCallback(async (questDefinition: QuestDefinitionForm) => {
        if (!gameId) {
            return { draft: questDefinition, resolvedItemDefs: [] as ItemDefinition[] };
        }
        const refs = new Set<string>();
        const walk = (value: unknown): void => {
            if (!value || typeof value !== "object" || Array.isArray(value))
                return;
            const record = value as Record<string, unknown>;
            const directId = String(record.item_definition_id ?? "").trim();
            if (directId.startsWith("__REF:"))
                refs.add(directId.slice("__REF:".length).trim());
            if (Array.isArray(record.clauses))
                record.clauses.forEach(walk);
            if (Array.isArray(record.items)) {
                for (const item of record.items) {
                    if (!item || typeof item !== "object" || Array.isArray(item))
                        continue;
                    const rawId = String((item as Record<string, unknown>).item_definition_id ?? "").trim();
                    if (rawId.startsWith("__REF:"))
                        refs.add(rawId.slice("__REF:".length).trim());
                }
            }
            if (Array.isArray(record.rewards)) {
                for (const reward of record.rewards) {
                    if (!reward || typeof reward !== "object" || Array.isArray(reward))
                        continue;
                    const rawId = String((reward as Record<string, unknown>).item_definition_id ?? "").trim();
                    if (rawId.startsWith("__REF:"))
                        refs.add(rawId.slice("__REF:".length).trim());
                }
            }
            if (record.conditions)
                walk(record.conditions);
        };
        walk(questDefinition);
        if (refs.size === 0) {
            return { draft: questDefinition, resolvedItemDefs: [] as ItemDefinition[] };
        }
        const codeToItem = new Map<string, ItemDefinition>();
        await Promise.allSettled([...refs].map(async (code) => {
            if (!code)
                return;
            const res = await listItemDefinitions({ gameId }, { item_code: code, limit: 1 });
            const item = (res.items ?? []).find((candidate) => candidate.item_code === code) ?? null;
            if (item) {
                codeToItem.set(code, item);
            }
        }));
        const replaceRefs = (value: unknown): unknown => {
            if (!value || typeof value !== "object" || Array.isArray(value))
                return value;
            const record = value as Record<string, unknown>;
            if (Array.isArray(record.clauses)) {
                return {
                    ...record,
                    clauses: record.clauses.map((clause) => replaceRefs(clause)),
                };
            }
            const type = typeof record.type === "string" ? record.type : "";
            const directId = String(record.item_definition_id ?? "").trim();
            const canCarryItem = type === "collect_and_keep" || type === "collect_and_submit" || type === "not_have_item";
            if (canCarryItem && directId) {
                const resolved = directId.startsWith("__REF:")
                    ? codeToItem.get(directId.slice("__REF:".length).trim()) ?? null
                    : [...codeToItem.values()].find((item) => item.id === directId || item.item_code === directId) ?? null;
                const currentItems = Array.isArray(record.items) ? record.items : [];
                const nextItems = currentItems.length > 0
                    ? currentItems
                    : resolved
                        ? [{
                                item_definition_id: resolved.id,
                                item_definition_name: resolved.name,
                                item_definition_code: resolved.item_code,
                                quantity: 1,
                            }]
                        : [{
                                item_definition_id: directId,
                                quantity: 1,
                            }];
                const { item_definition_id: _ignoredId, item_definition_name: _ignoredName, item_definition_code: _ignoredCode, ...rest } = record;
                return {
                    ...rest,
                    items: nextItems,
                };
            }
            if (Array.isArray(record.items)) {
                return {
                    ...record,
                    items: record.items.map((item) => {
                        if (!item || typeof item !== "object" || Array.isArray(item))
                            return item;
                        const itemRecord = item as Record<string, unknown>;
                        const rawId = String(itemRecord.item_definition_id ?? "").trim();
                        if (rawId.startsWith("__REF:")) {
                            const code = rawId.slice("__REF:".length).trim();
                            const resolved = codeToItem.get(code);
                            return resolved
                                ? { ...itemRecord, item_definition_id: resolved.id, item_definition_name: resolved.name, item_definition_code: resolved.item_code }
                                : itemRecord;
                        }
                        return itemRecord;
                    }),
                };
            }
            if (Array.isArray(record.rewards)) {
                return {
                    ...record,
                    rewards: record.rewards.map((reward) => {
                        if (!reward || typeof reward !== "object" || Array.isArray(reward))
                            return reward;
                        const rewardRecord = reward as Record<string, unknown>;
                        const rawId = String(rewardRecord.item_definition_id ?? "").trim();
                        if (rawId.startsWith("__REF:")) {
                            const code = rawId.slice("__REF:".length).trim();
                            const resolved = codeToItem.get(code);
                            return resolved
                                ? { ...rewardRecord, item_definition_id: resolved.id, item_definition_name: resolved.name, item_definition_code: resolved.item_code }
                                : rewardRecord;
                        }
                        return rewardRecord;
                    }),
                };
            }
            if (typeof record.item_definition_id === "string" && record.item_definition_id.trim().startsWith("__REF:")) {
                const code = record.item_definition_id.trim().slice("__REF:".length).trim();
                const resolved = codeToItem.get(code);
                return resolved
                    ? {
                        ...record,
                        item_definition_id: resolved.id,
                        item_definition_name: resolved.name,
                        item_definition_code: resolved.item_code,
                    }
                    : record;
            }
            if (record.conditions) {
                return {
                    ...record,
                    conditions: replaceRefs(record.conditions) as Record<string, unknown>,
                };
            }
            return record;
        };
        return {
            draft: replaceRefs(questDefinition) as QuestDefinitionForm,
            resolvedItemDefs: [...codeToItem.values()],
        };
    }, [gameId]);
    const openCreate = useCallback(async (initialValues?: Partial<QuestDefinitionForm>, turnContext?: {
        turnId: string;
        responseIdx: number;
        questDefinitionIdx: number;
        convId: string;
        gameId: string;
    } | null) => {
        const nextForm: QuestDefinitionForm = {
            ...DEFAULT_FORM,
            ...(initialValues ?? {}),
            name: typeof initialValues?.name === "string" ? initialValues.name : DEFAULT_FORM.name,
            code_name: typeof initialValues?.code_name === "string" ? initialValues.code_name : DEFAULT_FORM.code_name,
            description: typeof initialValues?.description === "string" ? initialValues.description : DEFAULT_FORM.description,
            quest_type: (initialValues?.quest_type as QuestType) ?? DEFAULT_FORM.quest_type,
            conditions: (initialValues?.conditions ?? DEFAULT_FORM.conditions) as QuestConditionGroup,
            is_active: typeof initialValues?.is_active === "boolean" ? initialValues.is_active : DEFAULT_FORM.is_active,
            sort_order: typeof initialValues?.sort_order === "number" ? initialValues.sort_order : DEFAULT_FORM.sort_order,
            expire_after_minutes: typeof initialValues?.expire_after_minutes === "number"
                ? initialValues.expire_after_minutes
                : undefined,
            rewards: Array.isArray(initialValues?.rewards) ? (initialValues.rewards as QuestReward[]) : DEFAULT_FORM.rewards,
            metadata: initialValues?.metadata && typeof initialValues.metadata === "object" && !Array.isArray(initialValues.metadata)
                ? initialValues.metadata as Record<string, unknown>
                : initialValues?.metadata,
        };
        if (nextForm.quest_type === "daily") {
            delete nextForm.expire_after_minutes;
        }
        if (!nextForm.code_name?.trim() && nextForm.name.trim()) {
            nextForm.code_name = toSlugUnderscore(nextForm.name);
        }
        const prepared = await resolveQuestDraftForCreate(nextForm);
        setForm(prepared.draft);
        setCreateQuestResolvedItemDefs(prepared.resolvedItemDefs);
        setAutoSlug(!(typeof prepared.draft.code_name === "string" && prepared.draft.code_name.trim()));
        setCreateQuestConvContext(turnContext ?? null);
        setCreateOpen(true);
    }, [resolveQuestDraftForCreate]);
    const closeCreate = useCallback(() => {
        setCreateOpen(false);
        setCreateQuestConvContext(null);
        setCreateQuestResolvedItemDefs([]);
    }, []);
    useEscapeLayer(createOpen, closeCreate, 1);
    // Consume pending LLM quest drafts when the sheet opens from conversation routing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!gameId)
            return;
        function consumePendingQuestDraft() {
            const pendingRaw = safeGetItem(lsPendingQuestCreate(gameId));
            if (!pendingRaw)
                return;
            try {
                const detail = JSON.parse(pendingRaw) as Record<string, unknown>;
                const draft = (detail.questDefinition && typeof detail.questDefinition === "object" && !Array.isArray(detail.questDefinition))
                    ? detail.questDefinition as Partial<QuestDefinitionForm>
                    : (detail as Partial<QuestDefinitionForm>);
                openCreate(draft, {
                    turnId: typeof detail.turnId === "string" ? detail.turnId : "",
                    responseIdx: typeof detail.responseIdx === "number" ? detail.responseIdx : Number(detail.responseIdx ?? 0),
                    questDefinitionIdx: typeof detail.questDefinitionIdx === "number" ? detail.questDefinitionIdx : Number(detail.questDefinitionIdx ?? 0),
                    convId: typeof detail.convId === "string" ? detail.convId : "",
                    gameId: typeof detail.gameId === "string" ? detail.gameId : gameId,
                });
                safeRemoveItem(lsPendingQuestCreate(gameId));
            }
            catch {
                safeRemoveItem(lsPendingQuestCreate(gameId));
            }
        }
        function handleOpenCreateQuestDefinition(e: Event) {
            const detail = (e as CustomEvent<Record<string, unknown>>).detail;
            if (!detail)
                return;
            const draft = (detail.questDefinition && typeof detail.questDefinition === "object" && !Array.isArray(detail.questDefinition))
                ? detail.questDefinition as Partial<QuestDefinitionForm>
                : (detail as Partial<QuestDefinitionForm>);
            openCreate(draft, {
                turnId: typeof detail.turnId === "string" ? detail.turnId : "",
                responseIdx: typeof detail.responseIdx === "number" ? detail.responseIdx : Number(detail.responseIdx ?? 0),
                questDefinitionIdx: typeof detail.questDefinitionIdx === "number" ? detail.questDefinitionIdx : Number(detail.questDefinitionIdx ?? 0),
                convId: typeof detail.convId === "string" ? detail.convId : "",
                gameId: typeof detail.gameId === "string" ? detail.gameId : gameId,
            });
        }
        window.addEventListener('ss:open-create-quest-definition', handleOpenCreateQuestDefinition as EventListener);
        if (searchParams.get("create") === "1") {
            consumePendingQuestDraft();
        }
        return () => {
            window.removeEventListener('ss:open-create-quest-definition', handleOpenCreateQuestDefinition as EventListener);
        };
    }, [gameId, searchParams]);
    useEffect(() => {
        if (!gameId)
            return;
        function handleOpenEditQuestDefinition(e: Event) {
            const detail = (e as CustomEvent<Record<string, unknown>>).detail;
            if (!detail)
                return;
            const existingQuestId = typeof detail.existingQuestId === "string" ? detail.existingQuestId : "";
            const draft = (detail.questDefinition && typeof detail.questDefinition === "object" && !Array.isArray(detail.questDefinition))
                ? detail.questDefinition as Partial<QuestDefinitionForm>
                : (detail as Partial<QuestDefinitionForm>);
            const turnContext = {
                turnId: typeof detail.turnId === "string" ? detail.turnId : "",
                responseIdx: typeof detail.responseIdx === "number" ? detail.responseIdx : Number(detail.responseIdx ?? 0),
                questDefinitionIdx: typeof detail.questDefinitionIdx === "number" ? detail.questDefinitionIdx : Number(detail.questDefinitionIdx ?? 0),
                convId: typeof detail.convId === "string" ? detail.convId : "",
                gameId: typeof detail.gameId === "string" ? detail.gameId : gameId,
            };
            const q = quests.find((qd) => qd.id === existingQuestId);
            if (q) {
                openEdit(q, draft, turnContext);
                return;
            }
            const pending = {
                existingQuestId,
                questDefinition: draft,
                ...turnContext,
            };
            safeSetItem(lsPendingQuestEdit(gameId), JSON.stringify(pending));
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("editQuestId", existingQuestId);
            sp.delete("tab");
            router.replace(`/games/${gameId}/quests?${sp.toString()}`, { scroll: false });
        }
        window.addEventListener('ss:open-edit-quest-definition', handleOpenEditQuestDefinition as EventListener);
        return () => {
            window.removeEventListener('ss:open-edit-quest-definition', handleOpenEditQuestDefinition as EventListener);
        };
    }, [gameId, openEdit, quests, router, searchParams]);
    const resolveQuestDefinitionDraft = async (questDefinition: QuestDefinitionForm): Promise<QuestDefinitionForm> => {
        if (!gameId)
            return questDefinition;
        const refs = new Set<string>();
        const walk = (value: unknown): void => {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return;
            const record = value as Record<string, unknown>;
            if (Array.isArray(record.clauses))
                record.clauses.forEach(walk);
            if (Array.isArray(record.items)) {
                for (const item of record.items) {
                    if (!item || typeof item !== 'object' || Array.isArray(item))
                        continue;
                    const rawId = String((item as Record<string, unknown>).item_definition_id ?? '').trim();
                    if (rawId.startsWith('__REF:'))
                        refs.add(rawId.slice('__REF:'.length).trim());
                }
            }
            if (Array.isArray(record.rewards)) {
                for (const reward of record.rewards) {
                    if (!reward || typeof reward !== 'object' || Array.isArray(reward))
                        continue;
                    const rawId = String((reward as Record<string, unknown>).item_definition_id ?? '').trim();
                    if (rawId.startsWith('__REF:'))
                        refs.add(rawId.slice('__REF:'.length).trim());
                }
            }
            if (record.conditions)
                walk(record.conditions);
        };
        walk(questDefinition);
        if (refs.size === 0)
            return questDefinition;
        const codeToId: Record<string, string> = {};
        const lookupResults = await Promise.allSettled([...refs].map(async (code) => {
            if (!code)
                return;
            const res = await listItemDefinitions({ gameId }, { item_code: code, limit: 1 });
            const item = (res.items ?? []).find((candidate) => candidate.item_code === code) ?? null;
            if (!item) {
                throw new Error(`Could not find item definition with item_code "${code}".`);
            }
            codeToId[code] = item.id;
        }));
        const failedLookup = lookupResults.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failedLookup) {
            throw (failedLookup.reason instanceof Error ? failedLookup.reason : new Error(String(failedLookup.reason)));
        }
        const replaceRefs = (value: unknown): unknown => {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return value;
            const record = value as Record<string, unknown>;
            if (Array.isArray(record.clauses)) {
                return {
                    ...record,
                    clauses: record.clauses.map((clause) => replaceRefs(clause)),
                };
            }
            if (Array.isArray(record.items)) {
                return {
                    ...record,
                    items: record.items.map((item) => {
                        if (!item || typeof item !== 'object' || Array.isArray(item))
                            return item;
                        const itemRecord = item as Record<string, unknown>;
                        const rawId = String(itemRecord.item_definition_id ?? '').trim();
                        if (rawId.startsWith('__REF:')) {
                            const code = rawId.slice('__REF:'.length).trim();
                            const resolved = codeToId[code];
                            if (!resolved)
                                throw new Error(`Could not find item definition with item_code "${code}".`);
                            return { ...itemRecord, item_definition_id: resolved };
                        }
                        return itemRecord;
                    }),
                };
            }
            if (Array.isArray(record.rewards)) {
                return {
                    ...record,
                    rewards: record.rewards.map((reward) => {
                        if (!reward || typeof reward !== 'object' || Array.isArray(reward))
                            return reward;
                        const rewardRecord = reward as Record<string, unknown>;
                        const rawId = String(rewardRecord.item_definition_id ?? '').trim();
                        if (rawId.startsWith('__REF:')) {
                            const code = rawId.slice('__REF:'.length).trim();
                            const resolved = codeToId[code];
                            if (!resolved)
                                throw new Error(`Could not find item definition with item_code "${code}".`);
                            return { ...rewardRecord, item_definition_id: resolved };
                        }
                        return rewardRecord;
                    }),
                };
            }
            if (record.conditions) {
                return {
                    ...record,
                    conditions: replaceRefs(record.conditions) as Record<string, unknown>,
                };
            }
            return record;
        };
        return replaceRefs(questDefinition) as QuestDefinitionForm;
    };
    const handleCreate = async () => {
        if (!game)
            return;
        const codeName = (form.code_name ?? "").trim();
        if (!codeName) {
            toast({ variant: "destructive", title: t('common.error'), description: t('quest.codeNameRequired') });
            return;
        }
        setSaving(true);
        try {
            const resolvedForm = await resolveQuestDefinitionDraft(form);
            const createFields = { ...stripQuestUiFields(resolvedForm) };
            delete createFields.sort_order;
            if (createFields.quest_type === "daily") {
                delete createFields.expire_after_minutes;
            }
            const payload: CreateQuestDefinitionRequest = {
                ...createFields,
                code_name: codeName,
            };
            const created = await createQuestDefinition(game.studio_id, gameId, payload);
            toast({ title: t('quest.questCreated'), description: form.name });
            setCreateOpen(false);
            if (createQuestConvContext) {
                window.dispatchEvent(new CustomEvent('ss:quest-created', {
                    detail: {
                        questId: created.id,
                        questName: created.name,
                        questCodeName: created.code_name ?? codeName,
                        turnId: createQuestConvContext.turnId,
                        responseIdx: createQuestConvContext.responseIdx,
                        questDefinitionIdx: createQuestConvContext.questDefinitionIdx,
                        convId: createQuestConvContext.convId,
                        gameId: createQuestConvContext.gameId,
                    },
                }));
                setCreateQuestConvContext(null);
            }
            await loadQuests(offset);
            getGame(gameId).then(onGameUpdate).catch(() => { });
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: e instanceof ApiError ? e.message : t('quest.failedCreateQuest'),
            });
        }
        finally {
            setSaving(false);
        }
    };
    const closeEdit = useCallback(() => {
        setEditQuest(null);
        setEditQuestConvContext(null);
        setEditQuestResolvedItemDefs([]);
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete("editQuestId");
        const qs = sp.toString();
        router.replace(`/games/${gameId}/quests${qs ? `?${qs}` : ""}`, { scroll: false });
    }, [gameId, router, searchParams]);
    const handleEdit = async () => {
        if (!game || !editQuest)
            return;
        const codeName = (form.code_name ?? "").trim();
        if (!codeName) {
            toast({ variant: "destructive", title: t('common.error'), description: t('quest.codeNameRequired') });
            return;
        }
        setSaving(true);
        try {
            const patch: UpdateQuestDefinitionRequest = {
                ...stripQuestUiFields(form),
                code_name: codeName,
            };
            if (form.quest_type === "daily") {
                if (typeof editQuest.expire_after_minutes === "number") {
                    patch.expire_after_minutes = null;
                }
                else {
                    delete patch.expire_after_minutes;
                }
            }
            const updated = await updateQuestDefinition(game.studio_id, gameId, editQuest.id, patch, { suppressToast: true });
            toast({ title: t('quest.questUpdated'), description: form.name });
            window.dispatchEvent(new CustomEvent('ss:quest-created', {
                detail: {
                    questId: updated.id,
                    questName: updated.name,
                    questCodeName: updated.code_name ?? codeName,
                    turnId: editQuestConvContext?.turnId,
                    responseIdx: editQuestConvContext?.responseIdx,
                    questDefinitionIdx: editQuestConvContext?.questDefinitionIdx,
                    convId: editQuestConvContext?.convId,
                    gameId,
                },
            }));
            closeEdit();
            await loadQuests(offset);
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: getQuestApiErrorMessage(e, t, 'quest.failedUpdateQuest'),
            });
        }
        finally {
            setSaving(false);
        }
    };
    // ── Delete ───────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!game || !deleteQuest)
            return;
        setDeleting(true);
        try {
            await deleteQuestDefinition(game.studio_id, gameId, deleteQuest.id);
            toast({ title: t('quest.questDeleted'), description: deleteQuest.name });
            setDeleteQuest(null);
            await loadQuests(offset);
            getGame(gameId).then(onGameUpdate).catch(() => { });
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: e instanceof ApiError ? e.message : t('quest.failedDeleteQuest'),
            });
        }
        finally {
            setDeleting(false);
        }
    };
    // ── Toggle active ─────────────────────────────────────────────────────────────
    const toggleActive = async (q: QuestDefinition) => {
        if (!game)
            return;
        try {
            await updateQuestDefinition(game.studio_id, gameId, q.id, { is_active: !q.is_active });
            setQuests((prev) => prev.map((x) => (x.id === q.id ? { ...x, is_active: !x.is_active } : x)));
        }
        catch (e) {
            toast({
                variant: "destructive",
                title: t('common.error'),
                description: e instanceof ApiError ? e.message : t('quest.failedToggleQuest'),
            });
        }
    };
    // ── Form shared part ─────────────────────────────────────────────────────────
    const questFormScope = editQuest ? "edit" : "create";
    const selectedQuestTypeDescription = questTypeOptions.find((option) => option.value === form.quest_type)?.description ?? "";
    const updateQuestExpiration = (expireAfterMinutes?: number) => setForm((currentForm) => {
        if (expireAfterMinutes === undefined && !editQuest) {
            const nextForm = { ...currentForm };
            delete nextForm.expire_after_minutes;
            return nextForm;
        }
        return {
            ...currentForm,
            expire_after_minutes: expireAfterMinutes ?? null,
        };
    });
    const QuestForm = (<div className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="qname">{t('quest.name')} <span className="text-red-500">*</span></Label>
        <Input id="qname" value={form.name} onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({
                ...f,
                name: v,
                ...(autoSlug ? { code_name: toSlugUnderscore(v) } : {}),
            }));
        }} placeholder={t('quest.questNamePlaceholder')}/>
      </div>

      {/* Code Name */}
      <div className="space-y-1">
        <Label htmlFor="qcode">
          {t('quest.codeName')} <span className="text-red-500">*</span>{" "}
          <span className="text-muted-foreground text-xs font-normal">({t('quest.codeNameHint')})</span>
        </Label>
        <div className="flex gap-2">
          <Input id="qcode" value={form.code_name ?? ""} placeholder={t('quest.codeNamePlaceholder')} className="font-mono" onChange={(e) => {
            setAutoSlug(false);
            setForm((f) => ({ ...f, code_name: e.target.value }));
        }}/>
          <Button type="button" variant={autoSlug ? "default" : "outline"} size="icon" className="shrink-0" title={autoSlug ? t('items.autoSlugOn') : t('items.autoSlugOff')} onClick={() => {
            const next = !autoSlug;
            setAutoSlug(next);
            if (next)
                setForm((f) => ({ ...f, code_name: toSlugUnderscore(f.name) }));
        }}>
            <Wand2 className="h-4 w-4"/>
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="qdesc">{t('quest.description')}</Label>
        <Textarea id="qdesc" rows={2} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={t('quest.questDescPlaceholder')}/>
      </div>

      {/* Quest Type */}
      <div id={`quest-type-field-${questFormScope}`} className="space-y-1">
        <Label id={`quest-type-label-${questFormScope}`}>{t('quest.questType')} <span id={`quest-type-required-${questFormScope}`} className="text-red-500">*</span></Label>
        <div id={`quest-type-control-row-${questFormScope}`} className="grid grid-cols-[minmax(0,1fr)_280px] items-center gap-4">
          <Select value={form.quest_type} onValueChange={(value) => {
              const questType = value as QuestType;
              setForm((currentForm) => {
                  const nextForm = { ...currentForm, quest_type: questType };
                  if (questType === "daily") {
                      if (editQuest && typeof editQuest.expire_after_minutes === "number") {
                          nextForm.expire_after_minutes = null;
                      }
                      else {
                          delete nextForm.expire_after_minutes;
                      }
                  }
                  return nextForm;
              });
          }}>
            <SelectTrigger id={`quest-type-trigger-${questFormScope}`}>
              <SelectValue id={`quest-type-value-${questFormScope}`} />
            </SelectTrigger>
            <SelectContent id={`quest-type-content-${questFormScope}`}>
              {questTypeOptions.map((option) => (
                <SelectItem id={`quest-type-option-${questFormScope}-${option.value}`} key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.quest_type === "daily" ? (
            <p id={`quest-expiration-daily-unavailable-${questFormScope}`} className="text-xs leading-tight text-muted-foreground">
              {t('quest.expirationUnavailableDaily')}
            </p>
          ) : (
            <QuestExpirationToggle
              idScope={questFormScope}
              checked={typeof form.expire_after_minutes === "number"}
              onCheckedChange={(checked) => updateQuestExpiration(checked ? DEFAULT_QUEST_EXPIRATION_MINUTES : undefined)}
              t={t}
            />
          )}
        </div>
        {selectedQuestTypeDescription && (
          <p id={`quest-type-description-${questFormScope}`} className="text-xs text-muted-foreground">
            {selectedQuestTypeDescription}
          </p>
        )}
        {(form.quest_type === "chain") && (<p id={`quest-type-chain-hint-${questFormScope}`} className="text-xs text-muted-foreground">{t('quest.storyChainHint')}</p>)}
      </div>

      {/* Expiration */}
      {form.quest_type !== "daily" && typeof form.expire_after_minutes === "number" && (
        <QuestExpirationSettings
          idScope={questFormScope}
          value={form.expire_after_minutes}
          onChange={updateQuestExpiration}
          t={t}
        />
      )}

      {/* Conditions */}
      <ConditionEditor conditions={form.conditions ?? DEFAULT_CONDITIONS} onChange={(c) => setForm((f) => ({ ...f, conditions: c }))} gameId={gameId} prefetchedItemDefs={editQuest ? editQuestResolvedItemDefs : createQuestResolvedItemDefs}/>


      {/* Rewards */}
      <RewardEditor rewards={form.rewards ?? []} onChange={(rewards) => setForm((f) => ({ ...f, rewards }))} gameId={gameId} prefetchedItemDefs={editQuest ? editQuestResolvedItemDefs : createQuestResolvedItemDefs}/>
    </div>);
    // ── Render ───────────────────────────────────────────────────────────────────
    return (<>
      {/* Error */}
      {error && (<Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      {/* Filters */}
      {!loading && (<div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground mr-auto">
            {quests.length > 0
                ? `${filteredQuests.length} ${t('quest.ofQuests')} ${totalQuests} ${totalQuests !== 1 ? t('quest.questDefinitions') : t('quest.questDefinition')}`
                : `0 ${t('quest.questDefinitions')}`}
          </p>
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
            <Input placeholder={t('quest.searchByNameDesc')} value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="h-8 pl-8 pr-8 text-sm"/>
            {filterSearch.trim() && (<button type="button" aria-label={t('common.clear')} onClick={() => setFilterSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-3 w-3"/>
              </button>)}
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder={t('quest.allTypes')}/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('quest.allTypes')}</SelectItem>
              {questTypeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder={t('quest.allStatus')}/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('quest.allStatus')}</SelectItem>
              <SelectItem value="active">{t('quest.activeStatus')}</SelectItem>
              <SelectItem value="inactive">{t('quest.inactiveStatus')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => { const [s, o] = v.split(":"); setSortBy(s); setSortOrder(o); }}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Sort"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sort_order:asc">{t('quest.sortOrderAsc')}</SelectItem>
              <SelectItem value="sort_order:desc">{t('quest.sortOrderDesc')}</SelectItem>
              <SelectItem value="name:asc">{t('quest.nameAZ')}</SelectItem>
              <SelectItem value="name:desc">{t('quest.nameZA')}</SelectItem>
              <SelectItem value="created_at:desc">{t('quest.newestFirst')}</SelectItem>
              <SelectItem value="created_at:asc">{t('quest.oldestFirst')}</SelectItem>
              <SelectItem value="updated_at:desc">{t('quest.recentlyUpdated')}</SelectItem>
              <SelectItem value="updated_at:asc">{t('quest.leastRecentlyUpdated')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={refresh} disabled={loading || refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" className="h-8" onClick={() => openCreate()} disabled={loading || !game}>
            <Plus className="h-4 w-4 mr-1"/>
            {t('quest.newQuest')}
          </Button>
          {hasActiveFilters && (<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1"/> {t('quest.clear')}
            </Button>)}
        </div>)}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (<div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
            </div>) : filteredQuests.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              {hasActiveFilters ? (<>
                  <Search className="h-10 w-10 opacity-30"/>
                  <p>{t('quest.noQuestsMatch')}</p>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="h-3.5 w-3.5 mr-1"/> {t('quest.clearFilters')}
                  </Button>
                </>) : (<>
                  <ScrollText className="h-10 w-10 opacity-30"/>
                  <p>{t('quest.noQuestDefs')}</p>
                  <Button onClick={() => openCreate()} variant="outline">
                    <Plus className="h-4 w-4 mr-1"/> {t('quest.createFirstQuest')}
                  </Button>
                </>)}
            </div>) : (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('quest.name')}</TableHead>
                  <TableHead>{t('quest.codeName')}</TableHead>
                  <TableHead>{t('quest.type')}</TableHead>
                  <TableHead>{t('quest.conditions')}</TableHead>
                  <TableHead>{t('quest.rewards')}</TableHead>
                  <TableHead>{t('quest.delivery.column')}</TableHead>

                  <TableHead>{t('quest.active')}</TableHead>
                  <TableHead className="text-right">{t('quest.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuests.map((q) => (<React.Fragment key={q.id}>
                  <TableRow id={`quest-list-item-${q.id}`} className="quest-list-item cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedQuestId(expandedQuestId === q.id ? null : q.id)}>
                    <TableCell>
                      <div className="flex items-start gap-1.5">
                        {expandedQuestId === q.id
                    ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"/>
                    : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"/>}
                        <span className="font-medium truncate">{q.name}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {q.code_name ? (<div className="text-xs font-mono text-muted-foreground flex items-center gap-0.5" title={q.code_name}>
                          <span className="truncate max-w-[220px]">{q.code_name}</span>
                          <CopyButton text={q.code_name} size="h-3 w-3"/>
                        </div>) : (<span className="text-xs text-muted-foreground">—</span>)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={questTypeBadgeVariant(q.quest_type)}>
                        {q.quest_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.conditions ? (<span className="inline-flex items-center gap-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {q.conditions.operator}
                          </Badge>
                          <span className="text-muted-foreground">
                            {q.conditions.clauses?.length ?? 0} {(q.conditions.clauses?.length ?? 0) !== 1 ? t('quest.clausesCount') : t('quest.clauseCount')}
                          </span>
                        </span>) : (<span className="text-muted-foreground text-xs">—</span>)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.rewards?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.metadata?.override_game_delivery === true ? (q.metadata?.reward_delivery === "direct" ? (<Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" title={t('quest.delivery.overridesGame')}>
                            <Zap className="h-3 w-3"/>
                            {t('quest.delivery.modeDirect')}
                          </Badge>) : (<Badge variant="outline" className="gap-1 text-xs text-green-700 border-green-500/40 bg-green-50 dark:bg-green-900/20 dark:text-green-400" title={t('quest.delivery.overridesGame')}>
                            <Mail className="h-3 w-3"/>
                            {t('quest.delivery.modeMailbox')}
                          </Badge>)) : (<Badge variant="outline" className="text-xs text-muted-foreground">
                          {t('quest.delivery.defaultLabel')}
                        </Badge>)}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch id={`quest-list-item-active-toggle-${q.id}`} className="quest-list-item-active-toggle" checked={q.is_active} onCheckedChange={() => toggleActive(q)}/>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button id={`quest-list-item-edit-btn-${q.id}`} size="icon" variant="ghost" className="quest-list-item-edit-btn h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(q); }}>
                          <Pencil className="h-4 w-4"/>
                        </Button>
                        <Button id={`quest-list-item-delete-btn-${q.id}`} size="icon" variant="ghost" className="quest-list-item-delete-btn h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteQuest(q); }}>
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expanded detail row */}
                  {expandedQuestId === q.id && (<TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={8} className="p-0">
                        <div className="px-6 py-4 space-y-4 border-t border-dashed">
                          {/* Row 1: Quest ID + Description */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">{t('quest.questId')}</p>
                              <div className="flex items-center gap-1">
                                <p className="font-mono text-xs break-all">{q.id}</p>
                                <CopyButton text={q.id} size="h-3 w-3"/>
                              </div>
                            </div>
                            {q.description && (<div>
                                <p className="text-xs text-muted-foreground mb-0.5">{t('quest.description')}</p>
                                <p className="text-sm">{q.description}</p>
                              </div>)}
                          </div>

                          {/* Two-column layout: [Conditions + Rewards] | [Reward Delivery] */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div className="space-y-4">
                          {/* Conditions */}
                          {q.conditions && q.conditions.clauses?.length > 0 && (<div>
                              <p className="text-xs text-muted-foreground mb-1">{t('quest.conditions')} <Badge variant="outline" className="ml-1 font-mono text-xs">{q.conditions.operator}</Badge></p>
                              <div className="space-y-1.5">
                                {q.conditions.clauses.map((clause, ci) => {
                            if (!isConditionLeaf(clause)) {
                                return <div key={ci} className="text-xs text-muted-foreground border rounded px-2 py-1">{t('quest.nestedGroup')} ({(clause as QuestConditionGroup).operator})</div>;
                            }
                            const typeOpt = KNOWN_CONDITION_TYPES.find(o => o.value === clause.type);
                            const typeLabel = typeOpt ? t(typeOpt.labelKey) : clause.type;
                            return (<div key={ci} className="border rounded px-3 py-2 bg-background text-sm space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                                        <span className="font-mono text-xs text-muted-foreground">{clause.clause_id}</span>
                                      </div>
                                      {/* Items for collect_and_keep / collect_and_submit / not_have_item */}
                                      {clause.items && clause.items.length > 0 && (<div className="pl-2 space-y-0.5">
                                          {clause.items.map((item, ii) => {
                                        const def = rowItemDefs.find(d => d.id === item.item_definition_id);
                                        return (<div key={ii} className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground">•</span>
                                                <span className="font-medium">{def?.name ?? item.item_definition_id}</span>
                                                {def && <span className="text-muted-foreground font-mono">({def.item_code})</span>}
                                                <span className="text-muted-foreground">× {item.quantity}</span>
                                                <Link href={`/games/${gameId}/items/${item.item_definition_id}`} target="_blank" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()} title={t('quest.openItemDef')}>
                                                  <ExternalLink className="h-3 w-3"/>
                                                </Link>
                                              </div>);
                                    })}
                                        </div>)}
                                      {/* Gacha pack */}
                                      {clause.packs && clause.packs.gacha_pack_id && (<div className="pl-2 text-xs flex items-center gap-2">
                                          <span className="text-muted-foreground">•</span>
                                          <span className="font-medium">
                                            {rowGachaPacks.find(p => p.id === clause.packs?.gacha_pack_id)?.name ?? clause.packs.gacha_pack_id}
                                          </span>
                                          <span className="text-muted-foreground">× {clause.packs.quantity}</span>
                                          <Link href={`/games/${gameId}/items?tab=gacha&editPack=${clause.packs.gacha_pack_id}`} target="_blank" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()} title={t('quest.openGachaPack')}>
                                            <ExternalLink className="h-3 w-3"/>
                                          </Link>
                                        </div>)}
                                      {/* Target for login etc */}
                                      {clause.target != null && (<div className="pl-2 text-xs text-muted-foreground">{t('quest.target')} {clause.target}</div>)}
                                    </div>);
                        })}
                              </div>
                            </div>)}

                          {/* Rewards (item rewards only — coin rewards no longer supported) */}
                          {(() => {
                        const itemRewards = (q.rewards ?? []).filter(r => r.reward_type === "item");
                        if (itemRewards.length === 0)
                            return null;
                        return (<div>
                                <p className="text-xs text-muted-foreground mb-1">{t('quest.rewards')} ({itemRewards.length})</p>
                                <div className="space-y-1">
                                  {itemRewards.map((r, ri) => (<div key={ri} className="border rounded px-3 py-2 bg-background text-sm flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs capitalize">{r.reward_type}</Badge>
                                      {r.item_definition_id && (() => {
                                    const def = rowItemDefs.find(d => d.id === r.item_definition_id);
                                    return (<span className="flex items-center gap-1.5 text-xs">
                                            <span className="font-medium">{def?.name ?? r.item_definition_id}</span>
                                            {def && <span className="text-muted-foreground font-mono">({def.item_code})</span>}
                                            <span className="text-muted-foreground">
                                              {r.quantity_min ?? 1}{r.quantity_max && r.quantity_max !== r.quantity_min ? `–${r.quantity_max}` : ""}
                                            </span>
                                            <Link href={`/games/${gameId}/items/${r.item_definition_id}`} target="_blank" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()} title={t('quest.openItemDef')}>
                                              <ExternalLink className="h-3 w-3"/>
                                            </Link>
                                          </span>);
                                })()}
                                    </div>))}
                                </div>
                              </div>);
                    })()}

                          </div>

                          {/* Right column: Reward delivery override */}
                          {game && (<div>
                              <QuestDeliveryOverride quest={q} game={game} onUpdated={(updated) => setQuests((prev) => prev.map((qd) => (qd.id === updated.id ? updated : qd)))}/>
                            </div>)}
                          </div>

                          {/* Timestamps */}
                          <div className="flex gap-6 text-xs text-muted-foreground">
                            <span>{t('quest.created')} {new Date(q.created_at).toLocaleString()}</span>
                            <span>{t('quest.updated')} {new Date(q.updated_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>)}
                  </React.Fragment>))}
              </TableBody>
            </Table>)}
          {quests.length > 0 && !loading && (
            <div className="p-4 flex flex-col items-center justify-center border-t gap-3">
              {hasNextPage && (
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore} 
                  disabled={loadingMore}
                >
                  {loadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('common.loadMore')}
                </Button>
              )}
              <p className="text-sm text-muted-foreground">
                {`${filteredQuests.length} ${t('quest.ofQuests')} ${totalQuests} ${totalQuests !== 1 ? t('quest.questDefinitions') : t('quest.questDefinition')}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => {
            if (open)
                setCreateOpen(true);
            else
                closeCreate();
        }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('quest.createQuestDef')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{QuestForm}</div>
          <SheetFooter className="mt-6 sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch id="qactive-create" checked={form.is_active ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}/>
              <Label htmlFor="qactive-create">{t('quest.active')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="outline" disabled={saving} onClick={() => setCreateQuestConvContext(null)}>{t('common.cancel')}</Button>
              </SheetClose>
              <Button onClick={handleCreate} disabled={saving || !form.name.trim() || !(form.code_name ?? "").trim() || (form.conditions?.clauses ?? []).some((c) => isConditionLeaf(c) && !c.clause_id.trim())}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin"/>}
                {t('common.submit')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editQuest} onOpenChange={(o) => {
            if (!o)
                closeEdit();
        }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('quest.editQuestDef')}</SheetTitle>
            {editQuest && (<p className="flex items-center gap-0.5 text-xs text-muted-foreground font-mono mt-0.5">
                {editQuest.id}
                <CopyButton text={editQuest.id} size="h-3 w-3"/>
              </p>)}
          </SheetHeader>
          <div className="mt-6">{QuestForm}</div>
          <SheetFooter className="mt-6 sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch id="qactive-edit" checked={form.is_active ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}/>
              <Label htmlFor="qactive-edit">{t('quest.active')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="outline" disabled={saving}>{t('common.cancel')}</Button>
              </SheetClose>
              <Button onClick={handleEdit} disabled={saving || !form.name.trim() || !(form.code_name ?? "").trim() || (form.conditions?.clauses ?? []).some((c) => isConditionLeaf(c) && !c.clause_id.trim())}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin"/>}
                {t('common.save')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteQuest} onOpenChange={(o) => {
            if (!o)
                setDeleteQuest(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quest.deleteQuest')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('quest.deleteQuestConfirm')} <strong>{deleteQuest?.name}</strong>{t('quest.deleteQuestUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin"/>}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);
}
// ─── Coming Soon Panel ─────────────────────────────────────────────────────────
function ComingSoon({ title }: {
    title: string;
}) {
    const { t } = useTranslation();
    return (<div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
      <Clock className="h-12 w-12 opacity-30"/>
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm opacity-70">{t('quest.comingSoon')}</p>
    </div>);
}
// ─── Inner Page (needs useSearchParams) ───────────────────────────────────────
function QuestsPageInner() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const gameId = params.id as string;
    const { toast } = useToast();
    const rawTab = searchParams.get("tab") ?? "";
    const activeTab: TabValue = VALID_TABS.has(rawTab) ? (rawTab as TabValue) : "definitions";
    const [game, setGame] = useState<Game | null>(null);
    const [studio, setStudio] = useState<Studio | null>(null);
    const [gameLoading, setGameLoading] = useState(true);
    useEffect(() => {
        setGameLoading(true);
        getGame(gameId)
            .then(async (g) => {
            setGame(g);
            if (g.studio_id) {
                try {
                    const s = await fetchStudioWithCache(g.studio_id);
                    setStudio(s);
                }
                catch {
                    // ignore
                }
            }
        })
            .catch(() => toast({ variant: "destructive", title: t('common.error'), description: t('quest.failedLoadGame') }))
            .finally(() => setGameLoading(false));
    }, [gameId, toast]);
    const handleTabChange = (value: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (value === "definitions") {
            sp.delete("tab");
        }
        else {
            sp.set("tab", value);
        }
        const qs = sp.toString();
        router.push(`/games/${gameId}/quests${qs ? `?${qs}` : ""}`);
    };
    return (<div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/studios">{t('common.studios')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            {game?.studio_id && (<>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/studios/${game.studio_id}`}>
                    {studio?.name || game.studio?.name || t('common.studio')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
              </>)}
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>
                {gameLoading ? gameId : (game?.name ?? gameId)}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="">{t('quest.quests')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}`)}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5"/>
              <h1 className="text-2xl font-bold">{t('quest.quests')}</h1>
            </div>
            {game && (<p className="text-sm text-muted-foreground flex items-center gap-2">
                {game.limits?.max_quests != null ? (() => {
                const used = game.usage?.quests ?? 0;
                const max = game.limits.max_quests!;
                const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
                return (<>
                      <span className={used >= max ? "text-destructive font-medium" : ""}>
                        {used.toLocaleString()} / {max.toLocaleString()} {t('quest.questsCount')}
                      </span>
                      <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                        <span className={`block h-full rounded-full transition-all ${used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
                      </span>
                      <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title={t('quest.managePlugins')}>
                        <Hammer className="h-3.5 w-3.5"/>
                      </Link>
                    </>);
            })() : <span>{game.name}</span>}
              </p>)}
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="quests"/>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((tab) => (<TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>))}
        </TabsList>

        <TabsContent value="definitions" className="mt-6 space-y-4">
          <DefinitionsTab game={game} editQuestId={searchParams.get("editQuestId")} onGameUpdate={setGame}/>
        </TabsContent>

        <TabsContent value="chains" className="mt-6 space-y-4">
          <ChainTab game={game}/>
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <DailyTab game={game} onGameUpdate={setGame}/>
        </TabsContent>

        <TabsContent value="battle-pass" className="mt-6">
          <ComingSoon title="Battle Pass"/>
        </TabsContent>

        <TabsContent value="world-quest" className="mt-6">
          <ComingSoon title="World Quest"/>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab game={game} onGameUpdate={setGame}/>
        </TabsContent>
      </Tabs>
      </div>
    </div>);
}
// ─── Default export (wrapped in Suspense for useSearchParams) ─────────────────
export default function QuestsPage() {
    return (<Suspense>
      <QuestsPageInner />
    </Suspense>);
}
