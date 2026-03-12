"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  BarChart2, ArrowLeft, Plus, RefreshCw, Trash2, Pencil, Loader2,
  Route, Check, X, Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import type { Game } from "@/types/game"
import type { Studio } from "@/types/studio"
import { GameNavButtons } from "@/components/GameNavButtons"
import {
  listJourneys,
  createJourney,
  updateJourney,
  deleteJourney,
  type Journey,
  type CreateJourneyRequest,
  type UpdateJourneyRequest,
} from "@/lib/journey-api"
import { CopyButton } from "@/components/CopyButton"

// ─── Tab config ────────────────────────────────────────────────────────────────

type TabValue = "journey"

const TABS: { value: TabValue; label: string }[] = [
  { value: "journey", label: "Journey" },
]

const VALID_TABS = new Set<string>(TABS.map((t) => t.value))

// ─── Journey Tab ──────────────────────────────────────────────────────────────

interface JourneyTabProps {
  gameId: string
}

function JourneyTab({ gameId }: JourneyTabProps) {
  const { toast } = useToast()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateJourneyRequest>({
    name: "",
    journey_key: "",
    description: "",
    metadata: {},
  })
  const [createSaving, setCreateSaving] = useState(false)

  // Edit sheet
  const [editJourney, setEditJourney] = useState<Journey | null>(null)
  const [editForm, setEditForm] = useState<UpdateJourneyRequest>({})
  const [editSaving, setEditSaving] = useState(false)

  // Delete dialog
  const [deleteJourneyItem, setDeleteJourneyItem] = useState<Journey | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  // Metadata editor state (key-value pairs)
  const [createMetaRows, setCreateMetaRows] = useState<{ k: string; v: string }[]>([])
  const [editMetaRows, setEditMetaRows] = useState<{ k: string; v: string }[]>([])

  // Auto-slug state
  const [autoSlug, setAutoSlug] = useState(true)

  // Slugify function
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, "") // Remove invalid chars
      .trim()
      .replace(/\s+/g, "_") // Replace spaces with underscore
      .replace(/_+/g, "_") // Replace multiple underscores with single
  }

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await listJourneys(gameId)
      setJourneys(data)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load journeys" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gameId, toast])

  useEffect(() => { load() }, [load])

  // ── Create ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm({ name: "", journey_key: "", description: "", metadata: {} })
    setCreateMetaRows([])
    setAutoSlug(true) // Reset auto-slug when opening form
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.journey_key.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Name and Journey Key are required." })
      return
    }
    setCreateSaving(true)
    try {
      const meta: Record<string, string> = {}
      for (const row of createMetaRows) {
        if (row.k.trim()) meta[row.k.trim()] = row.v
      }
      await createJourney(gameId, { ...createForm, metadata: meta })
      toast({ title: "Journey created" })
      setCreateOpen(false)
      load(true)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create journey" })
    } finally {
      setCreateSaving(false)
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function openEdit(j: Journey) {
    setEditJourney(j)
    setEditForm({
      name: j.name,
      description: j.description ?? "",
      is_active: j.is_active,
      is_published: j.is_published,
      metadata: j.metadata ?? {},
    })
    const rows = Object.entries(j.metadata ?? {}).map(([k, v]) => ({ k, v }))
    setEditMetaRows(rows)
  }

  const handleEdit = async () => {
    if (!editJourney) return
    setEditSaving(true)
    try {
      const meta: Record<string, string> = {}
      for (const row of editMetaRows) {
        if (row.k.trim()) meta[row.k.trim()] = row.v
      }
      await updateJourney(gameId, editJourney.id, { ...editForm, metadata: meta })
      toast({ title: "Journey updated" })
      setEditJourney(null)
      load(true)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update journey" })
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteJourneyItem) return
    setDeleteSaving(true)
    try {
      await deleteJourney(gameId, deleteJourneyItem.id)
      toast({ title: "Journey deleted" })
      setDeleteJourneyItem(null)
      load(true)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete journey" })
    } finally {
      setDeleteSaving(false)
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  const handleToggleActive = async (j: Journey) => {
    try {
      await updateJourney(gameId, j.id, { is_active: !j.is_active })
      setJourneys(prev => prev.map(item => item.id === j.id ? { ...item, is_active: !j.is_active } : item))
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update journey" })
    }
  }

  // ── MetaEditor helper ───────────────────────────────────────────────────────

  const META_KEY_LIMIT = 50

  /** Count total keys including dotted-path nested keys (e.g. "a.b.c" = 1 key) */
  function countKeys(rows: { k: string; v: string }[]): number {
    return rows.filter(r => r.k.trim() !== "").length
  }

  function MetaEditor({
    rows,
    onChange,
  }: {
    rows: { k: string; v: string }[]
    onChange: (rows: { k: string; v: string }[]) => void
  }) {
    const used = countKeys(rows)
    const atLimit = used >= META_KEY_LIMIT

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Key / Value</span>
          <span className={atLimit ? "text-destructive font-medium" : ""}>
            {used} / {META_KEY_LIMIT} keys
          </span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder="key"
              value={row.k}
              onChange={e => {
                const next = [...rows]
                next[i] = { ...next[i], k: e.target.value }
                onChange(next)
              }}
              className="w-1/3"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              placeholder="value"
              value={row.v}
              onChange={e => {
                const next = [...rows]
                next[i] = { ...next[i], v: e.target.value }
                onChange(next)
              }}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={atLimit}
          title={atLimit ? `Maximum ${META_KEY_LIMIT} keys reached` : undefined}
          onClick={() => onChange([...rows, { k: "", v: "" }])}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add field
          {atLimit && <span className="ml-1 text-xs text-destructive">(limit reached)</span>}
        </Button>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{journeys.length} journey{journeys.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Journey
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : journeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Route className="h-10 w-10 opacity-30" />
          <p>No journeys yet. Create your first journey.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journeys.map(j => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">
                    <div>{j.name}</div>
                    {j.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{j.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{j.journey_key}</code>
                      <CopyButton text={j.journey_key} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={j.is_active}
                      onCheckedChange={() => handleToggleActive(j)}
                    />
                  </TableCell>
                  <TableCell>
                    {j.is_published ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(j.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(j)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteJourneyItem(j)}
                        disabled={j.journey_key === "main_story"}
                        title={j.journey_key === "main_story" ? "Main story journey cannot be deleted" : undefined}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Create Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Journey</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={createForm.name}
                onChange={e => {
                  const newName = e.target.value
                  setCreateForm(f => ({
                    ...f,
                    name: newName,
                    journey_key: autoSlug ? slugify(newName) : f.journey_key,
                  }))
                }}
                placeholder="Tutorial Journey"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Journey Key <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  value={createForm.journey_key}
                  onChange={e => {
                    setCreateForm(f => ({ ...f, journey_key: e.target.value }))
                    setAutoSlug(false) // Disable auto-slug when manually editing
                  }}
                  placeholder="tutorial_journey"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant={autoSlug ? "default" : "outline"}
                  size="icon"
                  onClick={() => {
                    const newAutoSlug = !autoSlug
                    setAutoSlug(newAutoSlug)
                    if (newAutoSlug) {
                      // Re-slug from current name when enabling
                      setCreateForm(f => ({ ...f, journey_key: slugify(f.name) }))
                    }
                  }}
                  title={autoSlug ? "Auto-slug enabled" : "Auto-slug disabled"}
                  className="shrink-0"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              {autoSlug && (
                <p className="text-xs text-muted-foreground">Journey key will auto-generate from name</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <span className="text-xs text-muted-foreground">
                  {(createForm.description ?? "").length} / 500
                </span>
              </div>
              <Textarea
                value={createForm.description ?? ""}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Journey description..."
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Metadata</Label>
              <MetaEditor rows={createMetaRows} onChange={setCreateMetaRows} />
            </div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleCreate} disabled={createSaving}>
              {createSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Sheet ──────────────────────────────────────────────────────── */}
      <Sheet open={!!editJourney} onOpenChange={open => { if (!open) setEditJourney(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Journey</SheetTitle>
          </SheetHeader>
          {editJourney && (
            <div className="space-y-4 mt-6">
              <div className="text-sm text-muted-foreground">
                <code className="text-xs">{editJourney.journey_key}</code>
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={editForm.name ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Journey name"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <span className="text-xs text-muted-foreground">
                    {(editForm.description ?? "").length} / 500
                  </span>
                </div>
                <Textarea
                  value={editForm.description ?? ""}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Active</Label>
                <Switch
                  id="edit-active"
                  checked={editForm.is_active ?? false}
                  onCheckedChange={v => setEditForm(f => ({ ...f, is_active: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-published">Published</Label>
                <Switch
                  id="edit-published"
                  checked={editForm.is_published ?? false}
                  onCheckedChange={v => setEditForm(f => ({ ...f, is_published: v }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Metadata</Label>
                <MetaEditor rows={editMetaRows} onChange={setEditMetaRows} />
              </div>
            </div>
          )}
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditJourney(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteJourneyItem} onOpenChange={open => { if (!open) setDeleteJourneyItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journey</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteJourneyItem?.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticPage() {
  const params = useParams<{ id: string }>()
  const gameId = params.id
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const rawTab = searchParams.get("tab") ?? "journey"
  const activeTab: TabValue = VALID_TABS.has(rawTab) ? (rawTab as TabValue) : "journey"

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
    if (value === "journey") {
      sp.delete("tab")
    } else {
      sp.set("tab", value)
    }
    const qs = sp.toString()
    router.push(`/games/${gameId}/analytic${qs ? `?${qs}` : ""}`)
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
              <span>Analytic</span>
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
              <BarChart2 className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Analytic</h1>
            </div>
            {game && (
              <p className="text-sm text-muted-foreground">{game.name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <GameNavButtons gameId={gameId} active="analytic" />
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

          <TabsContent value="journey" className="mt-6">
            <JourneyTab gameId={gameId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
