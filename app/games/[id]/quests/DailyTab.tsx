"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { toSlugUnderscore } from "@/lib/utils";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Trash2, Pencil, Loader2, Eye, EyeOff, ChevronsUpDown, Calendar, Shuffle, RotateCw, ChevronDown, ChevronRight, Clock, Weight, Hash, Wand2, Search, GripVertical, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose, } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";
import { DailyQuestMaxAdvanceDays } from "@/components/DailyQuestMaxAdvanceDays";
import { listDailyQuestPools, getDailyQuestPool, listPoolQuests, createDailyQuestPool, updateDailyQuestPool, updateQuestDefinition, addQuestToPool, removeQuestFromPool, listQuestDefinitions, type DailyQuestPool, type DailyQuestPoolQuest, type CreateDailyQuestPoolRequest, type UpdateDailyQuestPoolRequest, type AddQuestToPoolRequest, type AssignmentStrategy, type QuestDefinition, } from "@/lib/quest-api";
// ─── Strategy Grid Illustration ─────────────────────────────────────────────
const QUEST_COLORS = [
    { bg: "bg-blue-500/80", text: "text-blue-600", light: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-400" },
    { bg: "bg-emerald-500/80", text: "text-emerald-600", light: "bg-emerald-100 dark:bg-emerald-900/40", border: "border-emerald-400" },
    { bg: "bg-violet-500/80", text: "text-violet-600", light: "bg-violet-100 dark:bg-violet-900/40", border: "border-violet-400" },
    { bg: "bg-amber-500/80", text: "text-amber-600", light: "bg-amber-100 dark:bg-amber-900/40", border: "border-amber-400" },
    { bg: "bg-rose-500/80", text: "text-rose-600", light: "bg-rose-100 dark:bg-rose-900/40", border: "border-rose-400" },
];
const DEMO_QUESTS = [
    { name: "Q-A", weight: 5 },
    { name: "Q-B", weight: 3 },
    { name: "Q-C", weight: 2 },
    { name: "Q-D", weight: 1 },
    { name: "Q-E", weight: 1 },
];
// Seeded pseudo-random 30-day weighted random picks (2 slots/day, no duplicate same slot)
function seededWeightedRandom(weights: number[], seed: number): number {
    let h = seed * 2654435761;
    h = (h ^ (h >>> 16)) >>> 0;
    const total = weights.reduce((a, b) => a + b, 0);
    const r = (h % 1000) / 1000 * total;
    let cum = 0;
    for (let i = 0; i < weights.length; i++) {
        cum += weights[i];
        if (r < cum)
            return i;
    }
    return weights.length - 1;
}
function buildWeightedRandomDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
    return Array.from({ length: days }, (_, d) => {
        const picks: number[] = [];
        const weights = [...quests.map((q) => q.weight)];
        for (let s = 0; s < slots; s++) {
            const idx = seededWeightedRandom(weights, d * 100 + s + 7);
            picks.push(idx);
            weights[idx] = 0; // no duplicate in same day
        }
        return picks;
    });
}
function buildFixedRotationDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
    return Array.from({ length: days }, (_, d) => {
        return Array.from({ length: slots }, (_, s) => (d * slots + s) % quests.length);
    });
}
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function buildWeeklyScheduleDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
    // Assign quests per day-of-week (wrap around if >7 quests)
    // Assume month starts on Monday (dow=1)
    const startDow = 1;
    return Array.from({ length: days }, (_, d) => {
        const dow = (startDow + d) % 7;
        return Array.from({ length: slots }, (_, s) => (dow * slots + s) % quests.length);
    });
}
function buildMonthlyScheduleDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
    return Array.from({ length: days }, (_, d) => {
        return Array.from({ length: slots }, (_, s) => ((d * slots + s)) % quests.length);
    });
}
function DayCell({ picks, quests, day }: {
    picks: number[];
    quests: typeof DEMO_QUESTS;
    day: number;
}) {
    return (<div className="flex flex-col items-center gap-0.5 p-0.5">
      <span className="text-[9px] text-muted-foreground font-medium leading-none mb-0.5">{day}</span>
      <div className="flex gap-0.5">
        {picks.map((qi, si) => (<div key={si} className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[qi % QUEST_COLORS.length].bg}`} title={quests[qi]?.name}>
            {quests[qi]?.name.replace("Q-", "")}
          </div>))}
      </div>
    </div>);
}
function StrategyGridCard({ title, description, icon, days, quests, extra, }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    days: number[][];
    quests: typeof DEMO_QUESTS;
    extra?: React.ReactNode;
}) {
    const { t } = useTranslation();
    return (<Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quest Legend */}
        <div className="flex flex-wrap gap-2">
          {quests.map((q, i) => (<div key={i} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border ${QUEST_COLORS[i % QUEST_COLORS.length].light} ${QUEST_COLORS[i % QUEST_COLORS.length].border}`}>
              <div className={`w-3 h-3 rounded-sm ${QUEST_COLORS[i % QUEST_COLORS.length].bg}`}/>
              <span className={`font-medium ${QUEST_COLORS[i % QUEST_COLORS.length].text}`}>{q.name}</span>
              {q.weight !== undefined && <span className="text-muted-foreground">w={q.weight}</span>}
            </div>))}
        </div>

        {extra}

        {/* 30-day grid */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">{t('quest.daily.simulationTitle')}</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {DAY_NAMES.map((d) => (<div key={d} className="text-[9px] text-muted-foreground text-center font-medium py-0.5">{d}</div>))}
            {/* empty cells for month starting on Monday */}
            <div />{/* Sun placeholder for week 1 */}
            {days.map((picks, d) => (<DayCell key={d} picks={picks} quests={quests} day={d + 1}/>))}
          </div>
        </div>
      </CardContent>
    </Card>);
}
function DailyStrategyGrid() {
    const { t } = useTranslation();
    const slots = 2;
    const totalDays = 30;
    const quests = DEMO_QUESTS;
    const weightedDays = buildWeightedRandomDays(quests, slots, totalDays);
    const rotationDays = buildFixedRotationDays(quests, slots, totalDays);
    const weeklyDays = buildWeeklyScheduleDays(quests, slots, totalDays);
    const monthlyDays = buildMonthlyScheduleDays(quests, slots, totalDays);
    const totalWeight = quests.reduce((a, q) => a + q.weight, 0);
    return (<div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">{t('quest.daily.strategyMechanicsTitle')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('quest.daily.strategyMechanicsDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Weighted Random ────────────────────────────────────── */}
        <StrategyGridCard title={t('quest.daily.weightedRandom')} icon={<Shuffle className="h-4 w-4 text-primary"/>} description={t('quest.daily.weightedRandomDesc')} days={weightedDays} quests={quests} extra={<div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('quest.daily.probabilityPerPick')}</p>
              <div className="space-y-1">
                {quests.map((q, i) => (<div key={i} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm shrink-0 ${QUEST_COLORS[i].bg}`}/>
                    <span className="text-xs w-8">{q.name}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${QUEST_COLORS[i].bg}`} style={{ width: `${(q.weight / totalWeight) * 100}%` }}/>
                    </div>
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      {q.weight}/{totalWeight} = {Math.round((q.weight / totalWeight) * 100)}%
                    </span>
                  </div>))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t('quest.daily.weightedRandomNote')}
              </p>
            </div>}/>

        {/* ── Fixed Rotation ────────────────────────────────────── */}
        <StrategyGridCard title={t('quest.daily.fixedRotation')} icon={<RotateCw className="h-4 w-4 text-secondary-foreground"/>} description={t('quest.daily.fixedRotationDesc')} days={rotationDays} quests={quests} extra={<div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('quest.daily.sequenceOrder')}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {[...quests, ...quests.slice(0, 3)].map((q, i) => (<div key={i} className="flex items-center gap-0.5">
                    <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[(i) % QUEST_COLORS.length].bg}`}>
                      {q.name.replace("Q-", "")}
                    </div>
                    {i < quests.length + 2 && <span className="text-muted-foreground text-xs">→</span>}
                  </div>))}
                <span className="text-xs text-muted-foreground">(repeats)</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t('quest.daily.fixedRotationNote')}
              </p>
            </div>}/>

        {/* ── Weekly Schedule ───────────────────────────────────── */}
        <StrategyGridCard title={t('quest.daily.weeklySchedule')} icon={<Calendar className="h-4 w-4 text-blue-400"/>} description={t('quest.daily.weeklyScheduleDesc')} days={weeklyDays} quests={quests} extra={<div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('quest.daily.dayOfWeekMapping')}</p>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((day, dow) => {
                const dow1 = (dow + 1) % 7; // start from Mon
                const qi = (dow1 * slots) % quests.length;
                return (<div key={day} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{day}</span>
                      <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[qi % QUEST_COLORS.length].bg}`}>
                        {quests[qi % quests.length].name.replace("Q-", "")}
                      </div>
                    </div>);
            })}
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t('quest.daily.weeklyScheduleNote')}
              </p>
            </div>}/>

        {/* ── Monthly Schedule ──────────────────────────────────── */}
        <StrategyGridCard title={t('quest.daily.monthlySchedule')} icon={<Calendar className="h-4 w-4 text-amber-400"/>} description={t('quest.daily.monthlyScheduleDesc')} days={monthlyDays} quests={quests} extra={<div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('quest.daily.dayOfMonthMapping')}</p>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, d) => {
                const qi = (d * slots) % quests.length;
                return (<div key={d} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">D{d + 1}</span>
                      <div className={`w-7 h-7 rounded text-[9px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[qi % QUEST_COLORS.length].bg}`}>
                        {quests[qi % quests.length].name.replace("Q-", "")}
                      </div>
                    </div>);
            })}
                <div className="flex flex-col items-center justify-end">
                  <span className="text-xs text-muted-foreground">…</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t('quest.daily.monthlyScheduleNote')}
              </p>
            </div>}/>
      </div>

      {/* ── How slots work ──────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">What is &ldquo;Slots per Day&rdquo;?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Each pool has a <strong>slots_per_day</strong> setting. Each slot picks one quest independently.
            In the examples above, <strong>2 slots</strong> means every player sees 2 quests each day.
          </p>
          <div className="flex gap-6">
            {[1, 2, 3].map((s) => (<div key={s} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{s} slot{s > 1 ? "s" : ""}</span>
                <div className="flex gap-1">
                  {Array.from({ length: s }, (_, i) => (<div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold ${QUEST_COLORS[i].bg}`}>
                      {DEMO_QUESTS[i].name.replace("Q-", "")}
                    </div>))}
                </div>
              </div>))}
          </div>
        </CardContent>
      </Card>
    </div>);
}
// ─── Constants ────────────────────────────────────────────────────────────────
const STRATEGY_OPTIONS: {
    value: AssignmentStrategy;
    labelKey: string;
    descKey: string;
    icon: React.ReactNode;
    comingSoon?: boolean;
}[] = [
    { value: "weighted_random", labelKey: "quest.daily.weightedRandom", descKey: "quest.daily.weightedRandomDesc", icon: <Shuffle className="h-4 w-4"/> },
    { value: "fixed_rotation", labelKey: "quest.daily.fixedRotation", descKey: "quest.daily.fixedRotationDesc", icon: <RotateCw className="h-4 w-4"/>, comingSoon: true },
    { value: "weekly_schedule", labelKey: "quest.daily.weeklySchedule", descKey: "quest.daily.weeklyScheduleDesc", icon: <Calendar className="h-4 w-4"/> },
    { value: "monthly_schedule", labelKey: "quest.daily.monthlySchedule", descKey: "quest.daily.monthlyScheduleDesc", icon: <Calendar className="h-4 w-4"/>, comingSoon: true },
];
const DAY_OF_WEEK_LABELS: Record<number, string> = {
    0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
    4: "Thursday", 5: "Friday", 6: "Saturday",
};
function strategyBadgeVariant(strategy: AssignmentStrategy) {
    switch (strategy) {
        case "weighted_random": return "default" as const;
        case "fixed_rotation": return "secondary" as const;
        case "weekly_schedule": return "outline" as const;
        case "monthly_schedule": return "outline" as const;
        default: return "outline" as const;
    }
}
function strategyLabel(strategy: AssignmentStrategy, t: (key: string) => string) {
    const option = STRATEGY_OPTIONS.find((s) => s.value === strategy);
    return option ? t(option.labelKey) : strategy;
}
// ─── Reward Editor (inline, reused from DefinitionsTab pattern) ───────────────
// ─── Daily Tab (exported) ────────────────────────────────────────────────────
export function DailyTab({ game, onGameUpdate }: {
    game: Game | null;
    onGameUpdate?: (g: Game) => void;
}) {
    const { t } = useTranslation();
    const gameId = game?.id ?? "";
    const studioId = game?.studio_id ?? "";
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const subTab = (searchParams.get("subTab") ?? "list") as "list" | "grid";
    const setSubTab = (v: "list" | "grid") => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set("subTab", v);
        router.replace(`?${sp.toString()}`);
    };
    // ── State ─────────────────────────────────────────────────────────────────
    const [pools, setPools] = useState<DailyQuestPool[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Expanded pool detail
    const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);
    const [expandedPool, setExpandedPool] = useState<DailyQuestPool | null>(null);
    const [expandedQuests, setExpandedQuests] = useState<DailyQuestPoolQuest[]>([]);
    const [expandedLoading, setExpandedLoading] = useState(false);
    // Quest definitions lookup (for displaying quest names in pool)
    const [questDefsMap, setQuestDefsMap] = useState<Record<string, QuestDefinition>>({});
    // Pool create / edit
    const [createOpen, setCreateOpen] = useState(false);
    const [editPool, setEditPool] = useState<DailyQuestPool | null>(null);
    const [poolForm, setPoolForm] = useState<CreateDailyQuestPoolRequest>({
        pool_key: "",
        display_name: "",
        description: "",
        assignment_strategy: "weighted_random",
        slots_per_day: 3,
        reset_hour_utc: 0,
        is_active: false,
    });
    const [poolSaving, setPoolSaving] = useState(false);
    const [autoSlug, setAutoSlug] = useState(true);
    // Add quest to pool (inline)
    const [dailyQuestDefs, setDailyQuestDefs] = useState<QuestDefinition[]>([]);
    const [dailyQuestDefsLoading, setDailyQuestDefsLoading] = useState(false);
    const [addQuestForm, setAddQuestForm] = useState<AddQuestToPoolRequest>({
        quest_id: "",
        weight: 10,
        sequence_order: 0,
    });
    const [addQuestSaving, setAddQuestSaving] = useState(false);
    const [addQuestSearch, setAddQuestSearch] = useState("");
    const [draggedQuestId, setDraggedQuestId] = useState<string | null>(null);
    const [dragOverDay, setDragOverDay] = useState<number | null>(null);
    // Remove quest from pool
    const [removeQuestTarget, setRemoveQuestTarget] = useState<{
        poolId: string;
        questId: string;
        questName: string;
    } | null>(null);
    const [removeQuestDeleting, setRemoveQuestDeleting] = useState(false);
    const selectedStrategyOption = STRATEGY_OPTIONS.find((s) => s.value === poolForm.assignment_strategy);
    const hasFetched = useRef(false);
    // ── Load quest definitions for name lookup ────────────────────────────────
    const loadQuestDefsMap = useCallback(async () => {
        if (!game)
            return;
        try {
            const data = await listQuestDefinitions(studioId, gameId, { limit: 500 });
            const defs = Array.isArray(data) ? data : (data as any).quests ?? [];
            const map: Record<string, QuestDefinition> = {};
            for (const d of defs)
                map[d.id] = d;
            setQuestDefsMap(map);
        }
        catch {
            // non-critical – names just won't resolve
        }
    }, [game, studioId, gameId]);
    // ── Load pools ────────────────────────────────────────────────────────────
    const loadPools = useCallback(async () => {
        if (!game)
            return;
        try {
            const data = await listDailyQuestPools(studioId, gameId);
            setPools(data.pools ?? []);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : "Failed to load daily quest pools";
            setError(msg);
        }
    }, [game, studioId, gameId]);
    useEffect(() => {
        if (!game || hasFetched.current)
            return;
        hasFetched.current = true;
        setLoading(true);
        Promise.all([loadPools(), loadQuestDefsMap()]).finally(() => setLoading(false));
    }, [game, loadPools, loadQuestDefsMap]);
    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        await Promise.all([loadPools(), loadQuestDefsMap()]);
        setRefreshing(false);
    };
    // ── Load pool detail (expand) ─────────────────────────────────────────────
    const toggleExpand = async (poolId: string) => {
        if (expandedPoolId === poolId) {
            setExpandedPoolId(null);
            setExpandedPool(null);
            setExpandedQuests([]);
            return;
        }
        setExpandedPoolId(poolId);
        setExpandedPool(null);
        setExpandedQuests([]);
        setAddQuestForm({ quest_id: "", weight: 10, sequence_order: 0 });
        setAddQuestSearch("");
        setExpandedLoading(true);
        // Load quest defs for the search panel if not already loaded
        if (dailyQuestDefs.length === 0 && !dailyQuestDefsLoading) {
            setDailyQuestDefsLoading(true);
            listQuestDefinitions(studioId, gameId, { limit: 200 })
                .then((res) => { setDailyQuestDefs((res.quests ?? []).filter((q) => q.quest_type === "daily")); })
                .catch(() => { })
                .finally(() => setDailyQuestDefsLoading(false));
        }
        try {
            const [detail, questsData] = await Promise.all([
                getDailyQuestPool(studioId, gameId, poolId),
                listPoolQuests(studioId, gameId, poolId),
            ]);
            setExpandedPool(detail);
            setExpandedQuests(questsData.quests ?? []);
        }
        catch (e) {
            toast({ variant: "destructive", title: t('common.error'), description: t('quest.daily.failedLoadPool') });
            setExpandedPoolId(null);
        }
        finally {
            setExpandedLoading(false);
        }
    };
    const refreshExpanded = async (poolId: string) => {
        try {
            const [detail, questsData] = await Promise.all([
                getDailyQuestPool(studioId, gameId, poolId),
                listPoolQuests(studioId, gameId, poolId),
            ]);
            setExpandedPool(detail);
            setExpandedQuests(questsData.quests ?? []);
        }
        catch {
            // silent
        }
    };
    // ── Pool Create ───────────────────────────────────────────────────────────
    const openCreate = () => {
        setPoolForm({
            pool_key: "",
            display_name: "",
            description: "",
            assignment_strategy: "weighted_random",
            slots_per_day: 3,
            reset_hour_utc: 0,
            is_active: false,
        });
        setAutoSlug(true);
        setEditPool(null);
        setCreateOpen(true);
    };
    const openEdit = (pool: DailyQuestPool) => {
        setPoolForm({
            pool_key: pool.pool_key,
            display_name: pool.display_name,
            description: pool.description ?? "",
            assignment_strategy: pool.assignment_strategy,
            slots_per_day: pool.slots_per_day,
            reset_hour_utc: pool.reset_hour_utc,
            is_active: pool.is_active,
        });
        setAutoSlug(false);
        setEditPool(pool);
        setCreateOpen(true);
    };
    const handleSavePool = async () => {
        if (!game)
            return;
        setPoolSaving(true);
        try {
            if (editPool) {
                await updateDailyQuestPool(studioId, gameId, editPool.id, {
                    display_name: poolForm.display_name,
                    description: poolForm.description,
                    slots_per_day: poolForm.slots_per_day,
                    reset_hour_utc: poolForm.reset_hour_utc,
                    is_active: poolForm.is_active,
                });
                toast({ title: t('quest.daily.poolUpdated') });
            }
            else {
                await createDailyQuestPool(studioId, gameId, poolForm);
                toast({ title: t('quest.daily.poolCreated') });
            }
            setCreateOpen(false);
            await loadPools();
            if (expandedPoolId)
                await refreshExpanded(expandedPoolId);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : t('quest.daily.failedSavePool');
            toast({ variant: "destructive", title: t('common.error'), description: msg });
        }
        finally {
            setPoolSaving(false);
        }
    };
    // ── Toggle active ─────────────────────────────────────────────────────────
    const handleToggleActive = async (pool: DailyQuestPool) => {
        try {
            await updateDailyQuestPool(studioId, gameId, pool.id, { is_active: !pool.is_active });
            toast({ title: pool.is_active ? t('quest.daily.poolDeactivated') : t('quest.daily.poolActivated') });
            await loadPools();
            if (expandedPoolId === pool.id)
                await refreshExpanded(pool.id);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : t('quest.daily.failedTogglePool');
            toast({ variant: "destructive", title: t('common.error'), description: msg });
        }
    };
    // ── Add quest to pool ─────────────────────────────────────────────────────
    const handleAddQuest = async () => {
        if (!expandedPoolId || !addQuestForm.quest_id)
            return;
        setAddQuestSaving(true);
        try {
            await addQuestToPool(studioId, gameId, expandedPoolId, addQuestForm);
            toast({ title: t('quest.daily.questAddedToPool') });
            setAddQuestForm((prev) => ({ ...prev, quest_id: "" }));
            await refreshExpanded(expandedPoolId);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : t('quest.daily.failedAddQuestToPool');
            toast({ variant: "destructive", title: t('common.error'), description: msg });
        }
        finally {
            setAddQuestSaving(false);
        }
    };
    // ── Remove quest from pool ────────────────────────────────────────────────
    const handleRemoveQuest = async () => {
        if (!removeQuestTarget)
            return;
        setRemoveQuestDeleting(true);
        try {
            await removeQuestFromPool(studioId, gameId, removeQuestTarget.poolId, removeQuestTarget.questId);
            toast({ title: t('quest.daily.questRemovedFromPool') });
            setRemoveQuestTarget(null);
            if (expandedPoolId)
                await refreshExpanded(expandedPoolId);
        }
        catch (e) {
            const msg = e instanceof ApiError ? e.message : t('quest.daily.failedRemoveQuest');
            toast({ variant: "destructive", title: t('common.error'), description: msg });
        }
        finally {
            setRemoveQuestDeleting(false);
        }
    };
    // ── Helper: sequence label ────────────────────────────────────────────────
    const getSequenceLabel = (strategy: AssignmentStrategy, seq: number) => {
        if (strategy === "weekly_schedule")
            return DAY_OF_WEEK_LABELS[seq] ?? `Day ${seq}`;
        if (strategy === "monthly_schedule")
            return `Day ${seq}`;
        if (strategy === "fixed_rotation")
            return `#${seq}`;
        return "";
    };
    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) {
        return (<div className="space-y-4">
        {[1, 2].map((i) => (<Card key={i}>
            <CardHeader>
              <div className="h-5 w-48 bg-muted animate-pulse rounded"/>
              <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1"/>
            </CardHeader>
          </Card>))}
      </div>);
    }
    if (error) {
        return (<Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>);
    }
    return (<>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('quest.daily.manageDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {game && onGameUpdate && (<div className="flex flex-col gap-0.5 text-xs text-muted-foreground border rounded-md px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">{t('quest.daily.maxAdvanceDays')}</span>
                <DailyQuestMaxAdvanceDays game={game} onUpdate={onGameUpdate} compact/>
              </div>
              <p className="text-[10px] text-muted-foreground/80 whitespace-nowrap">{t('game.dailyQuestAdvanceDaysDesc')}</p>
            </div>)}
          {subTab === "list" && (<>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`}/>
                {t('common.refresh')}
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1"/>
                {t('quest.daily.createPool')}
              </Button>
            </>)}
        </div>
      </div>

      {/* SubTab Navigation */}
      <div className="flex items-center gap-1 mb-4 border-b">
        <button onClick={() => setSubTab("list")} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${subTab === "list"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {t('quest.daily.list')}
        </button>
        <button onClick={() => setSubTab("grid")} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${subTab === "grid"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {t('quest.daily.strategyGuide')}
        </button>
      </div>

      {/* Strategy Guide (Grid) */}
      {subTab === "grid" && <DailyStrategyGrid />}

      {/* Pool List */}
      {subTab === "list" && (pools.length === 0 ? (<Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Calendar className="h-10 w-10 opacity-30"/>
            <p className="text-sm">{t('quest.daily.noPoolsYet')}</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1"/> {t('quest.daily.createFirstPool')}
            </Button>
          </CardContent>
        </Card>) : (<div className="space-y-3">
          {pools.map((pool) => {
                const isExpanded = expandedPoolId === pool.id;
                return (<Card key={pool.id} className={isExpanded ? "ring-1 ring-primary/30" : ""}>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleExpand(pool.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground"/> : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {pool.display_name}
                          <Badge variant={pool.is_active ? "default" : "secondary"} className="text-xs">
                            {pool.is_active ? t('quest.activeStatus') : t('quest.inactiveStatus')}
                          </Badge>
                          <Badge variant={strategyBadgeVariant(pool.assignment_strategy)} className="text-xs">
                            {strategyLabel(pool.assignment_strategy, t)}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <span className="font-mono text-xs">{pool.pool_key}</span>
                          <span className="mx-2">·</span>
                          <span>{pool.slots_per_day} {t('quest.daily.slotsPerDayUnit')}</span>
                          <span className="mx-2">·</span>
                          <span>{t('quest.daily.resetAt')} {pool.reset_hour_utc}:00 UTC</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={pool.is_active} onCheckedChange={() => handleToggleActive(pool)} aria-label="Toggle active"/>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pool)}>
                        <Pencil className="h-4 w-4"/>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Detail */}
                {isExpanded && (<CardContent className="pt-0 space-y-4">
                    <Separator />
                    {expandedLoading ? (<div className="flex items-center gap-2 py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/> {t('quest.daily.loadingPoolDetails')}
                      </div>) : expandedPool ? (<div className="flex items-start gap-0 -mx-6">
                        {/* ── Left: pool quests ── */}
                        <div className="flex-1 min-w-0 px-6 pb-4 overflow-auto">
                          <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                            {t('quest.daily.questsInPool')}
                            <Badge variant="outline" className="text-xs">{expandedQuests.length}</Badge>
                          </h4>
                          {pool.assignment_strategy === "weekly_schedule" ? (
                            /* 7-day drag-drop grid */
                            (() => {
                                const questsByDay: Record<number, DailyQuestPoolQuest[]> = {};
                                for (let d = 0; d < 7; d++)
                                    questsByDay[d] = [];
                                for (const q of expandedQuests) {
                                    if (q.sequence_order >= 0 && q.sequence_order <= 6)
                                        questsByDay[q.sequence_order].push(q);
                                }
                                return (<div className="grid grid-cols-7 gap-2">
                                  {([0, 1, 2, 3, 4, 5, 6] as const).map((dow) => {
                                        const dayQuests = questsByDay[dow] ?? [];
                                        const isDragOver = dragOverDay === dow;
                                        return (<div key={dow} className={`min-h-[120px] rounded-lg border-2 flex flex-col transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-dashed border-muted-foreground/25"}`} onDragOver={(e) => { e.preventDefault(); setDragOverDay(dow); }} onDragLeave={(e) => {
                                                if (!e.currentTarget.contains(e.relatedTarget as Node))
                                                    setDragOverDay(null);
                                            }} onDrop={async (e) => {
                                                e.preventDefault();
                                                setDragOverDay(null);
                                                if (!draggedQuestId || !expandedPoolId)
                                                    return;
                                                if (dayQuests.some((q) => q.quest_definition_id === draggedQuestId)) {
                                                    toast({ title: t('quest.daily.alreadyAssigned') });
                                                    return;
                                                }
                                                try {
                                                    await addQuestToPool(studioId, gameId, expandedPoolId, { quest_id: draggedQuestId, weight: 1, sequence_order: dow });
                                                    toast({ title: t('quest.daily.questAssigned') });
                                                    await refreshExpanded(expandedPoolId);
                                                }
                                                catch (err) {
                                                    toast({ variant: "destructive", title: t('common.error'), description: err instanceof ApiError ? err.message : t('common.error') });
                                                }
                                            }}>
                                        <div className={`px-2 py-1 text-xs font-semibold text-center border-b rounded-t-md ${isDragOver ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground bg-muted/30 border-muted"}`}>
                                          {DAY_NAMES[dow]}
                                        </div>
                                        <div className="flex flex-col gap-1 p-1 flex-1">
                                          {dayQuests.map((pq) => {
                                                const qDef = questDefsMap[pq.quest_definition_id];
                                                return (<div key={pq.id} className="flex items-center gap-1 text-xs bg-muted/50 rounded px-1.5 py-1 group">
                                                <span className="flex-1 truncate leading-tight">{qDef?.name ?? pq.quest_definition_id.slice(0, 8)}</span>
                                                <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors shrink-0" onClick={() => setRemoveQuestTarget({ poolId: pool.id, questId: pq.quest_definition_id, questName: qDef?.name ?? pq.quest_definition_id })} title="Remove">
                                                  <Trash2 className="h-3 w-3"/>
                                                </button>
                                              </div>);
                                            })}
                                          {dayQuests.length === 0 && !isDragOver && <span className="text-[10px] text-muted-foreground/40 text-center mt-auto pb-1">—</span>}
                                          {isDragOver && draggedQuestId && !dayQuests.some(q => q.quest_definition_id === draggedQuestId) && (<div className="text-[10px] text-primary text-center py-1 border border-primary/30 border-dashed rounded mt-auto">Drop here</div>)}
                                        </div>
                                      </div>);
                                    })}
                                </div>);
                            })()) : (
                            /* Non-weekly: existing quest cards + inline add form */
                            <>
                              {expandedQuests.length === 0 && !addQuestForm.quest_id && (<p className="text-sm text-muted-foreground py-2">{t('quest.daily.noQuestsYetSelectRight')}</p>)}
                              {expandedQuests.length > 0 && (() => {
                                    const totalWeight = expandedQuests.reduce((sum, q) => sum + (q.weight ?? 0), 0);
                                    return (<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mb-3">
                                    {expandedQuests.map((pq) => {
                                            const qDef = questDefsMap[pq.quest_definition_id];
                                            const pct = totalWeight > 0 ? ((pq.weight ?? 0) / totalWeight) * 100 : 0;
                                            return (<div key={pq.id} className="relative flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
                                          <div className="flex items-start justify-between gap-1 min-w-0">
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium leading-tight truncate">{qDef?.name ?? pq.quest_definition_id}</p>
                                              <p className="text-xs text-muted-foreground font-mono flex items-center gap-0.5 mt-0.5 truncate">
                                                {pq.quest_definition_id}
                                                <CopyButton text={pq.quest_definition_id} size="h-3 w-3"/>
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
                                              <Switch checked={qDef?.is_active ?? false} onCheckedChange={async (checked) => {
                                                    try {
                                                        await updateQuestDefinition(studioId, gameId, pq.quest_definition_id, { is_active: checked });
                                                        setQuestDefsMap((prev) => ({ ...prev, [pq.quest_definition_id]: { ...prev[pq.quest_definition_id], is_active: checked } }));
                                                        toast({ title: checked ? t('quest.daily.questActivated') : t('quest.daily.questDeactivated') });
                                                    }
                                                    catch (e) {
                                                        toast({ variant: "destructive", title: t('common.error'), description: e instanceof ApiError ? e.message : t('quest.failedUpdateQuest') });
                                                    }
                                                }} aria-label="Toggle quest active"/>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2.5" title="Edit quest definition" asChild>
                                                <Link href={(() => { const sp = new URLSearchParams(searchParams.toString()); sp.delete("tab"); sp.set("editQuestId", pq.quest_definition_id); return `/games/${gameId}/quests?${sp.toString()}`; })()}>
                                                  <Pencil className="h-3 w-3"/>
                                                </Link>
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive ml-2.5" onClick={() => setRemoveQuestTarget({ poolId: pool.id, questId: pq.quest_definition_id, questName: qDef?.name ?? pq.quest_definition_id })}>
                                                <Trash2 className="h-3.5 w-3.5"/>
                                              </Button>
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1"><Weight className="h-3 w-3"/>{t('quest.daily.weight')}: <span className="text-foreground font-medium">{pq.weight}</span></span>
                                              <span className="font-medium text-foreground">{pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }}/>
                                            </div>
                                          </div>
                                        </div>);
                                        })}
                                  </div>);
                                })()}

                            </>)}
                        </div>

                        {/* ── Right: searchable quest list ── */}
                        <div className="w-64 border-l shrink-0 flex flex-col self-stretch">
                          <div className="p-3 border-b shrink-0">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {pool.assignment_strategy === "weekly_schedule" ? t('quest.daily.dragOntoDay') : t('quest.daily.clickToSelect')}
                            </p>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                              <Input placeholder={t('quest.daily.searchPlaceholder')} value={addQuestSearch} onChange={(e) => setAddQuestSearch(e.target.value)} className="pl-8 h-8 text-sm"/>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-96">
                            {dailyQuestDefsLoading ? (<div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin"/> {t('common.loading')}
                              </div>) : (() => {
                                const isWeekly = pool.assignment_strategy === "weekly_schedule";
                                const inPoolIds = new Set(expandedQuests.map((q) => q.quest_definition_id));
                                const filtered = dailyQuestDefs.filter((q) => {
                                    const matchSearch = !addQuestSearch || q.name.toLowerCase().includes(addQuestSearch.toLowerCase());
                                    // In weekly_schedule, each day is its own sub-pool and quests can be reused across days,
                                    // so don't hide quests already added somewhere in the week.
                                    const notInPool = isWeekly || !inPoolIds.has(q.id);
                                    return matchSearch && notInPool;
                                });
                                if (filtered.length === 0) {
                                    return <p className="text-xs text-muted-foreground text-center py-6">{addQuestSearch ? t('quest.daily.noResults') : t('quest.daily.allQuestsAdded')}</p>;
                                }
                                return filtered.map((q) => {
                                    const isSelected = !isWeekly && addQuestForm.quest_id === q.id;
                                    return (<div key={q.id} draggable={isWeekly} onDragStart={() => {
                                            if (isWeekly)
                                                setDraggedQuestId(q.id);
                                        }} onDragEnd={() => { setDraggedQuestId(null); setDragOverDay(null); }} className={`rounded-md border transition-colors select-none ${isWeekly
                                            ? "border-transparent hover:bg-muted hover:border-border"
                                            : isSelected
                                                ? "bg-primary/10 border-primary/30"
                                                : "border-transparent hover:bg-muted"}`}>
                                    {/* Header row */}
                                    <div onClick={() => {
                                            if (!isWeekly) {
                                                if (isSelected) {
                                                    setAddQuestForm((prev) => ({ ...prev, quest_id: "" }));
                                                }
                                                else {
                                                    setAddQuestForm((prev) => ({ ...prev, quest_id: q.id, weight: pool.assignment_strategy === "weighted_random" ? 10 : 1, sequence_order: 0 }));
                                                }
                                            }
                                        }} className={`flex items-center gap-2 px-2.5 py-2 text-sm ${isWeekly ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}>
                                      {isWeekly && <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>}
                                      <div className="flex-1 min-w-0">
                                        <p className="truncate text-xs font-medium leading-snug">{q.name}</p>
                                        {q.quest_type && <p className="truncate text-[10px] text-muted-foreground">{q.quest_type}</p>}
                                      </div>
                                      {!isWeekly && (isSelected
                                            ? <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0"/>
                                            : <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 opacity-30"/>)}
                                    </div>
                                    {/* Expanded config + add */}
                                    {isSelected && (<div className="px-2.5 pb-2.5 pt-1 space-y-2 border-t border-primary/10">
                                        {pool.assignment_strategy === "weighted_random" && (<div className="flex items-center gap-2">
                                            <Label className="text-xs shrink-0">{t('quest.daily.weight')}</Label>
                                            <Input type="number" min={1} value={addQuestForm.weight} onChange={(e) => setAddQuestForm({ ...addQuestForm, weight: Number(e.target.value) })} className="w-20 h-7 text-xs"/>
                                            <span className="text-[10px] text-muted-foreground">{t('quest.daily.higherMoreFrequent')}</span>
                                          </div>)}
                                        {pool.assignment_strategy === "fixed_rotation" && (<div className="flex items-center gap-2">
                                            <Label className="text-xs shrink-0">{t('quest.daily.order')}</Label>
                                            <Input type="number" min={1} value={addQuestForm.sequence_order} onChange={(e) => setAddQuestForm({ ...addQuestForm, sequence_order: Number(e.target.value) })} className="w-20 h-7 text-xs"/>
                                          </div>)}
                                        {pool.assignment_strategy === "monthly_schedule" && (<div className="flex items-center gap-2">
                                            <Label className="text-xs shrink-0">{t('quest.daily.day')}</Label>
                                            <Input type="number" min={1} max={31} value={addQuestForm.sequence_order} onChange={(e) => setAddQuestForm({ ...addQuestForm, sequence_order: Number(e.target.value) })} className="w-20 h-7 text-xs"/>
                                          </div>)}
                                        <Button size="sm" className="w-full h-7 text-xs" onClick={handleAddQuest} disabled={addQuestSaving}>
                                          {addQuestSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>}
                                          {t('quest.daily.addToPool')}
                                        </Button>
                                      </div>)}
                                  </div>);
                                });
                            })()}
                          </div>
                        </div>
                      </div>) : null}
                  </CardContent>)}
              </Card>);
            })}
        </div>))}

      {/* ─── Create / Edit Pool Sheet ─────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editPool ? t('quest.daily.editPool') : t('quest.daily.createDailyQuestPool')}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Display Name */}
            <div className="space-y-1">
              <Label>{t('quest.daily.displayName')} <span className="text-destructive">*</span></Label>
              <Input value={poolForm.display_name} onChange={(e) => {
            const name = e.target.value;
            const patch: Partial<CreateDailyQuestPoolRequest> = { display_name: name };
            if (autoSlug && !editPool) {
                patch.pool_key = toSlugUnderscore(name);
            }
            setPoolForm({ ...poolForm, ...patch });
        }}/>
              <p className="text-xs text-muted-foreground">{t('quest.daily.displayNameHint')}</p>
            </div>

            {/* Pool Key */}
            <div className="space-y-1">
              <Label>{t('quest.daily.poolKey')} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input value={poolForm.pool_key} onChange={(e) => {
            setAutoSlug(false);
            setPoolForm({ ...poolForm, pool_key: e.target.value });
        }} disabled={!!editPool} className={`flex-1 ${editPool ? "opacity-50" : ""}`}/>
                {!editPool && (<Button type="button" variant={autoSlug ? "default" : "outline"} size="icon" className="h-10 w-10 shrink-0" onClick={() => {
                const newAuto = !autoSlug;
                setAutoSlug(newAuto);
                if (newAuto) {
                    const slug = toSlugUnderscore(poolForm.display_name);
                    setPoolForm({ ...poolForm, pool_key: slug });
                }
            }} title={autoSlug ? t('quest.daily.autoSlugEnabled') : t('quest.daily.autoSlugDisabled')}>
                    <Wand2 className="h-4 w-4"/>
                  </Button>)}
              </div>
              <p className="text-xs text-muted-foreground">
                {editPool
            ? t('quest.daily.poolKeyReadonly')
            : autoSlug
                ? t('quest.daily.poolKeyAutoGen')
                : t('quest.daily.poolKeyUnique')}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>{t('quest.description')}</Label>
              <Textarea value={poolForm.description ?? ""} onChange={(e) => setPoolForm({ ...poolForm, description: e.target.value })} rows={2}/>
              <p className="text-xs text-muted-foreground">{t('quest.daily.optionalPoolDescription')}</p>
            </div>

            {/* Assignment Strategy */}
            <div className="space-y-1">
              <Label>{t('quest.daily.assignmentStrategy')} <span className="text-destructive">*</span></Label>
              <Select value={poolForm.assignment_strategy} onValueChange={(v) => setPoolForm({ ...poolForm, assignment_strategy: v as AssignmentStrategy })} disabled={!!editPool}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value} disabled={s.comingSoon}>
                      <div className="flex items-center gap-2">
                        {s.icon}
                        <div className="flex items-center gap-2">
                          <p className="text-sm">{t(s.labelKey)}</p>
                          {s.comingSoon && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">{t('quest.daily.comingSoon')}</span>}
                        </div>
                      </div>
                    </SelectItem>))}
                </SelectContent>
              </Select>
              {selectedStrategyOption && (<p className="text-xs text-muted-foreground">{t(selectedStrategyOption.descKey)}</p>)}
              {!!editPool && (<p className="text-xs text-muted-foreground">{t('quest.daily.strategyReadonly')}</p>)}
            </div>

            {/* Slots Per Day */}
            <div className="space-y-1">
              <Label>{t('quest.daily.slotsPerDay')} <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} max={50} value={poolForm.slots_per_day} onChange={(e) => setPoolForm({ ...poolForm, slots_per_day: Number(e.target.value) })}/>
              <p className="text-xs text-muted-foreground">{t('quest.daily.slotsPerDayHint')}</p>
            </div>

            {/* Reset Hour */}
            <div className="space-y-1">
              <Label>{t('quest.daily.resetHourUtc')}</Label>
              <Select value={String(poolForm.reset_hour_utc)} onValueChange={(v) => setPoolForm({ ...poolForm, reset_hour_utc: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (<SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00 UTC</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('quest.active')}</Label>
                <p className="text-xs text-muted-foreground">{t('quest.daily.activeHint')}</p>
              </div>
              <Switch checked={poolForm.is_active} onCheckedChange={(c) => setPoolForm({ ...poolForm, is_active: c })}/>
            </div>
          </div>

          <SheetFooter className="flex-col items-stretch gap-2">
            {!poolSaving && (!poolForm.pool_key || !poolForm.display_name) && (<p className="text-xs text-destructive text-right">
                {!poolForm.pool_key && !poolForm.display_name
                ? t('quest.daily.poolKeyAndDisplayNameRequired')
                : !poolForm.pool_key
                    ? t('quest.daily.poolKeyRequired')
                    : t('quest.daily.displayNameRequired')}
              </p>)}
            {!editPool && !poolSaving && STRATEGY_OPTIONS.find(s => s.value === poolForm.assignment_strategy)?.comingSoon && (<p className="text-xs text-muted-foreground text-right">{t('quest.daily.strategyNotAvailable')}</p>)}
            <div className="flex justify-end gap-2">
              <SheetClose asChild>
                <Button variant="outline" disabled={poolSaving}>{t('common.cancel')}</Button>
              </SheetClose>
              <Button onClick={handleSavePool} disabled={poolSaving || !poolForm.pool_key || !poolForm.display_name || (!editPool && STRATEGY_OPTIONS.find(s => s.value === poolForm.assignment_strategy)?.comingSoon === true)}>
                {poolSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin"/>}
                {editPool ? t('quest.daily.saveChanges') : t('quest.daily.createPool')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Remove Quest Confirm ─────────────────────────────────────────── */}
      <AlertDialog open={!!removeQuestTarget} onOpenChange={(o) => {
            if (!o)
                setRemoveQuestTarget(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quest.daily.removeQuestTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeQuestTarget?.questName}</strong> {t('quest.daily.removeQuestDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeQuestDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveQuest} disabled={removeQuestDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removeQuestDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin"/>}
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>);
}
