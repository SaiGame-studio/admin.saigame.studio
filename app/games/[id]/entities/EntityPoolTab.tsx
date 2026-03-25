"use client"

import React, { useEffect, useState, useCallback, useRef, Fragment } from "react"
import { Plus, RefreshCw, Trash2, Pencil, Search, X, Loader2, ChevronRight, ChevronDown, Skull } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import { listEntityPools } from "@/lib/entity-definition-api"
import type { EntityPool } from "@/types/entity-definition"
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
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80" onClick={(e) => { e.stopPropagation(); toast({ title: t('entity.featureComingSoon') }) }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); toast({ title: t('entity.featureComingSoon') }) }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10 border-none">
                            <TableCell colSpan={6} className="p-0">
                              <div className="px-12 py-8 grid grid-cols-1 md:grid-cols-2 gap-12 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1 border-l-2 border-primary/50">{t('entity.poolDescription')}</h4>
                                        <div className="bg-background/40 p-3 rounded-lg border border-muted/30">
                                          <p className="text-sm text-foreground/80 leading-relaxed">{pool.description || <span className="text-muted-foreground italic">{t('entity.noDescription')}</span>}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1 border-l-2 border-primary/50">{t('entity.internalIdentity')}</h4>
                                        <div className="flex items-center gap-2 bg-muted/30 w-fit px-3 py-1.5 rounded-md border">
                                            <code className="text-xs font-mono text-primary/80">{pool.id}</code>
                                            <CopyButton text={pool.id} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                     <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background/40 p-4 rounded-lg border border-muted/30">
                                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t('entity.fieldCreated')}</h4>
                                          <p className="text-sm font-medium">{new Date(pool.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-background/40 p-4 rounded-lg border border-muted/30">
                                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t('entity.fieldUpdated')}</h4>
                                          <p className="text-sm font-medium">{new Date(pool.updated_at).toLocaleString()}</p>
                                        </div>
                                     </div>
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
        </CardContent>
      </Card>
    </div>
  )
}

