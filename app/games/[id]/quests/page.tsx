"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CopyButton } from "@/components/CopyButton"
import {
  Plus, RefreshCw, Trash2, Pencil, ScrollText, Loader2, Clock, ArrowLeft,
  ChevronsUpDown, Check, Hammer, ExternalLink, Search, X, ChevronDown, ChevronRight, Wand2,
} from "lucide-react"
import { toSlugUnderscore } from "@/lib/utils"
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
import type { GachaPack, ItemDefinition, Paginated } from "@/types/inventory"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import { ApiError } from "@/lib/api-client"
import type { Studio } from "@/types/studio"
import {
  listQuestDefinitions,
  listQuestTypes,
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
import { useTranslation } from "@/lib/i18n/use-translation"
import { DailyTab } from "./DailyTab"
import { ChainTab } from "./ChainTab"
import { SettingsTab } from "./SettingsTab"
import { QuestDeliveryOverride } from "./QuestDeliveryOverride"
import type { Game } from "@/types/game"

// ─── Tab config ────────────────────────────────────────────────────────────────

type TabValue = "definitions" | "chains" | "daily" | "battle-pass" | "world-quest" | "settings"

// Module-level cache so the same items?limit=200 request is only fired once per gameId
// across ConditionEditor, RewardEditor, and the DefinitionsTab row display.
const itemDefsCache = new Map<string, Promise<Paginated<ItemDefinition>>>()
function getItemDefsCached(gameId: string, limit = 200): Promise<Paginated<ItemDefinition>> {
  const key = `${gameId}:${limit}`
  let p = itemDefsCache.get(key)
  if (!p) {
    p = listItemDefinitions({ gameId }, { limit }).catch((e) => {
      itemDefsCache.delete(key)
      throw e
    })
    itemDefsCache.set(key, p)
  }
  return p
}

const TABS: { value: TabValue; labelKey: string }[] = [
  { value: "definitions", labelKey: "quest.tabDefinitions" },
  { value: "chains", labelKey: "quest.tabChains" },
  { value: "daily", labelKey: "quest.tabDaily" },
  { value: "battle-pass", labelKey: "quest.tabBattlePass" },
  { value: "world-quest", labelKey: "quest.tabWorldQuest" },
  { value: "settings", labelKey: "quest.tabSettings" },
]

const VALID_TABS = new Set<string>(TABS.map((t) => t.value))

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUEST_TYPES: { value: QuestType; labelKey: string; descKey: string }[] = [
  { value: "one_time",        labelKey: "quest.typeOneTime",       descKey: "quest.typeOneTimeDesc" },
  { value: "daily",           labelKey: "quest.typeDaily",         descKey: "quest.typeDailyDesc" },
  { value: "repeatable",      labelKey: "quest.typeRepeatable",    descKey: "quest.typeRepeatableDesc" },
  { value: "battle_pass_task",labelKey: "quest.typeBattlePassTask",descKey: "quest.typeBattlePassTaskDesc" },
  { value: "chain",           labelKey: "quest.typeChain",         descKey: "quest.typeChainDesc" },
]

const CONDITION_TYPE_OPTIONS = [
  { value: "login",              labelKey: "quest.condLogin",              descKey: "quest.condLoginDesc" },
  { value: "collect_and_keep",   labelKey: "quest.condCollectAndKeep",     descKey: "quest.condCollectAndKeepDesc" },
  { value: "collect_and_submit", labelKey: "quest.condCollectAndSubmit",   descKey: "quest.condCollectAndSubmitDesc" },
  { value: "not_have_item",      labelKey: "quest.condNotHaveItem",        descKey: "quest.condNotHaveItemDesc" },
  { value: "gacha_opened",       labelKey: "quest.condGachaOpened",        descKey: "quest.condGachaOpenedDesc" },
]

const DEFAULT_CONDITIONS: QuestConditionGroup = { operator: "AND", clauses: [] }

const DEFAULT_FORM: CreateQuestDefinitionRequest = {
  name: "",
  code_name: "",
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
    not_have_item: "nohave",
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
  const { t } = useTranslation()
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
    getItemDefsCached(gameId)
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
    if (v === "collect_and_keep" || v === "collect_and_submit" || v === "not_have_item") {
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
            <Plus className="h-3 w-3 mr-1" /> {t('quest.clause')}
          </Button>
        </div>
      </div>

      {conditions.clauses.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed rounded px-3 py-4 text-center">
          {t('quest.noConditions')}
        </p>
      )}

      {conditions.clauses.map((clause, i) => {
        if (!isConditionLeaf(clause)) return (
          <div key={i} className="border rounded p-2 text-xs text-muted-foreground">
            {t('quest.nestedGroupEdit')} <Button type="button" variant="ghost" size="sm" className="h-5 text-destructive" onClick={() => removeClause(i)}>{t('common.remove')}</Button>
          </div>
        )
        return (
          <div key={i} className="border rounded p-3 space-y-2 bg-muted/30">
            {/* Row 1: type + clause_id + remove */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{t('quest.type')}</Label>
                <Select value={clause.type} onValueChange={(v) => handleTypeChange(i, v)}>
                  <SelectTrigger className="h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-32 shrink-0">
                <Label className="text-xs text-muted-foreground">
                  {t('quest.clauseId')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  className={`h-7 text-xs${!clause.clause_id.trim() ? " border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder={t('quest.clauseIdPlaceholder')}
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
            {(clause.type === "collect_and_keep" || clause.type === "collect_and_submit" || clause.type === "not_have_item") ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t('quest.requiredItems')}</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addItem(i)}>
                    <Plus className="h-3 w-3 mr-0.5" /> {t('quest.addItem')}
                  </Button>
                </div>
                {(clause.items ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('quest.noItemsAdded')}</p>
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
                              : (itemDefsLoading ? t('common.loading') : t('quest.selectItem'))}
                          </span>
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('quest.searchItem')} className="h-8" />
                          <CommandList>
                            <CommandEmpty>
                              {itemDefsLoading ? t('common.loading') : t('common.noItemsFound')}
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
                    {t('quest.gachaPack')} <span className="text-red-500">*</span>
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
                            : (gachaPacksLoading ? t('common.loading') : t('quest.selectGachaPack'))}
                        </span>
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('quest.searchPack')} className="h-8" />
                        <CommandList>
                          <CommandEmpty>
                            {gachaPacksLoading ? t('common.loading') : t('common.noItemsFound')}
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
                  <Label className="text-xs text-muted-foreground">{t('quest.quantity')}</Label>
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
              <p className="text-xs text-muted-foreground">{t('quest.noExtraFields')}</p>
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
  const { t } = useTranslation()
  const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([])
  const [itemDefsLoading, setItemDefsLoading] = useState(false)
  const [rewardItemPopover, setRewardItemPopover] = useState<number | null>(null)

  useEffect(() => {
    if (!gameId) return
    setItemDefsLoading(true)
    getItemDefsCached(gameId)
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
        <Label>{t('quest.rewards')}</Label>
        <Button type="button" size="sm" variant="outline" onClick={addReward}>
          <Plus className="h-3 w-3 mr-1" /> {t('quest.addReward')}
        </Button>
      </div>
      {rewards.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('quest.noRewards')}</p>
      )}
      {rewards.map((r, i) => (
        <div key={i} className="flex gap-2 items-start border rounded p-2">
          <div className="flex-1 space-y-2">
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
                          : (itemDefsLoading ? t('common.loading') : t('quest.selectItem'))}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('quest.searchItem')} className="h-8" />
                      <CommandList>
                        <CommandEmpty>{itemDefsLoading ? t('common.loading') : t('common.noItemsFound')}</CommandEmpty>
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
                    title={t('quest.openItem')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('quest.minQty')}</Label>
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
                    <Label className="text-xs text-muted-foreground">{t('quest.maxQty')}</Label>
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

function DefinitionsTab({ game, editQuestId, onGameUpdate }: { game: Game | null; editQuestId?: string | null; onGameUpdate?: (g: Game) => void }) {
  const { t } = useTranslation()
  const { id: gameId } = useParams() as { id: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [quests, setQuests] = useState<QuestDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null)

  // Item definitions for expanded row display
  const [rowItemDefs, setRowItemDefs] = useState<ItemDefinition[]>([])
  const [rowGachaPacks, setRowGachaPacks] = useState<GachaPack[]>([])

  useEffect(() => {
    if (!gameId) return
    getItemDefsCached(gameId)
      .then((res) => setRowItemDefs(res.items ?? []))
      .catch(() => setRowItemDefs([]))
  }, [gameId])

  useEffect(() => {
    if (!gameId) return
    listGachaPacks({ gameId })
      .then((res) => setRowGachaPacks(res.packs ?? []))
      .catch(() => setRowGachaPacks([]))
  }, [gameId])

  // Pagination
  const offset = 0
  const limit = 50

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editQuest, setEditQuest] = useState<QuestDefinition | null>(null)
  const [deleteQuest, setDeleteQuest] = useState<QuestDefinition | null>(null)

  // Form state
  const [form, setForm] = useState<CreateQuestDefinitionRequest>({ ...DEFAULT_FORM })
  const [autoSlug, setAutoSlug] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Filters — initialized from URL so F5 preserves them
  const [filterSearch, setFilterSearch] = useState(() => searchParams.get("q") ?? "")
  const [filterType, setFilterType] = useState(() => searchParams.get("type") ?? "all")
  const [filterActive, setFilterActive] = useState(() => searchParams.get("active") ?? "all")
  const [sortBy, setSortBy] = useState(() => searchParams.get("sortBy") ?? "updated_at")
  const [sortOrder, setSortOrder] = useState(() => searchParams.get("sortOrder") ?? "desc")

  // Sync filter state → URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    if (filterSearch) sp.set("q", filterSearch); else sp.delete("q")
    if (filterType !== "all") sp.set("type", filterType); else sp.delete("type")
    if (filterActive !== "all") sp.set("active", filterActive); else sp.delete("active")
    if (sortBy !== "updated_at") sp.set("sortBy", sortBy); else sp.delete("sortBy")
    if (sortOrder !== "desc") sp.set("sortOrder", sortOrder); else sp.delete("sortOrder")
    router.replace(`/games/${gameId}/quests?${sp.toString()}`, { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSearch, filterType, filterActive, sortBy, sortOrder])

  // Quest type options:
  // - Prefer i18n labels/descriptions for known quest types
  // - Keep API-provided values as fallback for unknown future types
  const [apiQuestTypes, setApiQuestTypes] = useState<{ value: string; description?: string }[]>([])

  useEffect(() => {
    listQuestTypes().then((data) => {
      if (data?.quest_types?.length) {
        setApiQuestTypes(
          data.quest_types.map((qt) => ({
            value: qt.value,
            description: qt.description,
          }))
        )
      }
    }).catch(() => {/* keep fallback */})
  }, [])

  const questTypeOptions = useMemo(() => {
    const knownTypeMap = new Map(
      QUEST_TYPES.map((qt) => [qt.value, { label: t(qt.labelKey), description: t(qt.descKey) }])
    )

    const sourceTypes = apiQuestTypes.length > 0
      ? apiQuestTypes.map((qt) => qt.value)
      : QUEST_TYPES.map((qt) => qt.value)

    return sourceTypes.map((value) => {
      const known = knownTypeMap.get(value as QuestType)
      const apiInfo = apiQuestTypes.find((qt) => qt.value === value)

      return {
        value,
        label: known?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: known?.description ?? (apiInfo?.description ?? ""),
      }
    })
  }, [apiQuestTypes, t])

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
        status: filterActive === "active" ? true : filterActive === "inactive" ? false : undefined,
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
      code_name: q.code_name ?? "",
      description: q.description ?? "",
      quest_type: q.quest_type,
      conditions: q.conditions ?? { operator: "AND", clauses: [] },
      is_active: q.is_active,
      sort_order: q.sort_order,
      rewards: q.rewards ?? [],
    })
    setAutoSlug(false)
    setEditQuest(q)
    // Reflect the edit target in the URL so the link can be shared
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("editQuestId", q.id)
    sp.delete("tab")  // definitions is the default tab, keep URL clean
    router.replace(`/games/${gameId}/quests?${sp.toString()}`, { scroll: false })
  }, [gameId, router, searchParams])

  // Auto-open edit sheet when ?editQuestId=<id> is in the URL (shared link or pencil click)
  const handledEditQuestId = useRef<string | null>(null)
  useEffect(() => {
    if (!editQuestId || editQuestId === handledEditQuestId.current || quests.length === 0) return
    handledEditQuestId.current = editQuestId
    const q = quests.find((qd) => qd.id === editQuestId)
    if (q) openEdit(q)
  }, [editQuestId, quests, openEdit])

  const refresh = async () => {
    setRefreshing(true)
    await loadQuests(offset)
    setRefreshing(false)
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({ ...DEFAULT_FORM })
    setAutoSlug(true)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!game) return
    const codeName = (form.code_name ?? "").trim()
    if (!codeName) {
      toast({ variant: "destructive", title: t('common.error'), description: t('quest.codeNameRequired') })
      return
    }
    setSaving(true)
    try {
      const payload: CreateQuestDefinitionRequest = {
        ...form,
        code_name: codeName,
      }
      await createQuestDefinition(game.studio_id, gameId, payload)
      toast({ title: t('quest.questCreated'), description: form.name })
      setCreateOpen(false)
      await loadQuests(offset)
      getGame(gameId).then(onGameUpdate).catch(() => {})
    } catch (e) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: e instanceof ApiError ? e.message : t('quest.failedCreateQuest'),
      })
    } finally {
      setSaving(false)
    }
  }

  const closeEdit = useCallback(() => {
    setEditQuest(null)
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("editQuestId")
    const qs = sp.toString()
    router.replace(`/games/${gameId}/quests${qs ? `?${qs}` : ""}`, { scroll: false })
  }, [gameId, router, searchParams])

  const handleEdit = async () => {
    if (!game || !editQuest) return
    const codeName = (form.code_name ?? "").trim()
    if (!codeName) {
      toast({ variant: "destructive", title: t('common.error'), description: t('quest.codeNameRequired') })
      return
    }
    setSaving(true)
    try {
      const patch: UpdateQuestDefinitionRequest = {
        ...form,
        code_name: codeName,
      }
      await updateQuestDefinition(game.studio_id, gameId, editQuest.id, patch)
      toast({ title: t('quest.questUpdated'), description: form.name })
      closeEdit()
      await loadQuests(offset)
    } catch (e) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: e instanceof ApiError ? e.message : t('quest.failedUpdateQuest'),
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
      toast({ title: t('quest.questDeleted'), description: deleteQuest.name })
      setDeleteQuest(null)
      await loadQuests(offset)
      getGame(gameId).then(onGameUpdate).catch(() => {})
    } catch (e) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: e instanceof ApiError ? e.message : t('quest.failedDeleteQuest'),
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
        title: t('common.error'),
        description: e instanceof ApiError ? e.message : t('quest.failedToggleQuest'),
      })
    }
  }

  // ── Form shared part ─────────────────────────────────────────────────────────

  const QuestForm = (
    <div className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="qname">{t('quest.name')} <span className="text-red-500">*</span></Label>
        <Input
          id="qname"
          value={form.name}
          onChange={(e) => {
            const v = e.target.value
            setForm((f) => ({
              ...f,
              name: v,
              ...(autoSlug ? { code_name: toSlugUnderscore(v) } : {}),
            }))
          }}
          placeholder={t('quest.questNamePlaceholder')}
        />
      </div>

      {/* Code Name */}
      <div className="space-y-1">
        <Label htmlFor="qcode">
          {t('quest.codeName')} <span className="text-red-500">*</span>{" "}
          <span className="text-muted-foreground text-xs font-normal">({t('quest.codeNameHint')})</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="qcode"
            value={form.code_name ?? ""}
            placeholder={t('quest.codeNamePlaceholder')}
            className="font-mono"
            onChange={(e) => {
              setAutoSlug(false)
              setForm((f) => ({ ...f, code_name: e.target.value }))
            }}
          />
          <Button
            type="button"
            variant={autoSlug ? "default" : "outline"}
            size="icon"
            className="shrink-0"
            title={autoSlug ? t('items.autoSlugOn') : t('items.autoSlugOff')}
            onClick={() => {
              const next = !autoSlug
              setAutoSlug(next)
              if (next) setForm((f) => ({ ...f, code_name: toSlugUnderscore(f.name) }))
            }}
          >
            <Wand2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="qdesc">{t('quest.description')}</Label>
        <Textarea
          id="qdesc"
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t('quest.questDescPlaceholder')}
        />
      </div>

      {/* Quest Type */}
      <div className="space-y-1">
        <Label>{t('quest.questType')} <span className="text-red-500">*</span></Label>
        <Select
          value={form.quest_type}
          onValueChange={(v) => setForm((f) => ({ ...f, quest_type: v as QuestType }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {questTypeOptions.map((t) => (
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
          <p className="text-xs text-muted-foreground">{t('quest.storyChainHint')}</p>
        )}
      </div>

      {/* Conditions */}
      <ConditionEditor
        conditions={form.conditions ?? DEFAULT_CONDITIONS}
        onChange={(c) => setForm((f) => ({ ...f, conditions: c }))}
        gameId={gameId}
      />


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
      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground mr-auto">
            {quests.length > 0
              ? `${filteredQuests.length} ${t('quest.ofQuests')} ${quests.length} ${quests.length !== 1 ? t('quest.questDefinitions') : t('quest.questDefinition')}`
              : `0 ${t('quest.questDefinitions')}`}
          </p>
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('quest.searchByNameDesc')}
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder={t('quest.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('quest.allTypes')}</SelectItem>
              {questTypeOptions.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder={t('quest.allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('quest.allStatus')}</SelectItem>
              <SelectItem value="active">{t('quest.activeStatus')}</SelectItem>
              <SelectItem value="inactive">{t('quest.inactiveStatus')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortBy}:${sortOrder}`} onValueChange={(v) => { const [s, o] = v.split(":"); setSortBy(s); setSortOrder(o) }}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Sort" />
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
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={openCreate} disabled={loading || !game}>
            <Plus className="h-4 w-4 mr-1" />
            {t('quest.newQuest')}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" /> {t('quest.clear')}
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
                  <p>{t('quest.noQuestsMatch')}</p>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="h-3.5 w-3.5 mr-1" /> {t('quest.clearFilters')}
                  </Button>
                </>
              ) : (
                <>
                  <ScrollText className="h-10 w-10 opacity-30" />
                  <p>{t('quest.noQuestDefs')}</p>
                  <Button onClick={openCreate} variant="outline">
                    <Plus className="h-4 w-4 mr-1" /> {t('quest.createFirstQuest')}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('quest.name')}</TableHead>
                  <TableHead>{t('quest.codeName')}</TableHead>
                  <TableHead>{t('quest.type')}</TableHead>
                  <TableHead>{t('quest.conditions')}</TableHead>
                  <TableHead>{t('quest.rewards')}</TableHead>

                  <TableHead>{t('quest.active')}</TableHead>
                  <TableHead className="text-right">{t('quest.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuests.map((q) => (
                  <React.Fragment key={q.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedQuestId(expandedQuestId === q.id ? null : q.id)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-1.5">
                        {expandedQuestId === q.id
                          ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />}
                        <span className="font-medium truncate">{q.name}</span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {q.code_name ? (
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-0.5" title={q.code_name}>
                          <span className="truncate max-w-[220px]">{q.code_name}</span>
                          <CopyButton text={q.code_name} size="h-3 w-3" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
                            {q.conditions.clauses?.length ?? 0} {(q.conditions.clauses?.length ?? 0) !== 1 ? t('quest.clausesCount') : t('quest.clauseCount')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.rewards?.length ?? 0}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                          onClick={(e) => { e.stopPropagation(); openEdit(q) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteQuest(q) }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expanded detail row */}
                  {expandedQuestId === q.id && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={8} className="p-0">
                        <div className="px-6 py-4 space-y-4 border-t border-dashed">
                          {/* Row 1: Quest ID + Description */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">{t('quest.questId')}</p>
                              <div className="flex items-center gap-1">
                                <p className="font-mono text-xs break-all">{q.id}</p>
                                <CopyButton text={q.id} size="h-3 w-3" />
                              </div>
                            </div>
                            {q.description && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">{t('quest.description')}</p>
                                <p className="text-sm">{q.description}</p>
                              </div>
                            )}
                          </div>

                          {/* Two-column layout: [Conditions + Rewards] | [Reward Delivery] */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div className="space-y-4">
                          {/* Conditions */}
                          {q.conditions && q.conditions.clauses?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t('quest.conditions')} <Badge variant="outline" className="ml-1 font-mono text-xs">{q.conditions.operator}</Badge></p>
                              <div className="space-y-1.5">
                                {q.conditions.clauses.map((clause, ci) => {
                                  if (!isConditionLeaf(clause)) {
                                    return <div key={ci} className="text-xs text-muted-foreground border rounded px-2 py-1">{t('quest.nestedGroup')} ({(clause as QuestConditionGroup).operator})</div>
                                  }
                                  const typeOpt = CONDITION_TYPE_OPTIONS.find(o => o.value === clause.type)
                                  const typeLabel = typeOpt ? t(typeOpt.labelKey) : clause.type
                                  return (
                                    <div key={ci} className="border rounded px-3 py-2 bg-background text-sm space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                                        <span className="font-mono text-xs text-muted-foreground">{clause.clause_id}</span>
                                      </div>
                                      {/* Items for collect_and_keep / collect_and_submit / not_have_item */}
                                      {clause.items && clause.items.length > 0 && (
                                        <div className="pl-2 space-y-0.5">
                                          {clause.items.map((item, ii) => {
                                            const def = rowItemDefs.find(d => d.id === item.item_definition_id)
                                            return (
                                              <div key={ii} className="flex items-center gap-2 text-xs">
                                                <span className="text-muted-foreground">•</span>
                                                <span className="font-medium">{def?.name ?? item.item_definition_id}</span>
                                                {def && <span className="text-muted-foreground font-mono">({def.item_code})</span>}
                                                <span className="text-muted-foreground">× {item.quantity}</span>
                                                <Link
                                                  href={`/games/${gameId}/items/${item.item_definition_id}`}
                                                  target="_blank"
                                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                                  onClick={(e) => e.stopPropagation()}
                                                  title={t('quest.openItemDef')}
                                                >
                                                  <ExternalLink className="h-3 w-3" />
                                                </Link>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                      {/* Gacha pack */}
                                      {clause.packs && clause.packs.gacha_pack_id && (
                                        <div className="pl-2 text-xs flex items-center gap-2">
                                          <span className="text-muted-foreground">•</span>
                                          <span className="font-medium">
                                            {rowGachaPacks.find(p => p.id === clause.packs?.gacha_pack_id)?.name ?? clause.packs.gacha_pack_id}
                                          </span>
                                          <span className="text-muted-foreground">× {clause.packs.quantity}</span>
                                          <Link
                                            href={`/games/${gameId}/items?tab=gacha&editPack=${clause.packs.gacha_pack_id}`}
                                            target="_blank"
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                            title={t('quest.openGachaPack')}
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </Link>
                                        </div>
                                      )}
                                      {/* Target for login etc */}
                                      {clause.target != null && (
                                        <div className="pl-2 text-xs text-muted-foreground">{t('quest.target')} {clause.target}</div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Rewards (item rewards only — coin rewards no longer supported) */}
                          {(() => {
                            const itemRewards = (q.rewards ?? []).filter(r => r.reward_type === "item")
                            if (itemRewards.length === 0) return null
                            return (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">{t('quest.rewards')} ({itemRewards.length})</p>
                                <div className="space-y-1">
                                  {itemRewards.map((r, ri) => (
                                    <div key={ri} className="border rounded px-3 py-2 bg-background text-sm flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs capitalize">{r.reward_type}</Badge>
                                      {r.item_definition_id && (() => {
                                        const def = rowItemDefs.find(d => d.id === r.item_definition_id)
                                        return (
                                          <span className="flex items-center gap-1.5 text-xs">
                                            <span className="font-medium">{def?.name ?? r.item_definition_id}</span>
                                            {def && <span className="text-muted-foreground font-mono">({def.item_code})</span>}
                                            <span className="text-muted-foreground">
                                              {r.quantity_min ?? 1}{r.quantity_max && r.quantity_max !== r.quantity_min ? `–${r.quantity_max}` : ""}
                                            </span>
                                            <Link
                                              href={`/games/${gameId}/items/${r.item_definition_id}`}
                                              target="_blank"
                                              className="text-muted-foreground hover:text-foreground transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                              title={t('quest.openItemDef')}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Link>
                                          </span>
                                        )
                                      })()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })()}

                          </div>

                          {/* Right column: Reward delivery override */}
                          {game && (
                            <div>
                              <QuestDeliveryOverride
                                quest={q}
                                game={game}
                                onUpdated={(updated) =>
                                  setQuests((prev) => prev.map((qd) => (qd.id === updated.id ? updated : qd)))
                                }
                              />
                            </div>
                          )}
                          </div>

                          {/* Timestamps */}
                          <div className="flex gap-6 text-xs text-muted-foreground">
                            <span>{t('quest.created')} {new Date(q.created_at).toLocaleString()}</span>
                            <span>{t('quest.updated')} {new Date(q.updated_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
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
            <SheetTitle>{t('quest.createQuestDef')}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{QuestForm}</div>
          <SheetFooter className="mt-6 sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="qactive-create"
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="qactive-create">{t('quest.active')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="outline" disabled={saving}>{t('common.cancel')}</Button>
              </SheetClose>
              <Button onClick={handleCreate} disabled={saving || !form.name.trim() || !(form.code_name ?? "").trim() || (form.conditions?.clauses ?? []).some((c) => isConditionLeaf(c) && !c.clause_id.trim())}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {t('common.submit')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet
        open={!!editQuest}
        onOpenChange={(o) => {
          if (!o) closeEdit()
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('quest.editQuestDef')}</SheetTitle>
            {editQuest && (
              <p className="flex items-center gap-0.5 text-xs text-muted-foreground font-mono mt-0.5">
                {editQuest.id}
                <CopyButton text={editQuest.id} size="h-3 w-3" />
              </p>
            )}
          </SheetHeader>
          <div className="mt-6">{QuestForm}</div>
          <SheetFooter className="mt-6 sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="qactive-edit"
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="qactive-edit">{t('quest.active')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="outline" disabled={saving}>{t('common.cancel')}</Button>
              </SheetClose>
              <Button onClick={handleEdit} disabled={saving || !form.name.trim() || !(form.code_name ?? "").trim() || (form.conditions?.clauses ?? []).some((c) => isConditionLeaf(c) && !c.clause_id.trim())}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteQuest} onOpenChange={(o) => { if (!o) setDeleteQuest(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quest.deleteQuest')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('quest.deleteQuestConfirm')} <strong>{deleteQuest?.name}</strong>{t('quest.deleteQuestUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Coming Soon Panel ─────────────────────────────────────────────────────────

function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
      <Clock className="h-12 w-12 opacity-30" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm opacity-70">{t('quest.comingSoon')}</p>
    </div>
  )
}

// ─── Inner Page (needs useSearchParams) ───────────────────────────────────────

function QuestsPageInner() {
  const { t } = useTranslation()
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
      .catch(() => toast({ variant: "destructive", title: t('common.error'), description: t('quest.failedLoadGame') }))
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
              <BreadcrumbLink href="/studios">{t('common.studios')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            {game?.studio_id && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/studios/${game.studio_id}`}>
                    {studio?.name || game.studio?.name || t('common.studio')}
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
              <span className="">{t('quest.quests')}</span>
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
              <h1 className="text-2xl font-bold">{t('quest.quests')}</h1>
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
                        {used.toLocaleString()} / {max.toLocaleString()} {t('quest.questsCount')}
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
                        title={t('quest.managePlugins')}
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
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="definitions" className="mt-6 space-y-4">
          <DefinitionsTab game={game} editQuestId={searchParams.get("editQuestId")} onGameUpdate={setGame} />
        </TabsContent>

        <TabsContent value="chains" className="mt-6 space-y-4">
          <ChainTab game={game} />
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <DailyTab game={game} onGameUpdate={setGame} />
        </TabsContent>

        <TabsContent value="battle-pass" className="mt-6">
          <ComingSoon title="Battle Pass" />
        </TabsContent>

        <TabsContent value="world-quest" className="mt-6">
          <ComingSoon title="World Quest" />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab game={game} onGameUpdate={setGame} />
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