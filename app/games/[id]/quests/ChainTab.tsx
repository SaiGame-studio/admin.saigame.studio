"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { toSlugUnderscore } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Trash2, Pencil, Loader2, Eye, EyeOff, ChevronDown, ChevronRight, Wand2, Link2, ArrowRight, GitBranch, ArrowDownRight, Layers, X, ChevronsUpDown, Check, List, LayoutGrid, Copy, } from "lucide-react";
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
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";
import { listQuestChains, createQuestChain, updateQuestChain, deleteQuestChain, listQuestDefinitions, listChainMembers, addChainMember, updateChainMember, removeChainMember, type QuestChain, type QuestChainMember, type ChainType, type CreateQuestChainRequest, type UpdateQuestChainRequest, type QuestDefinition, type AddChainMemberRequest, type UpdateChainMemberRequest, } from "@/lib/quest-api";
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
    const [copiedChainId, setCopiedChainId] = useState<string | null>(null);
    // Expanded chain detail
    const [expandedChainId, setExpandedChainId] = useState<string | null>(null);
    const [expandedChain, setExpandedChain] = useState<QuestChain | null>(null);
    const [expandedMembers, setExpandedMembers] = useState<QuestChainMember[]>([]);
    const [expandedLoading, setExpandedLoading] = useState(false);
    const [memberCountMap, setMemberCountMap] = useState<Record<string, number>>({});
    // Quest definitions lookup
    const [questDefsMap, setQuestDefsMap] = useState<Record<string, QuestDefinition>>({});
    const [allQuestDefs, setAllQuestDefs] = useState<QuestDefinition[]>([]);
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
    const loadChains = useCallback(async () => {
        if (!game)
            return;
        try {
            const data = await listQuestChains(gameId, { limit: 200 });
            setChains(data.chains ?? []);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : "Failed to load quest chains";
            setError(msg);
        }
    }, [game, gameId]);
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
            setMemberCountMap((prev) => ({ ...prev, [chainId]: members.length }));
        }
        catch {
            toast({ variant: "destructive", title: t('common.error'), description: t('quest.chain.failedUpdateChain') });
            setExpandedChainId(null);
        }
    }, [gameId, toast, chains]);
    const toggleExpand = async (chainId: string) => {
        if (expandedChainId === chainId) {
            setExpandedChainId(null);
            setExpandedChain(null);
            setExpandedMembers([]);
            return;
        }
        setExpandedChainId(chainId);
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
        const memberQuestIds = new Set(expandedMembers.map((m) => m.quest_definition_id));
        return allQuestDefs.filter((q) => !memberQuestIds.has(q.id) && q.quest_type !== 'daily');
    };
    const handleAddMember = async () => {
        if (!addMemberChainId || !addMemberForm.quest_definition_id) {
            toast({ variant: "destructive", title: t('quest.chain.validationError'), description: t('quest.chain.selectQuestDef') });
            return;
        }
        setAddMemberSaving(true);
        try {
            await addChainMember(gameId, addMemberChainId, addMemberForm);
            toast({ title: t('quest.chain.questAddedToChain') });
            setAddMemberOpen(false);
            await Promise.all([refreshExpanded(addMemberChainId), loadQuestDefsMap()]);
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
            toast({ title: t('quest.chain.questRemovedFromChain') });
            setRemoveMemberTarget(null);
            if (expandedChainId)
                await refreshExpanded(expandedChainId);
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
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete("tab");
        sp.set("editQuestId", questId);
        router.push(`/games/${gameId}/quests?${sp.toString()}`);
    };
    // ── Render ────────────────────────────────────────────────────────────────
    if (!game)
        return null;
    return (<>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('quest.chain.headerTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('quest.chain.headerDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} title={t('quest.chain.refresh')}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1"/> {t('quest.chain.newChain')}
          </Button>
        </div>
      </div>

      {error && (<Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}

      {/* Loading */}
      {loading ? (<div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin"/> {t('quest.chain.loadingChains')}
        </div>) : chains.length === 0 ? (<Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Link2 className="h-10 w-10 opacity-30"/>
            <p className="text-sm">{t('quest.chain.noChains')}</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1"/> {t('quest.chain.createChain')}
            </Button>
          </CardContent>
        </Card>) : (<div className="space-y-3">
          {chains.map((chain) => {
                const isExpanded = expandedChainId === chain.id;
                return (<Card key={chain.id} className={isExpanded ? "border-primary/40" : ""}>
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Expand toggle */}
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleExpand(chain.id)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    </Button>

                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(chain.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{chain.display_name}</CardTitle>
                        <Badge variant={chainTypeBadgeVariant(chain.chain_type)} className="text-xs">
                          {CHAIN_TYPE_OPTIONS.find((o) => o.value === chain.chain_type)?.label ?? chain.chain_type}
                        </Badge>
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
                        <span className="text-xs font-mono text-muted-foreground">{chain.chain_key}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0">
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
                        <p className="text-sm font-medium">{new Date(chain.created_at).toLocaleDateString()}</p>
                      </div>
                      <Separator orientation="vertical" className="h-5"/>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(chain)} title={t('quest.chain.editChain')}>
                        <Pencil className="h-3.5 w-3.5"/>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(chain)} title={t('quest.chain.deleteChain')}>
                        <Trash2 className="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Detail — Chain Members */}
                {isExpanded && (<CardContent className="pt-0 space-y-4">
                    <Separator />
                    {expandedLoading ? (<div className="flex items-center gap-2 py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/> Loading chain details…
                      </div>) : expandedChain ? (<div className="space-y-4">
                        {/* Members — List / Grid tabs */}
                        <div>
                          <Tabs value={searchParams.get("subTab") === "list" ? "list" : "grid"} onValueChange={(v) => {
                                const sp = new URLSearchParams(searchParams.toString());
                                sp.set("subTab", v);
                                router.replace(`?${sp.toString()}`, { scroll: false });
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
                                <ChainFlowView gameId={gameId} chainId={chain.id} members={expandedMembers} questDefsMap={questDefsMap} availableQuests={allQuestDefs.filter((q) => !expandedMembers.some((m) => m.quest_definition_id === q.id) && q.quest_type !== 'daily')} onQuickAdd={async (questId) => {
                                const nextSort = expandedMembers.length > 0
                                    ? Math.max(...expandedMembers.map((m) => m.sort_order)) + 1
                                    : 0;
                                await addChainMember(gameId, chain.id, {
                                    quest_definition_id: questId,
                                    sort_order: nextSort,
                                    unlock_quest_ids: [],
                                });
                                toast({ title: t('quest.chain.questAddedToChain') });
                                await Promise.all([refreshExpanded(chain.id), loadQuestDefsMap()]);
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editChain ? t('quest.chain.editChain') : t('quest.chain.createChain')}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Display Name */}
            <div className="space-y-1">
              <Label>{t('quest.chain.displayName')} <span className="text-destructive">*</span></Label>
              <Input value={chainForm.display_name} onChange={(e) => {
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
            <div className="space-y-1">
              <Label>{t('quest.chain.chainKey')} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input value={chainForm.chain_key} onChange={(e) => {
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
            <div className="space-y-1">
              <Label>{t('quest.description')}</Label>
              <Textarea value={chainForm.description ?? ""} onChange={(e) => setChainForm((f) => ({ ...f, description: e.target.value.slice(0, 200) }))} maxLength={200} rows={2}/>
              <p className="text-xs text-muted-foreground text-right">
                {(chainForm.description ?? "").length}/200
              </p>
            </div>

            {/* Chain Type */}
            <div className="space-y-1">
              <Label>{t('quest.chain.chainType')} <span className="text-destructive">*</span></Label>
              <Select value={chainForm.chain_type} onValueChange={(v) => setChainForm((f) => ({ ...f, chain_type: v as ChainType }))}>
                <SelectTrigger>
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
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('quest.active')}</Label>
                <p className="text-xs text-muted-foreground">{t('quest.chain.activeHint')}</p>
              </div>
              <Switch checked={chainForm.is_active} onCheckedChange={(checked) => setChainForm((f) => ({ ...f, is_active: checked }))}/>
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </SheetClose>
            <Button onClick={handleSaveChain} disabled={chainSaving}>
              {chainSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              {editChain ? t('quest.chain.saveChanges') : t('quest.chain.createChain')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Add Member Sheet ─────────────────────────────────────────────── */}
      <Sheet open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Quest to Chain</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Quest Selection — searchable combobox */}
            <div className="space-y-1">
              <Label>{t('quest.chain.questDefinition')} <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
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
            <div className="space-y-1">
              <Label>{t('quest.sortOrder')} <span className="text-destructive">*</span></Label>
              <Input type="number" value={addMemberForm.sort_order} onChange={(e) => setAddMemberForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}/>
              <p className="text-xs text-muted-foreground">{t('quest.chain.sortOrderHint')}</p>
            </div>

            {/* Unlock Quest IDs */}
            <UnlockQuestIdsPicker value={addMemberForm.unlock_quest_ids} onChange={(ids) => setAddMemberForm((f) => ({ ...f, unlock_quest_ids: ids }))} chainMembers={expandedMembers} allQuestDefs={allQuestDefs} questDefsMap={questDefsMap} excludeQuestId={addMemberForm.quest_definition_id || undefined}/>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </SheetClose>
            <Button onClick={handleAddMember} disabled={addMemberSaving || !addMemberForm.quest_definition_id}>
              {addMemberSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quest.chain.removeQuestTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('quest.chain.removeQuestConfirm')} <strong>{removeMemberTarget?.questName}</strong> {t('quest.chain.removeQuestDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} disabled={removeMemberDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removeMemberDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);
}
