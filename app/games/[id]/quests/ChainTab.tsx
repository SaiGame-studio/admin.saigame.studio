"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { toSlugUnderscore } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Search, Trash2, Pencil, Loader2, Eye, EyeOff, ChevronDown, ChevronRight, Wand2, Link2, ArrowRight, GitBranch, ArrowDownRight, Layers, X, ChevronsUpDown, Check, List, LayoutGrid, Copy, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChainFlowView } from "./ChainFlowView";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/storage-utils";
import type { Game } from "@/types/game";
import { listQuestChains, createQuestChain, updateQuestChain, deleteQuestChain, listQuestDefinitions, listChainMembers, addChainMember, updateChainMember, removeChainMember, type QuestChain, type QuestChainMember, type ChainType, type ChainContentType, type CreateQuestChainRequest, type UpdateQuestChainRequest, type QuestDefinition, type AddChainMemberRequest, type UpdateChainMemberRequest, } from "@/lib/quest-api";
// ─── Constants ────────────────────────────────────────────────────────────────
function chainTypeBadgeVariant(type: ChainType) {
    switch (type) {
        case "linear": return "default" as const;
        case "branching": return "secondary" as const;
        case "parallel": return "outline" as const;
        default: return "outline" as const;
    }
}
function toSlugKey(str: string) {
    return toSlugUnderscore(str);
}
function expandedQuestChainStorageKey(gameId: string) {
    return `ss_quests_chain_expanded_${gameId}`;
}

function chainContentLabel(type: ChainContentType | undefined, t: (key: string) => string) {
    switch (type) {
        case "full_one_time": return t("quest.chain.contentFullOneTime");
        case "full_session": return t("quest.chain.contentFullSession");
        case "mix": return t("quest.chain.contentMix");
        default: return null;
    }
}

function isQuestAssignedToPool(quest: QuestDefinition) {
    return quest.type_config?.pool_assigned === true;
}
// ─── Unlock Quest IDs Picker ──────────────────────────────────────────────────
function UnlockQuestIdsPicker({ value, onChange, chainMembers, allQuestDefs, questDefsMap, excludeQuestId, }: {
    value: string[];
    onChange: (ids: string[]) => void;
    chainMembers: QuestChainMember[];
    allQuestDefs: QuestDefinition[];
    questDefsMap: Record<string, QuestDefinition>;
    excludeQuestId?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const available = chainMembers
        .filter((m) => m.quest_definition_id !== excludeQuestId)
        .map((m) => ({
        id: m.quest_definition_id,
        name: questDefsMap[m.quest_definition_id]?.name ?? m.quest_definition_id.slice(0, 8) + "…",
        inChain: true,
    }));
    const memberIds = new Set(chainMembers.map((m) => m.quest_definition_id));
    const extraQuests = allQuestDefs
        .filter((q) => !memberIds.has(q.id) && q.id !== excludeQuestId && q.quest_type !== 'daily')
        .map((q) => ({ id: q.id, name: q.name, inChain: false }));
    const allOptions = [...available, ...extraQuests];
    const unselected = allOptions.filter((o) => !value.includes(o.id));
    return (<div className="space-y-2">
      <Label>{t('quest.chain.unlockQuestIds')}</Label>
      <p className="text-xs text-muted-foreground">{t('quest.chain.unlockQuestIdsDesc')}</p>
      {value.length > 0 && (<div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
                const name = questDefsMap[id]?.name ?? id.slice(0, 8) + "…";
                return (<Badge key={id} variant="secondary" className="text-xs gap-1 pr-1">
                {name}
                <button type="button" className="ml-0.5 hover:text-destructive" onClick={() => onChange(value.filter((v) => v !== id))}>
                  <X className="h-3 w-3"/>
                </button>
              </Badge>);
            })}
        </div>)}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 text-sm font-normal">
            <span className="text-muted-foreground">{t('quest.chain.addQuestToUnlock')}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
          <Command>
            <CommandInput placeholder={t('quest.chain.searchQuests')}/>
            <CommandList>
              <CommandEmpty>{t('quest.chain.noQuestsFound')}</CommandEmpty>
              {unselected.filter((o) => o.inChain).length > 0 && (<CommandGroup heading={t('quest.chain.inThisChain')}>
                  {unselected.filter((o) => o.inChain).map((o) => (<CommandItem key={o.id} value={`${o.name} ${o.id}`} onSelect={() => {
                    onChange([...value, o.id]);
                    setOpen(false);
                }}>
                      {o.name}
                    </CommandItem>))}
                </CommandGroup>)}
              {unselected.filter((o) => !o.inChain).length > 0 && (<CommandGroup heading={t('quest.chain.otherQuests')}>
                  {unselected.filter((o) => !o.inChain).map((o) => (<CommandItem key={o.id} value={`${o.name} ${o.id}`} onSelect={() => {
                    onChange([...value, o.id]);
                    setOpen(false);
                }}>
                      {o.name}
                    </CommandItem>))}
                </CommandGroup>)}
              {unselected.length === 0 && (<div className="px-2 py-1.5 text-sm text-muted-foreground">{t('quest.chain.noQuestsAvailable')}</div>)}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>);
}
// ─── Chain Tab (exported) ─────────────────────────────────────────────────────
export function ChainTab({ game }: {
    game: Game | null;
}) {
    const gameId = game?.id ?? "";
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { t } = useTranslation();
    const { user } = useAuth();
    const CHAIN_TYPE_OPTIONS = useMemo(() => [
        { value: "linear" as ChainType, label: t('quest.chain.typeLinear'), icon: <ArrowRight className="h-4 w-4"/>, description: t('quest.chain.typeLinearDesc') },
        { value: "branching" as ChainType, label: t('quest.chain.typeBranching'), icon: <GitBranch className="h-4 w-4"/>, description: t('quest.chain.typeBranchingDesc') },
        { value: "parallel" as ChainType, label: t('quest.chain.typeParallel'), icon: <Layers className="h-4 w-4"/>, description: t('quest.chain.typeParallelDesc') },
    ], [t]);
    // ── State ─────────────────────────────────────────────────────────────────
    const [chains, setChains] = useState<QuestChain[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chainSearch, setChainSearch] = useState(() => searchParams.get("search") ?? "");
    const [copiedChainId, setCopiedChainId] = useState<string | null>(null);
    // Expanded chain detail
    const [expandedChainId, setExpandedChainId] = useState<string | null>(null);
    const hasRestoredExpandedChain = useRef(false);
    const [expandedChain, setExpandedChain] = useState<QuestChain | null>(null);
    const [expandedMembers, setExpandedMembers] = useState<QuestChainMember[]>([]);
    const [expandedLoading, setExpandedLoading] = useState(false);
    const [memberCountMap, setMemberCountMap] = useState<Record<string, number>>({});
    // Quest definitions lookup
    const [questDefsMap, setQuestDefsMap] = useState<Record<string, QuestDefinition>>({});
    const [allQuestDefs, setAllQuestDefs] = useState<QuestDefinition[]>([]);
    // Shared index of quests assigned to any chain. Every chain uses this list
    // so a quest disappears from all available-quest pickers immediately.
    const [assignedQuestIds, setAssignedQuestIds] = useState<Set<string>>(new Set());
    // Create / Edit chain
    const [createOpen, setCreateOpen] = useState(false);
    const [editChain, setEditChain] = useState<QuestChain | null>(null);
    const [chainForm, setChainForm] = useState<CreateQuestChainRequest>({
        chain_key: "",
        display_name: "",
        description: "",
        chain_type: "linear",
        is_active: false,
    });
    const [chainSaving, setChainSaving] = useState(false);
    const [autoSlug, setAutoSlug] = useState(true);
    // Delete chain
    const [deleteTarget, setDeleteTarget] = useState<QuestChain | null>(null);
    const [deleteDeleting, setDeleteDeleting] = useState(false);
    // Add member to chain
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [addMemberChainId, setAddMemberChainId] = useState<string | null>(null);
    const [addMemberForm, setAddMemberForm] = useState<AddChainMemberRequest>({
        quest_definition_id: "",
        sort_order: 0,
        unlock_quest_ids: [],
    });
    const [addMemberSaving, setAddMemberSaving] = useState(false);
    // Edit member
    const [editMemberOpen, setEditMemberOpen] = useState(false);
    const [editMemberTarget, setEditMemberTarget] = useState<QuestChainMember | null>(null);
    const [editMemberForm, setEditMemberForm] = useState<UpdateChainMemberRequest>({
        sort_order: 0,
        unlock_quest_ids: [],
    });
    const [editMemberSaving, setEditMemberSaving] = useState(false);
    // Remove member
    const [removeMemberTarget, setRemoveMemberTarget] = useState<{
        chainId: string;
        questId: string;
        questName: string;
    } | null>(null);
    const [removeMemberDeleting, setRemoveMemberDeleting] = useState(false);
    const hasFetched = useRef(false);
    // ── Load quest definitions for name lookup ────────────────────────────────
    const loadQuestDefsMap = useCallback(async () => {
        if (!game)
            return;
        try {
            const data = await listQuestDefinitions(gameId, { limit: 500 });
            const defs = Array.isArray(data) ? data : (data as any).quests ?? [];
            const map: Record<string, QuestDefinition> = {};
            for (const d of defs)
                map[d.id] = d;
            setQuestDefsMap(map);
            setAllQuestDefs(defs);
        }
        catch {
            // non-critical
        }
    }, [game, gameId]);
    // ── Load chains ───────────────────────────────────────────────────────────
    const loadChains = useCallback(async (searchTerm = chainSearch) => {
        if (!game)
            return [] as QuestChain[];
        try {
            const data = await listQuestChains(gameId, { limit: 200, search: searchTerm });
            const nextChains = data.chains ?? [];
            setChains(nextChains);
            return nextChains;
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : "Failed to load quest chains";
            setError(msg);
            return [] as QuestChain[];
        }
    }, [game, gameId, chainSearch]);
    useEffect(() => {
        if (!game || hasFetched.current)
            return;
        hasFetched.current = true;
        setLoading(true);
        Promise.all([loadChains(), loadQuestDefsMap()]).finally(() => setLoading(false));
    }, [game, loadChains, loadQuestDefsMap]);
    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        await Promise.all([loadChains(), loadQuestDefsMap()]);
        setRefreshing(false);
    };
    // ── Load chain members (expand) ───────────────────────────────────────────
    const loadChainMembers = useCallback(async (chainId: string) => {
        try {
            const membersData = await listChainMembers(gameId, chainId);
            // Use chain from already-loaded list instead of a separate GET
            const chain = chains.find((c) => c.id === chainId) ?? null;
            setExpandedChain(chain);
            const members = (membersData.members ?? []).sort((a, b) => a.sort_order - b.sort_order);
            setExpandedMembers(members);
            setAssignedQuestIds((prev) => {
                const next = new Set(prev);
                members.forEach((member) => next.add(member.quest_definition_id));
                return next;
            });
            setMemberCountMap((prev) => ({ ...prev, [chainId]: members.length }));
        }
        catch {
            toast({ variant: "destructive", title: t('common.error'), description: t('quest.chain.failedUpdateChain') });
            setExpandedChainId(null);
        }
    }, [gameId, toast, chains]);
    const loadChainsRef = useRef(loadChains);
    const loadChainMembersRef = useRef(loadChainMembers);
    loadChainsRef.current = loadChains;
    loadChainMembersRef.current = loadChainMembers;
    const chainSearchEffectReady = useRef(false);
    useEffect(() => {
        if (!hasFetched.current)
            return;
        if (!chainSearchEffectReady.current) {
            chainSearchEffectReady.current = true;
            if (!chainSearch.trim())
                return;
        }
        const timer = window.setTimeout(() => {
            void (async () => {
                const results = await loadChainsRef.current(chainSearch);
                if (chainSearch.trim() && results.length === 1) {
                    const chainId = results[0].id;
                    setExpandedChainId(chainId);
                    setExpandedLoading(true);
                    try {
                        await loadChainMembersRef.current(chainId);
                        setExpandedChain(results[0]);
                    }
                    finally {
                        setExpandedLoading(false);
                    }
                }
            })();
        }, 300);
        return () => window.clearTimeout(timer);
    }, [chainSearch]);
    const toggleExpand = async (chainId: string) => {
		const storageKey = expandedQuestChainStorageKey(gameId);
        if (expandedChainId === chainId) {
            setExpandedChainId(null);
            safeRemoveItem(storageKey);
            setExpandedChain(null);
            setExpandedMembers([]);
            return;
        }
        setExpandedChainId(chainId);
        safeSetItem(storageKey, chainId);
        setExpandedChain(null);
        setExpandedMembers([]);
        setExpandedLoading(true);
        try {
            await loadChainMembers(chainId);
        }
        finally {
            setExpandedLoading(false);
        }
    };
    const refreshExpanded = async (chainId: string) => {
        try {
            await loadChainMembers(chainId);
        }
        catch {
            // silent
        }
    };
    // ── Create / Edit chain ───────────────────────────────────────────────────
    const openCreate = () => {
        setEditChain(null);
        setChainForm({
            chain_key: "",
            display_name: "",
            description: "",
            chain_type: "linear",
            is_active: false,
        });
        setAutoSlug(true);
        setCreateOpen(true);
    };
    const openEdit = (chain: QuestChain) => {
        setEditChain(chain);
        setChainForm({
            chain_key: chain.chain_key,
            display_name: chain.display_name,
            description: chain.description ?? "",
            chain_type: chain.chain_type,
            is_active: chain.is_active,
        });
        setAutoSlug(false);
        setCreateOpen(true);
    };
    const handleSaveChain = async () => {
        if (!chainForm.display_name.trim()) {
            toast({ variant: "destructive", title: t('quest.chain.validationError'), description: t('quest.chain.displayNameRequired') });
            return;
        }
        if (!chainForm.chain_key.trim()) {
            toast({ variant: "destructive", title: t('quest.chain.validationError'), description: t('quest.chain.chainKeyRequired') });
            return;
        }
        setChainSaving(true);
        try {
            if (editChain) {
                const patch: UpdateQuestChainRequest = {};
                if (chainForm.display_name !== editChain.display_name)
                    patch.display_name = chainForm.display_name;
                if ((chainForm.description ?? "") !== (editChain.description ?? ""))
                    patch.description = chainForm.description;
                if (chainForm.chain_type !== editChain.chain_type)
                    patch.chain_type = chainForm.chain_type;
                if (chainForm.is_active !== editChain.is_active)
                    patch.is_active = chainForm.is_active;
                await updateQuestChain(gameId, editChain.id, patch);
                toast({ title: t('quest.chain.chainUpdated') });
            }
            else {
                await createQuestChain(gameId, chainForm);
                toast({ title: t('quest.chain.chainCreated') });
            }
            setCreateOpen(false);
            await loadChains();
            if (expandedChainId)
                await refreshExpanded(expandedChainId);
        }
        catch (e) {
            toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.chain.failedSaveChain') });
        }
        finally {
            setChainSaving(false);
        }
    };
    // ── Delete chain ──────────────────────────────────────────────────────────
    const handleDeleteChain = async () => {
        if (!deleteTarget)
            return;
        setDeleteDeleting(true);
        try {
            await deleteQuestChain(gameId, deleteTarget.id);
            toast({ title: t('quest.chain.chainDeleted') });
            setDeleteTarget(null);
            if (expandedChainId === deleteTarget.id) {
                setExpandedChainId(null);
                safeRemoveItem(expandedQuestChainStorageKey(gameId));
                setExpandedChain(null);
                setExpandedMembers([]);
            }
            await loadChains();
        }
        catch (e) {
            toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.chain.failedDeleteChain') });
        }
        finally {
            setDeleteDeleting(false);
        }
    };
    // ── Toggle active ─────────────────────────────────────────────────────────
    const handleToggleActive = async (chain: QuestChain, checked: boolean) => {
        try {
            await updateQuestChain(gameId, chain.id, { is_active: checked });
            setChains((prev) => prev.map((c) => c.id === chain.id ? { ...c, is_active: checked } : c));
            if (expandedChain?.id === chain.id)
                setExpandedChain((prev) => prev ? { ...prev, is_active: checked } : prev);
            toast({ title: checked ? t('quest.chain.chainActivated') : t('quest.chain.chainDeactivated') });
        }
        catch (e) {
            toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.chain.failedUpdateChain') });
        }
    };
    // ── Add member to chain ───────────────────────────────────────────────────
    const openAddMember = (chainId: string) => {
        setAddMemberChainId(chainId);
        const nextSort = expandedMembers.length > 0
            ? Math.max(...expandedMembers.map((m) => m.sort_order)) + 1
            : 0;
        setAddMemberForm({
            quest_definition_id: "",
            sort_order: nextSort,
            unlock_quest_ids: [],
        });
        setAddMemberOpen(true);
    };
    const getAvailableQuests = (): QuestDefinition[] => {
        return allQuestDefs.filter((q) => !assignedQuestIds.has(q.id) && q.quest_type !== 'daily' && !isQuestAssignedToPool(q));
    };
	useEffect(() => {
		if (loading || hasRestoredExpandedChain.current || !gameId || chainSearch.trim())
			return;
		hasRestoredExpandedChain.current = true;
		const storedChainId = safeGetItem(expandedQuestChainStorageKey(gameId));
		if (!storedChainId)
			return;
		if (!chains.some((chain) => chain.id === storedChainId)) {
			safeRemoveItem(expandedQuestChainStorageKey(gameId));
			return;
		}
		void toggleExpand(storedChainId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, chains, chainSearch, gameId]);
    const handleAddMember = async () => {
        if (!addMemberChainId || !addMemberForm.quest_definition_id) {
            toast({ variant: "destructive", title: t('quest.chain.validationError'), description: t('quest.chain.selectQuestDef') });
            return;
        }
        setAddMemberSaving(true);
        try {
            await addChainMember(gameId, addMemberChainId, addMemberForm);
            setAssignedQuestIds((prev) => new Set(prev).add(addMemberForm.quest_definition_id));
            toast({ title: t('quest.chain.questAddedToChain') });
            setAddMemberOpen(false);
            await Promise.all([refreshExpanded(addMemberChainId), loadQuestDefsMap(), loadChains()]);
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 409) {
                toast({ variant: "destructive", title: t('quest.chain.alreadyInChain'), description: t('quest.chain.alreadyInChainDesc') });
            }
            else {
                toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.chain.failedAddQuest') });
            }
        }
        finally {
            setAddMemberSaving(false);
        }
    };
    // ── Edit member ───────────────────────────────────────────────────────────
    const openEditMember = (member: QuestChainMember) => {
        setEditMemberTarget(member);
        setEditMemberForm({
            sort_order: member.sort_order,
            unlock_quest_ids: [...member.unlock_quest_ids],
        });
        setEditMemberOpen(true);
    };
    const handleEditMember = async () => {
        if (!editMemberTarget || !expandedChainId)
            return;
        setEditMemberSaving(true);
        try {
            await updateChainMember(gameId, expandedChainId, editMemberTarget.quest_definition_id, editMemberForm);
            toast({ title: t('quest.chain.memberUpdated') });
            setEditMemberOpen(false);
            await refreshExpanded(expandedChainId);
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 404) {
                toast({ variant: "destructive", title: t('quest.chain.notFound'), description: t('quest.chain.memberNotFound') });
            }
            else {
                toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.chain.failedUpdateMember') });
            }
        }
        finally {
            setEditMemberSaving(false);
        }
    };
    // ── Remove member ─────────────────────────────────────────────────────────
    const handleRemoveMember = async () => {
        if (!removeMemberTarget)
            return;
        setRemoveMemberDeleting(true);
        try {
            await removeChainMember(gameId, removeMemberTarget.chainId, removeMemberTarget.questId);
            setAssignedQuestIds((prev) => {
                const next = new Set(prev);
                next.delete(removeMemberTarget.questId);
                return next;
            });
            toast({ title: t('quest.chain.questRemovedFromChain') });
            setRemoveMemberTarget(null);
            if (expandedChainId)
                await refreshExpanded(expandedChainId);
            await Promise.all([loadChains(), loadQuestDefsMap()]);
        }
        catch (e) {
            if (e instanceof ApiError && e.status === 404) {
                toast({ variant: "destructive", title: t('quest.chain.notFound'), description: t('quest.chain.memberNotFound') });
                setRemoveMemberTarget(null);
                if (expandedChainId)
                    await refreshExpanded(expandedChainId);
            }
            else {
                toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.chain.failedRemoveQuest') });
            }
        }
        finally {
            setRemoveMemberDeleting(false);
        }
    };
    // ── Navigate to quest edit in definitions tab ─────────────────────────────
    const navigateToQuestEdit = (questId: string) => {
        router.push(`/games/${gameId}/quests?editQuestId=${encodeURIComponent(questId)}`);
    };
    // ── Render ────────────────────────────────────────────────────────────────
    if (!game)
        return null;
    return (<div id="quest-chains-tab" className="quest-chains-tab space-y-4">
      {/* Header */}
      <div id="quest-chain-header" className="quest-chain-header flex items-center justify-between">
        <div id="quest-chain-header-copy" className="quest-chain-header-copy">
          <h2 id="quest-chain-title" className="quest-chain-title text-lg font-semibold">{t('quest.chain.headerTitle')}</h2>
        </div>
        <div id="quest-chain-header-actions" className="quest-chain-header-actions flex items-center gap-2">
          <div id="quest-chain-search" className="quest-chain-search relative w-64">
            <Search id="quest-chain-search-icon" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input id="quest-chain-search-input" value={chainSearch} onChange={(event) => setChainSearch(event.target.value)} placeholder={t("quest.chain.searchByNameCodeId")} className="pl-9 pr-8" />
            {chainSearch && (
              <button id="quest-chain-search-clear" type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setChainSearch("")} title={t("common.clear")}>
                <X id="quest-chain-search-clear-icon" className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button id="quest-chain-refresh" variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} title={t('quest.chain.refresh')}>
            <RefreshCw id="quest-chain-refresh-icon" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>
          </Button>
          <Button id="quest-chain-create" size="sm" onClick={openCreate}>
            <Plus id="quest-chain-create-icon" className="h-4 w-4 mr-1"/> {t('quest.chain.newChain')}
          </Button>
        </div>
      </div>

      {error && (<Alert id="quest-chain-error" className="quest-chain-error" variant="destructive">
          <AlertDescription id="quest-chain-error-message">{error}</AlertDescription>
        </Alert>)}

      {/* Loading */}
      {loading ? (<div id="quest-chain-loading" className="quest-chain-loading flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 id="quest-chain-loading-icon" className="h-5 w-5 animate-spin"/> {t('quest.chain.loadingChains')}
        </div>) : chains.length === 0 ? (<Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Link2 className="h-10 w-10 opacity-30"/>
            <p className="text-sm">{t('quest.chain.noChains')}</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1"/> {t('quest.chain.createChain')}
            </Button>
          </CardContent>
        </Card>) : (<div id="quest-chain-list" className="quest-chain-list space-y-3">
          {chains.map((chain) => {
                const isExpanded = expandedChainId === chain.id;
                return (<Card id={`quest-chain-card-${chain.id}`} key={chain.id} className={`quest-chain-card ${isExpanded ? "border-primary/40" : ""}`}>
                <CardHeader id={`quest-chain-card-header-${chain.id}`} className="quest-chain-card-header p-4">
                  <div id={`quest-chain-summary-${chain.id}`} className="quest-chain-summary flex items-center gap-3">
                    {/* Expand toggle */}
                    <Button id={`quest-chain-expand-${chain.id}`} variant="ghost" size="icon" className="quest-chain-expand h-7 w-7 shrink-0" onClick={() => toggleExpand(chain.id)}>
                      {isExpanded ? <ChevronDown id={`quest-chain-collapse-icon-${chain.id}`} className="h-4 w-4"/> : <ChevronRight id={`quest-chain-expand-icon-${chain.id}`} className="h-4 w-4"/>}
                    </Button>

                    {/* Info */}
                    <div id={`quest-chain-info-${chain.id}`} className="quest-chain-info flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(chain.id)}>
                      <div id={`quest-chain-badges-${chain.id}`} className="quest-chain-badges flex items-center gap-2 flex-wrap">
                        <CardTitle id={`quest-chain-name-${chain.id}`} className="quest-chain-name text-base">{chain.display_name}</CardTitle>
                        <Badge variant={chainTypeBadgeVariant(chain.chain_type)} className="text-xs">
                          {CHAIN_TYPE_OPTIONS.find((o) => o.value === chain.chain_type)?.label ?? chain.chain_type}
                        </Badge>
                        {chainContentLabel(chain.type_config?.content_type, t) && (
                          <Badge variant="outline" className="text-xs">
                            {chainContentLabel(chain.type_config?.content_type, t)}
                          </Badge>
                        )}
                        {chain.is_active ? (<Badge variant="default" className="text-xs bg-green-600">{t('quest.activeStatus')}</Badge>) : (<Badge variant="secondary" className="text-xs">{t('quest.inactiveStatus')}</Badge>)}
                        {chain.description && (<span className="text-sm text-muted-foreground truncate max-w-sm" title={chain.description}>
                            {chain.description.length > 250 ? chain.description.slice(0, 250) + "…" : chain.description}
                          </span>)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">{chain.id}</span>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" title={t('quest.chain.copyChainId')} onClick={(e) => {
                        e.stopPropagation();
                        const text = chain.id;
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(text).catch(() => {
                                const el = document.createElement('textarea');
                                el.value = text;
                                el.style.position = 'fixed';
                                el.style.opacity = '0';
                                document.body.appendChild(el);
                                el.focus();
                                el.select();
                                document.execCommand('copy');
                                document.body.removeChild(el);
                            });
                        }
                        else {
                            const el = document.createElement('textarea');
                            el.value = text;
                            el.style.position = 'fixed';
                            el.style.opacity = '0';
                            document.body.appendChild(el);
                            el.focus();
                            el.select();
                            document.execCommand('copy');
                            document.body.removeChild(el);
                        }
                        setCopiedChainId(chain.id);
                        setTimeout(() => setCopiedChainId(null), 1500);
                    }}>
                            {copiedChainId === chain.id
                        ? <Check className="h-3 w-3 text-green-500"/>
                        : <Copy className="h-3 w-3"/>}
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">·</span>
                        <div id={`quest-chain-key-${chain.id}`} className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">{chain.chain_key}</span>
                          <button id={`quest-chain-copy-key-${chain.id}`} type="button" className="text-muted-foreground hover:text-foreground transition-colors" title={t('quest.chain.copyChainKey')} onClick={(e) => {
                            e.stopPropagation();
                            const text = chain.chain_key;
                            const fallbackCopy = () => {
                              const el = document.createElement('textarea');
                              el.value = text;
                              el.style.position = 'fixed';
                              el.style.opacity = '0';
                              document.body.appendChild(el);
                              el.focus();
                              el.select();
                              document.execCommand('copy');
                              document.body.removeChild(el);
                            };
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              navigator.clipboard.writeText(text).catch(fallbackCopy);
                            } else {
                              fallbackCopy();
                            }
                            setCopiedChainId(`${chain.id}:key`);
                            setTimeout(() => setCopiedChainId(null), 1500);
                          }}>
                            {copiedChainId === `${chain.id}:key`
                              ? <Check id={`quest-chain-copy-key-success-${chain.id}`} className="h-3 w-3 text-green-500"/>
                              : <Copy id={`quest-chain-copy-key-icon-${chain.id}`} className="h-3 w-3"/>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div id={`quest-chain-actions-${chain.id}`} className="quest-chain-actions flex items-center gap-3 shrink-0">
                      {/* Status toggle */}
                      <div className="flex items-center gap-1.5" title={t('quest.chain.toggleActive')}>
                        <Switch checked={chain.is_active} onCheckedChange={(checked) => handleToggleActive(chain, checked)} aria-label="Toggle chain active" className="scale-90"/>
                      </div>
                      <Separator orientation="vertical" className="h-5"/>
                      {/* Members count */}
                      <div className="text-center" title={t('quest.chain.members')}>
                        <p className="text-xs text-muted-foreground leading-none">{t('quest.chain.members')}</p>
                        <p className="text-sm font-medium">{expandedChainId === chain.id ? expandedMembers.length : (memberCountMap[chain.id] ?? "—")}</p>
                      </div>
                      <Separator orientation="vertical" className="h-5"/>
                      {/* Created */}
                      <div className="text-center" title={t('quest.chain.created')}>
                        <p className="text-xs text-muted-foreground leading-none">{t('quest.chain.created')}</p>
                        <p className="text-sm font-medium">{new Date(chain.created_at).toLocaleDateString(undefined, { timeZone: user?.timezone ?? undefined })}</p>
                      </div>
                      <Separator orientation="vertical" className="h-5"/>
                      <Button id={`quest-chain-edit-${chain.id}`} variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(chain)} title={t('quest.chain.editChain')}>
                        <Pencil id={`quest-chain-edit-icon-${chain.id}`} className="h-3.5 w-3.5"/>
                      </Button>
                      <Button id={`quest-chain-delete-${chain.id}`} variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(chain)} title={t('quest.chain.deleteChain')}>
                        <Trash2 id={`quest-chain-delete-icon-${chain.id}`} className="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Detail — Chain Members */}
                {isExpanded && (<CardContent id={`quest-chain-detail-${chain.id}`} className="quest-chain-detail pt-0 space-y-4">
                    <Separator id={`quest-chain-detail-separator-${chain.id}`} />
                    {expandedLoading ? (<div className="flex items-center gap-2 py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/> Loading chain details…
                      </div>) : expandedChain ? (<div className="space-y-4">
                        {/* Members — List / Grid tabs */}
                        <div>
                          <Tabs value={searchParams.get("subTab") === "list" ? "list" : "grid"} onValueChange={(v) => {
                                router.replace(`?tab=chains&subTab=${encodeURIComponent(v)}`, { scroll: false });
                            }} className="w-full">
                            <div className="flex items-center justify-between mb-3">
                              <TabsList className="h-8">
                                <TabsTrigger value="grid" className="text-xs gap-1.5 px-3">
                                  <LayoutGrid className="h-3.5 w-3.5"/> {t('quest.chain.viewGraph')}
                                </TabsTrigger>
                                <TabsTrigger value="list" className="text-xs gap-1.5 px-3">
                                  <List className="h-3.5 w-3.5"/> {t('quest.chain.viewList')}
                                </TabsTrigger>
                              </TabsList>
                              <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                                Quests in Chain
                                <Badge variant="outline" className="text-xs">{expandedMembers.length}</Badge>
                              </h4>
                            </div>

                              {/* ── List View ─────────────────────────────── */}
                              <TabsContent value="list" className="mt-0">
                                <div className="flex justify-end mb-2">
                                  <Button size="sm" variant="outline" onClick={() => openAddMember(chain.id)}>
                                    <Plus className="h-3.5 w-3.5 mr-1"/> Add Quest
                                  </Button>
                                </div>
                                {expandedMembers.length === 0 ? (<p className="text-sm text-muted-foreground py-2">
                                    No quests in this chain yet. Click &quot;Add Quest&quot; to add quest definitions to this chain.
                                  </p>) : (<Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-16">Order</TableHead>
                                      <TableHead>Quest</TableHead>
                                      <TableHead className="w-56">Unlocks</TableHead>
                                      <TableHead className="w-24">Status</TableHead>
                                      <TableHead className="w-24"/>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expandedMembers.map((member) => {
                                    const questDef = questDefsMap[member.quest_definition_id];
                                    return (<TableRow key={member.id}>
                                          <TableCell className="font-mono text-muted-foreground">
                                            {member.sort_order}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <p className="text-sm font-medium">
                                                {questDef?.name ?? member.quest_definition_id.slice(0, 8) + "…"}
                                              </p>
                                              {questDef?.description && (<p className="text-xs text-muted-foreground truncate max-w-md">{questDef.description}</p>)}
                                              {questDef && (<Badge variant="outline" className="text-xs mt-1">{questDef.quest_type}</Badge>)}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {member.unlock_quest_ids.length > 0 ? (<div className="flex flex-wrap gap-1">
                                                {member.unlock_quest_ids.map((uid) => {
                                                const unlockDef = questDefsMap[uid];
                                                return (<Badge key={uid} variant="secondary" className="text-xs">
                                                      <ArrowRight className="h-2.5 w-2.5 mr-0.5"/>
                                                      {unlockDef?.name ?? uid.slice(0, 8) + "…"}
                                                    </Badge>);
                                            })}
                                              </div>) : (<span className="text-xs text-muted-foreground">— (end of chain)</span>)}
                                          </TableCell>
                                          <TableCell>
                                            {questDef?.is_active ? (<Badge variant="default" className="text-xs bg-green-600">{t('quest.activeStatus')}</Badge>) : (<Badge variant="secondary" className="text-xs">
                                                {questDef ? t('quest.inactiveStatus') : t('common.unknown')}
                                              </Badge>)}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-0.5">
                                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" title="Edit membership" onClick={() => openEditMember(member)}>
                                                <Pencil className="h-3 w-3"/>
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive" title="Remove from chain" onClick={() => setRemoveMemberTarget({
                                            chainId: chain.id,
                                            questId: member.quest_definition_id,
                                            questName: questDef?.name ?? member.quest_definition_id.slice(0, 8) + "…",
                                        })}>
                                                <Trash2 className="h-3 w-3"/>
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>);
                                })}
                                  </TableBody>
                                </Table>)}
                              </TabsContent>

                              {/* ── Graph View ────────────────────────────── */}
                              <TabsContent value="grid" className="mt-0">
                                <ChainFlowView gameId={gameId} chainId={chain.id} members={expandedMembers} questDefsMap={questDefsMap} availableQuests={getAvailableQuests()} onQuickAdd={async (questId) => {
                                const nextSort = expandedMembers.length > 0
                                    ? Math.max(...expandedMembers.map((m) => m.sort_order)) + 1
                                    : 0;
                                await addChainMember(gameId, chain.id, {
                                    quest_definition_id: questId,
                                    sort_order: nextSort,
                                    unlock_quest_ids: [],
                                });
                                setAssignedQuestIds((prev) => new Set(prev).add(questId));
                                toast({ title: t('quest.chain.questAddedToChain') });
                                await Promise.all([refreshExpanded(chain.id), loadQuestDefsMap(), loadChains()]);
                            }} onRefresh={async () => { await Promise.all([refreshExpanded(chain.id), loadQuestDefsMap()]); }} onEditMember={openEditMember} onRemoveMember={(member) => {
                                const questDef = questDefsMap[member.quest_definition_id];
                                setRemoveMemberTarget({
                                    chainId: chain.id,
                                    questId: member.quest_definition_id,
                                    questName: questDef?.name ?? member.quest_definition_id.slice(0, 8) + "…",
                                });
                            }} onConnectQuests={async (sourceQuestId, targetQuestId) => {
                                const sourceMember = expandedMembers.find((m) => m.quest_definition_id === sourceQuestId);
                                if (!sourceMember)
                                    return;
                                const newUnlockIds = [...new Set([...sourceMember.unlock_quest_ids, targetQuestId])];
                                await updateChainMember(gameId, chain.id, sourceQuestId, {
                                    unlock_quest_ids: newUnlockIds,
                                });
                                toast({ title: t('quest.chain.connectionAdded') });
                                await refreshExpanded(chain.id);
                            }} onDisconnectQuests={async (sourceQuestId, targetQuestId) => {
                                const sourceMember = expandedMembers.find((m) => m.quest_definition_id === sourceQuestId);
                                if (!sourceMember)
                                    return;
                                const newUnlockIds = sourceMember.unlock_quest_ids.filter((id) => id !== targetQuestId);
                                await updateChainMember(gameId, chain.id, sourceQuestId, {
                                    unlock_quest_ids: newUnlockIds,
                                });
                                toast({ title: t('quest.chain.connectionRemoved') });
                                await refreshExpanded(chain.id);
                            }}/>
                              </TabsContent>
                            </Tabs>
                        </div>
                      </div>) : null}
                  </CardContent>)}
              </Card>);
            })}
        </div>)}

      {/* ─── Create / Edit Chain Sheet ────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent id="quest-chain-form-sheet" className="quest-chain-form-sheet w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader id="quest-chain-form-header">
            <SheetTitle id="quest-chain-form-title">{editChain ? t('quest.chain.editChain') : t('quest.chain.createChain')}</SheetTitle>
          </SheetHeader>

          <div id="quest-chain-form" className="quest-chain-form space-y-4 py-4">
            {/* Display Name */}
            <div id="quest-chain-display-name-field" className="space-y-1">
              <Label id="quest-chain-display-name-label" htmlFor="quest-chain-display-name-input">{t('quest.chain.displayName')} <span className="text-destructive">*</span></Label>
              <Input id="quest-chain-display-name-input" value={chainForm.display_name} onChange={(e) => {
            const name = e.target.value;
            setChainForm((f) => ({
                ...f,
                display_name: name,
                ...(autoSlug && !editChain ? { chain_key: toSlugKey(name) } : {}),
            }));
        }}/>
              <p className="text-xs text-muted-foreground">Visible to players in the quest chain UI.</p>
            </div>

            {/* Chain Key */}
            <div id="quest-chain-key-field" className="space-y-1">
              <Label id="quest-chain-key-label" htmlFor="quest-chain-key-input">{t('quest.chain.chainKey')} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input id="quest-chain-key-input" value={chainForm.chain_key} onChange={(e) => {
            setAutoSlug(false);
            setChainForm((f) => ({ ...f, chain_key: e.target.value }));
        }} disabled={!!editChain} className={`flex-1 ${editChain ? "opacity-50" : ""}`}/>
                {!editChain && (<Button type="button" variant={autoSlug ? "default" : "outline"} size="icon" className="h-10 w-10 shrink-0" onClick={() => {
                const newAuto = !autoSlug;
                setAutoSlug(newAuto);
                if (newAuto) {
                    const slug = toSlugKey(chainForm.display_name);
                    setChainForm((f) => ({ ...f, chain_key: slug }));
                }
            }} title={autoSlug ? t('quest.chain.autoSlugEnabled') : t('quest.chain.autoSlugDisabled')}>
                    <Wand2 className="h-4 w-4"/>
                  </Button>)}
              </div>
              <p className="text-xs text-muted-foreground">
                {editChain
            ? t('quest.chain.chainKeyReadonly')
            : autoSlug
                ? t('quest.chain.chainKeyAutoGen')
                : t('quest.chain.chainKeyUnique')}
              </p>
            </div>

            {/* Description */}
            <div id="quest-chain-description-field" className="space-y-1">
              <Label id="quest-chain-description-label" htmlFor="quest-chain-description-input">{t('quest.description')}</Label>
              <Textarea id="quest-chain-description-input" value={chainForm.description ?? ""} onChange={(e) => setChainForm((f) => ({ ...f, description: e.target.value.slice(0, 200) }))} maxLength={200} rows={2}/>
              <p className="text-xs text-muted-foreground text-right">
                {(chainForm.description ?? "").length}/200
              </p>
            </div>

            {/* Chain Type */}
            <div id="quest-chain-type-field" className="space-y-1">
              <Label id="quest-chain-type-label" htmlFor="quest-chain-type-input">{t('quest.chain.chainType')} <span className="text-destructive">*</span></Label>
              <Select value={chainForm.chain_type} onValueChange={(v) => setChainForm((f) => ({ ...f, chain_type: v as ChainType }))}>
                <SelectTrigger id="quest-chain-type-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAIN_TYPE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </div>
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div id="quest-chain-active-field" className="flex items-center justify-between">
              <div id="quest-chain-active-copy">
                <Label id="quest-chain-active-label" htmlFor="quest-chain-active-input">{t('quest.active')}</Label>
                <p className="text-xs text-muted-foreground">{t('quest.chain.activeHint')}</p>
              </div>
              <Switch id="quest-chain-active-input" checked={chainForm.is_active} onCheckedChange={(checked) => setChainForm((f) => ({ ...f, is_active: checked }))}/>
            </div>
          </div>

          <SheetFooter id="quest-chain-form-footer">
            <SheetClose asChild>
              <Button id="quest-chain-form-cancel" variant="outline">{t('common.cancel')}</Button>
            </SheetClose>
            <Button id="quest-chain-form-submit" onClick={handleSaveChain} disabled={chainSaving}>
              {chainSaving && <Loader2 id="quest-chain-form-submit-loader" className="h-4 w-4 mr-2 animate-spin"/>}
              {editChain ? t('quest.chain.saveChanges') : t('quest.chain.createChain')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Add Member Sheet ─────────────────────────────────────────────── */}
      <Sheet open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <SheetContent id="quest-chain-member-form-sheet" className="quest-chain-member-form-sheet w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader id="quest-chain-member-form-header">
            <SheetTitle id="quest-chain-member-form-title">Add Quest to Chain</SheetTitle>
          </SheetHeader>

          <div id="quest-chain-member-form" className="quest-chain-member-form space-y-4 py-4">
            {/* Quest Selection — searchable combobox */}
            <div id="quest-chain-member-quest-field" className="space-y-1">
              <Label id="quest-chain-member-quest-label">{t('quest.chain.questDefinition')} <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="quest-chain-member-quest-input" variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {addMemberForm.quest_definition_id
            ? (() => {
                const q = allQuestDefs.find((d) => d.id === addMemberForm.quest_definition_id);
                return q ? `${q.name}  (${q.quest_type})` : addMemberForm.quest_definition_id.slice(0, 8) + "…";
            })()
            : "Select a quest…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('quest.chain.searchQuests')}/>
                    <CommandList>
                      <CommandEmpty>{t('quest.chain.noQuestsFound')}</CommandEmpty>
                      <CommandGroup>
                        {getAvailableQuests().map((q) => (<CommandItem key={q.id} value={`${q.name} ${q.quest_type}`} onSelect={() => setAddMemberForm((f) => ({ ...f, quest_definition_id: q.id }))}>
                            <Check className={`mr-2 h-4 w-4 ${addMemberForm.quest_definition_id === q.id ? "opacity-100" : "opacity-0"}`}/>
                            <span className="text-sm">{q.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{q.quest_type}</span>
                          </CommandItem>))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">{t('quest.chain.questDefHint')}</p>
            </div>

            {/* Sort Order */}
            <div id="quest-chain-member-sort-field" className="space-y-1">
              <Label id="quest-chain-member-sort-label" htmlFor="quest-chain-member-sort-input">{t('quest.sortOrder')} <span className="text-destructive">*</span></Label>
              <Input id="quest-chain-member-sort-input" type="number" value={addMemberForm.sort_order} onChange={(e) => setAddMemberForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}/>
              <p className="text-xs text-muted-foreground">{t('quest.chain.sortOrderHint')}</p>
            </div>

            {/* Unlock Quest IDs */}
            <UnlockQuestIdsPicker value={addMemberForm.unlock_quest_ids} onChange={(ids) => setAddMemberForm((f) => ({ ...f, unlock_quest_ids: ids }))} chainMembers={expandedMembers} allQuestDefs={allQuestDefs} questDefsMap={questDefsMap} excludeQuestId={addMemberForm.quest_definition_id || undefined}/>
          </div>

          <SheetFooter id="quest-chain-member-form-footer">
            <SheetClose asChild>
              <Button id="quest-chain-member-form-cancel" variant="outline">{t('common.cancel')}</Button>
            </SheetClose>
            <Button id="quest-chain-member-form-submit" onClick={handleAddMember} disabled={addMemberSaving || !addMemberForm.quest_definition_id}>
              {addMemberSaving && <Loader2 id="quest-chain-member-form-submit-loader" className="h-4 w-4 mr-2 animate-spin"/>}
              Add to Chain
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Edit Member Sheet ────────────────────────────────────────────── */}
      <Sheet open={editMemberOpen} onOpenChange={setEditMemberOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Edit Member — {editMemberTarget ? (questDefsMap[editMemberTarget.quest_definition_id]?.name ?? "Quest") : ""}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Sort Order */}
            <div className="space-y-1">
              <Label>{t('quest.sortOrder')}</Label>
              <Input type="number" value={editMemberForm.sort_order ?? 0} onChange={(e) => setEditMemberForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}/>
              <p className="text-xs text-muted-foreground">{t('quest.chain.sortOrderHint')}</p>
            </div>

            {/* Unlock Quest IDs */}
            <UnlockQuestIdsPicker value={editMemberForm.unlock_quest_ids ?? []} onChange={(ids) => setEditMemberForm((f) => ({ ...f, unlock_quest_ids: ids }))} chainMembers={expandedMembers} allQuestDefs={allQuestDefs} questDefsMap={questDefsMap} excludeQuestId={editMemberTarget?.quest_definition_id}/>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Note:</strong> Unlock Quest IDs use full replacement. The entire list you save here will replace the current list — it is not an append operation.
              </AlertDescription>
            </Alert>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </SheetClose>
            <Button onClick={handleEditMember} disabled={editMemberSaving}>
              {editMemberSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              {t('quest.chain.saveChanges')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Delete Chain Confirmation ────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quest.chain.deleteChainTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('quest.chain.deleteChainConfirm')} <strong>{deleteTarget?.display_name}</strong>{t('quest.chain.deleteChainSoftDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChain} disabled={deleteDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Remove Member Confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={(open) => !open && setRemoveMemberTarget(null)}>
        <AlertDialogContent id="quest-chain-remove-member-dialog">
          <AlertDialogHeader id="quest-chain-remove-member-header">
            <AlertDialogTitle id="quest-chain-remove-member-title">{t('quest.chain.removeQuestTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div id="quest-chain-remove-member-description" className="space-y-2">
                <p id="quest-chain-remove-member-confirmation">{t('quest.chain.removeQuestConfirm')} <strong id="quest-chain-remove-member-name">{removeMemberTarget?.questName}</strong> {t('quest.chain.removeQuestFromChain')}</p>
                <p id="quest-chain-remove-member-note">{t('quest.chain.removeQuestDesc')}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter id="quest-chain-remove-member-footer">
            <AlertDialogCancel id="quest-chain-remove-member-cancel" disabled={removeMemberDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction id="quest-chain-remove-member-confirm" onClick={handleRemoveMember} disabled={removeMemberDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removeMemberDeleting && <Loader2 id="quest-chain-remove-member-loading" className="h-4 w-4 mr-2 animate-spin"/>}
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
