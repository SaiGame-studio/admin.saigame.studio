"use client"

import React, { useEffect, useState, useCallback, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, RefreshCw, Pencil, Trophy, Loader2, ArrowLeft, Wand2,
  ChevronDown, ChevronRight, Play, StopCircle, History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
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
import { getGame } from "@/lib/game-api"
import { fetchStudioWithCache } from "@/lib/studio-api"
import { ApiError } from "@/lib/api-client"
import type { Game } from "@/types/game"
import type { Studio } from "@/types/studio"
import { GameNavButtons } from "@/components/GameNavButtons"
import {
  listBoards,
  createBoard,
  updateBoard,
  startSeason,
  endSeason,
  getBoardHistory,
  type LeaderboardBoard,
  type LeaderboardSeason,
  type CreateBoardPayload,
  type UpdateBoardPayload,
  type ScoreMode,
  type SortDirection,
  type ResetSchedule,
} from "@/lib/leaderboard-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_MODE_OPTIONS: { value: ScoreMode; label: string }[] = [
  { value: "sum", label: "Sum" },
  { value: "max", label: "Max" },
  { value: "min", label: "Min" },
  { value: "latest", label: "Latest" },
]

const SORT_DIRECTION_OPTIONS: { value: SortDirection; label: string }[] = [
  { value: "DESC", label: "Descending (highest first)" },
  { value: "ASC", label: "Ascending (lowest first)" },
]

const RESET_SCHEDULE_OPTIONS: { value: ResetSchedule; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "season", label: "Season" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
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
  const [saving, setSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)
  const [form, setForm] = useState<CreateBoardPayload>({
    board_key: "",
    name: "",
    description: "",
    score_mode: "sum",
    sort_direction: "DESC",
    reset_schedule: "never",
    max_score_delta: null,
  })

  // Reset form + auto-slug when sheet opens
  useEffect(() => {
    if (open) {
      setForm({ board_key: "", name: "", description: "", score_mode: "sum", sort_direction: "DESC", reset_schedule: "never", max_score_delta: null })
      setAutoSlug(true)
    }
  }, [open])

  const set = (field: keyof CreateBoardPayload, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Name is required." })
      return
    }
    if (!form.board_key.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Board Key is required." })
      return
    }
    if (!/^[a-z0-9_]+$/.test(form.board_key)) {
      toast({ variant: "destructive", title: "Validation", description: "Board Key may only contain lowercase letters, digits, and underscores." })
      return
    }
    setSaving(true)
    try {
      const payload: CreateBoardPayload = {
        ...form,
        board_key: form.board_key.trim(),
        name: form.name.trim(),
        max_score_delta: form.max_score_delta != null ? Number(form.max_score_delta) : null,
      }
      const board = await createBoard(studioId, gameId, payload)
      toast({ title: "Board created", description: `"${board.name}" created successfully.` })
      onCreated(board)
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: "Error", description: "Failed to create board." })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Leaderboard Board</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="c-name"
              placeholder="e.g. Global XP Leaderboard"
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
            <Label htmlFor="c-board_key">Board Key <span className="text-destructive">*</span></Label>
            <div className="flex gap-1.5">
              <Input
                id="c-board_key"
                placeholder="e.g. global_xp"
                value={form.board_key}
                onChange={(e) => {
                  setAutoSlug(false)
                  set("board_key", e.target.value.toLowerCase())
                }}
                className="font-mono flex-1"
              />
              <button
                type="button"
                title={autoSlug ? "Auto-slug is ON — click to disable" : "Auto-slug is OFF — click to re-enable"}
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
              Lowercase letters, digits, underscores only. Cannot be changed later.
              {autoSlug && <span className="text-primary ml-1">(auto-generated from name)</span>}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-description">Description</Label>
            <Textarea
              id="c-description"
              placeholder="Ranks players by total XP earned."
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Score Mode</Label>
              <Select value={form.score_mode} onValueChange={(v) => set("score_mode", v as ScoreMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCORE_MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sort Direction</Label>
              <Select value={form.sort_direction} onValueChange={(v) => set("sort_direction", v as SortDirection)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_DIRECTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reset Schedule</Label>
            <Select value={form.reset_schedule} onValueChange={(v) => set("reset_schedule", v as ResetSchedule)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESET_SCHEDULE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-max_score_delta">Max Score Delta</Label>
            <Input
              id="c-max_score_delta"
              type="number"
              placeholder="e.g. 10000 (leave empty for no limit)"
              value={form.max_score_delta ?? ""}
              onChange={(e) => set("max_score_delta", e.target.value === "" ? null : Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Maximum single-submission score change. Leave empty for unlimited.</p>
          </div>
          <SheetFooter className="gap-2 pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Board
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
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<UpdateBoardPayload>({
    name: "",
    description: "",
    is_active: true,
    max_score_delta: null,
  })

  useEffect(() => {
    if (board) {
      setForm({
        name: board.name,
        description: board.description,
        is_active: board.is_active,
        max_score_delta: board.max_score_delta,
      })
    }
  }, [board])

  if (!board) return null

  const set = (field: keyof UpdateBoardPayload, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Name is required." })
      return
    }
    setSaving(true)
    try {
      const payload: UpdateBoardPayload = {
        ...form,
        max_score_delta: form.max_score_delta != null ? Number(form.max_score_delta) : null,
      }
      const updated = await updateBoard(studioId, gameId, board.board_key, payload)
      toast({ title: "Board updated", description: `"${updated.name}" updated.` })
      onUpdated(updated)
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update board." })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={!!board} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Board</SheetTitle>
          <p className="text-sm text-muted-foreground font-mono">{board.board_key}</p>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="e-name"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-description">Description</Label>
            <Textarea
              id="e-description"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-max_score_delta">Max Score Delta</Label>
            <Input
              id="e-max_score_delta"
              type="number"
              placeholder="Leave empty for no limit"
              value={form.max_score_delta ?? ""}
              onChange={(e) => set("max_score_delta", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Whether this board accepts score submissions.</p>
            </div>
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>
          <SheetFooter className="gap-2 pt-2">
            <SheetClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
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
  const [seasonName, setSeasonName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (board) setSeasonName(`Season 1`)
  }, [board])

  if (!board) return null

  const handleStart = async () => {
    if (!seasonName.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Season name is required." })
      return
    }
    setSaving(true)
    try {
      await startSeason(studioId, gameId, board.board_key, seasonName.trim())
      toast({ title: "Season started", description: `Season "${seasonName}" started for board "${board.name}".` })
      // Refresh board to get new season_id
      onStarted({ ...board })
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: "Error", description: "Failed to start season." })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AlertDialog open={!!board} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start New Season</AlertDialogTitle>
          <AlertDialogDescription>
            Start a new season for <span className="font-semibold">{board.name}</span>.
            {board.season_id && " The current season will remain active until you end it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2 space-y-1.5">
          <Label htmlFor="season-name">Season Name</Label>
          <Input
            id="season-name"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder="e.g. Season 1"
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleStart} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Season
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
  const [saving, setSaving] = useState(false)

  if (!board) return null

  const handleEnd = async () => {
    setSaving(true)
    try {
      const result = await endSeason(studioId, gameId, board.board_key)
      toast({
        title: "Season ended",
        description: `Season ended. Top players: ${result.TopN?.length ?? 0}. A new season has been created.`,
      })
      onEnded({ ...board, season_id: result.NewSeasonID })
      onClose()
    } catch (e) {
      if (!(e instanceof ApiError)) {
        toast({ variant: "destructive", title: "Error", description: "Failed to end season." })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AlertDialog open={!!board} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Current Season</AlertDialogTitle>
          <AlertDialogDescription>
            End the current season for <span className="font-semibold">{board.name}</span>?
            This will finalize the leaderboard rankings and automatically start a new season.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEnd}
            disabled={saving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            End Season
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Board Row ────────────────────────────────────────────────────────────────

interface BoardRowProps {
  board: LeaderboardBoard
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onStartSeason: () => void
  onEndSeason: () => void
  seasons: LeaderboardSeason[] | null
  seasonsLoading: boolean
}

function BoardRow({ board, expanded, onToggle, onEdit, onStartSeason, onEndSeason, seasons, seasonsLoading }: BoardRowProps) {
  // Use history data when available; fall back to board.season_id while loading
  const activeSeasonFromHistory = seasons != null
    ? seasons.find((s) => !s.ended_at) ?? null
    : null
  const hasSeason = seasons != null ? !!activeSeasonFromHistory : !!board.season_id

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
          <span className="font-mono text-xs text-muted-foreground">{board.board_key}</span>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs capitalize">{board.score_mode}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{board.sort_direction}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs capitalize">{board.reset_schedule}</Badge>
        </TableCell>
        <TableCell>
          {board.is_active
            ? <Badge variant="default" className="text-xs">Active</Badge>
            : <Badge variant="secondary" className="text-xs">Inactive</Badge>}
        </TableCell>
        <TableCell>
          {hasSeason
            ? <Badge variant="default" className="text-xs bg-green-600">Season Active</Badge>
            : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Edit board"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
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
                  <p className="text-xs text-muted-foreground mb-0.5">Board ID</p>
                  <p className="font-mono text-xs break-all">{board.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Board Key</p>
                  <p className="font-mono text-xs">{board.board_key}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Score Mode</p>
                  <Badge variant="outline" className="text-xs capitalize">{board.score_mode}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Sort Direction</p>
                  <Badge variant="outline" className="text-xs">{board.sort_direction}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Reset Schedule</p>
                  <Badge variant="secondary" className="text-xs capitalize">{board.reset_schedule}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Max Score Delta</p>
                  <p className="text-sm">{board.max_score_delta != null ? board.max_score_delta.toLocaleString() : "Unlimited"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                  <p className="text-xs">{formatDate(board.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Updated</p>
                  <p className="text-xs">{formatDate(board.updated_at)}</p>
                </div>
              </div>
              {board.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                  <p className="text-sm">{board.description}</p>
                </div>
              )}
              {/* Season History */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1.5">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Season History</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!hasSeason ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-green-600 border-green-600/40 hover:bg-green-50 hover:text-green-700"
                        onClick={(e) => { e.stopPropagation(); onStartSeason() }}
                      >
                        <Play className="h-3 w-3" />
                        Start Season
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); onEndSeason() }}
                      >
                        <StopCircle className="h-3 w-3" />
                        End Season
                      </Button>
                    )}
                  </div>
                </div>
                {seasonsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading seasons...
                  </div>
                ) : seasons && seasons.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="h-8 text-xs">#</TableHead>
                          <TableHead className="h-8 text-xs">Name</TableHead>
                          <TableHead className="h-8 text-xs">Started At</TableHead>
                          <TableHead className="h-8 text-xs">Ended At</TableHead>
                          <TableHead className="h-8 text-xs">Reward Dispatched</TableHead>
                          <TableHead className="h-8 text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seasons.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs py-2">{s.season_number}</TableCell>
                            <TableCell className="text-xs py-2 font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{formatDate(s.started_at)}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{formatDate(s.ended_at)}</TableCell>
                            <TableCell className="text-xs py-2 font-mono">{s.reward_dispatched_at ? formatDate(s.reward_dispatched_at) : "—"}</TableCell>
                            <TableCell className="text-xs py-2">
                              {s.ended_at
                                ? <Badge variant="secondary" className="text-xs">Ended</Badge>
                                : <Badge variant="default" className="text-xs bg-green-600">Active</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">No seasons yet.</p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ─── Page Inner ───────────────────────────────────────────────────────────────

function LeaderboardPageInner() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const gameId = params.id as string

  const [game, setGame] = useState<Game | null>(null)
  const [studio, setStudio] = useState<Studio | null>(null)
  const [gameLoading, setGameLoading] = useState(true)

  const [boards, setBoards] = useState<LeaderboardBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editBoard, setEditBoard] = useState<LeaderboardBoard | null>(null)
  const [startSeasonBoard, setStartSeasonBoard] = useState<LeaderboardBoard | null>(null)
  const [endSeasonBoard, setEndSeasonBoard] = useState<LeaderboardBoard | null>(null)
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
      .catch(() => toast({ variant: "destructive", title: "Error", description: "Failed to load game" }))
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
        toast({ variant: "destructive", title: "Error", description: "Failed to load leaderboards." })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [game?.studio_id, gameId, toast])

  useEffect(() => {
    if (game?.studio_id) loadBoards()
  }, [game?.studio_id, loadBoards])

  const handleBoardCreated = (board: LeaderboardBoard) => {
    setBoards((prev) => [board, ...prev])
  }

  const handleBoardUpdated = (board: LeaderboardBoard) => {
    setBoards((prev) => prev.map((b) => b.id === board.id ? board : b))
  }

  const handleSeasonChange = (board: LeaderboardBoard) => {
    // Reload to get latest season info and invalidate seasons cache for this board
    setSeasonsMap((m) => { const n = { ...m }; delete n[board.id]; return n })
    loadBoards(true)
  }

  const handleToggleBoard = useCallback((board: LeaderboardBoard) => {
    const boardId = board.id
    setExpandedBoardId((prev) => prev === boardId ? null : boardId)
    // Fetch history on first expand
    if (expandedBoardId !== boardId && !seasonsMap[boardId] && game?.studio_id) {
      setSeasonsLoadingIds((s) => new Set(s).add(boardId))
      getBoardHistory(game.studio_id, gameId, board.board_key)
        .then((seasons) => setSeasonsMap((m) => ({ ...m, [boardId]: seasons })))
        .catch(() => setSeasonsMap((m) => ({ ...m, [boardId]: [] })))
        .finally(() => setSeasonsLoadingIds((s) => { const n = new Set(s); n.delete(boardId); return n }))
    }
  }, [expandedBoardId, seasonsMap, game?.studio_id, gameId])

  const studioId = game?.studio_id ?? ""

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
              <span>Leaderboard</span>
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
              <h1 className="text-2xl font-bold">Leaderboard</h1>
            </div>
            {game && (
              <p className="text-sm text-muted-foreground">{game.name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="leaderboard" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Boards</h2>
          {!loading && (
            <Badge variant="secondary" className="text-xs">{boards.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadBoards(true)}
            disabled={refreshing || loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={!studioId}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Board
          </Button>
        </div>
      </div>

      {/* Table */}
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
                <p className="font-medium">No leaderboard boards yet</p>
                <p className="text-sm text-muted-foreground">Create a board to start ranking players.</p>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!studioId}>
                <Plus className="h-4 w-4 mr-1" />
                Create Board
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Score Mode</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead>Reset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
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
                    onStartSeason={() => setStartSeasonBoard(board)}
                    onEndSeason={() => setEndSeasonBoard(board)}
                    seasons={seasonsMap[board.id] ?? null}
                    seasonsLoading={seasonsLoadingIds.has(board.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
      <StartSeasonDialog
        board={startSeasonBoard}
        onClose={() => setStartSeasonBoard(null)}
        onStarted={handleSeasonChange}
        studioId={studioId}
        gameId={gameId}
      />
      <EndSeasonDialog
        board={endSeasonBoard}
        onClose={() => setEndSeasonBoard(null)}
        onEnded={handleSeasonChange}
        studioId={studioId}
        gameId={gameId}
      />
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
