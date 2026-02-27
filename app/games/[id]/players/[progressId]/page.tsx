"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Archive, Box, Coins, Loader2, Package, RefreshCw, ShieldBan, ShieldCheck, Star, Trophy, User } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { formatTimestamp, formatISODate } from "@/lib/utils/date-utils"
import { getGame } from "@/lib/game-api"
import { banProgress, getGameProgressDetail, getGameProgressList, getProgressItems, getProgressContainers, GameProgressDetail, PlayerItem, PlayerItemsResult, PlayerContainer, PlayerContainersResult, getPlayerIdentityMapByUserIds, PlayerIdentity, unbanProgress } from "@/lib/game-user-api"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { CopyButton } from "@/components/CopyButton"

export default function GameUserProgressDetailPage({
  params,
}: {
  params: { id: string; progressId: string }
}) {
  const gameId = params.id
  const progressId = params.progressId
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale } = useLanguage()
  const { t } = useTranslation(locale)

  const [game, setGame] = useState<any>(null)
  const [detail, setDetail] = useState<GameProgressDetail | null>(null)
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmittingBan, setIsSubmittingBan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Items tab
  const ITEMS_LIMIT = 50
  const [activeTab, setActiveTab] = useState(() => {
    const tab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null
    return tab === "items" || tab === "containers" ? tab : "info"
  })
  const [playerItems, setPlayerItems] = useState<PlayerItem[]>([])
  const [itemsTotal, setItemsTotal] = useState(0)
  const [itemsOffset, setItemsOffset] = useState(0)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // Containers tab
  const CONTAINERS_LIMIT = 50
  const [containers, setContainers] = useState<PlayerContainer[]>([])
  const [containersTotal, setContainersTotal] = useState(0)
  const [containersHasMore, setContainersHasMore] = useState(false)
  const [containersOffset, setContainersOffset] = useState(0)
  const [containersType, setContainersType] = useState<"" | "inventory" | "shulker_box">("")
  const [containersIncludeDeleted, setContainersIncludeDeleted] = useState(false)
  const [containersLoading, setContainersLoading] = useState(false)
  const [containersError, setContainersError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [gameRes, detailRes, progressRes] = await Promise.all([
        getGame(gameId),
        getGameProgressDetail(progressId),
        getGameProgressList(gameId),
      ])
      const listItem = progressRes.progress.find((item) => item.id === progressId)
      const mergedDetail: GameProgressDetail = {
        ...detailRes,
        user_display_name: detailRes.user_display_name ?? listItem?.user_display_name,
        user_email: detailRes.user_email ?? listItem?.user_email,
        user_created_at: detailRes.user_created_at ?? listItem?.user_created_at,
        banned_at: detailRes.banned_at ?? listItem?.banned_at ?? null,
        banned_by: detailRes.banned_by ?? listItem?.banned_by ?? null,
      }
      const identityMap = await getPlayerIdentityMapByUserIds(
        [mergedDetail.user_id],
        [{
          user_id: mergedDetail.user_id,
          user_display_name: mergedDetail.user_display_name,
          user_email: mergedDetail.user_email,
        }]
      )
      setGame(gameRes)
      setDetail(mergedDetail)
      setIdentity(identityMap[mergedDetail.user_id] || null)
      setError(null)
    } catch (err) {
      console.error(err)
      setError("Failed to load player detail")
    } finally {
      setLoading(false)
    }
  }, [gameId, progressId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadItems = useCallback(async () => {
    setItemsLoading(true)
    setItemsError(null)
    try {
      const res = await getProgressItems(progressId, { limit: ITEMS_LIMIT, offset: itemsOffset })
      setPlayerItems(res.items ?? [])
      setItemsTotal(res.total ?? 0)
    } catch (err: any) {
      setItemsError(err?.message ?? "Failed to load items")
    } finally {
      setItemsLoading(false)
    }
  }, [progressId, itemsOffset])

  const loadContainers = useCallback(async () => {
    setContainersLoading(true)
    setContainersError(null)
    try {
      const res = await getProgressContainers(progressId, {
        limit: CONTAINERS_LIMIT,
        offset: containersOffset,
        type: containersType || undefined,
        include_deleted: containersIncludeDeleted || undefined,
      })
      setContainers(res.containers ?? [])
      setContainersHasMore(res.has_more ?? false)
      // API doesn't return total_count; derive from offset + current page
      setContainersTotal(
        res.has_more
          ? containersOffset + (res.containers?.length ?? 0) + 1
          : containersOffset + (res.containers?.length ?? 0)
      )
    } catch (err: any) {
      setContainersError(err?.message ?? "Failed to load containers")
    } finally {
      setContainersLoading(false)
    }
  }, [progressId, containersOffset, containersType, containersIncludeDeleted])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (tab === "info") {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    const qs = params.toString()
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  useEffect(() => {
    if (activeTab === "items") loadItems()
  }, [activeTab, loadItems])

  useEffect(() => {
    if (activeTab === "containers") loadContainers()
  }, [activeTab, loadContainers])

  const RARITY_STYLE: Record<string, string> = {
    common:    "bg-gray-500/15 text-gray-400 border-gray-400/40",
    uncommon:  "bg-green-500/15 text-green-500 border-green-500/40",
    rare:      "bg-blue-500/15 text-blue-400 border-blue-400/40",
    epic:      "bg-purple-500/15 text-purple-400 border-purple-400/40",
    legendary: "bg-yellow-500/15 text-yellow-500 border-yellow-400/40",
  }

  const renderMetaRow = (label: string, value?: string | number | null, copyable?: boolean) => (
    <div className="flex items-start justify-between gap-4 border-b pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-all flex items-center justify-end font-mono">
        {value ?? "-"}
        {copyable && value && typeof value === "string" && <CopyButton text={value} />}
      </span>
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            {game ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/studios">{game.studio?.name || t("common.studios")}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/games/${game.id}/players`}>Players</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>/</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span>{detail?.user_display_name || "Player detail"}</span>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem><span>Loading…</span></BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/games/${gameId}/players`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {loading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <h1 className="text-2xl font-bold">
                {identity?.display_name || detail?.user_display_name || "Player Detail"}
              </h1>
            )}
            {!loading && (identity?.masked_email || detail?.user_email) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {identity?.masked_email || detail?.user_email}
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Player Info</TabsTrigger>
          <TabsTrigger value="items">Items {itemsTotal > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{itemsTotal}</span>}</TabsTrigger>
          <TabsTrigger value="containers">Containers {containers.length > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{containers.length}{containersHasMore ? "+" : ""}</span>}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <Skeleton className="h-6 w-52" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(8)].map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : error || !detail ? (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle>{t("common.error")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{error || "Player detail not found"}</p>
                <Button variant="outline" onClick={loadData}>Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {identity?.display_name || detail.user_display_name || "Unknown"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {detail.banned_at && <Badge variant="destructive">Banned</Badge>}
                  <Badge variant="secondary">v{detail.version}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={detail.banned_at ? "outline" : "destructive"}
                        size="sm"
                        disabled={isSubmittingBan}
                      >
                        {isSubmittingBan ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : detail.banned_at ? (
                          <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Unban</>
                        ) : (
                          <><ShieldBan className="h-3.5 w-3.5 mr-1" /> Ban</>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {detail.banned_at ? "Unban" : "Ban"} player?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to {detail.banned_at ? "unban" : "ban"}{" "}
                          <strong>{identity?.display_name || detail.user_display_name || "this player"}</strong>?
                          {!detail.banned_at && " This player will no longer be able to access the game."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className={!detail.banned_at ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                          onClick={async () => {
                            setIsSubmittingBan(true)
                            try {
                              if (detail.banned_at) {
                                await unbanProgress(detail.id)
                              } else {
                                await banProgress(detail.id)
                              }

                              setDetail((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      banned_at: prev.banned_at ? null : new Date().toISOString(),
                                    }
                                  : prev
                              )
                            } catch (err) {
                              console.error("Ban/unban failed", err)
                            } finally {
                              setIsSubmittingBan(false)
                            }
                          }}
                        >
                          {detail.banned_at ? "Unban" : "Ban"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{identity?.masked_email || "***@saigame.studio"}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderMetaRow("Gamer Name", identity?.gamer_name || "-")}
              {renderMetaRow("Progress ID", detail.id, true)}
              {renderMetaRow("User ID", detail.user_id, true)}
              {renderMetaRow("Game ID", detail.game_id, true)}
              {renderMetaRow("User Created", detail.user_created_at ? formatTimestamp(detail.user_created_at) : "-")}
              {renderMetaRow("Created", formatTimestamp(detail.created_at))}
              {renderMetaRow("Updated", formatTimestamp(detail.updated_at))}
              {renderMetaRow("Banned At", detail.banned_at ? formatISODate(detail.banned_at) : "-")}
              {renderMetaRow("Banned By", detail.banned_by || "-", !!detail.banned_by)}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4 text-yellow-500" />Level</span>
                  <span className="font-semibold">{detail.level}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Trophy className="h-4 w-4 text-blue-500" />EXP</span>
                  <span className="font-semibold">{detail.experience}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground"><Coins className="h-4 w-4 text-amber-500" />Gold</span>
                  <span className="font-semibold">{detail.gold}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Game Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(detail.game_data ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Player Items</h2>
              <p className="text-sm text-muted-foreground">
                {itemsLoading ? "Loading…" : itemsTotal > 0 ? `${itemsTotal} item${itemsTotal !== 1 ? "s" : ""} in inventory` : "No items in inventory"}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={loadItems} disabled={itemsLoading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${itemsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {itemsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : itemsError ? (
                <div className="p-6 text-center">
                  <p className="text-destructive text-sm mb-3">{itemsError}</p>
                  <Button variant="outline" size="sm" onClick={loadItems}>Try Again</Button>
                </div>
              ) : playerItems.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No items</p>
                  <p className="text-sm mt-1">This player has no items in their inventory.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rarity</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Level</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Acquired</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.definition?.name ?? item.item_definition_id.slice(0, 8)}</div>
                          {item.definition?.item_code && (
                            <div className="text-xs text-muted-foreground font-mono">{item.definition.item_code}</div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize text-sm">{item.definition?.category ?? "—"}</TableCell>
                        <TableCell>
                          {item.definition?.rarity ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${RARITY_STYLE[item.definition.rarity] ?? "bg-muted text-muted-foreground border-border"}`}>
                              {item.definition.rarity}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{item.level}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Box className="h-3.5 w-3.5" />
                            ({item.grid_x}, {item.grid_y})
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.acquired_at ? formatISODate(item.acquired_at) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {itemsTotal > ITEMS_LIMIT && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {Math.floor(itemsOffset / ITEMS_LIMIT) + 1} of {Math.ceil(itemsTotal / ITEMS_LIMIT)} — {itemsTotal} items</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={itemsOffset === 0} onClick={() => setItemsOffset(Math.max(0, itemsOffset - ITEMS_LIMIT))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={itemsOffset + ITEMS_LIMIT >= itemsTotal} onClick={() => setItemsOffset(itemsOffset + ITEMS_LIMIT)}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="containers" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Player Containers</h2>
              <p className="text-sm text-muted-foreground">
                {containersLoading
                  ? "Loading…"
                  : containers.length > 0
                  ? `${containersOffset + containers.length}${containersHasMore ? "+" : ""} container${containers.length !== 1 ? "s" : ""}`
                  : "No containers found"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type filter */}
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={containersType}
                onChange={(e) => {
                  setContainersType(e.target.value as "" | "inventory" | "shulker_box")
                  setContainersOffset(0)
                }}
              >
                <option value="">All types</option>
                <option value="inventory">inventory</option>
                <option value="shulker_box">shulker_box</option>
              </select>
              {/* Include deleted toggle */}
              <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={containersIncludeDeleted}
                  onChange={(e) => {
                    setContainersIncludeDeleted(e.target.checked)
                    setContainersOffset(0)
                  }}
                />
                Show deleted
              </label>
              <Button variant="outline" size="icon" onClick={loadContainers} disabled={containersLoading} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${containersLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {containersLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : containersError ? (
                <div className="p-6 text-center">
                  <p className="text-destructive text-sm mb-3">{containersError}</p>
                  <Button variant="outline" size="sm" onClick={loadContainers}>Try Again</Button>
                </div>
              ) : containers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No containers</p>
                  <p className="text-sm mt-1">This player has no containers{containersType ? ` of type "${containersType}"` : ""}.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Slots</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Deleted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map((c) => (
                      <TableRow key={c.id} className={c.deleted_at ? "opacity-50" : ""}>
                        <TableCell className="font-mono text-xs">
                          <span className="flex items-center gap-0.5">
                            {c.id.slice(0, 8)}…
                            <CopyButton text={c.id} size="h-3 w-3" />
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{c.name || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                            c.type === "inventory"
                              ? "bg-blue-500/10 text-blue-400 border-blue-400/30"
                              : c.type === "shulker_box"
                              ? "bg-purple-500/10 text-purple-400 border-purple-400/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            <Archive className="h-3 w-3" />
                            {c.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{c.slot_count ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm">{c.items_count ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.created_at ? formatISODate(c.created_at) : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.updated_at ? formatISODate(c.updated_at) : "—"}</TableCell>
                        <TableCell className="text-sm">
                          {c.deleted_at ? (
                            <span className="text-destructive text-xs">{formatISODate(c.deleted_at)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {(containersOffset > 0 || containersHasMore) && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {containersOffset + 1}–{containersOffset + containers.length}
                {containersHasMore ? "+" : ""}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={containersOffset === 0}
                  onClick={() => setContainersOffset(Math.max(0, containersOffset - CONTAINERS_LIMIT))}
                >Previous</Button>
                <Button
                  variant="outline" size="sm"
                  disabled={!containersHasMore}
                  onClick={() => setContainersOffset(containersOffset + CONTAINERS_LIMIT)}
                >Next</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
