"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarRange, ChevronDown, ChevronRight, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/storage-utils";
import { fromUserDatetime, getUserTimezone, toUserDatetime } from "@/lib/utils/date-utils";
import { toSlugUnderscore } from "@/lib/utils";
import {
    addChainToSessionQuestPool,
    createSessionQuestPool,
    deleteSessionQuestPool,
    listQuestChains,
    listSessionQuestPoolChains,
    listSessionQuestPools,
    removeChainFromSessionQuestPool,
    reorderSessionQuestPoolChains,
    updateSessionQuestPool,
    type QuestChain,
    type SessionQuestPool,
    type SessionQuestPoolChain,
    type SessionQuestPoolInput,
    type SessionWindowConfig,
} from "@/lib/quest-api";
import { createDefaultSessionPoolSchedule } from "./sessionPoolSchedule";

function SortableBattlePassChain({ membership, chain, onRemove, onOpenChain }: { membership: SessionQuestPoolChain; chain?: QuestChain; onRemove: () => void; onOpenChain: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: membership.chain_id });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} id={`battle-pass-assigned-chain-${membership.id}`} className={`flex items-center justify-between rounded-md border px-3 py-2 ${isDragging ? "z-10 bg-background shadow-lg" : ""}`}>
            <div id={`battle-pass-assigned-chain-info-${membership.id}`} className="flex min-w-0 items-center gap-3">
                <button id={`battle-pass-assigned-chain-drag-${membership.id}`} type="button" className="cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Reorder chain" {...listeners}>⋮⋮</button>
                <span id={`battle-pass-assigned-chain-order-${membership.id}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{membership.sort_order + 1}</span>
                <button id={`battle-pass-assigned-chain-name-${membership.id}`} type="button" className="group flex min-w-0 items-center gap-1 truncate text-left text-sm hover:text-primary" onClick={onOpenChain} title={chain?.display_name ?? membership.chain_id}>
                    <span className="truncate">{chain?.display_name ?? membership.chain_id}</span>
                    <ExternalLink id={`battle-pass-assigned-chain-link-icon-${membership.id}`} className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                </button>
            </div>
            <Button id={`battle-pass-assigned-chain-remove-${membership.id}`} size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={onRemove} title="Remove chain">
                <Trash2 id={`battle-pass-assigned-chain-remove-icon-${membership.id}`} className="h-4 w-4" />
            </Button>
        </div>
    );
}

type FormState = {
    poolKey: string;
    displayName: string;
    description: string;
    startAt: string;
    endAt: string;
    cycleStartAt: string;
    repeatType: "day" | "week" | "month";
    repeatAmount: number;
    scheduleMode: "fixed" | "interval" | "annual";
    active: boolean;
};

const EMPTY_FORM: FormState = {
    poolKey: "",
    displayName: "",
    description: "",
    startAt: "",
    endAt: "",
    cycleStartAt: "",
    repeatType: "month",
    repeatAmount: 1,
    scheduleMode: "fixed",
    active: true,
};

function expandedBattlePassStorageKey(gameId: string) {
    return `ss_quests_battle_pass_expanded_${gameId}`;
}

function defaultScheduleForm() {
    const schedule = createDefaultSessionPoolSchedule();
    const startAt = typeof schedule.session_start_at === "string" ? toUserDatetime(schedule.session_start_at) : "";
    const endAt = typeof schedule.session_end_at === "string" ? toUserDatetime(schedule.session_end_at) : "";
    return { startAt, endAt, cycleStartAt: startAt, repeatType: "month" as const, repeatAmount: 1 };
}

export function SessionPoolsTab({ gameId }: { gameId: string }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const timeZone = getUserTimezone();
    const [pools, setPools] = useState<SessionQuestPool[]>([]);
    const [chains, setChains] = useState<QuestChain[]>([]);
    const [memberships, setMemberships] = useState<Record<string, SessionQuestPoolChain[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState<SessionQuestPool | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [autoSlug, setAutoSlug] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);
    const [fullSessionOnly, setFullSessionOnly] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<SessionQuestPool | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const load = useCallback(async () => {
        setError("");
        try {
            const [poolResult, chainResult] = await Promise.all([
                listSessionQuestPools(gameId),
                listQuestChains(gameId, { limit: 200 }),
            ]);
            const nextPools = poolResult.pools ?? [];
            setPools(nextPools);
            const storageKey = expandedBattlePassStorageKey(gameId);
            const storedExpandedPoolId = safeGetItem(storageKey);
            if (storedExpandedPoolId && nextPools.some((pool) => pool.id === storedExpandedPoolId)) {
                setExpandedPoolId(storedExpandedPoolId);
            } else if (storedExpandedPoolId) {
                safeRemoveItem(storageKey);
                setExpandedPoolId(null);
            } else {
                setExpandedPoolId((currentPoolId) => nextPools.some((pool) => pool.id === currentPoolId) ? currentPoolId : null);
            }
            setChains(chainResult.chains ?? []);
            const entries = await Promise.all(nextPools.map(async (pool) => [
                pool.id,
                (await listSessionQuestPoolChains(gameId, pool.id)).chains ?? [],
            ] as const));
            setMemberships(Object.fromEntries(entries));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("quest.sessionPoolsLoadFailed"));
        }
    }, [gameId, t]);

    useEffect(() => {
        void load().finally(() => setLoading(false));
    }, [load]);

    const assignedChainIds = useMemo(
        () => new Set(Object.values(memberships).flat().map((item) => item.chain_id)),
        [memberships],
    );
    const availableChains = useMemo(
        () => chains.filter((chain) => !assignedChainIds.has(chain.id)),
        [chains, assignedChainIds],
    );
    const handleChainDragEnd = async (poolId: string, event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const current = memberships[poolId] ?? [];
        const oldIndex = current.findIndex((item) => item.chain_id === active.id);
        const newIndex = current.findIndex((item) => item.chain_id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const reordered = [...current];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        setMemberships((prev) => ({ ...prev, [poolId]: reordered.map((item, index) => ({ ...item, sort_order: index })) }));
        try {
            await reorderSessionQuestPoolChains(gameId, poolId, reordered.map((item) => item.chain_id));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("quest.sessionPoolChainAddFailed"));
            await load();
        }
    };
    const visibleAvailableChains = useMemo(
        () => fullSessionOnly
            ? availableChains.filter((chain) => chain.type_config?.content_type === "full_session")
            : availableChains,
        [availableChains, fullSessionOnly],
    );
    const toggleExpandedPool = (poolId: string) => {
        const storageKey = expandedBattlePassStorageKey(gameId);
        setExpandedPoolId((currentPoolId) => {
            const nextPoolId = currentPoolId === poolId ? null : poolId;
            if (nextPoolId) safeSetItem(storageKey, nextPoolId);
            else safeRemoveItem(storageKey);
            return nextPoolId;
        });
    };

    const openCreate = () => {
        setEditing(null);
        setAutoSlug(true);
        setForm({ ...EMPTY_FORM, ...defaultScheduleForm() });
        setFormOpen(true);
    };

    const openEdit = (pool: SessionQuestPool) => {
        const session = pool.type_config.session;
        const fixedSchedule = session.schedule_mode === "interval" ? { startAt: "", endAt: "" } : {
            startAt: toUserDatetime(session.session_start_at),
            endAt: toUserDatetime(session.session_end_at),
        };
        const recurringSchedule = session.schedule_mode === "interval" ? {
            cycleStartAt: toUserDatetime(session.cycle_start_at),
            repeatType: session.repeat_type, repeatAmount: session.repeat_amount,
        } : { cycleStartAt: "", repeatType: "month" as const, repeatAmount: 1 };
        setEditing(pool);
        setAutoSlug(false);
        setForm({
            poolKey: pool.pool_key,
            displayName: pool.display_name,
            description: pool.description ?? "",
            ...fixedSchedule,
            ...recurringSchedule,
            scheduleMode: session.schedule_mode,
            active: pool.is_active,
        });
        setFormOpen(true);
    };

    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const save = async () => {
        const invalidSchedule = form.scheduleMode === "interval"
            ? !form.cycleStartAt || !Number.isInteger(form.repeatAmount) || form.repeatAmount < 1
            : !form.startAt || !form.endAt || form.startAt >= form.endAt || (form.scheduleMode === "annual" && form.startAt.slice(0, 4) !== form.endAt.slice(0, 4));
        if (!form.poolKey.trim() || !form.displayName.trim() || invalidSchedule) {
            setError(t("quest.sessionPoolInvalidForm"));
            return;
        }
        const session: SessionWindowConfig["session"] = form.scheduleMode === "interval"
            ? { schedule_mode: "interval", cycle_start_at: fromUserDatetime(form.cycleStartAt), repeat_type: form.repeatType, repeat_amount: form.repeatAmount }
            : { schedule_mode: form.scheduleMode, session_start_at: fromUserDatetime(form.startAt), session_end_at: fromUserDatetime(form.endAt) };
        const payload: SessionQuestPoolInput = {
            pool_key: form.poolKey.trim(),
            display_name: form.displayName.trim(),
            description: form.description.trim() || undefined,
            is_active: form.active,
            type_config: { session },
        };
        setSaving(true);
        setError("");
        try {
            if (editing) await updateSessionQuestPool(gameId, editing.id, payload);
            else await createSessionQuestPool(gameId, payload);
            toast({ title: t(editing ? "quest.sessionPoolUpdated" : "quest.sessionPoolCreated") });
            setFormOpen(false);
            await load();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("quest.sessionPoolSaveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const addChain = async (poolId: string, chainId: string) => {
        if (!chainId) return;
        try {
            await addChainToSessionQuestPool(gameId, poolId, chainId, memberships[poolId]?.length ?? 0);
            await load();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("quest.sessionPoolChainAddFailed"));
        }
    };

    const removeChain = async (poolId: string, chainId: string) => {
        try {
            await removeChainFromSessionQuestPool(gameId, poolId, chainId);
            await load();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("quest.sessionPoolChainRemoveFailed"));
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteSessionQuestPool(gameId, deleteTarget.id);
            if (expandedPoolId === deleteTarget.id) {
                safeRemoveItem(expandedBattlePassStorageKey(gameId));
                setExpandedPoolId(null);
            }
            setDeleteTarget(null);
            await load();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t("quest.sessionPoolDeleteFailed"));
        }
    };

    return (
        <div id="battle-pass-tab" className="space-y-6">
            <div id="battle-pass-header" className="flex items-center justify-between gap-3">
                <div id="battle-pass-header-copy">
                    <h2 id="battle-pass-title" className="text-lg font-semibold">{t("quest.sessionPoolsTitle")}</h2>
                    <p id="battle-pass-description" className="text-sm text-muted-foreground">{t("quest.sessionPoolsDescription")}</p>
                </div>
                <div id="battle-pass-header-actions" className="flex items-center gap-2">
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger id="battle-pass-refresh-tooltip-trigger" asChild>
                                <Button id="battle-pass-refresh" variant="outline" size="icon" disabled={refreshing} onClick={() => void refresh()}>
                                    <RefreshCw id="battle-pass-refresh-icon" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent id="battle-pass-refresh-tooltip-content" side="top">{t("common.refresh")}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button id="battle-pass-create" size="sm" onClick={openCreate}>
                        <Plus id="battle-pass-create-icon" className="mr-1 h-4 w-4" />
                        {t("quest.sessionPoolCreate")}
                    </Button>
                </div>
            </div>

            {error && (
                <Alert id="battle-pass-error" variant="destructive">
                    <AlertDescription id="battle-pass-error-text">{error}</AlertDescription>
                </Alert>
            )}

            {loading ? (
                <div id="battle-pass-loading" className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Loader2 id="battle-pass-loading-icon" className="h-5 w-5 animate-spin" />
                    {t("common.loading")}
                </div>
            ) : pools.length === 0 ? (
                <Card id="battle-pass-empty-card">
                    <CardContent id="battle-pass-empty-content" className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                        <CalendarRange id="battle-pass-empty-icon" className="h-10 w-10 opacity-30" />
                        <p id="battle-pass-empty-text" className="text-sm">{t("quest.sessionPoolsEmpty")}</p>
                        <Button id="battle-pass-empty-create" size="sm" onClick={openCreate}>
                            <Plus id="battle-pass-empty-create-icon" className="mr-1 h-4 w-4" />
                            {t("quest.sessionPoolCreate")}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div id="battle-pass-list" className="space-y-3">
                    {pools.map((pool) => {
                        const isExpanded = expandedPoolId === pool.id;
                        const poolMemberships = memberships[pool.id] ?? [];
                        const session = pool.type_config.session;
                        return (
                            <Card id={`battle-pass-${pool.id}`} key={pool.id} className={isExpanded ? "border-primary/40" : ""}>
                                <CardHeader id={`battle-pass-header-${pool.id}`} className="p-4">
                                    <div id={`battle-pass-summary-${pool.id}`} className="flex items-center gap-3">
                                        <Button
                                            id={`battle-pass-expand-${pool.id}`}
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => toggleExpandedPool(pool.id)}
                                        >
                                            {isExpanded ? <ChevronDown id={`battle-pass-collapse-icon-${pool.id}`} className="h-4 w-4" /> : <ChevronRight id={`battle-pass-expand-icon-${pool.id}`} className="h-4 w-4" />}
                                        </Button>
                                        <div id={`battle-pass-info-${pool.id}`} className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleExpandedPool(pool.id)}>
                                            <div id={`battle-pass-name-row-${pool.id}`} className="flex flex-wrap items-center gap-2">
                                                <CardTitle id={`battle-pass-name-${pool.id}`} className="text-base">{pool.display_name}</CardTitle>
                                                <Badge id={`battle-pass-status-${pool.id}`} variant={pool.is_active ? "default" : "secondary"} className={pool.is_active ? "bg-green-600 text-xs" : "text-xs"}>
                                                    {t(pool.is_active ? "common.active" : "common.inactive")}
                                                </Badge>
                                                {session.schedule_mode !== "fixed" && (
                                                    <Badge id={`battle-pass-repeatable-${pool.id}`} variant="outline" className="text-xs">{t("quest.sessionRepeatable")}</Badge>
                                                )}
                                                {pool.description && <span id={`battle-pass-description-${pool.id}`} className="max-w-sm truncate text-sm text-muted-foreground">{pool.description}</span>}
                                            </div>
                                            <div id={`battle-pass-meta-${pool.id}`} className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span id={`battle-pass-key-${pool.id}`} className="font-mono">{pool.pool_key}</span>
                                                <span id={`battle-pass-meta-separator-${pool.id}`}>·</span>
                                                <span id={`battle-pass-window-${pool.id}`}>
                                                    {session.schedule_mode === "interval"
                                                        ? `${toUserDatetime(session.cycle_start_at)} (${timeZone}) · ${t("quest.sessionRepeatEvery")}: ${session.repeat_amount} ${t(`quest.sessionRepeatType${session.repeat_type.charAt(0).toUpperCase()}${session.repeat_type.slice(1)}`)}`
                                                        : session.schedule_mode === "annual"
                                                            ? `${toUserDatetime(session.session_start_at)} — ${toUserDatetime(session.session_end_at)} (${timeZone}) · ${t("quest.sessionScheduleAnnual")}`
                                                        : `${toUserDatetime(session.session_start_at)} — ${toUserDatetime(session.session_end_at)} (${timeZone})`}
                                                </span>
                                                <span id={`battle-pass-chain-count-${pool.id}`}>· {poolMemberships.length} {t("quest.tabChains")}</span>
                                            </div>
                                        </div>
                                        <div id={`battle-pass-actions-${pool.id}`} className="flex shrink-0 items-center gap-1">
                                            <Button id={`battle-pass-edit-${pool.id}`} size="icon" variant="ghost" onClick={() => openEdit(pool)} title={t("common.edit")}>
                                                <Pencil id={`battle-pass-edit-icon-${pool.id}`} className="h-4 w-4" />
                                            </Button>
                                            <Button id={`battle-pass-delete-${pool.id}`} size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(pool)} title={t("common.delete")}>
                                                <Trash2 id={`battle-pass-delete-icon-${pool.id}`} className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent id={`battle-pass-content-${pool.id}`} className="grid gap-4 border-t px-4 pb-4 pt-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                                        <section id={`battle-pass-assigned-section-${pool.id}`} className="min-w-0 space-y-2">
                                            <h3 id={`battle-pass-assigned-title-${pool.id}`} className="text-sm font-semibold">{t("quest.sessionPoolAssignedChains")}</h3>
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleChainDragEnd(pool.id, event)}>
                                            <SortableContext items={poolMemberships.map((membership) => membership.chain_id)} strategy={verticalListSortingStrategy}>
                                            <div id={`battle-pass-assigned-list-${pool.id}`} className="space-y-2">
                                                {poolMemberships.length === 0 ? (
                                                    <p id={`battle-pass-assigned-empty-${pool.id}`} className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{t("quest.sessionPoolNoAssignedChains")}</p>
                                                ) : poolMemberships.map((membership) => {
                                                    const chain = chains.find((item) => item.id === membership.chain_id);
                                                    return <SortableBattlePassChain key={membership.id} membership={membership} chain={chain} onRemove={() => void removeChain(pool.id, membership.chain_id)} onOpenChain={() => router.push(`/games/${gameId}/quests?tab=chains&search=${encodeURIComponent(membership.chain_id)}`)} />;
                                                })}
                                            </div>
                                            </SortableContext>
                                            </DndContext>
                                        </section>
                                        <section id={`battle-pass-available-section-${pool.id}`} className="min-w-0 space-y-2">
                                            <div id={`battle-pass-available-header-${pool.id}`} className="flex items-center justify-between gap-2">
                                                <h3 id={`battle-pass-available-title-${pool.id}`} className="text-sm font-semibold">{t("quest.sessionPoolAvailableChains")}</h3>
                                                <label id={`battle-pass-full-session-only-label-${pool.id}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Switch id={`battle-pass-full-session-only-${pool.id}`} checked={fullSessionOnly} onCheckedChange={setFullSessionOnly} />
                                                    <span id={`battle-pass-full-session-only-text-${pool.id}`}>{t("quest.sessionPoolFullSessionOnly")}</span>
                                                </label>
                                            </div>
                                            <div id={`battle-pass-available-list-${pool.id}`} className="max-h-80 space-y-2 overflow-y-auto pr-1">
                                                {visibleAvailableChains.length === 0 ? (
                                                    <p id={`battle-pass-available-empty-${pool.id}`} className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{t("quest.sessionPoolNoAvailableChains")}</p>
                                                ) : visibleAvailableChains.map((chain) => {
                                                    const contentType = chain.type_config?.content_type;
                                                    const canAdd = contentType === "full_session" && !assignedChainIds.has(chain.id);
                                                    const contentLabel = contentType === "full_one_time"
                                                        ? t("quest.chain.contentFullOneTime")
                                                        : contentType === "full_session"
                                                            ? t("quest.chain.contentFullSession")
                                                            : contentType === "mix"
                                                                ? t("quest.chain.contentMix")
                                                                : t("common.unknown");
                                                    return (
                                                    <div id={`battle-pass-available-chain-${pool.id}-${chain.id}`} key={chain.id} className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${canAdd ? "" : "bg-muted/50 text-muted-foreground"}`}>
                                                        <div id={`battle-pass-available-chain-info-${pool.id}-${chain.id}`} className="flex min-w-0 items-center gap-2">
                                                        <button id={`battle-pass-available-chain-name-${pool.id}-${chain.id}`} type="button" className="group flex min-w-0 items-center gap-1 truncate text-left text-sm hover:text-primary" onClick={() => router.push(`/games/${gameId}/quests?tab=chains&search=${encodeURIComponent(chain.id)}`)} title={chain.display_name}>
                                                            <span className="truncate">{chain.display_name}</span>
                                                            <ExternalLink id={`battle-pass-available-chain-link-icon-${pool.id}-${chain.id}`} className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                                                        </button>
                                                            <Badge id={`battle-pass-available-chain-content-${pool.id}-${chain.id}`} variant="secondary" className="shrink-0 text-[10px]">{contentLabel}</Badge>
                                                        </div>
                                                        <Button id={`battle-pass-available-chain-add-${pool.id}-${chain.id}`} size="sm" variant="outline" disabled={!canAdd} onClick={() => void addChain(pool.id, chain.id)}>{t("common.add")}</Button>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <Sheet open={formOpen} onOpenChange={setFormOpen}>
                <SheetContent id="battle-pass-form-sheet-content" className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader id="battle-pass-form-header">
                        <SheetTitle id="battle-pass-form-title">{t(editing ? "quest.sessionPoolEdit" : "quest.sessionPoolCreate")}</SheetTitle>
                    </SheetHeader>
                    <div id="battle-pass-form" className="space-y-4 py-4">
                        <div id="battle-pass-name-field" className="space-y-1">
                            <Label id="battle-pass-name-label" htmlFor="battle-pass-name-input">{t("quest.displayName")}</Label>
                            <Input id="battle-pass-name-input" value={form.displayName} onChange={(event) => {
                                const displayName = event.target.value;
                                setForm({ ...form, displayName, ...(autoSlug ? { poolKey: toSlugUnderscore(displayName) } : {}) });
                            }} />
                        </div>
                        <div id="battle-pass-key-field" className="space-y-1">
                            <Label id="battle-pass-key-label" htmlFor="battle-pass-key-input">{t("quest.poolKey")}</Label>
                            <div id="battle-pass-key-row" className="flex gap-2">
                                <Input id="battle-pass-key-input" value={form.poolKey} disabled={!!editing} onChange={(event) => {
                                    setAutoSlug(false);
                                    setForm({ ...form, poolKey: event.target.value });
                                }} />
                                <Button id="battle-pass-key-auto-slug-button" type="button" variant={autoSlug ? "default" : "outline"} size="icon" className="shrink-0" disabled={!!editing} title={autoSlug ? t("items.autoSlugOn") : t("items.autoSlugOff")} onClick={() => {
                                    setAutoSlug(true);
                                    setForm({ ...form, poolKey: toSlugUnderscore(form.displayName) });
                                }}>
                                    <Wand2 id="battle-pass-key-auto-slug-icon" className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div id="battle-pass-schedule-mode-field" className="space-y-1">
                            <Label id="battle-pass-schedule-mode-label" htmlFor="battle-pass-schedule-mode-trigger">{t("quest.sessionScheduleMode")}</Label>
                            <Select value={form.scheduleMode} onValueChange={(scheduleMode) => setForm({ ...form, ...defaultScheduleForm(), scheduleMode: scheduleMode as FormState["scheduleMode"] })}>
                                <SelectTrigger id="battle-pass-schedule-mode-trigger"><SelectValue id="battle-pass-schedule-mode-value" /></SelectTrigger>
                                <SelectContent id="battle-pass-schedule-mode-content">
                                    <SelectItem id="battle-pass-schedule-mode-fixed" value="fixed">{t("quest.sessionScheduleFixed")}</SelectItem>
                                    <SelectItem id="battle-pass-schedule-mode-interval" value="interval">{t("quest.sessionScheduleInterval")}</SelectItem>
                                    <SelectItem id="battle-pass-schedule-mode-annual" value="annual">{t("quest.sessionScheduleAnnual")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.scheduleMode === "interval" ? (
                            <div id="battle-pass-recurring-schedule" className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                                <div id="battle-pass-cycle-start-field" className="space-y-1">
                                    <Label id="battle-pass-cycle-start-label" htmlFor="battle-pass-cycle-start-input">{t("quest.sessionCycleStartAt")}</Label>
                                    <Input id="battle-pass-cycle-start-input" type="datetime-local" value={form.cycleStartAt} onChange={(event) => setForm({ ...form, cycleStartAt: event.target.value })} />
                                </div>
                                <div id="battle-pass-repeat-field" className="space-y-1">
                                    <Label id="battle-pass-repeat-label">{t("quest.sessionRepeatEvery")}</Label>
                                    <div id="battle-pass-repeat-controls" className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                                        <Input
                                            id="battle-pass-repeat-amount-input"
                                            aria-label={t("quest.sessionRepeatAmount")}
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={form.repeatAmount}
                                            onChange={(event) => {
                                                const amount = event.target.valueAsNumber;
                                                if (Number.isInteger(amount) && amount >= 1) setForm({ ...form, repeatAmount: amount });
                                            }}
                                        />
                                        <Select value={form.repeatType} onValueChange={(repeatType) => setForm({ ...form, repeatType: repeatType as FormState["repeatType"] })}>
                                            <SelectTrigger id="battle-pass-repeat-type-trigger" aria-label={t("quest.sessionRepeatType")}>
                                                <SelectValue id="battle-pass-repeat-type-value" />
                                            </SelectTrigger>
                                            <SelectContent id="battle-pass-repeat-type-content">
                                                <SelectItem id="battle-pass-repeat-type-day" value="day">{t("quest.sessionRepeatTypeDay")}</SelectItem>
                                                <SelectItem id="battle-pass-repeat-type-week" value="week">{t("quest.sessionRepeatTypeWeek")}</SelectItem>
                                                <SelectItem id="battle-pass-repeat-type-month" value="month">{t("quest.sessionRepeatTypeMonth")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div id="battle-pass-fixed-schedule" className="grid gap-4 sm:grid-cols-2">
                                <div id="battle-pass-start-field" className="space-y-1">
                                    <Label id="battle-pass-start-label" htmlFor="battle-pass-start-input">{t("quest.sessionStartAt")}</Label>
                                    <Input id="battle-pass-start-input" type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} />
                                </div>
                                <div id="battle-pass-end-field" className="space-y-1">
                                    <Label id="battle-pass-end-label" htmlFor="battle-pass-end-input">{t("quest.sessionEndAt")}</Label>
                                    <Input id="battle-pass-end-input" type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} />
                                </div>
                            </div>
                        )}
                        <div id="battle-pass-description-field" className="space-y-1">
                            <Label id="battle-pass-description-label" htmlFor="battle-pass-description-input">{t("quest.description")}</Label>
                            <Textarea id="battle-pass-description-input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                        </div>
                    </div>
                    <SheetFooter id="battle-pass-form-footer" className="flex-row items-center justify-between sm:justify-between">
                        <label id="battle-pass-active-wrap" className="flex items-center gap-2">
                            <Switch id="battle-pass-active-input" checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
                            <span id="battle-pass-active-text">{t("quest.active")}</span>
                        </label>
                        <div id="battle-pass-form-actions" className="flex items-center gap-2">
                            <Button id="battle-pass-form-cancel" variant="outline" onClick={() => setFormOpen(false)}>{t("common.cancel")}</Button>
                            <Button id="battle-pass-form-save" disabled={saving} onClick={() => void save()}>
                                {saving && <Loader2 id="battle-pass-form-save-loading" className="mr-2 h-4 w-4 animate-spin" />}
                                {t("common.save")}
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent id="battle-pass-delete-dialog">
                    <AlertDialogHeader id="battle-pass-delete-header">
                        <AlertDialogTitle id="battle-pass-delete-title">{t("quest.sessionPoolDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription id="battle-pass-delete-description">{t("quest.sessionPoolDeleteDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter id="battle-pass-delete-footer">
                        <AlertDialogCancel id="battle-pass-delete-cancel">{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction id="battle-pass-delete-confirm" onClick={() => void confirmDelete()}>{t("common.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
