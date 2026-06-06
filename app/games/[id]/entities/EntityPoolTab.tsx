"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react"
import { toSlugUnderscore } from "@/lib/utils"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, RefreshCw, Trash2, Pencil, Save, Search, X, Loader2, ChevronRight, Skull, ExternalLink, ChevronsUpDown, Check, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useEscapeLayer } from "@/hooks/use-escape-manager"
import { useTranslation } from "@/lib/i18n/use-translation"
import { listEntityPools, getEntityPool, updateEntityPool, createEntityPool, deleteEntityPool, createEntityPoolEntry, updateEntityPoolEntry, deleteEntityPoolEntry, listEntityDefinitions } from "@/lib/entity-definition-api"
import { listGachaPacks } from "@/lib/inventory-api"
import type { GachaPack } from "@/types/inventory"
import { ApiError } from "@/lib/api-client"
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/storage-utils"
import { linkConversationContent } from "@/lib/llm-conversation-api"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import type { EntityPool, EntityPoolEntry, EntityRarity, EntityDefinition } from "@/types/entity-definition"
import { ENTITY_RARITY_COLORS, ENTITY_TYPE_LABELS } from "@/types/entity-definition"
import { CopyButton } from "@/components/CopyButton"
import { lsEntityPoolLinks, lsEntityPoolNames, lsPendingEntityPoolCreate } from "@/components/llm-conversations/conversation-panel-utils"
import { getEntityDefinitionByKey } from "@/lib/entity-definition-api"

// Backend limits — entity_pool.go:23-30
const MAX_POOLS_PER_GAME = 1000
const MAX_ENTRIES_PER_POOL = 200
const MAX_POOL_NAME_LENGTH = 128
const MAX_POOL_DESC_LENGTH = 500
const MIN_ENTRY_WEIGHT = 0
const MAX_ENTRY_WEIGHT = 10000
const DEFAULT_ENTRY_WEIGHT = 100
const MAX_POOL_CREATE_ENTRIES = 20

type CreatePoolEntryRow = {
  id: string
  entity_definition_id: string
  entity_definition_name: string
  entity_definition_key: string
  weight: string
}

type CreatePoolFormState = {
  pool_key: string
  name: string
  description: string
  is_active: boolean
  metadata: Record<string, unknown>
}

export function EntityPoolTab({ gameId }: { gameId: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const tRef = useRef(t)
  const toastRef = useRef(toast)
  tRef.current = t
  toastRef.current = toast

  const router = useRouter()
  const searchParams = useSearchParams()
  const expandedId = searchParams.get("poolExpanded")

  function setExpandedId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set("poolExpanded", id)
    else params.delete("poolExpanded")
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const [pools, setPools] = useState<EntityPool[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreatePoolFormState>({
    pool_key: "",
    name: "",
    description: "",
    is_active: true,
    metadata: {},
  })
  const [createEntries, setCreateEntries] = useState<CreatePoolEntryRow[]>([])
  const [creating, setCreating] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)
  const [createMetaKey, setCreateMetaKey] = useState<string | "__new__" | null>(null)
  const [createMetaFieldKey, setCreateMetaFieldKey] = useState("")
  const [createMetaFieldValue, setCreateMetaFieldValue] = useState("")
  const [createEntityConvContext, setCreateEntityConvContext] = useState<{
    turnId: string
    responseIdx: number
    entityPoolIdx: number
    convId: string
  } | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<EntityPool | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEscapeLayer(createOpen, () => setCreateOpen(false), 1)

  const genSlug = (name: string) => toSlugUnderscore(name)

  function newEntryRow(partial?: Partial<CreatePoolEntryRow>): CreatePoolEntryRow {
    return {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      entity_definition_id: partial?.entity_definition_id ?? "",
      entity_definition_name: partial?.entity_definition_name ?? "",
      entity_definition_key: partial?.entity_definition_key ?? "",
      weight: partial?.weight ?? String(DEFAULT_ENTRY_WEIGHT),
    }
  }

  function emptyCreateForm(): CreatePoolFormState {
    return {
      pool_key: "",
      name: "",
      description: "",
      is_active: true,
      metadata: {},
    }
  }

  function startCreateMetaEdit(key: string, currentValue: unknown) {
    setCreateMetaKey(key)
    setCreateMetaFieldKey(key)
    setCreateMetaFieldValue(String(currentValue ?? ""))
  }

  function startCreateAddMeta() {
    setCreateMetaKey("__new__")
    setCreateMetaFieldKey("")
    setCreateMetaFieldValue("")
  }

  function cancelCreateMetaEdit() {
    setCreateMetaKey(null)
    setCreateMetaFieldKey("")
    setCreateMetaFieldValue("")
  }

  function saveCreateMeta() {
    const key = createMetaFieldKey.trim()
    if (!key) return
    const raw = createMetaFieldValue
    const num = Number(raw)
    const val = raw.trim() !== "" && !isNaN(num) ? num : raw
    setCreateForm((prev) => {
      const next = { ...(prev.metadata ?? {}) }
      if (createMetaKey !== "__new__" && createMetaKey && createMetaKey !== key) {
        delete next[createMetaKey]
      }
      next[key] = val
      return { ...prev, metadata: next }
    })
    cancelCreateMetaEdit()
  }

  function deleteCreateMeta(key: string) {
    setCreateForm((prev) => {
      const next = { ...(prev.metadata ?? {}) }
      delete next[key]
      return { ...prev, metadata: next }
    })
    if (createMetaKey === key) cancelCreateMetaEdit()
  }

  async function resolveCreateEntryDraft(entry: Record<string, unknown>) {
    const rawId = typeof entry.entity_definition_id === 'string' ? entry.entity_definition_id.trim() : ""
    const rawKey = typeof entry.entity_definition_key === 'string'
      ? entry.entity_definition_key.trim()
      : (typeof entry.entity_key === 'string' ? entry.entity_key.trim() : "")
    const rawName = typeof entry.entity_definition_name === 'string'
      ? entry.entity_definition_name
      : (typeof entry.entity_name === 'string' ? entry.entity_name : rawKey || rawId)

    const candidateKey =
      rawId.startsWith("__REF:") ? rawId.slice("__REF:".length).trim()
      : rawKey || rawId

    if (candidateKey) {
      try {
        const searchKey = candidateKey.trim()
        const results = await listEntityDefinitions(gameId, { search: searchKey })
        const loweredKey = searchKey.toLowerCase()
        const entity = (results ?? []).find((candidate) => candidate.entity_key?.toLowerCase() === loweredKey) ?? null
        if (entity) {
          return newEntryRow({
            entity_definition_id: entity.id,
            entity_definition_name: entity.name,
            entity_definition_key: entity.entity_key,
            weight: typeof entry.weight === 'number'
              ? String(entry.weight)
              : (typeof entry.weight === 'string' ? entry.weight : String(DEFAULT_ENTRY_WEIGHT)),
          })
        }
      } catch {
        // fall back to raw draft below
      }
    }

    return newEntryRow({
      entity_definition_id: rawId,
      entity_definition_name: rawName,
      entity_definition_key: rawKey || rawId,
      weight: typeof entry.weight === 'number'
        ? String(entry.weight)
        : (typeof entry.weight === 'string' ? entry.weight : String(DEFAULT_ENTRY_WEIGHT)),
    })
  }

  async function openCreateWithForm(
    draft?: Record<string, unknown>,
    context?: {
      turnId: string
      responseIdx: number
      entityPoolIdx: number
      convId: string
    },
  ) {
    const rawMetadata = draft?.metadata
    const metadata = rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
      ? { ...(rawMetadata as Record<string, unknown>) }
      : (typeof rawMetadata === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(rawMetadata)
              return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined
            } catch {
              return undefined
            }
          })()
        : undefined)
    const description =
      typeof draft?.description === 'string' ? draft.description
      : ""
    const nextForm = draft
      ? {
        pool_key: typeof draft.pool_key === 'string' ? draft.pool_key : "",
        name: typeof draft.name === 'string' ? draft.name : "",
        description,
        is_active: typeof draft.is_active === 'boolean' ? draft.is_active : true,
        metadata: metadata ?? {},
      }
      : emptyCreateForm()
    const nextEntries = draft && Array.isArray(draft.entries)
      ? await Promise.all(
        draft.entries
          .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
          .slice(0, MAX_POOL_CREATE_ENTRIES)
          .map((entry) => resolveCreateEntryDraft(entry as Record<string, unknown>)),
      )
      : []
    setCreateForm(nextForm)
    cancelCreateMetaEdit()
    setCreateEntries(nextEntries.length > 0 ? nextEntries : [newEntryRow()])
    setAutoSlug(!(nextForm.pool_key?.trim()))
    setCreateEntityConvContext(context)
    setCreateOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "pools")
    params.set("create", "1")
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  async function resolveEntityDefinitionId(rawId: string) {
    const trimmed = rawId.trim()
    if (!trimmed) throw new Error("Entity definition ID is required.")
    if (trimmed.startsWith("__REF:")) {
      const entityKey = trimmed.slice("__REF:".length)
      const entity = await getEntityDefinitionByKey(gameId, entityKey)
      return entity.id
    }
    return trimmed
  }

  function addCreateEntry() {
    setCreateEntries(prev => {
      if (prev.length >= MAX_POOL_CREATE_ENTRIES) return prev
      return [...prev, newEntryRow()]
    })
  }

  function updateCreateEntry(id: string, patch: Partial<CreatePoolEntryRow>) {
    setCreateEntries(prev => prev.map(row => row.id === id ? { ...row, ...patch } : row))
  }

  function removeCreateEntry(id: string) {
    setCreateEntries(prev => prev.filter(row => row.id !== id))
  }

  const loadPools = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await listEntityPools(gameId)
      setPools(data)
    } catch (err) {
      toastRef.current({ title: tRef.current('common.error'), description: tRef.current('entity.failedLoad'), variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [gameId])

  useEffect(() => {
    loadPools()
  }, [loadPools])

  useEffect(() => {
    function consumePendingEntityPoolDraft() {
      const pendingRaw = safeGetItem(lsPendingEntityPoolCreate(gameId))
      if (!pendingRaw) return
      try {
        const detail = JSON.parse(pendingRaw) as Record<string, unknown>
        safeRemoveItem(lsPendingEntityPoolCreate(gameId))
        void openCreateWithForm(detail, {
          turnId: typeof detail.turnId === 'string' ? detail.turnId : '',
          responseIdx: typeof detail.responseIdx === 'number' ? detail.responseIdx : Number(detail.responseIdx ?? 0),
          entityPoolIdx: typeof detail.entityPoolIdx === 'number' ? detail.entityPoolIdx : Number(detail.entityPoolIdx ?? 0),
          convId: typeof detail.convId === 'string' ? detail.convId : '',
        })
      } catch {
        safeRemoveItem(lsPendingEntityPoolCreate(gameId))
      }
    }

    function handleOpenCreateEntityPool(e: Event) {
      const detail = (e as CustomEvent).detail as Record<string, unknown> | undefined
      if (!detail) return
      void openCreateWithForm(detail, {
        turnId: typeof detail.turnId === 'string' ? detail.turnId : '',
        responseIdx: typeof detail.responseIdx === 'number' ? detail.responseIdx : Number(detail.responseIdx ?? 0),
        entityPoolIdx: typeof detail.entityPoolIdx === 'number' ? detail.entityPoolIdx : Number(detail.entityPoolIdx ?? 0),
        convId: typeof detail.convId === 'string' ? detail.convId : '',
      })
    }

    window.addEventListener('ss:open-create-entity-pool', handleOpenCreateEntityPool as EventListener)

    if (searchParams.get("tab") === "pools" && searchParams.get("create") === "1") {
      consumePendingEntityPoolDraft()
    }

    return () => {
      window.removeEventListener('ss:open-create-entity-pool', handleOpenCreateEntityPool as EventListener)
    }
  }, [gameId, searchParams])

  const filteredPools = pools.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pool_key.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedId(expandedId === id ? null : id)
  }

  const handlePoolUpdated = (updated: EntityPool) => {
    setPools(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
  }

  const handleToggleActive = async (pool: EntityPool, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await updateEntityPool(gameId, pool.id, { is_active: !pool.is_active })
      handlePoolUpdated(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? (err as ApiError).message : t('entity.failedUpdate')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    }
  }

  const handleDeletePool = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteEntityPool(gameId, deleteTarget.id)
      setPools(prev => prev.filter(p => p.id !== deleteTarget.id))
      if (expandedId === deleteTarget.id) setExpandedId(null)
      toast({ title: t('common.deleted'), description: t('entity.poolDeleted').replace('{name}', deleteTarget.name) })
      setDeleteTarget(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDelete')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const handleCreatePool = async () => {
    if (!createForm.pool_key.trim() || !createForm.name.trim()) return
    if (createEntries.length === 0) {
      toast({ title: t('common.validation'), description: t('entity.fixJsonErrors'), variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      let created = await createEntityPool(gameId, {
        pool_key: createForm.pool_key.trim(),
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      })
      if ((createForm.metadata && Object.keys(createForm.metadata).length > 0) || createForm.is_active === false) {
        created = await updateEntityPool(gameId, created.id, {
          ...(createForm.metadata && Object.keys(createForm.metadata).length > 0 ? { metadata: createForm.metadata } : {}),
          ...(createForm.is_active === false ? { is_active: false } : {}),
        })
      }
      for (const entry of createEntries) {
        const entity_definition_id = await resolveEntityDefinitionId(entry.entity_definition_id)
        if (!entity_definition_id) {
          throw new Error(t('entity.fixJsonErrors'))
        }
        const weight = Number(entry.weight)
        if (!Number.isFinite(weight) || weight < MIN_ENTRY_WEIGHT || weight > MAX_ENTRY_WEIGHT) {
          throw new Error(t('entity.fixJsonErrors'))
        }
        await createEntityPoolEntry(gameId, created.id, { entity_definition_id, weight })
      }
      setPools(prev => [created, ...prev])
      if (createEntityConvContext?.convId && createEntityConvContext.turnId && createEntityConvContext.responseIdx != null && createEntityConvContext.entityPoolIdx != null) {
        const poolKey = `${createEntityConvContext.turnId}:${createEntityConvContext.responseIdx}:${createEntityConvContext.entityPoolIdx}`
        const convId = createEntityConvContext.convId
        const existingRaw = safeGetItem(lsEntityPoolLinks(convId))
        let mapped: Record<string, string> = {}
        if (existingRaw) {
          try {
            mapped = JSON.parse(existingRaw) as Record<string, string>
          } catch {
            mapped = {}
          }
        }
        safeSetItem(lsEntityPoolLinks(convId), JSON.stringify({ ...mapped, [poolKey]: created.id }))
        const existingNamesRaw = safeGetItem(lsEntityPoolNames(convId))
        let namesMap: Record<string, string> = {}
        if (existingNamesRaw) {
          try {
            namesMap = JSON.parse(existingNamesRaw) as Record<string, string>
          } catch {
            namesMap = {}
          }
        }
        safeSetItem(lsEntityPoolNames(convId), JSON.stringify({ ...namesMap, [created.id]: created.name }))
        void linkConversationContent(gameId, convId, 'entity_pool', created.id)
          .then(() => {
            window.dispatchEvent(new CustomEvent('ss:conv-external-created', {
              detail: { convId, gameId },
            }))
            window.dispatchEvent(new CustomEvent('ss:conv-content-linked', {
              detail: { convId, gameId, contentType: 'entity_pool', contentId: created.id, contentName: created.name },
            }))
          })
          .catch(() => { /* best-effort */ })
      }
      toast({ title: t('common.added'), description: `Pool "${created.name}" created` })
      setCreateOpen(false)
      setCreateForm(emptyCreateForm())
      cancelCreateMetaEdit()
      setCreateEntries([])
      setCreateEntityConvContext(undefined)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSave')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t('entity.poolTab')}</h2>
          <p className="text-sm text-muted-foreground">
            {refreshing ? t('common.loading') : `${filteredPools.length} ${t('entity.entitiesCount')} · ${pools.length}/${MAX_POOLS_PER_GAME}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('entity.poolSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-64 text-sm bg-muted/50 border-none focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => loadPools(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2"
            onClick={() => openCreateWithForm()}
            disabled={pools.length >= MAX_POOLS_PER_GAME}
            title={pools.length >= MAX_POOLS_PER_GAME ? t('entity.poolLimitReached').replace('{max}', String(MAX_POOLS_PER_GAME)) : undefined}
          >
            <Plus className="h-4 w-4" />
            {t('entity.newPool')}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Skull className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-semibold text-lg">{t('entity.noPoolsFound')}</p>
              <p className="text-sm mt-2 max-w-xs mx-auto opacity-70">{t('entity.createFirstPool')}</p>
              <Button variant="outline" size="sm" className="mt-6" onClick={() => openCreateWithForm()}>
                <Plus className="h-4 w-4 mr-2" /> {t('entity.newPool')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/50">
                    <TableHead className="w-12 text-center"></TableHead>
                    <TableHead className="font-semibold text-foreground/70">{t('entity.poolName')}</TableHead>
                    <TableHead className="font-semibold text-foreground/70">{t('entity.poolKey')}</TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-center">{t('entity.thActive')}</TableHead>
                    <TableHead className="font-semibold text-foreground/70">{t('entity.fieldCreated')}</TableHead>
                    <TableHead className="text-right font-semibold text-foreground/70 pr-6">{t('entity.thActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPools.map(pool => {
                    const isExpanded = expandedId === pool.id
                    return (
                      <Fragment key={pool.id}>
                        <TableRow
                          className={`group cursor-pointer transition-colors border-muted/30 ${isExpanded ? "bg-muted/40" : "hover:bg-muted/20"}`}
                          onClick={(e) => toggleExpand(pool.id, e)}
                        >
                          <TableCell className="text-center">
                            <div className="flex justify-center transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-foreground/90">{pool.name}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <Badge variant="outline" className="bg-muted/50 border-none px-2 py-0.5 font-mono text-[11px] h-auto">
                                {pool.pool_key}
                              </Badge>
                              <CopyButton text={pool.pool_key} />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={pool.is_active}
                              onClick={(e) => handleToggleActive(pool, e)}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(pool.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeleteTarget(pool) }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10 border-none">
                            <TableCell colSpan={6} className="p-0">
                              <PoolExpandedContent pool={pool} gameId={gameId} onSaved={handlePoolUpdated} />
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
        </CardContent>
      </Card>

      {/* Create Pool Sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreateEntityConvContext(undefined); setCreateEntries([]); cancelCreateMetaEdit() } }}>
        <SheetContent
          className="flex h-full flex-col overflow-hidden"
          style={{ width: "700px", maxWidth: "90vw" }}
        >
          <SheetHeader>
            <SheetTitle>{t('entity.newPool')}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('entity.poolName')} <span className="text-destructive">*</span></Label>
              <Input
                placeholder={t('entity.poolNamePlaceholder')}
                value={createForm.name}
                maxLength={MAX_POOL_NAME_LENGTH}
                onChange={(e) => {
                  const v = e.target.value.slice(0, MAX_POOL_NAME_LENGTH)
                  setCreateForm(f => ({
                    ...f,
                    name: v,
                    ...(autoSlug ? { pool_key: genSlug(v) } : {}),
                  }))
                }}
                disabled={creating}
              />
              <p className={`text-xs text-right ${createForm.name.length >= MAX_POOL_NAME_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                {createForm.name.length}/{MAX_POOL_NAME_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('entity.poolKey')} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('entity.poolKeyPlaceholder')}
                  value={createForm.pool_key}
                  onChange={(e) => {
                    setAutoSlug(false)
                    setCreateForm(f => ({ ...f, pool_key: e.target.value }))
                  }}
                  disabled={creating}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant={autoSlug ? "default" : "outline"}
                  size="icon"
                  className="shrink-0"
                  title={autoSlug ? t('entity.autoSlugOn') : t('entity.autoSlugOff')}
                  onClick={() => {
                    const next = !autoSlug
                    setAutoSlug(next)
                    if (next) {
                      setCreateForm(f => ({ ...f, pool_key: genSlug(f.name) }))
                    }
                  }}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('entity.fieldDescription')}</Label>
              <Textarea
                placeholder={t('entity.optionalDesc')}
                value={createForm.description}
                maxLength={MAX_POOL_DESC_LENGTH}
                onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value.slice(0, MAX_POOL_DESC_LENGTH) }))}
                disabled={creating}
                rows={3}
              />
              <p className={`text-xs text-right ${createForm.description.length >= MAX_POOL_DESC_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
                {createForm.description.length}/{MAX_POOL_DESC_LENGTH}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-muted/40 bg-muted/20 px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('entity.thActive')}</Label>
                <p className="text-xs text-muted-foreground">
                  Pool sẽ được lưu với trạng thái active ban đầu.
                </p>
              </div>
              <Switch
                checked={createForm.is_active}
                onCheckedChange={(checked) => setCreateForm((f) => ({ ...f, is_active: checked }))}
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('entity.fieldMetadata')}</Label>
              <div className="space-y-0.5">
                {Object.entries(createForm.metadata ?? {}).map(([k, v]) => (
                  <div key={k} className="group/meta">
                    {createMetaKey === k ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <Input value={createMetaFieldKey} onChange={(e) => setCreateMetaFieldKey(e.target.value)} placeholder={t('entity.metaKeyPlaceholder')} className="h-7 text-xs w-32 font-mono" disabled={creating} />
                        <span className="text-muted-foreground text-xs">:</span>
                        <Input value={createMetaFieldValue} onChange={(e) => setCreateMetaFieldValue(e.target.value)} placeholder={t('entity.metaValuePlaceholder')} className="h-7 text-xs flex-1 font-mono" disabled={creating} />
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveCreateMeta} disabled={creating}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelCreateMetaEdit} disabled={creating}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50">
                        <span className="text-xs font-mono text-muted-foreground w-32 truncate shrink-0">{k}</span>
                        <span className="text-xs text-muted-foreground">:</span>
                        <span className="text-xs font-mono flex-1">{String(v)}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-0 group-hover/meta:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteCreateMeta(k)} disabled={creating}><X className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                {createMetaKey === "__new__" ? (
                  <div className="flex items-center gap-1.5 py-0.5 mt-1">
                    <Input value={createMetaFieldKey} onChange={(e) => setCreateMetaFieldKey(e.target.value)} placeholder={t('entity.metaKeyPlaceholder')} className="h-7 text-xs w-32 font-mono" disabled={creating} autoFocus />
                    <span className="text-muted-foreground text-xs">:</span>
                    <Input value={createMetaFieldValue} onChange={(e) => setCreateMetaFieldValue(e.target.value)} placeholder={t('entity.metaValuePlaceholder')} className="h-7 text-xs flex-1 font-mono" disabled={creating} />
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveCreateMeta} disabled={creating}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelCreateMetaEdit} disabled={creating}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 mt-1" onClick={startCreateAddMeta} disabled={creating || createMetaKey !== null}>
                    <Plus className="w-3 h-3" /> {t('entity.addField')}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t('entity.poolEntries')}</Label>
                <span className="text-xs text-muted-foreground">
                  {createEntries.length}/{MAX_POOL_CREATE_ENTRIES}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('entity.poolEntriesHint')}
              </p>
              <div className="space-y-3">
                {createEntries.length === 0 ? (
                  <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                    {t('entity.noEntriesInPool')}
                  </div>
                ) : (
                  createEntries.map((row, idx) => (
                    <CreatePoolEntryRow
                      key={row.id}
                      gameId={gameId}
                      row={row}
                      index={idx}
                      disabled={creating}
                      canRemove={createEntries.length > 1}
                      onChange={(patch) => updateCreateEntry(row.id, patch)}
                      onRemove={() => removeCreateEntry(row.id)}
                    />
                  ))
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={addCreateEntry}
                disabled={creating || createEntries.length >= MAX_POOL_CREATE_ENTRIES}
                title={createEntries.length >= MAX_POOL_CREATE_ENTRIES ? t('entity.entriesLimitReached').replace('{max}', String(MAX_POOL_CREATE_ENTRIES)) : undefined}
              >
                <Plus className="h-4 w-4" />
                {t('entity.addEntry')}
              </Button>
            </div>
            </div>
          </ScrollArea>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" disabled={creating}>{t('common.cancel')}</Button>
            </SheetClose>
              <Button
                onClick={handleCreatePool}
                disabled={
                  creating
                  || !createForm.pool_key.trim()
                  || !createForm.name.trim()
                  || createEntries.length === 0
                  || createEntries.some((entry) => !entry.entity_definition_id.trim() || !entry.weight.trim())
                }
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('common.save')}
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
            <AlertDialogTitle>{t('entity.deletePoolTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('entity.deleteDescPre')}{" "}
              <span className="font-semibold">"{deleteTarget?.name}"</span>{" "}
              (<code className="font-mono text-xs">{deleteTarget?.pool_key}</code>).{" "}
              {t('entity.deleteDescPost')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePool}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Inline edit expanded content ──────────────────────────────────────────────

function CreatePoolEntryRow({
  gameId,
  row,
  index,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: {
  gameId: string
  row: CreatePoolEntryRow
  index: number
  disabled: boolean
  canRemove: boolean
  onChange: (patch: Partial<CreatePoolEntryRow>) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchResults, setSearchResults] = useState<EntityDefinition[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const results = await listEntityDefinitions(gameId, { search: searchInput.trim() })
        if (!cancelled) setSearchResults(results.slice(0, 30))
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [gameId, open, searchInput])

  const selectedLabel = row.entity_definition_name?.trim() || row.entity_definition_id || ""

  return (
    <div className="rounded-md border border-muted/40 bg-background/60 p-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen} modal>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 min-w-0 justify-between font-normal h-8 px-2 text-xs"
              disabled={disabled}
            >
              {selectedLabel ? (
                <span className="truncate text-left">{selectedLabel}</span>
              ) : (
                <span className="text-muted-foreground truncate text-left">{t('entity.searchEntityPlaceholder')}</span>
              )}
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t('entity.searchEntityDropdown')}
                value={searchInput}
                onValueChange={setSearchInput}
              />
              <CommandList>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>{t('entity.noEntityFound')}</CommandEmpty>
                    <CommandGroup>
                      {searchResults.map((def) => (
                        <CommandItem
                          key={def.id}
                          value={def.id}
                          onSelect={() => {
                            onChange({
                              entity_definition_id: def.id,
                              entity_definition_name: def.name,
                              entity_definition_key: def.entity_key,
                            })
                            setOpen(false)
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 shrink-0 ${row.entity_definition_id === def.id ? "opacity-100" : "opacity-0"}`} />
                          <span className="flex-1 truncate">{def.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{def.entity_key}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          type="number"
          min={MIN_ENTRY_WEIGHT}
          max={MAX_ENTRY_WEIGHT}
          value={row.weight}
          onChange={(e) => onChange({ weight: e.target.value })}
          className="h-8 w-24 text-xs font-mono"
          disabled={disabled}
        />
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8 shrink-0" />
        )}
      </div>
    </div>
  )
}

function RarityBadge({ rarity }: { rarity?: EntityRarity }) {
  if (!rarity) return <span className="text-muted-foreground text-xs">—</span>
  const c = ENTITY_RARITY_COLORS[rarity] ?? { text: 'text-muted-foreground', border: 'border-muted', bg: 'bg-muted/30' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.text} ${c.border} ${c.bg} capitalize`}>
      {rarity}
    </span>
  )
}

function PoolExpandedContent({
  pool,
  gameId,
  onSaved,
}: {
  pool: EntityPool
  gameId: string
  onSaved: (updated: EntityPool) => void
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [editingField, setEditingField] = useState<"name" | "description" | null>(null)
  const [editName, setEditName] = useState(pool.name)
  const [editDescription, setEditDescription] = useState(pool.description ?? "")
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<EntityPool | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(true)

  useEffect(() => {
    setEditName(pool.name)
    setEditDescription(pool.description ?? "")
    setEditingField(null)
  }, [pool])

  // Fetch pool detail with entries on mount
  useEffect(() => {
    let cancelled = false
    setLoadingDetail(true)
    getEntityPool(gameId, pool.id)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {
        // silently fail, we still have the basic pool data
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => { cancelled = true }
  }, [gameId, pool.id])

  function startEdit(field: "name" | "description") {
    setEditName(pool.name)
    setEditDescription(pool.description ?? "")
    setEditingField(field)
  }

  function cancelEdit() {
    setEditName(pool.name)
    setEditDescription(pool.description ?? "")
    setEditingField(null)
  }

  async function saveField() {
    if (editingField === "name") {
      const trimmed = editName.trim()
      if (!trimmed) {
        toast({ title: t('common.validation'), description: t('entity.nameRequired'), variant: "destructive" })
        return
      }
      if (trimmed.length > MAX_POOL_NAME_LENGTH) {
        toast({ title: t('common.validation'), description: t('entity.nameTooLong').replace('{max}', String(MAX_POOL_NAME_LENGTH)), variant: "destructive" })
        return
      }
    }
    setSaving(true)
    try {
      const body: { name?: string; description?: string } = {}
      if (editingField === "name") {
        body.name = editName.trim()
      } else {
        body.description = editDescription.trim()
      }
      const updated = await updateEntityPool(gameId, pool.id, body)
      toast({ title: t('common.saved') })
      onSaved(updated)
      setDetail(prev => prev ? { ...prev, ...updated } : prev)
      setEditingField(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveCancel = (
    <>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveField} disabled={saving}>
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit} disabled={saving}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </>
  )

  // ── add entry ──────────────────────────────────────────────────
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [addDefId, setAddDefId] = useState("")
  const [addDefLabel, setAddDefLabel] = useState("")
  const [addWeight, setAddWeight] = useState(String(DEFAULT_ENTRY_WEIGHT))
  const [addingEntry, setAddingEntry] = useState(false)
  const [defPopoverOpen, setDefPopoverOpen] = useState(false)
  const [defSearchInput, setDefSearchInput] = useState("")
  const [defSearchResults, setDefSearchResults] = useState<EntityDefinition[]>([])
  const [defSearchLoading, setDefSearchLoading] = useState(false)
  const defSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial results when popover opens
  useEffect(() => {
    if (!defPopoverOpen) return
    let cancelled = false
    setDefSearchLoading(true)
    listEntityDefinitions(gameId, {})
      .then((results) => { if (!cancelled) setDefSearchResults(results.slice(0, 10)) })
      .catch(() => { if (!cancelled) setDefSearchResults([]) })
      .finally(() => { if (!cancelled) setDefSearchLoading(false) })
    return () => { cancelled = true }
  }, [defPopoverOpen, gameId])

  function handleDefSearch(value: string) {
    setDefSearchInput(value)
    if (defSearchRef.current) clearTimeout(defSearchRef.current)
    defSearchRef.current = setTimeout(async () => {
      setDefSearchLoading(true)
      try {
        const results = await listEntityDefinitions(gameId, { search: value.trim() || undefined })
        setDefSearchResults(value.trim() ? results : results.slice(0, 10))
      } catch {
        setDefSearchResults([])
      } finally {
        setDefSearchLoading(false)
      }
    }, 300)
  }

  function selectDef(def: EntityDefinition) {
    setAddDefId(def.id)
    setAddDefLabel(`${def.name} (${def.entity_key})`)
    setDefPopoverOpen(false)
    setDefSearchInput("")
  }

  async function handleAddEntry() {
    if (!addDefId.trim()) {
      toast({ title: t('common.validation'), description: t('entity.entityDefRequired'), variant: "destructive" })
      return
    }
    const weight = parseInt(addWeight, 10)
    if (isNaN(weight) || weight < MIN_ENTRY_WEIGHT || weight > MAX_ENTRY_WEIGHT) {
      toast({
        title: t('common.validation'),
        description: t('entity.weightRange')
          .replace('{min}', String(MIN_ENTRY_WEIGHT))
          .replace('{max}', String(MAX_ENTRY_WEIGHT)),
        variant: "destructive",
      })
      return
    }
    setAddingEntry(true)
    try {
      await createEntityPoolEntry(gameId, pool.id, { entity_definition_id: addDefId.trim(), weight })
      const updated = await getEntityPool(gameId, pool.id)
      setDetail(updated)
      toast({ title: t('common.saved') })
      setAddDefId("")
      setAddDefLabel("")
      setAddWeight(String(DEFAULT_ENTRY_WEIGHT))
      setShowAddEntry(false)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedAddEntry')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setAddingEntry(false)
    }
  }

  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  async function handleDeleteEntry(entryId: string) {
    setDeletingEntryId(entryId)
    try {
      await deleteEntityPoolEntry(gameId, pool.id, entryId)
      const updated = await getEntityPool(gameId, pool.id)
      setDetail(updated)
      toast({ title: t('common.deleted') })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDeleteEntry')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setDeletingEntryId(null)
    }
  }

  // ── edit weight ────────────────────────────────────────────────
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null)
  const [editWeightValue, setEditWeightValue] = useState("")
  const [savingWeight, setSavingWeight] = useState(false)

  function startEditWeight(entry: EntityPoolEntry) {
    setEditingWeightId(entry.id)
    setEditWeightValue(String(entry.weight))
  }

  function cancelEditWeight() {
    setEditingWeightId(null)
    setEditWeightValue("")
  }

  async function saveWeight(entryId: string) {
    const weight = parseInt(editWeightValue, 10)
    if (isNaN(weight) || weight < MIN_ENTRY_WEIGHT || weight > MAX_ENTRY_WEIGHT) {
      toast({
        title: t('common.validation'),
        description: t('entity.weightRange')
          .replace('{min}', String(MIN_ENTRY_WEIGHT))
          .replace('{max}', String(MAX_ENTRY_WEIGHT)),
        variant: "destructive",
      })
      return
    }
    setSavingWeight(true)
    try {
      await updateEntityPoolEntry(gameId, pool.id, entryId, { weight })
      const updated = await getEntityPool(gameId, pool.id)
      setDetail(updated)
      toast({ title: t('common.saved') })
      setEditingWeightId(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedUpdateWeight')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSavingWeight(false)
    }
  }

  // ── metadata ───────────────────────────────────────────────────
  const [editingMetaKey, setEditingMetaKey] = useState<string | "__new__" | null>(null)
  const [editingMetaFieldKey, setEditingMetaFieldKey] = useState("")
  const [editingMetaFieldValue, setEditingMetaFieldValue] = useState("")

  function startEditMeta(originalKey: string, currentValue: string) {
    setEditingMetaKey(originalKey)
    setEditingMetaFieldKey(originalKey)
    setEditingMetaFieldValue(currentValue)
  }

  function startAddMeta() {
    setEditingMetaKey("__new__")
    setEditingMetaFieldKey("")
    setEditingMetaFieldValue("")
  }

  function cancelEditMeta() {
    setEditingMetaKey(null)
    setEditingMetaFieldKey("")
    setEditingMetaFieldValue("")
  }

  async function saveMeta() {
    const key = editingMetaFieldKey.trim()
    if (!key) return
    const raw = editingMetaFieldValue
    const num = Number(raw)
    const val = raw.trim() !== "" && !isNaN(num) ? num : raw
    const existing: Record<string, unknown> = pool.metadata ? { ...pool.metadata } : {}
    if (editingMetaKey !== "__new__" && editingMetaKey && editingMetaKey !== key) {
      delete existing[editingMetaKey]
    }
    existing[key] = val
    setSaving(true)
    try {
      const updated = await updateEntityPool(gameId, pool.id, { metadata: existing })
      onSaved(updated)
      setDetail(prev => prev ? { ...prev, metadata: updated.metadata } : prev)
      setEditingMetaKey(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function deleteMeta(key: string) {
    const existing: Record<string, unknown> = pool.metadata ? { ...pool.metadata } : {}
    delete existing[key]
    setSaving(true)
    try {
      const updated = await updateEntityPool(gameId, pool.id, { metadata: Object.keys(existing).length > 0 ? existing : undefined })
      onSaved(updated)
      setDetail(prev => prev ? { ...prev, metadata: updated.metadata } : prev)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDeleteField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── gacha pack / drop_pack_ids ─────────────────────────────────
  const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([])

  useEffect(() => {
    listGachaPacks({ gameId }).then((res) => setGachaPacks(res.packs)).catch(() => {})
  }, [gameId])

  function getDropPackIds(): string[] {
    const ids = pool.metadata?.drop_pack_ids
    if (Array.isArray(ids)) return ids as string[]
    return []
  }

  async function addDropPack(packId: string) {
    const current = getDropPackIds()
    if (current.includes(packId)) return
    const existing: Record<string, unknown> = pool.metadata ? { ...pool.metadata } : {}
    existing.drop_pack_ids = [...current, packId]
    setSaving(true)
    try {
      const updated = await updateEntityPool(gameId, pool.id, { metadata: existing })
      onSaved(updated)
      setDetail(prev => prev ? { ...prev, metadata: updated.metadata } : prev)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function removeDropPack(packId: string) {
    const current = getDropPackIds().filter((id) => id !== packId)
    const existing: Record<string, unknown> = pool.metadata ? { ...pool.metadata } : {}
    if (current.length > 0) {
      existing.drop_pack_ids = current
    } else {
      delete existing.drop_pack_ids
    }
    setSaving(true)
    try {
      const updated = await updateEntityPool(gameId, pool.id, { metadata: Object.keys(existing).length > 0 ? existing : undefined })
      onSaved(updated)
      setDetail(prev => prev ? { ...prev, metadata: updated.metadata } : prev)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const entries = detail?.entries ?? []
  const totalWeight = useMemo(() => entries.reduce((sum, e) => sum + e.weight, 0), [entries])

  return (
    <div className="group/expand px-12 py-4 animate-in slide-in-from-top-2 duration-300 space-y-4">
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        {/* Name */}
        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldName')}</dt>
          <dd className="flex items-center gap-1.5">
            {editingField === "name" ? (
              <>
                <Input value={editName} maxLength={MAX_POOL_NAME_LENGTH} onChange={(e) => setEditName(e.target.value.slice(0, MAX_POOL_NAME_LENGTH))} className="h-7 text-sm flex-1" disabled={saving} />
                {saveCancel}
              </>
            ) : (
              <>
                <span className="text-sm font-medium">{pool.name || <span className="text-muted-foreground">—</span>}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity" onClick={() => startEdit("name")}><Pencil className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </dd>
        </div>

        {/* Description */}
        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldDescription')}</dt>
          <dd className="flex items-start gap-1.5">
            {editingField === "description" ? (
              <>
                <div className="flex-1 space-y-1">
                  <Textarea rows={2} value={editDescription} maxLength={MAX_POOL_DESC_LENGTH} onChange={(e) => setEditDescription(e.target.value.slice(0, MAX_POOL_DESC_LENGTH))} className="text-sm resize-none" disabled={saving} />
                  <p className={`text-xs text-right ${editDescription.length >= MAX_POOL_DESC_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>{editDescription.length}/{MAX_POOL_DESC_LENGTH}</p>
                </div>
                <div className="flex flex-col gap-1">{saveCancel}</div>
              </>
            ) : (
              <>
                <span className="text-sm">{pool.description || <span className="text-muted-foreground text-xs">—</span>}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 group-hover/expand:opacity-100 transition-opacity" onClick={() => startEdit("description")}><Pencil className="w-3.5 h-3.5" /></Button>
              </>
            )}
          </dd>
        </div>

        {/* Internal ID */}
        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.internalIdentity')}</dt>
          <dd className="flex items-center gap-2">
            <code className="text-xs font-mono text-primary/80 bg-muted/30 px-2 py-0.5 rounded border">{pool.id}</code>
            <CopyButton text={pool.id} />
          </dd>
        </div>

        {/* Timestamps */}
        <div className="flex gap-6">
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldCreated')}</dt>
            <dd className="text-sm">{new Date(pool.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldUpdated')}</dt>
            <dd className="text-sm">{new Date(detail?.updated_at ?? pool.updated_at).toLocaleString()}</dd>
          </div>
        </div>
      </dl>

      {/* metadata + drop_pack_ids sub-grid */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Metadata */}
        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldMetadata')}</dt>
          <dd>
            <div className="space-y-0.5">
              {pool.metadata && Object.entries(pool.metadata).map(([k, v]) => {
                if (k === "drop_pack_ids") {
                  const count = Array.isArray(v) ? v.length : 0
                  return (
                    <div key={k} className="flex items-center gap-1.5 py-0.5 px-1 rounded">
                      <span className="text-xs font-mono text-muted-foreground w-32 truncate shrink-0">{k}</span>
                      <span className="text-xs text-muted-foreground">:</span>
                      <span className="text-xs font-mono flex-1 text-muted-foreground">{count} pack{count !== 1 ? "s" : ""}</span>
                    </div>
                  )
                }
                return (
                  <div key={k} className="group/meta">
                    {editingMetaKey === k ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <Input value={editingMetaFieldKey} onChange={(e) => setEditingMetaFieldKey(e.target.value)} placeholder={t('entity.metaKeyPlaceholder')} className="h-7 text-xs w-32 font-mono" disabled={saving} />
                        <span className="text-muted-foreground text-xs">:</span>
                        <Input value={editingMetaFieldValue} onChange={(e) => setEditingMetaFieldValue(e.target.value)} placeholder={t('entity.metaValuePlaceholder')} className="h-7 text-xs flex-1 font-mono" disabled={saving} />
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveMeta} disabled={saving}>
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditMeta} disabled={saving}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer" onClick={() => startEditMeta(k, String(v))}>
                        <span className="text-xs font-mono text-muted-foreground w-32 truncate shrink-0">{k}</span>
                        <span className="text-xs text-muted-foreground">:</span>
                        <span className="text-xs font-mono flex-1">{String(v)}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-0 group-hover/meta:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteMeta(k) }} disabled={saving}><X className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                )
              })}
              {editingMetaKey === "__new__" ? (
                <div className="flex items-center gap-1.5 py-0.5 mt-1">
                  <Input value={editingMetaFieldKey} onChange={(e) => setEditingMetaFieldKey(e.target.value)} placeholder={t('entity.metaKeyPlaceholder')} className="h-7 text-xs w-32 font-mono" disabled={saving} autoFocus />
                  <span className="text-muted-foreground text-xs">:</span>
                  <Input value={editingMetaFieldValue} onChange={(e) => setEditingMetaFieldValue(e.target.value)} placeholder={t('entity.metaValuePlaceholder')} className="h-7 text-xs flex-1 font-mono" disabled={saving} />
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveMeta} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditMeta} disabled={saving}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 mt-1" onClick={startAddMeta} disabled={saving || editingMetaKey !== null}>
                  <Plus className="w-3 h-3" /> {t('entity.addField')}
                </Button>
              )}
            </div>
          </dd>
        </div>

        {/* Drop Pack IDs */}
        <div>
          <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.dropPackIds')}</dt>
          <dd>
            <div className="space-y-1">
              {getDropPackIds().map((packId) => {
                const pack = gachaPacks.find((p) => p.id === packId)
                return (
                  <div key={packId} className="flex items-center gap-1.5 py-0.5 px-1 rounded bg-muted/40">
                    <Link href={`/games/${gameId}/items?tab=gacha`} className="text-xs font-mono flex-1 truncate hover:underline inline-flex items-center gap-1" target="_blank">
                      {pack ? pack.name : packId}<ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                    </Link>
                    <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeDropPack(packId)} disabled={saving}><X className="w-3 h-3" /></Button>
                  </div>
                )
              })}
              {gachaPacks.length > 0 && (
                <Select onValueChange={addDropPack} disabled={saving}>
                  <SelectTrigger className="h-7 text-xs mt-1">
                    <SelectValue placeholder={t('entity.linkGachaPackPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {gachaPacks.filter((p) => !getDropPackIds().includes(p.id)).map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <span>{p.name}</span>
                        <span className="ml-2 text-muted-foreground font-mono text-[10px]">{p.id.slice(0, 8)}…</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </dd>
        </div>
      </div>

      {/* Entries */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 border-l-2 border-primary/50">
            {t('entity.entries')} {!loadingDetail && <span className="text-muted-foreground font-normal normal-case tracking-normal">({entries.length}/{MAX_ENTRIES_PER_POOL})</span>}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setShowAddEntry(!showAddEntry)}
            disabled={entries.length >= MAX_ENTRIES_PER_POOL}
            title={entries.length >= MAX_ENTRIES_PER_POOL ? t('entity.entriesLimitReached').replace('{max}', String(MAX_ENTRIES_PER_POOL)) : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {showAddEntry && (
          <div className="flex items-end gap-2 mb-3 p-3 rounded-lg border border-muted/30 bg-background/40">
            <div className="w-1/2 min-w-[200px] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('entity.entityDefinition')}</label>
              <Popover open={defPopoverOpen} onOpenChange={setDefPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={defPopoverOpen}
                    className="w-full h-8 justify-between text-sm font-normal"
                    disabled={addingEntry}
                  >
                    {addDefLabel ? (
                      <span className="truncate">{addDefLabel}</span>
                    ) : (
                      <span className="text-muted-foreground">{t('entity.searchEntityPlaceholder')}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('entity.searchEntityDropdown')}
                      value={defSearchInput}
                      onValueChange={handleDefSearch}
                    />
                    <CommandList>
                      {defSearchLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>{t('entity.noEntityFound')}</CommandEmpty>
                          <CommandGroup>
                            {(() => {
                              const existingDefIds = new Set(entries.map(e => e.entity_definition_id))
                              const sorted = [...defSearchResults.slice(0, 30)].sort((a, b) => {
                                const aInPool = existingDefIds.has(a.id) ? 1 : 0
                                const bInPool = existingDefIds.has(b.id) ? 1 : 0
                                return aInPool - bInPool
                              })
                              return sorted.map((def) => {
                                const inPool = existingDefIds.has(def.id)
                                return (
                                  <CommandItem
                                    key={def.id}
                                    value={def.id}
                                    onSelect={() => selectDef(def)}
                                    className={inPool ? "opacity-50" : ""}
                                  >
                                    <Check className={`mr-2 h-4 w-4 shrink-0 ${addDefId === def.id ? "opacity-100" : "opacity-0"}`} />
                                    <span className="flex-1 truncate">{def.name}</span>
                                    {inPool && (
                                      <Badge className="ml-2 text-[10px] px-1.5 py-0 h-auto bg-amber-500/15 text-amber-600 border-amber-500/30">
                                        {t('entity.inPool')}
                                      </Badge>
                                    )}
                                    <span className="ml-2 text-xs text-muted-foreground font-mono">{def.entity_key}</span>
                                  </CommandItem>
                                )
                              })
                            })()}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-24 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t('entity.weight')}</label>
              <Input
                type="number"
                min={MIN_ENTRY_WEIGHT}
                max={MAX_ENTRY_WEIGHT}
                value={addWeight}
                onChange={(e) => setAddWeight(e.target.value)}
                className="h-8 text-sm font-mono"
                disabled={addingEntry}
              />
            </div>
            <Button size="sm" className="h-8 gap-1.5" onClick={handleAddEntry} disabled={addingEntry}>
              {addingEntry ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t('entity.addEntry')}
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowAddEntry(false)} disabled={addingEntry}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {loadingDetail ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('entity.noEntriesInPool')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-muted/30">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted/30">
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldName')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldEntityKey')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldEntityType')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldRarity')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8 text-right">{t('entity.weight')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8 text-right">%</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.stats')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8 w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => {
                  const pct = totalWeight > 0 ? (entry.weight / totalWeight * 100) : 0
                  return (
                  <TableRow key={entry.id} className="border-muted/20 hover:bg-muted/20">
                    <TableCell className="py-1.5">
                      <Link
                        href={`/games/${gameId}/entities?tab=entities&search=${entry.entity_definition_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.entity_name}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="bg-muted/50 border-none px-2 py-0.5 font-mono text-[11px] h-auto">
                          {entry.entity_key}
                        </Badge>
                        <CopyButton text={entry.entity_key} />
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {ENTITY_TYPE_LABELS[entry.entity_type as keyof typeof ENTITY_TYPE_LABELS] ?? entry.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <RarityBadge rarity={entry.rarity} />
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      {editingWeightId === entry.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={MIN_ENTRY_WEIGHT}
                            max={MAX_ENTRY_WEIGHT}
                            value={editWeightValue}
                            onChange={(e) => setEditWeightValue(e.target.value)}
                            className="h-6 w-20 text-sm font-mono text-right"
                            disabled={savingWeight}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") saveWeight(entry.id); if (e.key === "Escape") cancelEditWeight() }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveWeight(entry.id)} disabled={savingWeight}>
                            {savingWeight ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditWeight} disabled={savingWeight}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 cursor-pointer group/weight" onClick={(e) => { e.stopPropagation(); startEditWeight(entry) }}>
                          <span className="text-sm font-mono font-medium">{entry.weight}</span>
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/expand:opacity-100 transition-opacity" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <span className="text-sm font-mono text-muted-foreground">{pct.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {entry.stats && Object.keys(entry.stats).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(entry.stats).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[10px] font-mono h-auto py-0 px-1.5 bg-muted/30 border-muted/50">
                              {k}: {String(v)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 opacity-0 group-hover/expand:opacity-100 transition-opacity"
                        disabled={deletingEntryId === entry.id}
                        onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id) }}
                      >
                        {deletingEntryId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
