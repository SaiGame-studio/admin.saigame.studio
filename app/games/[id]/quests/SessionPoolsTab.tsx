"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronDown, ChevronRight, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { fromUserDatetime, getUserTimezone, toUserDatetime } from "@/lib/utils/date-utils";
import {
    addChainToSessionQuestPool,
    createSessionQuestPool,
    deleteSessionQuestPool,
    listQuestChains,
    listSessionQuestPoolChains,
    listSessionQuestPools,
    removeChainFromSessionQuestPool,
    updateSessionQuestPool,
    type QuestChain,
    type SessionQuestPool,
    type SessionQuestPoolChain,
    type SessionQuestPoolInput,
    type SessionWindowConfig,
} from "@/lib/quest-api";
import { createDefaultSessionPoolSchedule } from "./sessionPoolSchedule";

type FormState = {
    poolKey: string;
    displayName: string;
    description: string;
    startAt: string;
    endAt: string;
    cycleStartAt: string;
    repeatEveryMonths: number;
    repeatable: boolean;
    active: boolean;
};

const EMPTY_FORM: FormState = {
    poolKey: "",
    displayName: "",
    description: "",
    startAt: "",
    endAt: "",
    cycleStartAt: "",
    repeatEveryMonths: 1,
    repeatable: false,
    active: true,
};

function defaultScheduleForm() {
    const schedule = createDefaultSessionPoolSchedule();
    const startAt = typeof schedule.session_start_at === "string" ? toUserDatetime(schedule.session_start_at) : "";
    const endAt = typeof schedule.session_end_at === "string" ? toUserDatetime(schedule.session_end_at) : "";
    return { startAt, endAt, cycleStartAt: startAt, repeatEveryMonths: 1 };
}

export function SessionPoolsTab({ gameId }: { gameId: string }) {
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
    const [formOpen, setFormOpen] = useState(false);
    const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);
    const [fullSessionOnly, setFullSessionOnly] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<SessionQuestPool | null>(null);

    const load = useCallback(async () => {
        setError("");
        try {
            const [poolResult, chainResult] = await Promise.all([
                listSessionQuestPools(gameId),
                listQuestChains(gameId, { limit: 200 }),
            ]);
            const nextPools = poolResult.pools ?? [];
            setPools(nextPools);
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
    const visibleAvailableChains = useMemo(
        () => fullSessionOnly
            ? availableChains.filter((chain) => chain.type_config?.content_type === "full_session")
            : availableChains,
        [availableChains, fullSessionOnly],
    );

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, ...defaultScheduleForm() });
        setFormOpen(true);
    };

    const openEdit = (pool: SessionQuestPool) => {
        const session = pool.type_config.session;
        const fixedSchedule = session.repeatable ? { startAt: "", endAt: "" } : {
            startAt: toUserDatetime(session.session_start_at),
            endAt: toUserDatetime(session.session_end_at),
        };
        const recurringSchedule = session.repeatable ? {
            cycleStartAt: toUserDatetime(session.cycle_start_at),
            repeatEveryMonths: session.repeat_every_months,
        } : { cycleStartAt: "", repeatEveryMonths: 1 };
        setEditing(pool);
        setForm({
            poolKey: pool.pool_key,
            displayName: pool.display_name,
            description: pool.description ?? "",
            ...fixedSchedule,
            ...recurringSchedule,
            repeatable: session.repeatable,
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
        const invalidSchedule = form.repeatable
            ? !form.cycleStartAt || !Number.isInteger(form.repeatEveryMonths) || form.repeatEveryMonths < 1
            : !form.startAt || !form.endAt || form.startAt >= form.endAt;
        if (!form.poolKey.trim() || !form.displayName.trim() || invalidSchedule) {
            setError(t("quest.sessionPoolInvalidForm"));
            return;
        }
        const session: SessionWindowConfig["session"] = form.repeatable
            ? { repeatable: true, cycle_start_at: fromUserDatetime(form.cycleStartAt), repeat_every_months: form.repeatEveryMonths }
            : { repeatable: false, session_start_at: fromUserDatetime(form.startAt), session_end_at: fromUserDatetime(form.endAt) };
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
                                            onClick={() => setExpandedPoolId(isExpanded ? null : pool.id)}
                                        >
                                            {isExpanded ? <ChevronDown id={`battle-pass-collapse-icon-${pool.id}`} className="h-4 w-4" /> : <ChevronRight id={`battle-pass-expand-icon-${pool.id}`} className="h-4 w-4" />}
                                        </Button>
                                        <div id={`battle-pass-info-${pool.id}`} className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpandedPoolId(isExpanded ? null : pool.id)}>
                                            <div id={`battle-pass-name-row-${pool.id}`} className="flex flex-wrap items-center gap-2">
                                                <CardTitle id={`battle-pass-name-${pool.id}`} className="text-base">{pool.display_name}</CardTitle>
                                                <Badge id={`battle-pass-status-${pool.id}`} variant={pool.is_active ? "default" : "secondary"} className={pool.is_active ? "bg-green-600 text-xs" : "text-xs"}>
                                                    {t(pool.is_active ? "common.active" : "common.inactive")}
                                                </Badge>
                                                {session.repeatable && (
                                                    <Badge id={`battle-pass-repeatable-${pool.id}`} variant="outline" className="text-xs">{t("quest.sessionRepeatable")}</Badge>
                                                )}
                                                {pool.description && <span id={`battle-pass-description-${pool.id}`} className="max-w-sm truncate text-sm text-muted-foreground">{pool.description}</span>}
                                            </div>
                                            <div id={`battle-pass-meta-${pool.id}`} className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span id={`battle-pass-key-${pool.id}`} className="font-mono">{pool.pool_key}</span>
                                                <span id={`battle-pass-meta-separator-${pool.id}`}>·</span>
                                                <span id={`battle-pass-window-${pool.id}`}>
                                                    {session.repeatable
                                                        ? `${toUserDatetime(session.cycle_start_at)} (${timeZone}) · ${t("quest.sessionRepeatEveryMonths")}: ${session.repeat_every_months}`
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
                                            <div id={`battle-pass-assigned-list-${pool.id}`} className="space-y-2">
                                                {poolMemberships.length === 0 ? (
                                                    <p id={`battle-pass-assigned-empty-${pool.id}`} className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">{t("quest.sessionPoolNoAssignedChains")}</p>
                                                ) : poolMemberships.map((membership, index) => {
                                                    const chain = chains.find((item) => item.id === membership.chain_id);
                                                    return (
                                                        <div id={`battle-pass-assigned-chain-${membership.id}`} key={membership.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                                            <div id={`battle-pass-assigned-chain-info-${membership.id}`} className="flex min-w-0 items-center gap-3">
                                                                <span id={`battle-pass-assigned-chain-order-${membership.id}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{index + 1}</span>
                                                                <span id={`battle-pass-assigned-chain-name-${membership.id}`} className="truncate">{chain?.display_name ?? membership.chain_id}</span>
                                                            </div>
                                                            <Button id={`battle-pass-assigned-chain-remove-${membership.id}`} size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={() => void removeChain(pool.id, membership.chain_id)} title={t("common.delete")}>
                                                                <Trash2 id={`battle-pass-assigned-chain-remove-icon-${membership.id}`} className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
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
                                                            <span id={`battle-pass-available-chain-name-${pool.id}-${chain.id}`} className="truncate text-sm">{chain.display_name}</span>
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
                            <Input id="battle-pass-name-input" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
                        </div>
                        <div id="battle-pass-key-field" className="space-y-1">
                            <Label id="battle-pass-key-label" htmlFor="battle-pass-key-input">{t("quest.poolKey")}</Label>
                            <Input id="battle-pass-key-input" value={form.poolKey} disabled={!!editing} onChange={(event) => setForm({ ...form, poolKey: event.target.value })} />
                        </div>
                        <div id="battle-pass-repeatable-field" className="flex items-center justify-between gap-3 rounded-md border p-3">
                            <Label id="battle-pass-repeatable-label" htmlFor="battle-pass-repeatable-input">{t("quest.sessionRepeatable")}</Label>
                            <Switch
                                id="battle-pass-repeatable-input"
                                checked={form.repeatable}
                                onCheckedChange={(repeatable) => setForm({ ...form, ...defaultScheduleForm(), repeatable })}
                            />
                        </div>
                        {form.repeatable ? (
                            <div id="battle-pass-recurring-schedule" className="grid gap-4 sm:grid-cols-2">
                                <div id="battle-pass-cycle-start-field" className="space-y-1">
                                    <Label id="battle-pass-cycle-start-label" htmlFor="battle-pass-cycle-start-input">{t("quest.sessionCycleStartAt")} ({timeZone})</Label>
                                    <Input id="battle-pass-cycle-start-input" type="datetime-local" value={form.cycleStartAt} onChange={(event) => setForm({ ...form, cycleStartAt: event.target.value })} />
                                </div>
                                <div id="battle-pass-repeat-months-field" className="space-y-1">
                                    <Label id="battle-pass-repeat-months-label" htmlFor="battle-pass-repeat-months-input">{t("quest.sessionRepeatEveryMonths")}</Label>
                                    <Input
                                        id="battle-pass-repeat-months-input"
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={form.repeatEveryMonths}
                                        onChange={(event) => {
                                            const months = event.target.valueAsNumber;
                                            if (Number.isInteger(months) && months >= 1) setForm({ ...form, repeatEveryMonths: months });
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div id="battle-pass-fixed-schedule" className="grid gap-4 sm:grid-cols-2">
                                <div id="battle-pass-start-field" className="space-y-1">
                                    <Label id="battle-pass-start-label" htmlFor="battle-pass-start-input">{t("quest.sessionStartAt")} ({timeZone})</Label>
                                    <Input id="battle-pass-start-input" type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} />
                                </div>
                                <div id="battle-pass-end-field" className="space-y-1">
                                    <Label id="battle-pass-end-label" htmlFor="battle-pass-end-input">{t("quest.sessionEndAt")} ({timeZone})</Label>
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
