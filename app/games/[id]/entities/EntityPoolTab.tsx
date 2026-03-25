"use client"

import React, { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react"
import Link from "next/link"
import { Plus, RefreshCw, Trash2, Pencil, Save, Search, X, Loader2, ChevronRight, Skull, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { listEntityPools, getEntityPool, updateEntityPool } from "@/lib/entity-definition-api"
import { ApiError } from "@/lib/api-client"
import type { EntityPool, EntityPoolEntry, EntityRarity } from "@/types/entity-definition"
import { ENTITY_RARITY_COLORS, ENTITY_TYPE_LABELS } from "@/types/entity-definition"
import { CopyButton } from "@/components/CopyButton"

export function EntityPoolTab({ gameId }: { gameId: string }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const tRef = useRef(t)
  const toastRef = useRef(toast)
  tRef.current = t
  toastRef.current = toast

  const [pools, setPools] = useState<EntityPool[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const filteredPools = pools.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pool_key.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedId(expandedId === id ? null : id)
  }

  const handlePoolUpdated = (updated: EntityPool) => {
    setPools(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t('entity.poolTab')}</h2>
          <p className="text-sm text-muted-foreground">
            {refreshing ? t('common.loading') : `${filteredPools.length} ${t('entity.entitiesCount')}`}
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
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => loadPools(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {t('common.refresh')}
          </Button>
          <Button size="sm" className="h-9 gap-2" onClick={() => toast({ title: t('entity.featureComingSoon') })}>
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
              <Button variant="outline" size="sm" className="mt-6" onClick={() => toast({ title: t('entity.featureComingSoon') })}>
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
                            <Badge variant={pool.is_active ? "default" : "secondary"} className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider ${pool.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}`}>
                              {pool.is_active ? t('common.active') : t('common.inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(pool.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); toast({ title: t('entity.featureComingSoon') }) }}>
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
    </div>
  )
}

// ─── Inline edit expanded content ──────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity?: EntityRarity }) {
  if (!rarity) return <span className="text-muted-foreground text-xs">—</span>
  const c = ENTITY_RARITY_COLORS[rarity]
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
    if (editingField === "name" && !editName.trim()) {
      toast({ title: t('common.validation'), description: t('entity.nameRequired'), variant: "destructive" })
      return
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
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm flex-1" disabled={saving} />
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
                  <Textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value.slice(0, 500))} className="text-sm resize-none" disabled={saving} />
                  <p className={`text-xs text-right ${editDescription.length >= 500 ? "text-destructive" : "text-muted-foreground"}`}>{editDescription.length}/500</p>
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

      {/* Entries */}
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1 border-l-2 border-primary/50">
          Entries {!loadingDetail && <span className="text-muted-foreground font-normal normal-case tracking-normal">({entries.length})</span>}
        </h4>
        {loadingDetail ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full rounded" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('entity.noEntries') || 'No entries in this pool'}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-muted/30">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted/30">
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldName')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldEntityKey')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldEntityType')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">{t('entity.fieldRarity')}</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8 text-right">Weight</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8 text-right">%</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground/60 h-8">Stats</TableHead>
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
                      <Badge variant="outline" className="bg-muted/50 border-none px-2 py-0.5 font-mono text-[11px] h-auto">
                        {entry.entity_key}
                      </Badge>
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
                      <span className="text-sm font-mono font-medium">{entry.weight}</span>
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
