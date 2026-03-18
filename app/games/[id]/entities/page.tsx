"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Plus, RefreshCw, Trash2, Pencil, Loader2, Search, X, Skull, ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
  SheetDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { getGame } from "@/lib/game-api"
import { ApiError } from "@/lib/api-client"
import { CopyButton } from "@/components/CopyButton"
import { GameNavButtons } from "@/components/GameNavButtons"
import {
  listEntityDefinitions,
  createEntityDefinition,
  updateEntityDefinition,
  deleteEntityDefinition,
  getEntityDefinitionByKey,
  getEntityDefinitionTypes,
} from "@/lib/entity-definition-api"
import type {
  EntityDefinition,
  EntityType,
  EntityRarity,
  CreateEntityDefinitionRequest,
  UpdateEntityDefinitionRequest,
} from "@/types/entity-definition"
import {
  ENTITY_TYPE_LABELS,
  ENTITY_RARITY_COLORS,
} from "@/types/entity-definition"
import type { Game } from "@/types/game"

// ─── helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_ENTITY_TYPES: EntityType[] = ["enemy", "boss", "room", "relic", "defense_unit", "npc"]
const ENTITY_RARITIES: EntityRarity[] = ["common", "uncommon", "rare", "epic", "legendary"]

function RarityBadge({ rarity }: { rarity?: EntityRarity }) {
  if (!rarity) return <span className="text-muted-foreground text-xs">—</span>
  const c = ENTITY_RARITY_COLORS[rarity]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.text} ${c.border} ${c.bg} capitalize`}
    >
      {rarity}
    </span>
  )
}

function EntityTypeBadge({ type }: { type: EntityType }) {
  return (
    <Badge variant="secondary" className="capitalize text-xs">
      {ENTITY_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

function tryParseJson(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

// ─── types ────────────────────────────────────────────────────────────────────

interface FormState {
  entity_key: string
  entity_type: EntityType
  name: string
  description: string
  icon_url: string
  rarity: EntityRarity | ""
  stats: string       // JSON string
  abilities: string   // JSON string
  metadata: string    // JSON string
}

const emptyForm = (): FormState => ({
  entity_key: "",
  entity_type: "enemy",
  name: "",
  description: "",
  icon_url: "",
  rarity: "",
  stats: "",
  abilities: "",
  metadata: "",
})

function entityToForm(e: EntityDefinition): FormState {
  return {
    entity_key: e.entity_key,
    entity_type: e.entity_type,
    name: e.name,
    description: e.description ?? "",
    icon_url: e.icon_url ?? "",
    rarity: e.rarity ?? "",
    stats: e.stats ? JSON.stringify(e.stats, null, 2) : "",
    abilities: e.abilities ? JSON.stringify(e.abilities, null, 2) : "",
    metadata: e.metadata ? JSON.stringify(e.metadata, null, 2) : "",
  }
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EntitiesPage() {
  const params = useParams<{ id: string }>()
  const gameId = params.id
  const router = useRouter()
  const { toast } = useToast()

  const [game, setGame] = useState<Game | null>(null)
  const [entities, setEntities] = useState<EntityDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<EntityType | "all">("all")
  const [availableTypes, setAvailableTypes] = useState<EntityType[]>(DEFAULT_ENTITY_TYPES)

  // ── name search (local) ─────────────────────────────────────────
  const [nameFilter, setNameFilter] = useState("")

  // ── key search (API) ──────────────────────────────────────────
  const [keyInput, setKeyInput] = useState("")
  const [keySearch, setKeySearch] = useState("")  // debounced value
  const [keyResult, setKeyResult] = useState<EntityDefinition | null | "not_found">(null)
  const [keyLoading, setKeyLoading] = useState(false)
  const keyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── sheet state ──────────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EntityDefinition | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})

  // ── delete dialog ────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<EntityDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── initial load ─────────────────────────────────────────────────────────────
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      try {
        const listParams = {
          type: typeFilter !== "all" ? typeFilter : undefined,
        }
        const [g, list] = await Promise.all([
          game ? Promise.resolve(game) : getGame(gameId),
          listEntityDefinitions(gameId, listParams),
        ])
        setGame(g)
        setEntities(list)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load entities"
        toast({ title: "Error", description: msg, variant: "destructive" })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [gameId, typeFilter, toast],
  )

  // Load game once on mount
  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => {})
  }, [gameId])

  // Fetch available entity types from API
  useEffect(() => {
    getEntityDefinitionTypes()
      .then((types) => setAvailableTypes(types as EntityType[]))
      .catch(() => {}) // keep defaults on failure
  }, [])

  // Re-fetch list when typeFilter changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Key search via API (debounced 400 ms)
  useEffect(() => {
    if (!keySearch.trim()) {
      setKeyResult(null)
      return
    }
    let cancelled = false
    setKeyLoading(true)
    getEntityDefinitionByKey(gameId, keySearch.trim())
      .then((entity) => { if (!cancelled) setKeyResult(entity) })
      .catch(() => { if (!cancelled) setKeyResult("not_found") })
      .finally(() => { if (!cancelled) setKeyLoading(false) })
    return () => { cancelled = true }
  }, [gameId, keySearch])

  function handleKeyInput(value: string) {
    setKeyInput(value)
    if (keyDebounceRef.current) clearTimeout(keyDebounceRef.current)
    keyDebounceRef.current = setTimeout(() => setKeySearch(value), 400)
  }

  function clearKeySearch() {
    setKeyInput("")
    setKeySearch("")
    setKeyResult(null)
  }

  // ── form helpers ─────────────────────────────────────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateJsonField(key: string, value: string): boolean {
    if (!value.trim()) {
      setJsonErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
      return true
    }
    try {
      JSON.parse(value)
      setJsonErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
      return true
    } catch {
      setJsonErrors((prev) => ({ ...prev, [key]: "Invalid JSON" }))
      return false
    }
  }

  function openCreate() {
    setEditTarget(null)
    setForm(emptyForm())
    setJsonErrors({})
    setSheetOpen(true)
  }

  function openEdit(entity: EntityDefinition) {
    setEditTarget(entity)
    setForm(entityToForm(entity))
    setJsonErrors({})
    setSheetOpen(true)
  }

  async function handleSave() {
    // Validate required fields
    if (!form.name.trim()) {
      toast({ title: "Validation", description: "Name is required", variant: "destructive" })
      return
    }
    if (!editTarget && !form.entity_key.trim()) {
      toast({ title: "Validation", description: "Entity key is required", variant: "destructive" })
      return
    }

    // Validate JSON fields
    const statsOk = validateJsonField("stats", form.stats)
    const abilitiesOk = validateJsonField("abilities", form.abilities)
    const metaOk = validateJsonField("metadata", form.metadata)
    if (!statsOk || !abilitiesOk || !metaOk) {
      toast({ title: "Validation", description: "Fix JSON errors before saving", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editTarget) {
        const body: UpdateEntityDefinitionRequest = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon_url: form.icon_url.trim() || undefined,
          rarity: form.rarity || undefined,
          stats: tryParseJson(form.stats),
          abilities: tryParseJson(form.abilities) as any,
          metadata: tryParseJson(form.metadata),
        }
        const updated = await updateEntityDefinition(gameId, editTarget.id, body)
        setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        toast({ title: "Saved", description: `"${updated.name}" updated` })
      } else {
        const body: CreateEntityDefinitionRequest = {
          entity_key: form.entity_key.trim(),
          entity_type: form.entity_type,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon_url: form.icon_url.trim() || undefined,
          rarity: form.rarity || undefined,
          stats: tryParseJson(form.stats),
          abilities: tryParseJson(form.abilities) as any,
          metadata: tryParseJson(form.metadata),
        }
        const created = await createEntityDefinition(gameId, body)
        setEntities((prev) => [...prev, created])
        toast({ title: "Created", description: `"${created.name}" created` })
      }
      setSheetOpen(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save entity"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEntityDefinition(gameId, deleteTarget.id)
      setEntities((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      toast({ title: "Deleted", description: `"${deleteTarget.name}" deleted` })
      setDeleteTarget(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete entity"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>Entities</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entity Definitions</h1>
            <p className="text-muted-foreground text-sm">
              Entity can be alot of thing
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="entities" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-semibold">Entities</h2>
          <p className="text-sm text-muted-foreground">
            {keyInput.trim()
              ? `Key search: "${keyInput.trim()}"`
              : nameFilter || typeFilter !== "all"
              ? `${(nameFilter ? entities.filter(e => e.name.toLowerCase().includes(nameFilter.toLowerCase())) : entities).length} filtered`
              : `${entities.length} ${entities.length === 1 ? "entity" : "entities"}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Name — local filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by name…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="h-8 w-40 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {nameFilter && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setNameFilter("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Key — API search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by key…"
              value={keyInput}
              onChange={(e) => handleKeyInput(e.target.value)}
              className="h-8 w-40 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {keyInput && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={clearKeySearch}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Type */}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EntityType | "all")}
          >
            <option value="all">All types</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>{ENTITY_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Entity
          </Button>
        </div>
      </div>

      {/* Key search result */}
      {keyInput.trim() && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Key search result for &ldquo;<span className="text-foreground font-mono">{keyInput.trim()}</span>&rdquo;
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {keyLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : keyResult === "not_found" ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No entity found for this key.</p>
            ) : keyResult ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rarity</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{keyResult.entity_key}</span>
                        <CopyButton text={keyResult.entity_key} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{keyResult.name}</div>
                      {keyResult.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[240px]">{keyResult.description}</div>
                      )}
                    </TableCell>
                    <TableCell><EntityTypeBadge type={keyResult.entity_type} /></TableCell>
                    <TableCell><RarityBadge rarity={keyResult.rarity} /></TableCell>
                    <TableCell>
                      <Badge variant={keyResult.is_active ? "default" : "secondary"}>
                        {keyResult.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(keyResult as EntityDefinition)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(keyResult as EntityDefinition)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Entity list table */}
      {!keyInput.trim() && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (() => {
              const displayed = nameFilter
                ? entities.filter((e) =>
                    e.name.toLowerCase().includes(nameFilter.toLowerCase()),
                  )
                : entities
              return displayed.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Skull className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No entities found</p>
                  <p className="text-sm mt-1">
                    {nameFilter || typeFilter !== "all"
                      ? "Try adjusting the filters."
                      : "Create your first entity definition to get started."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rarity</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayed.map((entity) => (
                      <TableRow key={entity.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>{entity.entity_key}</span>
                            <CopyButton text={entity.entity_key} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{entity.name}</div>
                          {entity.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {entity.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <EntityTypeBadge type={entity.entity_type} />
                        </TableCell>
                        <TableCell>
                          <RarityBadge rarity={entity.rarity} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={entity.is_active ? "default" : "secondary"}>
                            {entity.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(entity)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(entity)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            })()}
          </CardContent>
        </Card>
      )}



      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editTarget ? `Edit — ${editTarget.name}` : "New Entity Definition"}
            </SheetTitle>
            <SheetDescription>
              {editTarget
                ? "Update fields and save changes."
                : "Fill in the required fields to create a new entity."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* entity_key — only for create */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label htmlFor="entity_key">
                  Entity Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entity_key"
                  placeholder="e.g. goblin_archer"
                  value={form.entity_key}
                  onChange={(e) => setField("entity_key", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Unique slug identifier. Cannot be changed after creation.</p>
              </div>
            )}

            {/* entity_type — only for create */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label htmlFor="entity_type">
                  Entity Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.entity_type}
                  onValueChange={(v) => setField("entity_type", v as EntityType)}
                >
                  <SelectTrigger id="entity_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ENTITY_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Display name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>

            {/* description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                rows={2}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            {/* icon_url */}
            <div className="space-y-1.5">
              <Label htmlFor="icon_url">Icon URL</Label>
              <Input
                id="icon_url"
                placeholder="https://cdn.example.com/icons/..."
                value={form.icon_url}
                onChange={(e) => setField("icon_url", e.target.value)}
              />
            </div>

            {/* rarity */}
            <div className="space-y-1.5">
              <Label htmlFor="rarity">Rarity</Label>
              <Select
                value={form.rarity || "none"}
                onValueChange={(v) => setField("rarity", v === "none" ? "" : (v as EntityRarity))}
              >
                <SelectTrigger id="rarity">
                  <SelectValue placeholder="Select rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ENTITY_RARITIES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* stats */}
            <div className="space-y-1.5">
              <Label htmlFor="stats">Stats (JSON)</Label>
              <Textarea
                id="stats"
                placeholder={'{\n  "hp": 60,\n  "atk": 12\n}'}
                rows={4}
                value={form.stats}
                onChange={(e) => {
                  setField("stats", e.target.value)
                  validateJsonField("stats", e.target.value)
                }}
                className={jsonErrors.stats ? "border-destructive" : ""}
              />
              {jsonErrors.stats && (
                <p className="text-xs text-destructive">{jsonErrors.stats}</p>
              )}
            </div>

            {/* abilities */}
            <div className="space-y-1.5">
              <Label htmlFor="abilities">Abilities (JSON array)</Label>
              <Textarea
                id="abilities"
                placeholder={'[\n  {\n    "id": "ability_id",\n    "trigger": "on_hit",\n    "effect_type": "debuff"\n  }\n]'}
                rows={5}
                value={form.abilities}
                onChange={(e) => {
                  setField("abilities", e.target.value)
                  validateJsonField("abilities", e.target.value)
                }}
                className={jsonErrors.abilities ? "border-destructive" : ""}
              />
              {jsonErrors.abilities && (
                <p className="text-xs text-destructive">{jsonErrors.abilities}</p>
              )}
            </div>

            {/* metadata */}
            <div className="space-y-1.5">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <Textarea
                id="metadata"
                placeholder={'{\n  "drop_table": "goblin_common"\n}'}
                rows={3}
                value={form.metadata}
                onChange={(e) => {
                  setField("metadata", e.target.value)
                  validateJsonField("metadata", e.target.value)
                }}
                className={jsonErrors.metadata ? "border-destructive" : ""}
              />
              {jsonErrors.metadata && (
                <p className="text-xs text-destructive">{jsonErrors.metadata}</p>
              )}
            </div>
          </div>

          <SheetFooter className="gap-2">
            <SheetClose asChild>
              <Button variant="outline" disabled={saving}>
                Cancel
              </Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Entity"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">"{deleteTarget?.name}"</span>{" "}
              (<code className="font-mono text-xs">{deleteTarget?.entity_key}</code>).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
