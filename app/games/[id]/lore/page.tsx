"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Plus, RefreshCw, Loader2, BookOpen, Pencil, Trash2, ChevronDown, ChevronRight, Search, X, Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CopyButton } from "@/components/CopyButton"
import { GameNavButtons } from "@/components/GameNavButtons"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { getGame } from "@/lib/game-api"
import {
  listLoreEntries,
  createLoreEntry,
  updateLoreEntry,
  deleteLoreEntry,
  getLoreTypes,
  getLoreEntry,
} from "@/lib/lore-api"
import { createConversation, linkConversationContent } from "@/lib/llm-conversation-api"
import { safeGetItem, safeSetItem } from "@/lib/storage-utils"
import type { Game } from "@/types/game"
import type { LoreEntry, CreateLoreEntryRequest, UpdateLoreEntryRequest } from "@/types/lore"

const BADGE_CLASS = "inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium bg-muted text-muted-foreground border-border"

interface LoreRowProps {
  entry: LoreEntry
  expanded: boolean
  onToggle: () => void
  onEditRequested: (e: LoreEntry) => void
  onDeleteRequested: (e: LoreEntry) => void
  locale: string
  t: (key: string) => string
  convPanelOpen?: boolean
  linkingEntryId?: string | null
  onLinkToConversation?: (e: LoreEntry) => void
}

function LoreRow({ entry, expanded, onToggle, onEditRequested, onDeleteRequested, locale, t, convPanelOpen, linkingEntryId, onLinkToConversation }: LoreRowProps) {
  return (
    <div className="bg-card border-b last:border-b-0">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {/* Expand toggle */}
        <div className="w-[20px] shrink-0 flex justify-center">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>

        {/* Link to conversation button (when panel is open) */}
        {convPanelOpen && (
          <div
            id={`lore-row-${entry.ID}-link-conv-col`}
            className="w-[32px] shrink-0 flex justify-center"
            onClick={e => e.stopPropagation()}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id={`lore-row-${entry.ID}-link-conv-btn`}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                    disabled={linkingEntryId === entry.ID}
                    onClick={() => onLinkToConversation?.(entry)}
                  >
                    {linkingEntryId === entry.ID
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : (
                        <span id={`lore-row-${entry.ID}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                          <Bot className="h-3.5 w-3.5" />
                          <Plus className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent id={`lore-row-${entry.ID}-link-conv-tooltip`}>
                  {t("lore.linkToConv")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Type badge */}
        <div className="w-[110px] shrink-0">
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium bg-muted text-muted-foreground border-border truncate max-w-full">
            {entry.LoreType ? loreTypeLabel(entry.LoreType, t) : "—"}
          </span>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <p className="font-semibold text-sm truncate">{entry.Title}</p>
          <CopyButton text={entry.Title} />
        </div>

        {/* Actions */}
        <div
          id={`lore-row-${entry.ID}-actions`}
          className="w-16 shrink-0 flex items-center justify-end gap-1"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            title={t("lore.editTitle")}
            onClick={() => onEditRequested(entry)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title={t("common.delete") || "Delete"}
            onClick={() => onDeleteRequested(entry)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div id={`lore-row-${entry.ID}-meta-row`} className="flex items-center gap-3 mb-2">
            <div id={`lore-row-${entry.ID}-id-row`} className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground font-mono">ID: {entry.ID}</p>
              <CopyButton text={entry.ID} />
            </div>
            <p id={`lore-row-${entry.ID}-updated-at`} className="text-xs text-muted-foreground tabular-nums">
              {t("lore.tableHeaderUpdatedAt")}: {new Date(entry.UpdatedAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
            </p>
          </div>
          {entry.Summary && (
            <p id={`lore-row-${entry.ID}-summary`} className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {entry.Summary}
            </p>
          )}
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed rounded border bg-muted/30 p-3 max-h-96 overflow-y-auto">
            {entry.Content || <span className="italic opacity-50">— no content —</span>}
          </div>
        </div>
      )}
    </div>
  )
}

const LORE_TYPE_I18N_KEY: Record<string, string> = {
  world: "lore.typeWorld",
  region: "lore.typeRegion",
  faction: "lore.typeFaction",
  character: "lore.typeCharacter",
  item_lore: "lore.typeItemLore",
  event: "lore.typeEvent",
  creature: "lore.typeCreature",
  custom: "lore.typeCustom",
}

function loreTypeLabel(type: string, t: (key: string) => string): string {
  const key = LORE_TYPE_I18N_KEY[type]
  return key ? t(key) : type
}

const DEFAULT_FORM: CreateLoreEntryRequest = {
  lore_type: "",
  title: "",
  summary: "",
  content: "",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAGE_SIZE = 20

export default function LorePage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  const gameId = params.id

  const loreIdParam = searchParams.get('lore_id')

  const [game, setGame] = useState<Game | null>(null)
  const [entries, setEntries] = useState<LoreEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter
  const [typeFilter, setTypeFilter] = useState("")

  // Search (server-side, debounced)
  const [searchInput, setSearchInput] = useState(loreIdParam ?? "")
  const [searchQuery, setSearchQuery] = useState(loreIdParam ?? "")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pagination
  const [offset, setOffset] = useState(0)

  // Create / edit sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LoreEntry | null>(null)
  const [form, setForm] = useState<CreateLoreEntryRequest>(DEFAULT_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deletingEntry, setDeletingEntry] = useState<LoreEntry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Accordion
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Conversation panel integration
  const [convPanelOpen, setConvPanelOpen] = useState(false)
  const [convActiveId, setConvActiveId] = useState<string | null>(null)
  const [linkingEntryId, setLinkingEntryId] = useState<string | null>(null)

  useEffect(() => {
    function readPanelState() {
      setConvPanelOpen(safeGetItem('ss_conv_panel_open') === 'true')
      setConvActiveId(safeGetItem(`ss_conv_active_${gameId}`) ?? null)
    }
    readPanelState()
    const handler = () => readPanelState()
    window.addEventListener('storage', handler)
    window.addEventListener('ss:conv-state-changed', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('ss:conv-state-changed', handler)
    }
  }, [gameId])

  // Spotlight: a single entry highlighted via ?lore_id= URL param
  const [spotlightEntry, setSpotlightEntry] = useState<LoreEntry | null>(null)
  const [spotlightLoading, setSpotlightLoading] = useState(false)

  // When lore_id param changes, auto-fill search input and trigger API search
  useEffect(() => {
    if (loreIdParam) {
      setSearchInput(loreIdParam)
      setSearchQuery(loreIdParam)
    }
  }, [loreIdParam])

  useEffect(() => {
    if (!loreIdParam) {
      setSpotlightEntry(null)
      return
    }
    setSpotlightLoading(true)
    getLoreEntry(gameId, loreIdParam)
      .then(entry => {
        setSpotlightEntry(entry)
        setExpandedId(entry.ID)
      })
      .catch(() => setSpotlightEntry(null))
      .finally(() => setSpotlightLoading(false))
  }, [gameId, loreIdParam])

  // Lore types from API
  const [loreTypes, setLoreTypes] = useState<string[]>([])

  useEffect(() => {
    getLoreTypes().then(types => setLoreTypes(types)).catch(() => {})
  }, [])

  const fetchAll = useCallback(async (currentOffset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const [g, res] = await Promise.all([
        getGame(gameId).catch(() => null),
        listLoreEntries(gameId, {
          limit: PAGE_SIZE,
          offset: currentOffset,
          type: typeFilter || undefined,
          ...(searchQuery
            ? UUID_RE.test(searchQuery.trim())
              ? { id: searchQuery.trim() }
              : { q: searchQuery.trim() }
            : {}),
        }),
      ])
      if (g) setGame(g)
      setEntries(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("lore.toastFailedLoad"))
    } finally {
      setLoading(false)
    }
  }, [gameId, typeFilter, searchQuery])

  useEffect(() => {
    setOffset(0)
    fetchAll(0)
  }, [fetchAll])

  function openCreate() {
    setEditingEntry(null)
    setForm({ ...DEFAULT_FORM, lore_type: typeFilter || "" })
    setFormError(null)
    setSheetOpen(true)
  }

  function openEdit(entry: LoreEntry) {
    setEditingEntry(entry)
    setForm({
      lore_type: entry.LoreType,
      title: entry.Title,
      summary: entry.Summary,
      content: entry.Content,
    })
    setFormError(null)
    setSheetOpen(true)
  }

  function validateForm(): string | null {
    if (!form.title.trim()) return t("lore.validationTitleRequired")
    if (!form.lore_type) return t("lore.validationTypeRequired")
    return null
  }

  function handleSearchInput(value: string) {
    setSearchInput(value)
    if (loreIdParam) router.replace(`/games/${gameId}/lore`)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 400)
  }

  function clearSearch() {
    setSearchInput("")
    setSearchQuery("")
    setSpotlightEntry(null)
    if (loreIdParam) router.replace(`/games/${gameId}/lore`)
  }

  async function handleSave() {
    const err = validateForm()
    if (err) { setFormError(err); return }
    setFormError(null)
    setSaving(true)
    try {
      if (editingEntry) {
        const body: UpdateLoreEntryRequest = {
          lore_type: form.lore_type.trim(),
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content.trim(),
        }
        const updated = await updateLoreEntry(gameId, editingEntry.ID, body)
        setEntries(prev => prev.map(e => e.ID === updated.ID ? updated : e))
        toast({ title: t("lore.toastUpdated"), description: updated.Title })
      } else {
        const created = await createLoreEntry(gameId, {
          lore_type: form.lore_type,
          title: form.title.trim(),
          summary: form.summary.trim(),
          content: form.content.trim(),
        })
        setEntries(prev => [created, ...prev])
        setTotal(prev => prev + 1)
        toast({ title: t("lore.toastCreated"), description: created.Title })
      }
      setSheetOpen(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : (editingEntry ? t("lore.toastFailedUpdate") : t("lore.toastFailedCreate")))
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkToConversation(entry: LoreEntry) {
    setLinkingEntryId(entry.ID)
    try {
      let convId: string | null = convActiveId
      if (!convId) {
        // No active conversation — create a new one
        const newConv = await createConversation(gameId, {
          title: `Lore: ${entry.Title}`,
          goal: t('lore.linkToConvGoal').replace('{title}', entry.Title),
        })
        convId = newConv.ID
      }

      safeSetItem(`ss_conv_active_${gameId}`, convId)
      setConvActiveId(convId)
      await linkConversationContent(gameId, convId, 'lore_entry', entry.ID)
      // Dispatch AFTER linking so the useEffect([activeConvId]) in the panel loads already-linked content
      window.dispatchEvent(new CustomEvent('ss:conv-external-created', { detail: { convId, gameId } }))
      window.dispatchEvent(new CustomEvent('ss:conv-content-linked', { detail: { convId, gameId } }))
      toast({ title: t('lore.linkToConvSuccess'), description: entry.Title })
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: t('lore.linkToConvFailed'),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLinkingEntryId(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingEntry) return
    setIsDeleting(true)
    try {
      await deleteLoreEntry(gameId, deletingEntry.ID)
      setEntries(prev => prev.filter(e => e.ID !== deletingEntry.ID))
      setTotal(prev => prev - 1)
      toast({ title: t("lore.toastDeleted"), description: deletingEntry.Title })
      setDeletingEntry(null)
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("lore.toastFailedDelete"),
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredEntries = spotlightEntry ? [spotlightEntry] : entries

  return (
    <div className="container mx-auto py-6">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">{t("lore.breadcrumbGames")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{game?.name ?? gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{t("lore.breadcrumbLore")}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
              {t("lore.pageTitle")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {total > 0
                ? `${total} ${total !== 1 ? t("lore.entryCountPlural") : t("lore.entryCount")}`
                : game?.name ?? gameId}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="lore" />
        </div>
      </div>

      {/* Toolbar row 1 – type tabs + create */}
      <div id="lore-toolbar-top" className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div id="lore-type-tabs-wrap" className="overflow-x-auto">
          {loreTypes.length > 0 && (
            <Tabs
              value={typeFilter || "all"}
              onValueChange={v => {
                if (loreIdParam) router.replace(`/games/${gameId}/lore`)
                setTypeFilter(v === "all" ? "" : v)
                setOffset(0)
              }}
            >
              <TabsList id="lore-type-tabslist" className="h-8">
                <TabsTrigger id="lore-tab-all" value="all" className="text-xs px-3 h-7">
                  {t("lore.filterAll")}
                </TabsTrigger>
                {loreTypes.map(type => (
                  <TabsTrigger id={`lore-tab-${type}`} key={type} value={type} className="text-xs px-3 h-7">
                    {loreTypeLabel(type, t)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
        <Button id="lore-btn-create" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t("lore.newEntry")}
        </Button>
      </div>

      {/* Toolbar row 2 – search + refresh */}
      <div id="lore-toolbar-search" className="flex items-center gap-2 mb-4">
        <div id="lore-search-wrap" className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="lore-search-input"
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder={t("lore.searchPlaceholder")}
            className="h-8 pl-8 pr-7 text-sm"
          />
          {searchInput && (
            <button
              id="lore-search-clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={clearSearch}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button id="lore-btn-refresh" variant="outline" size="icon" className="h-8 w-8" onClick={() => fetchAll(offset)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table header */}
      {!loading && !spotlightLoading && filteredEntries.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground font-medium border-b bg-muted/30 rounded-t">
          <div className="w-[20px] shrink-0" />
          {convPanelOpen && <div id="lore-table-header-link-conv" className="w-[32px] shrink-0" />}
          <div className="w-[110px] shrink-0">{t("lore.tableHeaderType")}</div>
          <div className="flex-1">{t("lore.tableHeaderTitle")}</div>
          <div className="w-16 shrink-0" />
        </div>
      )}

      {/* Loading */}
      {(loading || spotlightLoading) && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("lore.noEntriesYet")}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !spotlightLoading && filteredEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">{t("lore.emptyTitle")}</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t("lore.newEntry")}
          </Button>
        </div>
      )}

      {/* Entries list */}
      {!loading && !spotlightLoading && filteredEntries.length > 0 && (
        <div className="border rounded-b overflow-hidden divide-y">
          {filteredEntries.map(entry => (
            <LoreRow
              key={entry.ID}
              entry={entry}
              expanded={expandedId === entry.ID}
              onToggle={() => setExpandedId(prev => prev === entry.ID ? null : entry.ID)}
              onEditRequested={openEdit}
              onDeleteRequested={setDeletingEntry}
              locale={locale}
              t={t}
              convPanelOpen={convPanelOpen}
              linkingEntryId={linkingEntryId}
              onLinkToConversation={handleLinkToConversation}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !spotlightEntry && total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} / {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => { const o = Math.max(0, offset - PAGE_SIZE); setOffset(o); fetchAll(o) }}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => { const o = offset + PAGE_SIZE; setOffset(o); fetchAll(o) }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingEntry ? t("lore.editTitle") : t("lore.createTitle")}</SheetTitle>
            <SheetDescription>
              {editingEntry ? t("lore.editDescription") : t("lore.createDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Type */}
            <div className="space-y-1.5">
              <Label>{t("lore.labelType")}</Label>
              <Select
                value={form.lore_type}
                onValueChange={v => setForm(prev => ({ ...prev, lore_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("lore.placeholderType")} />
                </SelectTrigger>
                <SelectContent>
                  {loreTypes.map(type => (
                    <SelectItem key={type} value={type}>{loreTypeLabel(type, t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>{t("lore.labelTitle")}</Label>
              <Input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t("lore.placeholderTitle")}
                maxLength={255}
              />
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <Label>{t("lore.labelSummary")}</Label>
              <Textarea
                value={form.summary}
                onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder={t("lore.placeholderSummary")}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{form.summary.length} / 500</p>
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label>{t("lore.labelContent")}</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder={t("lore.placeholderContent")}
                maxLength={100000}
                rows={10}
                className="font-mono text-sm resize-y"
              />
              <p className="text-xs text-muted-foreground text-right">{form.content.length.toLocaleString()} / 100 000</p>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              {t("lore.btnCancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingEntry ? t("lore.btnSave") : t("lore.btnCreate")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingEntry} onOpenChange={open => { if (!open) setDeletingEntry(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("lore.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("lore.deleteDescription")} <strong>{deletingEntry?.Title}</strong>?{" "}
              {t("lore.deleteCannotUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("lore.btnCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
