"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus, RefreshCw, Trash2, Pencil, Loader2, Eye, EyeOff,
  ChevronsUpDown, Check, Calendar, Shuffle, RotateCw, Gift,
  ChevronDown, ChevronRight, Clock, Weight, Hash, Wand2, ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { listItemDefinitions } from "@/lib/inventory-api"
import type { ItemDefinition } from "@/types/inventory"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api-client"
import type { Game } from "@/types/game"
import {
  listDailyQuestPools,
  getDailyQuestPool,
  listPoolQuests,
  getCompletionBonus,
  createDailyQuestPool,
  updateDailyQuestPool,
  updateQuestDefinition,
  addQuestToPool,
  removeQuestFromPool,
  setCompletionBonus,
  listQuestDefinitions,
  type DailyQuestPool,
  type DailyQuestPoolQuest,
  type CompletionBonus,
  type CreateDailyQuestPoolRequest,
  type UpdateDailyQuestPoolRequest,
  type AddQuestToPoolRequest,
  type AssignmentStrategy,
  type QuestReward,
  type QuestDefinition,
} from "@/lib/quest-api"

// ─── Strategy Grid Illustration ─────────────────────────────────────────────

const QUEST_COLORS = [
  { bg: "bg-blue-500/80", text: "text-blue-600", light: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-400" },
  { bg: "bg-emerald-500/80", text: "text-emerald-600", light: "bg-emerald-100 dark:bg-emerald-900/40", border: "border-emerald-400" },
  { bg: "bg-violet-500/80", text: "text-violet-600", light: "bg-violet-100 dark:bg-violet-900/40", border: "border-violet-400" },
  { bg: "bg-amber-500/80", text: "text-amber-600", light: "bg-amber-100 dark:bg-amber-900/40", border: "border-amber-400" },
  { bg: "bg-rose-500/80", text: "text-rose-600", light: "bg-rose-100 dark:bg-rose-900/40", border: "border-rose-400" },
]

const DEMO_QUESTS = [
  { name: "Q-A", weight: 5 },
  { name: "Q-B", weight: 3 },
  { name: "Q-C", weight: 2 },
  { name: "Q-D", weight: 1 },
  { name: "Q-E", weight: 1 },
]

// Seeded pseudo-random 30-day weighted random picks (2 slots/day, no duplicate same slot)
function seededWeightedRandom(weights: number[], seed: number): number {
  let h = seed * 2654435761
  h = (h ^ (h >>> 16)) >>> 0
  const total = weights.reduce((a, b) => a + b, 0)
  const r = (h % 1000) / 1000 * total
  let cum = 0
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i]
    if (r < cum) return i
  }
  return weights.length - 1
}

function buildWeightedRandomDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
  return Array.from({ length: days }, (_, d) => {
    const picks: number[] = []
    const weights = [...quests.map((q) => q.weight)]
    for (let s = 0; s < slots; s++) {
      const idx = seededWeightedRandom(weights, d * 100 + s + 7)
      picks.push(idx)
      weights[idx] = 0  // no duplicate in same day
    }
    return picks
  })
}

function buildFixedRotationDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
  return Array.from({ length: days }, (_, d) => {
    return Array.from({ length: slots }, (_, s) => (d * slots + s) % quests.length)
  })
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function buildWeeklyScheduleDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
  // Assign quests per day-of-week (wrap around if >7 quests)
  // Assume month starts on Monday (dow=1)
  const startDow = 1
  return Array.from({ length: days }, (_, d) => {
    const dow = (startDow + d) % 7
    return Array.from({ length: slots }, (_, s) => (dow * slots + s) % quests.length)
  })
}

function buildMonthlyScheduleDays(quests: typeof DEMO_QUESTS, slots: number, days: number) {
  return Array.from({ length: days }, (_, d) => {
    return Array.from({ length: slots }, (_, s) => ((d * slots + s)) % quests.length)
  })
}

function DayCell({ picks, quests, day }: { picks: number[]; quests: typeof DEMO_QUESTS; day: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-0.5">
      <span className="text-[9px] text-muted-foreground font-medium leading-none mb-0.5">{day}</span>
      <div className="flex gap-0.5">
        {picks.map((qi, si) => (
          <div
            key={si}
            className={`w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[qi % QUEST_COLORS.length].bg}`}
            title={quests[qi]?.name}
          >
            {quests[qi]?.name.replace("Q-", "")}
          </div>
        ))}
      </div>
    </div>
  )
}

function StrategyGridCard({
  title,
  description,
  icon,
  days,
  quests,
  extra,
}: {
  title: string
  description: string
  icon: React.ReactNode
  days: number[][]
  quests: typeof DEMO_QUESTS
  extra?: React.ReactNode
}) {
  return (
    <Card>
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
          {quests.map((q, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border ${QUEST_COLORS[i % QUEST_COLORS.length].light} ${QUEST_COLORS[i % QUEST_COLORS.length].border}`}>
              <div className={`w-3 h-3 rounded-sm ${QUEST_COLORS[i % QUEST_COLORS.length].bg}`} />
              <span className={`font-medium ${QUEST_COLORS[i % QUEST_COLORS.length].text}`}>{q.name}</span>
              {q.weight !== undefined && <span className="text-muted-foreground">w={q.weight}</span>}
            </div>
          ))}
        </div>

        {extra}

        {/* 30-day grid */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">30-day simulation (2 slots/day)</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-[9px] text-muted-foreground text-center font-medium py-0.5">{d}</div>
            ))}
            {/* empty cells for month starting on Monday */}
            <div />{/* Sun placeholder for week 1 */}
            {days.map((picks, d) => (
              <DayCell key={d} picks={picks} quests={quests} day={d + 1} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DailyStrategyGrid() {
  const slots = 2
  const totalDays = 30
  const quests = DEMO_QUESTS

  const weightedDays = buildWeightedRandomDays(quests, slots, totalDays)
  const rotationDays = buildFixedRotationDays(quests, slots, totalDays)
  const weeklyDays = buildWeeklyScheduleDays(quests, slots, totalDays)
  const monthlyDays = buildMonthlyScheduleDays(quests, slots, totalDays)

  const totalWeight = quests.reduce((a, q) => a + q.weight, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Strategy Mechanics — Visual Guide</h3>
        <p className="text-xs text-muted-foreground">
          Illustration of how each assignment strategy fills player quest slots over a 30-day month.
          Demo: 5 quests · <strong>2 slots/day</strong> · month starts on Monday.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Weighted Random ────────────────────────────────────── */}
        <StrategyGridCard
          title="Weighted Random"
          icon={<Shuffle className="h-4 w-4 text-primary" />}
          description="Each day, quests are picked randomly. Higher-weight quests appear more often. No duplicate in the same day's slots."
          days={weightedDays}
          quests={quests}
          extra={
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Probability per pick</p>
              <div className="space-y-1">
                {quests.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm shrink-0 ${QUEST_COLORS[i].bg}`} />
                    <span className="text-xs w-8">{q.name}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${QUEST_COLORS[i].bg}`}
                        style={{ width: `${(q.weight / totalWeight) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-24 text-right">
                      {q.weight}/{totalWeight} = {Math.round((q.weight / totalWeight) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Each day rolls independently — a quest can appear on consecutive days.
              </p>
            </div>
          }
        />

        {/* ── Fixed Rotation ────────────────────────────────────── */}
        <StrategyGridCard
          title="Fixed Rotation"
          icon={<RotateCw className="h-4 w-4 text-secondary-foreground" />}
          description="Quests advance in fixed order by sequence_order. After the last quest, the cycle repeats from the beginning."
          days={rotationDays}
          quests={quests}
          extra={
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Sequence order (repeating cycle)</p>
              <div className="flex items-center gap-1 flex-wrap">
                {[...quests, ...quests.slice(0, 3)].map((q, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[(i) % QUEST_COLORS.length].bg}`}>
                      {q.name.replace("Q-", "")}
                    </div>
                    {i < quests.length + 2 && <span className="text-muted-foreground text-xs">→</span>}
                  </div>
                ))}
                <span className="text-xs text-muted-foreground">(repeats)</span>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Every player always sees the same quests on the same days — predictable and fair.
              </p>
            </div>
          }
        />

        {/* ── Weekly Schedule ───────────────────────────────────── */}
        <StrategyGridCard
          title="Weekly Schedule"
          icon={<Calendar className="h-4 w-4 text-blue-400" />}
          description="Quest assigned per day-of-week. Monday always gets the same quest, Tuesday another, etc. Repeats every 7 days."
          days={weeklyDays}
          quests={quests}
          extra={
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Day-of-week → Quest mapping</p>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((day, dow) => {
                  const dow1 = (dow + 1) % 7 // start from Mon
                  const qi = (dow1 * slots) % quests.length
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{day}</span>
                      <div className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[qi % QUEST_COLORS.length].bg}`}>
                        {quests[qi % quests.length].name.replace("Q-", "")}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Great for themed days (e.g., combat Monday, crafting Tuesday).
              </p>
            </div>
          }
        />

        {/* ── Monthly Schedule ──────────────────────────────────── */}
        <StrategyGridCard
          title="Monthly Schedule"
          icon={<Calendar className="h-4 w-4 text-amber-400" />}
          description="Quest assigned per day-of-month (1–31). Day 1 always gets quest #1, Day 2 gets quest #2, etc. Wraps around if fewer quests than days."
          days={monthlyDays}
          quests={quests}
          extra={
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Day-of-month sample (first 10 days)</p>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, d) => {
                  const qi = (d * slots) % quests.length
                  return (
                    <div key={d} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-muted-foreground">D{d + 1}</span>
                      <div className={`w-7 h-7 rounded text-[9px] font-bold flex items-center justify-center text-white ${QUEST_COLORS[qi % QUEST_COLORS.length].bg}`}>
                        {quests[qi % quests.length].name.replace("Q-", "")}
                      </div>
                    </div>
                  )
                })}
                <div className="flex flex-col items-center justify-end">
                  <span className="text-xs text-muted-foreground">…</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                If a month has fewer days than the schedule, the extra day mappings are skipped.
              </p>
            </div>
          }
        />
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
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{s} slot{s > 1 ? "s" : ""}</span>
                <div className="flex gap-1">
                  {Array.from({ length: s }, (_, i) => (
                    <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold ${QUEST_COLORS[i].bg}`}>
                      {DEMO_QUESTS[i].name.replace("Q-", "")}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STRATEGY_OPTIONS: { value: AssignmentStrategy; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "weighted_random", label: "Weighted Random", icon: <Shuffle className="h-4 w-4" />, description: "Random pick each day weighted by weight" },
  { value: "fixed_rotation", label: "Fixed Rotation", icon: <RotateCw className="h-4 w-4" />, description: "Round-robin by sequence order, advances each day" },
  { value: "weekly_schedule", label: "Weekly Schedule", icon: <Calendar className="h-4 w-4" />, description: "Fixed quest per day-of-week" },
  { value: "monthly_schedule", label: "Monthly Schedule", icon: <Calendar className="h-4 w-4" />, description: "Fixed quest per day-of-month" },
]

const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
}

function strategyBadgeVariant(strategy: AssignmentStrategy) {
  switch (strategy) {
    case "weighted_random": return "default" as const
    case "fixed_rotation": return "secondary" as const
    case "weekly_schedule": return "outline" as const
    case "monthly_schedule": return "outline" as const
    default: return "outline" as const
  }
}

function strategyLabel(strategy: AssignmentStrategy) {
  return STRATEGY_OPTIONS.find((s) => s.value === strategy)?.label ?? strategy
}

// ─── Reward Editor (inline, reused from DefinitionsTab pattern) ───────────────

interface RewardEditorProps {
  rewards: QuestReward[]
  onChange: (rewards: QuestReward[]) => void
  gameId: string
}

function BonusRewardEditor({ rewards, onChange, gameId }: RewardEditorProps) {
  const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([])
  const [itemDefsLoading, setItemDefsLoading] = useState(false)
  const [rewardItemPopover, setRewardItemPopover] = useState<number | null>(null)

  useEffect(() => {
    if (!gameId) return
    setItemDefsLoading(true)
    listItemDefinitions({ gameId }, { limit: 200 })
      .then((res) => setItemDefs(res.items ?? []))
      .catch(() => setItemDefs([]))
      .finally(() => setItemDefsLoading(false))
  }, [gameId])

  const addReward = () => onChange([...rewards, { reward_type: "item", item_definition_id: "", quantity_min: 1, quantity_max: 1 }])
  const removeReward = (i: number) => onChange(rewards.filter((_, idx) => idx !== i))
  const updateReward = (i: number, patch: Partial<QuestReward>) =>
    onChange(rewards.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Rewards</Label>
        <Button type="button" size="sm" variant="outline" onClick={addReward}>
          <Plus className="h-3 w-3 mr-1" /> Add Reward
        </Button>
      </div>
      {rewards.length === 0 && (
        <p className="text-sm text-muted-foreground">No rewards configured.</p>
      )}
      {rewards.map((r, i) => (
        <div key={i} className="flex gap-2 items-start border rounded p-2">
          <div className="flex-1 space-y-2">
            <Select
              value={r.reward_type}
              onValueChange={(v) => {
                if (v === "coin") {
                  updateReward(i, { reward_type: v, item_definition_id: undefined, quantity_min: undefined, quantity_max: undefined, amount: 100 })
                } else {
                  updateReward(i, { reward_type: v, amount: undefined, item_definition_id: "", quantity_min: 1, quantity_max: 1 })
                }
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coin">Coin</SelectItem>
                <SelectItem value="item">Item</SelectItem>
              </SelectContent>
            </Select>
            {r.reward_type === "coin" ? (
              <div className="space-y-1">
                <Input
                  type="number"
                  min={1}
                  value={r.amount ?? ""}
                  onChange={(e) => updateReward(i, { amount: Number(e.target.value) })}
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">Number of coins to credit</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Popover open={rewardItemPopover === i} onOpenChange={(o) => setRewardItemPopover(o ? i : null)}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" className="h-8 w-full justify-between text-sm font-normal">
                      <span className="truncate">
                        {r.item_definition_id
                          ? (itemDefs.find((d) => d.id === r.item_definition_id)?.name ?? r.item_definition_id)
                          : (itemDefsLoading ? "Loading…" : "Select item")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search item…" className="h-8" />
                      <CommandList>
                        <CommandEmpty>{itemDefsLoading ? "Loading…" : "No items found."}</CommandEmpty>
                        <CommandGroup>
                          {itemDefs.map((def) => (
                            <CommandItem
                              key={def.id}
                              value={`${def.name} ${def.item_code} ${def.id}`}
                              onSelect={() => {
                                updateReward(i, { item_definition_id: def.id })
                                setRewardItemPopover(null)
                              }}
                            >
                              <Check className={`mr-2 h-3 w-3 ${r.item_definition_id === def.id ? "opacity-100" : "opacity-0"}`} />
                              <div>
                                <p className="text-sm">{def.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-mono">{def.item_code}</span>
                                  <span className="ml-1 opacity-50">{def.category} · {def.rarity}</span>
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Min Qty</Label>
                    <Input type="number" min={1} value={r.quantity_min ?? ""} onChange={(e) => updateReward(i, { quantity_min: Number(e.target.value) })} className="h-8" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Qty</Label>
                    <Input type="number" min={1} value={r.quantity_max ?? ""} onChange={(e) => updateReward(i, { quantity_max: Number(e.target.value) })} className="h-8" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeReward(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ─── Daily Tab (exported) ────────────────────────────────────────────────────

export function DailyTab({ game }: { game: Game | null }) {
  const gameId = game?.id ?? ""
  const studioId = game?.studio_id ?? ""
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const subTab = (searchParams.get("subTab") ?? "list") as "list" | "grid"
  const setSubTab = (v: "list" | "grid") => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("subTab", v)
    router.replace(`?${sp.toString()}`)
  }

  // ── State ─────────────────────────────────────────────────────────────────

  const [pools, setPools] = useState<DailyQuestPool[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Expanded pool detail
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null)
  const [expandedPool, setExpandedPool] = useState<DailyQuestPool | null>(null)
  const [expandedQuests, setExpandedQuests] = useState<DailyQuestPoolQuest[]>([])
  const [expandedBonus, setExpandedBonus] = useState<CompletionBonus | null>(null)
  const [expandedLoading, setExpandedLoading] = useState(false)

  // Quest definitions lookup (for displaying quest names in pool)
  const [questDefsMap, setQuestDefsMap] = useState<Record<string, QuestDefinition>>({})

  // Item definitions lookup (for displaying item names in bonus rewards)
  const [itemDefsMap, setItemDefsMap] = useState<Record<string, ItemDefinition>>({})

  // Pool create / edit
  const [createOpen, setCreateOpen] = useState(false)
  const [editPool, setEditPool] = useState<DailyQuestPool | null>(null)
  const [poolForm, setPoolForm] = useState<CreateDailyQuestPoolRequest>({
    pool_key: "",
    display_name: "",
    description: "",
    assignment_strategy: "weighted_random",
    slots_per_day: 3,
    reset_hour_utc: 0,
    is_active: false,
  })
  const [poolSaving, setPoolSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)

  // Add quest to pool
  const [addQuestPoolId, setAddQuestPoolId] = useState<string | null>(null)
  const [dailyQuestDefs, setDailyQuestDefs] = useState<QuestDefinition[]>([])
  const [dailyQuestDefsLoading, setDailyQuestDefsLoading] = useState(false)
  const [addQuestForm, setAddQuestForm] = useState<AddQuestToPoolRequest>({
    quest_id: "",
    weight: 10,
    sequence_order: 0,
  })
  const [addQuestSaving, setAddQuestSaving] = useState(false)
  const [questPickerOpen, setQuestPickerOpen] = useState(false)

  // Remove quest from pool
  const [removeQuestTarget, setRemoveQuestTarget] = useState<{ poolId: string; questId: string; questName: string } | null>(null)
  const [removeQuestDeleting, setRemoveQuestDeleting] = useState(false)

  // Completion bonus
  const [bonusPoolId, setBonusPoolId] = useState<string | null>(null)
  const [bonusRewards, setBonusRewards] = useState<QuestReward[]>([])
  const [bonusSaving, setBonusSaving] = useState(false)

  const hasFetched = useRef(false)

  // ── Load quest definitions for name lookup ────────────────────────────────

  const loadQuestDefsMap = useCallback(async () => {
    if (!game) return
    try {
      const data = await listQuestDefinitions(studioId, gameId, { limit: 500 })
      const defs = Array.isArray(data) ? data : (data as any).quests ?? []
      const map: Record<string, QuestDefinition> = {}
      for (const d of defs) map[d.id] = d
      setQuestDefsMap(map)
    } catch {
      // non-critical – names just won't resolve
    }
  }, [game, studioId, gameId])

  // ── Load item definitions for name lookup ─────────────────────────────

  const loadItemDefsMap = useCallback(async () => {
    if (!game) return
    try {
      const data = await listItemDefinitions({ gameId }, { limit: 500 })
      const items = Array.isArray(data) ? data : (data as any).items ?? []
      const map: Record<string, ItemDefinition> = {}
      for (const d of items) map[d.id] = d
      setItemDefsMap(map)
    } catch {
      // non-critical – names just won't resolve
    }
  }, [game, gameId])

  // ── Load pools ────────────────────────────────────────────────────────────

  const loadPools = useCallback(async () => {
    if (!game) return
    try {
      const data = await listDailyQuestPools(studioId, gameId)
      setPools(data.pools ?? [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load daily quest pools"
      setError(msg)
    }
  }, [game, studioId, gameId])

  useEffect(() => {
    if (!game || hasFetched.current) return
    hasFetched.current = true
    setLoading(true)
    Promise.all([loadPools(), loadQuestDefsMap(), loadItemDefsMap()]).finally(() => setLoading(false))
  }, [game, loadPools, loadQuestDefsMap, loadItemDefsMap])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    await Promise.all([loadPools(), loadQuestDefsMap(), loadItemDefsMap()])
    setRefreshing(false)
  }

  // ── Load pool detail (expand) ─────────────────────────────────────────────

  const toggleExpand = async (poolId: string) => {
    if (expandedPoolId === poolId) {
      setExpandedPoolId(null)
      setExpandedPool(null)
      setExpandedQuests([])
      return
    }
    setExpandedPoolId(poolId)
    setExpandedPool(null)
    setExpandedQuests([])
    setExpandedBonus(null)
    setExpandedLoading(true)
    try {
      const [detail, questsData, bonusData] = await Promise.all([
        getDailyQuestPool(studioId, gameId, poolId),
        listPoolQuests(studioId, gameId, poolId),
        getCompletionBonus(studioId, gameId, poolId).catch(() => null),
      ])
      setExpandedPool(detail)
      setExpandedQuests(questsData.quests ?? [])
      setExpandedBonus(bonusData)
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load pool details" })
      setExpandedPoolId(null)
    } finally {
      setExpandedLoading(false)
    }
  }

  const refreshExpanded = async (poolId: string) => {
    try {
      const [detail, questsData, bonusData] = await Promise.all([
        getDailyQuestPool(studioId, gameId, poolId),
        listPoolQuests(studioId, gameId, poolId),
        getCompletionBonus(studioId, gameId, poolId).catch(() => null),
      ])
      setExpandedPool(detail)
      setExpandedQuests(questsData.quests ?? [])
      setExpandedBonus(bonusData)
    } catch {
      // silent
    }
  }

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
    })
    setAutoSlug(true)
    setEditPool(null)
    setCreateOpen(true)
  }

  const openEdit = (pool: DailyQuestPool) => {
    setPoolForm({
      pool_key: pool.pool_key,
      display_name: pool.display_name,
      description: pool.description ?? "",
      assignment_strategy: pool.assignment_strategy,
      slots_per_day: pool.slots_per_day,
      reset_hour_utc: pool.reset_hour_utc,
      is_active: pool.is_active,
    })
    setAutoSlug(false)
    setEditPool(pool)
    setCreateOpen(true)
  }

  const handleSavePool = async () => {
    if (!game) return
    setPoolSaving(true)
    try {
      if (editPool) {
        await updateDailyQuestPool(studioId, gameId, editPool.id, {
          display_name: poolForm.display_name,
          description: poolForm.description,
          slots_per_day: poolForm.slots_per_day,
          reset_hour_utc: poolForm.reset_hour_utc,
          is_active: poolForm.is_active,
        })
        toast({ title: "Pool updated" })
      } else {
        await createDailyQuestPool(studioId, gameId, poolForm)
        toast({ title: "Pool created" })
      }
      setCreateOpen(false)
      await loadPools()
      if (expandedPoolId) await refreshExpanded(expandedPoolId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to save pool"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setPoolSaving(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (pool: DailyQuestPool) => {
    try {
      await updateDailyQuestPool(studioId, gameId, pool.id, { is_active: !pool.is_active })
      toast({ title: pool.is_active ? "Pool deactivated" : "Pool activated" })
      await loadPools()
      if (expandedPoolId === pool.id) await refreshExpanded(pool.id)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to toggle pool"
      toast({ variant: "destructive", title: "Error", description: msg })
    }
  }

  // ── Add quest to pool ─────────────────────────────────────────────────────

  const openAddQuest = (poolId: string, strategy: AssignmentStrategy) => {
    setAddQuestPoolId(poolId)
    setAddQuestForm({
      quest_id: "",
      weight: strategy === "weighted_random" ? 10 : 1,
      sequence_order: 0,
    })
    // Load daily quest definitions
    if (!dailyQuestDefsLoading && dailyQuestDefs.length === 0) {
      setDailyQuestDefsLoading(true)
      listQuestDefinitions(studioId, gameId, { limit: 200 })
        .then((res) => {
          const dailyOnly = (res.quests ?? []).filter((q) => q.quest_type === "daily")
          setDailyQuestDefs(dailyOnly)
        })
        .catch(() => setDailyQuestDefs([]))
        .finally(() => setDailyQuestDefsLoading(false))
    }
  }

  const handleAddQuest = async () => {
    if (!addQuestPoolId || !addQuestForm.quest_id) return
    setAddQuestSaving(true)
    try {
      await addQuestToPool(studioId, gameId, addQuestPoolId, addQuestForm)
      toast({ title: "Quest added to pool" })
      setAddQuestPoolId(null)
      if (expandedPoolId) await refreshExpanded(expandedPoolId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to add quest to pool"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setAddQuestSaving(false)
    }
  }

  // ── Remove quest from pool ────────────────────────────────────────────────

  const handleRemoveQuest = async () => {
    if (!removeQuestTarget) return
    setRemoveQuestDeleting(true)
    try {
      await removeQuestFromPool(studioId, gameId, removeQuestTarget.poolId, removeQuestTarget.questId)
      toast({ title: "Quest removed from pool" })
      setRemoveQuestTarget(null)
      if (expandedPoolId) await refreshExpanded(expandedPoolId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to remove quest"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setRemoveQuestDeleting(false)
    }
  }

  // ── Completion bonus ──────────────────────────────────────────────────────

  const openBonusEditor = (pool: DailyQuestPool) => {
    setBonusPoolId(pool.id)
    setBonusRewards(expandedBonus?.rewards ? [...expandedBonus.rewards] : [])
  }

  const handleSaveBonus = async () => {
    if (!bonusPoolId) return
    setBonusSaving(true)
    try {
      await setCompletionBonus(studioId, gameId, bonusPoolId, { rewards: bonusRewards })
      toast({ title: "Completion bonus updated" })
      setBonusPoolId(null)
      if (expandedPoolId) await refreshExpanded(expandedPoolId)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to save bonus"
      toast({ variant: "destructive", title: "Error", description: msg })
    } finally {
      setBonusSaving(false)
    }
  }

  // ── Helper: sequence label ────────────────────────────────────────────────

  const getSequenceLabel = (strategy: AssignmentStrategy, seq: number) => {
    if (strategy === "weekly_schedule") return DAY_OF_WEEK_LABELS[seq] ?? `Day ${seq}`
    if (strategy === "monthly_schedule") return `Day ${seq}`
    if (strategy === "fixed_rotation") return `#${seq}`
    return ""
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage daily quest pools. Each pool assigns quests to players daily based on its strategy.
          </p>
        </div>
        <div className="flex gap-2">
          {subTab === "list" && (
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Create Pool
              </Button>
            </>
          )}
        </div>
      </div>

      {/* SubTab Navigation */}
      <div className="flex items-center gap-1 mb-4 border-b">
        <button
          onClick={() => setSubTab("list")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            subTab === "list"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setSubTab("grid")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            subTab === "grid"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Strategy Guide
        </button>
      </div>

      {/* Strategy Guide (Grid) */}
      {subTab === "grid" && <DailyStrategyGrid />}

      {/* Pool List */}
      {subTab === "list" && (pools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Calendar className="h-10 w-10 opacity-30" />
            <p className="text-sm">No daily quest pools yet.</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create your first pool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pools.map((pool) => {
            const isExpanded = expandedPoolId === pool.id
            return (
              <Card key={pool.id} className={isExpanded ? "ring-1 ring-primary/30" : ""}>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleExpand(pool.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {pool.display_name}
                          <Badge variant={pool.is_active ? "default" : "secondary"} className="text-xs">
                            {pool.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant={strategyBadgeVariant(pool.assignment_strategy)} className="text-xs">
                            {strategyLabel(pool.assignment_strategy)}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <span className="font-mono text-xs">{pool.pool_key}</span>
                          <span className="mx-2">·</span>
                          <span>{pool.slots_per_day} slot{pool.slots_per_day > 1 ? "s" : ""}/day</span>
                          <span className="mx-2">·</span>
                          <span>Reset {pool.reset_hour_utc}:00 UTC</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={pool.is_active}
                        onCheckedChange={() => handleToggleActive(pool)}
                        aria-label="Toggle active"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pool)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Detail */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <Separator />
                    {expandedLoading ? (
                      <div className="flex items-center gap-2 py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading pool details…
                      </div>
                    ) : expandedPool ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Quests in pool */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              Quests in Pool
                              <Badge variant="outline" className="text-xs">{expandedQuests.length}</Badge>
                            </h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAddQuest(pool.id, pool.assignment_strategy)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Quest
                            </Button>
                          </div>

                          {expandedQuests.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No quests in this pool yet.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Quest</TableHead>
                                  <TableHead className="w-24">Weight</TableHead>
                                  <TableHead className="w-24">Status</TableHead>
                                  <TableHead className="w-16" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {expandedQuests.map((pq) => {
                                  const qDef = questDefsMap[pq.quest_definition_id]
                                  return (
                                    <TableRow key={pq.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          <div>
                                            <p className="text-sm font-medium">{qDef?.name ?? pq.quest_definition_id}</p>
                                            {qDef?.description && (
                                              <p className="text-xs text-muted-foreground truncate max-w-md">{qDef.description}</p>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0"
                                            title="Edit quest definition"
                                            onClick={() => {
                                              const sp = new URLSearchParams(searchParams.toString())
                                              sp.delete("tab")
                                              sp.set("editQuestId", pq.quest_definition_id)
                                              router.push(`/games/${gameId}/quests?${sp.toString()}`)
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1 text-sm">
                                          <Weight className="h-3 w-3 text-muted-foreground" />
                                          {pq.weight}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Switch
                                          checked={qDef?.is_active ?? false}
                                          onCheckedChange={async (checked) => {
                                            try {
                                              await updateQuestDefinition(studioId, gameId, pq.quest_definition_id, { is_active: checked })
                                              setQuestDefsMap((prev) => ({
                                                ...prev,
                                                [pq.quest_definition_id]: { ...prev[pq.quest_definition_id], is_active: checked },
                                              }))
                                              toast({ title: checked ? "Quest activated" : "Quest deactivated" })
                                            } catch (e) {
                                              toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to update quest" })
                                            }
                                          }}
                                          aria-label="Toggle quest active"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive"
                                          onClick={() => setRemoveQuestTarget({
                                            poolId: pool.id,
                                            questId: pq.quest_definition_id,
                                            questName: qDef?.name ?? pq.quest_definition_id,
                                          })}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </div>

                        {/* Completion Bonus */}
                        <div className="min-w-0 lg:border-l lg:pl-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Gift className="h-4 w-4" /> Completion Bonus
                              {expandedBonus?.rewards && expandedBonus.rewards.length > 0 && (
                                <Badge variant="outline" className="text-xs">{expandedBonus.rewards.length}</Badge>
                              )}
                            </h4>
                            <Button size="sm" variant="outline" onClick={() => openBonusEditor(expandedPool)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit Bonus
                            </Button>
                          </div>
                          {expandedBonus?.rewards && expandedBonus.rewards.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Reward</TableHead>
                                  <TableHead className="w-28">Amount</TableHead>
                                  <TableHead className="w-10" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {expandedBonus.rewards.map((r, i) => {
                                  if (r.reward_type === "coin") {
                                    return (
                                      <TableRow key={i}>
                                        <TableCell>
                                          <span className="text-sm font-medium">Coins</span>
                                        </TableCell>
                                        <TableCell>
                                          <span className="text-sm">{r.amount}</span>
                                        </TableCell>
                                        <TableCell />
                                      </TableRow>
                                    )
                                  }
                                  const itemDef = r.item_definition_id ? itemDefsMap[r.item_definition_id] : null
                                  return (
                                    <TableRow key={i}>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-medium">
                                            {itemDef?.name ?? r.item_definition_id?.slice(0, 8) + "…"}
                                          </span>
                                          {r.item_definition_id && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 shrink-0"
                                              title="View item definition"
                                              onClick={() => router.push(`/games/${gameId}/items/${r.item_definition_id}`)}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm">{r.quantity_min}–{r.quantity_max}</span>
                                      </TableCell>
                                      <TableCell />
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground">No completion bonus set.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ))}

      {/* ─── Create / Edit Pool Sheet ─────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editPool ? "Edit Pool" : "Create Daily Quest Pool"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Display Name */}
            <div className="space-y-1">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input
                value={poolForm.display_name}
                onChange={(e) => {
                  const name = e.target.value
                  const patch: Partial<CreateDailyQuestPoolRequest> = { display_name: name }
                  if (autoSlug && !editPool) {
                    patch.pool_key = name
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9\s_-]/g, "")
                      .replace(/[\s-]+/g, "_")
                      .replace(/_+/g, "_")
                      .replace(/^_|_$/g, "")
                  }
                  setPoolForm({ ...poolForm, ...patch })
                }}
              />
              <p className="text-xs text-muted-foreground">Human-readable name shown in the UI.</p>
            </div>

            {/* Pool Key */}
            <div className="space-y-1">
              <Label>Pool Key <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  value={poolForm.pool_key}
                  onChange={(e) => {
                    setAutoSlug(false)
                    setPoolForm({ ...poolForm, pool_key: e.target.value })
                  }}
                  disabled={!!editPool}
                  className={`flex-1 ${editPool ? "opacity-50" : ""}`}
                />
                {!editPool && (
                  <Button
                    type="button"
                    variant={autoSlug ? "default" : "outline"}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => {
                      const newAuto = !autoSlug
                      setAutoSlug(newAuto)
                      if (newAuto) {
                        const slug = poolForm.display_name
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9\s_-]/g, "")
                          .replace(/[\s-]+/g, "_")
                          .replace(/_+/g, "_")
                          .replace(/^_|_$/g, "")
                        setPoolForm({ ...poolForm, pool_key: slug })
                      }
                    }}
                    title={autoSlug ? "Auto-slug enabled — click to disable" : "Auto-slug disabled — click to enable"}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {editPool
                  ? "Pool key cannot be changed after creation."
                  : autoSlug
                    ? "Auto-generated from display name. Edit manually to override."
                    : "Unique key, cannot be changed after creation."}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={poolForm.description ?? ""}
                onChange={(e) => setPoolForm({ ...poolForm, description: e.target.value })}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Optional description for this pool.</p>
            </div>

            {/* Assignment Strategy */}
            <div className="space-y-1">
              <Label>Assignment Strategy <span className="text-destructive">*</span></Label>
              <Select
                value={poolForm.assignment_strategy}
                onValueChange={(v) => setPoolForm({ ...poolForm, assignment_strategy: v as AssignmentStrategy })}
                disabled={!!editPool}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex items-center gap-2">
                        {s.icon}
                        <div>
                          <p className="text-sm">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!!editPool && (
                <p className="text-xs text-muted-foreground">Strategy cannot be changed after creation.</p>
              )}
            </div>

            {/* Slots Per Day */}
            <div className="space-y-1">
              <Label>Slots Per Day <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={poolForm.slots_per_day}
                onChange={(e) => setPoolForm({ ...poolForm, slots_per_day: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">How many quests a player sees each day.</p>
            </div>

            {/* Reset Hour */}
            <div className="space-y-1">
              <Label>Reset Hour (UTC)</Label>
              <Select
                value={String(poolForm.reset_hour_utc)}
                onValueChange={(v) => setPoolForm({ ...poolForm, reset_hour_utc: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00 UTC</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Pool is visible to players when active.</p>
              </div>
              <Switch
                checked={poolForm.is_active}
                onCheckedChange={(c) => setPoolForm({ ...poolForm, is_active: c })}
              />
            </div>
          </div>

          <SheetFooter className="flex-col items-stretch gap-2">
            {!poolSaving && (!poolForm.pool_key || !poolForm.display_name) && (
              <p className="text-xs text-destructive text-right">
                {!poolForm.pool_key && !poolForm.display_name
                  ? "Pool Key and Display Name are required."
                  : !poolForm.pool_key
                    ? "Pool Key is required."
                    : "Display Name is required."}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <SheetClose asChild>
                <Button variant="outline" disabled={poolSaving}>Cancel</Button>
              </SheetClose>
              <Button onClick={handleSavePool} disabled={poolSaving || !poolForm.pool_key || !poolForm.display_name}>
                {poolSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editPool ? "Save Changes" : "Create Pool"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Add Quest to Pool Dialog ─────────────────────────────────────── */}
      <Dialog open={!!addQuestPoolId} onOpenChange={(o) => { if (!o) setAddQuestPoolId(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Quest to Pool</DialogTitle>
            <DialogDescription>
              Select a daily quest definition and configure its weight/sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quest Picker */}
            <div className="space-y-1">
              <Label>Quest Definition <span className="text-destructive">*</span></Label>
              <Popover open={questPickerOpen} onOpenChange={setQuestPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between text-sm font-normal">
                    <span className="truncate">
                      {addQuestForm.quest_id
                        ? (dailyQuestDefs.find((q) => q.id === addQuestForm.quest_id)?.name ?? addQuestForm.quest_id)
                        : (dailyQuestDefsLoading ? "Loading…" : "Select a daily quest…")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search quests…" />
                    <CommandList>
                      <CommandEmpty>{dailyQuestDefsLoading ? "Loading…" : "No daily quest definitions found."}</CommandEmpty>
                      <CommandGroup>
                        {dailyQuestDefs.map((q) => (
                          <CommandItem
                            key={q.id}
                            value={`${q.name} ${q.id}`}
                            onSelect={() => {
                              setAddQuestForm({ ...addQuestForm, quest_id: q.id })
                              setQuestPickerOpen(false)
                            }}
                          >
                            <Check className={`mr-2 h-3 w-3 ${addQuestForm.quest_id === q.id ? "opacity-100" : "opacity-0"}`} />
                            <div>
                              <p className="text-sm">{q.name}</p>
                              {q.description && <p className="text-xs text-muted-foreground truncate">{q.description}</p>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Only quest definitions with type &quot;daily&quot; are shown.
              </p>
            </div>

            {/* Strategy-specific fields */}
            {(() => {
              const currentPool = pools.find((p) => p.id === addQuestPoolId)
              const strategy = currentPool?.assignment_strategy
              return (
                <>
                  {strategy === "weighted_random" && (
                    <div className="space-y-1">
                      <Label>Weight <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={addQuestForm.weight}
                        onChange={(e) => setAddQuestForm({ ...addQuestForm, weight: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Higher weight = more likely to be picked. E.g., 10 = common, 1 = rare.</p>
                    </div>
                  )}
                  {strategy === "fixed_rotation" && (
                    <div className="space-y-1">
                      <Label>Sequence Order <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={addQuestForm.sequence_order}
                        onChange={(e) => setAddQuestForm({ ...addQuestForm, sequence_order: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Cycle position (1, 2, 3…). Quests rotate in order each day.</p>
                    </div>
                  )}
                  {strategy === "weekly_schedule" && (
                    <div className="space-y-1">
                      <Label>Day of Week <span className="text-destructive">*</span></Label>
                      <Select
                        value={String(addQuestForm.sequence_order)}
                        onValueChange={(v) => setAddQuestForm({ ...addQuestForm, sequence_order: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DAY_OF_WEEK_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {strategy === "monthly_schedule" && (
                    <div className="space-y-1">
                      <Label>Day of Month <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={addQuestForm.sequence_order}
                        onChange={(e) => setAddQuestForm({ ...addQuestForm, sequence_order: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">1–31. If month doesn&apos;t have this day, falls back to last valid day.</p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
            {!addQuestSaving && !addQuestForm.quest_id && (
              <p className="text-xs text-destructive text-right">Please select a quest definition.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddQuestPoolId(null)} disabled={addQuestSaving}>Cancel</Button>
              <Button onClick={handleAddQuest} disabled={addQuestSaving || !addQuestForm.quest_id}>
                {addQuestSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add Quest
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Remove Quest Confirm ─────────────────────────────────────────── */}
      <AlertDialog open={!!removeQuestTarget} onOpenChange={(o) => { if (!o) setRemoveQuestTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Quest from Pool</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{removeQuestTarget?.questName}</strong> from this pool?
              The quest definition will not be deleted. Players who already received this quest today will not be affected until the next reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeQuestDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveQuest}
              disabled={removeQuestDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeQuestDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Completion Bonus Dialog ──────────────────────────────────────── */}
      <Dialog open={!!bonusPoolId} onOpenChange={(o) => { if (!o) setBonusPoolId(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Completion Bonus</DialogTitle>
            <DialogDescription>
              Reward given when a player completes all daily quests in this pool.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <BonusRewardEditor
              rewards={bonusRewards}
              onChange={setBonusRewards}
              gameId={gameId}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBonusPoolId(null)} disabled={bonusSaving}>Cancel</Button>
            <Button onClick={handleSaveBonus} disabled={bonusSaving}>
              {bonusSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Bonus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
