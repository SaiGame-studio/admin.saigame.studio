"use client"

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, RefreshCw, Trash2, Pencil, ScrollText, Loader2, Clock, ArrowLeft,
  ChevronsUpDown, Check, Hammer, ExternalLink, Search, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
import { listGachaPacks, listItemDefinitions } from "@/lib/inventory-api"
import type { GachaPack, ItemDefinition } from "@/types/inventory"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import { ApiError } from "@/lib/api-client"
import type { Studio } from "@/types/studio"
import {
  listQuestDefinitions,
  createQuestDefinition,
  updateQuestDefinition,
  deleteQuestDefinition,
  isConditionLeaf,
  type QuestDefinition,
  type QuestType,
  type QuestReward,
  type QuestConditionLeaf,
  type QuestConditionGroup,
  type ItemRequirement,
  type CreateQuestDefinitionRequest,
  type UpdateQuestDefinitionRequest,
} from "@/lib/quest-api"
import { GameNavButtons } from "@/components/GameNavButtons"
import { DailyTab } from "./DailyTab"
import { ChainTab } from "./ChainTab"
import type { Game } from "@/types/game"

// ─── Tab config ────────────────────────────────────────────────────────────────

type TabValue = "definitions" | "chains" | "daily" | "battle-pass"

const TABS: { value: TabValue; label: string }[] = [
  { value: "definitions", label: "Definitions" },
  { value: "chains", label: "Chains" },
  { value: "daily", label: "Daily" },
  { value: "battle-pass", label: "Battle Pass" },
]

const VALID_TABS = new Set<string>(TABS.map((t) => t.value))

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUEST_TYPES: { value: QuestType; label: string; description?: string }[] = [
  { value: "one_time",        label: "One-Time",       description: "Completed once per account lifetime" },
  { value: "daily",           label: "Daily",          description: "Resets at midnight UTC" },
  { value: "repeatable",      label: "Repeatable",     description: "Can be completed multiple times" },
  { value: "battle_pass_task",label: "Battle Pass Task",description: "Awards Battle Pass XP on completion" },
  { value: "chain",           label: "Story",          description: "Part of a Quest Chain (DAG)" },
]

const CONDITION_TYPE_OPTIONS = [
  { value: "login",              label: "Login",              description: "Satisfied when the player authenticates" },
  { value: "collect_and_keep",   label: "Collect & Keep",     description: "Player must hold items (not removed)" },
  { value: "collect_and_submit", label: "Collect & Submit",   description: "Player must have items (deducted on completion)" },
  { value: "gacha_opened",       label: "Gacha Opened",       description: "Player must open a gacha pack N times" },
]

const DEFAULT_CONDITIONS: QuestConditionGroup = { operator: "AND", clauses: [] }

const DEFAULT_FORM: CreateQuestDefinitionRequest = {
  name: "",
  description: "",
  quest_type: "one_time",
  conditions: { operator: "AND", clauses: [] },
  is_active: true,
  sort_order: 0,
  rewards: [],
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function questTypeBadgeVariant(type: QuestType) {
  switch (type) {
    case "one_time":         return "default"
    case "daily":            return "secondary"
    case "repeatable":       return "outline"
    case "battle_pass_task": return "outline"
    case "chain":            return "secondary"
    default:                 return "outline"
  }
}

// ─── Condition Editor ───────────────────────────────────────────────────────

interface ConditionEditorProps {
  conditions: QuestConditionGroup
  onChange: (c: QuestConditionGroup) => void
  gameId: string
}

function genClauseId(type: string) {
  const prefix: Record<string, string> = {
    login: "login",
    collect_and_keep: "hold",
    collect_and_submit: "submit",
    gacha_opened: "gacha",
  }
  const p = prefix[type] ?? type.split("_")[0]
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${p}_${rand}`
}

function newLeaf(): QuestConditionLeaf {
  return { clause_id: genClauseId("login"), type: "login", target: 1 }
}

function ConditionEditor({ conditions, onChange, gameId }: ConditionEditorProps) {
  const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([])
  const [gachaPacksLoading, setGachaPacksLoading] = useState(false)
  const [gachaPopoverOpen, setGachaPopoverOpen] = useState<number | null>(null)
  const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([])
  const [itemDefsLoading, setItemDefsLoading] = useState(false)
  const [itemPopoverOpen, setItemPopoverOpen] = useState<{ clause: number; item: number } | null>(null)

  useEffect(() => {
    if (!gameId) return
    setGachaPacksLoading(true)
    listGachaPacks({ gameId })
      .then((res) => setGachaPacks(res.packs ?? []))
      .catch(() => setGachaPacks([]))
      .finally(() => setGachaPacksLoading(false))
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    setItemDefsLoading(true)
    listItemDefinitions({ gameId }, { limit: 200 })
      .then((res) => setItemDefs(res.items ?? []))
      .catch(() => setItemDefs([]))
      .finally(() => setItemDefsLoading(false))
  }, [gameId])
  const setOperator = (op: 'AND' | 'OR') => onChange({ ...conditions, operator: op })

  const addClause = () =>
    onChange({ ...conditions, clauses: [...conditions.clauses, newLeaf()] })

  const removeClause = (i: number) =>
    onChange({ ...conditions, clauses: conditions.clauses.filter((_, idx) => idx !== i) })

  const updateLeaf = (i: number, patch: Partial<QuestConditionLeaf>) =>
    onChange({
      ...conditions,
      clauses: conditions.clauses.map((c, idx) =>
        idx === i && isConditionLeaf(c) ? { ...c, ...patch } : c
      ),
    })

  const updateItem = (clauseIdx: number, itemIdx: number, patch: Partial<ItemRequirement>) => {
    const clause = conditions.clauses[clauseIdx]
    if (!isConditionLeaf(clause)) return
    const items = (clause.items ?? []).map((it, ii) => (ii === itemIdx ? { ...it, ...patch } : it))
    updateLeaf(clauseIdx, { items })
  }

  const addItem = (clauseIdx: number) => {
    const clause = conditions.clauses[clauseIdx]
    if (!isConditionLeaf(clause)) return
    updateLeaf(clauseIdx, { items: [...(clause.items ?? []), { item_definition_id: "", quantity: 1 }] })
  }

  const removeItem = (clauseIdx: number, itemIdx: number) => {
    const clause = conditions.clauses[clauseIdx]
    if (!isConditionLeaf(clause)) return
    updateLeaf(clauseIdx, { items: (clause.items ?? []).filter((_, ii) => ii !== itemIdx) })
  }

  const handleTypeChange = (i: number, v: string) => {
    const clause = conditions.clauses[i]
    if (!isConditionLeaf(clause)) return
    const clause_id = genClauseId(v)
    if (v === "collect_and_keep" || v === "collect_and_submit") {
      updateLeaf(i, { type: v, clause_id, target: undefined, items: clause.items ?? [], packs: undefined, details: undefined })
    } else if (v === "gacha_opened") {
      updateLeaf(i, { type: v, clause_id, items: undefined, target: undefined, packs: clause.packs ?? { gacha_pack_id: "", quantity: 1 }, details: undefined })
    } else {
      // login — no items, no packs
      updateLeaf(i, { type: v, clause_id, items: undefined, target: undefined, packs: undefined, details: undefined })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Conditions</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Operator</span>
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
            <Plus className="h-3 w-3 mr-1" /> Clause
          </Button>
        </div>
      </div>

      {conditions.clauses.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed rounded px-3 py-4 text-center">
          No conditions — quest completes immediately when assigned.
        </p>
      )}

      {conditions.clauses.map((clause, i) => {
        if (!isConditionLeaf(clause)) return (
          <div key={i} className="border rounded p-2 text-xs text-muted-foreground">
            Nested group (edit in JSON). <Button type="button" variant="ghost" size="sm" className="h-5 text-destructive" onClick={() => removeClause(i)}>Remove</Button>
          </div>
        )
        return (
          <div key={i} className="border rounded p-3 space-y-2 bg-muted/30">
            {/* Row 1: type + clause_id + remove */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={clause.type} onValueChange={(v) => handleTypeChange(i, v)}>
                  <SelectTrigger className="h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-32 shrink-0">
                <Label className="text-xs text-muted-foreground">
                  Clause ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={`h-7 text-xs${!clause.clause_id.trim() ? " border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="e.g. login_3"
                  value={clause.clause_id}
                  onChange={(e) => updateLeaf(i, { clause_id: e.target.value })}
                />
              </div>
              <Button
                type="button" size="icon" variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive"
                onClick={() => removeClause(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Row 2: type-specific fields */}
            {(clause.type === "collect_and_keep" || clause.type === "collect_and_submit") ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Required Items</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addItem(i)}>
                    <Plus className="h-3 w-3 mr-0.5" /> Item
                  </Button>
                </div>
                {(clause.items ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No items added.</p>
                )}
                {(clause.items ?? []).map((item, ii) => (
                  <div key={ii} className="flex gap-1 items-center">
                    <Popover
                      open={itemPopoverOpen?.clause === i && itemPopoverOpen?.item === ii}
                      onOpenChange={(o) => setItemPopoverOpen(o ? { clause: i, item: ii } : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="h-7 flex-1 justify-between text-xs font-normal"
                        >
                          <span className="truncate">
                            {item.item_definition_id
                              ? (itemDefs.find((d) => d.id === item.item_definition_id)
                                  ? `${itemDefs.find((d) => d.id === item.item_definition_id)!.name}`
                                  : item.item_definition_id)
                              : (itemDefsLoading ? "Loading…" : "Select item")}
                          </span>
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search item…" className="h-8" />
                          <CommandList>
                            <CommandEmpty>
                              {itemDefsLoading ? "Loading…" : "No items found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {itemDefs.map((def) => (
                                <CommandItem
                                  key={def.id}
                                  value={`${def.name} ${def.item_code} ${def.id}`}
                                  onSelect={() => {
                                    updateItem(i, ii, { item_definition_id: def.id })
                                    setItemPopoverOpen(null)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-3 w-3 ${
                                      item.item_definition_id === def.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
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
                    {item.item_definition_id && (
                      <Link href={`/games/${gameId}/items/${item.item_definition_id}`} target="_blank" className="shrink-0">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </Link>
                    )}
                    <Input
                      type="number" min={1} placeholder="Qty"
                      className="h-7 w-20 text-xs"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, ii, { quantity: Number(e.target.value) })}
                    />
                    <Button
                      type="button" size="icon" variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => removeItem(i, ii)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : clause.type === "gacha_opened" ? (
              <div className="flex gap-2 items-end">
                {/* Gacha Pack — flex-1, aligns under Type */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Gacha Pack <span className="text-red-500">*</span>
                  </Label>
                  <Popover
                    open={gachaPopoverOpen === i}
                    onOpenChange={(o) => setGachaPopoverOpen(o ? i : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="h-7 w-full justify-between text-xs font-normal"
                      >
                        <span className="truncate">
                          {clause.packs?.gacha_pack_id
                            ? (gachaPacks.find((p) => p.id === clause.packs?.gacha_pack_id)?.name
                                ?? clause.packs.gacha_pack_id)
                            : (gachaPacksLoading ? "Loading…" : "Select gacha pack")}
                        </span>
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search pack…" className="h-8" />
                        <CommandList>
                          <CommandEmpty>
                            {gachaPacksLoading ? "Loading…" : "No packs found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {gachaPacks.map((pack) => (
                              <CommandItem
                                key={pack.id}
                                value={`${pack.name} ${pack.id}`}
                                onSelect={() => {
                                  updateLeaf(i, {
                                    packs: { gacha_pack_id: pack.id, quantity: clause.packs?.quantity ?? 1 },
                                  })
                                  setGachaPopoverOpen(null)
                                }}
                              >
                                <Check
                                  className={`mr-2 h-3 w-3 ${
                                    clause.packs?.gacha_pack_id === pack.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <div>
                                  <p className="text-sm">{pack.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{pack.id}</p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {clause.packs?.gacha_pack_id && (
                  <Link href={`/games/${gameId}/items?tab=gacha&editPack=${clause.packs.gacha_pack_id}`} target="_blank" className="shrink-0 mt-auto mb-1">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                )}
                {/* Quantity — w-32, aligns under Clause ID */}
                <div className="w-32 shrink-0 space-y-1">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number" min={1} className="h-7"
                    value={clause.packs?.quantity ?? 1}
                    onChange={(e) => updateLeaf(i, { packs: { gacha_pack_id: clause.packs?.gacha_pack_id ?? "", quantity: Number(e.target.value) } })}
                  />
                </div>
                {/* Spacer — w-7, aligns under delete button */}
                <div className="w-7 shrink-0" />
              </div>
            ) : (
              /* login — no extra fields needed */
              <p className="text-xs text-muted-foreground">No extra fields — auto-checked on player login.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Reward Editor ─────────────────────────────────────────────────────────────

interface RewardEditorProps {
  rewards: QuestReward[]
  onChange: (rewards: QuestReward[]) => void
  gameId: string
}

function RewardEditor({ rewards, onChange, gameId }: RewardEditorProps) {
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
        <Label>Rewards</Label>
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
                  updateReward(i, { reward_type: v, item_definition_id: undefined, quantity_min: undefined, quantity_max: undefined })
                } else {
                  updateReward(i, { reward_type: v, amount: undefined })
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
              <Input
                type="number"
                min={1}
                placeholder="Amount"
                value={r.amount ?? ""}
                onChange={(e) => updateReward(i, { amount: Number(e.target.value) })}
                className="h-8"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                <Popover open={rewardItemPopover === i} onOpenChange={(o) => setRewardItemPopover(o ? i : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="h-8 w-full justify-between text-sm font-normal"
                    >
                      <span className="truncate">
                        {r.item_definition_id
                          ? (itemDefs.find((d) => d.id === r.item_definition_id)
                              ? itemDefs.find((d) => d.id === r.item_definition_id)!.name
                              : r.item_definition_id)
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
                {r.item_definition_id && (
                  <Link
                    href={`/games/${gameId}/items/${r.item_definition_id}`}
                    className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    title="Open item"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Min Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={r.quantity_min ?? ""}
                      onChange={(e) => updateReward(i, { quantity_min: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={r.quantity_max ?? ""}
                      onChange={(e) => updateReward(i, { quantity_max: Number(e.target.value) })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-destructive"
            onClick={() => removeReward(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ─── Definitions Tab ──────────────────────────────────────────────────────────

function DefinitionsTab({ game, editQuestId }: { game: Game | null; editQuestId?: string | null }) {
  const gameId = game?.id ?? ""
  const router = useRouter()
  const { toast } = useToast()

  const [quests, setQuests] = useState<QuestDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const offset = 0
  const limit = 50

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editQuest, setEditQuest] = useState<QuestDefinition | null>(null)
  const [deleteQuest, setDeleteQuest] = useState<QuestDefinition | null>(null)

  // Form state
  const [form, setForm] = useState<CreateQuestDefinitionRequest>({ ...DEFAULT_FORM })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Filters
  const [filterSearch, setFilterSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterActive, setFilterActive] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("updated_at")
  const [sortOrder, setSortOrder] = useState<string>("desc")

  const filteredQuests = useMemo(() => {
    let result = quests
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase()
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q) || d.id.toLowerCase().includes(q),
      )
    }
    if (filterType !== "all") {
      result = result.filter((d) => d.quest_type === filterType)
    }
    return result
  }, [quests, filterSearch, filterType])

  const hasActiveFilters = filterSearch.trim() !== "" || filterType !== "all" || filterActive !== "all" || sortBy !== "updated_at" || sortOrder !== "desc"
  const clearFilters = () => { setFilterSearch(""); setFilterType("all"); setFilterActive("all"); setSortBy("updated_at"); setSortOrder("desc") }

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadQuests = useCallback(async (off = 0) => {
    if (!game) return
    try {
      const res = await listQuestDefinitions(game.studio_id, gameId, {
        active_only: filterActive === "active" ? true : filterActive === "inactive" ? false : undefined,
        limit,
        offset: off,
        sort_by: sortBy,
        order: sortOrder,
      })
      setQuests(res.quests ?? [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load quest definitions"
      setError(msg)
    }
  }, [game, gameId, limit, filterActive, sortBy, sortOrder])

  useEffect(() => {
    if (!game) return
    setLoading(true)
    setError(null)
    loadQuests(0).finally(() => setLoading(false))
  }, [game, loadQuests])

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const openEdit = useCallback((q: QuestDefinition) => {
    setForm({
      name: q.name,
      description: q.description ?? "",
      quest_type: q.quest_type,
      conditions: q.conditions ?? { operator: "AND", clauses: [] },
      is_active: q.is_active,
      sort_order: q.sort_order,
      rewards: q.rewards ?? [],
    })
    setEditQuest(q)
  }, [])

  // Auto-open edit sheet when navigated from DailyTab via editQuestId
  const handledEditQuestId = useRef<string | null>(null)
  useEffect(() => {
    if (!editQuestId || editQuestId === handledEditQuestId.current || quests.length === 0) return
    handledEditQuestId.current = editQuestId
    const q = quests.find((qd) => qd.id === editQuestId)
    if (q) {
      openEdit(q)
      // Clear the editQuestId from URL
      const sp = new URLSearchParams(window.location.search)
      sp.delete("editQuestId")
      const qs = sp.toString()
      router.replace(`/games/${gameId}/quests${qs ? `?${qs}` : ""}`, { scroll: false })
    }
  }, [editQuestId, quests, gameId, router, openEdit])

  const refresh = async () => {
    setRefreshing(true)
    await loadQuests(offset)
    setRefreshing(false)
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...DEFAULT_FORM })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!game) return
    setSaving(true)
    try {
      await createQuestDefinition(game.studio_id, gameId, form)
      toast({ title: "Quest created", description: form.name })
      setCreateOpen(false)
      await loadQuests(offset)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof ApiError ? e.message : "Failed to create quest",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!game || !editQuest) return
    setSaving(true)
    try {
      const patch: UpdateQuestDefinitionRequest = { ...form }
      await updateQuestDefinition(game.studio_id, gameId, editQuest.id, patch)
      toast({ title: "Quest updated", description: form.name })
      setEditQuest(null)
      await loadQuests(offset)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof ApiError ? e.message : "Failed to update quest",
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!game || !deleteQuest) return
    setDeleting(true)
    try {
      await deleteQuestDefinition(game.studio_id, gameId, deleteQuest.id)
      toast({ title: "Quest deleted", description: deleteQuest.name })
      setDeleteQuest(null)
      await loadQuests(offset)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof ApiError ? e.message : "Failed to delete quest",
      })
    } finally {
      setDeleting(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  const toggleActive = async (q: QuestDefinition) => {
    if (!game) return
    try {
      await updateQuestDefinition(game.studio_id, gameId, q.id, { is_active: !q.is_active })
      setQuests((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, is_active: !x.is_active } : x))
      )
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e instanceof ApiError ? e.message : "Failed to toggle quest",
      })
    }
  }

  // ── Form shared part ─────────────────────────────────────────────────────────

  const QuestForm = (
    <div className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="qname">Name <span className="text-red-500">*</span></Label>
        <Input
          id="qname"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Quest name"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="qdesc">Description</Label>
        <Textarea
          id="qdesc"
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Quest description"
        />
      </div>

      {/* Quest Type */}
      <div className="space-y-1">
        <Label>Quest Type <span className="text-red-500">*</span></Label>
        <Select
          value={form.quest_type}
          onValueChange={(v) => setForm((f) => ({ ...f, quest_type: v as QuestType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUEST_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <div>
                  <span>{t.label}</span>
                  {t.description && (
                    <span className="ml-2 text-xs text-muted-foreground">{t.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(form.quest_type === "chain") && (
          <p className="text-xs text-muted-foreground">Story quests require a Chain Group ID.</p>
        )}
      </div>

      {/* Conditions */}
      <ConditionEditor
        conditions={form.conditions ?? DEFAULT_CONDITIONS}
        onChange={(c) => setForm((f) => ({ ...f, conditions: c }))}
        gameId={gameId}
      />

      {/* Sort Order */}
      <div className="space-y-1">
        <Label htmlFor="qsort">Sort Order</Label>
        <Input
          id="qsort"
          type="number"
          value={form.sort_order ?? 0}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="qactive"
          checked={form.is_active ?? true}
          onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
        />
        <Label htmlFor="qactive">Active</Label>
      </div>

      {/* Rewards */}
      <RewardEditor
        rewards={form.rewards ?? []}
        onChange={(rewards) => setForm((f) => ({ ...f, rewards }))}
        gameId={gameId}
      />
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${filteredQuests.length} of ${quests.length} quest definition${quests.length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate} disabled={loading || !game}>
            <Plus className="h-4 w-4 mr-1" />
            New Quest
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      {!loading && quests.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, description…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {QUEST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => { const [s, o] = v.split(":"); setSortBy(s); setSortOrder(o) }}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sort_order:asc">Sort Order ↑</SelectItem>
              <SelectItem value="sort_order:desc">Sort Order ↓</SelectItem>
              <SelectItem value="name:asc">Name A–Z</SelectItem>
              <SelectItem value="name:desc">Name Z–A</SelectItem>
              <SelectItem value="created_at:desc">Newest First</SelectItem>
              <SelectItem value="created_at:asc">Oldest First</SelectItem>
              <SelectItem value="updated_at:desc">Recently Updated</SelectItem>
              <SelectItem value="updated_at:asc">Least Recently Updated</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              {hasActiveFilters ? (
                <>
                  <Search className="h-10 w-10 opacity-30" />
                  <p>No quests match the current filters.</p>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="h-3.5 w-3.5 mr-1" /> Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <ScrollText className="h-10 w-10 opacity-30" />
                  <p>No quest definitions yet.</p>
                  <Button onClick={openCreate} variant="outline">
                    <Plus className="h-4 w-4 mr-1" /> Create First Quest
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Rewards</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuests.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <div className="font-medium">{q.name}</div>
                      {q.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {q.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={questTypeBadgeVariant(q.quest_type)}>
                        {q.quest_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.conditions ? (
                        <span className="inline-flex items-center gap-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {q.conditions.operator}
                          </Badge>
                          <span className="text-muted-foreground">
                            {q.conditions.clauses?.length ?? 0} clause{(q.conditions.clauses?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.rewards?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-sm">{q.sort_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={q.is_active}
                        onCheckedChange={() => toggleActive(q)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEdit(q)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteQuest(q)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Quest Definition</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{QuestForm}</div>
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </SheetClose>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim() || (form.conditions?.clauses ?? []).some((c) => isConditionLeaf(c) && !c.clause_id.trim())}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editQuest} onOpenChange={(o) => { if (!o) setEditQuest(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Quest Definition</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{QuestForm}</div>
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button variant="outline" disabled={saving}>Cancel</Button>
            </SheetClose>
            <Button onClick={handleEdit} disabled={saving || !form.name.trim() || (form.conditions?.clauses ?? []).some((c) => isConditionLeaf(c) && !c.clause_id.trim())}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteQuest} onOpenChange={(o) => { if (!o) setDeleteQuest(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteQuest?.name}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Coming Soon Panel ─────────────────────────────────────────────────────────

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
      <Clock className="h-12 w-12 opacity-30" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm opacity-70">This feature is coming soon.</p>
    </div>
  )
}

// ─── Inner Page (needs useSearchParams) ───────────────────────────────────────

function QuestsPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = params.id as string
  const { toast } = useToast()

  const rawTab = searchParams.get("tab") ?? ""
  const activeTab: TabValue = VALID_TABS.has(rawTab) ? (rawTab as TabValue) : "definitions"

  const [game, setGame] = useState<Game | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [gameLoading, setGameLoading] = useState(true)

  useEffect(() => {
    setGameLoading(true)
    getGame(gameId)
      .then(async (g) => {
        setGame(g)
        if (g.studio_id) {
          try {
            const s = await fetchStudioWithCache(g.studio_id)
            setStudio(s)
          } catch {
            // ignore
          }
        }
      })
      .catch(() => toast({ variant: "destructive", title: "Error", description: "Failed to load game" }))
      .finally(() => setGameLoading(false))
  }, [gameId, toast])

  const handleTabChange = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (value === "definitions") {
      sp.delete("tab")
    } else {
      sp.set("tab", value)
    }
    const qs = sp.toString()
    router.push(`/games/${gameId}/quests${qs ? `?${qs}` : ""}`)
  }

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/studios">Studios</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            {game?.studio_id && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/studios/${game.studio_id}`}>
                    {studio?.name || game.studio?.name || "Studio"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>
                {gameLoading ? gameId : (game?.name ?? gameId)}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="">Quests</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Quests</h1>
            </div>
            {game && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {game.limits?.max_quests != null ? (() => {
                  const used = game.usage?.quests ?? 0
                  const max = game.limits.max_quests!
                  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
                  return (
                    <>
                      <span className={used >= max ? "text-destructive font-medium" : ""}>
                        {used.toLocaleString()} / {max.toLocaleString()} quests
                      </span>
                      <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                        <span
                          className={`block h-full rounded-full transition-all ${
                            used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <Link
                        href={`/games/${gameId}/plugins`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        title="Manage plugins / raise limits"
                      >
                        <Hammer className="h-3.5 w-3.5" />
                      </Link>
                    </>
                  )
                })() : <span>{game.name}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="quests" />
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="definitions" className="mt-6 space-y-4">
          <DefinitionsTab game={game} editQuestId={searchParams.get("editQuestId")} />
        </TabsContent>

        <TabsContent value="chains" className="mt-6 space-y-4">
          <ChainTab game={game} />
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <DailyTab game={game} />
        </TabsContent>

        <TabsContent value="battle-pass" className="mt-6">
          <ComingSoon title="Battle Pass" />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

// ─── Default export (wrapped in Suspense for useSearchParams) ─────────────────

export default function QuestsPage() {
  return (
    <Suspense>
      <QuestsPageInner />
    </Suspense>  )
}