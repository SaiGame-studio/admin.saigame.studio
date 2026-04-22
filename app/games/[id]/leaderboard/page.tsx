"use client"

import React, { useEffect, useState, useCallback, Suspense, Fragment } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, RefreshCw, Pencil, Trophy, Loader2, ArrowLeft, Wand2, Hammer,
  ChevronDown, ChevronRight, Play, StopCircle, History, Trash2, CalendarIcon, Check, X, Info, ChevronsUpDown, Archive, Package, ExternalLink, BarChart2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getGame } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import { ApiError } from "@/lib/api-client"
import type { Game } from "@/types/game"
import type { Studio } from "@/types/studio"
import { GameNavButtons } from "@/components/GameNavButtons"
import { CopyButton } from "@/components/CopyButton"
import { LeaderboardTracingSetting } from "@/components/LeaderboardTracingSetting"
import { listGachaPacks, listItemDefinitions, getGachaPack, getItemDefinition } from "@/lib/inventory-api"
import type { GachaPack } from "@/types/inventory"
import type { ItemDefinition } from "@/types/inventory"
import {
  listBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  startSeason,
  endSeason,
  deleteSeason,
  getBoardHistory,
  getCurrentSeasonRaw,
  getSeasonArchive,
  getSeasonRawEvents,
  getResetScheduleOptions,
  getScoreSourceTypeOptions,
  type LeaderboardBoard,
  type LeaderboardSeason,
  type CurrentSeasonRaw,
  type SeasonRawEvents,
  type CreateBoardPayload,
  type UpdateBoardPayload,
  type ScoreMode,
  type SortDirection,
  type ResetSchedule,
  type ResetScheduleOption,
  type ScoreSourceTypeOption,
} from "@/lib/leaderboard-api"
import { getPlayerIdentityMapByUserIds, type PlayerIdentity } from "@/lib/game-user-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_MODE_OPTIONS: { value: ScoreMode; labelKey: string }[] = [
  { value: "sum", labelKey: "leaderboard.scoreMode_sum" },
  { value: "max", labelKey: "leaderboard.scoreMode_max" },
  { value: "min", labelKey: "leaderboard.scoreMode_min" },
  { value: "latest", labelKey: "leaderboard.scoreMode_latest" },
]

const SORT_DIRECTION_OPTIONS: { value: SortDirection; labelKey: string }[] = [
  { value: "DESC", labelKey: "leaderboard.sortDirection_DESC" },
  { value: "ASC", labelKey: "leaderboard.sortDirection_ASC" },
]

const RESET_SCHEDULE_OPTIONS: { value: ResetSchedule; labelKey: string }[] = [
  { value: "never", labelKey: "leaderboard.resetSchedule_never" },
  { value: "season", labelKey: "leaderboard.resetSchedule_season" },
  { value: "daily", labelKey: "leaderboard.resetSchedule_daily" },
  { value: "weekly", labelKey: "leaderboard.resetSchedule_weekly" },
  { value: "monthly", labelKey: "leaderboard.resetSchedule_monthly" },
]

interface BoardPreset {
  value: string
  labelKey: string
  name: string
  seasonName: string
  score_mode: ScoreMode
  sort_direction: SortDirection
  reset_schedule: ResetSchedule
  score_source_type: "gacha_pack_open_count" | "item_collected_count" | ""
}

const BOARD_PRESETS: BoardPreset[] = [
  { value: "daily_gacha_opens",       labelKey: "leaderboard.preset_dailyGachaOpens",       name: "Daily Gacha Opens",        seasonName: "Day {n}",   score_mode: "sum", sort_direction: "DESC", reset_schedule: "daily",   score_source_type: "gacha_pack_open_count" },
  { value: "weekly_gacha_opens",      labelKey: "leaderboard.preset_weeklyGachaOpens",      name: "Weekly Gacha Opens",       seasonName: "Week {n}",  score_mode: "sum", sort_direction: "DESC", reset_schedule: "weekly",  score_source_type: "gacha_pack_open_count" },
  { value: "monthly_item_collection", labelKey: "leaderboard.preset_monthlyItemCollection", name: "Monthly Item Collection",  seasonName: "Month {n}", score_mode: "sum", sort_direction: "DESC", reset_schedule: "monthly", score_source_type: "item_collected_count" },
  { value: "alltime_gacha_opens",     labelKey: "leaderboard.preset_alltimeGachaOpens",     name: "All-time Gacha Opens",     seasonName: "All-time",  score_mode: "sum", sort_direction: "DESC", reset_schedule: "never",   score_source_type: "gacha_pack_open_count" },
  { value: "alltime_item_collection", labelKey: "leaderboard.preset_alltimeItemCollection", name: "All-time Item Collection", seasonName: "All-time",  score_mode: "sum", sort_direction: "DESC", reset_schedule: "never",   score_source_type: "item_collected_count" },
]

const PRESET_CUSTOM_VALUE = "__custom__"
const MAX_BOARD_KEY_LEN = 64

function resetScheduleBadge(schedule: ResetSchedule) {
  switch (schedule) {
    case "daily":   return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
    case "weekly":  return "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700"
    case "monthly": return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700"
    case "season":  return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
    default:        return "bg-muted text-muted-foreground border-border"
  }
}

import { toSlugUnderscore } from "@/lib/utils"

function slugify(text: string): string {
  return toSlugUnderscore(text)
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0
  const s = Math.floor(abs / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  const w = Math.floor(d / 7)
  const mo = Math.floor(d / 30)
  const y = Math.floor(d / 365)
  let rel: string
  if (s < 60) rel = `${s}s`
  else if (m < 60) rel = `${m}m`
  else if (h < 24) rel = `${h}h`
  else if (d < 7) rel = `${d}d`
  else if (w < 5) rel = `${w}w`
  else if (mo < 12) rel = `${mo}mo`
  else rel = `${y}y`
  return future ? `in ${rel}` : `${rel} ago`
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

interface DateTimePickerProps {
  value: string | null
  onChange: (iso: string | null) => void
  placeholder?: string
}

function DateTimePicker({ value, onChange, placeholder }: DateTimePickerProps) {
  const { t } = useTranslation()
  const finalPlaceholder = placeholder ?? t('leaderboard.pickDateTime')
  const [open, setOpen] = useState(false)
  // draft state inside popover
  const [draftDate, setDraftDate] = useState<Date | undefined>(undefined)
  const [draftHour, setDraftHour] = useState("00")
  const [draftMinute, setDraftMinute] = useState("00")

  // Sync draft from value when popover opens
  const handleOpen = (next: boolean) => {
    if (next) {
      if (value) {
        const d = new Date(value)
        setDraftDate(d)
        setDraftHour(String(d.getHours()).padStart(2, "0"))
        setDraftMinute(String(d.getMinutes()).padStart(2, "0"))
      } else {
        const now = new Date()
        setDraftDate(now)
        setDraftHour(String(now.getHours()).padStart(2, "0"))
        setDraftMinute(String(now.getMinutes()).padStart(2, "0"))
      }
    }
    setOpen(next)
  }

  const handleConfirm = () => {
    if (!draftDate) return
    const d = new Date(draftDate)
    d.setHours(Number(draftHour), Number(draftMinute), 0, 0)
    onChange(d.toISOString())
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const display = value ? new Date(value).toLocaleString() : null

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {display
            ? <span className="flex-1">{display}</span>
            : <span className="flex-1 text-muted-foreground">{finalPlaceholder}</span>}
          {value && (
            <span
              role="button"
              aria-label="Clear"
              className="ml-2 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              ✕
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={draftDate}
          onSelect={(d) => d && setDraftDate(d)}
          initialFocus
        />
        <div className="border-t px-3 pb-3 pt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">{t('leaderboard.timeLabel')}</span>
            <Input
              className="h-8 w-16 text-center font-mono text-sm"
              maxLength={2}
              value={draftHour}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 2)
                if (Number(v) <= 23) setDraftHour(v.padStart(2, "0"))
              }}
            />
            <span className="font-bold">:</span>
            <Input
              className="h-8 w-16 text-center font-mono text-sm"
              maxLength={2}
              value={draftMinute}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 2)
                if (Number(v) <= 59) setDraftMinute(v.padStart(2, "0"))
              }}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
              onClick={() => {
                const now = new Date()
                setDraftDate(now)
                setDraftHour(String(now.getHours()).padStart(2, "0"))
                setDraftMinute(String(now.getMinutes()).padStart(2, "0"))
              }}
            >{t('leaderboard.nowBtn')}</Button>
            <Button
              type="button" variant="outline" size="sm" className="h-7 text-xs flex-1"
              onClick={() => {
                const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); tmr.setHours(0, 0, 0, 0)
                setDraftDate(tmr)
                setDraftHour("00")
                setDraftMinute("00")
              }}
            >{t('leaderboard.tmrBtn')}</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setOpen(false)}>{t('leaderboard.cancelBtn')}</Button>
            <Button type="button" size="sm" className="h-8" onClick={handleConfirm} disabled={!draftDate}>{t('leaderboard.confirmBtn')}</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Create Sheet ─────────────────────────────────────────────────────────────

interface CreateSheetProps {
  open: boolean
  onClose: () => void
  onCreated: (board: LeaderboardBoard) => void
  studioId: string
  gameId: string
}

function CreateSheet({ open, onClose, onCreated, studioId, gameId }: CreateSheetProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)
  const [scheduleFlash, setScheduleFlash] = useState(false)
  const scheduleFlashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scheduleOptions, setScheduleOptions] = useState<ResetScheduleOption[]>(
    RESET_SCHEDULE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey as any), description: "" }))
  )
  const [sourceTypeOptions, setSourceTypeOptions] = useState<ScoreSourceTypeOption[]>([])
  const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([])
  const [gachaPopoverOpen, setGachaPopoverOpen] = useState(false)
  const [gachaSearch, setGachaSearch] = useState("")
  const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([])
  const [itemPopoverOpen, setItemPopoverOpen] = useState(false)
  const [itemSearch, setItemSearch] = useState("")
  const [form, setForm] = useState<CreateBoardPayload>({
    board_key: "",
    name: "",
    description: "",
    score_mode: "sum",
    sort_direction: "DESC",
    reset_schedule: "never",
    score_source_type: "",
    score_source_ref_id: "",
    first_season_start_at: null,
    first_season_name: "",
  })
  const [presetValue, setPresetValue] = useState<string>(PRESET_CUSTOM_VALUE)

  const localizeResetScheduleOption = (opt: ResetScheduleOption): ResetScheduleOption => {
    const keyMap: Record<string, string> = {
      never: "leaderboard.resetSchedule_never",
      season: "leaderboard.resetSchedule_season",
      daily: "leaderboard.resetSchedule_daily",
      weekly: "leaderboard.resetSchedule_weekly",
      monthly: "leaderboard.resetSchedule_monthly",
    }
    const key = keyMap[opt.value]
    return key ? { ...opt, label: t(key as any) } : opt
  }

  const getResetScheduleLabel = (value: string, fallback?: string) => {
    const keyMap: Record<string, string> = {
      never: "leaderboard.resetSchedule_never",
      season: "leaderboard.resetSchedule_season",
      daily: "leaderboard.resetSchedule_daily",
      weekly: "leaderboard.resetSchedule_weekly",
      monthly: "leaderboard.resetSchedule_monthly",
    }
    const key = keyMap[value]
    return key ? t(key as any) : (fallback ?? value)
  }

  const getScoreSourceTypeLabel = (opt: ScoreSourceTypeOption) => {
    const value = opt.value.toLowerCase()
    if (value.includes("gacha")) return t('leaderboard.scoreSourceType_gachaPackOpenCount')
    if (value.includes("item")) return t('leaderboard.scoreSourceType_itemCollectedCount')
    return opt.label
  }

  const getScoreSourceTypeDesc = (opt: ScoreSourceTypeOption) => {
    const value = opt.value.toLowerCase()
    if (value.includes("gacha")) return t('leaderboard.scoreSourceTypeDesc_gachaPackOpenCount')
    if (value.includes("item")) return t('leaderboard.scoreSourceTypeDesc_itemCollectedCount')
    return opt.description
  }

  const getScoreSourceRefLabel = (opt: ScoreSourceTypeOption | undefined) => {
    if (!opt) return "score_source_ref_id"
    const value = opt.value.toLowerCase()
    if (value.includes("gacha")) return t('leaderboard.refLabel_gachaPackId')
    if (value.includes("item")) return t('leaderboard.refLabel_itemDefinitionId')
    return opt.ref_id_label
  }

  const localizeScoreSourceTypeOption = (opt: ScoreSourceTypeOption): ScoreSourceTypeOption => {
    const value = opt.value.toLowerCase()
    if (value.includes("gacha")) {
      return {
        ...opt,
        label: t('leaderboard.scoreSourceType_gachaPackOpenCount'),
        description: t('leaderboard.scoreSourceTypeDesc_gachaPackOpenCount'),
        ref_id_label: t('leaderboard.refLabel_gachaPackId'),
      }
    }
    if (value.includes("item")) {
      return {
        ...opt,
        label: t('leaderboard.scoreSourceType_itemCollectedCount'),
        description: t('leaderboard.scoreSourceTypeDesc_itemCollectedCount'),
        ref_id_label: t('leaderboard.refLabel_itemDefinitionId'),
      }
    }
    return opt
  }

  // Reset form + auto-slug when sheet opens
  useEffect(() => {
    if (open) {
      setForm({ board_key: "", name: "", description: "", score_mode: "sum", sort_direction: "DESC", reset_schedule: "never", score_source_type: "", score_source_ref_id: "", first_season_start_at: null, first_season_name: "" })
      setAutoSlug(true)
      setPresetValue(PRESET_CUSTOM_VALUE)
      getResetScheduleOptions()
        .then((opts) => {
          setScheduleOptions(opts.map(localizeResetScheduleOption))
          if (opts.length > 0) set("reset_schedule", opts[0].value)
        })
        .catch(() => { /* keep static fallback */ })
      getScoreSourceTypeOptions()
        .then((opts) => {
          const localizedOpts = opts.map(localizeScoreSourceTypeOption)
          setSourceTypeOptions(localizedOpts)
          if (localizedOpts.length > 0) {
            setForm((f) => ({
              ...f,
              score_source_type: f.score_source_type || localizedOpts[0].value,
            }))
          }
        })
        .catch(() => { /* non-blocking */ })
      // Pre-fetch gacha packs
      listGachaPacks({ gameId })
        .then((res) => setGachaPacks(res.packs ?? []))
        .catch(() => {})
      // Pre-fetch item definitions
      listItemDefinitions({ gameId }, { limit: 200 })
        .then((res) => setItemDefs(res.items ?? []))
        .catch(() => {})
    }
  }, [open])

  const set = (field: keyof CreateBoardPayload, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.nameRequired') })
      return
    }
    if (!form.board_key.trim()) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.boardKeyRequired') })
      return
    }
    if (!/^[a-z0-9_]+$/.test(form.board_key)) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.boardKeyInvalid') })
      return
    }
    if (form.board_key.length > MAX_BOARD_KEY_LEN) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.boardKeyTooLong') })
      return
    }
    const srcType = (form.score_source_type ?? "").trim()
    const srcRef = (form.score_source_ref_id ?? "").trim()
    if (!srcType) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.scoreSourceTypeRequired') })
      return
    }
    if (srcType && !srcRef) {
      const refLabel = sourceTypeOptions.find(o => o.value === srcType)?.ref_id_label ?? "score_source_ref_id"
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: `${refLabel} ${t('leaderboard.scoreSourceRefRequired')}` })
      return
    }
    setSaving(true)
    try {
      const trimmedSeasonName = (form.first_season_name ?? "").trim()
      const payload: CreateBoardPayload = {
        ...form,
        board_key: form.board_key.trim(),
        name: form.name.trim(),
        first_season_start_at: form.first_season_start_at ?? null,
        first_season_name: trimmedSeasonName ? trimmedSeasonName : null,
        score_source_type: srcType,
        score_source_ref_id: srcRef,
      }
      const board = await createBoard(studioId, gameId, payload)
      toast({ title: t('leaderboard.boardCreated'), description: `"${board.name}" ${t('leaderboard.boardCreatedDesc')}` })
      onCreated(board)
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedCreateBoard') })
      }
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = (presetVal: string) => {
    setPresetValue(presetVal)
    if (presetVal === PRESET_CUSTOM_VALUE) return
    const p = BOARD_PRESETS.find(x => x.value === presetVal)
    if (!p) return
    const hasSourceOpt = sourceTypeOptions.some(o => o.value === p.score_source_type)
    setForm((f) => ({
      ...f,
      name: p.name,
      board_key: autoSlug ? slugify(p.name) : f.board_key,
      first_season_name: p.seasonName,
      score_mode: p.score_mode,
      sort_direction: p.sort_direction,
      reset_schedule: p.reset_schedule,
      score_source_type: hasSourceOpt ? p.score_source_type : "",
      score_source_ref_id: hasSourceOpt ? f.score_source_ref_id : "",
    }))
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('leaderboard.createBoardTitle')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>{t('leaderboard.presetLabel')}</Label>
            <Select value={presetValue} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder={t('leaderboard.presetPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PRESET_CUSTOM_VALUE}>{t('leaderboard.preset_custom')}</SelectItem>
                {BOARD_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{t(p.labelKey as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('leaderboard.presetHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">{t('leaderboard.nameLabel')} <span className="text-destructive">*</span></Label>
            <Input
              id="c-name"
              placeholder={t('leaderboard.namePlaceholder')}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((f) => ({
                  ...f,
                  name,
                  board_key: autoSlug ? slugify(name) : f.board_key,
                }))
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-board_key">{t('leaderboard.boardKeyLabel')} <span className="text-destructive">*</span></Label>
            <div className="flex gap-1.5">
              <Input
                id="c-board_key"
                placeholder={t('leaderboard.boardKeyPlaceholder')}
                value={form.board_key}
                maxLength={MAX_BOARD_KEY_LEN}
                onChange={(e) => {
                  setAutoSlug(false)
                  set("board_key", e.target.value.toLowerCase())
                }}
                className="font-mono flex-1"
              />
              <button
                type="button"
                title={autoSlug ? t('leaderboard.autoSlugOnTitle') : t('leaderboard.autoSlugOffTitle')}
                onClick={() => {
                  const next = !autoSlug
                  setAutoSlug(next)
                  if (next) set("board_key", slugify(form.name))
                }}
                className={`shrink-0 h-9 w-9 rounded-md border flex items-center justify-center transition-colors ${
                  autoSlug
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                    : "bg-muted text-muted-foreground border-input hover:bg-accent"
                }`}
              >
                <Wand2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('leaderboard.boardKeyHint')}
              {autoSlug && <span className="text-primary ml-1">{t('leaderboard.autoGenFromName')}</span>}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-description">{t('leaderboard.descriptionLabel')}</Label>
            <Textarea
              id="c-description"
              placeholder={t('leaderboard.descPlaceholder')}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('leaderboard.scoreModeLabel')}</Label>
              <Select value={form.score_mode} onValueChange={(v) => set("score_mode", v as ScoreMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCORE_MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{t(o.labelKey as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('leaderboard.sortDirectionLabel')}</Label>
              <Select value={form.sort_direction} onValueChange={(v) => set("sort_direction", v as SortDirection)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_DIRECTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{t(o.labelKey as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {sourceTypeOptions.length > 0 && (() => {
            const selectedSourceType = sourceTypeOptions.find(o => o.value === form.score_source_type)
            const hasSource = !!form.score_source_type
            return (
              <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                <div className="space-y-1.5">
                  <Label>{t('leaderboard.scoreSourceTypeLabel')}</Label>
                  <Select
                    value={form.score_source_type}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, score_source_type: v, score_source_ref_id: "" }))
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sourceTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{getScoreSourceTypeLabel(o)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {hasSource && selectedSourceType?.description
                      ? getScoreSourceTypeDesc(selectedSourceType)
                      : t('leaderboard.scoreSourceTypeRequired')}
                  </p>
                </div>
                {hasSource && (
                <div className="space-y-1.5">
                  <Label htmlFor="c-score_source_ref_id">
                    {getScoreSourceRefLabel(selectedSourceType)} <span className="text-destructive">*</span>
                  </Label>
                  {(form.score_source_type ?? "").includes("gacha") ? (
                    <Popover open={gachaPopoverOpen} onOpenChange={setGachaPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-mono text-xs h-9"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate">
                            {form.score_source_ref_id
                              ? (gachaPacks.find(p => p.id === form.score_source_ref_id)?.name ?? form.score_source_ref_id)
                              : t('leaderboard.selectGachaPack')}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[340px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t('leaderboard.searchGachaPacks')}
                            value={gachaSearch}
                            onValueChange={setGachaSearch}
                          />
                          <CommandList>
                            <CommandEmpty>{t('leaderboard.noGachaPacks')}</CommandEmpty>
                            <CommandGroup>
                              {gachaPacks
                                .filter(p =>
                                  !gachaSearch ||
                                  p.name.toLowerCase().includes(gachaSearch.toLowerCase()) ||
                                  p.id.toLowerCase().includes(gachaSearch.toLowerCase())
                                )
                                .map((pack) => (
                                  <CommandItem
                                    key={pack.id}
                                    onSelect={() => {
                                      set("score_source_ref_id", pack.id)
                                      setGachaSearch("")
                                      setGachaPopoverOpen(false)
                                    }}
                                  >
                                    <Check className={`mr-2 h-3.5 w-3.5 ${form.score_source_ref_id === pack.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-medium truncate">{pack.name}</span>
                                      <span className="text-xs text-muted-foreground font-mono truncate">{pack.id}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (form.score_source_type ?? "").includes("item") ? (
                    <Popover open={itemPopoverOpen} onOpenChange={setItemPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-mono text-xs h-9"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate">
                            {form.score_source_ref_id
                              ? (itemDefs.find(d => d.id === form.score_source_ref_id)?.name ?? form.score_source_ref_id)
                              : t('leaderboard.selectItemDef')}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[340px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t('leaderboard.searchItemDefs')}
                            value={itemSearch}
                            onValueChange={setItemSearch}
                          />
                          <CommandList>
                            <CommandEmpty>{t('leaderboard.noItemDefs')}</CommandEmpty>
                            <CommandGroup>
                              {itemDefs
                                .filter(d =>
                                  !itemSearch ||
                                  d.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                  d.item_code.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                  d.id.toLowerCase().includes(itemSearch.toLowerCase())
                                )
                                .map((def) => (
                                  <CommandItem
                                    key={def.id}
                                    onSelect={() => {
                                      set("score_source_ref_id", def.id)
                                      setItemSearch("")
                                      setItemPopoverOpen(false)
                                    }}
                                  >
                                    <Check className={`mr-2 h-3.5 w-3.5 ${form.score_source_ref_id === def.id ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-medium truncate">{def.name}</span>
                                      <span className="text-xs text-muted-foreground font-mono truncate">{def.item_code} · {def.id}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input
                      id="c-score_source_ref_id"
                      placeholder={`${t('leaderboard.enterRefId')} ${selectedSourceType?.ref_id_label ?? "ref ID"}...`}
                      value={form.score_source_ref_id ?? ""}
                      onChange={(e) => set("score_source_ref_id", e.target.value.trim())}
                      className="font-mono"
                    />
                  )}
                </div>
                )}
              </div>
            )
          })()}
          <div className="space-y-1.5">
            <Label>{t('leaderboard.resetScheduleLabel')}</Label>
            <Select
              value={form.reset_schedule}
              onValueChange={(v) => {
                set("reset_schedule", v as ResetSchedule)
                setScheduleFlash(true)
                if (scheduleFlashTimer.current) clearTimeout(scheduleFlashTimer.current)
                scheduleFlashTimer.current = setTimeout(() => setScheduleFlash(false), 700)
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {scheduleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{getResetScheduleLabel(o.value, o.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div
              className={`rounded-md px-2.5 py-2 text-xs transition-all duration-500 ${
                scheduleFlash
                  ? "bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300"
                  : "bg-muted/40 border border-transparent text-muted-foreground"
              }`}
            >
              {t(`leaderboard.resetScheduleHint_${form.reset_schedule}` as any)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-first_season_start_at">{t('leaderboard.firstSeasonStartLabel')}</Label>
            <DateTimePicker
              value={form.first_season_start_at ?? null}
              onChange={(v) => set("first_season_start_at", v)}
              placeholder={t('leaderboard.firstSeasonStartPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('leaderboard.firstSeasonStartHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-first_season_name">{t('leaderboard.firstSeasonNameLabel')}</Label>
            <Input
              id="c-first_season_name"
              placeholder={t('leaderboard.firstSeasonNamePlaceholder')}
              value={form.first_season_name ?? ""}
              onChange={(e) => set("first_season_name", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('leaderboard.firstSeasonNameHint')}</p>
          </div>
          <SheetFooter className="gap-2 pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>{t('leaderboard.cancelBtn')}</Button>
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('leaderboard.createBoardBtn')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

interface EditSheetProps {
  board: LeaderboardBoard | null
  onClose: () => void
  onUpdated: (board: LeaderboardBoard) => void
  studioId: string
  gameId: string
}

function EditSheet({ board, onClose, onUpdated, studioId, gameId }: EditSheetProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<UpdateBoardPayload>({
    name: "",
    description: "",
    is_active: true,
  })

  useEffect(() => {
    if (board) {
      setForm({
        name: board.name,
        description: board.description,
        is_active: board.is_active,
      })
    }
  }, [board])

  if (!board) return null

  const set = (field: keyof UpdateBoardPayload, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim()) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.nameRequired') })
      return
    }
    setSaving(true)
    try {
      const payload: UpdateBoardPayload = { ...form }
      const updated = await updateBoard(studioId, gameId, board.id, payload)
      toast({ title: t('leaderboard.boardUpdated'), description: `"${updated.name}" ${t('leaderboard.boardUpdatedDesc')}` })
      onUpdated(updated)
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedUpdateBoard') })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={!!board} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('leaderboard.editBoardTitle')}</SheetTitle>
          <p className="text-sm text-muted-foreground font-mono">{board.board_key}</p>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">{t('leaderboard.nameLabel')} <span className="text-destructive">*</span></Label>
            <Input
              id="e-name"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-description">{t('leaderboard.descriptionLabel')}</Label>
            <Textarea
              id="e-description"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t('leaderboard.activeLabel')}</p>
              <p className="text-xs text-muted-foreground">{t('leaderboard.activeHint')}</p>
            </div>
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>
          <SheetFooter className="gap-2 pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>{t('leaderboard.cancelBtn')}</Button>
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('leaderboard.saveChangesBtn')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Start Season Dialog ──────────────────────────────────────────────────────

interface StartSeasonDialogProps {
  board: LeaderboardBoard | null
  onClose: () => void
  onStarted: (board: LeaderboardBoard) => void
  studioId: string
  gameId: string
}

function StartSeasonDialog({ board, onClose, onStarted, studioId, gameId }: StartSeasonDialogProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [seasonName, setSeasonName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (board) setSeasonName(`Season 1`)
  }, [board])

  if (!board) return null

  const handleStart = async () => {
    if (!seasonName.trim()) {
      toast({ variant: "destructive", title: t('leaderboard.validationTitle'), description: t('leaderboard.seasonNameRequired') })
      return
    }
    setSaving(true)
    try {
      await startSeason(studioId, gameId, board.id, seasonName.trim())
      toast({ title: t('leaderboard.seasonStarted'), description: `"${seasonName}" ${t('leaderboard.seasonStartedDesc')} "${board.name}".` })
      // Refresh board to get new season_id
      onStarted({ ...board })
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedStartSeason') })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AlertDialog open={!!board} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('leaderboard.startNewSeasonTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('leaderboard.startSeasonDesc')} <span className="font-semibold">{board.name}</span>.
            {board.season_id && ` ${t('leaderboard.currentSeasonRemains')}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2 space-y-1.5">
          <Label htmlFor="season-name">{t('leaderboard.seasonNameLabel')}</Label>
          <Input
            id="season-name"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder={t('leaderboard.seasonNamePlaceholder')}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{t('leaderboard.cancelBtn')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleStart} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('leaderboard.startSeasonBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── End Season Dialog ────────────────────────────────────────────────────────

interface EndSeasonDialogProps {
  board: LeaderboardBoard | null
  onClose: () => void
  onEnded: (board: LeaderboardBoard) => void
  studioId: string
  gameId: string
}

function EndSeasonDialog({ board, onClose, onEnded, studioId, gameId }: EndSeasonDialogProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)

  if (!board) return null

  const handleEnd = async () => {
    setSaving(true)
    try {
      const result = await endSeason(studioId, gameId, board.id)
      toast({
        title: t('leaderboard.seasonEnded'),
        description: `${t('leaderboard.seasonEndedDesc')} ${result.TopN?.length ?? 0}. ${t('leaderboard.seasonEndedNewSeason')}`,
      })
      onEnded({ ...board, season_id: result.NewSeasonID })
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedEndSeason') })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AlertDialog open={!!board} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('leaderboard.endCurrentSeasonTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('leaderboard.endSeasonDesc')} <span className="font-semibold">{board.name}</span>?
            {t('leaderboard.endSeasonConfirmDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{t('leaderboard.cancelBtn')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEnd}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('leaderboard.endSeasonBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Leaderboard Entries Sheet ────────────────────────────────────────────────

interface LeaderboardEntriesSheetProps {
  board: LeaderboardBoard | null
  studioId: string
  gameId: string
  onClose: () => void
}

function LeaderboardEntriesSheet({ board, studioId, gameId, onClose }: LeaderboardEntriesSheetProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<CurrentSeasonRaw | null>(null)
  const [rawData, setRawData] = useState<SeasonRawEvents | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [rawLoadError, setRawLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rawLoading, setRawLoading] = useState(false)
  const [refreshingTab, setRefreshingTab] = useState<"rank" | "raw" | null>(null)
  const [identities, setIdentities] = useState<Record<string, PlayerIdentity>>({})
  const [sourceRefName, setSourceRefName] = useState<string | null>(null)
  const [expandedRawRows, setExpandedRawRows] = useState<Set<string>>(new Set())
  const toggleRawRow = (id: string) =>
    setExpandedRawRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const loadCurrentSeasonData = useCallback(async (tab: "rank" | "raw" | null = null) => {
    if (!board || !board.season_id) return
    if (tab === "rank") setRefreshingTab("rank")
    else if (!tab) setLoading(true)
    setLoadError(false)
    try {
      const result = await getCurrentSeasonRaw(gameId, board.season_id)
      setData(result)
      const ids = result.entries.map((e) => e.user_id)
      if (ids.length > 0) {
        const map = await getPlayerIdentityMapByUserIds(ids, undefined, gameId)
        setIdentities(map)
      }
    } catch {
      setLoadError(true)
    } finally {
      if (tab === "rank") setRefreshingTab(null)
      else if (!tab) setLoading(false)
    }
  }, [board, studioId, gameId])

  const loadCurrentSeasonRawData = useCallback(async (tab: "raw" | null = null) => {
    if (!board || !board.season_id) return
    if (tab) setRefreshingTab(tab)
    else setRawLoading(true)
    setRawLoadError(false)
    try {
      const result = await getSeasonRawEvents(gameId, board.season_id)
      setRawData(result)
    } catch {
      setRawLoadError(true)
    } finally {
      if (tab) setRefreshingTab(null)
      else setRawLoading(false)
    }
  }, [board, gameId])

  useEffect(() => {
    if (!board) return
    setData(null)
    setRawData(null)
    setLoadError(false)
    setRawLoadError(false)
    setIdentities({})
    setSourceRefName(null)
    setExpandedRawRows(new Set())
    loadCurrentSeasonData()
    loadCurrentSeasonRawData()
    if (board.score_source_ref_id) {
      if (board.score_source_type?.includes("gacha")) {
        getGachaPack({ gameId: board.game_id }, board.score_source_ref_id)
          .then((res) => setSourceRefName(res.pack?.name ?? null))
          .catch(() => {})
      } else if (board.score_source_type?.includes("item")) {
        getItemDefinition({ gameId: board.game_id }, board.score_source_ref_id)
          .then((res) => setSourceRefName(res.item?.name ?? null))
          .catch(() => {})
      }
    }
  }, [board, loadCurrentSeasonData, loadCurrentSeasonRawData])

  const entries = data?.entries ?? []
  const rankEntries = [...entries].sort((a, b) => a.rank - b.rank)
  const rawEntries = rawData?.entries ?? []
  const emptyMessage = loadError ? t('leaderboard.noActiveSeasonOrFailed') : t('leaderboard.noEntriesYet')
  const rawEmptyMessage = rawLoadError ? t('leaderboard.failedLoadSessionRaw') : t('leaderboard.noRawEventsFound')

  return (
    <Sheet open={!!board} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            {board?.name} — {t('leaderboard.currentSeasonDataLabel')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Season & board details */}
              {data ? (
                <div className="rounded-md border p-4 bg-muted/30 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('leaderboard.boardLabel')}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    {board?.id && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">{t('leaderboard.boardIdLabel')}</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono break-all">{board.id}</p>
                          <CopyButton text={board.id} size="h-3 w-3" />
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">{t('leaderboard.boardKeyInfoLabel')}</p>
                      <div className="flex items-center gap-1">
                        <p className="font-mono break-all">{board?.board_key}</p>
                        {board?.board_key && <CopyButton text={board.board_key} size="h-3 w-3" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('leaderboard.scoreModeInfoLabel')}</p>
                      <Badge variant="outline" className="text-xs capitalize">{board?.score_mode}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('leaderboard.sortLabel')}</p>
                      <Badge variant="outline" className="text-xs">{board?.sort_direction}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('leaderboard.resetScheduleInfoLabel')}</p>
                      <Badge variant="outline" className={`text-xs capitalize border ${board ? resetScheduleBadge(board.reset_schedule) : ""}`}>{board?.reset_schedule}</Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-0.5">{t('leaderboard.scoreSourceInfoLabel')}</p>
                      {board?.score_source_ref_id ? (
                        board.score_source_type?.includes("gacha") ? (
                          <Link
                            href={`/games/${board.game_id}/items?tab=gacha&editPack=${board.score_source_ref_id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Archive className="h-3 w-3 shrink-0" />
                            <span className="font-medium">{sourceRefName ?? board.score_source_ref_id}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </Link>
                        ) : board.score_source_type?.includes("item") ? (
                          <Link
                            href={`/games/${board.game_id}/items/${board.score_source_ref_id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Package className="h-3 w-3 shrink-0" />
                            <span className="font-medium">{sourceRefName ?? board.score_source_ref_id}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </Link>
                        ) : (
                          <p className="font-mono break-all">{board.score_source_ref_id}</p>
                        )
                      ) : (
                        <p className="italic text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-1 border-t space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('leaderboard.seasonInfoLabel')}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="col-span-2">
                        <p className="text-muted-foreground">{t('leaderboard.seasonIdLabel')}</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono break-all">{data.season.id}</p>
                          <CopyButton text={data.season.id} size="h-3 w-3" />
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.nameLabel')}</p>
                        <p className="font-medium">{data.season.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.seasonNumberLabel')}</p>
                        <p className="font-medium">{data.season.season_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.startedAtLabel')}</p>
                        <p className="font-mono">{formatDate(data.season.started_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.endedAtLabel')}</p>
                        <p className="font-mono">{data.season.ended_at ? formatDate(data.season.ended_at) : "—"}</p>
                      </div>
                      {data.season.planned_end_at && (
                        <div>
                          <p className="text-muted-foreground">{t('leaderboard.plannedEndLabel')}</p>
                          <p className="font-mono">{formatDate(data.season.planned_end_at)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.totalEntriesLabel')}</p>
                        <p className="font-medium">{data.total}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <Tabs defaultValue="rank" className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rank">{t('leaderboard.rankDataLabel')}</TabsTrigger>
                  <TabsTrigger value="raw">{t('leaderboard.rawDataLabel')}</TabsTrigger>
                </TabsList>

                <TabsContent value="rank" className="mt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('leaderboard.rankingEntriesLabel')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                        {t('leaderboard.rankDataLabel')}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title={`${t('leaderboard.refreshTitle')} ${t('leaderboard.rankDataLabel')}`}
                        onClick={() => loadCurrentSeasonData("rank")}
                        disabled={loading || refreshingTab === "rank"}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingTab === "rank" ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 text-xs w-14 text-center">{t('leaderboard.rankLabel')}</TableHead>
                          <TableHead className="h-8 text-xs">{t('leaderboard.playerLabel')}</TableHead>
                          <TableHead className="h-8 text-xs text-right pr-4">{t('leaderboard.scoreLabel')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-8">
                              {emptyMessage}
                            </TableCell>
                          </TableRow>
                        ) : rankEntries.map((entry) => {
                          const identity = identities[entry.user_id]
                          const rankIcon = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null
                          return (
                            <TableRow key={`rank-${entry.user_id}`}>
                              <TableCell className="text-xs py-2 text-center font-bold">
                                {rankIcon ? <span>{rankIcon}</span> : `#${entry.rank}`}
                              </TableCell>
                              <TableCell className="text-xs py-2">
                                <p className="font-medium">{entry.display_name?.trim() || identity?.display_name || `player_${entry.user_id.slice(0, 8)}`}</p>
                                <div className="flex items-center gap-1">
                                  <p className="text-muted-foreground font-mono text-[10px]">{entry.user_id}</p>
                                  <CopyButton text={entry.user_id} size="h-3 w-3" />
                                </div>
                              </TableCell>
                              <TableCell className="text-xs py-2 font-mono font-semibold text-right pr-4">
                                {entry.score.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('leaderboard.rawEntriesLabel')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {t('leaderboard.rawDataLabel')}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title={`${t('leaderboard.refreshTitle')} ${t('leaderboard.rawDataLabel')}`}
                        onClick={() => loadCurrentSeasonRawData("raw")}
                        disabled={rawLoading || refreshingTab === "raw"}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingTab === "raw" ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  {rawLoading && rawEntries.length === 0 ? (
                    <div className="flex items-center justify-center py-16 rounded-md border">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : rawEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground rounded-md border">
                      {rawLoadError ? <Info className="h-8 w-8 opacity-40" /> : <Archive className="h-8 w-8 opacity-30" />}
                      <p className="text-sm">{rawEmptyMessage}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="h-8 w-6" />
                            <TableHead className="h-8 text-xs text-right">{t('leaderboard.deltaLabel')}</TableHead>
                            <TableHead className="h-8 text-xs">{t('leaderboard.playerLabel')}</TableHead>
                            <TableHead className="h-8 text-xs">{t('leaderboard.createdAtLabel')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rawEntries.map((entry) => {
                            const isExpanded = expandedRawRows.has(entry.id)
                            return (
                              <Fragment key={`raw-${entry.id}`}>
                                <TableRow
                                  className="text-xs cursor-pointer hover:bg-muted/40"
                                  onClick={() => toggleRawRow(entry.id)}
                                >
                                  <TableCell className="py-2 pl-3 pr-1 w-6">
                                    {isExpanded
                                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </TableCell>
                                  <TableCell className="py-2 text-right font-mono font-medium">
                                    <span className={entry.delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                                      {entry.delta >= 0 ? "+" : ""}{entry.delta.toLocaleString()}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">
                                    {entry.display_name?.trim() ? (
                                      <span className="font-medium">{entry.display_name}</span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-muted-foreground">{entry.user_id.slice(0, 8)}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2 font-mono text-muted-foreground whitespace-nowrap">{formatDate(entry.created_at)}</TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                                    <TableCell />
                                    <TableCell colSpan={3} className="py-3 pr-4">
                                      <div className="space-y-1.5 text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.rawRecordIdLabel')}</span>
                                          <span className="font-mono break-all">{entry.id}</span>
                                          <CopyButton text={entry.id} size="h-3 w-3" />
                                        </div>
                                        {entry.display_name?.trim() && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.playerLabel')}</span>
                                            <span className="font-medium">{entry.display_name}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.userIdLabel')}</span>
                                          <span className="font-mono break-all">{entry.user_id}</span>
                                          <CopyButton text={entry.user_id} size="h-3 w-3" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.sourceEventIdLabel')}</span>
                                          <span className="font-mono break-all">{entry.source_event_id ?? "—"}</span>
                                          {entry.source_event_id && <CopyButton text={entry.source_event_id} size="h-3 w-3" />}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.sourceSystemLabel')}</span>
                                          <span className="font-mono">{entry.source_system}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.processedAtLabel')}</span>
                                          <span className="font-mono">{entry.processed_at ? formatDate(entry.processed_at) : "—"}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              {data && data.total > entries.length && (
                <p className="text-xs text-muted-foreground text-right">
                  {t('leaderboard.showingEntries')} {entries.length} {t('leaderboard.ofEntries')} {data.total} {t('leaderboard.entriesLimit')} {data.limit})
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Season Archive Sheet ─────────────────────────────────────────────────────

interface ArchiveSheetProps {
  target: { board: LeaderboardBoard; season: LeaderboardSeason } | null
  studioId: string
  gameId: string
  onClose: () => void
}

const ARCHIVE_PAGE_SIZE = 100

function ArchiveSheet({ target, studioId, gameId, onClose }: ArchiveSheetProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"rank" | "raw">("rank")
  const [rankData, setRankData] = useState<CurrentSeasonRaw | null>(null)
  const [rawData, setRawData] = useState<SeasonRawEvents | null>(null)
  const [rankLoadError, setRankLoadError] = useState(false)
  const [rawLoadError, setRawLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rawLoading, setRawLoading] = useState(false)
  const [refreshingTab, setRefreshingTab] = useState<"rank" | "raw" | null>(null)
  const [offset, setOffset] = useState(0)
  const [identities, setIdentities] = useState<Record<string, PlayerIdentity>>({})
  const [expandedRawRows, setExpandedRawRows] = useState<Set<string>>(new Set())
  const toggleRawRow = (id: string) =>
    setExpandedRawRows(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const loadArchiveRankData = useCallback(async (nextOffset: number, tab: "rank" | null = null) => {
    if (!target) return
    if (tab) setRefreshingTab(tab)
    else setLoading(true)
    setRankLoadError(false)
    try {
      const result = await getSeasonArchive(gameId, target.season.id, nextOffset, ARCHIVE_PAGE_SIZE)
      setRankData(result)
      const ids = result.entries.map((e) => e.user_id)
      if (ids.length > 0) {
        const map = await getPlayerIdentityMapByUserIds(ids, undefined, gameId)
        setIdentities(map)
      }
    } catch {
      setRankLoadError(true)
    } finally {
      if (tab) setRefreshingTab(null)
      else setLoading(false)
    }
  }, [target, studioId, gameId])

  const loadArchiveRawData = useCallback(async (nextOffset: number, tab: "raw" | null = null) => {
    if (!target) return
    if (tab) setRefreshingTab(tab)
    else setRawLoading(true)
    setRawLoadError(false)
    try {
      const result = await getSeasonRawEvents(gameId, target.season.id, nextOffset, ARCHIVE_PAGE_SIZE)
      setRawData(result)
    } catch {
      setRawLoadError(true)
    } finally {
      if (tab) setRefreshingTab(null)
      else setRawLoading(false)
    }
  }, [target, studioId, gameId])

  useEffect(() => {
    if (!target) return
    setActiveTab("rank")
    setRankData(null)
    setRawData(null)
    setRankLoadError(false)
    setRawLoadError(false)
    setIdentities({})
    setOffset(0)
  }, [target])

  useEffect(() => {
    if (!target) return
    loadArchiveRankData(offset)
    loadArchiveRawData(offset)
  }, [target, offset, loadArchiveRankData, loadArchiveRawData])

  const totalItems = activeTab === "raw"
    ? rawData?.total ?? rankData?.total ?? 0
    : rankData?.total ?? rawData?.total ?? 0
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / ARCHIVE_PAGE_SIZE) : 0
  const currentPage = Math.floor(offset / ARCHIVE_PAGE_SIZE) + 1
  const rankEntries = [...(rankData?.entries ?? [])].sort((a, b) => a.rank - b.rank)
  const rawEntries = rawData?.entries ?? []
  const rankEmptyMessage = rankLoadError ? t('leaderboard.failedLoadArchive') : t('leaderboard.noArchivedEntries')
  const rawEmptyMessage = rawLoadError ? t('leaderboard.failedLoadSessionRaw') : t('leaderboard.noRawEventsFound')
  const seasonInfo = rankData?.season ?? target?.season ?? null
  const plannedEndAt = rankData?.season.planned_end_at ?? null

  return (
    <Sheet open={!!target} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            {target?.board.name} — {target?.season.name} {t('leaderboard.archiveDataLabel')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Board & Season info */}
              {seasonInfo ? (
                <div className="rounded-md border p-4 bg-muted/30 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('leaderboard.boardLabel')}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    {target?.board.id && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">{t('leaderboard.boardIdLabel')}</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono break-all">{target.board.id}</p>
                          <CopyButton text={target.board.id} size="h-3 w-3" />
                        </div>
                      </div>
                    )}
                    {target?.board.board_key && (
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.boardKeyInfoLabel')}</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono break-all">{target.board.board_key}</p>
                          <CopyButton text={target.board.board_key} size="h-3 w-3" />
                        </div>
                      </div>
                    )}
                    {target?.board.name && (
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.nameLabel')}</p>
                        <p className="font-medium">{target.board.name}</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-1 border-t space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('leaderboard.seasonInfoLabel')}</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="col-span-2">
                        <p className="text-muted-foreground">{t('leaderboard.seasonIdLabel')}</p>
                        <div className="flex items-center gap-1">
                          <p className="font-mono break-all">{seasonInfo.id}</p>
                          <CopyButton text={seasonInfo.id} size="h-3 w-3" />
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.nameLabel')}</p>
                        <p className="font-medium">{seasonInfo.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.seasonNumberLabel')}</p>
                        <p className="font-medium">{seasonInfo.season_number}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.startedAtLabel')}</p>
                        <p className="font-mono">{formatDate(seasonInfo.started_at)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.endedAtLabel')}</p>
                        <p className="font-mono">{seasonInfo.ended_at ? formatDate(seasonInfo.ended_at) : "—"}</p>
                      </div>
                      {plannedEndAt ? (
                        <div>
                          <p className="text-muted-foreground">{t('leaderboard.plannedEndLabel')}</p>
                          <p className="font-mono">{formatDate(plannedEndAt)}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-muted-foreground">{t('leaderboard.totalArchivedLabel')}</p>
                        <p className="font-medium">{totalItems}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Entries table */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "rank" | "raw")} className="space-y-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="rank">{t('leaderboard.rankDataLabel')}</TabsTrigger>
                  <TabsTrigger value="raw">{t('leaderboard.rawDataLabel')}</TabsTrigger>
                </TabsList>

                <TabsContent value="rank" className="mt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('leaderboard.finalRankEntriesLabel')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                        {t('leaderboard.rankDataLabel')}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title={`${t('leaderboard.refreshTitle')} ${t('leaderboard.rankDataLabel')}`}
                        onClick={() => loadArchiveRankData(offset, "rank")}
                        disabled={loading || refreshingTab === "rank"}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingTab === "rank" ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  {rankEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground rounded-md border">
                      {rankLoadError ? <Info className="h-8 w-8 opacity-40" /> : <Archive className="h-8 w-8 opacity-30" />}
                      <p className="text-sm">{rankEmptyMessage}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="h-8 text-xs w-[50px]">{t('leaderboard.rankLabel')}</TableHead>
                            <TableHead className="h-8 text-xs">{t('leaderboard.playerLabel')}</TableHead>
                            <TableHead className="h-8 text-xs text-right">{t('leaderboard.finalScoreLabel')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rankEntries.map((entry) => {
                            const identity = identities[entry.user_id]
                            return (
                              <TableRow key={`rank-${entry.id}`} className="text-xs">
                                <TableCell className="py-2 font-medium">
                                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col gap-0.5">
                                    {entry.display_name?.trim() ? (
                                      <span className="font-medium">{entry.display_name}</span>
                                    ) : identity?.username ? (
                                      <span className="font-medium">{identity.username}</span>
                                    ) : null}
                                    <span className="font-mono text-muted-foreground text-[10px] flex items-center gap-1">
                                      {entry.user_id}
                                      <CopyButton text={entry.user_id} size="h-3 w-3" />
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 text-right font-mono font-medium">
                                  {entry.score.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="mt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('leaderboard.rawEntriesLabel')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {t('leaderboard.rawDataLabel')}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        title={`${t('leaderboard.refreshTitle')} ${t('leaderboard.rawDataLabel')}`}
                        onClick={() => loadArchiveRawData(offset, "raw")}
                        disabled={rawLoading || refreshingTab === "raw"}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingTab === "raw" ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  {rawLoading && rawEntries.length === 0 ? (
                    <div className="flex items-center justify-center py-16 rounded-md border">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : rawEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground rounded-md border">
                      {rawLoadError ? <Info className="h-8 w-8 opacity-40" /> : <Archive className="h-8 w-8 opacity-30" />}
                      <p className="text-sm">{rawEmptyMessage}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="h-8 w-6" />
                            <TableHead className="h-8 text-xs text-right">{t('leaderboard.deltaLabel')}</TableHead>
                            <TableHead className="h-8 text-xs">{t('leaderboard.playerLabel')}</TableHead>
                            <TableHead className="h-8 text-xs">{t('leaderboard.createdAtLabel')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rawEntries.map((entry) => {
                            const isExpanded = expandedRawRows.has(entry.id)
                            return (
                              <Fragment key={`raw-${entry.id}`}>
                                <TableRow
                                  className="text-xs cursor-pointer hover:bg-muted/40"
                                  onClick={() => toggleRawRow(entry.id)}
                                >
                                  <TableCell className="py-2 pl-3 pr-1 w-6">
                                    {isExpanded
                                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </TableCell>
                                  <TableCell className="py-2 text-right font-mono font-medium">
                                    <span className={entry.delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                                      {entry.delta >= 0 ? "+" : ""}{entry.delta.toLocaleString()}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">
                                    {entry.display_name?.trim() ? (
                                      <span className="font-medium">{entry.display_name}</span>
                                    ) : (
                                      <span className="font-mono text-[10px] text-muted-foreground">{entry.user_id.slice(0, 8)}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2 font-mono text-muted-foreground whitespace-nowrap">{formatDate(entry.created_at)}</TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                                    <TableCell />
                                    <TableCell colSpan={3} className="py-3 pr-4">
                                      <div className="space-y-1.5 text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.rawRecordIdLabel')}</span>
                                          <span className="font-mono break-all">{entry.id}</span>
                                          <CopyButton text={entry.id} size="h-3 w-3" />
                                        </div>
                                        {entry.display_name?.trim() && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.playerLabel')}</span>
                                            <span className="font-medium">{entry.display_name}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.userIdLabel')}</span>
                                          <span className="font-mono break-all">{entry.user_id}</span>
                                          <CopyButton text={entry.user_id} size="h-3 w-3" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.sourceEventIdLabel')}</span>
                                          <span className="font-mono break-all">{entry.source_event_id ?? "—"}</span>
                                          {entry.source_event_id && <CopyButton text={entry.source_event_id} size="h-3 w-3" />}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.sourceSystemLabel')}</span>
                                          <span className="font-mono">{entry.source_system}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground w-28 shrink-0">{t('leaderboard.processedAtLabel')}</span>
                                          <span className="font-mono">{entry.processed_at ? formatDate(entry.processed_at) : "—"}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Pagination */}
              {totalItems > ARCHIVE_PAGE_SIZE && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{t('leaderboard.pageOf')} {currentPage} {t('leaderboard.ofPages')} {totalPages} · {totalItems} {t('leaderboard.totalLabel')}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      disabled={offset === 0 || loading}
                      onClick={() => setOffset(Math.max(0, offset - ARCHIVE_PAGE_SIZE))}
                    >
                      {t('leaderboard.prevBtn')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      disabled={offset + ARCHIVE_PAGE_SIZE >= totalItems || loading}
                      onClick={() => setOffset(offset + ARCHIVE_PAGE_SIZE)}
                    >
                      {t('leaderboard.nextBtn')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Board Row ────────────────────────────────────────────────────────────────

interface BoardRowProps {
  board: LeaderboardBoard
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onViewEntries: () => void
  onCreateSeason: (name: string, startAt: string | null) => Promise<void>
  onEndSeason: () => void
  onDeleteSeason: (seasonId: string) => void
  onViewArchive: (season: LeaderboardSeason) => void
  onRefreshSeasons: () => void
  onUpdateStatus: (board: LeaderboardBoard, is_active: boolean) => Promise<void>
  seasons: LeaderboardSeason[] | null
  seasonsLoading: boolean
}

function BoardRow({ board, expanded, onToggle, onEdit, onDelete, onViewEntries, onCreateSeason, onEndSeason, onDeleteSeason, onViewArchive, onRefreshSeasons, onUpdateStatus, seasons, seasonsLoading }: BoardRowProps) {
  const { t } = useTranslation()
  const [deleteSeasonConfirm, setDeleteSeasonConfirm] = useState<LeaderboardSeason | null>(null)
  const [showCreateRow, setShowCreateRow] = useState(false)
  const [newSeasonName, setNewSeasonName] = useState("")
  const [newSeasonStartAt, setNewSeasonStartAt] = useState("")
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingNextSeason, setSavingNextSeason] = useState(false)
  const [sourceRefName, setSourceRefName] = useState<string | null>(null)
  useEffect(() => {
    if (!expanded || !board.score_source_ref_id) return
    setSourceRefName(null)
    if (board.score_source_type?.includes("gacha")) {
      getGachaPack({ gameId: board.game_id }, board.score_source_ref_id)
        .then((res) => setSourceRefName(res.pack?.name ?? null))
        .catch(() => {})
    } else if (board.score_source_type?.includes("item")) {
      getItemDefinition({ gameId: board.game_id }, board.score_source_ref_id)
        .then((res) => setSourceRefName(res.item?.name ?? null))
        .catch(() => {})
    }
  }, [expanded, board.game_id, board.score_source_type, board.score_source_ref_id])
  const LS_KEY = "leaderboard-season-time-ago"
  const [showTimeAgo, setShowTimeAgo] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY) === "1" } catch { return false }
  })
  const toggleTimeAgo = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowTimeAgo(v => {
      try { localStorage.setItem(LS_KEY, v ? "0" : "1") } catch {}
      return !v
    })
  }
  // Use history data when available; fall back to board.season_id while loading
  const activeSeasonFromHistory = seasons != null
    ? seasons.find((s) => !s.ended_at) ?? null
    : null
  const hasSeason = seasons != null ? !!activeSeasonFromHistory : !!board.season_id
  // True only if a season has actually started and not yet ended
  const hasActiveSeasonNow = seasons != null
    ? seasons.some((s) => !s.ended_at && new Date(s.started_at) <= new Date())
    : !!board.season_id

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center gap-1.5">
            {expanded
              ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className="font-medium">{board.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground">{board.board_key}</span>
            <CopyButton text={board.board_key} size="h-3 w-3" />
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs capitalize">{board.score_mode}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{board.sort_direction}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={`text-xs capitalize border ${resetScheduleBadge(board.reset_schedule)}`}>{board.reset_schedule}</Badge>
        </TableCell>
        <TableCell>
          <Switch
            checked={board.is_active}
            onCheckedChange={(checked) => {
              onUpdateStatus(board, checked)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
        <TableCell>
          {hasSeason
            ? <Badge variant="default" className="text-xs bg-green-600">{t('leaderboard.hasSeason')}</Badge>
            : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={!hasActiveSeasonNow ? 0 : undefined}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!hasActiveSeasonNow}
                      onClick={onViewEntries}
                    >
                      <span className="text-sm leading-none">👑</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
                  {hasActiveSeasonNow ? t('leaderboard.viewCurrentSeasonData') : t('leaderboard.noActiveSeasonTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={t('leaderboard.editBoardTooltip')}
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              title={t('leaderboard.deleteBoardTooltip')}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={8} className="p-0">
            <div className="px-6 py-4 space-y-4 border-t border-dashed">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.boardIdLabel')}</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-xs break-all">{board.id}</p>
                    <CopyButton text={board.id} size="h-3 w-3" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.boardKeyInfoLabel')}</p>
                  <p className="font-mono text-xs">{board.board_key}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.scoreModeInfoLabel')}</p>
                  <Badge variant="outline" className="text-xs capitalize">{board.score_mode}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.sortDirectionInfoLabel')}</p>
                  <Badge variant="outline" className="text-xs">{board.sort_direction}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.resetScheduleInfoLabel')}</p>
                  <Badge variant="outline" className={`text-xs capitalize border ${resetScheduleBadge(board.reset_schedule)}`}>{board.reset_schedule}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.scoreSourceLabel')}</p>
                  {board.score_source_ref_id ? (
                    board.score_source_type?.includes("gacha") ? (
                      <Link
                        href={`/games/${board.game_id}/items?tab=gacha&editPack=${board.score_source_ref_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Archive className="h-3 w-3 shrink-0" />
                        <span className="font-medium">{sourceRefName ?? board.score_source_ref_id}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </Link>
                    ) : board.score_source_type?.includes("item") ? (
                      <Link
                        href={`/games/${board.game_id}/items/${board.score_source_ref_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="font-medium">{sourceRefName ?? board.score_source_ref_id}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                      </Link>
                    ) : (
                      <p className="font-mono text-xs break-all">{board.score_source_ref_id}</p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground italic">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.createdLabel')}</p>
                  <p className="text-xs">{formatDate(board.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.updatedInfoLabel')}</p>
                  <p className="text-xs">{formatDate(board.updated_at)}</p>
                </div>
              </div>
              {board.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('leaderboard.descriptionLabel')}</p>
                  <p className="text-sm">{board.description}</p>
                </div>
              )}
              {/* Season History */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1.5">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{t('leaderboard.seasonHistoryLabel')}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={seasonsLoading}
                      title={t('leaderboard.refreshSeasonHistoryTitle')}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRefreshSeasons()
                      }}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${seasonsLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(board.reset_schedule === "season" || (board.reset_schedule === "never" && !seasons?.some(s => !s.ended_at))) && !showCreateRow && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-green-600 border-green-600/40 hover:bg-green-50 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNewSeasonName(`Season ${(seasons?.length ?? 0) + 1}`)
                          setNewSeasonStartAt("")
                          setShowCreateRow(true)
                        }}
                      >
                        <Play className="h-3 w-3" />
                        {t('leaderboard.createSeasonBtn')}
                      </Button>
                    )}
                    {board.reset_schedule === "daily" && !showCreateRow && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-green-600 border-green-600/40 hover:bg-green-50 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNewSeasonName(`Season ${(seasons?.length ?? 0) + 1}`)
                          setNewSeasonStartAt("")
                          setShowCreateRow(true)
                        }}
                      >
                        <Play className="h-3 w-3" />
                        {t('leaderboard.createSeasonBtn')}
                      </Button>
                    )}
                    {board.reset_schedule === "daily" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-blue-600 border-blue-600/40 hover:bg-blue-50 hover:text-blue-700"
                        disabled={savingNextSeason}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setSavingNextSeason(true)
                          try {
                            const lastSeason = seasons && seasons.length > 0
                              ? [...seasons].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()).pop()!
                              : null
                            const nextStart = lastSeason
                              ? (() => {
                                  const d = new Date(lastSeason.started_at)
                                  d.setUTCDate(d.getUTCDate() + 1)
                                  d.setUTCHours(0, 0, 0, 0)
                                  return d.toISOString()
                                })()
                              : (() => {
                                  const d = new Date()
                                  d.setUTCDate(d.getUTCDate() + 1)
                                  d.setUTCHours(0, 0, 0, 0)
                                  return d.toISOString()
                                })()
                            const name = `Season ${(seasons?.length ?? 0) + 1}`
                            await onCreateSeason(name, nextStart)
                          } finally {
                            setSavingNextSeason(false)
                          }
                        }}
                      >
                        {savingNextSeason ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        {t('leaderboard.createNextSeasonBtn')}
                      </Button>
                    )}
                    {board.reset_schedule === "weekly" && !showCreateRow && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-green-600 border-green-600/40 hover:bg-green-50 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNewSeasonName(`Season ${(seasons?.length ?? 0) + 1}`)
                          setNewSeasonStartAt("")
                          setShowCreateRow(true)
                        }}
                      >
                        <Play className="h-3 w-3" />
                        {t('leaderboard.createSeasonBtn')}
                      </Button>
                    )}
                    {board.reset_schedule === "weekly" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-blue-600 border-blue-600/40 hover:bg-blue-50 hover:text-blue-700"
                        disabled={savingNextSeason}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setSavingNextSeason(true)
                          try {
                            const lastSeason = seasons && seasons.length > 0
                              ? [...seasons].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()).pop()!
                              : null
                            const nextStart = lastSeason
                              ? (() => {
                                  const d = new Date(lastSeason.started_at)
                                  d.setUTCDate(d.getUTCDate() + 7)
                                  d.setUTCHours(0, 0, 0, 0)
                                  return d.toISOString()
                                })()
                              : (() => {
                                  const d = new Date()
                                  d.setUTCDate(d.getUTCDate() + 7)
                                  d.setUTCHours(0, 0, 0, 0)
                                  return d.toISOString()
                                })()
                            const name = `Season ${(seasons?.length ?? 0) + 1}`
                            await onCreateSeason(name, nextStart)
                          } finally {
                            setSavingNextSeason(false)
                          }
                        }}
                      >
                        {savingNextSeason ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        {t('leaderboard.createNextSeasonBtn')}
                      </Button>
                    )}
                    {board.reset_schedule === "monthly" && !showCreateRow && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-green-600 border-green-600/40 hover:bg-green-50 hover:text-green-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNewSeasonName(`Season ${(seasons?.length ?? 0) + 1}`)
                          setNewSeasonStartAt("")
                          setShowCreateRow(true)
                        }}
                      >
                        <Play className="h-3 w-3" />
                        {t('leaderboard.createSeasonBtn')}
                      </Button>
                    )}
                    {board.reset_schedule === "monthly" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-blue-600 border-blue-600/40 hover:bg-blue-50 hover:text-blue-700"
                        disabled={savingNextSeason}
                        onClick={async (e) => {
                          e.stopPropagation()
                          setSavingNextSeason(true)
                          try {
                            const sortedSeasons = seasons && seasons.length > 0
                              ? [...seasons].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
                              : []
                            const lastSeason = sortedSeasons.length > 0 ? sortedSeasons[sortedSeasons.length - 1] : null
                            const nextStart = (() => {
                              // Prefer ended_at of last season; otherwise advance started_at by 1 month
                              const base = lastSeason?.ended_at
                                ? new Date(lastSeason.ended_at)
                                : lastSeason
                                  ? (() => {
                                      const d = new Date(lastSeason.started_at)
                                      d.setUTCMonth(d.getUTCMonth() + 1)
                                      d.setUTCDate(1)
                                      d.setUTCHours(0, 0, 0, 0)
                                      return d
                                    })()
                                  : (() => {
                                      const d = new Date()
                                      d.setUTCDate(1)
                                      d.setUTCMonth(d.getUTCMonth() + 1)
                                      d.setUTCHours(0, 0, 0, 0)
                                      return d
                                    })()
                              return base instanceof Date ? base.toISOString() : base
                            })()
                            const name = `Season ${(seasons?.length ?? 0) + 1}`
                            await onCreateSeason(name, nextStart)
                          } finally {
                            setSavingNextSeason(false)
                          }
                        }}
                      >
                        {savingNextSeason ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        {t('leaderboard.createNextSeasonBtn')}
                      </Button>
                    )}
                    {showCreateRow && (
                      <span className="text-xs text-muted-foreground italic">{t('leaderboard.fillNewSeasonBelow')}</span>
                    )}
                  </div>
                </div>
                {seasonsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('leaderboard.loadingSeasons')}
                  </div>
                ) : (showCreateRow || (seasons && seasons.length > 0)) ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 text-xs">{t('leaderboard.seasonIdLabel')}</TableHead>
                          <TableHead className="h-8 text-xs">{t('leaderboard.nameLabel')}</TableHead>
                          <TableHead className="h-8 text-xs">
                            <button
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                              title={showTimeAgo ? t('leaderboard.switchToFullDatetime') : t('leaderboard.switchToRelativeTime')}
                              onClick={toggleTimeAgo}
                            >
                              {t('leaderboard.startedAtLabel')}
                              <span className="text-[10px] font-normal opacity-60">{showTimeAgo ? t('leaderboard.agoSuffix') : t('leaderboard.absSuffix')}</span>
                            </button>
                          </TableHead>
                          <TableHead className="h-8 text-xs">{t('leaderboard.endedAtLabel')}</TableHead>
                          <TableHead className="h-8 text-xs">{t('leaderboard.rewardDispatchedLabel')}</TableHead>
                          <TableHead className="h-8 text-xs">{t('leaderboard.statusLabel')}</TableHead>
                          <TableHead className="h-8 text-xs w-[150px]">{t('leaderboard.actionsLabel')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {showCreateRow && (
                          <TableRow className="bg-green-500/5 border-b border-green-500/20">
                            <TableCell className="text-xs py-2 text-muted-foreground">—</TableCell>
                            <TableCell className="text-xs py-2">
                              <Input
                                value={newSeasonName}
                                onChange={(e) => setNewSeasonName(e.target.value)}
                                placeholder={t('leaderboard.seasonNameInputPlaceholder')}
                                className="h-6 text-xs px-2"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="text-xs py-2" colSpan={1}>
                              <div onClick={(e) => e.stopPropagation()}>
                                <DateTimePicker
                                  value={newSeasonStartAt || null}
                                  onChange={(iso) => setNewSeasonStartAt(iso ?? "")}
                                  placeholder={t('leaderboard.nowOptional')}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-2 text-muted-foreground">—</TableCell>
                            <TableCell className="text-xs py-2 text-muted-foreground">—</TableCell>
                            <TableCell className="text-xs py-2 text-muted-foreground">—</TableCell>
                            <TableCell className="text-xs py-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-6 text-xs gap-1 px-2 bg-green-600 hover:bg-green-700"
                                  disabled={savingCreate || !newSeasonName.trim()}
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    setSavingCreate(true)
                                    try {
                                      const startAt = newSeasonStartAt ? new Date(newSeasonStartAt).toISOString() : null
                                      await onCreateSeason(newSeasonName.trim(), startAt)
                                      setShowCreateRow(false)
                                      setNewSeasonName("")
                                      setNewSeasonStartAt("")
                                    } finally {
                                      setSavingCreate(false)
                                    }
                                  }}
                                >
                                  {savingCreate ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  {t('leaderboard.saveBtn')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => { e.stopPropagation(); setShowCreateRow(false) }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        {seasons?.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs py-2">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-muted-foreground break-all">{s.id}</span>
                                <CopyButton text={s.id} size="h-3 w-3" />
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-2 font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{showTimeAgo ? timeAgo(s.started_at) : formatDate(s.started_at)}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{showTimeAgo ? timeAgo(s.ended_at) : formatDate(s.ended_at)}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{s.reward_dispatched_at ? (showTimeAgo ? timeAgo(s.reward_dispatched_at) : formatDate(s.reward_dispatched_at)) : "—"}</TableCell>
                            <TableCell className="text-xs py-2">
                              {(() => {
                                const now = new Date()
                                const isUpcoming = new Date(s.started_at) > now
                                const isEnded = !!s.ended_at
                                if (isEnded) return <Badge variant="secondary" className="text-xs">{t('leaderboard.seasonStatusEnded')}</Badge>
                                if (isUpcoming) return (
                                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/40 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400">
                                    {t('leaderboard.seasonStatusUpcoming')}
                                  </Badge>
                                )
                                return (
                                  <Badge variant="default" className="text-xs bg-green-600 gap-1.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                                    </span>
                                    {t('leaderboard.seasonStatusActive')}
                                  </Badge>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="text-xs py-2">
                              {(() => {
                                const now = new Date()
                                const isUpcoming = new Date(s.started_at) > now
                                const isEnded = !!s.ended_at
                                const isActive = !isUpcoming && !isEnded
                                const isStarted = !isUpcoming
                                const canViewSeasonData = isEnded || isActive
                                const isNeverSchedule = board.reset_schedule === "never"
                                const endDisabled = !isActive || isNeverSchedule
                                const endTooltip = isNeverSchedule && isActive
                                  ? t('leaderboard.cannotEndNeverSchedule')
                                  : isUpcoming
                                  ? t('leaderboard.cannotEndUpcoming')
                                  : isEnded
                                  ? t('leaderboard.alreadyEnded')
                                  : undefined
                                return (
                                  <div className="flex items-center gap-1">
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span tabIndex={endDisabled ? 0 : undefined}>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-6 text-xs gap-1 px-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                                              disabled={endDisabled}
                                              onClick={(e) => { e.stopPropagation(); onEndSeason() }}
                                            >
                                              <StopCircle className="h-3 w-3" />
                                              {t('leaderboard.endBtn')}
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        {endDisabled && endTooltip && (
                                          <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
                                            {endTooltip}
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span tabIndex={isStarted ? 0 : undefined}>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                              disabled={isStarted}
                                              onClick={(e) => { e.stopPropagation(); setDeleteSeasonConfirm(s) }}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        {isStarted && (
                                          <TooltipContent side="top" className="text-xs max-w-[220px] text-center">
                                            {t('leaderboard.seasonStartedCannotDelete')}
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span tabIndex={!canViewSeasonData ? 0 : undefined}>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                              disabled={!canViewSeasonData}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (isEnded || isActive) onViewArchive(s)
                                              }}
                                            >
                                              <Archive className="h-3 w-3" />
                                            </Button>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs max-w-[200px] text-center">
                                          {isEnded
                                            ? t('leaderboard.viewArchiveData')
                                            : isActive
                                            ? t('leaderboard.viewCurrentSeasonRawData')
                                            : t('leaderboard.archiveAfterEnds')}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                )
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">{t('leaderboard.noSeasonsYet')}</p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      {/* Delete Season Confirmation */}
      {deleteSeasonConfirm && (
        <AlertDialog open={!!deleteSeasonConfirm} onOpenChange={(o) => { if (!o) setDeleteSeasonConfirm(null) }}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('leaderboard.deleteSeasonTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('leaderboard.deleteSeasonConfirm')} <strong>{deleteSeasonConfirm.name}</strong>{t('leaderboard.deleteSeasonUndone')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('leaderboard.cancelBtn')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { onDeleteSeason(deleteSeasonConfirm.id); setDeleteSeasonConfirm(null) }}
              >
                {t('leaderboard.deleteBtn')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}

// ─── Page Inner ───────────────────────────────────────────────────────────────

// ─── Tab config ────────────────────────────────────────────────────────────────

type LBTabValue = "boards" | "friends"

const LB_TABS: { value: LBTabValue; labelKey: string }[] = [
  { value: "boards", labelKey: "leaderboard.boardsTab" },
  { value: "friends", labelKey: "leaderboard.friendsTab" },
]

const VALID_LB_TABS = new Set<string>(LB_TABS.map((t) => t.value))

// ─── LeaderboardPageInner ─────────────────────────────────────────────────────

function LeaderboardPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()
  const gameId = params.id as string

  const [game, setGame] = useState<Game | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [gameLoading, setGameLoading] = useState(true)

  const [boards, setBoards] = useState<LeaderboardBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const expandedLsKey = `lb_expanded_${gameId}`
  const [expandedBoardId, setExpandedBoardIdRaw] = useState<string | null>(() => {
    try { return localStorage.getItem(`lb_expanded_${gameId}`) ?? null } catch { return null }
  })
  const setExpandedBoardId = (val: string | null | ((prev: string | null) => string | null)) => {
    setExpandedBoardIdRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val
      try {
        if (next) localStorage.setItem(expandedLsKey, next)
        else localStorage.removeItem(expandedLsKey)
      } catch {}
      return next
    })
  }
  const [createOpen, setCreateOpen] = useState(false)
  const [editBoard, setEditBoard] = useState<LeaderboardBoard | null>(null)
  const [entriesBoard, setEntriesBoard] = useState<LeaderboardBoard | null>(null)
  const [endSeasonBoard, setEndSeasonBoard] = useState<LeaderboardBoard | null>(null)
  const [deleteBoardItem, setDeleteBoardItem] = useState<LeaderboardBoard | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<{ board: LeaderboardBoard; season: LeaderboardSeason } | null>(null)
  const [seasonsMap, setSeasonsMap] = useState<Record<string, LeaderboardSeason[]>>({})
  const [seasonsLoadingIds, setSeasonsLoadingIds] = useState<Set<string>>(new Set())

  // Load game
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
      .catch(() => toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedLoadGame') }))
      .finally(() => setGameLoading(false))
  }, [gameId, toast])

  // Load boards
  const loadBoards = useCallback(async (showRefresh = false) => {
    if (!game?.studio_id) return
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await listBoards(game.studio_id, gameId)
      setBoards(data)
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedLoadLeaderboards') })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [game?.studio_id, gameId, toast])

  useEffect(() => {
    if (game?.studio_id) loadBoards()
  }, [game?.studio_id, loadBoards])

  // Restore expanded board's season history after boards load
  useEffect(() => {
    if (!expandedBoardId || !game?.studio_id || seasonsMap[expandedBoardId]) return
    setSeasonsLoadingIds((s) => new Set(s).add(expandedBoardId))
    getBoardHistory(game.studio_id, gameId, expandedBoardId)
      .then((seasons) => setSeasonsMap((m) => ({ ...m, [expandedBoardId]: seasons })))
      .catch(() => setSeasonsMap((m) => ({ ...m, [expandedBoardId]: [] })))
      .finally(() => setSeasonsLoadingIds((s) => { const n = new Set(s); n.delete(expandedBoardId); return n }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.studio_id, boards])

  const handleBoardCreated = (board: LeaderboardBoard) => {
    setBoards((prev) => [board, ...prev])
    getGame(gameId).then(setGame).catch(() => {})
  }

  const handleBoardUpdated = (board: LeaderboardBoard) => {
    setBoards((prev) => prev.map((b) => b.id === board.id ? board : b))
  }

  const handleDeleteBoard = async () => {
    if (!deleteBoardItem || !studioId) return
    setDeleting(true)
    try {
      await deleteBoard(studioId, gameId, deleteBoardItem.id)
      setBoards((prev) => prev.filter((b) => b.id !== deleteBoardItem.id))
      if (expandedBoardId === deleteBoardItem.id) setExpandedBoardId(null)
      toast({ title: t('leaderboard.boardDeleted'), description: `"${deleteBoardItem.name}" ${t('leaderboard.boardDeletedDesc')}` })
      setDeleteBoardItem(null)
      getGame(gameId).then(setGame).catch(() => {})
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedDeleteBoard') })
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleSeasonChange = (board: LeaderboardBoard) => {
    // Reload boards and refresh season history for this board
    loadBoards(true)
    if (game?.studio_id) {
      setSeasonsLoadingIds((s) => new Set(s).add(board.id))
      getBoardHistory(game.studio_id, gameId, board.id)
        .then((seasons) => setSeasonsMap((m) => ({ ...m, [board.id]: seasons })))
        .catch(() => setSeasonsMap((m) => ({ ...m, [board.id]: [] })))
        .finally(() => setSeasonsLoadingIds((s) => { const n = new Set(s); n.delete(board.id); return n }))
    }
  }

  const handleDeleteSeason = async (boardId: string, seasonId: string) => {
    if (!studioId) return
    try {
      await deleteSeason(studioId, gameId, boardId, seasonId)
      setSeasonsMap((m) => ({ ...m, [boardId]: (m[boardId] ?? []).filter((s) => s.id !== seasonId) }))
      loadBoards(true)
      toast({ title: t('leaderboard.seasonDeleted'), description: t('leaderboard.seasonDeletedDesc') })
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedDeleteSeason') })
      }
    }
  }

  const handleCreateSeason = async (board: LeaderboardBoard, name: string, startAt: string | null) => {
    if (!studioId) return
    try {
      await startSeason(studioId, gameId, board.id, name, startAt)
      toast({ title: t('leaderboard.seasonCreated'), description: `"${name}" ${t('leaderboard.seasonCreatedDesc')}` })
      handleSeasonChange(board)
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedCreateSeason') })
      }
      throw e
    }
  }

  const handleUpdateBoardStatus = async (board: LeaderboardBoard, is_active: boolean) => {
    if (!studioId) return
    try {
      const payload: UpdateBoardPayload = {
        name: board.name,
        board_key: board.board_key,
        is_active,
        score_mode: board.score_mode,
        sort_direction: board.sort_direction,
        reset_schedule: board.reset_schedule,
        score_source_type: board.score_source_type,
        score_source_ref_id: board.score_source_ref_id,
      }
      await updateBoard(studioId, gameId, board.id, payload)
      toast({ title: t('leaderboard.statusUpdated'), description: is_active ? t('leaderboard.statusUpdatedActive') : t('leaderboard.statusUpdatedInactive') })
      loadBoards(true)
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: t('leaderboard.errorTitle'), description: t('leaderboard.failedUpdateStatus') })
      }
    }
  }

  const handleToggleBoard = useCallback((board: LeaderboardBoard) => {
    const boardId = board.id
    setExpandedBoardId((prev) => prev === boardId ? null : boardId)
    // Fetch history on first expand
    if (expandedBoardId !== boardId && !seasonsMap[boardId] && game?.studio_id) {
      setSeasonsLoadingIds((s) => new Set(s).add(boardId))
      getBoardHistory(game.studio_id, gameId, board.id)
        .then((seasons) => setSeasonsMap((m) => ({ ...m, [boardId]: seasons })))
        .catch(() => setSeasonsMap((m) => ({ ...m, [boardId]: [] })))
        .finally(() => setSeasonsLoadingIds((s) => { const n = new Set(s); n.delete(boardId); return n }))
    }
  }, [expandedBoardId, seasonsMap, game?.studio_id, gameId])

  const handleRefreshBoardSeasons = useCallback((boardId: string) => {
    if (!game?.studio_id) return
    setSeasonsLoadingIds((s) => new Set(s).add(boardId))
    getBoardHistory(game.studio_id, gameId, boardId)
      .then((seasons) => setSeasonsMap((m) => ({ ...m, [boardId]: seasons })))
      .catch(() => setSeasonsMap((m) => ({ ...m, [boardId]: [] })))
      .finally(() => setSeasonsLoadingIds((s) => { const n = new Set(s); n.delete(boardId); return n }))
  }, [game?.studio_id, gameId])

  const studioId = game?.studio_id ?? ""

  const rawTab = searchParams.get("tab") ?? "boards"
  const activeTab: LBTabValue = VALID_LB_TABS.has(rawTab) ? (rawTab as LBTabValue) : "boards"

  const handleTabChange = (value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set("tab", value)
    router.push(`?${p.toString()}`, { scroll: false })
  }

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">{t('leaderboard.gamesLink')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>
                {gameLoading ? <span className="inline-block w-20 h-3 bg-muted animate-pulse rounded" /> : (game?.name ?? gameId)}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{t('leaderboard.leaderboardTitle')}</span>
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
              <Trophy className="h-5 w-5" />
              <h1 className="text-2xl font-bold">{t('leaderboard.leaderboardTitle')}</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="leaderboard" />
        </div>
      </div>

      {/* Tabs: 2-col header (TabsList + toolbar | tracing setting) + full-width content */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* 2-col header */}
        <div className="flex gap-6 items-start mb-4">
          {/* Col 1: tab triggers + boards toolbar */}
          <div className="flex-1 min-w-0 space-y-4">
            <TabsList>
              {LB_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {t(tab.labelKey as any)}
                </TabsTrigger>
              ))}
            </TabsList>
            {activeTab === "boards" && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {!loading && (
                    <Badge variant="secondary" className="text-xs">{boards.length}</Badge>
                  )}
                  {game?.limits?.max_leaderboards != null && (() => {
                    const used = game.usage?.leaderboards ?? 0
                    const max = game.limits.max_leaderboards!
                    const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
                    return (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className={used >= max ? "text-destructive font-medium" : ""}>
                          {used.toLocaleString()} / {max.toLocaleString()}
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
                          title={t('leaderboard.managePluginsTitle')}
                        >
                          <Hammer className="h-3.5 w-3.5" />
                        </Link>
                      </p>
                    )
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => loadBoards(true)}
                    disabled={refreshing || loading}
                    title={t('leaderboard.refreshTitle')}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                  {(() => {
                    const limitReached = game?.limits?.max_leaderboards != null && boards.length >= game.limits.max_leaderboards
                    return limitReached ? (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" disabled>
                                <Plus className="h-4 w-4 mr-1" />
                                {t('leaderboard.createBoardBtn')}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('leaderboard.limitReachedPrefix')} ({boards.length}/{game!.limits!.max_leaderboards}).{" "}
                            <Link href={`/games/${gameId}/plugins`} className="underline">{t('leaderboard.upgradePlugin')}</Link> {t('leaderboard.toAddMore')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setCreateOpen(true)}
                        disabled={!studioId}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('leaderboard.createBoardBtn')}
                      </Button>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
          {/* Col 2: Leaderboard tracing setting */}
          <div className="rounded-lg border px-4 py-3 bg-muted/30 shrink-0 w-[400px]">
            <LeaderboardTracingSetting gameId={gameId} game={game} />
          </div>
        </div>

        {/* Full-width content */}
        {activeTab === "boards" && (
          <Card>
          <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Trophy className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium">{t('leaderboard.noBoardsYet')}</p>
                <p className="text-sm text-muted-foreground">{t('leaderboard.createBoardHint')}</p>
              </div>
              {(() => {
                const limitReached = game?.limits?.max_leaderboards != null && boards.length >= game.limits.max_leaderboards
                return limitReached ? (
                  <>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" disabled>
                              <Plus className="h-4 w-4 mr-1" />
                              {t('leaderboard.createBoardBtn')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Leaderboard limit reached ({boards.length}/{game!.limits!.max_leaderboards}).{" "}
                          <Link href={`/games/${gameId}/plugins`} className="underline">Upgrade plugin</Link> to add more.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <p className="text-xs text-destructive">
                      {t('leaderboard.limitReachedDash')}{" "}
                      <Link href={`/games/${gameId}/plugins`} className="underline hover:text-destructive/80">{t('leaderboard.upgradePluginLink')}</Link>{" "}
                      {t('leaderboard.toCreateMore')}
                    </p>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!studioId}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('leaderboard.createBoardBtn')}
                  </Button>
                )
              })()}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('leaderboard.tableHeaderName')}</TableHead>
                  <TableHead>{t('leaderboard.tableHeaderKey')}</TableHead>
                  <TableHead>{t('leaderboard.tableHeaderScoreMode')}</TableHead>
                  <TableHead>{t('leaderboard.tableHeaderSort')}</TableHead>
                  <TableHead>{t('leaderboard.tableHeaderReset')}</TableHead>
                  <TableHead>{t('leaderboard.tableHeaderStatus')}</TableHead>
                  <TableHead>{t('leaderboard.tableHeaderSeason')}</TableHead>
                  <TableHead className="w-[80px]">{t('leaderboard.tableHeaderActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boards.map((board) => (
                  <BoardRow
                    key={board.id}
                    board={board}
                    expanded={expandedBoardId === board.id}
                    onToggle={() => handleToggleBoard(board)}
                    onEdit={() => setEditBoard(board)}
                    onDelete={() => setDeleteBoardItem(board)}
                    onViewEntries={() => setEntriesBoard(board)}
                    onCreateSeason={(name, startAt) => handleCreateSeason(board, name, startAt)}
                    onEndSeason={() => setEndSeasonBoard(board)}
                    onDeleteSeason={(seasonId) => handleDeleteSeason(board.id, seasonId)}
                    onViewArchive={(season) => setArchiveTarget({ board, season })}
                    onRefreshSeasons={() => handleRefreshBoardSeasons(board.id)}
                    onUpdateStatus={(board, is_active) => handleUpdateBoardStatus(board, is_active)}
                    seasons={seasonsMap[board.id] ?? null}
                    seasonsLoading={seasonsLoadingIds.has(board.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
          </CardContent>
          </Card>
        )}

        {activeTab === "friends" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 opacity-30" />
            <p className="font-medium">{t('leaderboard.friendsTitle')}</p>
            <p className="text-sm">{t('leaderboard.friendsDesc')}</p>
          </div>
        )}
      </Tabs>

      {/* Dialogs / Sheets */}
      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleBoardCreated}
        studioId={studioId}
        gameId={gameId}
      />
      <EditSheet
        board={editBoard}
        onClose={() => setEditBoard(null)}
        onUpdated={handleBoardUpdated}
        studioId={studioId}
        gameId={gameId}
      />
      <LeaderboardEntriesSheet
        board={entriesBoard}
        studioId={studioId}
        gameId={gameId}
        onClose={() => setEntriesBoard(null)}
      />
      <ArchiveSheet
        target={archiveTarget}
        studioId={studioId}
        gameId={gameId}
        onClose={() => setArchiveTarget(null)}
      />
      <EndSeasonDialog
        board={endSeasonBoard}
        onClose={() => setEndSeasonBoard(null)}
        onEnded={handleSeasonChange}
        studioId={studioId}
        gameId={gameId}
      />
      <AlertDialog open={!!deleteBoardItem} onOpenChange={(o) => { if (!o) setDeleteBoardItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('leaderboard.deleteBoardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('leaderboard.deleteBoardConfirm')} <strong>{deleteBoardItem?.name}</strong>{t('leaderboard.deleteBoardUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('leaderboard.cancelBtn')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {t('leaderboard.deleteBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LeaderboardPageInner />
    </Suspense>
  )
}
