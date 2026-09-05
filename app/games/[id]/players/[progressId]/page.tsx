"use client";
import { Fragment, use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Archive, ArrowUpRight, Box, CalendarDays, ChevronDown, ChevronRight, Clock, Coins, Dice6, ExternalLink, Eye, Hash, HelpCircle, Loader2, Package, RefreshCw, Search, ShieldBan, ShieldCheck, ShoppingBag, Star, Trophy, User, X, Zap } from "lucide-react";
import { PlayerSectionNav } from "@/components/PlayerSectionNav";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatTimestamp, formatISODate, getUserTimezone } from "@/lib/utils/date-utils";
import { getGame } from "@/lib/game-api";
import { banProgress, getGameProgressDetail, getGameProgressList, getProgressItems, getProgressContainers, getGachaTransactions, getPlayerQuestHistory, getPlayerPresets, getPlayerPresetDetail, getBattleSessions, getJourneySessions, getJourneySessionEvents, GameProgressDetail, PlayerItem, PlayerItemsResult, PlayerContainer, PlayerContainersResult, PlayerPresetContainer, PlayerPresetDetail, GachaTransaction, GachaTransactionsResult, QuestHistoryResult, BattleSession, BattleSessionsResult, JourneySession, JourneySessionsResult, JourneyEvent, getPlayerIdentityMapByUserIds, PlayerIdentity, unbanProgress } from "@/lib/game-user-api";
import { fetchItemCategories, fetchItemRarities, getItemDefinition, getGachaPack, getContainerDefinition } from "@/lib/inventory-api";
import { listDailyQuestPools, getPlayerDailyQuestAheadPreview, getPlayerDailyQuestTimeframe, type DailyQuestPool, type DailyQuestFuturePreview } from "@/lib/quest-api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CopyButton } from "@/components/CopyButton";
import { EquipmentsTab } from "@/components/EquipmentsTab";
import { GameNavButtons } from "@/components/GameNavButtons";
import { DailyQuestMaxAdvanceDays } from "@/components/DailyQuestMaxAdvanceDays";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayerQuestHistorySearch } from "./PlayerQuestHistorySearch";
import { getQuestStatusTextClass, QuestStatusIcon } from "./QuestStatusIcon";
// ── Quest progress data pretty-printer ──────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type ResolvedEntity = {
    name: string;
    type: "item" | "gacha_pack";
};
type QuestSubTab = "all" | "chain" | "daily-ahead" | "timeframe";
type DailyQuestTimeframe = "this-week" | "last-week" | "this-month" | "last-month";
const DAILY_QUEST_TIMEFRAME_STORAGE_KEY = "saigame_daily_quest_timeframe";
function formatLocalDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getDailyQuestTimeframeRange(timeframe: DailyQuestTimeframe) {
    const today = new Date();
    if (timeframe === "this-week" || timeframe === "last-week") {
        const day = today.getDay();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day + (day === 0 ? -6 : 1) - (timeframe === "last-week" ? 7 : 0));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
    }
    const monthOffset = timeframe === "last-month" ? -1 : 0;
    return {
        startDate: formatLocalDate(new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)),
        endDate: formatLocalDate(new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0)),
    };
}
type QuestStatusFilter = "all" | "in_progress" | "completed" | "claimed" | "cancelled" | "locked" | "expired" | "not_started";
const QUEST_STATUS_FILTERS: Exclude<QuestStatusFilter, "all">[] = [
    "in_progress",
    "completed",
    "claimed",
    "cancelled",
    "locked",
    "expired",
    "not_started",
];
function getQuestStatusBadgeClass(status: string) {
    if (status === "claimed")
        return "bg-green-500/10 text-green-500 border-green-500/30";
    if (status === "completed")
        return "bg-blue-500/10 text-blue-400 border-blue-400/30";
    if (status === "in_progress")
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    if (status === "cancelled" || status === "expired")
        return "bg-red-500/10 text-red-400 border-red-400/30";
    return "bg-muted/50 text-muted-foreground border-border";
}
function QuestProgressDisplay({ data, gameId }: {
    data: Record<string, unknown>;
    gameId: string;
}) {
    const [entities, setEntities] = useState<Record<string, ResolvedEntity>>({});
    useEffect(() => {
        // Collect all UUIDs we need to resolve: gacha_pack_id values + UUID object-keys
        const gachaPackIds = new Set<string>();
        const itemIds = new Set<string>();
        for (const value of Object.values(data)) {
            if (typeof value === "string" && UUID_RE.test(value)) {
                // top-level string UUID — likely a gacha_pack_id value handled inside sub-entries
            }
            if (value && typeof value === "object" && !Array.isArray(value)) {
                const sub = value as Record<string, unknown>;
                for (const [k, v] of Object.entries(sub)) {
                    if (k === "gacha_pack_id" && typeof v === "string" && UUID_RE.test(v))
                        gachaPackIds.add(v);
                    else if (UUID_RE.test(k))
                        itemIds.add(k);
                }
            }
        }
        if (gachaPackIds.size === 0 && itemIds.size === 0)
            return;
        const ctx = { gameId };
        let cancelled = false;
        (async () => {
            const resolved: Record<string, ResolvedEntity> = {};
            await Promise.allSettled([
                ...[...gachaPackIds].map(id => getGachaPack(ctx, id)
                    .then(r => { resolved[id] = { name: r.pack.name, type: "gacha_pack" }; })
                    .catch(() => { })),
                ...[...itemIds].map(id => getItemDefinition(ctx, id)
                    .then(r => { resolved[id] = { name: r.item.name, type: "item" }; })
                    .catch(() => { })),
            ]);
            if (!cancelled)
                setEntities(resolved);
        })();
        return () => { cancelled = true; };
    }, [data, gameId]);
    const resolveName = (id: string) => entities[id]?.name;
    const entries = Object.entries(data);
    return (<div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Progress</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([clauseId, value]) => {
            // Counter value
            if (typeof value === "number") {
                return (<div key={clauseId} className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground font-mono">{clauseId}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>);
            }
            // Object value (e.g. gacha clause or item_collect)
            if (value && typeof value === "object" && !Array.isArray(value)) {
                const sub = value as Record<string, unknown>;
                return (<div key={clauseId} className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs space-y-1.5 min-w-[160px]">
                <p className="text-muted-foreground font-mono font-medium text-[11px]">{clauseId}</p>
                {Object.entries(sub).map(([k, v]) => {
                        const isGachaPackKey = k === "gacha_pack_id" && typeof v === "string" && UUID_RE.test(v as string);
                        const isItemKey = UUID_RE.test(k);
                        if (isGachaPackKey) {
                            const packId = v as string;
                            const packName = resolveName(packId);
                            return (<div key={k} className="flex items-center gap-1.5 pl-1">
                        <span className="text-muted-foreground/70">{k}:</span>
                        <a href={`/games/${gameId}/items?tab=gacha&editPack=${packId}`} className="inline-flex items-center gap-0.5 font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
                          {packName ?? (packId.slice(0, 8) + "…")}
                          <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                        </a>
                      </div>);
                        }
                        if (isItemKey) {
                            const itemName = resolveName(k);
                            return (<div key={k} className="flex items-center gap-1.5 pl-1">
                        <a href={`/games/${gameId}/items/${k}`} className="inline-flex items-center gap-0.5 font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
                          {itemName ?? (k.slice(0, 8) + "…")}
                          <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                        </a>
                        <span className="text-muted-foreground">×{String(v)}</span>
                      </div>);
                        }
                        return (<div key={k} className="flex items-center gap-1.5 pl-1">
                      <span className="text-muted-foreground/70">{k}:</span>
                      <span className="font-semibold text-foreground">{String(v)}</span>
                    </div>);
                    })}
              </div>);
            }
            // Fallback
            return (<div key={clauseId} className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground font-mono">{clauseId}</span>
              <span className="font-semibold text-foreground">{String(value)}</span>
            </div>);
        })}
      </div>
    </div>);
}
// ── Quest detail sub-components (expanded row) ──────────────────────────────
function IdField({ label, value }: {
    label: string;
    value: string;
}) {
    return (<div className="flex items-center gap-1 text-[11px] min-w-0">
      <span className="text-muted-foreground/70 shrink-0">{label}:</span>
      <span className="font-mono text-foreground break-all">{value}</span>
      <CopyButton text={value} size="h-3 w-3"/>
    </div>);
}
function InfoField({ label, value }: {
    label: string;
    value: React.ReactNode;
}) {
    return (<div className="inline-flex items-center gap-1 text-[11px]">
      <span className="text-muted-foreground/70">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>);
}
function RewardPill({ reward, gameId, itemNames }: {
    reward: any;
    gameId: string;
    itemNames: Record<string, string>;
}) {
    const itemId = reward.item_definition_id as string | undefined;
    const qty = reward.quantity as number | undefined;
    const qmin = reward.quantity_min as number | undefined;
    const qmax = reward.quantity_max as number | undefined;
    // Only item rewards are supported — ignore coin/legacy rewards.
    if (!itemId)
        return null;
    const name = itemNames[itemId] ?? (reward.name ?? reward.item_name ?? reward.item_code) as string | undefined;
    return (<div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
      <a href={`/games/${gameId}/items/${itemId}`} className="inline-flex items-center gap-1 font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
        {name || itemId.slice(0, 8) + "…"}
        <ExternalLink className="h-3 w-3 text-muted-foreground"/>
      </a>
      <CopyButton text={itemId} size="h-3 w-3"/>
      {qty != null && <span className="text-muted-foreground">×{qty}</span>}
      {qty == null && qmin != null && qmax != null && (qmin === qmax
            ? <span className="text-muted-foreground">×{qmin}</span>
            : <span className="text-muted-foreground">×{qmin}–{qmax}</span>)}
    </div>);
}
function ConditionNode({ node, gameId, itemNames }: {
    node: any;
    gameId: string;
    itemNames: Record<string, string>;
}) {
    if (!node)
        return null;
    if (node.operator && Array.isArray(node.clauses)) {
        return (<div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {node.operator}
        </span>
        <div className="space-y-1.5 pl-3 border-l border-border/60">
          {node.clauses.map((c: any, i: number) => (<ConditionNode key={i} node={c} gameId={gameId} itemNames={itemNames}/>))}
        </div>
      </div>);
    }
    return (<div className="space-y-1 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        {node.clause_id && (<>
            <span className="font-mono text-muted-foreground">{node.clause_id}</span>
            <CopyButton text={node.clause_id} size="h-3 w-3"/>
          </>)}
        {node.type && <Badge variant="outline" className="capitalize text-[10px]">{String(node.type).replace(/_/g, " ")}</Badge>}
        {node.target != null && <InfoField label="target" value={node.target}/>}
      </div>
      {Array.isArray(node.items) && node.items.length > 0 && (<div className="flex flex-wrap gap-1.5 pl-1">
          {node.items.map((it: any, i: number) => (<div key={i} className="inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5">
              <a href={`/games/${gameId}/items/${it.item_definition_id}`} className="inline-flex items-center gap-0.5 font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
                {itemNames[it.item_definition_id] ?? (String(it.item_definition_id).slice(0, 8) + "…")}
                <ExternalLink className="h-3 w-3 text-muted-foreground"/>
              </a>
              <CopyButton text={it.item_definition_id} size="h-3 w-3"/>
              <span className="text-muted-foreground">×{it.quantity}</span>
            </div>))}
        </div>)}
      {node.packs && node.packs.gacha_pack_id && (<div className="flex items-center gap-1.5 pl-1 flex-wrap">
          <span className="text-muted-foreground/70">pack:</span>
          <a href={`/games/${gameId}/items?tab=gacha&editPack=${node.packs.gacha_pack_id}`} className="inline-flex items-center gap-0.5 font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
            {itemNames[node.packs.gacha_pack_id] ?? (String(node.packs.gacha_pack_id).slice(0, 8) + "…")}
            <ExternalLink className="h-3 w-3 text-muted-foreground"/>
          </a>
          <CopyButton text={node.packs.gacha_pack_id} size="h-3 w-3"/>
          {node.packs.quantity != null && <span className="text-muted-foreground">×{node.packs.quantity}</span>}
        </div>)}
      {node.details && typeof node.details === "object" && (<div className="flex flex-wrap gap-x-2 gap-y-1 pl-1">
          {Object.entries(node.details).map(([k, v]) => {
                const sv = String(v);
                if (typeof v === "string" && UUID_RE.test(v)) {
                    return (<div key={k} className="inline-flex items-center gap-1">
                  <span className="text-muted-foreground/70">{k}:</span>
                  <span className="font-mono text-foreground">{sv}</span>
                  <CopyButton text={sv} size="h-3 w-3"/>
                </div>);
                }
                return <InfoField key={k} label={k} value={sv}/>;
            })}
        </div>)}
    </div>);
}
function QuestDefinitionPanel({ quest, gameId, itemNames }: {
    quest: any;
    gameId: string;
    itemNames: Record<string, string>;
}) {
    if (!quest)
        return null;
    return (<div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase">Quest Definition</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          {quest.id && <IdField label="id" value={quest.id}/>}
          {quest.code_name && (<div className="flex items-center gap-1 text-[11px] min-w-0">
              <span className="text-muted-foreground/70 shrink-0">code_name:</span>
              <span className="font-mono text-foreground break-all">{quest.code_name}</span>
              <CopyButton text={quest.code_name} size="h-3 w-3"/>
            </div>)}
          {quest.game_id && <IdField label="game_id" value={quest.game_id}/>}
          {quest.name && <InfoField label="name" value={quest.name}/>}
          {quest.quest_type && (<div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground/70 shrink-0">type:</span>
              <Badge variant="outline" className="capitalize text-[10px]">{quest.quest_type}</Badge>
            </div>)}
          {quest.is_active != null && <InfoField label="active" value={String(quest.is_active)}/>}
          {quest.is_hidden != null && <InfoField label="hidden" value={String(quest.is_hidden)}/>}
          {quest.sort_order != null && <InfoField label="sort_order" value={quest.sort_order}/>}
          {quest.created_at && <InfoField label="created" value={formatISODate(quest.created_at)}/>}
          {quest.updated_at && <InfoField label="updated" value={formatISODate(quest.updated_at)}/>}
          {quest.description && (<div className="flex items-start gap-1.5 text-[11px]">
              <span className="text-muted-foreground/70 shrink-0">description:</span>
              <span className="text-foreground whitespace-pre-wrap">{quest.description}</span>
            </div>)}
        </div>
        <div className="flex flex-col gap-3">
          {quest.conditions && (<div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Conditions</p>
              <ConditionNode node={quest.conditions} gameId={gameId} itemNames={itemNames}/>
            </div>)}
          {(() => {
            const itemRewards = (Array.isArray(quest.rewards) ? quest.rewards : []).filter((r: any) => r.reward_type === "item" || r.item_definition_id);
            if (itemRewards.length === 0)
                return null;
            return (<div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Rewards</p>
                <div className="flex flex-wrap gap-2">
                  {itemRewards.map((r: any, i: number) => <RewardPill key={i} reward={r} gameId={gameId} itemNames={itemNames}/>)}
                </div>
              </div>);
        })()}
        </div>
      </div>
    </div>);
}
function ProgressMetaPanel({ progress, gameId, idPrefix }: {
    progress: any;
    gameId: string;
    idPrefix: string;
}) {
    if (!progress)
        return null;
    const status = progress.status as string | undefined;
    return (<div id={`${idPrefix}-panel`} className="player-quest-progress-panel space-y-2">
      <p id={`${idPrefix}-title`} className="player-quest-progress-title text-xs font-semibold text-muted-foreground uppercase">Progress</p>
      <div id={`${idPrefix}-columns`} className="player-quest-progress-columns grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
        <div id={`${idPrefix}-primary-column`} className="player-quest-progress-primary-column space-y-2">
          <div id={`${idPrefix}-identifiers`} className="player-quest-progress-identifiers space-y-1">
            {progress.id && <IdField label="id" value={progress.id}/>}
            {progress.game_id && <IdField label="game_id" value={progress.game_id}/>}
            {progress.user_id && <IdField label="user_id" value={progress.user_id}/>}
            {progress.quest_definition_id && <IdField label="quest_definition_id" value={progress.quest_definition_id}/>}
          </div>
          {status && (<span id={`${idPrefix}-status`} className={`player-quest-progress-status inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${status === "claimed" || status === "completed"
                ? "bg-green-500/10 text-green-500 border-green-500/30"
                : status === "failed"
                    ? "bg-red-500/10 text-red-400 border-red-400/30"
                    : "bg-blue-500/10 text-blue-400 border-blue-400/30"}`}>
              <QuestStatusIcon id={`${idPrefix}-status-icon`} status={status} className="h-3 w-3 shrink-0"/>
              {status}
            </span>)}
        </div>
        <div id={`${idPrefix}-timeline-column`} className="player-quest-progress-timeline-column flex flex-col gap-1">
          {progress.version != null && <InfoField label="version" value={progress.version}/>}
          {progress.created_at && <InfoField label="created" value={formatISODate(progress.created_at)}/>}
          {progress.updated_at && <InfoField label="updated" value={formatISODate(progress.updated_at)}/>}
          {progress.completed_at && <InfoField label="completed" value={formatISODate(progress.completed_at)}/>}
          {progress.claimed_at && <InfoField label="claimed" value={formatISODate(progress.claimed_at)}/>}
          {progress.reset_at && <InfoField label="reset" value={formatISODate(progress.reset_at)}/>}
        </div>
      </div>
    </div>);
}
function ClaimMetaPanel({ claim }: {
    claim: any;
}) {
    if (!claim)
        return null;
    return (<div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase">Claim</p>
      <div className="space-y-1">
        {claim.id && <IdField label="id" value={claim.id}/>}
        {claim.progress_id && <IdField label="progress_id" value={claim.progress_id}/>}
        {claim.quest_definition_id && <IdField label="quest_definition_id" value={claim.quest_definition_id}/>}
        {claim.idempotency_key && <IdField label="idempotency_key" value={claim.idempotency_key}/>}
        {claim.game_id && <IdField label="game_id" value={claim.game_id}/>}
        {claim.user_id && <IdField label="user_id" value={claim.user_id}/>}
      </div>
      {claim.claimed_at && (<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <InfoField label="claimed_at" value={formatISODate(claim.claimed_at)}/>
        </div>)}
    </div>);
}
// ── Live Generator Estimate component ───────────────────────────────────────
function GeneratorLiveEstimate({ interval, tickCapacity, outputPool, outputPoolDefNames, lastModifiedAt, gameId, }: {
    interval: number;
    tickCapacity: number;
    outputPool: Array<Record<string, unknown>>;
    outputPoolDefNames: Record<string, string>;
    lastModifiedAt: string;
    gameId: string;
}) {
    const [now, setNow] = useState(() => Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            if (intervalRef.current)
                clearInterval(intervalRef.current);
        };
    }, []);
    const baseTime = new Date(lastModifiedAt).getTime();
    const elapsedSec = Math.max(0, Math.floor((now - baseTime) / 1000));
    const accumulatedTicks = interval > 0 ? Math.min(Math.floor(elapsedSec / interval), tickCapacity) : 0;
    const nextTickIn = interval > 0 && accumulatedTicks < tickCapacity
        ? interval - (elapsedSec % interval)
        : 0;
    const isFull = accumulatedTicks >= tickCapacity;
    const progressPct = tickCapacity > 0 ? Math.min((accumulatedTicks / tickCapacity) * 100, 100) : 0;
    const maxSeconds = interval * tickCapacity;
    const maxHours = Math.floor(maxSeconds / 3600);
    const maxMins = Math.floor((maxSeconds % 3600) / 60);
    const maxTimeStr = maxHours > 0 ? `${maxHours}h${maxMins > 0 ? ` ${maxMins}m` : ""}` : `${maxMins}m`;
    const elapsedH = Math.floor(elapsedSec / 3600);
    const elapsedM = Math.floor((elapsedSec % 3600) / 60);
    const elapsedS = elapsedSec % 60;
    const allGuaranteed = outputPool.length > 0 && outputPool.every((e) => Number(e.drop_rate) === 1);
    return (<div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Generator Config</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Interval: </span>
          <span className="font-medium">{interval}s</span>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Time between each production tick</p>
        </div>
        <div>
          <span className="text-muted-foreground">Tick Capacity: </span>
          <span className="font-medium">{tickCapacity}</span>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Max ticks stored while offline</p>
        </div>
      </div>

      {interval > 0 && tickCapacity > 0 && (<div className="rounded-md bg-muted/50 border border-dashed px-3 py-2 text-[11px] text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground/80">⏱ Offline Calculation</p>
          <p>Max offline = <span className="font-mono font-medium text-foreground">{interval}s</span> × <span className="font-mono font-medium text-foreground">{tickCapacity}</span> ticks = <span className="font-semibold text-foreground">{maxSeconds.toLocaleString()}s ({maxTimeStr})</span></p>
        </div>)}

      {/* Live accumulation tracker */}
      {interval > 0 && tickCapacity > 0 && (<div className="rounded-md border bg-gradient-to-r from-blue-500/5 to-purple-500/5 px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-foreground/80">⚡ Live Accumulation</span>
            <span className="font-mono text-muted-foreground">
              since {new Date(lastModifiedAt).toLocaleTimeString(undefined, { timeZone: getUserTimezone() })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground"/>
              <span className="font-mono font-medium tabular-nums">
                {elapsedH > 0 && `${elapsedH}h `}{String(elapsedM).padStart(2, "0")}m {String(elapsedS).padStart(2, "0")}s
              </span>
            </div>
            <div className="h-3 w-px bg-border"/>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Ticks:</span>
              <span className={`font-mono font-semibold tabular-nums ${isFull ? "text-yellow-500" : "text-foreground"}`}>
                {accumulatedTicks}
              </span>
              <span className="text-muted-foreground">/ {tickCapacity}</span>
            </div>
            {!isFull && nextTickIn > 0 && (<>
                <div className="h-3 w-px bg-border"/>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px]">next in</span>
                  <span className="font-mono font-medium tabular-nums text-blue-500">{nextTickIn}s</span>
                </div>
              </>)}
            {isFull && (<>
                <div className="h-3 w-px bg-border"/>
                <span className="text-[10px] font-medium text-yellow-500">Max ticks — no more production</span>
              </>)}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${isFull ? "bg-yellow-500" : "bg-blue-500"}`} style={{ width: `${progressPct}%` }}/>
          </div>
        </div>)}

      {outputPool.length > 0 && (<div className="space-y-1">
          <p className="text-[11px] text-muted-foreground font-medium">Output Pool ({outputPool.length})</p>
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-2 py-1 font-medium text-muted-foreground">Item Definition</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Drop Rate</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Qty Min</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Qty Max</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Collect Cap</th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground">Initial Out</th>
                  <th className="text-right px-2 py-1 font-medium text-blue-500" title={`Live expected output over ${accumulatedTicks} accumulated ticks`}>
                    Expected ({accumulatedTicks} ticks)
                  </th>
                  <th className="text-right px-2 py-1 font-medium text-muted-foreground" title={`Max expected output over ${tickCapacity} ticks`}>
                    Max ({tickCapacity} ticks)
                  </th>
                </tr>
              </thead>
              <tbody>
                {outputPool.map((entry, idx) => {
                const defId = String(entry.item_definition_id ?? "");
                const defName = outputPoolDefNames[defId];
                const dropRate = Number(entry.drop_rate) || 0;
                const qtyMin = Number(entry.quantity_min) || 1;
                const qtyMax = Number(entry.quantity_max) || 1;
                const collectCap = Number(entry.collect_cap) || 0;
                const isGuaranteed = dropRate === 1;
                // Live accumulated expected
                const liveTicksDropped = dropRate * accumulatedTicks;
                const liveMinRaw = Math.round(liveTicksDropped * qtyMin);
                const liveMaxRaw = Math.round(liveTicksDropped * qtyMax);
                const liveMin = collectCap > 0 ? Math.min(liveMinRaw, collectCap) : liveMinRaw;
                const liveMax = collectCap > 0 ? Math.min(liveMaxRaw, collectCap) : liveMaxRaw;
                const liveCapped = collectCap > 0 && liveMaxRaw >= collectCap;
                // Max (full capacity) expected
                const maxTicksDropped = dropRate * tickCapacity;
                const maxMinRaw = Math.round(maxTicksDropped * qtyMin);
                const maxMaxRaw = Math.round(maxTicksDropped * qtyMax);
                const maxMin = collectCap > 0 ? Math.min(maxMinRaw, collectCap) : maxMinRaw;
                const maxMax = collectCap > 0 ? Math.min(maxMaxRaw, collectCap) : maxMaxRaw;
                const maxCapped = collectCap > 0 && maxMaxRaw >= collectCap;
                // Calculate fill percentage toward this item's collect_cap
                const capPct = collectCap > 0 ? Math.min((liveMax / collectCap) * 100, 100) : 0;
                const fmtRange = (lo: number, hi: number) => lo === hi ? lo.toLocaleString() : `${lo.toLocaleString()} – ${hi.toLocaleString()}`;
                return (<tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <a href={`/games/${gameId}/items/${defId}`} className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors" title={defId} onClick={(e) => e.stopPropagation()}>
                            {defName || defId || "—"}
                            <ExternalLink className="h-3 w-3 shrink-0"/>
                          </a>
                          {defId && <CopyButton text={defId}/>}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right font-mono">{entry.drop_rate != null ? `${(Number(entry.drop_rate) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-2 py-1 text-right font-mono">{String(entry.quantity_min ?? "—")}</td>
                      <td className="px-2 py-1 text-right font-mono">{String(entry.quantity_max ?? "—")}</td>
                      <td className="px-2 py-1 text-right font-mono">{String(entry.collect_cap ?? "—")}</td>
                      <td className="px-2 py-1 text-right font-mono">{String(entry.initial_output ?? "—")}</td>
                      <td className="px-2 py-1 text-right font-mono">
                        {accumulatedTicks === 0 ? (<span className="text-muted-foreground tabular-nums">0</span>) : (<div className="flex flex-col items-end gap-0.5">
                            {isGuaranteed ? (<span className={`font-semibold tabular-nums ${liveCapped ? "text-yellow-500" : "text-green-500"}`}>
                                {fmtRange(liveMin, liveMax)}
                              </span>) : (<span className={`tabular-nums ${liveCapped ? "text-yellow-500" : "text-blue-400"}`}>
                                ~{fmtRange(liveMin, liveMax)}
                              </span>)}
                            {liveCapped && (<span className="text-[9px] text-yellow-500 font-medium">capped</span>)}
                            {collectCap > 0 && !liveCapped && (<span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(capPct)}% of cap</span>)}
                          </div>)}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        <div className="flex flex-col items-end gap-0.5">
                          {isGuaranteed ? (<span className={`font-semibold tabular-nums ${maxCapped ? "text-yellow-500/60" : "text-green-500/60"}`}>
                              {fmtRange(maxMin, maxMax)}
                            </span>) : (<span className={`tabular-nums ${maxCapped ? "text-yellow-500/40" : "text-foreground/40"}`}>
                              ~{fmtRange(maxMin, maxMax)}
                            </span>)}
                          {maxCapped && (<span className="text-[9px] text-yellow-500/60 font-medium">capped</span>)}
                        </div>
                      </td>
                    </tr>);
            })}
              </tbody>
            </table>
          </div>
          {!allGuaranteed && (<p className="text-[10px] text-muted-foreground/70 italic mt-1">
              ⚠ Values with ~ are estimates. Only 100% drop rate items are guaranteed.
            </p>)}
        </div>)}
    </div>);
}
export default function GameUserProgressDetailPage({ params: paramsProp, }: {
    params: Promise<{
        id: string;
        progressId: string;
    }>;
}) {
    const params = use(paramsProp);
    const gameId = params.id;
    const progressId = params.progressId;
    const router = useRouter();
    const searchParams = useSearchParams();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [game, setGame] = useState<any>(null);
    const [detail, setDetail] = useState<GameProgressDetail | null>(null);
    const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmittingBan, setIsSubmittingBan] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Items tab
    const ITEMS_LIMIT = 50;
    const [itemFilterName, setItemFilterName] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("item_q") ?? "" : "");
    const [itemFilterCategory, setItemFilterCategory] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("item_cat") ?? "" : "");
    const [itemFilterRarity, setItemFilterRarity] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("item_rar") ?? "" : "");
    const [itemFilterContainerId, setItemFilterContainerId] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("item_cid") ?? "" : "");
    const [itemFilterId, setItemFilterId] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("item_iid") ?? "" : "");
    const [itemFilterNameDebounced, setItemFilterNameDebounced] = useState(itemFilterName);
    const [itemCategories, setItemCategories] = useState<string[]>([]);
    const [itemRarities, setItemRarities] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState(() => {
        const tab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
        return tab === "items" || tab === "containers" || tab === "presets" || tab === "generators" || tab === "equipments" || tab === "quests" || tab === "journey" || tab === "battle" || tab === "transactions" ? tab : "info";
    });
    const [playerItems, setPlayerItems] = useState<PlayerItem[]>([]);
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
    // Cache: container instance id → name, container definition id → name
    const [linkedInstanceNames, setLinkedInstanceNames] = useState<Record<string, string>>({});
    const [linkedDefNames, setLinkedDefNames] = useState<Record<string, string>>({});
    const [itemsTotal, setItemsTotal] = useState(0);
    const [itemsOffset, setItemsOffset] = useState(0);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);
    // debounce item name filter
    useEffect(() => {
        const t = setTimeout(() => setItemFilterNameDebounced(itemFilterName), 400);
        return () => clearTimeout(t);
    }, [itemFilterName]);
    // reset offset when any filter changes
    useEffect(() => {
        setItemsOffset(0);
    }, [itemFilterNameDebounced, itemFilterCategory, itemFilterRarity, itemFilterContainerId, itemFilterId]);
    // sync item filters to URL
    useEffect(() => {
        const newParams = new URLSearchParams(window.location.search);
        itemFilterNameDebounced ? newParams.set("item_q", itemFilterNameDebounced) : newParams.delete("item_q");
        itemFilterCategory ? newParams.set("item_cat", itemFilterCategory) : newParams.delete("item_cat");
        itemFilterRarity ? newParams.set("item_rar", itemFilterRarity) : newParams.delete("item_rar");
        itemFilterContainerId ? newParams.set("item_cid", itemFilterContainerId) : newParams.delete("item_cid");
        itemFilterId ? newParams.set("item_iid", itemFilterId) : newParams.delete("item_iid");
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [itemFilterNameDebounced, itemFilterCategory, itemFilterRarity, itemFilterContainerId, itemFilterId]); // eslint-disable-line react-hooks/exhaustive-deps
    // load categories & rarities once
    useEffect(() => {
        Promise.all([fetchItemCategories(), fetchItemRarities()])
            .then(([cats, rars]) => { setItemCategories(cats); setItemRarities(rars); })
            .catch(() => { });
    }, []);
    // Transactions tab
    const GACHA_TXN_LIMIT = 50;
    const [gachaTxns, setGachaTxns] = useState<GachaTransaction[]>([]);
    const [gachaTxnsTotal, setGachaTxnsTotal] = useState(0);
    const [gachaTxnsOffset, setGachaTxnsOffset] = useState(0);
    const [gachaTxnsLoading, setGachaTxnsLoading] = useState(false);
    const [gachaTxnsError, setGachaTxnsError] = useState<string | null>(null);
    const [txnSubTab, setTxnSubTab] = useState<"gacha" | "shopping">("gacha");
    const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(new Set());
    const toggleTxnExpanded = (id: string) => setExpandedTxnIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    // Containers tab
    const CONTAINERS_LIMIT = 50;
    // Presets tab
    const [presets, setPresets] = useState<PlayerPresetContainer[]>([]);
    const [presetsLoading, setPresetsLoading] = useState(false);
    const [presetsError, setPresetsError] = useState<string | null>(null);
    const [expandedPresetIds, setExpandedPresetIds] = useState<Set<string>>(new Set());
    const [presetDetails, setPresetDetails] = useState<Record<string, PlayerPresetDetail>>({});
    const [presetDetailsLoading, setPresetDetailsLoading] = useState<Set<string>>(new Set());
    const [presetDetailsError, setPresetDetailsError] = useState<Record<string, string>>({});
    // inventory_item_id → { name, definitionId }
    const [presetSlotItemNames, setPresetSlotItemNames] = useState<Record<string, {
        name: string;
        definitionId: string;
    }>>({});
    // Equipments tab
    const [equipmentSlots, setEquipmentSlots] = useState<import("@/types/inventory").EquipmentSlot[]>([]);
    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentError, setEquipmentError] = useState<string | null>(null);
    const [equippedItems, setEquippedItems] = useState<import("@/lib/game-user-api").PlayerEquippedItem[]>([]);
    const [equippedLoading, setEquippedLoading] = useState(false);
    // Generators tab
    const [generatorItems, setGeneratorItems] = useState<PlayerItem[]>([]);
    const [generatorsLoading, setGeneratorsLoading] = useState(false);
    const [generatorsError, setGeneratorsError] = useState<string | null>(null);
    const [genOutputPoolDefNames, setGenOutputPoolDefNames] = useState<Record<string, string>>({});
    const [containers, setContainers] = useState<PlayerContainer[]>([]);
    const [containersTotal, setContainersTotal] = useState(0);
    const [containersHasMore, setContainersHasMore] = useState(false);
    const [containersOffset, setContainersOffset] = useState(0);
    const [containersType, setContainersType] = useState<"" | "inventory" | "shulker_box">("");
    const [containersInstanceId, setContainersInstanceId] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("container_q") ?? "" : "");
    const [containersLoading, setContainersLoading] = useState(false);
    const [containersError, setContainersError] = useState<string | null>(null);
    const [containersProfileId, setContainersProfileId] = useState<string | null>(null);
    const [containersUserId, setContainersUserId] = useState<string | null>(null);
    // sync containers instance filter to URL
    useEffect(() => {
        const newParams = new URLSearchParams(window.location.search);
        containersInstanceId ? newParams.set("container_q", containersInstanceId) : newParams.delete("container_q");
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [containersInstanceId]); // eslint-disable-line react-hooks/exhaustive-deps
    const [expandedContainerIds, setExpandedContainerIds] = useState<Set<string>>(new Set());
    // Cache: item definition id → name
    const [itemDefNames, setItemDefNames] = useState<Record<string, string>>({});
    // Container map used in the Items tab (id → container)
    const [containerMapForItems, setContainerMapForItems] = useState<Record<string, PlayerContainer>>({});
    const [idempotencyHelpOpen, setIdempotencyHelpOpen] = useState(false);
    // Quest History tab
    const QUEST_LIMIT = 50;
    const [questHistory, setQuestHistory] = useState<QuestHistoryResult | null>(null);
    const [questLoading, setQuestLoading] = useState(false);
    const [questError, setQuestError] = useState<string | null>(null);
    const [questSubTab, setQuestSubTab] = useState<QuestSubTab>(() => {
        const sub = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("quest_sub") : null;
        return sub === "chain" || sub === "daily-ahead" || sub === "timeframe" || sub === "this-week" || sub === "this-month"
            ? (sub === "this-week" || sub === "this-month" ? "timeframe" : sub)
            : "all";
    });
    const [dailyQuestTimeframe, setDailyQuestTimeframe] = useState<DailyQuestTimeframe>(() => {
        if (typeof window === "undefined")
            return "this-week";
        const timeframe = localStorage.getItem(DAILY_QUEST_TIMEFRAME_STORAGE_KEY);
        return timeframe === "last-week" || timeframe === "this-month" || timeframe === "last-month" ? timeframe : "this-week";
    });
    const [dailyQuestStartDate, setDailyQuestStartDate] = useState(() => getDailyQuestTimeframeRange(dailyQuestTimeframe).startDate);
    const [dailyQuestEndDate, setDailyQuestEndDate] = useState(() => getDailyQuestTimeframeRange(dailyQuestTimeframe).endDate);
    const [dailyQuestTimeframeRequestKey, setDailyQuestTimeframeRequestKey] = useState(0);
    const [questStatusFilter, setQuestStatusFilter] = useState<QuestStatusFilter>(() => {
        const status = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("quest_status") : null;
        return status === "all" || QUEST_STATUS_FILTERS.includes(status as Exclude<QuestStatusFilter, "all">) ? status as QuestStatusFilter : "all";
    });
    const [questTypeFilter, setQuestTypeFilter] = useState<string>(() => {
        const sub = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("quest_type") : null;
        return sub === "daily" || sub === "one_time" ? sub : "all";
    });
    const [questStartFrom, setQuestStartFrom] = useState<string>(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("start_from") ?? "" : "");
    const [questStartTo, setQuestStartTo] = useState<string>(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("start_to") ?? "" : "");
    const [questSearch, setQuestSearch] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("quest_q") ?? "" : "");
    const [questSearchQuery, setQuestSearchQuery] = useState(() => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("quest_q")?.trim() ?? "" : "");
    const questHistorySearchQuery = questSubTab === "all" ? questSearchQuery : "";
    const [questExpandedRows, setQuestExpandedRows] = useState<Set<string>>(new Set());
    const [questHistoryBoundaries, setQuestHistoryBoundaries] = useState<Record<string, { loaded: number; total: number }>>({});
    const [questItemNames, setQuestItemNames] = useState<Record<string, string>>({});
    const [maxAdvanceDaysHelpHovered, setMaxAdvanceDaysHelpHovered] = useState(false);
    const [maxAdvanceDaysHelpPinned, setMaxAdvanceDaysHelpPinned] = useState(false);
    const maxAdvanceDaysHelpTriggerRef = useRef<HTMLButtonElement>(null);
    const maxAdvanceDaysHelpContentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!maxAdvanceDaysHelpPinned)
            return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (maxAdvanceDaysHelpTriggerRef.current?.contains(target) || maxAdvanceDaysHelpContentRef.current?.contains(target))
                return;
            setMaxAdvanceDaysHelpPinned(false);
            setMaxAdvanceDaysHelpHovered(false);
        };
        document.addEventListener("pointerdown", handlePointerDown, true);
        return () => document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [maxAdvanceDaysHelpPinned]);
    // Daily Ahead sub-tab
    const [dailyAheadPools, setDailyAheadPools] = useState<DailyQuestPool[]>([]);
    const [dailyAheadPoolsLoading, setDailyAheadPoolsLoading] = useState(false);
    const [dailyAheadSelectedPoolId, setDailyAheadSelectedPoolIdState] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("saigame_selected_quest_pool_id") || "";
        }
        return "";
    });
    const setDailyAheadSelectedPoolId = useCallback((val: string) => {
        setDailyAheadSelectedPoolIdState(val);
        if (typeof window !== "undefined") {
            localStorage.setItem("saigame_selected_quest_pool_id", val);
        }
    }, []);
    const [dailyAheadPreview, setDailyAheadPreview] = useState<DailyQuestFuturePreview | null>(null);
    const [dailyAheadLoading, setDailyAheadLoading] = useState(false);
    const [dailyAheadError, setDailyAheadError] = useState<string | null>(null);
    const [dailyAheadDays, setDailyAheadDays] = useState(30);
    const toggleQuestRow = (id: string) => setQuestExpandedRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    // Battle tab
    const BATTLE_LIMIT = 50;
    const [battleSessions, setBattleSessions] = useState<BattleSession[]>([]);
    const [battleTotal, setBattleTotal] = useState(0);
    const [battleOffset, setBattleOffset] = useState(0);
    const [battleLoading, setBattleLoading] = useState(false);
    const [battleError, setBattleError] = useState<string | null>(null);
    const [battleExpandedRows, setBattleExpandedRows] = useState<Set<string>>(new Set());
    const toggleBattleRow = (id: string) => setBattleExpandedRows(prev => prev.has(id) ? new Set() : new Set([id]));
    // Journey tab
    const JOURNEY_LIMIT = 50;
    const JOURNEY_EVENTS_LIMIT = 200;
    const [journeySessions, setJourneySessions] = useState<JourneySession[]>([]);
    const [journeyTotal, setJourneyTotal] = useState(0);
    const [journeyOffset, setJourneyOffset] = useState(0);
    const [journeyLoading, setJourneyLoading] = useState(false);
    const [journeyError, setJourneyError] = useState<string | null>(null);
    const [journeyExpandedRows, setJourneyExpandedRows] = useState<Set<string>>(new Set());
    const [journeyEvents, setJourneyEvents] = useState<Record<string, JourneyEvent[]>>({});
    const [journeyEventsTotal, setJourneyEventsTotal] = useState<Record<string, number>>({});
    const [journeyEventsLoading, setJourneyEventsLoading] = useState<Set<string>>(new Set());
    const [journeyEventsError, setJourneyEventsError] = useState<Record<string, string>>({});
    const [journeyExpandedEvents, setJourneyExpandedEvents] = useState<Set<string>>(new Set());
    const toggleJourneyEvent = (eventId: string) => setJourneyExpandedEvents(prev => { const s = new Set(prev); s.has(eventId) ? s.delete(eventId) : s.add(eventId); return s; });
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [gameRes, detailRes, progressRes] = await Promise.all([
                getGame(gameId),
                getGameProgressDetail(progressId),
                getGameProgressList(gameId),
            ]);
            const listItem = progressRes.progress.find((item) => item.id === progressId);
            const mergedDetail: GameProgressDetail = {
                ...detailRes,
                user_display_name: detailRes.user_display_name ?? listItem?.user_display_name,
                user_email: detailRes.user_email ?? listItem?.user_email,
                user_created_at: detailRes.user_created_at ?? listItem?.user_created_at,
                banned_at: detailRes.banned_at ?? listItem?.banned_at ?? null,
                banned_by: detailRes.banned_by ?? listItem?.banned_by ?? null,
            };
            const identityMap = await getPlayerIdentityMapByUserIds([mergedDetail.user_id], [{
                    user_id: mergedDetail.user_id,
                    user_display_name: mergedDetail.user_display_name,
                    user_email: mergedDetail.user_email,
                }]);
            setGame(gameRes);
            setDetail(mergedDetail);
            setIdentity(identityMap[mergedDetail.user_id] || null);
            setError(null);
        }
        catch (err) {
            console.error(err);
            setError("Failed to load player detail");
        }
        finally {
            setLoading(false);
        }
    }, [gameId, progressId]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    const loadItems = useCallback(async () => {
        setItemsLoading(true);
        setItemsError(null);
        try {
            const [res, containersRes] = await Promise.all([
                getProgressItems(progressId, {
                    limit: itemFilterId ? 500 : ITEMS_LIMIT,
                    offset: itemFilterId ? 0 : itemsOffset,
                    name: !itemFilterId ? (itemFilterNameDebounced || undefined) : undefined,
                    category: itemFilterCategory || undefined,
                    rarity: itemFilterRarity || undefined,
                    container_id: itemFilterContainerId || undefined,
                }),
                getProgressContainers(progressId, { limit: 500 }),
            ]);
            const rawItems = res.items ?? [];
            setPlayerItems(itemFilterId ? rawItems.filter(item => item.id === itemFilterId) : rawItems);
            setItemsTotal(res.total ?? 0);
            const map: Record<string, PlayerContainer> = {};
            for (const c of containersRes.containers ?? [])
                map[c.id] = c;
            setContainerMapForItems(map);
        }
        catch (err: any) {
            setItemsError(err?.message ?? "Failed to load items");
        }
        finally {
            setItemsLoading(false);
        }
    }, [progressId, itemsOffset, itemFilterNameDebounced, itemFilterCategory, itemFilterRarity, itemFilterContainerId, itemFilterId]);
    const loadGachaTransactions = useCallback(async () => {
        setGachaTxnsLoading(true);
        setGachaTxnsError(null);
        try {
            const res = await getGachaTransactions(progressId, { limit: GACHA_TXN_LIMIT, offset: gachaTxnsOffset });
            setGachaTxns(res.transactions ?? []);
            setGachaTxnsTotal(res.total ?? 0);
        }
        catch (err: any) {
            setGachaTxnsError(err?.message ?? "Failed to load gacha transactions");
        }
        finally {
            setGachaTxnsLoading(false);
        }
    }, [progressId, gachaTxnsOffset]);
    const loadContainers = useCallback(async () => {
        setContainersLoading(true);
        setContainersError(null);
        try {
            const res = await getProgressContainers(progressId, {
                limit: CONTAINERS_LIMIT,
                offset: containersOffset,
                type: containersType || undefined,
                instance_id: containersInstanceId.trim() || undefined,
            });
            setContainers(res.containers ?? []);
            setContainersHasMore(res.has_more ?? false);
            setContainersProfileId(res.profile_id ?? null);
            setContainersUserId(res.user_id ?? null);
            setContainersTotal(res.has_more
                ? containersOffset + (res.containers?.length ?? 0) + 1
                : containersOffset + (res.containers?.length ?? 0));
        }
        catch (err: any) {
            const msg = err?.message ?? "";
            setContainersError(msg.includes("invalid_instance_id") ? "Invalid instance ID — must be a valid UUID." : (msg || "Failed to load containers"));
        }
        finally {
            setContainersLoading(false);
        }
    }, [progressId, containersOffset, containersType, containersInstanceId]);
    const loadPresets = useCallback(async () => {
        if (!detail?.user_id)
            return;
        setPresetsLoading(true);
        setPresetsError(null);
        try {
            const res = await getPlayerPresets(gameId, detail.user_id);
            const containers = res.containers ?? [];
            setPresets(containers);
            // Load all preset details in parallel to get definition names
            const detailResults = await Promise.allSettled(containers.map(c => getPlayerPresetDetail(gameId, detail.user_id, c.id)));
            const newDetails: Record<string, PlayerPresetDetail> = {};
            for (let i = 0; i < containers.length; i++) {
                const r = detailResults[i];
                if (r.status === "fulfilled") {
                    newDetails[containers[i].id] = r.value;
                }
            }
            setPresetDetails(prev => ({ ...prev, ...newDetails }));
        }
        catch (err: any) {
            setPresetsError(err?.message ?? "Failed to load presets");
        }
        finally {
            setPresetsLoading(false);
        }
    }, [gameId, detail?.user_id]);
    const togglePresetRow = useCallback((presetId: string) => {
        setExpandedPresetIds(prev => {
            const next = new Set(prev);
            if (next.has(presetId)) {
                next.delete(presetId);
            }
            else {
                next.add(presetId);
                // Lazy-load detail if not already fetched or loading
                if (!presetDetails[presetId] && !presetDetailsLoading.has(presetId) && detail?.user_id) {
                    setPresetDetailsLoading(s => { const n = new Set(s); n.add(presetId); return n; });
                    setPresetDetailsError(s => { const n = { ...s }; delete n[presetId]; return n; });
                    getPlayerPresetDetail(gameId, detail.user_id, presetId)
                        .then(res => {
                        setPresetDetails(s => ({ ...s, [presetId]: res }));
                        // Resolve inventory item names for all slots in parallel
                        const idsToResolve = res.slots
                            .map(sl => sl.inventory_item_id)
                            .filter(id => id && !presetSlotItemNames[id]);
                        if (idsToResolve.length > 0) {
                            getProgressItems(progressId, { limit: 200 })
                                .then(itemsRes => {
                                const newNames: Record<string, {
                                    name: string;
                                    definitionId: string;
                                }> = {};
                                for (const item of itemsRes.items ?? []) {
                                    if (idsToResolve.includes(item.id)) {
                                        newNames[item.id] = { name: item.definition?.name ?? "", definitionId: item.item_definition_id };
                                    }
                                }
                                setPresetSlotItemNames(s => ({ ...s, ...newNames }));
                            })
                                .catch(() => { });
                        }
                    })
                        .catch((err: any) => setPresetDetailsError(s => ({ ...s, [presetId]: err?.message ?? "Failed to load preset detail" })))
                        .finally(() => setPresetDetailsLoading(s => { const n = new Set(s); n.delete(presetId); return n; }));
                }
            }
            return next;
        });
    }, [gameId, detail?.user_id, presetDetails, presetDetailsLoading]);
    const loadGenerators = useCallback(async () => {
        setGeneratorsLoading(true);
        setGeneratorsError(null);
        try {
            // Fetch all items with category=generator (no pagination for simplicity)
            const res = await getProgressItems(progressId, { limit: 200, category: "generator" });
            const gens = res.items ?? [];
            setGeneratorItems(gens);
            // Resolve output pool item names
            const knownNames: Record<string, string> = {};
            const idsToResolve = new Set<string>();
            gens.forEach((pi) => {
                if (pi.definition) {
                    knownNames[pi.item_definition_id] = pi.definition.name;
                    knownNames[pi.definition.id] = pi.definition.name;
                }
                const gc = pi.definition?.metadata?.generator_config as Record<string, unknown> | undefined;
                if (!gc)
                    return;
                const pool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : [];
                pool.forEach((entry) => {
                    const defId = String(entry.item_definition_id ?? "");
                    if (defId && !knownNames[defId])
                        idsToResolve.add(defId);
                });
            });
            if (idsToResolve.size > 0) {
                const resolved = { ...knownNames };
                await Promise.allSettled([...idsToResolve].map((id) => getItemDefinition({ gameId }, id)
                    .then((r) => { resolved[id] = r.item.name; })
                    .catch(() => { })));
                setGenOutputPoolDefNames(resolved);
            }
            else {
                setGenOutputPoolDefNames(knownNames);
            }
        }
        catch (err: any) {
            setGeneratorsError(err?.message ?? "Failed to load generators");
        }
        finally {
            setGeneratorsLoading(false);
        }
    }, [progressId, gameId]);
    const loadQuestHistory = useCallback(async () => {
        if (!detail?.user_id)
            return;
        setQuestLoading(true);
        setQuestError(null);
        setQuestExpandedRows(new Set());
        setQuestHistoryBoundaries({});
        try {
            const res = await getPlayerQuestHistory(gameId, detail.user_id, {
                limit: QUEST_LIMIT,
                q: questHistorySearchQuery || undefined,
                quest_type: questTypeFilter === "all" ? undefined : questTypeFilter,
                start_from: questStartFrom || undefined,
                start_to: questStartTo || undefined,
            });
            setQuestHistory({
                ...res,
                claims: res.claims ?? [],
                starts: res.starts ?? [],
                claims_total: res.claims_total ?? 0,
                starts_total: res.starts_total ?? 0,
            });
            if (UUID_RE.test(questHistorySearchQuery) && res.starts?.some(start => start.progress.id === questHistorySearchQuery)) {
                setQuestExpandedRows(new Set([`start-${questHistorySearchQuery}`]));
            }
            // Collect item_definition_ids to resolve names from: granted rewards,
            // quest-defined rewards, and items referenced inside quest conditions.
            const itemIds = new Set<string>();
            const collectFromRewards = (rewards: any) => {
                if (!Array.isArray(rewards))
                    return;
                for (const r of rewards) {
                    if (r?.item_definition_id && typeof r.item_definition_id === "string")
                        itemIds.add(r.item_definition_id);
                }
            };
            const collectFromConditions = (node: any) => {
                if (!node)
                    return;
                if (node.operator && Array.isArray(node.clauses)) {
                    for (const c of node.clauses)
                        collectFromConditions(c);
                    return;
                }
                if (Array.isArray(node.items)) {
                    for (const it of node.items) {
                        if (it?.item_definition_id && typeof it.item_definition_id === "string")
                            itemIds.add(it.item_definition_id);
                    }
                }
            };
            for (const claim of res.claims ?? []) {
                collectFromRewards((claim as any).rewards_granted);
                const qd = (claim as any).quest_definition;
                if (qd) {
                    collectFromRewards(qd.rewards);
                    collectFromConditions(qd.conditions);
                }
            }
            for (const start of res.starts ?? []) {
                const q = (start as any).quest;
                if (q) {
                    collectFromRewards(q.rewards);
                    collectFromConditions(q.conditions);
                }
            }
            if (itemIds.size > 0) {
                const ctx = { gameId };
                const nameMap: Record<string, string> = {};
                await Promise.allSettled([...itemIds].map(id => getItemDefinition(ctx, id)
                    .then(r2 => { nameMap[id] = r2.item.name; })
                    .catch(() => { })));
                setQuestItemNames(nameMap);
            }
        }
        catch (err: any) {
            setQuestError(err?.message ?? "Failed to load quest history");
        }
        finally {
            setQuestLoading(false);
        }
    }, [gameId, detail, questHistorySearchQuery, questTypeFilter, questStartFrom, questStartTo]);

    const loadMoreQuests = useCallback(async () => {
        if (questLoading || !questHistory || !detail?.user_id)
            return;

        const lastProgress = questHistory.starts?.[questHistory.starts.length - 1]?.progress.id;
        if (!lastProgress)
            return;

        const loadedCount = questHistory.starts.length;
        const totalCount = questHistory.starts_total ?? 0;

        setQuestHistoryBoundaries(prev => ({
            ...prev,
            [`start-${lastProgress}`]: { loaded: loadedCount, total: totalCount }
        }));
        const lastClaim = questHistory.claims && questHistory.claims.length > 0
            ? questHistory.claims[questHistory.claims.length - 1].id
            : undefined;

        setQuestLoading(true);
        try {
            const res = await getPlayerQuestHistory(gameId, detail.user_id, {
                limit: QUEST_LIMIT,
                after_progress: lastProgress,
                after_claim: lastClaim,
                q: questHistorySearchQuery || undefined,
                quest_type: questTypeFilter === "all" ? undefined : questTypeFilter,
                start_from: questStartFrom || undefined,
                start_to: questStartTo || undefined,
            });
            setQuestHistory(prev => {
                if (!prev) return res;
                const existingStartIds = new Set(prev.starts.map(s => s.progress.id));
                const newStarts = (res.starts ?? []).filter(s => !existingStartIds.has(s.progress.id));
                const existingClaimIds = new Set(prev.claims.map(c => c.id));
                const newClaims = (res.claims ?? []).filter(c => !existingClaimIds.has(c.id));
                return {
                    ...res,
                    starts: [...prev.starts, ...newStarts],
                    claims: [...prev.claims, ...newClaims],
                    starts_total: res.starts_total,
                    claims_total: res.claims_total,
                    after_progress: res.after_progress,
                    after_claim: res.after_claim,
                };
            });
            // Collect item_definition_ids to resolve names from: granted rewards,
            // quest-defined rewards, and items referenced inside quest conditions.
            const itemIds = new Set<string>();
            const collectFromRewards = (rewards: any) => {
                if (!Array.isArray(rewards))
                    return;
                for (const r of rewards) {
                    if (r?.item_definition_id && typeof r.item_definition_id === "string")
                        itemIds.add(r.item_definition_id);
                }
            };
            const collectFromConditions = (node: any) => {
                if (!node)
                    return;
                if (node.operator && Array.isArray(node.clauses)) {
                    for (const c of node.clauses)
                        collectFromConditions(c);
                    return;
                }
                if (Array.isArray(node.items)) {
                    for (const it of node.items) {
                        if (it?.item_definition_id && typeof it.item_definition_id === "string")
                            itemIds.add(it.item_definition_id);
                    }
                }
            };
            for (const claim of res.claims ?? []) {
                collectFromRewards((claim as any).rewards_granted);
                const qd = (claim as any).quest_definition;
                if (qd) {
                    collectFromRewards(qd.rewards);
                    collectFromConditions(qd.conditions);
                }
            }
            for (const start of res.starts ?? []) {
                const q = (start as any).quest;
                if (q) {
                    collectFromRewards(q.rewards);
                    collectFromConditions(q.conditions);
                }
            }
            if (itemIds.size > 0) {
                const ctx = { gameId };
                const nameMap = { ...questItemNames };
                let newIds = [...itemIds].filter(id => !nameMap[id]);
                if (newIds.length > 0) {
                    await Promise.allSettled(newIds.map(id => getItemDefinition(ctx, id)
                        .then(r2 => { nameMap[id] = r2.item.name; })
                        .catch(() => { })));
                    setQuestItemNames(nameMap);
                }
            }
        }
        catch (err: any) {
            setQuestError(err?.message ?? "Failed to load more quests");
        }
        finally {
            setQuestLoading(false);
        }
    }, [gameId, detail, questHistory, questHistorySearchQuery, questTypeFilter, questStartFrom, questStartTo, questItemNames]);
    const loadDailyAheadPools = useCallback(async () => {
        setDailyAheadPoolsLoading(true);
        try {
            const res = await listDailyQuestPools(gameId);
            setDailyAheadPools(res.pools ?? []);
            if (res.pools?.length) {
                if (!dailyAheadSelectedPoolId || !res.pools.find(p => p.id === dailyAheadSelectedPoolId)) {
                    setDailyAheadSelectedPoolId(res.pools[0].id);
                }
            }
        }
        catch {
            // silently ignore — user will see empty selector
        }
        finally {
            setDailyAheadPoolsLoading(false);
        }
    }, [gameId, dailyAheadSelectedPoolId]);
    const loadDailyAheadPreview = useCallback(async (poolId: string) => {
        if (!detail?.user_id || !poolId)
            return;
        setDailyAheadLoading(true);
        setDailyAheadError(null);
        setDailyAheadPreview(null);
        try {
            if (questSubTab === "timeframe") {
                const res = await getPlayerDailyQuestTimeframe(gameId, poolId, detail.user_id, {
                    start_date: dailyQuestStartDate,
                    end_date: dailyQuestEndDate,
                });
                setDailyAheadPreview(res);
            } else {
                const res = await getPlayerDailyQuestAheadPreview(gameId, poolId, detail.user_id, { days_ahead: dailyAheadDays });
                setDailyAheadPreview(res);
            }
        }
        catch (err: any) {
            setDailyAheadError(err?.message ?? "Failed to load daily quest preview");
        }
        finally {
            setDailyAheadLoading(false);
        }
    }, [gameId, detail, dailyAheadDays, questSubTab, dailyQuestStartDate, dailyQuestEndDate]);
    const loadBattleSessions = useCallback(async () => {
        if (!detail?.user_id)
            return;
        setBattleLoading(true);
        setBattleError(null);
        try {
            const res = await getBattleSessions(gameId, detail.user_id, { limit: BATTLE_LIMIT, offset: battleOffset });
            setBattleSessions(res.sessions ?? []);
            setBattleTotal(res.total ?? 0);
        }
        catch (err: any) {
            setBattleError(err?.message ?? "Failed to load battle sessions");
        }
        finally {
            setBattleLoading(false);
        }
    }, [gameId, detail, battleOffset]);
    const loadJourneySessions = useCallback(async () => {
        if (!detail?.user_id)
            return;
        setJourneyLoading(true);
        setJourneyError(null);
        try {
            const res = await getJourneySessions(gameId, detail.user_id, { limit: JOURNEY_LIMIT, offset: journeyOffset });
            setJourneySessions(res.sessions ?? []);
            setJourneyTotal(res.total ?? 0);
        }
        catch (err: any) {
            setJourneyError(err?.message ?? "Failed to load journey sessions");
        }
        finally {
            setJourneyLoading(false);
        }
    }, [gameId, detail, journeyOffset]);
    const loadJourneyEvents = useCallback(async (sessionId: string) => {
        setJourneyEventsLoading(prev => { const n = new Set(prev); n.add(sessionId); return n; });
        setJourneyEventsError(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
        try {
            const res = await getJourneySessionEvents(gameId, sessionId, { limit: JOURNEY_EVENTS_LIMIT, offset: 0 });
            setJourneyEvents(prev => ({ ...prev, [sessionId]: res.events ?? [] }));
            setJourneyEventsTotal(prev => ({ ...prev, [sessionId]: res.total ?? 0 }));
        }
        catch (err: any) {
            setJourneyEventsError(prev => ({ ...prev, [sessionId]: err?.message ?? "Failed to load events" }));
        }
        finally {
            setJourneyEventsLoading(prev => { const n = new Set(prev); n.delete(sessionId); return n; });
        }
    }, [gameId]);
    const toggleJourneyRow = useCallback((sessionId: string) => {
        setJourneyExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            }
            else {
                next.add(sessionId);
                if (!journeyEvents[sessionId] && !journeyEventsLoading.has(sessionId)) {
                    loadJourneyEvents(sessionId);
                }
            }
            return next;
        });
    }, [journeyEvents, journeyEventsLoading, loadJourneyEvents]);
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.replace(tab === "info" ? window.location.pathname : `${window.location.pathname}?tab=${encodeURIComponent(tab)}`, { scroll: false });
    };
    const handleQuestSubTabChange = (sub: QuestSubTab) => {
        setQuestSubTab(sub);
        setQuestSearch("");
        setQuestSearchQuery("");
        setQuestStatusFilter("all");
        const params = new URLSearchParams({ tab: "quests", quest_sub: sub });
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };
    const handleDailyQuestTimeframeChange = (timeframe: DailyQuestTimeframe) => {
        const { startDate, endDate } = getDailyQuestTimeframeRange(timeframe);
        setDailyQuestTimeframe(timeframe);
        localStorage.setItem(DAILY_QUEST_TIMEFRAME_STORAGE_KEY, timeframe);
        setDailyQuestStartDate(startDate);
        setDailyQuestEndDate(endDate);
        setDailyQuestTimeframeRequestKey(key => key + 1);
        setQuestSubTab("timeframe");
        const params = new URLSearchParams({ tab: "quests", quest_sub: "timeframe", quest_timeframe: timeframe });
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };
    const handleQuestStatusFilterChange = (status: QuestStatusFilter) => {
        setQuestStatusFilter(status);
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        status === "all" ? params.delete("quest_status") : params.set("quest_status", status);
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };
    const handleQuestTypeFilterChange = (type: string) => {
        setQuestTypeFilter(type);
        const params = new URLSearchParams(window.location.search);
        type === "all" ? params.delete("quest_type") : params.set("quest_type", type);
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };
    const handleQuestStartFromChange = (from: string) => {
        setQuestStartFrom(from);
        const params = new URLSearchParams(window.location.search);
        from ? params.set("start_from", from) : params.delete("start_from");
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };
    const handleQuestStartToChange = (to: string) => {
        setQuestStartTo(to);
        const params = new URLSearchParams(window.location.search);
        to ? params.set("start_to", to) : params.delete("start_to");
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    };
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const trimmedSearch = questSearch.trim();
            setQuestSearchQuery(trimmedSearch);
            const params = new URLSearchParams(window.location.search);
            trimmedSearch ? params.set("quest_q", trimmedSearch) : params.delete("quest_q");
            const query = params.toString();
            router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, { scroll: false });
        }, 350);
        return () => window.clearTimeout(timer);
    }, [questSearch, router]);
    useEffect(() => {
        const legacySubTab = searchParams.get("quest_sub");
        if (activeTab !== "quests" || (legacySubTab !== "completed" && legacySubTab !== "inprogress"))
            return;
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.set("quest_sub", "all");
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }, [activeTab, router, searchParams]);
    useEffect(() => {
        if (activeTab === "items")
            loadItems();
    }, [activeTab, loadItems]);
    useEffect(() => {
        if (activeTab === "transactions" && txnSubTab === "gacha")
            loadGachaTransactions();
    }, [activeTab, txnSubTab, loadGachaTransactions]);
    useEffect(() => {
        if (activeTab === "containers")
            loadContainers();
    }, [activeTab, loadContainers]);
    useEffect(() => {
        if (activeTab === "presets")
            loadPresets();
    }, [activeTab, loadPresets]);
    useEffect(() => {
        if (activeTab === "generators")
            loadGenerators();
    }, [activeTab, loadGenerators]);
    useEffect(() => {
        if (activeTab === "battle")
            loadBattleSessions();
    }, [activeTab, loadBattleSessions, battleOffset]);
    useEffect(() => {
        if (activeTab === "journey")
            loadJourneySessions();
    }, [activeTab, loadJourneySessions, journeyOffset]);
    useEffect(() => {
        if (activeTab === "quests")
            loadQuestHistory();
    }, [activeTab, loadQuestHistory]);
    useEffect(() => {
        if (activeTab !== "equipments" || !gameId)
            return;
        // Load equipment slot definitions
        if (equipmentSlots.length === 0 && !equipmentLoading) {
            setEquipmentLoading(true);
            setEquipmentError(null);
            import("@/lib/inventory-api").then(({ listEquipmentSlots }) => listEquipmentSlots({ gameId }, { limit: 100, offset: 0, is_active: true })
                .then((res) => setEquipmentSlots(res.slots ?? []))
                .catch((e: unknown) => setEquipmentError((e as Error)?.message ?? "Failed to load equipment slots"))
                .finally(() => setEquipmentLoading(false)));
        }
        // Load player equipped items — requires detail.user_id (different from progressId)
        const userId = detail?.user_id;
        if (userId && equippedItems.length === 0 && !equippedLoading) {
            setEquippedLoading(true);
            import("@/lib/game-user-api").then(({ getPlayerEquipped }) => getPlayerEquipped(gameId, userId)
                .then((res) => setEquippedItems(res.equipped ?? []))
                .catch(() => { }) // non-fatal — just show empty
                .finally(() => setEquippedLoading(false)));
        }
    }, [activeTab, gameId, detail?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps
    // Load pools when entering a daily quest view (or once game loads)
    useEffect(() => {
        if (activeTab === "quests" && (questSubTab === "daily-ahead" || questSubTab === "timeframe") && dailyAheadPools.length === 0) {
            loadDailyAheadPools();
        }
    }, [activeTab, questSubTab]); // eslint-disable-line react-hooks/exhaustive-deps
    // Load preview whenever the selected pool or days change while on the tab
    useEffect(() => {
        if (activeTab === "quests" && (questSubTab === "daily-ahead" || questSubTab === "timeframe") && dailyAheadSelectedPoolId) {
            loadDailyAheadPreview(dailyAheadSelectedPoolId);
        }
    }, [activeTab, questSubTab, dailyQuestStartDate, dailyQuestEndDate, dailyQuestTimeframeRequestKey, dailyAheadSelectedPoolId, dailyAheadDays, detail?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps
    const RARITY_STYLE: Record<string, string> = {
        common: "bg-gray-500/15 text-gray-400 border-gray-400/40",
        uncommon: "bg-green-500/15 text-green-500 border-green-500/40",
        rare: "bg-blue-500/15 text-blue-400 border-blue-400/40",
        epic: "bg-purple-500/15 text-purple-400 border-purple-400/40",
        legendary: "bg-yellow-500/15 text-yellow-500 border-yellow-400/40",
    };
    const renderMetaRow = (label: string, value?: string | number | null, copyable?: boolean) => (<div className="flex items-start justify-between gap-4 border-b pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all flex items-center justify-end font-mono">
        {value ?? "-"}
        {copyable && value && typeof value === "string" && <CopyButton text={value}/>}
      </span>
    </div>);
    return (<div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            {game ? (<>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/studios">{game.studio?.name || t("common.studios")}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${game.id}/players`}>Players</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span>{detail?.user_display_name || "Player detail"}</span>
                </BreadcrumbItem>
              </>) : (<BreadcrumbItem><span>Loading…</span></BreadcrumbItem>)}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}/players`)}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div>
            {loading ? (<Skeleton className="h-7 w-48"/>) : (<h1 className="text-2xl font-bold">
                {identity?.display_name || detail?.user_display_name || "Player Detail"}
              </h1>)}
            {!loading && (identity?.masked_email || detail?.user_email) && (<p className="text-sm text-muted-foreground mt-0.5">
                {identity?.masked_email || detail?.user_email}
              </p>)}
          </div>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="players"/>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <PlayerSectionNav gameId={gameId} progressId={progressId} activeTab={activeTab as any} onTabChange={(tab) => handleTabChange(tab)} counts={{
            items: itemsTotal || undefined,
            containers: containers.length || undefined,
            containersHasMore,
            presets: presets.length || undefined,
            generators: generatorItems.length || undefined,
            quests: questHistory ? (questHistory.claims_total + questHistory.starts_total) || undefined : undefined,
            journey: journeyTotal || undefined,
            transactions: gachaTxnsTotal || undefined,
        }}/>

        <TabsContent value="info" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
            </Button>
          </div>
          {loading ? (<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <Skeleton className="h-6 w-52"/>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(8)].map((_, index) => (<Skeleton key={index} className="h-8 w-full"/>))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32"/>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-20 w-full"/>
                  <Skeleton className="h-20 w-full"/>
                </CardContent>
              </Card>
            </div>) : error || !detail ? (<Card className="border-destructive">
              <CardHeader>
                <CardTitle>{t("common.error")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{error || "Player detail not found"}</p>
                <Button variant="outline" onClick={loadData}>Try Again</Button>
              </CardContent>
            </Card>) : (<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5"/>
                  {identity?.display_name || detail.user_display_name || "Unknown"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {detail.banned_at && <Badge variant="destructive">Banned</Badge>}
                  <Badge variant="secondary">v{detail.version}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant={detail.banned_at ? "outline" : "destructive"} size="sm" disabled={isSubmittingBan}>
                        {isSubmittingBan ? (<Loader2 className="h-3.5 w-3.5 animate-spin"/>) : detail.banned_at ? (<><ShieldCheck className="h-3.5 w-3.5 mr-1"/> Unban</>) : (<><ShieldBan className="h-3.5 w-3.5 mr-1"/> Ban</>)}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {detail.banned_at ? "Unban" : "Ban"} player?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to {detail.banned_at ? "unban" : "ban"}{" "}
                          <strong>{identity?.display_name || detail.user_display_name || "this player"}</strong>?
                          {!detail.banned_at && " This player will no longer be able to access the game."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className={!detail.banned_at ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={async () => {
                setIsSubmittingBan(true);
                try {
                    if (detail.banned_at) {
                        await unbanProgress(detail.id);
                    }
                    else {
                        await banProgress(detail.id);
                    }
                    setDetail((prev) => prev
                        ? {
                            ...prev,
                            banned_at: prev.banned_at ? null : new Date().toISOString(),
                        }
                        : prev);
                }
                catch (err) {
                    console.error("Ban/unban failed", err);
                }
                finally {
                    setIsSubmittingBan(false);
                }
            }}>
                          {detail.banned_at ? "Unban" : "Ban"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{identity?.masked_email || "***@saigame.studio"}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderMetaRow("Gamer Name", identity?.gamer_name || "-")}
              {renderMetaRow("Progress ID", detail.id, true)}
              {renderMetaRow("User ID", detail.user_id, true)}
              {renderMetaRow("Game ID", detail.game_id, true)}
              {renderMetaRow("User Created", detail.user_created_at ? formatTimestamp(detail.user_created_at) : "-")}
              {renderMetaRow("Created", formatTimestamp(detail.created_at))}
              {renderMetaRow("Updated", formatTimestamp(detail.updated_at))}
              {renderMetaRow("Banned At", detail.banned_at ? formatISODate(detail.banned_at) : "-")}
              {renderMetaRow("Banned By", detail.banned_by || "-", !!detail.banned_by)}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4 text-yellow-500"/>Level</span>
                  <span className="font-semibold">{detail.level}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Trophy className="h-4 w-4 text-blue-500"/>EXP</span>
                  <span className="font-semibold">{detail.experience}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Coins className="h-4 w-4 text-amber-500"/>Gold</span>
                  <span className="font-semibold">{detail.gold}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Game Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(detail.game_data ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
          </div>)}
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Player Items</h2>
              <p className="text-sm text-muted-foreground">
                {itemsLoading
            ? "Loading…"
            : itemsTotal > 0
                ? `${itemsTotal} item${itemsTotal !== 1 ? "s" : ""} in inventory`
                : "No items in inventory"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Clear all */}
              {(itemFilterName || itemFilterCategory || itemFilterRarity || itemFilterContainerId || itemFilterId) && (<button className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => { setItemFilterName(""); setItemFilterCategory(""); setItemFilterRarity(""); setItemFilterContainerId(""); setItemFilterId(""); }}>
                  Clear
                </button>)}
              {/* Instance ID search */}
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                <input type="text" placeholder="Instance ID…" value={itemFilterId} onChange={(e) => setItemFilterId(e.target.value.trim())} className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"/>
                {itemFilterId && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setItemFilterId("")}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              {/* Name search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                <input type="text" placeholder="Search by name…" value={itemFilterName} onChange={(e) => setItemFilterName(e.target.value)} className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"/>
                {itemFilterName && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setItemFilterName("")}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              {/* Category */}
              <div className="relative">
                <select className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize pr-6" value={itemFilterCategory} onChange={(e) => setItemFilterCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {itemCategories.map((c) => (<option key={c} value={c} className="capitalize">{c}</option>))}
                </select>
                {itemFilterCategory && (<button className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setItemFilterCategory("")}>
                    <X className="h-3 w-3"/>
                  </button>)}
              </div>
              {/* Rarity */}
              <div className="relative">
                <select className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize pr-6" value={itemFilterRarity} onChange={(e) => setItemFilterRarity(e.target.value)}>
                  <option value="">All rarities</option>
                  {itemRarities.map((r) => (<option key={r} value={r} className="capitalize">{r}</option>))}
                </select>
                {itemFilterRarity && (<button className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setItemFilterRarity("")}>
                    <X className="h-3 w-3"/>
                  </button>)}
              </div>
              {/* Container */}
              {Object.keys(containerMapForItems).length > 0 && (<div className="relative">
                  <select className="h-8 rounded-md border border-input bg-background px-2 text-sm max-w-[180px] pr-6" value={itemFilterContainerId} onChange={(e) => setItemFilterContainerId(e.target.value)}>
                    <option value="">All containers</option>
                    {Object.values(containerMapForItems).map((c) => (<option key={c.id} value={c.id}>
                        {c.definition?.name ?? c.container_type} ({c.id.slice(0, 8)}…)
                      </option>))}
                  </select>
                  {itemFilterContainerId && (<button className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setItemFilterContainerId("")}>
                      <X className="h-3 w-3"/>
                    </button>)}
                </div>)}
              <Button variant="outline" size="icon" onClick={loadItems} disabled={itemsLoading} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${itemsLoading ? "animate-spin" : ""}`}/>
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {itemsLoading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : itemsError ? (<div className="p-6 text-center">
                  <p className="text-destructive text-sm mb-3">{itemsError}</p>
                  <Button variant="outline" size="sm" onClick={loadItems}>Try Again</Button>
                </div>) : playerItems.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">
                    {(itemFilterNameDebounced || itemFilterCategory || itemFilterRarity || itemFilterContainerId || itemFilterId) ? "No matching items" : "No items"}
                  </p>
                  <p className="text-sm mt-1">
                    {(itemFilterNameDebounced || itemFilterCategory || itemFilterRarity || itemFilterContainerId || itemFilterId)
                ? "No items match the current filters."
                : "This player has no items in their inventory."}
                  </p>
                </div>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rarity</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Level</TableHead>
                      <TableHead>Container</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Acquired</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerItems.map((item) => {
                const isGenerator = item.definition?.category === "generator";
                const isExpanded = expandedItemIds.has(item.id);
                const toggleExpand = () => {
                    setExpandedItemIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) {
                            next.delete(item.id);
                        }
                        else {
                            next.add(item.id);
                            // Resolve linked container instance name from already-loaded containerMapForItems
                            const instanceId = item.private_properties?.linked_container_instance_id;
                            if (typeof instanceId === "string") {
                                const c = containerMapForItems[instanceId];
                                if (c) {
                                    setLinkedInstanceNames((m) => ({ ...m, [instanceId]: c.definition?.name ?? c.container_type }));
                                }
                            }
                            // Fetch linked container definition name
                            const defId = item.definition?.metadata?.linked_container_definition_id;
                            if (typeof defId === "string") {
                                setLinkedDefNames((m) => {
                                    if (m[defId] !== undefined)
                                        return m;
                                    getContainerDefinition({ gameId }, defId)
                                        .then((r) => setLinkedDefNames((prev2) => ({ ...prev2, [defId]: r.container_definition.name })))
                                        .catch(() => setLinkedDefNames((prev2) => ({ ...prev2, [defId]: "" })));
                                    return { ...m, [defId]: "…" };
                                });
                            }
                        }
                        return next;
                    });
                };
                return (<Fragment key={item.id}>
                          <TableRow className="hover:bg-muted/40 cursor-pointer" onClick={toggleExpand}>
                            <TableCell>
                              <div className="font-medium whitespace-nowrap flex items-center gap-1">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>}
                                {item.definition?.name ?? item.item_definition_id.slice(0, 8)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.definition?.item_code ? (<span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono" onClick={(e) => e.stopPropagation()}>
                                  {item.definition.item_code}
                                  <CopyButton text={item.definition.item_code}/>
                                </span>) : (<span className="text-xs text-muted-foreground">—</span>)}
                            </TableCell>
                        <TableCell className="capitalize text-sm">
                              <span className="inline-flex items-center gap-1">
                                {item.definition?.category ?? "—"}
                                {isGenerator && <ChevronDown className="h-3 w-3 text-muted-foreground"/>}
                              </span>
                            </TableCell>
                        <TableCell>
                          {item.definition?.rarity ? (<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${RARITY_STYLE[item.definition.rarity] ?? "bg-muted text-muted-foreground border-border"}`}>
                              {item.definition.rarity}
                            </span>) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{item.quantity?.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-sm">{item.level}</TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                        const c = containerMapForItems[item.item_container_id];
                        if (!c)
                            return <span className="text-muted-foreground font-mono text-xs">{item.item_container_id?.slice(0, 8) ?? "—"}</span>;
                        return (<a href={`/games/${gameId}/players/${progressId}/containers/${c.id}?def_name=${encodeURIComponent(c.definition?.name ?? '')}&def_cols=${c.definition?.grid_cols ?? ''}&def_rows=${c.definition?.grid_rows ?? ''}&def_portable=${c.definition?.is_portable ? '1' : '0'}&ctype=${encodeURIComponent(c.container_type)}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors max-w-[160px]" title={c.id}>
                                <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
                                <span className="font-medium truncate">{c.definition?.name ?? c.container_type}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground"/>
                              </a>);
                    })()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Box className="h-3.5 w-3.5"/>
                            ({item.grid_x}, {item.grid_y})
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.acquired_at ? formatISODate(item.acquired_at) : "—"}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {isExpanded && (<TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-6 py-3 space-y-3">
                              {/* IDs */}
                              <div className="space-y-1">
                                {/* Row 1: Instance ID + Version */}
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">Instance ID:</span>
                                    <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
                                    <CopyButton text={item.id}/>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">Version:</span>
                                    <span className="text-xs font-mono text-muted-foreground">{item.version}</span>
                                  </div>
                                </div>
                                {/* Row 2: Definition ID + Definition Item */}
                                <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">Definition ID:</span>
                                    <span className="text-xs font-mono text-muted-foreground">{item.item_definition_id}</span>
                                    <CopyButton text={item.item_definition_id}/>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">Definition Item:</span>
                                    <a href={`/games/${gameId}/items/${item.item_definition_id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium" title="Open item definition" onClick={(e) => e.stopPropagation()}>
                                      {item.definition?.name ?? item.item_definition_id.slice(0, 8)}
                                      <ExternalLink className="h-3 w-3 shrink-0"/>
                                    </a>
                                  </div>
                                </div>
                              </div>

                              {/* Private Properties */}
                              {item.private_properties && Object.keys(item.private_properties).length > 0 && (<div className="space-y-1">
                                  <p className="text-xs font-semibold text-foreground">Private Properties</p>
                                  <div className="bg-muted rounded p-2 space-y-1">
                                    {Object.entries(item.private_properties).map(([k, v]) => {
                                if (k === "linked_container_instance_id" && typeof v === "string") {
                                    return (<div key={k} className="flex items-center gap-2 text-xs font-mono">
                                            <span className="text-muted-foreground">{k}:</span>
                                            <a href={`/games/${gameId}/players/${progressId}?tab=containers&container_q=${v}`} className="inline-flex items-center gap-1 text-primary hover:underline" title="Go to container instance" onClick={(e) => e.stopPropagation()}>
                                              {linkedInstanceNames[v] ? (<span className="font-semibold not-italic">{linkedInstanceNames[v]}</span>) : null}
                                              <span className="opacity-60">{v}</span>
                                              <ExternalLink className="h-3 w-3 shrink-0"/>
                                            </a>
                                            <CopyButton text={v}/>
                                          </div>);
                                }
                                return (<div key={k} className="flex items-start gap-2 text-xs font-mono">
                                          <span className="text-muted-foreground shrink-0">{k}:</span>
                                          <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                        </div>);
                            })}
                                  </div>
                                </div>)}

                              {/* Public Properties */}
                              {item.public_properties && Object.keys(item.public_properties).length > 0 && (<div className="space-y-1">
                                  <p className="text-xs font-semibold text-foreground">Public Properties</p>
                                  <div className="bg-muted rounded p-2 space-y-1">
                                    {Object.entries(item.public_properties).map(([k, v]) => (<div key={k} className="flex items-start gap-2 text-xs font-mono">
                                        <span className="text-muted-foreground shrink-0">{k}:</span>
                                        <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                      </div>))}
                                  </div>
                                </div>)}

                              {/* Definition */}
                              {item.definition && (<div className="space-y-2 border border-border/60 rounded-md p-3">
                                  <p className="text-xs font-semibold text-foreground">Definition</p>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Stackable: </span>
                                      <span className="font-medium">{item.definition.is_stackable ? `Yes (max ${item.definition.max_stack_size ?? "∞"})` : "No"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Grid: </span>
                                      <span className="font-medium">{item.definition.grid_width ?? 1}×{item.definition.grid_height ?? 1}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Client Writable: </span>
                                      <span className="font-medium">{item.definition.client_writable ? "Yes" : "No"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Client Update Qty: </span>
                                      <span className="font-medium">{item.definition.allow_client_update_qty ? "Yes" : "No"}</span>
                                    </div>
                                    {item.definition.base_stats && Object.keys(item.definition.base_stats).length > 0 && (<div className="col-span-2 sm:col-span-4">
                                        <span className="text-muted-foreground">Base Stats: </span>
                                        <span className="font-mono font-medium">
                                          {Object.entries(item.definition.base_stats).map(([k, v]) => `${k}=${v}`).join(", ")}
                                        </span>
                                      </div>)}
                                  </div>

                                  {/* Definition Metadata */}
                                  {item.definition.metadata && Object.keys(item.definition.metadata).length > 0 && (<div className="space-y-1 pt-1 border-t border-border/40">
                                      <p className="text-xs font-semibold text-muted-foreground">Metadata</p>
                                      <div className="space-y-1">
                                        {Object.entries(item.definition.metadata).map(([k, v]) => {
                                    if (k === "linked_container_definition_id" && typeof v === "string") {
                                        return (<div key={k} className="flex items-center gap-2 text-xs font-mono">
                                                <span className="text-muted-foreground">{k}:</span>
                                                <a href={`/games/${gameId}/items?tab=containers&q=${v}`} className="inline-flex items-center gap-1 text-primary hover:underline" title="Go to container definition" onClick={(e) => e.stopPropagation()}>
                                                  {linkedDefNames[v] ? (<span className="font-semibold not-italic">{linkedDefNames[v]}</span>) : null}
                                                  <span className="opacity-60">{v}</span>
                                                  <ExternalLink className="h-3 w-3 shrink-0"/>
                                                </a>
                                                <CopyButton text={v}/>
                                              </div>);
                                    }
                                    return (<div key={k} className="flex items-start gap-2 text-xs font-mono">
                                              <span className="text-muted-foreground shrink-0">{k}:</span>
                                              <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                            </div>);
                                })}
                                      </div>
                                    </div>)}
                                </div>)}
                            </div>
                          </TableCell>
                        </TableRow>)}
                      </Fragment>);
            })}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>

          {/* Pagination */}
          {itemsTotal > ITEMS_LIMIT && !itemFilterId && (<div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {Math.floor(itemsOffset / ITEMS_LIMIT) + 1} of {Math.ceil(itemsTotal / ITEMS_LIMIT)} — {itemsTotal} items</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={itemsOffset === 0} onClick={() => setItemsOffset(Math.max(0, itemsOffset - ITEMS_LIMIT))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={itemsOffset + ITEMS_LIMIT >= itemsTotal} onClick={() => setItemsOffset(itemsOffset + ITEMS_LIMIT)}>Next</Button>
              </div>
            </div>)}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Sub-tab navigation */}
          <div className="flex items-center gap-1 border-b pb-0">
            <button onClick={() => setTxnSubTab("gacha")} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${txnSubTab === "gacha"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Dice6 className="h-3.5 w-3.5"/>
              Gacha
            </button>
            <button onClick={() => setTxnSubTab("shopping")} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${txnSubTab === "shopping"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <ShoppingBag className="h-3.5 w-3.5"/>
              Shopping
            </button>
          </div>

          {txnSubTab === "gacha" && (<div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">Gacha Transactions</h2>
                  <p className="text-sm text-muted-foreground">
                    {gachaTxnsLoading
                ? "Loading…"
                : gachaTxnsTotal > 0
                    ? `${gachaTxnsTotal} transaction${gachaTxnsTotal !== 1 ? "s" : ""}`
                    : "No gacha transactions found"}
                  </p>
                </div>
                <Button variant="outline" size="icon" onClick={loadGachaTransactions} disabled={gachaTxnsLoading} title="Refresh">
                  <RefreshCw className={`h-4 w-4 ${gachaTxnsLoading ? "animate-spin" : ""}`}/>
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  {gachaTxnsLoading ? (<div className="p-6 space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full"/>))}
                    </div>) : gachaTxnsError ? (<div className="p-6 text-center">
                      <p className="text-destructive text-sm mb-3">{gachaTxnsError}</p>
                      <Button variant="outline" size="sm" onClick={loadGachaTransactions}>Try Again</Button>
                    </div>) : gachaTxns.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                      <Dice6 className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                      <p className="text-lg font-medium">No gacha transactions</p>
                      <p className="text-sm mt-1">This player has no gacha transactions yet.</p>
                    </div>) : (<Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Pack</TableHead>
                          <TableHead>Items Granted</TableHead>
                          <TableHead>Keys</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gachaTxns.map((txn) => {
                    const isExpanded = expandedTxnIds.has(txn.id);
                    return (<Fragment key={txn.id}>
                              <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleTxnExpanded(txn.id)}>
                                <TableCell className="py-2">
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/>}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-2">{formatISODate(txn.created_at)}</TableCell>
                                <TableCell className="text-sm py-2">
                                  {txn.pack_definition_id ? (<a href={`/games/${gameId}/items?tab=gacha&editPack=${txn.pack_definition_id}`} className="inline-flex items-center gap-0.5 font-medium text-xs hover:underline text-foreground" onClick={e => e.stopPropagation()}>
                                      {txn.pack_name || txn.pack_definition_id.slice(0, 8) + "…"}
                                      <ArrowUpRight className="h-3 w-3 text-muted-foreground"/>
                                    </a>) : (<span className="text-muted-foreground">—</span>)}
                                </TableCell>
                                <TableCell className="text-sm py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {txn.items_granted.map((item, idx) => (<span key={idx} className="inline-flex items-center gap-1 text-xs">
                                        <a href={`/games/${gameId}/items/${item.item_definition_id}`} className="font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
                                          {item.name}
                                        </a>
                                        <span className="text-muted-foreground">×{item.quantity}</span>
                                      </span>))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground py-2">
                                  {txn.keys_consumed.length > 0 ? `${txn.keys_consumed.length} key${txn.keys_consumed.length > 1 ? "s" : ""}` : "—"}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (<TableRow className="bg-muted/20 hover:bg-muted/20">
                                  <TableCell colSpan={5} className="py-3 px-6">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                                      <div className="col-span-2 flex items-center gap-2">
                                        <span className="text-muted-foreground font-medium w-28">Transaction ID</span>
                                        <span className="font-mono flex items-center gap-0.5">
                                          {txn.id}
                                          <CopyButton text={txn.id} size="h-3 w-3"/>
                                        </span>
                                      </div>
                                      <div className="col-span-2 flex items-start gap-2">
                                        <span className="text-muted-foreground font-medium w-28 shrink-0 flex items-center gap-1">
                                          Idempotency Key
                                          <button onClick={() => setIdempotencyHelpOpen(true)} className="text-muted-foreground hover:text-foreground">
                                            <HelpCircle className="h-3 w-3"/>
                                          </button>
                                        </span>
                                        <span className="font-mono text-muted-foreground break-all">{txn.idempotency_key}</span>
                                      </div>
                                      {txn.items_granted.length > 0 && (<div className="col-span-2 flex items-start gap-2">
                                          <span className="text-muted-foreground font-medium w-28 shrink-0">Items Detail</span>
                                          <div className="space-y-1">
                                            {txn.items_granted.map((item, idx) => (<div key={idx} className="flex items-center gap-2 flex-wrap">
                                                <span className="px-1.5 py-0.5 rounded border bg-muted/50 capitalize">{item.category}</span>
                                                <a href={`/games/${gameId}/items/${item.item_definition_id}`} className="inline-flex items-center gap-0.5 font-medium hover:underline text-foreground" onClick={e => e.stopPropagation()}>
                                                  {item.name}<ArrowUpRight className="h-3 w-3 text-muted-foreground"/>
                                                </a>
                                                <span className="text-muted-foreground">×{item.quantity} (range {item.quantity_min}–{item.quantity_max})</span>
                                                <span className="text-muted-foreground capitalize">{item.rarity}</span>
                                                <span className="font-mono text-muted-foreground/70">drop:{item.drop_seed} qty:{item.qty_seed}</span>
                                              </div>))}
                                          </div>
                                        </div>)}
                                      {txn.keys_consumed.length > 0 && (<div className="col-span-2 flex items-start gap-2">
                                          <span className="text-muted-foreground font-medium w-28 shrink-0">Keys Consumed</span>
                                          <div className="space-y-1">
                                            {txn.keys_consumed.map((key, idx) => (<div key={idx} className="flex items-center gap-1.5 font-mono">
                                                <a href={`/games/${gameId}/items/${key.item_definition_id}`} className="inline-flex items-center gap-0.5 text-muted-foreground hover:underline hover:text-foreground" onClick={e => e.stopPropagation()}>
                                                  {key.item_definition_id.slice(0, 8)}…<ArrowUpRight className="h-3 w-3"/>
                                                </a>
                                                <span>×{key.quantity}</span>
                                              </div>))}
                                          </div>
                                        </div>)}
                                      {(txn.client_ip || txn.user_agent) && (<div className="col-span-2 flex items-start gap-2">
                                          <span className="text-muted-foreground font-medium w-28 shrink-0">Client</span>
                                          <div className="text-muted-foreground space-y-0.5">
                                            {txn.client_ip && <div>{txn.client_ip}</div>}
                                            {txn.user_agent && <div className="text-muted-foreground/70">{txn.user_agent}</div>}
                                          </div>
                                        </div>)}
                                    </div>
                                  </TableCell>
                                </TableRow>)}
                            </Fragment>);
                })}
                      </TableBody>
                    </Table>)}
                </CardContent>
              </Card>

              {/* Pagination */}
              {gachaTxnsTotal > GACHA_TXN_LIMIT && (<div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Page {Math.floor(gachaTxnsOffset / GACHA_TXN_LIMIT) + 1} of{" "}
                    {Math.ceil(gachaTxnsTotal / GACHA_TXN_LIMIT)} — {gachaTxnsTotal} transactions
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={gachaTxnsOffset === 0} onClick={() => setGachaTxnsOffset(Math.max(0, gachaTxnsOffset - GACHA_TXN_LIMIT))}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={gachaTxnsOffset + GACHA_TXN_LIMIT >= gachaTxnsTotal} onClick={() => setGachaTxnsOffset(gachaTxnsOffset + GACHA_TXN_LIMIT)}>Next</Button>
                  </div>
                </div>)}
            </div>)}

          {txnSubTab === "shopping" && (<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ShoppingBag className="h-16 w-16 mb-4 opacity-20"/>
              <p className="text-xl font-semibold">Coming Soon</p>
              <p className="text-sm mt-1">Shopping transaction history will be available in a future update.</p>
            </div>)}
        </TabsContent>

        {/* ── Quest History Tab ── */}
        <TabsContent value="quests" className="space-y-4">
          {/* Sub-tab navigation */}
          <div id="player-quest-subtab-navigation" className="flex items-center gap-1 border-b pb-0 overflow-x-auto whitespace-nowrap">
            <button id="player-quest-subtab-all-quests" onClick={() => handleQuestSubTabChange("all")} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${questSubTab === "all"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Trophy id="tab-quest-all-icon" className="h-3.5 w-3.5"/>
              {t("playerQuestHistory.allQuests")}
            </button>
            <button id="player-quest-subtab-daily-timeframe" onClick={() => handleDailyQuestTimeframeChange(dailyQuestTimeframe)} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${questSubTab === "timeframe"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <CalendarDays id="player-quest-subtab-daily-timeframe-icon" className="h-3.5 w-3.5"/>
              {t("playerQuestHistory.dailyTimeframe")}
            </button>
            <button id="player-quest-subtab-daily-ahead" onClick={() => handleQuestSubTabChange("daily-ahead")} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${questSubTab === "daily-ahead"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <CalendarDays id="player-quest-subtab-daily-ahead-icon" className="h-3.5 w-3.5"/>
              {t("playerQuestHistory.dailyAhead")}
            </button>
            <button id="player-quest-subtab-chain-quest" onClick={() => handleQuestSubTabChange("chain")} className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${questSubTab === "chain"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Trophy id="player-quest-subtab-chain-quest-icon" className="h-3.5 w-3.5"/>
              {t("playerQuestHistory.chainQuest")}
            </button>
          </div>

          {questSubTab === "chain" ? (<div id={`player-quest-subtab-coming-soon-${questSubTab}`} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Clock id={`player-quest-subtab-coming-soon-${questSubTab}-icon`} className="h-16 w-16 mb-4 opacity-20"/>
              <p id={`player-quest-subtab-coming-soon-${questSubTab}-title`} className="text-xl font-semibold">{t("playerQuestHistory.comingSoon")}</p>
            </div>) : questSubTab === "daily-ahead" || questSubTab === "timeframe" ? (
        /* ── Daily Ahead / Timeframe sub-tabs ── */
        <div className="space-y-4" id="container-quest-timeframe">
              <div id="player-quest-timeframe-toolbar" className="flex flex-wrap items-end justify-between gap-3">
                {game && questSubTab === "daily-ahead" && (<div id="player-quest-timeframe-game-setting" className="flex flex-col items-start gap-0.5 pb-0.5 text-xs text-muted-foreground">
                    <div id="player-quest-timeframe-game-setting-control" className="flex items-center gap-2">
                      <span id="player-quest-timeframe-game-setting-label">Game setting — max advance days</span>
                      <DailyQuestMaxAdvanceDays game={game} onUpdate={setGame} compact/>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip open={maxAdvanceDaysHelpHovered || maxAdvanceDaysHelpPinned} onOpenChange={open => {
                            if (!maxAdvanceDaysHelpPinned)
                                setMaxAdvanceDaysHelpHovered(open);
                        }}>
                          <TooltipTrigger asChild>
                            <button ref={maxAdvanceDaysHelpTriggerRef} id="player-quest-timeframe-game-setting-help" type="button" className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground" aria-label={`${t("playerQuestHistory.maxAdvanceDaysScope")} ${t("playerQuestHistory.maxAdvanceDaysNote")}`} aria-expanded={maxAdvanceDaysHelpHovered || maxAdvanceDaysHelpPinned} onClick={() => {
                                if (maxAdvanceDaysHelpPinned) {
                                    setMaxAdvanceDaysHelpPinned(false);
                                    setMaxAdvanceDaysHelpHovered(false);
                                    return;
                                }
                                setMaxAdvanceDaysHelpPinned(true);
                            }}>
                              <HelpCircle id="player-quest-timeframe-game-setting-help-icon" className="h-3.5 w-3.5"/>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent ref={maxAdvanceDaysHelpContentRef} id="player-quest-timeframe-game-setting-tooltip" side="top" className="max-w-xs space-y-1 text-xs">
                            <p id="player-quest-timeframe-game-setting-tooltip-scope" className="font-semibold">{t("playerQuestHistory.maxAdvanceDaysScope")}</p>
                            <p id="player-quest-timeframe-game-setting-tooltip-note">{t("playerQuestHistory.maxAdvanceDaysNote")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>)}
                <div id="player-quest-timeframe-controls" className="ml-auto flex flex-wrap items-end justify-end gap-3">
                  {questSubTab === "timeframe" && (<div id="player-quest-timeframe-selector" className="flex items-center rounded-md border border-input p-0.5">
                    <Button id="player-quest-timeframe-last-week" type="button" variant={questSubTab === "timeframe" && dailyQuestTimeframe === "last-week" ? "secondary" : "ghost"} size="sm" onClick={() => handleDailyQuestTimeframeChange("last-week")}>
                      {t("playerQuestHistory.lastWeek")}
                    </Button>
                    <Button id="player-quest-timeframe-last-month" type="button" variant={questSubTab === "timeframe" && dailyQuestTimeframe === "last-month" ? "secondary" : "ghost"} size="sm" onClick={() => handleDailyQuestTimeframeChange("last-month")}>
                      {t("playerQuestHistory.lastMonth")}
                    </Button>
                    <span id="player-quest-timeframe-preset-divider" role="separator" aria-orientation="vertical" className="mx-1 h-5 w-px bg-border" />
                    <Button id="player-quest-timeframe-this-week" type="button" variant={questSubTab === "timeframe" && dailyQuestTimeframe === "this-week" ? "secondary" : "ghost"} size="sm" onClick={() => handleDailyQuestTimeframeChange("this-week")}>
                      {t("playerQuestHistory.thisWeek")}
                    </Button>
                    <Button id="player-quest-timeframe-this-month" type="button" variant={questSubTab === "timeframe" && dailyQuestTimeframe === "this-month" ? "secondary" : "ghost"} size="sm" onClick={() => handleDailyQuestTimeframeChange("this-month")}>
                      {t("playerQuestHistory.thisMonth")}
                    </Button>
                  </div>)}
                  <div id={`player-quest-timeframe-filters-${questSubTab}`} className="flex flex-wrap items-end justify-end gap-3">
                  {questSubTab === "timeframe" && (<>
                    <div id="player-quest-timeframe-start-date-filter" className="flex flex-col gap-1">
                      <label id="player-quest-timeframe-start-date-label" htmlFor="player-quest-timeframe-start-date" className="text-xs text-muted-foreground font-medium">{t("playerQuestHistory.startDate")}</label>
                      <input id="player-quest-timeframe-start-date" type="date" value={dailyQuestStartDate} max={dailyQuestEndDate} onChange={event => setDailyQuestStartDate(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
                    </div>
                    <div id="player-quest-timeframe-end-date-filter" className="flex flex-col gap-1">
                      <label id="player-quest-timeframe-end-date-label" htmlFor="player-quest-timeframe-end-date" className="text-xs text-muted-foreground font-medium">{t("playerQuestHistory.endDate")}</label>
                      <input id="player-quest-timeframe-end-date" type="date" value={dailyQuestEndDate} min={dailyQuestStartDate} onChange={event => setDailyQuestEndDate(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
                    </div>
                  </>)}
                  <div id={`player-quest-timeframe-pool-filter-${questSubTab}`} className="flex flex-col gap-1">
                    <label id={`player-quest-timeframe-pool-label-${questSubTab}`} className="text-xs text-muted-foreground font-medium">Pool</label>
                    {dailyAheadPoolsLoading ? (<Skeleton className="h-9 w-48"/>) : dailyAheadPools.length === 0 ? (<p className="text-sm text-muted-foreground">No pools found for this game.</p>) : (<div className="flex items-center gap-1.5">
                        <Select value={dailyAheadSelectedPoolId} onValueChange={setDailyAheadSelectedPoolId}>
                          <SelectTrigger className="w-56" id="select-quest-pool">
                            <SelectValue placeholder="Select pool…"/>
                          </SelectTrigger>
                          <SelectContent>
                            {dailyAheadPools.map(p => (<SelectItem key={p.id} value={p.id}>
                                {p.display_name}
                              </SelectItem>))}
                          </SelectContent>
                        </Select>
                        {dailyAheadSelectedPoolId && (<a href={`/games/${gameId}/quests?tab=daily`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors shrink-0" title="Open daily quest pools">
                            <ArrowUpRight className="h-4 w-4"/>
                          </a>)}
                      </div>)}
                  </div>
                  {questSubTab === "daily-ahead" && (<div id="player-quest-timeframe-days-filter" className="flex flex-col gap-1">
                      <label id="player-quest-timeframe-days-label" className="text-xs text-muted-foreground font-medium">Days ahead</label>
                      <Select value={String(dailyAheadDays)} onValueChange={v => setDailyAheadDays(Number(v))}>
                        <SelectTrigger className="w-24" id="select-quest-days-ahead">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 7, 14, 30].map(d => (<SelectItem key={d} value={String(d)}>{d} days</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>)}
                  <Button id={`btn-refresh-quests-${questSubTab}`} variant="outline" size="icon" onClick={() => dailyAheadSelectedPoolId && loadDailyAheadPreview(dailyAheadSelectedPoolId)} disabled={dailyAheadLoading || !dailyAheadSelectedPoolId} title={t("common.refresh")}>
                    <RefreshCw id={`btn-refresh-quests-${questSubTab}-icon`} className={`h-4 w-4 ${dailyAheadLoading ? "animate-spin" : ""}`}/>
                  </Button>
                  </div>
                </div>
              </div>

              {!dailyAheadSelectedPoolId ? (<div className="p-12 text-center text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">Select a pool</p>
                  <p className="text-sm mt-1">Choose a daily quest pool above to view pre-assigned quests.</p>
                </div>) : dailyAheadLoading ? (<div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full rounded-md"/>))}
                </div>) : dailyAheadError ? (<Card className="border-destructive">
                  <CardContent className="p-6 text-center">
                    <p className="text-destructive text-sm mb-3">{dailyAheadError}</p>
                    <Button variant="outline" size="sm" onClick={() => loadDailyAheadPreview(dailyAheadSelectedPoolId)}>Try Again</Button>
                  </CardContent>
                </Card>) : !dailyAheadPreview ? null : ((() => {
                if (dailyAheadPreview.days.length === 0)
                    return (<div className="p-12 text-center text-muted-foreground">
                      <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                      <p className="text-lg font-medium">No data</p>
                      <p className="text-sm mt-1">No pre-assigned quests found for this player.</p>
                    </div>);
                const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const firstDate = dailyAheadPreview.days[0]?.date
                    ? new Date(dailyAheadPreview.days[0].date + "T00:00:00")
                    : null;
                const startOffset = firstDate ? (firstDate.getDay() + 6) % 7 : 0;
                return (<div>
                      {/* Weekday header */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {DOW.map(d => (<div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>))}
                      </div>
                      {/* Grid cells */}
                      <div className="grid grid-cols-7 gap-1">
                        {/* empty leading cells */}
                        {Array.from({ length: startOffset }).map((_, i) => (<div key={`pad-${i}`}/>))}
                        {dailyAheadPreview.days.map(day => {
                        const isToday = day.is_today;
                        const hasQuests = day.quests.length > 0;
                        return (<div key={day.date} id={`quest-day-card-${day.date}`} className={`rounded-md border p-1.5 min-h-[80px] flex flex-col gap-1 text-xs ${isToday
                                ? "border-primary bg-primary/5"
                                : hasQuests
                                    ? "border-border bg-card"
                                    : "border-dashed border-muted-foreground/25 bg-muted/20"}`}>  
                              {/* Date label */}
                              <div className={`font-semibold tabular-nums leading-none mb-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                {day.date.slice(5)} {/* MM-DD */}
                                {isToday && <span className="ml-1 text-[10px] font-medium text-primary">Today</span>}
                              </div>
                              {/* Quests */}
                              {hasQuests ? (<ul className="space-y-0.5 flex-1">
                                  {day.quests.map((q) => {
                                  const isQuestHistoryTimeframe = questSubTab === "timeframe";
                                  const assignmentResetAt = Date.parse(q.assignment.expires_at);
                                  const matchingHistoryProgress = questHistory?.starts.find(({ progress }) => {
                                      const progressResetAt = typeof progress.reset_at === "string" ? Date.parse(progress.reset_at) : Number.NaN;
                                      return progress.quest_definition_id === q.assignment.quest_definition_id && progressResetAt === assignmentResetAt;
                                  })?.progress;
                                  const questProgressInstanceId = q.progress?.id ?? matchingHistoryProgress?.id;
                                  const questStatus = matchingHistoryProgress?.status ?? q.status;
                                  const questHistoryHref = `/games/${gameId}/players/${progressId}?tab=quests&quest_sub=all${questProgressInstanceId ? `&quest_q=${encodeURIComponent(questProgressInstanceId)}` : ""}`;
                                  const questHref = isQuestHistoryTimeframe && Boolean(questProgressInstanceId)
                                      ? questHistoryHref
                                      : `/games/${gameId}/quests?q=${encodeURIComponent(q.assignment.quest_definition_id)}`;
                                  return (<li id={`player-quest-timeframe-item-${q.assignment.id}`} key={q.assignment.id} className="leading-snug">
                                      {q.quest?.name ? (isQuestHistoryTimeframe && !questProgressInstanceId ? (<TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <a id={`player-quest-timeframe-definition-link-${q.assignment.id}`} href={questHref} className={`inline-flex items-center gap-0.5 hover:underline ${getQuestStatusTextClass("not_started")}`}>
                                          <QuestStatusIcon id={`player-quest-timeframe-status-${q.assignment.id}-icon`} status="not_started" className="h-3 w-3 shrink-0"/>
                                          <span id={`player-quest-timeframe-name-${q.assignment.id}`}>{q.quest.name.length > 25 ? q.quest.name.slice(0, 25) + "â€¦" : q.quest.name}</span>
                                              </a>
                                            </TooltipTrigger>
                                            <TooltipContent id={`player-quest-timeframe-tooltip-${q.assignment.id}`} side="top">
                                              {t("playerQuestHistory.statuses.not_started")}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>) : (<TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <a id={`player-quest-timeframe-link-${q.assignment.id}`} href={questHref} target={isQuestHistoryTimeframe ? undefined : "_blank"} rel={isQuestHistoryTimeframe ? undefined : "noopener noreferrer"} className={`inline-flex items-center gap-0.5 hover:underline group ${isQuestHistoryTimeframe ? getQuestStatusTextClass(questStatus) : "text-foreground"}`}>
                                                {isQuestHistoryTimeframe
                                                  ? <QuestStatusIcon id={`player-quest-timeframe-status-${q.assignment.id}-icon`} status={questStatus} className="h-3 w-3 shrink-0"/>
                                                  : <span id={`player-quest-timeframe-dot-${q.assignment.id}`} className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>}
                                                <span>{q.quest.name.length > 25 ? q.quest.name.slice(0, 25) + "…" : q.quest.name}</span>
                                                {!isQuestHistoryTimeframe && <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>}
                                              </a>
                                            </TooltipTrigger>
                                            <TooltipContent id={`player-quest-timeframe-tooltip-${q.assignment.id}`} side="top">
                                              {isQuestHistoryTimeframe ? t(`playerQuestHistory.statuses.${questStatus}`) : q.quest.name}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>)) : (<span className="text-muted-foreground font-mono">
                                          {q.assignment.quest_definition_id?.slice(0, 6) ?? "?"}…
                                        </span>)}
                                    </li>);
                              })}
                                </ul>) : (<span className="text-muted-foreground/50 text-[10px] mt-auto">—</span>)}
                            </div>);
                    })}
                      </div>
                    </div>);
            })())}
            </div>) : (questLoading && !questHistory) ? (<div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full"/>))}
            </div>) : questError ? (<Card className="border-destructive">
              <CardContent className="p-6 text-center">
                <p className="text-destructive text-sm mb-3">{questError}</p>
                <Button variant="outline" size="sm" onClick={loadQuestHistory}>Try Again</Button>
              </CardContent>
            </Card>) : !questHistory ? (<div className="p-12 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p className="text-lg font-medium">No quest data</p>
              <p className="text-sm mt-1">Quest history has not been loaded yet.</p>
            </div>) : (<>
              {questSubTab === "all" && (() => {
                const claimsByProgressId = new Map(questHistory.claims.map(claim => [claim.progress_id, claim]));
                const progressById = new Map(questHistory.starts.map(start => [start.progress.id, start.progress]));
                const hasMore = questHistory.starts.length < questHistory.starts_total;
                const rows = questHistory.starts.map(start => {
                    const claim = claimsByProgressId.get(start.progress.id);
                    return claim
                        ? { kind: "claim" as const, id: `start-${start.progress.id}`, status: "claimed", timestamp: start.progress.updated_at ?? "", claim }
                        : { kind: "start" as const, id: `start-${start.progress.id}`, status: start.progress.status, timestamp: start.progress.updated_at ?? "", start };
                })
                    .filter(row => questStatusFilter === "all" || row.status === questStatusFilter)
                    .sort((left, right) => (Date.parse(right.timestamp) || 0) - (Date.parse(left.timestamp) || 0));
                return (<div id="player-quest-history-all" className="space-y-4">
                  <div id="player-quest-history-toolbar" className="flex flex-wrap items-start justify-between gap-3">
                    <div id="player-quest-history-summary">
                      <h2 id="player-quest-history-title" className="text-lg font-semibold">{t("playerQuestHistory.allQuests")}</h2>
                      <p id="player-quest-history-count" className="text-sm text-muted-foreground">{rows.length} / {questHistory.starts_total ?? 0} {t("playerQuestHistory.records")}</p>
                    </div>
                    <div id="player-quest-history-controls" className="flex flex-col items-end gap-2 w-full md:w-auto">
                      <div id="player-quest-history-controls-row1" className="flex items-center gap-2">
                        <PlayerQuestHistorySearch value={questSearch} onChange={setQuestSearch} placeholder={t("playerQuestHistory.searchPlaceholder")} clearLabel={t("playerQuestHistory.clearSearch")}/>
                        <Button id="btn-refresh-quests-all" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={loadQuestHistory} disabled={questLoading} title={t("common.refresh")}>
                          <RefreshCw id="btn-refresh-quests-all-icon" className={`h-4 w-4 ${questLoading ? "animate-spin" : ""}`}/>
                        </Button>
                      </div>
                      <div id="player-quest-history-filters" className="flex flex-wrap items-center gap-2">
                        <div id="player-quest-history-date-filter-from" className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-md px-2.5 h-9 bg-background focus-within:ring-1 focus-within:ring-ring">
                          <span>{t("playerQuestHistory.startFrom")}:</span>
                          <input
                            id="player-quest-history-start-from"
                            type="date"
                            value={questStartFrom}
                            onChange={e => handleQuestStartFromChange(e.target.value)}
                            className="bg-transparent text-foreground outline-none text-xs w-28 [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>

                        <div id="player-quest-history-date-filter-to" className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-md px-2.5 h-9 bg-background focus-within:ring-1 focus-within:ring-ring">
                          <span>{t("playerQuestHistory.startTo")}:</span>
                          <input
                            id="player-quest-history-start-to"
                            type="date"
                            value={questStartTo}
                            onChange={e => handleQuestStartToChange(e.target.value)}
                            className="bg-transparent text-foreground outline-none text-xs w-28 [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>

                        <Select value={questTypeFilter} onValueChange={handleQuestTypeFilterChange}>
                          <SelectTrigger id="player-quest-history-type-filter-trigger" className="w-40 h-9">
                            <SelectValue placeholder={t("playerQuestHistory.questType")} />
                          </SelectTrigger>
                          <SelectContent id="player-quest-history-type-filter-content">
                            <SelectItem id="player-quest-history-type-filter-item-all" value="all">{t("playerQuestHistory.allTypes")}</SelectItem>
                            <SelectItem id="player-quest-history-type-filter-item-daily" value="daily">{t("playerQuestHistory.dailyQuest")}</SelectItem>
                            <SelectItem id="player-quest-history-type-filter-item-onetime" value="one_time">{t("playerQuestHistory.oneTimeQuest")}</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={questStatusFilter} onValueChange={value => handleQuestStatusFilterChange(value as QuestStatusFilter)}>
                          <SelectTrigger id="player-quest-history-status-filter-trigger" className="w-44 h-9">
                            <SelectValue>
                              <span id="player-quest-history-status-filter-value" className="inline-flex items-center gap-2">
                                <QuestStatusIcon id={`player-quest-history-status-filter-value-${questStatusFilter.replace(/_/g, "-")}-icon`} status={questStatusFilter}/>
                                {questStatusFilter === "all" ? t("playerQuestHistory.allStatuses") : t(`playerQuestHistory.statuses.${questStatusFilter}`)}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent id="player-quest-history-status-filter-content">
                            <SelectItem id="player-quest-history-status-all" value="all">
                              <span id="player-quest-history-status-all-label" className="inline-flex items-center gap-2">
                                <QuestStatusIcon id="player-quest-history-status-all-icon" status="all"/>
                                {t("playerQuestHistory.allStatuses")}
                              </span>
                            </SelectItem>
                            {QUEST_STATUS_FILTERS.map(status => (<SelectItem id={`player-quest-history-status-${status.replace(/_/g, "-")}`} key={status} value={status}>
                                <span id={`player-quest-history-status-${status.replace(/_/g, "-")}-label`} className="inline-flex items-center gap-2">
                                  <QuestStatusIcon id={`player-quest-history-status-${status.replace(/_/g, "-")}-icon`} status={status}/>
                                  {t(`playerQuestHistory.statuses.${status}`)}
                                </span>
                              </SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Card id="player-quest-history-card">
                    <CardContent id="player-quest-history-card-content" className="p-0">
                      {rows.length === 0 ? (<div id="player-quest-history-empty" className="p-12 text-center text-muted-foreground">
                          <Trophy id="player-quest-history-empty-icon" className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                          <p id="player-quest-history-empty-title" className="text-lg font-medium">{t("playerQuestHistory.noQuests")}</p>
                          <p id="player-quest-history-empty-description" className="text-sm mt-1">{t("playerQuestHistory.noQuestsDescription")}</p>
                        </div>) : (<>
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8"/>
                              <TableHead>{t("playerQuestHistory.quest")}</TableHead>
                              <TableHead>{t("quest.questType")}</TableHead>
                              <TableHead>{t("playerQuestHistory.status")}</TableHead>
                              <TableHead>{t("playerQuestHistory.startAt")}</TableHead>
                              <TableHead>{t("common.completed")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map(row => {
                            const expanded = questExpandedRows.has(row.id);
                            if (row.kind === "claim") {
                                const { claim } = row;
                                const rewards = ((claim.rewards_granted ?? []) as any[]).filter(reward => reward.reward_type === "item" || reward.item_definition_id);
                                const completedAt = progressById.get(claim.progress_id)?.completed_at;
                                return (<Fragment key={row.id}>
                                  <TableRow id={`player-quest-history-row-${row.id}`} className="player-quest-history-row cursor-pointer text-[18px] hover:bg-muted/50 [&_*]:!text-[18px]" onClick={() => toggleQuestRow(row.id)}>
                                    <TableCell className="text-muted-foreground">{expanded ? <ChevronDown className="h-4 w-4 shrink-0"/> : <ChevronRight className="h-4 w-4 shrink-0"/>}</TableCell>
                                    <TableCell className="text-sm font-medium">
                                      <a id={`player-quest-history-link-${row.id}`} href={`/games/${gameId}/quests?q=${claim.quest_definition_id}`} className="inline-flex items-center gap-1 font-medium text-xs hover:underline text-foreground" onClick={event => event.stopPropagation()}>
                                        {claim.quest_definition?.name || claim.quest_definition_id.slice(0, 8) + "…"}
                                        <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                                      </a>
                                    </TableCell>
                                    <TableCell id={`player-quest-history-type-${row.id}`} className="player-quest-history-type capitalize text-muted-foreground">{claim.quest_definition?.quest_type || "—"}</TableCell>
                                    <TableCell><span id={`player-quest-history-status-badge-${row.id}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getQuestStatusBadgeClass(row.status)}`}>
                                        <QuestStatusIcon id={`player-quest-history-status-badge-${row.id}-icon`} status={row.status} className="h-3.5 w-3.5 shrink-0"/>
                                        {t("playerQuestHistory.statuses.claimed")}
                                      </span></TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{claim.progress?.created_at ? formatISODate(claim.progress.created_at) : "—"}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{completedAt ? formatISODate(completedAt) : "—"}</TableCell>
                                  </TableRow>
                                  {expanded && (<TableRow id={`player-quest-history-detail-${row.id}`} className="bg-muted/20 hover:bg-muted/20">
                                      <TableCell />
                                      <TableCell colSpan={5} className="py-3 text-[18px] [&_*]:!text-[18px]">
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <ClaimMetaPanel claim={claim}/>
                                            {rewards.length > 0 ? (<div className="space-y-2">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">{t("playerQuestHistory.rewardsGranted")}</p>
                                                <div className="flex flex-wrap gap-2">{rewards.map((reward: any, index: number) => (<RewardPill key={index} reward={reward} gameId={gameId} itemNames={questItemNames}/>))}</div>
                                              </div>) : <div />}
                                          </div>
                                          <hr className="border-border/60"/>
                                          <QuestDefinitionPanel quest={claim.quest_definition} gameId={gameId} itemNames={questItemNames}/>
                                        </div>
                                      </TableCell>
                                    </TableRow>)}
                                  {questHistoryBoundaries[row.id] && (() => {
                                    const { loaded, total } = questHistoryBoundaries[row.id];
                                    return (
                                      <TableRow key={`boundary-${row.id}`} className="hover:bg-transparent bg-transparent pointer-events-none">
                                        <TableCell colSpan={6} className="p-0 py-2">
                                          <div className="h-[2px] bg-primary/30 w-full flex items-center justify-center relative my-2">
                                            <span className="bg-background px-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider absolute">
                                              {loaded} / {total} {t("playerQuestHistory.records")}
                                            </span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })()}
                                </Fragment>);
                            }
                            const { start } = row;
                            return (<Fragment key={row.id}>
                              <TableRow id={`player-quest-history-row-${row.id}`} className="player-quest-history-row cursor-pointer text-[18px] hover:bg-muted/50 [&_*]:!text-[18px]" onClick={() => toggleQuestRow(row.id)}>
                                <TableCell className="text-muted-foreground">{expanded ? <ChevronDown className="h-4 w-4 shrink-0"/> : <ChevronRight className="h-4 w-4 shrink-0"/>}</TableCell>
                                <TableCell className="text-sm font-medium">
                                  <a id={`player-quest-history-link-${row.id}`} href={`/games/${gameId}/quests?q=${start.progress.quest_definition_id}`} className="inline-flex items-center gap-1 font-medium text-xs hover:underline text-foreground" onClick={event => event.stopPropagation()}>
                                    {start.quest?.name || start.progress.quest_definition_id.slice(0, 8) + "…"}
                                    <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                                  </a>
                                </TableCell>
                                <TableCell id={`player-quest-history-type-${row.id}`} className="player-quest-history-type capitalize text-muted-foreground">{start.quest?.quest_type || "—"}</TableCell>
                                <TableCell><span id={`player-quest-history-status-badge-${row.id}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getQuestStatusBadgeClass(row.status)}`}>
                                    <QuestStatusIcon id={`player-quest-history-status-badge-${row.id}-icon`} status={row.status} className="h-3.5 w-3.5 shrink-0"/>
                                    {t(`playerQuestHistory.statuses.${row.status}`)}
                                  </span></TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{start.progress.created_at ? formatISODate(start.progress.created_at) : "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{start.progress.completed_at ? formatISODate(start.progress.completed_at) : "—"}</TableCell>
                              </TableRow>
                              {expanded && (<TableRow id={`player-quest-history-detail-${row.id}`} className="player-quest-history-detail player-quest-history-detail-start bg-muted/20 hover:bg-muted/20">
                                  <TableCell id={`player-quest-history-detail-${row.id}-spacer`} className="player-quest-history-detail-spacer" />
                                  <TableCell id={`player-quest-history-detail-${row.id}-content`} colSpan={5} className="player-quest-history-detail-content py-3 text-[18px] [&_*]:!text-[18px]">
                                    <div id={`player-quest-history-detail-${row.id}-body`} className="player-quest-history-detail-body space-y-3">
                                      <div id={`player-quest-history-detail-${row.id}-progress-meta`} className="player-quest-history-detail-progress-meta">
                                        <ProgressMetaPanel progress={start.progress} gameId={gameId} idPrefix={`player-quest-history-detail-${row.id}-progress`}/>
                                      </div>
                                      {start.progress.progress_data && Object.keys(start.progress.progress_data).length > 0 && (<div id={`player-quest-history-detail-${row.id}-progress-data`} className="player-quest-history-detail-progress-data"><QuestProgressDisplay data={start.progress.progress_data} gameId={gameId}/></div>)}
                                      <div id={`player-quest-history-detail-${row.id}-quest-definition`} className="player-quest-history-detail-quest-definition">
                                        <QuestDefinitionPanel quest={start.quest} gameId={gameId} itemNames={questItemNames}/>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>)}
                              {questHistoryBoundaries[row.id] && (() => {
                                const { loaded, total } = questHistoryBoundaries[row.id];
                                return (
                                  <TableRow key={`boundary-${row.id}`} className="hover:bg-transparent bg-transparent pointer-events-none">
                                    <TableCell colSpan={6} className="p-0 py-2">
                                      <div className="h-[2px] bg-primary/30 w-full flex items-center justify-center relative my-2">
                                        <span className="bg-background px-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider absolute">
                                          {loaded} / {total} {t("playerQuestHistory.records")}
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })()}
                            </Fragment>);
                        })}
                          </TableBody>
                        </Table>
                        <div className={`flex ${hasMore ? "justify-between" : "justify-center"} items-center p-4 border-t text-sm text-muted-foreground`}>
                          <p id="player-quest-history-count" className="font-mono text-xs">{rows.length} / {questHistory.starts_total ?? 0} {t("playerQuestHistory.records")}</p>
                          {hasMore && (
                            <Button
                              id="btn-load-more-quests"
                              variant="outline"
                              onClick={loadMoreQuests}
                              disabled={questLoading}
                            >
                              {questLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                t("playerQuestHistory.loadMore")
                              )}
                            </Button>
                          )}
                        </div>
                      </>)}
                    </CardContent>
                  </Card>
                </div>);
            })()}
            </>)}
        </TabsContent>

        {/* ── Journey Sessions Tab ── */}
        <TabsContent value="journey" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Journey Sessions</h2>
              <p className="text-sm text-muted-foreground">
                {journeyLoading ? "Loading…" : journeyTotal > 0 ? `${journeyTotal} session${journeyTotal !== 1 ? "s" : ""}` : "No journey sessions found"}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={loadJourneySessions} disabled={journeyLoading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${journeyLoading ? "animate-spin" : ""}`}/>
            </Button>
          </div>

          {journeyLoading ? (<Card>
              <CardContent className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full"/>)}
              </CardContent>
            </Card>) : journeyError ? (<Card className="border-destructive">
              <CardContent className="p-4 text-sm text-destructive">{journeyError}</CardContent>
            </Card>) : journeySessions.length === 0 ? (<Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Hash className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                <p className="text-lg font-medium">No journey sessions</p>
                <p className="text-sm mt-1">This player has not recorded any journey sessions yet.</p>
              </CardContent>
            </Card>) : (<Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"/>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeySessions.map((session) => {
                const expanded = journeyExpandedRows.has(session.session_id);
                const eventsLoading = journeyEventsLoading.has(session.session_id);
                const events = journeyEvents[session.session_id];
                const eventsErr = journeyEventsError[session.session_id];
                const eventsTotal = journeyEventsTotal[session.session_id];
                return (<Fragment key={session.session_id}>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleJourneyRow(session.session_id)}>
                            <TableCell className="py-2">
                              {expanded
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground"/>
                        : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <span className="font-mono text-xs">{session.session_id}</span>
                                <CopyButton text={session.session_id}/>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">{formatISODate(session.started_at)}</TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">{session.ended_at ? formatISODate(session.ended_at) : "—"}</TableCell>
                            <TableCell className="py-2 text-right">
                              <Badge variant="secondary" className="text-xs">{session.event_count}</Badge>
                            </TableCell>
                            <TableCell className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                              <a href={`/games/${gameId}/analytic?tab=journey&session_id=${session.session_id}`} target="_blank" rel="noopener noreferrer" title="View in analytics" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                                <ExternalLink className="h-3.5 w-3.5"/>
                              </a>
                            </TableCell>
                          </TableRow>
                          {expanded && (<TableRow>
                              <TableCell colSpan={6} className="bg-muted/30 p-4">
                                {eventsLoading ? (<div className="space-y-2">
                                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full"/>)}
                                  </div>) : eventsErr ? (<p className="text-sm text-destructive">{eventsErr}</p>) : !events || events.length === 0 ? (<p className="text-sm text-muted-foreground">No events recorded for this session.</p>) : (<div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase">
                                        {eventsTotal != null ? `${events.length} of ${eventsTotal} event${eventsTotal !== 1 ? "s" : ""}` : `${events.length} event${events.length !== 1 ? "s" : ""}`}
                                      </p>
                                      <Button variant="ghost" size="sm" onClick={() => loadJourneyEvents(session.session_id)} disabled={eventsLoading}>
                                        <RefreshCw className={`h-3 w-3 mr-1.5 ${eventsLoading ? "animate-spin" : ""}`}/>
                                        Refresh
                                      </Button>
                                    </div>
                                    <div className="rounded border bg-background">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[200px]">Occurred</TableHead>
                                            <TableHead className="w-[240px]">Event Type</TableHead>
                                            <TableHead>Event Data</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {events.map((ev) => {
                                const hasData = ev.event_data && Object.keys(ev.event_data).length > 0;
                                const eventExpanded = journeyExpandedEvents.has(ev.id);
                                return (<TableRow key={ev.id}>
                                                <TableCell className="text-xs text-muted-foreground align-top">{formatISODate(ev.occurred_at)}</TableCell>
                                                <TableCell className="align-top">
                                                  <Badge variant="outline" className="text-xs font-mono">{ev.event_type}</Badge>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                  {hasData ? (eventExpanded ? (<div className="space-y-1.5">
                                                        <button type="button" onClick={() => toggleJourneyEvent(ev.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                          <ChevronDown className="h-3 w-3"/>
                                                          Hide
                                                        </button>
                                                        <pre className="text-xs bg-muted/50 rounded p-2 overflow-auto max-h-72 whitespace-pre-wrap break-all">
                                                          {JSON.stringify(ev.event_data, null, 2)}
                                                        </pre>
                                                      </div>) : (<button type="button" onClick={() => toggleJourneyEvent(ev.id)} className="inline-flex items-center gap-1.5 max-w-full text-left group">
                                                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 group-hover:text-foreground"/>
                                                        <code className="text-xs font-mono text-muted-foreground group-hover:text-foreground truncate bg-muted/40 rounded px-1.5 py-0.5">
                                                          {JSON.stringify(ev.event_data)}
                                                        </code>
                                                      </button>)) : (<span className="text-xs text-muted-foreground">—</span>)}
                                                </TableCell>
                                              </TableRow>);
                            })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                    {eventsTotal != null && events.length < eventsTotal && (<p className="text-xs text-muted-foreground">
                                        Showing first {events.length} of {eventsTotal} events.
                                      </p>)}
                                  </div>)}
                              </TableCell>
                            </TableRow>)}
                        </Fragment>);
            })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>)}

          {/* Pagination */}
          {journeyTotal > JOURNEY_LIMIT && (<div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {Math.floor(journeyOffset / JOURNEY_LIMIT) + 1} of {Math.ceil(journeyTotal / JOURNEY_LIMIT)} — {journeyTotal} sessions</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={journeyOffset === 0} onClick={() => setJourneyOffset(Math.max(0, journeyOffset - JOURNEY_LIMIT))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={journeyOffset + JOURNEY_LIMIT >= journeyTotal} onClick={() => setJourneyOffset(journeyOffset + JOURNEY_LIMIT)}>Next</Button>
              </div>
            </div>)}
        </TabsContent>

        {/* ── Battle Sessions Tab ── */}
        <TabsContent value="battle" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Battle Sessions</h2>
              <p className="text-sm text-muted-foreground">
                {battleLoading ? "Loading…" : battleTotal > 0 ? `${battleTotal} session${battleTotal !== 1 ? "s" : ""}` : "No battle sessions found"}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={loadBattleSessions} disabled={battleLoading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${battleLoading ? "animate-spin" : ""}`}/>
            </Button>
          </div>

          {battleLoading ? (<Card>
              <CardContent className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full"/>)}
              </CardContent>
            </Card>) : battleError ? (<Card className="border-destructive">
              <CardContent className="p-4 text-sm text-destructive">{battleError}</CardContent>
            </Card>) : battleSessions.length === 0 ? (<Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Dice6 className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                <p className="text-lg font-medium">No battle sessions</p>
                <p className="text-sm mt-1">This player has not participated in any battles yet.</p>
              </CardContent>
            </Card>) : (<Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"/>
                      <TableHead>Battle ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Ended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {battleSessions.map((session) => (<Fragment key={session.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleBattleRow(session.id)}>
                          <TableCell>
                            {battleExpandedRows.has(session.id)
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground"/>
                    : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs">{session.id}</span>
                              <CopyButton text={session.id}/>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.status === "ended" ? "secondary" : "outline"} className="text-xs">
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatISODate(session.started_at)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatISODate(session.expires_at)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{session.ended_at ? formatISODate(session.ended_at) : "—"}</TableCell>
                        </TableRow>
                        {battleExpandedRows.has(session.id) && (<TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">start_data</p>
                                  <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-[36rem] whitespace-pre-wrap break-all">
                                    {JSON.stringify(session.start_data, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">end_data</p>
                                  <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-[36rem] whitespace-pre-wrap break-all">
                                    {session.end_data != null ? JSON.stringify(session.end_data, null, 2) : "null"}
                                  </pre>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>)}
                      </Fragment>))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>)}

          {/* Pagination */}
          {battleTotal > BATTLE_LIMIT && (<div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {Math.floor(battleOffset / BATTLE_LIMIT) + 1} of {Math.ceil(battleTotal / BATTLE_LIMIT)} — {battleTotal} sessions</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={battleOffset === 0} onClick={() => setBattleOffset(Math.max(0, battleOffset - BATTLE_LIMIT))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={battleOffset + BATTLE_LIMIT >= battleTotal} onClick={() => setBattleOffset(battleOffset + BATTLE_LIMIT)}>Next</Button>
              </div>
            </div>)}
        </TabsContent>

        <TabsContent value="containers" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Player Containers</h2>
              <p className="text-sm text-muted-foreground">
                {containersLoading
            ? "Loading…"
            : containers.length > 0
                ? `${containersOffset + containers.length}${containersHasMore ? "+" : ""} container${containers.length !== 1 ? "s" : ""}`
                : "No containers found"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Instance ID search */}
              <div className="relative">
                <input type="text" placeholder="Search by instance ID…" className="h-8 w-64 rounded-md border border-input bg-background px-3 pr-7 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" value={containersInstanceId} onChange={(e) => {
            setContainersInstanceId(e.target.value);
            setContainersOffset(0);
        }}/>
                {containersInstanceId && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setContainersInstanceId(""); setContainersOffset(0); }}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              {/* Type filter */}
              <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={containersType} onChange={(e) => {
            setContainersType(e.target.value as "" | "inventory" | "shulker_box");
            setContainersOffset(0);
        }}>
                <option value="">All types</option>
                <option value="inventory">inventory</option>
                <option value="shulker_box">shulker_box</option>
              </select>
              {(containersInstanceId || containersType) && (<Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => {
                setContainersInstanceId("");
                setContainersType("");
                setContainersOffset(0);
            }}>Clear</Button>)}
              <Button variant="outline" size="icon" onClick={loadContainers} disabled={containersLoading} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${containersLoading ? "animate-spin" : ""}`}/>
              </Button>
            </div>
          </div>

          {/* Response-level metadata */}
          {(containersProfileId || containersUserId) && (<div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground px-1">
              {containersProfileId && (<div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">profile_id:</span>
                  <span className="font-mono">{containersProfileId}</span>
                  <CopyButton text={containersProfileId} size="h-3 w-3"/>
                </div>)}
              {containersUserId && (<div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">user_id:</span>
                  <span className="font-mono">{containersUserId}</span>
                  <CopyButton text={containersUserId} size="h-3 w-3"/>
                </div>)}
            </div>)}

          <Card>
            <CardContent className="p-0">
              {containersLoading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : containersError ? (<div className="p-6 text-center">
                  <p className="text-destructive text-sm mb-3">{containersError}</p>
                  <Button variant="outline" size="sm" onClick={loadContainers}>Try Again</Button>
                </div>) : containers.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">{(containersInstanceId || containersType) ? "No matching containers" : "No containers"}</p>
                  <p className="text-sm mt-1">
                    {(containersInstanceId || containersType)
                ? "No containers match the current filters."
                : "This player has no containers."}
                  </p>
                </div>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Grid</TableHead>
                      <TableHead>Portable</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map((c) => {
                const cExpanded = expandedContainerIds.has(c.id);
                return (<Fragment key={c.id}>
                      <TableRow className={`cursor-pointer hover:bg-muted/40 ${cExpanded ? "bg-muted/30" : ""}`} onClick={() => {
                        setExpandedContainerIds(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) {
                                next.delete(c.id);
                            }
                            else {
                                next.add(c.id);
                                const linkedItemId = c.definition?.linked_item_definition_id;
                                if (linkedItemId) {
                                    setItemDefNames(m => {
                                        if (m[linkedItemId] !== undefined)
                                            return m;
                                        getItemDefinition({ gameId }, linkedItemId)
                                            .then(r => setItemDefNames(p => ({ ...p, [linkedItemId]: r.item.name })))
                                            .catch(() => setItemDefNames(p => ({ ...p, [linkedItemId]: "" })));
                                        return { ...m, [linkedItemId]: "…" };
                                    });
                                }
                            }
                            return next;
                        });
                    }}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            {c.definition?.name || "—"}
                            {c.item_container_definition_id && (<a href={`/games/${gameId}/items?tab=containers&q=${c.item_container_definition_id}`} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Open container definition" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-3.5 w-3.5"/>
                              </a>)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <span className="flex items-center gap-1">
                            {cExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>}
                            {c.id.slice(0, 8)}…
                            <CopyButton text={c.id} size="h-3 w-3"/>
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap capitalize ${c.container_type === "inventory"
                        ? "bg-blue-500/10 text-blue-400 border-blue-400/30"
                        : c.container_type === "shulker_box"
                            ? "bg-purple-500/10 text-purple-400 border-purple-400/30"
                            : "bg-muted text-muted-foreground border-border"}`}>
                            <Archive className="h-3 w-3 shrink-0"/>
                            {c.container_type || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {c.definition ? `${c.definition.grid_cols}×${c.definition.grid_rows}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.definition == null ? "—" : c.definition.is_portable
                        ? <span className="text-green-500">Yes</span>
                        : <span className="text-muted-foreground">No</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.created_at ? formatISODate(c.created_at) : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.updated_at ? formatISODate(c.updated_at) : "—"}</TableCell>
                        <TableCell>
                          {(() => {
                        const q = new URLSearchParams();
                        if (c.definition?.name)
                            q.set("def_name", c.definition.name);
                        if (c.definition?.grid_cols)
                            q.set("def_cols", String(c.definition.grid_cols));
                        if (c.definition?.grid_rows)
                            q.set("def_rows", String(c.definition.grid_rows));
                        if (c.definition?.is_portable != null)
                            q.set("def_portable", c.definition.is_portable ? "1" : "0");
                        if (c.container_type)
                            q.set("ctype", c.container_type);
                        const qs = q.toString();
                        const href = `/games/${gameId}/players/${progressId}/containers/${c.id}${qs ? `?${qs}` : ""}`;
                        return (<Button variant="outline" size="icon" asChild title="View items" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <a href={href}>
                                  <Eye className="h-4 w-4"/>
                                </a>
                              </Button>);
                    })()}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {cExpanded && (<TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-6 py-4 space-y-3">
                              {/* Container ID */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">Container ID:</span>
                                <span className="text-xs font-mono text-muted-foreground">{c.id}</span>
                                <CopyButton text={c.id}/>
                              </div>

                              {/* Owner */}
                              {c.owner_user_id && (<div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">Owner User ID:</span>
                                  <span className="text-xs font-mono text-muted-foreground">{c.owner_user_id}</span>
                                  <CopyButton text={c.owner_user_id}/>
                                </div>)}

                              {/* Definition ID */}
                              {c.item_container_definition_id && (<div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">Definition ID:</span>
                                  <span className="text-xs font-mono text-muted-foreground">{c.item_container_definition_id}</span>
                                  <CopyButton text={c.item_container_definition_id}/>
                                </div>)}

                              {/* Game ID */}
                              {c.game_id && (<div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">Game ID:</span>
                                  <span className="text-xs font-mono text-muted-foreground">{c.game_id}</span>
                                  <CopyButton text={c.game_id}/>
                                </div>)}

                              {/* Studio ID */}
                              {c.studio_id && (<div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">Studio ID:</span>
                                  <span className="text-xs font-mono text-muted-foreground">{c.studio_id}</span>
                                  <CopyButton text={c.studio_id}/>
                                </div>)}

                              {/* Container Info */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Type: </span>
                                  <span className="font-medium capitalize">{c.container_type || "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Grid: </span>
                                  <span className="font-medium">{c.definition ? `${c.definition.grid_cols}×${c.definition.grid_rows}` : "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Portable: </span>
                                  {c.definition == null ? <span className="font-medium">—</span> : c.definition.is_portable
                            ? <span className="font-medium text-green-500">Yes</span>
                            : <span className="font-medium text-orange-400">No</span>}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created: </span>
                                  <span className="font-medium">{c.created_at ? formatISODate(c.created_at) : "—"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Updated: </span>
                                  <span className="font-medium">{c.updated_at ? formatISODate(c.updated_at) : "—"}</span>
                                </div>
                                {c.deleted_at && (<div>
                                    <span className="text-muted-foreground">Deleted: </span>
                                    <span className="font-medium text-destructive">{formatISODate(c.deleted_at)}</span>
                                  </div>)}
                              </div>

                              {/* Position Data */}
                              {c.position_data && Object.keys(c.position_data).length > 0 && (<div className="space-y-1">
                                  <p className="text-xs font-semibold text-foreground">Position Data</p>
                                  <pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-[200px]">
                                    {JSON.stringify(c.position_data, null, 2)}
                                  </pre>
                                </div>)}

                              {/* Container Metadata */}
                              {c.metadata && Object.keys(c.metadata).length > 0 && (<div className="space-y-1">
                                  <p className="text-xs font-semibold text-foreground">Container Metadata</p>
                                  <pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-[200px]">
                                    {JSON.stringify(c.metadata, null, 2)}
                                  </pre>
                                </div>)}

                              {/* Container Definition */}
                              {c.definition && (<div className="space-y-2 border border-border/60 rounded-md p-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold text-foreground">Definition</p>
                                    <a href={`/games/${gameId}/items?tab=containers&q=${c.definition.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" title="Go to container definition" onClick={(e) => e.stopPropagation()}>
                                      {c.definition.name}
                                      <ExternalLink className="h-3 w-3 shrink-0"/>
                                    </a>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                                    <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5">
                                      <span className="text-muted-foreground">ID:</span>
                                      <span className="font-mono text-muted-foreground">{c.definition.id}</span>
                                      <CopyButton text={c.definition.id}/>
                                    </div>
                                    <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5">
                                      <span className="text-muted-foreground">Game ID:</span>
                                      <span className="font-mono text-muted-foreground">{c.definition.game_id}</span>
                                      <CopyButton text={c.definition.game_id}/>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Type: </span>
                                      <span className="font-medium capitalize">{c.definition.container_type}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Grid: </span>
                                      <span className="font-medium">{c.definition.grid_cols}×{c.definition.grid_rows}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Portable: </span>
                                      {c.definition.is_portable
                                ? <span className="font-medium text-green-500">Yes</span>
                                : <span className="font-medium text-orange-400">No</span>}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Instanced per item: </span>
                                      {c.definition.instanced_per_item
                                ? <span className="font-medium text-green-500">Yes</span>
                                : <span className="font-medium text-orange-400">No</span>}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Created: </span>
                                      <span className="font-medium">{formatISODate(c.definition.created_at)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Updated: </span>
                                      <span className="font-medium">{formatISODate(c.definition.updated_at)}</span>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1.5">
                                      <span className="text-muted-foreground">Created by:</span>
                                      <span className="font-mono text-muted-foreground">{c.definition.created_by}</span>
                                      <CopyButton text={c.definition.created_by}/>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1.5">
                                      <span className="text-muted-foreground">Updated by:</span>
                                      <span className="font-mono text-muted-foreground">{c.definition.updated_by}</span>
                                      <CopyButton text={c.definition.updated_by}/>
                                    </div>
                                  </div>

                                  {/* Linked item definition */}
                                  {c.definition.linked_item_definition_id && (<div className="flex items-center gap-2 text-xs pt-1 border-t border-border/40">
                                      <span className="text-muted-foreground font-mono">linked_item_definition_id:</span>
                                      <a href={`/games/${gameId}/items/${c.definition.linked_item_definition_id}`} className="inline-flex items-center gap-1 text-primary hover:underline font-mono" title="Go to item definition" onClick={(e) => e.stopPropagation()}>
                                        {itemDefNames[c.definition.linked_item_definition_id] && (<span className="font-semibold not-italic">{itemDefNames[c.definition.linked_item_definition_id]}</span>)}
                                        <span className="opacity-60">{c.definition.linked_item_definition_id}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0"/>
                                      </a>
                                      <CopyButton text={c.definition.linked_item_definition_id}/>
                                    </div>)}

                                  {/* Definition Metadata */}
                                  {c.definition.metadata && Object.keys(c.definition.metadata).length > 0 && (<div className="space-y-1 pt-1 border-t border-border/40">
                                      <p className="text-xs font-semibold text-muted-foreground">Metadata</p>
                                      <div className="space-y-0.5">
                                        {Object.entries(c.definition.metadata).map(([k, v]) => (<div key={k} className="flex items-start gap-2 text-xs font-mono">
                                            <span className="text-muted-foreground shrink-0">{k}:</span>
                                            <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                          </div>))}
                                      </div>
                                    </div>)}
                                </div>)}
                            </div>
                          </TableCell>
                        </TableRow>)}
                      </Fragment>);
            })}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>

          {/* Pagination */}
          {(containersOffset > 0 || containersHasMore) && (<div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {containersOffset + 1}–{containersOffset + containers.length}
                {containersHasMore ? "+" : ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={containersOffset === 0} onClick={() => setContainersOffset(Math.max(0, containersOffset - CONTAINERS_LIMIT))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={!containersHasMore} onClick={() => setContainersOffset(containersOffset + CONTAINERS_LIMIT)}>Next</Button>
              </div>
            </div>)}
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Player Presets</h2>
              <p className="text-sm text-muted-foreground">
                {presetsLoading
            ? "Loading…"
            : presets.length > 0
                ? `${presets.length} preset${presets.length !== 1 ? "s" : ""}`
                : "No presets found"}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={loadPresets} disabled={presetsLoading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${presetsLoading ? "animate-spin" : ""}`}/>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {presetsLoading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : presetsError ? (<div className="p-6 text-center">
                  <p className="text-destructive text-sm mb-3">{presetsError}</p>
                  <Button variant="outline" size="sm" onClick={loadPresets}>Try Again</Button>
                </div>) : presets.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">No presets</p>
                  <p className="text-sm mt-1">This player has no preset containers.</p>
                </div>) : (<Table id="player-presets-table">
                  <TableHeader id="player-presets-table-header">
                    <TableRow id="player-presets-header-row">
                      <TableHead id="player-presets-th-name">{t("playerPresets.tableName")}</TableHead>
                      <TableHead id="player-presets-th-definition">{t("playerPresets.tableDefinition")}</TableHead>
                      <TableHead id="player-presets-th-instance-id">{t("playerPresets.tableInstanceId")}</TableHead>
                      <TableHead id="player-presets-th-type">{t("playerPresets.tableType")}</TableHead>
                      <TableHead id="player-presets-th-max-slots" className="text-right">{t("playerPresets.tableMaxSlots")}</TableHead>
                      <TableHead id="player-presets-th-created">{t("playerPresets.tableCreated")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody id="player-presets-table-body">
                    {presets.map((p) => {
                const pExpanded = expandedPresetIds.has(p.id);
                return (<Fragment key={p.id}>
                          <TableRow id={`player-preset-row-${p.id}`} className={`cursor-pointer hover:bg-muted/40 ${pExpanded ? "bg-muted/30" : ""}`} onClick={() => togglePresetRow(p.id)}>
                            <TableCell id={`player-preset-name-cell-${p.id}`} className="text-sm font-medium">
                              <span id={`player-preset-name-span-${p.id}`} className="flex items-center gap-1">
                                {pExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>}
                                {p.name || p.definition?.name || presetDetails[p.id]?.container.definition?.name || "—"}
                              </span>
                            </TableCell>
                            <TableCell id={`player-preset-definition-cell-${p.id}`} className="text-sm font-medium text-muted-foreground">
                              <span id={`player-preset-definition-span-${p.id}`}>
                                {p.definition?.name || presetDetails[p.id]?.container.definition?.name || "—"}
                              </span>
                            </TableCell>
                            <TableCell id={`player-preset-instance-cell-${p.id}`} className="font-mono text-xs">
                              <span id={`player-preset-instance-span-${p.id}`} className="flex items-center gap-1">
                                {p.id.slice(0, 8)}…
                                <CopyButton id={`player-preset-instance-copy-${p.id}`} text={p.id} size="h-3 w-3"/>
                              </span>
                            </TableCell>
                            <TableCell id={`player-preset-type-cell-${p.id}`}>
                              <span id={`player-preset-type-span-${p.id}`} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap capitalize bg-orange-500/10 text-orange-400 border-orange-400/30">
                                <Package className="h-3 w-3 shrink-0"/>
                                {p.preset_type || "—"}
                              </span>
                            </TableCell>
                            <TableCell id={`player-preset-slots-cell-${p.id}`} className="text-right text-sm font-mono">{p.max_slots}</TableCell>
                            <TableCell id={`player-preset-created-cell-${p.id}`} className="text-sm text-muted-foreground">{p.created_at ? formatISODate(p.created_at) : "—"}</TableCell>
                          </TableRow>

                          {/* Expanded detail row */}
                          {pExpanded && (<TableRow id={`player-preset-expanded-row-${p.id}`} className="bg-muted/30 hover:bg-muted/40">
                              <TableCell id={`player-preset-expanded-cell-${p.id}`} colSpan={6} className="p-0">
                                <div className="px-6 py-4 space-y-4">
                                  {/* Instance ID */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">Instance ID:</span>
                                    <span className="text-xs font-mono text-muted-foreground">{p.id}</span>
                                    <CopyButton text={p.id}/>
                                  </div>

                                  {/* Loading / Error / Detail */}
                                  {presetDetailsLoading.has(p.id) ? (<div className="space-y-2">
                                      <Skeleton className="h-4 w-full"/>
                                      <Skeleton className="h-4 w-3/4"/>
                                      <Skeleton className="h-16 w-full"/>
                                    </div>) : presetDetailsError[p.id] ? (<div className="flex items-center gap-3">
                                      <p className="text-destructive text-sm">{presetDetailsError[p.id]}</p>
                                      <Button variant="outline" size="sm" onClick={() => {
                                setPresetDetailsError(s => { const n = { ...s }; delete n[p.id]; return n; });
                                togglePresetRow(p.id);
                                togglePresetRow(p.id);
                            }}>Retry</Button>
                                    </div>) : presetDetails[p.id] ? (() => {
                            const d = presetDetails[p.id];
                            return (<>
                                        {/* Definition ID */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-foreground">Definition ID:</span>
                                          <span className="text-xs font-mono text-muted-foreground">{d.container.definition_id}</span>
                                          <CopyButton text={d.container.definition_id}/>
                                        </div>

                                        {/* Container fields */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                                          <div>
                                            <span className="text-muted-foreground">Type: </span>
                                            <span className="font-medium capitalize">{d.container.preset_type || "—"}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Max Slots: </span>
                                            <span className="font-medium">{d.container.max_slots}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Temp: </span>
                                            <span className="font-medium">{d.container.is_temp ? "Yes" : "No"}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Created: </span>
                                            <span className="font-medium">{d.container.created_at ? formatISODate(d.container.created_at) : "—"}</span>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Updated: </span>
                                            <span className="font-medium">{d.container.updated_at ? formatISODate(d.container.updated_at) : "—"}</span>
                                          </div>
                                        </div>

                                        {/* Container Metadata */}
                                        {d.container.metadata && Object.keys(d.container.metadata).length > 0 && (<div className="space-y-1">
                                            <p className="text-xs font-semibold text-foreground">Metadata</p>
                                            <pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-[160px]">
                                              {JSON.stringify(d.container.metadata, null, 2)}
                                            </pre>
                                          </div>)}

                                        {/* Definition */}
                                        {d.container.definition && (<div className="space-y-2">
                                            <p className="text-xs font-semibold text-foreground">Definition</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Name: </span>
                                                <span className="font-medium">{d.container.definition.name}</span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Type: </span>
                                                <span className="font-medium capitalize">{d.container.definition.preset_type}</span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Max Slots: </span>
                                                <span className="font-medium">{d.container.definition.max_slots}</span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Def Created: </span>
                                                <span className="font-medium">{formatISODate(d.container.definition.created_at)}</span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Def Updated: </span>
                                                <span className="font-medium">{formatISODate(d.container.definition.updated_at)}</span>
                                              </div>
                                            </div>
                                            {d.container.definition.metadata && Object.keys(d.container.definition.metadata).length > 0 && (<pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto max-h-[160px]">
                                                {JSON.stringify(d.container.definition.metadata, null, 2)}
                                              </pre>)}
                                          </div>)}

                                        {/* Slots */}
                                        <div className="space-y-1.5">
                                          <p className="text-xs font-semibold text-foreground">
                                            Slots
                                            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none font-normal text-muted-foreground">
                                              {d.slots.length} / {d.container.max_slots}
                                            </span>
                                          </p>
                                          {d.slots.length === 0 ? (<p className="text-xs text-muted-foreground italic">No items in slots.</p>) : (<div className="rounded-md border overflow-hidden">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="border-b bg-muted/50">
                                                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-16">Slot</th>
                                                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Item Definition</th>
                                                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Instance</th>
                                                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Def Link</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {d.slots.map((slot) => {
                                        return (<tr key={slot.slot_index} className="border-b last:border-0 hover:bg-muted/30">
                                                        <td className="px-3 py-1.5 font-mono tabular-nums">{slot.slot_index}</td>
                                                        <td className="px-3 py-1.5">
                                                          {slot.item_definition_id ? (<span className="font-medium text-xs">{slot.item_definition_name || slot.item_definition_id}</span>) : (<span className="text-muted-foreground text-xs">—</span>)}
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                          <div className="flex items-center gap-1">
                                                            <a href={`/games/${gameId}/players/${progressId}?tab=items&item_iid=${slot.inventory_item_id}`} className="text-muted-foreground hover:text-primary flex items-center gap-0.5 text-xs font-mono" title={slot.inventory_item_id}>
                                                              {slot.inventory_item_id.slice(0, 8)}…
                                                              <ArrowUpRight className="h-3 w-3 shrink-0"/>
                                                            </a>
                                                            <CopyButton text={slot.inventory_item_id} size="h-3 w-3"/>
                                                          </div>
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                          {slot.item_definition_id ? (<a href={`/games/${gameId}/items/${slot.item_definition_id}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-0.5 text-xs font-mono" title={slot.item_definition_id}>
                                                              {slot.item_definition_id.slice(0, 8)}…
                                                              <ArrowUpRight className="h-3 w-3 shrink-0"/>
                                                            </a>) : (<span className="text-muted-foreground text-xs">—</span>)}
                                                        </td>
                                                      </tr>);
                                    })}
                                                </tbody>
                                              </table>
                                            </div>)}
                                        </div>
                                      </>);
                        })() : (
                        /* Fallback while detail hasn't loaded yet (shouldn't normally show) */
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Type: </span>
                                        <span className="font-medium capitalize">{p.preset_type || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Max Slots: </span>
                                        <span className="font-medium">{p.max_slots}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Temp: </span>
                                        <span className="font-medium">{p.is_temp ? "Yes" : "No"}</span>
                                      </div>
                                    </div>)}
                                </div>
                              </TableCell>
                            </TableRow>)}
                        </Fragment>);
            })}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generators" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Player Generators</h2>
              <p className="text-sm text-muted-foreground">
                {generatorsLoading
            ? "Loading…"
            : generatorItems.length > 0
                ? `${generatorItems.length} generator${generatorItems.length !== 1 ? "s" : ""}`
                : "No generators"}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={loadGenerators} disabled={generatorsLoading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${generatorsLoading ? "animate-spin" : ""}`}/>
            </Button>
          </div>

          {generatorsLoading ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-40"/>
                  <Skeleton className="h-4 w-full"/>
                  <Skeleton className="h-20 w-full"/>
                </CardContent></Card>))}
            </div>) : generatorsError ? (<Card>
              <CardContent className="p-6 text-center">
                <p className="text-destructive text-sm mb-3">{generatorsError}</p>
                <Button variant="outline" size="sm" onClick={loadGenerators}>Try Again</Button>
              </CardContent>
            </Card>) : generatorItems.length === 0 ? (<Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                <p className="text-lg font-medium">No generators</p>
                <p className="text-sm mt-1">This player has no generator items in their inventory.</p>
              </CardContent>
            </Card>) : (<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {generatorItems.map((item) => {
                const gc = item.definition?.metadata?.generator_config as Record<string, unknown> | undefined;
                const outputPool = gc && Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : [];
                const interval = Number(gc?.production_interval_seconds) || 0;
                const tickCap = Number(gc?.tick_capacity) || 0;
                return (<Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm truncate">{item.definition?.name ?? item.item_definition_id.slice(0, 12)}</span>
                            <a href={`/games/${gameId}/items/${item.item_definition_id}`} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="Open item definition">
                              <ExternalLink className="h-3.5 w-3.5"/>
                            </a>
                            {item.definition?.rarity && (<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border capitalize ${RARITY_STYLE[item.definition.rarity] ?? "bg-muted text-muted-foreground border-border"}`}>
                                {item.definition.rarity}
                              </span>)}
                          </div>
                          {item.definition?.item_code && (<div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-mono">{item.definition.item_code}</span>
                              <CopyButton text={item.definition.item_code}/>
                            </div>)}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/60 font-mono">def: {item.item_definition_id.slice(0, 8)}…</span>
                            <CopyButton text={item.item_definition_id}/>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground shrink-0">
                          <span>Qty: <span className="font-semibold text-foreground">{item.quantity}</span></span>
                          <span>Lv: <span className="font-semibold text-foreground">{item.level}</span></span>
                        </div>
                      </div>

                      {/* Instance ID */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-muted-foreground">Instance:</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.id.slice(0, 16)}…</span>
                        <CopyButton text={item.id}/>
                      </div>

                      {/* Container info */}
                      {(() => {
                        const c = containerMapForItems[item.item_container_id];
                        if (!c)
                            return null;
                        return (<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Archive className="h-3 w-3"/>
                            <span className="font-medium">{c.definition?.name ?? c.container_type}</span>
                            <span className="font-mono text-[10px]">@ ({item.grid_x}, {item.grid_y})</span>
                          </div>);
                    })()}

                      {/* Acquired */}
                      <div className="text-[10px] text-muted-foreground">
                        Acquired: {item.acquired_at ? formatISODate(item.acquired_at) : "—"}
                      </div>

                      {/* Generator Live Estimate */}
                      {gc && (<div className="border-t pt-3">
                          <GeneratorLiveEstimate interval={interval} tickCapacity={tickCap} outputPool={outputPool} outputPoolDefNames={genOutputPoolDefNames} lastModifiedAt={item.last_modified_at} gameId={gameId}/>
                        </div>)}

                      {/* Metadata (non-generator_config) */}
                      {item.definition?.metadata && (() => {
                        const filtered = Object.fromEntries(Object.entries(item.definition.metadata).filter(([k]) => k !== "generator_config"));
                        if (Object.keys(filtered).length === 0)
                            return null;
                        return (<div className="border-t pt-2 space-y-1">
                            <p className="text-[10px] font-medium text-muted-foreground">Other Metadata</p>
                            <pre className="text-[10px] font-mono bg-muted rounded p-2 overflow-x-auto max-h-[120px]">
                              {JSON.stringify(filtered, null, 2)}
                            </pre>
                          </div>);
                    })()}

                      {/* Custom Properties */}
                      {item.custom_properties && Object.keys(item.custom_properties).length > 0 && (<div className="border-t pt-2 space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Custom Properties</p>
                          <pre className="text-[10px] font-mono bg-muted rounded p-2 overflow-x-auto max-h-[120px]">
                            {JSON.stringify(item.custom_properties, null, 2)}
                          </pre>
                        </div>)}
                    </CardContent>
                  </Card>);
            })}
            </div>)}
        </TabsContent>

        <TabsContent value="equipments" className="space-y-4">
          <EquipmentsTab gameId={gameId} slots={equipmentSlots} setSlots={setEquipmentSlots} loading={equipmentLoading} setLoading={setEquipmentLoading} error={equipmentError} setError={setEquipmentError} activeTab={activeTab} maxEquipmentSlots={null} equipmentSlotsUsage={null} onLoadGameInfo={() => { }} equippedItems={equippedItems} equippedLoading={equippedLoading} onRefreshEquipped={() => {
            const userId = detail?.user_id;
            if (!userId || equippedLoading)
                return;
            setEquippedLoading(true);
            import("@/lib/game-user-api").then(({ getPlayerEquipped }) => getPlayerEquipped(gameId, userId)
                .then((res) => setEquippedItems(res.equipped ?? []))
                .catch(() => { })
                .finally(() => setEquippedLoading(false)));
        }} readOnly playerProgressId={progressId}/>
        </TabsContent>
      </Tabs>

      {/* Idempotency Key help panel */}
      <Sheet open={idempotencyHelpOpen} onOpenChange={setIdempotencyHelpOpen}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary"/>
              Idempotency Key
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 text-sm">
            <section className="space-y-2">
              <h3 className="font-semibold text-base">What is it?</h3>
              <p className="text-muted-foreground leading-relaxed">
                An <span className="font-medium text-foreground">Idempotency Key</span> is a unique string sent by the game client with each gacha request. The server uses it to guarantee that even if the same request is sent multiple times (e.g., due to a network retry), it is only processed <span className="font-medium text-foreground">once</span>.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-base">How it works</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>The client generates a unique key before sending the gacha spin request.</li>
                <li>The server processes the request and stores the result tied to that key.</li>
                <li>If the same key is sent again, the server returns the stored result instead of spinning again.</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-base">Common key formats</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><code className="bg-muted px-1 py-0.5 rounded font-mono text-xs">UUID v4</code> — e.g. <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs">7274792-1740…</code></li>
                <li><code className="bg-muted px-1 py-0.5 rounded font-mono text-xs">timestamp + random</code> — e.g. <code className="bg-muted px-1 py-0.5 rounded font-mono text-xs">spin_1740000000_abc</code></li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-base">Debugging tips</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-yellow-500 shrink-0">⚠</span>
                  <span>If two transactions share the same key, only the first was actually executed — the second is a duplicate cached response.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 shrink-0">ℹ</span>
                  <span>You can use this key to match server logs with in-game events and trace exactly which client session triggered the spin.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  <span>A missing or empty key means the client did not implement idempotency — repeated retries could result in duplicate spins.</span>
                </li>
              </ul>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>);
}
