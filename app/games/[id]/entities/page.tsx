"use client"

import React, { useEffect, useState, useCallback, useRef, Fragment } from "react"
import { toSlugUnderscore } from "@/lib/utils"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus, RefreshCw, Trash2, Pencil, Save, Loader2, Search, X, Skull, ArrowLeft, Bot,
  ChevronRight, ChevronDown, Wand2, Hammer, ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useEscapeLayer } from "@/hooks/use-escape-manager"
import { getGame } from "@/lib/game-api"
import { ApiError } from "@/lib/api-client"
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/storage-utils"
import { CopyButton } from "@/components/CopyButton"
import { GameNavButtons } from "@/components/GameNavButtons"
import {
  listEntityDefinitions,
  createEntityDefinition,
  updateEntityDefinition,
  deleteEntityDefinition,
  getEntityDefinition,
  getEntityDefinitionTypes,
  listEntityPools,
  createEntityPool,
  updateEntityPool,
  deleteEntityPool,
} from "@/lib/entity-definition-api"
import { fetchItemRarities, listGachaPacks } from "@/lib/inventory-api"
import type { GachaPack } from "@/types/inventory"
import type {
  EntityDefinition,
  EntityType,
  EntityRarity,
  CreateEntityDefinitionRequest,
  UpdateEntityDefinitionRequest,
  EntityPool,
  CreateEntityPoolRequest,
  UpdateEntityPoolRequest,
} from "@/types/entity-definition"
import {
  ENTITY_TYPE_LABELS,
  ENTITY_RARITY_COLORS,
} from "@/types/entity-definition"
import type { Game } from "@/types/game"
import { lsPendingEntityDefinitionCreate, lsEntityLinks, lsEntityNames, lsActiveConv } from "@/components/llm-conversations/conversation-panel-utils"
import { createConversation, linkConversationContent } from "@/lib/llm-conversation-api"

import { EntityPoolTab } from "./EntityPoolTab"




const DEFAULT_ENTITY_TYPES: EntityType[] = ["enemy", "boss", "room", "relic", "defense_unit", "npc"]
const ENTITY_RARITIES: EntityRarity[] = ["common", "uncommon", "rare", "epic", "legendary"]
const MAX_ABILITIES_PER_ENTITY = 50
const MAX_ABILITY_FIELDS = 50

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function randomAbilityId() {
  return "ability_" + Math.random().toString(36).slice(2, 8)
}

function RarityBadge({ rarity }: { rarity?: EntityRarity }) {
  if (!rarity) return <span className="text-muted-foreground text-xs">—</span>
  const c = ENTITY_RARITY_COLORS[rarity] ?? { text: 'text-muted-foreground', border: 'border-muted', bg: 'bg-muted/30' }
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
  rarity: "common",
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
    rarity: e.rarity ?? "",
    stats: e.stats ? JSON.stringify(e.stats, null, 2) : "",
    abilities: e.abilities ? JSON.stringify(e.abilities, null, 2) : "",
    metadata: e.metadata ? JSON.stringify(e.metadata, null, 2) : "",
  }
}

function draftToForm(draft: Record<string, unknown>): FormState {
  const metadata = draft.metadata && typeof draft.metadata === 'object' && !Array.isArray(draft.metadata)
    ? (draft.metadata as Record<string, unknown>)
    : undefined
  const stats = draft.stats && typeof draft.stats === 'object' && !Array.isArray(draft.stats)
    ? draft.stats as Record<string, unknown>
    : undefined
  const abilities = Array.isArray(draft.abilities) ? draft.abilities : undefined
  return {
    entity_key: typeof draft.entity_key === 'string' ? draft.entity_key : "",
    entity_type: typeof draft.entity_type === 'string' ? draft.entity_type as EntityType : "enemy",
    name: typeof draft.name === 'string' ? draft.name : "",
    description: typeof draft.description === 'string'
      ? draft.description
      : typeof metadata?.description === 'string'
        ? String(metadata.description)
        : "",
    rarity: typeof draft.rarity === 'string' ? draft.rarity as EntityRarity : "common",
    stats: stats ? JSON.stringify(stats, null, 2) : "",
    abilities: abilities ? JSON.stringify(abilities, null, 2) : "",
    metadata: metadata ? JSON.stringify(metadata, null, 2) : "",
  }
}

// ─── inline edit form (shown inside expanded row) ────────────────────────────

function JsonReadonly({ value }: { value: Record<string, unknown> | unknown[] | undefined }) {
  if (!value || (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0))
    return <span className="text-muted-foreground text-xs">—</span>
  return (
    <pre className="text-xs font-mono bg-muted/40 rounded border px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function EntityInlineEditForm({
  entity,
  gameId,
  onSaved,
  rarities,
  availableTypes,
}: {
  entity: EntityDefinition
  gameId: string
  onSaved: (updated: EntityDefinition) => void
  rarities: string[]
  availableTypes: EntityType[]
}) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [editingField, setEditingField] = useState<keyof FormState | null>(null)
  const [form, setFormState] = useState<FormState>(() => entityToForm(entity))
  const [saving, setSaving] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)

  // stats per-row editor
  const [editingStatKey, setEditingStatKey] = useState<string | "__new__" | null>(null)
  const [editingStatFieldKey, setEditingStatFieldKey] = useState("")
  const [editingStatFieldValue, setEditingStatFieldValue] = useState("")

  // metadata per-row editor
  const [editingMetaKey, setEditingMetaKey] = useState<string | "__new__" | null>(null)
  const [editingMetaFieldKey, setEditingMetaFieldKey] = useState("")
  const [editingMetaFieldValue, setEditingMetaFieldValue] = useState("")

  // gacha pack linking
  const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([])

  useEffect(() => {
    listGachaPacks({ gameId }).then((res) => setGachaPacks(res.packs)).catch(() => {})
  }, [gameId])

  function getDropPackIds(): string[] {
    const meta = entity.metadata as Record<string, unknown> | undefined
    const ids = meta?.drop_pack_ids
    if (Array.isArray(ids)) return ids as string[]
    return []
  }

  async function addDropPack(packId: string) {
    const current = getDropPackIds()
    if (current.includes(packId)) return
    const existing: Record<string, unknown> = entity.metadata ? { ...(entity.metadata as Record<string, unknown>) } : {}
    existing.drop_pack_ids = [...current, packId]
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { metadata: existing })
      onSaved(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function removeDropPack(packId: string) {
    const current = getDropPackIds().filter((id) => id !== packId)
    const existing: Record<string, unknown> = entity.metadata ? { ...(entity.metadata as Record<string, unknown>) } : {}
    if (current.length > 0) {
      existing.drop_pack_ids = current
    } else {
      delete existing.drop_pack_ids
    }
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { metadata: Object.keys(existing).length > 0 ? existing : undefined })
      onSaved(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // abilities 2-level editor
  const [expandedAbilityIdx, setExpandedAbilityIdx] = useState<number | null>(null)
  const [editingAbilityIdx, setEditingAbilityIdx] = useState<number | null>(null)
  const [editingAbilityKey, setEditingAbilityKey] = useState<string | "__new__" | null>(null)
  const [editingAbilityFieldKey, setEditingAbilityFieldKey] = useState("")
  const [editingAbilityFieldValue, setEditingAbilityFieldValue] = useState("")

  useEffect(() => {
    setFormState(entityToForm(entity))
    setEditingField(null)
    setJsonError(null)
    setEditingStatKey(null)
    setEditingStatFieldKey("")
    setEditingStatFieldValue("")
    setEditingMetaKey(null)
    setEditingMetaFieldKey("")
    setEditingMetaFieldValue("")
    setExpandedAbilityIdx(null)
    setEditingAbilityIdx(null)
    setEditingAbilityKey(null)
    setEditingAbilityFieldKey("")
    setEditingAbilityFieldValue("")
  }, [entity])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  function startEdit(field: keyof FormState) {
    // reset to latest entity value before opening
    setFormState(entityToForm(entity))
    setJsonError(null)
    setEditingField(field)
  }

  function cancelEdit() {
    setFormState(entityToForm(entity))
    setJsonError(null)
    setEditingField(null)
  }

  async function saveField() {
    if (editingField === "abilities" || editingField === "metadata") {
      const raw = form[editingField] as string
      if (raw.trim()) {
        try { JSON.parse(raw) } catch {
          setJsonError(t('entity.invalidJson'))
          return
        }
      }
    }
    if (editingField === "name" && !form.name.trim()) {
      toast({ title: t('common.validation'), description: t('entity.nameRequired'), variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body: UpdateEntityDefinitionRequest = {
        entity_type: form.entity_type,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        rarity: (form.rarity || undefined) as EntityRarity | undefined,
        stats: tryParseJson(form.stats),
        abilities: tryParseJson(form.abilities) as any,
        metadata: tryParseJson(form.metadata),
      }
      const updated = await updateEntityDefinition(gameId, entity.id, body)
      toast({ title: t('common.saved'), description: t('entity.entityUpdated').replace('{name}', updated.name) })
      onSaved(updated)
      setEditingField(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function startEditStat(originalKey: string, currentValue: string) {
    setEditingStatKey(originalKey)
    setEditingStatFieldKey(originalKey)
    setEditingStatFieldValue(currentValue)
  }

  function startAddStat() {
    setEditingStatKey("__new__")
    setEditingStatFieldKey("")
    setEditingStatFieldValue("")
  }

  function cancelEditStat() {
    setEditingStatKey(null)
    setEditingStatFieldKey("")
    setEditingStatFieldValue("")
  }

  async function saveStat() {
    const key = editingStatFieldKey.trim()
    if (!key) return
    const raw = editingStatFieldValue
    const num = Number(raw)
    const val = raw.trim() !== "" && !isNaN(num) ? num : raw
    const existing = entity.stats ? { ...entity.stats } : {}
    if (editingStatKey !== "__new__" && editingStatKey && editingStatKey !== key) {
      delete existing[editingStatKey]
    }
    existing[key] = val
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { stats: existing })
      toast({ title: t('common.saved'), description: t('entity.statSaved').replace('{key}', key) })
      onSaved(updated)
      setEditingStatKey(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function deleteStat(key: string) {
    const existing = entity.stats ? { ...entity.stats } : {}
    delete existing[key]
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { stats: Object.keys(existing).length > 0 ? existing : undefined })
      toast({ title: t('common.deleted'), description: t('entity.statRemoved').replace('{key}', key) })
      onSaved(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDeleteField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

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
    const existing: Record<string, unknown> = entity.metadata ? { ...(entity.metadata as Record<string, unknown>) } : {}
    if (editingMetaKey !== "__new__" && editingMetaKey && editingMetaKey !== key) {
      delete existing[editingMetaKey]
    }
    existing[key] = val
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { metadata: existing })
      toast({ title: t('common.saved'), description: t('entity.metaSaved').replace('{key}', key) })
      onSaved(updated)
      setEditingMetaKey(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function deleteMeta(key: string) {
    const existing: Record<string, unknown> = entity.metadata ? { ...(entity.metadata as Record<string, unknown>) } : {}
    delete existing[key]
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { metadata: Object.keys(existing).length > 0 ? existing : undefined })
      toast({ title: t('common.deleted'), description: t('entity.metaRemoved').replace('{key}', key) })
      onSaved(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDeleteField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // ── abilities helpers ──────────────────────────────────────────────────────
  function getAbilities(): Record<string, unknown>[] {
    if (!entity.abilities) return []
    if (Array.isArray(entity.abilities)) return entity.abilities as unknown as Record<string, unknown>[]
    return []
  }

  function toggleAbility(idx: number) {
    setExpandedAbilityIdx((prev) => prev === idx ? null : idx)
    setEditingAbilityIdx(null)
    setEditingAbilityKey(null)
    setEditingAbilityFieldKey("")
    setEditingAbilityFieldValue("")
  }

  function startEditAbilityField(abilityIdx: number, fieldKey: string, fieldValue: string) {
    setEditingAbilityIdx(abilityIdx)
    setEditingAbilityKey(fieldKey)
    setEditingAbilityFieldKey(fieldKey)
    setEditingAbilityFieldValue(fieldValue)
  }

  function startAddAbilityField(abilityIdx: number) {
    const ability = getAbilities()[abilityIdx]
    if (ability && Object.keys(ability).length >= MAX_ABILITY_FIELDS) {
      toast({ title: t('common.validation'), description: t('entity.abilityFieldLimitReached'), variant: "destructive" })
      return
    }
    setEditingAbilityIdx(abilityIdx)
    setEditingAbilityKey("__new__")
    setEditingAbilityFieldKey("")
    setEditingAbilityFieldValue("")
  }

  function cancelEditAbilityField() {
    setEditingAbilityIdx(null)
    setEditingAbilityKey(null)
    setEditingAbilityFieldKey("")
    setEditingAbilityFieldValue("")
  }

  async function saveAbilityField() {
    const key = editingAbilityFieldKey.trim()
    if (!key || editingAbilityIdx === null) return
    const raw = editingAbilityFieldValue
    const num = Number(raw)
    const val = raw.trim() !== "" && !isNaN(num) ? num : raw
    const currentAbility = getAbilities()[editingAbilityIdx]
    if (editingAbilityKey === "__new__" && currentAbility && !Object.prototype.hasOwnProperty.call(currentAbility, key) && Object.keys(currentAbility).length >= MAX_ABILITY_FIELDS) {
      toast({ title: t('common.validation'), description: t('entity.abilityFieldLimitReached'), variant: "destructive" })
      return
    }
    const abilities = getAbilities().map((ab, i) => {
      if (i !== editingAbilityIdx) return ab
      const updated = { ...ab }
      if (editingAbilityKey !== "__new__" && editingAbilityKey && editingAbilityKey !== key) {
        delete updated[editingAbilityKey]
      }
      updated[key] = val
      return updated
    })
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { abilities: abilities as any })
      toast({ title: t('common.saved'), description: t('entity.abilityFieldSaved').replace('{key}', key) })
      onSaved(updated)
      setEditingAbilityIdx(null)
      setEditingAbilityKey(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function deleteAbilityField(abilityIdx: number, fieldKey: string) {
    const abilities = getAbilities().map((ab, i) => {
      if (i !== abilityIdx) return ab
      const updated = { ...ab }
      delete updated[fieldKey]
      return updated
    })
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { abilities: abilities as any })
      toast({ title: t('common.deleted'), description: t('entity.abilityFieldRemoved').replace('{key}', fieldKey) })
      onSaved(updated)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDeleteField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function deleteAbility(abilityIdx: number) {
    const abilities = getAbilities().filter((_, i) => i !== abilityIdx)
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { abilities: abilities.length > 0 ? abilities as any : undefined })
      toast({ title: t('common.deleted'), description: t('entity.abilityRemoved') })
      onSaved(updated)
      if (expandedAbilityIdx === abilityIdx) setExpandedAbilityIdx(null)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDeleteField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function addAbility() {
    const currentAbilities = getAbilities()
    if (currentAbilities.length >= MAX_ABILITIES_PER_ENTITY) {
      toast({ title: t('common.validation'), description: t('entity.abilityLimitReached'), variant: "destructive" })
      return
    }
    const abilities = [...currentAbilities, { id: randomAbilityId() }]
    setSaving(true)
    try {
      const updated = await updateEntityDefinition(gameId, entity.id, { abilities: abilities as any })
      toast({ title: t('common.added'), description: t('entity.abilityAdded') })
      onSaved(updated)
      setExpandedAbilityIdx(abilities.length - 1)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSaveField')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const isEditing = (f: keyof FormState) => editingField === f
  const abilities = getAbilities()
  const abilityCount = abilities.length
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

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {/* meta strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-muted-foreground border-b pb-3">
        <span className="flex items-center gap-1">
          <span className="font-sans font-medium text-foreground">ID</span>
          {entity.id}
          <CopyButton text={entity.id} />
        </span>
        <span><span className="font-sans font-medium text-foreground">{t('entity.fieldCreated')} </span>{new Date(entity.created_at).toLocaleString()}</span>
        <span><span className="font-sans font-medium text-foreground">{t('entity.fieldUpdated')} </span>{new Date(entity.updated_at).toLocaleString()}</span>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Column 1 ── */}
        <dl className="flex-1 space-y-4 min-w-0">

          {/* name */}
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldName')}</dt>
            <dd className="group flex items-center gap-1.5">
              {isEditing("name") ? (
                <>
                  <Input value={form.name} onChange={(e) => setField("name", e.target.value)} className="h-7 text-sm flex-1" disabled={saving} />
                  {saveCancel}
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">{entity.name || <span className="text-muted-foreground">—</span>}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit("name")}><Pencil className="w-3.5 h-3.5" /></Button>
                </>
              )}
            </dd>
          </div>

          {/* description */}
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldDescription')}</dt>
            <dd className="group flex items-start gap-1.5">
              {isEditing("description") ? (
                <>
                  <div className="flex-1 space-y-1">
                    <Textarea rows={2} value={form.description} onChange={(e) => setField("description", e.target.value.slice(0, 500))} className="text-sm resize-none" disabled={saving} />
                    <p className={`text-xs text-right ${form.description.length >= 500 ? "text-destructive" : "text-muted-foreground"}`}>{form.description.length}/500</p>
                  </div>
                  <div className="flex flex-col gap-1">{saveCancel}</div>
                </>
              ) : (
                <>
                  <span className="text-sm">{entity.description || <span className="text-muted-foreground text-xs">—</span>}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit("description")}><Pencil className="w-3.5 h-3.5" /></Button>
                </>
              )}
            </dd>
          </div>

          {/* rarity + entity_type */}
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldRarity')}</dt>
              <dd className="group flex items-center gap-1.5">
                {isEditing("rarity") ? (
                  <>
                    <Select value={form.rarity} onValueChange={(v) => setField("rarity", v as EntityRarity)}>
                      <SelectTrigger className="h-7 text-sm w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {rarities.map((r) => <SelectItem key={r} value={r}>{formatLabel(r)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {saveCancel}
                  </>
                ) : (
                  <>
                    <RarityBadge rarity={entity.rarity} />
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit("rarity")}><Pencil className="w-3.5 h-3.5" /></Button>
                  </>
                )}
              </dd>
            </div>
            <div className="flex-1 min-w-0">
              <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldType')}</dt>
              <dd className="group flex items-center gap-1.5">
                {isEditing("entity_type") ? (
                  <>
                    <Select value={form.entity_type} onValueChange={(v) => setField("entity_type", v as EntityType)}>
                      <SelectTrigger className="h-7 text-sm w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableTypes.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{ENTITY_TYPE_LABELS[t] ?? t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {saveCancel}
                  </>
                ) : (
                  <>
                    <EntityTypeBadge type={entity.entity_type} />
                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEdit("entity_type")}><Pencil className="w-3.5 h-3.5" /></Button>
                  </>
                )}
              </dd>
            </div>
          </div>

          {/* metadata + drop pack ids sub-grid */}
          <div className="grid grid-cols-2 gap-4 items-start">
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldMetadata')}</dt>
            <dd>
              <div className="space-y-0.5">
                {entity.metadata && Object.entries(entity.metadata as Record<string, unknown>).map(([k, v]) => {
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
                          <Input value={editingMetaFieldKey} onChange={(e) => setEditingMetaFieldKey(e.target.value)} placeholder="key" className="h-7 text-xs w-32 font-mono" disabled={saving} />
                          <span className="text-muted-foreground text-xs">:</span>
                          <Input value={editingMetaFieldValue} onChange={(e) => setEditingMetaFieldValue(e.target.value)} placeholder="value" className="h-7 text-xs flex-1 font-mono" disabled={saving} />
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
                    <Input value={editingMetaFieldKey} onChange={(e) => setEditingMetaFieldKey(e.target.value)} placeholder="key" className="h-7 text-xs w-32 font-mono" disabled={saving} autoFocus />
                    <span className="text-muted-foreground text-xs">:</span>
                    <Input value={editingMetaFieldValue} onChange={(e) => setEditingMetaFieldValue(e.target.value)} placeholder="value" className="h-7 text-xs flex-1 font-mono" disabled={saving} />
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

          {/* drop pack ids — col 2 of sub-grid */}
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">Drop Pack IDs</dt>
            <dd>
              <div className="space-y-1">
                {getDropPackIds().map((packId) => {
                  const pack = gachaPacks.find((p) => p.id === packId)
                  return (
                    <div key={packId} className="flex items-center gap-1.5 py-0.5 px-1 rounded bg-muted/40">
                      <Link href={`/games/${gameId}/items?tab=gacha`} className="text-xs font-mono flex-1 truncate hover:underline inline-flex items-center gap-1" target="_blank">{pack ? pack.name : packId}<ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" /></Link>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeDropPack(packId)} disabled={saving}><X className="w-3 h-3" /></Button>
                    </div>
                  )
                })}
                {gachaPacks.length > 0 ? (
                  <Select onValueChange={addDropPack} disabled={saving}>
                    <SelectTrigger className="h-7 text-xs mt-1">
                      <SelectValue placeholder="Link a gacha pack…" />
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
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {t('entity.noGachaPacksInGame')}{" "}
                    <Link href={`/games/${gameId}/items?tab=gacha`} target="_blank" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      {t('entity.createGachaPack')}<ExternalLink className="w-3 h-3" />
                    </Link>
                  </p>
                )}
              </div>
            </dd>
          </div>
          </div>{/* end sub-grid */}

        </dl>

        {/* ── Column 2 ── */}
        <dl className="flex-1 space-y-4 min-w-0">

          {/* stats */}
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1">{t('entity.fieldStats')}</dt>
            <dd>
              <div className="space-y-0.5">
                {entity.stats && Object.entries(entity.stats).map(([k, v]) => (
                  <div key={k} className="group/stat">
                    {editingStatKey === k ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <Input value={editingStatFieldKey} onChange={(e) => setEditingStatFieldKey(e.target.value)} placeholder="key" className="h-7 text-xs w-32 font-mono" disabled={saving} />
                        <span className="text-muted-foreground text-xs">:</span>
                        <Input value={editingStatFieldValue} onChange={(e) => setEditingStatFieldValue(e.target.value)} placeholder="value" className="h-7 text-xs flex-1 font-mono" disabled={saving} />
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveStat} disabled={saving}>
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditStat} disabled={saving}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer" onClick={() => startEditStat(k, String(v))}>
                        <span className="text-xs font-mono text-muted-foreground w-32 truncate shrink-0">{k}</span>
                        <span className="text-xs text-muted-foreground">:</span>
                        <span className="text-xs font-mono flex-1">{String(v)}</span>
                        <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0 opacity-0 group-hover/stat:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteStat(k) }} disabled={saving}><X className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                {editingStatKey === "__new__" ? (
                  <div className="flex items-center gap-1.5 py-0.5 mt-1">
                    <Input value={editingStatFieldKey} onChange={(e) => setEditingStatFieldKey(e.target.value)} placeholder="key" className="h-7 text-xs w-32 font-mono" disabled={saving} autoFocus />
                    <span className="text-muted-foreground text-xs">:</span>
                    <Input value={editingStatFieldValue} onChange={(e) => setEditingStatFieldValue(e.target.value)} placeholder="value" className="h-7 text-xs flex-1 font-mono" disabled={saving} />
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveStat} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditStat} disabled={saving}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 mt-1" onClick={startAddStat} disabled={saving || editingStatKey !== null}>
                    <Plus className="w-3 h-3" /> {t('entity.addField')}
                  </Button>
                )}
              </div>
            </dd>
          </div>

          {/* abilities */}
          <div>
            <dt className="text-xs font-medium text-muted-foreground mb-1 flex items-center justify-between gap-2">
              <span>{t('entity.fieldAbilities')}</span>
              <span className={`font-mono ${abilityCount >= MAX_ABILITIES_PER_ENTITY ? "text-destructive" : "text-muted-foreground"}`}>
                {abilityCount}/{MAX_ABILITIES_PER_ENTITY}
              </span>
            </dt>
            <dd>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('entity.abilityLimitHint')}</p>
                {abilities.map((ability, idx) => (
                  <div key={idx} className="border rounded">
                    {/* ability header */}
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-muted/50 group/ab"
                      onClick={() => toggleAbility(idx)}
                    >
                      {expandedAbilityIdx === idx
                        ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                      <span className="text-xs font-mono flex-1 truncate text-muted-foreground">
                        {String((ability as any).id ?? (ability as any).name ?? `ability[${idx}]`)}
                      </span>
                      <Button
                        size="icon" variant="ghost"
                        className="h-5 w-5 shrink-0 opacity-0 group-hover/ab:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteAbility(idx) }}
                        disabled={saving}
                      ><X className="w-3 h-3" /></Button>
                    </div>
                    {/* ability fields (expanded) */}
                    {expandedAbilityIdx === idx && (
                      <div className="px-2 pb-2 border-t space-y-0.5 pt-1">
                        <div className="flex justify-end pb-1">
                          <span className={`text-[11px] font-mono ${Object.keys(ability).length >= MAX_ABILITY_FIELDS ? "text-destructive" : "text-muted-foreground"}`}>
                            {t('entity.abilityFieldsCounter')}: {Object.keys(ability).length}/{MAX_ABILITY_FIELDS}
                          </span>
                        </div>
                        {Object.entries(ability).map(([k, v]) => (
                          <div key={k} className="group/abfield">
                            {editingAbilityIdx === idx && editingAbilityKey === k ? (
                              <div className="flex items-center gap-1.5 py-0.5">
                                <Input value={editingAbilityFieldKey} onChange={(e) => setEditingAbilityFieldKey(e.target.value)} placeholder="key" className="h-7 text-xs w-28 font-mono" disabled={saving || k === "id"} />
                                <span className="text-muted-foreground text-xs">:</span>
                                <Input value={editingAbilityFieldValue} onChange={(e) => setEditingAbilityFieldValue(e.target.value)} placeholder="value" className="h-7 text-xs flex-1 font-mono" disabled={saving} />
                                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveAbilityField} disabled={saving}>
                                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditAbilityField} disabled={saving}><X className="w-3.5 h-3.5" /></Button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={() => startEditAbilityField(idx, k, String(v))}
                              >
                                <span className="text-xs font-mono text-muted-foreground w-28 truncate shrink-0">
                                  {k}{k === "id" && <span className="text-destructive ml-0.5">*</span>}
                                </span>
                                <span className="text-xs text-muted-foreground">:</span>
                                <span className="text-xs font-mono flex-1">{String(v)}</span>
                                {k !== "id" && (
                                  <Button
                                    size="icon" variant="ghost"
                                    className="h-5 w-5 shrink-0 opacity-0 group-hover/abfield:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); deleteAbilityField(idx, k) }}
                                    disabled={saving}
                                  ><X className="w-3 h-3" /></Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {editingAbilityIdx === idx && editingAbilityKey === "__new__" ? (
                          <div className="flex items-center gap-1.5 py-0.5 mt-1">
                            <Input value={editingAbilityFieldKey} onChange={(e) => setEditingAbilityFieldKey(e.target.value)} placeholder="key" className="h-7 text-xs w-28 font-mono" disabled={saving} autoFocus />
                            <span className="text-muted-foreground text-xs">:</span>
                            <Input value={editingAbilityFieldValue} onChange={(e) => setEditingAbilityFieldValue(e.target.value)} placeholder="value" className="h-7 text-xs flex-1 font-mono" disabled={saving} />
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveAbilityField} disabled={saving}>
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEditAbilityField} disabled={saving}><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 mt-1" onClick={() => startAddAbilityField(idx)} disabled={saving || Object.keys(ability).length >= MAX_ABILITY_FIELDS}>
                            <Plus className="w-3 h-3" /> {t('entity.addField')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 mt-1" onClick={addAbility} disabled={saving || abilityCount >= MAX_ABILITIES_PER_ENTITY}>
                  <Plus className="w-3 h-3" /> {t('entity.addAbility')}
                </Button>
              </div>
            </dd>
          </div>

        </dl>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EntitiesPage() {
  const params = useParams<{ id: string }>()
  const gameId = params.id
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState("entities")
  const [convPanelOpen, setConvPanelOpen] = useState(false)
  const [convActiveId, setConvActiveId] = useState<string | null>(null)

  // initialize tab from URL params
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "entities" || tab === "pools") {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    function readConvState() {
      setConvPanelOpen(safeGetItem('ss_conv_panel_open') === 'true')
      setConvActiveId(safeGetItem(lsActiveConv(gameId)) ?? null)
    }
    readConvState()
    const handler = () => readConvState()
    window.addEventListener('storage', handler)
    window.addEventListener('ss:conv-state-changed', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('ss:conv-state-changed', handler)
    }
  }, [gameId])

  useEffect(() => {
    if (!gameId) return

    function consumePendingEntityDraft() {
      const pendingRaw = safeGetItem(lsPendingEntityDefinitionCreate(gameId))
      if (!pendingRaw) return
      try {
        const detail = JSON.parse(pendingRaw) as Record<string, unknown>
        safeRemoveItem(lsPendingEntityDefinitionCreate(gameId))
        openCreateWithForm(draftToForm(detail), {
          turnId: typeof detail.turnId === 'string' ? detail.turnId : '',
          responseIdx: typeof detail.responseIdx === 'number' ? detail.responseIdx : Number(detail.responseIdx ?? 0),
          entityDefinitionIdx: typeof detail.entityDefinitionIdx === 'number' ? detail.entityDefinitionIdx : Number(detail.entityDefinitionIdx ?? 0),
          convId: typeof detail.convId === 'string' ? detail.convId : '',
        })
      } catch {
        safeRemoveItem(lsPendingEntityDefinitionCreate(gameId))
      }
    }

    function handleOpenCreateEntityDefinition(e: Event) {
      const detail = (e as CustomEvent).detail as Record<string, unknown> | undefined
      if (!detail) return
      openCreateWithForm(draftToForm(detail), {
        turnId: typeof detail.turnId === 'string' ? detail.turnId : '',
        responseIdx: typeof detail.responseIdx === 'number' ? detail.responseIdx : Number(detail.responseIdx ?? 0),
        entityDefinitionIdx: typeof detail.entityDefinitionIdx === 'number' ? detail.entityDefinitionIdx : Number(detail.entityDefinitionIdx ?? 0),
        convId: typeof detail.convId === 'string' ? detail.convId : '',
      })
    }

    window.addEventListener('ss:open-create-entity-definition', handleOpenCreateEntityDefinition as EventListener)

    if (searchParams.get("tab") === "entities" && searchParams.get("create") === "1") {
      consumePendingEntityDraft()
    }

    return () => {
      window.removeEventListener('ss:open-create-entity-definition', handleOpenCreateEntityDefinition as EventListener)
    }
  }, [gameId, searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set("tab", value)
    router.replace(`${window.location.pathname}?${newParams.toString()}`)
  }

  const [game, setGame] = useState<Game | null>(null)
  const [entities, setEntities] = useState<EntityDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<EntityType | "all">("all")
  const [availableTypes, setAvailableTypes] = useState<EntityType[]>(DEFAULT_ENTITY_TYPES)
  const [rarities, setRarities] = useState<string[]>(ENTITY_RARITIES)

  // ── search (server-side, debounced) ─────────────────────────────
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") ?? "")
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync search from URL params (e.g. navigating from pool tab link)
  useEffect(() => {
    const urlExpanded = searchParams.get("expanded") ?? ""
    const urlSearch = searchParams.get("search") ?? ""
    const nextSearch = urlExpanded || urlSearch
    setSearchInput((prev) => (prev === nextSearch ? prev : nextSearch))
    setSearchQuery((prev) => (prev === nextSearch ? prev : nextSearch))
  }, [searchParams])

  // ── create sheet state ───────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})
  const [autoSlug, setAutoSlug] = useState(true)
  const [createEntityConvContext, setCreateEntityConvContext] = useState<{
    turnId: string
    responseIdx: number
    entityDefinitionIdx: number
    convId: string
  } | undefined>(undefined)
  const [linkingEntityId, setLinkingEntityId] = useState<string | null>(null)

  // ── delete dialog ────────────────────────────────────────────────────────────
  // Keep the create/edit sheet above the conversation panel in the Escape stack.
  useEscapeLayer(sheetOpen, () => setSheetOpen(false), 1)

  const [deleteTarget, setDeleteTarget] = useState<EntityDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── expandable rows ──────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(
    () => searchParams.get("expanded")
  )
  const [detailCache, setDetailCache] = useState<Record<string, EntityDefinition | "loading" | "error">>({}
  )

  // Keep expanded row in sync with URL changes so linked-content navigation opens the row directly.
  useEffect(() => {
    const id = searchParams.get("expanded")
    setExpandedId(id)
    if (!id || detailCache[id] === 'loading' || (detailCache[id] && detailCache[id] !== 'error')) return
    setDetailCache((prev) => ({ ...prev, [id]: "loading" }))
    getEntityDefinition(gameId, id)
      .then((detail) => setDetailCache((prev) => ({ ...prev, [id]: detail })))
      .catch(() => setDetailCache((prev) => ({ ...prev, [id]: "error" })))
  }, [gameId, searchParams, detailCache])

  function toggleExpand(entity: EntityDefinition) {
    const next = expandedId === entity.id ? null : entity.id
    setExpandedId(next)
    const sp = new URLSearchParams(searchParams.toString())
    if (next) sp.set("expanded", next)
    else sp.delete("expanded")
    router.replace(`?${sp.toString()}`, { scroll: false })
    if (!next || detailCache[entity.id]) return
    setDetailCache((prev) => ({ ...prev, [entity.id]: "loading" }))
    getEntityDefinition(gameId, entity.id)
      .then((detail) => setDetailCache((prev) => ({ ...prev, [entity.id]: detail })))
      .catch(() => setDetailCache((prev) => ({ ...prev, [entity.id]: "error" })))
  }

  // ── initial load ─────────────────────────────────────────────────────────────
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      try {
        const listParams = {
          type: typeFilter !== "all" ? typeFilter : undefined,
          search: searchQuery.trim() || undefined,
        }
        const [g, list] = await Promise.all([
          game ? Promise.resolve(game) : getGame(gameId),
          listEntityDefinitions(gameId, listParams),
        ])
        setGame(g)
        setEntities(list)
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('entity.failedLoad')
        toast({ title: t('common.error'), description: msg, variant: "destructive" })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [gameId, typeFilter, searchQuery, toast],
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

  // Fetch available rarities from API
  useEffect(() => {
    fetchItemRarities()
      .then((list) => { if (list.length > 0) setRarities(list) })
      .catch(() => {}) // keep defaults on failure
  }, [])

  // Re-fetch list when typeFilter changes
  useEffect(() => {
    loadData()
  }, [loadData])

  function handleSearchInput(value: string) {
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 400)
  }

  function clearSearch() {
    setSearchInput("")
    setSearchQuery("")
    setExpandedId(null)
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete("search")
    newParams.delete("expanded")
    const qs = newParams.toString()
    router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
  }

  // ── form helpers ─────────────────────────────────────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function openCreateWithForm(
    nextForm?: FormState,
    context?: {
      turnId: string
      responseIdx: number
      entityDefinitionIdx: number
      convId: string
    },
  ) {
    setForm(nextForm ?? emptyForm())
    setJsonErrors({})
    setAutoSlug(!(nextForm?.entity_key?.trim()))
    setCreateEntityConvContext(context)
    const sp = new URLSearchParams(searchParams.toString())
    sp.set("tab", "entities")
    sp.set("create", "1")
    sp.delete("editFromLLM")
    router.replace(`${window.location.pathname}?${sp.toString()}`)
    setSheetOpen(true)
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
    openCreateWithForm()
  }

  async function handleLinkEntityToConversation(entity: EntityDefinition) {
    setLinkingEntityId(entity.id)
    try {
      let convId: string | null = safeGetItem(lsActiveConv(gameId))
      if (!convId) {
        const newConv = await createConversation(gameId, {
          title: `Entity: ${entity.name}`,
          goal: t('entity.linkToConvGoal').replace('{name}', entity.name),
        })
        convId = newConv.ID
      }
      safeSetItem(lsActiveConv(gameId), convId)
      await linkConversationContent(gameId, convId, 'entity_definition', entity.id)
      window.dispatchEvent(new CustomEvent('ss:conv-external-created', { detail: { convId, gameId } }))
      window.dispatchEvent(new CustomEvent('ss:conv-content-linked', {
        detail: { convId, gameId, contentType: 'entity_definition', contentId: entity.id, contentName: entity.name },
      }))
      toast({ title: t('entity.linkToConvSuccess'), description: entity.name })
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: t('entity.linkToConvFailed'),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLinkingEntityId(null)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: t('common.validation'), description: t('entity.nameRequired'), variant: "destructive" })
      return
    }
    if (!form.entity_key.trim()) {
      toast({ title: t('common.validation'), description: t('entity.entityKeyRequired'), variant: "destructive" })
      return
    }

    const statsOk = validateJsonField("stats", form.stats)
    const abilitiesOk = validateJsonField("abilities", form.abilities)
    const metaOk = validateJsonField("metadata", form.metadata)
    if (!statsOk || !abilitiesOk || !metaOk) {
      toast({ title: t('common.validation'), description: t('entity.fixJsonErrors'), variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const body: CreateEntityDefinitionRequest = {
        entity_key: form.entity_key.trim(),
        entity_type: form.entity_type,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        rarity: form.rarity || undefined,
        stats: tryParseJson(form.stats),
        abilities: tryParseJson(form.abilities) as any,
        metadata: tryParseJson(form.metadata),
      }
      const created = await createEntityDefinition(gameId, body)
      setEntities((prev) => [...prev, created])
      if (createEntityConvContext?.convId && createEntityConvContext.turnId && createEntityConvContext.responseIdx != null && createEntityConvContext.entityDefinitionIdx != null) {
        const entityKey = `${createEntityConvContext.turnId}:${createEntityConvContext.responseIdx}:${createEntityConvContext.entityDefinitionIdx}`
        const convId = createEntityConvContext.convId
        const existingRaw = safeGetItem(lsEntityLinks(convId))
        let mapped: Record<string, string> = {}
        if (existingRaw) {
          try {
            mapped = JSON.parse(existingRaw) as Record<string, string>
          } catch {
            mapped = {}
          }
        }
        const updated = { ...mapped, [entityKey]: created.id }
        safeSetItem(lsEntityLinks(convId), JSON.stringify(updated))
        let namesMap: Record<string, string> = {}
        const existingNamesRaw = safeGetItem(lsEntityNames(convId))
        if (existingNamesRaw) {
          try {
            namesMap = JSON.parse(existingNamesRaw) as Record<string, string>
          } catch {
            namesMap = {}
          }
        }
        safeSetItem(lsEntityNames(convId), JSON.stringify({ ...namesMap, [created.id]: created.name }))
        void linkConversationContent(gameId, convId, 'entity_definition', created.id)
          .then(() => {
            window.dispatchEvent(new CustomEvent('ss:entity-created', {
              detail: {
                entityId: created.id,
                entityName: created.name,
                turnId: createEntityConvContext.turnId,
                responseIdx: createEntityConvContext.responseIdx,
                entityDefinitionIdx: createEntityConvContext.entityDefinitionIdx,
                convId,
                gameId,
              },
            }))
            window.dispatchEvent(new CustomEvent('ss:conv-content-linked', {
              detail: { convId, gameId, contentType: 'entity_definition', contentId: created.id, contentName: created.name },
            }))
          })
          .catch(() => { /* best-effort */ })
      }
      toast({ title: t('common.added'), description: t('entity.entityCreated').replace('{name}', created.name) })
      setSheetOpen(false)
      // Refresh game data to update usage count
      getGame(gameId).then(setGame).catch(() => {})
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedSave')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
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
      toast({ title: t('common.deleted'), description: t('entity.entityDeleted').replace('{name}', deleteTarget.name) })
      setDeleteTarget(null)
      // Refresh game data to update usage count
      getGame(gameId).then(setGame).catch(() => {})
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('entity.failedDelete')
      toast({ title: t('common.error'), description: msg, variant: "destructive" })
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
              <BreadcrumbLink href="/games">{t('common.games')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{t('entity.breadcrumb')}</span>
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
            <h1 className="text-3xl font-bold tracking-tight">{t('entity.title')}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {game?.limits?.max_entity_defs != null
                ? (() => {
                    const used = game.usage?.entity_definitions ?? 0
                    const max = game.limits.max_entity_defs
                    return <>
                    <span className={used >= max ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {max.toLocaleString()} {t('entity.entitiesCount')}
                    </span>
                    <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                      <span
                        className={`block h-full rounded-full transition-all ${
                          used >= max ? "bg-destructive" : used / max >= 0.8 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min((used / max) * 100, 100)}%` }}
                      />
                    </span>
                    <Link
                      href={`/games/${gameId}/plugins`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      title={t('entity.upgradeTip')}
                    >
                      <Hammer className="h-3.5 w-3.5" />
                    </Link>
                  </>
                  })()
                : entities.length > 0 ? `${entities.length} ${entities.length === 1 ? t('entity.entityDefined') : t('entity.entitiesDefined')}` : t('entity.noEntitiesYet')
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="entities" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="entities">{t('entity.entitiesTab')}</TabsTrigger>
          <TabsTrigger value="pools">{t('entity.poolTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-4">
          <TooltipProvider>
            {/* Entities Tab Toolbar */}
            <div className="mb-4 flex items-center justify-end gap-2">
              <div className="ml-auto flex items-center justify-end gap-2">
                <div className="relative w-[400px] shrink-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('entity.searchPlaceholder')}
                    className="pl-8"
                    value={searchInput}
                    onChange={(e) => handleSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "all" : v as EntityType)}>
                  <SelectTrigger className="w-[180px] shrink-0">
                    <SelectValue placeholder={t('entity.allTypes')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('entity.allTypes')}</SelectItem>
                    {availableTypes.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{ENTITY_TYPE_LABELS[t] ?? t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => loadData()} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <Button onClick={openCreate} disabled={game?.limits?.max_entity_defs != null && (game.usage?.entity_definitions ?? 0) >= game.limits.max_entity_defs}>
                <Plus className="mr-2 h-4 w-4" /> {t('entity.newEntity')}
              </Button>
            </div>

            {/* Entities Main Table */}
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    {convPanelOpen && convActiveId && <TableHead className="w-[56px]"></TableHead>}
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>{t('entity.thName')}</TableHead>
                    <TableHead className="w-[200px]">{t('entity.thKey')}</TableHead>
                    <TableHead>{t('entity.thType')}</TableHead>
                    <TableHead>{t('entity.thRarity')}</TableHead>
                    <TableHead className="w-[100px]">{t('entity.thActive')}</TableHead>
                    <TableHead className="text-right">{t('entity.thActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={convPanelOpen && convActiveId ? 8 : 7}><Skeleton className="h-12 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : entities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={convPanelOpen && convActiveId ? 8 : 7} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Skull className="h-8 w-8 opacity-20" />
                          <p>{searchQuery ? t('entity.noEntitiesFound') : t('entity.createFirstEntity')}</p>
                          {searchQuery && <Button variant="link" onClick={clearSearch}>{t('entity.adjustFilters')}</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    entities.map((entity) => {
                        const isExpanded = expandedId === entity.id
                        const detail = detailCache[entity.id]

                        return (
                          <Fragment key={entity.id}>
                            <TableRow
                              className={`group cursor-pointer hover:bg-muted/50 ${isExpanded ? "bg-muted/30" : ""}`}
                              onClick={() => toggleExpand(entity)}
                            >
                              {convPanelOpen && convActiveId && (
                                <TableCell>
                                  <Button
                                    id={`entity-row-${entity.id}-link-conv-btn`}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                                    disabled={linkingEntityId === entity.id}
                                    title={t('entity.linkToConv')}
                                    onClick={(e) => { e.stopPropagation(); void handleLinkEntityToConversation(entity) }}
                                  >
                                    {linkingEntityId === entity.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : (
                                        <span id={`entity-row-${entity.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                          <Bot className="h-3.5 w-3.5" />
                                          <Plus className="h-2.5 w-2.5 stroke-[3]" />
                                        </span>
                                      )}
                                  </Button>
                                </TableCell>
                              )}
                              <TableCell>
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="font-medium">{entity.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                  {entity.entity_key}
                                  <CopyButton text={entity.entity_key} />
                                </div>
                              </TableCell>
                              <TableCell><EntityTypeBadge type={entity.entity_type} /></TableCell>
                              <TableCell><RarityBadge rarity={entity.rarity} /></TableCell>
                              <TableCell>
                                <Switch checked={entity.is_active} onCheckedChange={() => {}} disabled />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(entity) }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="hover:bg-transparent border-b">
                                <TableCell colSpan={7} className="p-0">
                                  <div className="p-4 bg-muted/10">
                                    {detail && detail !== "loading" && detail !== "error" ? (
                                      <EntityInlineEditForm
                                        entity={detail as EntityDefinition}
                                        gameId={gameId}
                                        rarities={rarities}
                                        availableTypes={availableTypes}
                                        onSaved={(upd) => {
                                          setEntities((prev) => prev.map((e) => e.id === upd.id ? upd : e))
                                          setDetailCache((prev) => ({ ...prev, [upd.id]: upd }))
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                                        {detail === "loading" ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>{t('entity.loadingDetail')}</span>
                                          </>
                                        ) : detail === "error" ? (
                                          <span>{t('entity.failedLoadDetail')}</span>
                                        ) : (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </TabsContent>

        <TabsContent value="pools">
          <EntityPoolTab gameId={gameId} />
        </TabsContent>
      </Tabs>




      {/* Create / Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) {
            const sp = new URLSearchParams(searchParams.toString())
            sp.delete("create")
            sp.delete("editFromLLM")
            router.replace(`${window.location.pathname}?${sp.toString()}`)
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('entity.createTitle')}</SheetTitle>
            <SheetDescription>{t('entity.createDesc')}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                {t('entity.fieldName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('entity.namePlaceholder')}
                value={form.name}
                onChange={(e) => {
                  const v = e.target.value
                  setField("name", v)
                  if (autoSlug) {
                    setField("entity_key", toSlugUnderscore(v))
                  }
                }}
              />
            </div>

            {/* entity_key */}
            <div className="space-y-1.5">
              <Label htmlFor="entity_key">
                {t('entity.entityKey')} <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="entity_key"
                  placeholder={t('entity.entityKeyPlaceholder')}
                  value={form.entity_key}
                  onChange={(e) => {
                    setAutoSlug(false)
                    setField("entity_key", e.target.value)
                  }}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant={autoSlug ? "default" : "outline"}
                  size="icon"
                  className="shrink-0"
                  title={autoSlug ? t('entity.autoSlugOn') : t('entity.autoSlugOff')}
                  onClick={() => {
                    setAutoSlug(true)
                    setField("entity_key", toSlugUnderscore(form.name))
                  }}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('entity.entityKeyDesc')}</p>
            </div>

            {/* entity_type */}
            <div className="space-y-1.5">
              <Label htmlFor="entity_type">
                {t('entity.entityType')} <span className="text-destructive">*</span>
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

            {/* rarity */}
            <div className="space-y-1.5">
              <Label htmlFor="rarity">{t('entity.fieldRarity')}</Label>
              <Select
                value={form.rarity}
                onValueChange={(v) => setField("rarity", v as EntityRarity)}
              >
                <SelectTrigger id="rarity">
                  <SelectValue placeholder={t('entity.selectRarity')} />
                </SelectTrigger>
                <SelectContent>
                  {rarities.map((r) => (
                    <SelectItem key={r} value={r}>
                      {formatLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">{t('entity.fieldDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('entity.optionalDesc')}
                rows={2}
                value={form.description}
                onChange={(e) => setField("description", e.target.value.slice(0, 500))}
              />
              <p className={`text-xs text-right ${form.description.length >= 500 ? "text-destructive" : "text-muted-foreground"}`}>{form.description.length}/500</p>
            </div>

            {/* stats */}
            {/* abilities */}
            {/* metadata */}
            {/* (added via inline editor after creation) */}
          </div>

          <SheetFooter className="gap-2">
            <SheetClose asChild>
              <Button variant="outline" disabled={saving}>
                {t('common.cancel')}
              </Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t('entity.createEntity')}
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
            <AlertDialogTitle>{t('entity.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('entity.deleteDescPre')}{" "}
              <span className="font-semibold">"{deleteTarget?.name}"</span>{" "}
              (<code className="font-mono text-xs">{deleteTarget?.entity_key}</code>).{" "}
              {t('entity.deleteDescPost')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
