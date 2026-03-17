"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Edit,
  Loader2,
  Plus,
  Puzzle,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react"

import { useCapabilities } from "@/hooks/use-capabilities"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/use-translation"
import {
  listCustomPlugins,
  createCustomPlugin,
  updateCustomPlugin,
  deleteCustomPlugin,
  grantPluginToGame,
  listGameGrants,
  revokeGameGrant,
  getAllGamesAdmin,
  recalculateGameLimits,
  type CreateCustomPluginBody,
  type UpdateCustomPluginBody,
  type AdminGameGrant,
  type AdminGame,
  type RecalcResult,
} from "@/lib/admin-api"
import { getGame } from "@/lib/game-api"
import { getGamePlugins } from "@/lib/plugin-api"
import type { Game } from "@/types/game"
import type { Plugin } from "@/lib/plugin-api"
import { formatISODate, timeAgo } from "@/lib/utils/date-utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { CopyButton } from "@/components/CopyButton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginFormState {
  display_name: string
  description: string
  ccu_grant: string
  profiles_grant: string
  items_grant: string
  shops_grant: string
  node_defs_grant: string
  event_types_grant: string
  boards_grant: string
  duration_days: string
  is_template: boolean
}

const defaultForm: PluginFormState = {
  display_name: "",
  description: "",
  ccu_grant: "0",
  profiles_grant: "0",
  items_grant: "0",
  shops_grant: "0",
  node_defs_grant: "0",
  event_types_grant: "0",
  boards_grant: "0",
  duration_days: "0",
  is_template: false,
}

function pluginToForm(p: Plugin): PluginFormState {
  return {
    display_name: p.display_name,
    description: p.description ?? "",
    ccu_grant: String(p.ccu_grant ?? 0),
    profiles_grant: String(p.profiles_grant ?? 0),
    items_grant: String(p.items_grant ?? 0),
    shops_grant: String(p.shops_grant ?? 0),
    node_defs_grant: String(p.node_defs_grant ?? 0),
    event_types_grant: String(p.event_types_grant ?? 0),
    boards_grant: String(p.boards_grant ?? 0),
    duration_days: String(p.duration_days ?? 0),
    is_template: p.is_template ?? false,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPluginsPage() {
  const capabilities = useCapabilities()
  const { toast } = useToast()
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") ?? "plugins"

  const selectedGameId = searchParams.get("game") ?? ""

  function setActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`${pathname}?${params.toString()}`)
  }

  function setSelectedGameInUrl(gameId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (gameId) {
      params.set("game", gameId)
    } else {
      params.delete("game")
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  // ---------------------------------------------------------------------------
  // Custom plugins state
  // ---------------------------------------------------------------------------
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loadingPlugins, setLoadingPlugins] = useState(true)

  // Create / Edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null)
  const [form, setForm] = useState<PluginFormState>(defaultForm)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Plugin | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Expanded plugin row
  const [expandedPluginId, setExpandedPluginId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Grant state
  // ---------------------------------------------------------------------------
  // All games for searchable dropdown
  const [allGames, setAllGames] = useState<AdminGame[]>([])
  const [loadingGames, setLoadingGames] = useState(false)

  // Selected game details panel
  const [gameSearchOpen, setGameSearchOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<AdminGame | null>(null)
  const [gameLimits, setGameLimits] = useState<Game | null>(null)
  const [gameGrants, setGameGrants] = useState<AdminGameGrant[]>([])
  const [loadingGameDetail, setLoadingGameDetail] = useState(false)

  // Add plugin inline form
  const [showAddPlugin, setShowAddPlugin] = useState(false)
  const [addPluginId, setAddPluginId] = useState("")
  const [addPluginNote, setAddPluginNote] = useState("")
  const [addingPlugin, setAddingPlugin] = useState(false)

  // Expanded grant row
  const [expandedGrantId, setExpandedGrantId] = useState<string | null>(null)

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<{ grant: AdminGameGrant } | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Recalculate limits
  const [recalcing, setRecalcing] = useState(false)
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null)

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------
  if (!capabilities.is_super_admin) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Load plugins
  // ---------------------------------------------------------------------------
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadPlugins = useCallback(async () => {
    setLoadingPlugins(true)
    try {
      const data = await listCustomPlugins()
      setPlugins(data)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load plugins", description: err?.message })
    } finally {
      setLoadingPlugins(false)
    }
  }, [toast])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { loadPlugins() }, [loadPlugins])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setLoadingGames(true)
    getAllGamesAdmin({ sort_by: "name", sort_order: "asc" })
      .then((res) => {
        const games = res.games ?? []
        setAllGames(games)
        // Auto-select game from URL param after games load
        if (selectedGameId) {
          const found = games.find((g) => g.id === selectedGameId)
          if (found) selectGame(found)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGames(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Create / Update plugin
  // ---------------------------------------------------------------------------
  function openCreate() {
    setEditingPlugin(null)
    setForm(defaultForm)
    setFormOpen(true)
  }

  function openEdit(plugin: Plugin) {
    setEditingPlugin(plugin)
    setForm(pluginToForm(plugin))
    setFormOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: CreateCustomPluginBody = {
        display_name: form.display_name.trim() || undefined,
        description: form.description.trim() || undefined,
        ccu_grant: Number(form.ccu_grant) || 0,
        profiles_grant: Number(form.profiles_grant) || 0,
        items_grant: Number(form.items_grant) || 0,
        shops_grant: Number(form.shops_grant) || 0,
        node_defs_grant: Number(form.node_defs_grant) || 0,
        event_types_grant: Number(form.event_types_grant) || 0,
        boards_grant: Number(form.boards_grant) || 0,
        duration_days: Number(form.duration_days) || null,
        is_template: form.is_template,
      }

      if (editingPlugin) {
        const updated = await updateCustomPlugin(editingPlugin.id, body as UpdateCustomPluginBody)
        setPlugins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        toast({ title: t('plugins.updateSuccess') || "Plugin updated." })
      } else {
        const created = await createCustomPlugin(body)
        setPlugins((prev) => [created, ...prev])
        toast({ title: t('plugins.createSuccess') || "Plugin created." })
      }
      setFormOpen(false)
    } catch (err: any) {
      const msg = editingPlugin ? t('plugins.updateFailed') : t('plugins.createFailed')
      toast({ variant: "destructive", title: msg, description: err?.message })
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete plugin
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCustomPlugin(deleteTarget.id)
      setPlugins((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast({ title: t('plugins.deleteSuccess') || "Plugin deleted." })
      setDeleteTarget(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('plugins.deleteFailed') || "Delete failed.", description: err?.message })
    } finally {
      setDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Refresh displayed limits after grant/revoke
  // effective_limits from getGamePlugins is the authoritative combined capacity
  // ---------------------------------------------------------------------------
  async function recalcAndPersistLimits(gameId: string) {
    try {
      const [fresh, pluginsResult] = await Promise.all([
        getGame(gameId),
        getGamePlugins(gameId),
      ])
      const el = pluginsResult.effective_limits
      const leaderboardsLimit = el.max_leaderboards ?? el.max_boards ?? fresh.limits?.max_leaderboards ?? 0
      // Overlay effective_limits onto the game object so the UI reflects plugin contributions
      setGameLimits({
        ...fresh,
        limits: {
          ...fresh.limits,
          max_concurrent_users: el.max_concurrent_users,
          max_player_profiles: el.max_profiles,
          max_items: el.max_items,
          max_shops: el.max_shops,
          max_gacha_packs: el.max_gacha_packs ?? fresh.limits?.max_gacha_packs ?? 0,
          max_leaderboards: leaderboardsLimit,
        },
      })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to refresh limits", description: err?.message })
    }
  }

  // ---------------------------------------------------------------------------
  // Grant plugin to game
  // ---------------------------------------------------------------------------
  async function selectGame(game: AdminGame) {
    setSelectedGame(game)
    setGameSearchOpen(false)
    setGameLimits(null)
    setGameGrants([])
    setShowAddPlugin(false)
    setAddPluginId("")
    setAddPluginNote("")
    setSelectedGameInUrl(game.id)
    setLoadingGameDetail(true)
    try {
      const [limitsData, grantsData] = await Promise.all([
        getGame(game.id),
        listGameGrants(game.id),
      ])
      setGameLimits(limitsData)
      setGameGrants(grantsData)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load game details", description: err?.message })
    } finally {
      setLoadingGameDetail(false)
    }
  }

  async function handleAddPlugin() {
    if (!selectedGame || !addPluginId) return
    setAddingPlugin(true)
    try {
      await grantPluginToGame(selectedGame.id, addPluginId, addPluginNote.trim() || undefined)
      toast({ title: t('plugins.grantSuccess') || "Plugin granted." })
      setAddPluginId("")
      setAddPluginNote("")
      setShowAddPlugin(false)
      const data = await listGameGrants(selectedGame.id)
      setGameGrants(data)
      await recalcAndPersistLimits(selectedGame.id)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('plugins.grantFailed') || "Grant failed.", description: err?.message })
    } finally {
      setAddingPlugin(false)
    }
  }

  // ---------------------------------------------------------------------------
  // View / revoke grants
  // ---------------------------------------------------------------------------
  async function handleRevoke() {
    if (!revokeTarget || !selectedGame) return
    setRevoking(true)
    try {
      await revokeGameGrant(selectedGame.id, revokeTarget.grant.grant.id)
      setRevokeTarget(null)
      toast({ title: t('plugins.revokeSuccess') || "Grant revoked." })
      const freshGrants = await listGameGrants(selectedGame.id)
      setGameGrants(freshGrants)
      await recalcAndPersistLimits(selectedGame.id)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('plugins.revokeFailed') || "Revoke failed.", description: err?.message })
    } finally {
      setRevoking(false)
    }
  }

  async function handleRecalculate() {
    if (!selectedGame) return
    setRecalcing(true)
    try {
      const result = await recalculateGameLimits(selectedGame.id)
      setRecalcResult(result)
      // Also refresh the displayed limits from the recalc totals
      setGameLimits((prev) => prev ? {
        ...prev,
        limits: {
          ...prev.limits,
          max_concurrent_users: result.totals.max_concurrent_users,
          max_player_profiles: result.totals.max_player_profiles,
          max_items: result.totals.max_items,
          max_shops: result.totals.max_shops,
          max_quests: result.totals.max_quests,
          max_leaderboards: result.totals.max_leaderboards ?? 0,
        },
      } : prev)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Recalculate failed", description: err?.message })
    } finally {
      setRecalcing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" />
            {t('plugins.adminTitle') || "Plugin Management"}
          </h1>
          <p className="text-sm text-muted-foreground">{t('plugins.adminSubtitle') || "Manage custom plugins and grant them to games."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPlugins} disabled={loadingPlugins}>
          <RefreshCw className={`h-4 w-4 ${loadingPlugins ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plugins">Custom</TabsTrigger>
          <TabsTrigger value="grants">Grant</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Tab: Custom Plugins */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="plugins" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('plugins.createPlugin') || "Create Plugin"}
            </Button>
          </div>

          {loadingPlugins ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : plugins.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {t('plugins.noCustomPlugins') || "No custom plugins yet."}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>Name</TableHead>
                    <TableHead>CCU</TableHead>
                    <TableHead>Profiles</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Shops</TableHead>
                    <TableHead>Quests</TableHead>
                    <TableHead>Journey Node</TableHead>
                    <TableHead>Event Types</TableHead>
                    <TableHead>Leaderboards</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reusable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plugins.map((plugin) => {
                    const expanded = expandedPluginId === plugin.id
                    return (
                      <>
                        <TableRow
                          key={plugin.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedPluginId(expanded ? null : plugin.id)}
                        >
                          <TableCell className="pr-0">
                            {expanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>{plugin.display_name}</div>
                            <div className="text-xs text-muted-foreground font-mono flex items-center">{plugin.id}<CopyButton text={plugin.id} /></div>
                          </TableCell>
                          <TableCell>{(plugin.ccu_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.profiles_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.items_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.shops_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.quests_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.node_defs_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.event_types_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>{(plugin.boards_grant ?? 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {plugin.duration_days ? `${plugin.duration_days}d` : "Permanent"}
                          </TableCell>
                          <TableCell>
                            {plugin.is_template ? <Check className="h-4 w-4 text-green-600" /> : null}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(plugin)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(plugin)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`${plugin.id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                            <TableCell />
                            <TableCell colSpan={9} className="py-4">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 text-xs">
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Plugin ID</p>
                                  <div className="flex items-center gap-1 font-mono break-all">{plugin.id}<CopyButton text={plugin.id} /></div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Type</p>
                                  <p className="capitalize">{plugin.plugin_type}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Status</p>
                                  <Badge variant={plugin.is_active ? "default" : "secondary"}>{plugin.is_active ? "Active" : "Inactive"}</Badge>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Sort Order</p>
                                  <p>{plugin.sort_order}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Duration</p>
                                  <p>{plugin.duration_days ? `${plugin.duration_days} days` : "Permanent"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Max Stacks</p>
                                  <p>{plugin.max_stacks}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Cost (coins)</p>
                                  <p>{(plugin.cost_coins ?? 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Reusable</p>
                                  <p>{plugin.is_template ? "Yes" : "No"}</p>
                                </div>
                                {plugin.description && (
                                  <div className="col-span-2 md:col-span-3 lg:col-span-4">
                                    <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Description</p>
                                    <p className="text-sm">{plugin.description}</p>
                                  </div>
                                )}
                                <div className="col-span-2 md:col-span-3 lg:col-span-4 border-t border-border/40 pt-3 mt-1">
                                  <p className="text-muted-foreground uppercase tracking-wide mb-2">Grants</p>
                                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                                    {([
                                      { icon: "👥", label: "CCU", val: plugin.ccu_grant },
                                      { icon: "👤", label: "Profiles", val: plugin.profiles_grant },
                                      { icon: "📦", label: "Items", val: plugin.items_grant },
                                      { icon: "🏪", label: "Shops", val: plugin.shops_grant },
                                      { icon: "📜", label: "Quests", val: plugin.quests_grant ?? 0 },
                                      { icon: "🔗", label: "Journey Node", val: plugin.node_defs_grant ?? 0 },
                                      { icon: "📡", label: "Event Types", val: plugin.event_types_grant ?? 0 },
                                      { icon: "🎰", label: "Gacha", val: plugin.gacha_grant ?? 0 },
                                      { icon: "📋", label: "Leaderboards", val: plugin.boards_grant ?? 0 },
                                    ] as { icon: string; label: string; val: number }[]).map((r) => (
                                      <div key={r.label} className="flex items-center gap-1.5">
                                        <span>{r.icon}</span>
                                        <span className="text-muted-foreground">{r.label}:</span>
                                        <span className={`font-semibold ${r.val > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                                          {r.val > 0 ? `+${r.val.toLocaleString()}` : "—"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Created At</p>
                                  <p>{formatISODate(plugin.created_at)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Updated At</p>
                                  <p>{formatISODate(plugin.updated_at)}</p>
                                </div>
                                {plugin.created_by && (
                                  <div>
                                    <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Created By</p>
                                    <div className="flex items-center gap-1 font-mono">{plugin.created_by.slice(0, 8)}…<CopyButton text={plugin.created_by} /></div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Tab: Grant to Game */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="grants" className="space-y-6">
          {/* Game selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Game</CardTitle>
              <CardDescription>Choose a game to view its details, limits, and manage plugin grants.</CardDescription>
            </CardHeader>
            <CardContent>
              <Popover open={gameSearchOpen} onOpenChange={setGameSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={gameSearchOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingGames}
                  >
                    {loadingGames
                      ? "Loading games..."
                      : selectedGame
                        ? selectedGame.name
                        : "Select a game to view details and manage plugins..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search games..." />
                    <CommandList>
                      <CommandEmpty>No games found.</CommandEmpty>
                      <CommandGroup>
                        {allGames.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={`${g.name} ${g.id}`}
                            onSelect={() => selectGame(g)}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedGame?.id === g.id ? "opacity-100" : "opacity-0"}`} />
                            <span className="truncate">{g.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground font-mono truncate max-w-[120px]">{g.id}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Game detail panel */}
          {selectedGame && (
            <>
              {loadingGameDetail ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                  <div className="lg:col-span-2 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left: Game info + Limits */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Game Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Name</p>
                          <p className="font-medium">{selectedGame.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">ID</p>
                          <div className="flex items-center gap-1 font-mono text-xs break-all">
                            {selectedGame.id}
                            <CopyButton text={selectedGame.id} />
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Studio</p>
                          <p>{selectedGame.studio_name ?? selectedGame.studio_id}</p>
                        </div>
                        <div>
                          <Badge variant={selectedGame.is_active ? "default" : "secondary"}>
                            {selectedGame.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {gameLimits && (
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Limits</CardTitle>
                            <Button size="sm" variant="outline" onClick={handleRecalculate} disabled={recalcing}>
                              {recalcing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                              Recalculate
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {([
                            { label: "Max CCU", value: gameLimits.limits?.max_concurrent_users, usage: gameLimits.usage?.concurrent_users },
                            { label: "Max Profiles", value: gameLimits.limits?.max_player_profiles, usage: gameLimits.usage?.player_profiles },
                            { label: "Max Items", value: gameLimits.limits?.max_items },
                            { label: "Max Shops", value: gameLimits.limits?.max_shops },
                            { label: "Max Leaderboards", value: gameLimits.limits?.max_leaderboards ?? 0, usage: gameLimits.usage?.leaderboards ?? 0 },
                          ] as { label: string; value?: number | null; usage?: number | null }[]).map(({ label, value, usage }) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-mono font-medium">
                                {usage != null ? `${usage} / ` : ""}{value ?? "∞"}
                              </span>
                            </div>
                          ))}

                          {/* Recalculate result inline */}
                          {recalcResult && (
                            <div className="border-t border-border/60 pt-3 mt-1 space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recalculate Result</p>

                              {/* Totals */}
                              <div className="grid grid-cols-3 gap-1 text-center">
                                {([
                                  { icon: "👥", label: "CCU", val: recalcResult.totals.max_concurrent_users },
                                  { icon: "👤", label: "Profiles", val: recalcResult.totals.max_player_profiles },
                                  { icon: "📦", label: "Items", val: recalcResult.totals.max_items },
                                  { icon: "🏪", label: "Shops", val: recalcResult.totals.max_shops },
                                  { icon: "📜", label: "Quests", val: recalcResult.totals.max_quests },
                                  { icon: "📋", label: "Leaderboards", val: recalcResult.totals.max_leaderboards ?? 0 },
                                ]).map((r) => (
                                  <div key={r.label} className="rounded-md bg-muted/60 px-1 py-1.5">
                                    <p className="text-xs">{r.icon}</p>
                                    <p className="font-bold tabular-nums text-xs">{r.val.toLocaleString()}</p>
                                    <p className="text-[9px] text-muted-foreground">{r.label}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Subscriptions */}
                              <div className="space-y-1">
                                {recalcResult.subscriptions.map((sub) => {
                                  const isActive = sub.status === "active"
                                  const isRevoked = sub.status === "revoked"
                                  return (
                                    <div
                                      key={sub.subscription_id}
                                      className={`rounded-md border px-2 py-1.5 text-xs ${isRevoked ? "opacity-40" : isActive ? "border-green-500/20 bg-green-500/5" : "border-orange-500/20 bg-orange-500/5"}`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="font-medium truncate">{sub.display_name}</span>
                                          <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded-full border ${
                                            isActive ? "bg-green-500/15 text-green-400 border-green-500/30" :
                                            isRevoked ? "bg-muted text-muted-foreground border-border" :
                                            "bg-orange-500/15 text-orange-400 border-orange-500/30"
                                          }`}>{sub.status}</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-1 text-center">
                                        {([
                                          { label: "CCU", val: sub.contribution.max_concurrent_users },
                                          { label: "Profiles", val: sub.contribution.max_player_profiles },
                                          { label: "Items", val: sub.contribution.max_items },
                                          { label: "Shops", val: sub.contribution.max_shops },
                                          { label: "Quests", val: sub.contribution.max_quests },
                                          { label: "Leaderboards", val: sub.contribution.max_leaderboards ?? 0 },
                                        ]).map((r) => (
                                          <div key={r.label}>
                                            <p className={`font-semibold tabular-nums ${r.val > 0 && isActive ? "text-green-400" : "text-muted-foreground"}`}>
                                              {r.val > 0 ? `+${r.val.toLocaleString()}` : "—"}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground">{r.label}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right: Plugins */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Plugins</CardTitle>
                          <CardDescription className="text-xs mt-0.5">Plugin grants for this game</CardDescription>
                        </div>
                        {!showAddPlugin && (
                          <Button size="sm" onClick={() => setShowAddPlugin(true)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Plugin
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add plugin inline form */}
                      {showAddPlugin && (
                        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                          <p className="text-sm font-medium">Grant Plugin</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Plugin</Label>
                              <Select value={addPluginId} onValueChange={setAddPluginId}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select plugin..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {plugins.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      <span className="flex items-center gap-2">
                                        {p.display_name}
                                        {p.is_template && (
                                          <span className="text-xs font-medium text-primary border border-primary/40 rounded px-1 py-0 leading-tight">Reusable</span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Note (optional)</Label>
                              <Input
                                className="h-8"
                                value={addPluginNote}
                                onChange={(e) => setAddPluginNote(e.target.value)}
                                placeholder="e.g. special deal"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleAddPlugin} disabled={addingPlugin || !addPluginId}>
                              {addingPlugin && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                              Grant
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setShowAddPlugin(false); setAddPluginId(""); setAddPluginNote("") }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {gameGrants.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No plugins granted to this game yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-6" />
                              <TableHead>Plugin</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Stack</TableHead>
                              <TableHead>Expires</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gameGrants.map((g) => {
                              const expanded = expandedGrantId === g.grant.id
                              const pluginDef = plugins.find((p) => p.id === g.grant.plugin_id)
                              const pluginName = pluginDef?.display_name
                              const now = new Date()
                              const cancelledAt = g.grant.cancelled_at ? new Date(g.grant.cancelled_at) : null
                              const revokedAt = g.grant.revoked_at ? new Date(g.grant.revoked_at) : null
                              // cancelled_at set on an otherwise-active grant = subscription won't renew / will end
                              const isCancelPending = !g.grant.is_revoked && !!cancelledAt
                              const cancelIsFuture = isCancelPending && cancelledAt! > now
                              // revoked_at set but is_revoked still false = revoke scheduled in the future
                              const isRevokePending = !g.grant.is_revoked && !!revokedAt && revokedAt > now
                              return (
                                <>
                                  {/* Compact row */}
                                  <TableRow
                                    key={g.grant.id}
                                    className={`cursor-pointer hover:bg-muted/50 ${isCancelPending || isRevokePending ? "bg-orange-500/5" : ""}`}
                                    onClick={() => setExpandedGrantId(expanded ? null : g.grant.id)}
                                  >
                                    <TableCell className="pr-0">
                                      {expanded
                                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </TableCell>
                                    <TableCell className="font-medium text-sm">
                                      {pluginName ?? <span className="font-mono text-xs text-muted-foreground">{g.grant.plugin_id}</span>}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1 items-start">
                                        <Badge variant={!g.grant.is_revoked ? "default" : "secondary"}>
                                          {g.grant.is_revoked ? "revoked" : "active"}
                                        </Badge>
                                        {isCancelPending && (
                                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 whitespace-nowrap">
                                            {cancelIsFuture ? `cancels ${timeAgo(g.grant.cancelled_at!)}` : "cancelled"}
                                          </span>
                                        )}
                                        {isRevokePending && (
                                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
                                            revoke {timeAgo(g.grant.revoked_at!)}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                      <div className="flex flex-col gap-0.5">
                                        <span>{g.grant.expires_at ? formatISODate(g.grant.expires_at) : "Permanent"}</span>
                                        {g.grant.expires_at && <span className="text-[10px] text-muted-foreground/60">{timeAgo(g.grant.expires_at)}</span>}
                                        {isRevokePending && (
                                          <span className="text-red-400">revoke: {formatISODate(g.grant.revoked_at!)}</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                      {!g.grant.is_revoked && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setRevokeTarget({ grant: g })}
                                        >
                                          <XCircle className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  {/* Expanded detail row */}
                                  {expanded && (
                                    <TableRow key={`${g.grant.id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                                      <TableCell />
                                      <TableCell colSpan={5} className="py-3">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Grant ID</p>
                                            <div className="flex items-center gap-1 font-mono break-all">{g.grant.id}<CopyButton text={g.grant.id} /></div>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Plugin ID</p>
                                            <div className="flex items-center gap-1 font-mono break-all">{g.grant.plugin_id}<CopyButton text={g.grant.plugin_id} /></div>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Coins/month</p>
                                            <p>{g.grant.coins_per_month}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Activated At</p>
                                            {g.grant.activated_at ? (<><p>{formatISODate(g.grant.activated_at)}</p><p className="text-muted-foreground/70 text-[10px]">{timeAgo(g.grant.activated_at)}</p></>) : <p>—</p>}
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Renewed At</p>
                                            {g.grant.renewed_at ? (<><p>{formatISODate(g.grant.renewed_at)}</p><p className="text-muted-foreground/70 text-[10px]">{timeAgo(g.grant.renewed_at)}</p></>) : <p>—</p>}
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Expires At</p>
                                            {g.grant.expires_at ? (<><p>{formatISODate(g.grant.expires_at)}</p><p className="text-muted-foreground/70 text-[10px]">{timeAgo(g.grant.expires_at)}</p></>) : <p>Permanent</p>}
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Cancelled At</p>
                                            {g.grant.cancelled_at ? (
                                              <>
                                                <p className={cancelledAt && cancelledAt > now ? "text-orange-400 font-semibold" : "text-orange-300"}>
                                                  {formatISODate(g.grant.cancelled_at)}
                                                </p>
                                                <p className={`text-[10px] ${cancelledAt && cancelledAt > now ? "text-orange-400/70" : "text-muted-foreground/70"}`}>{timeAgo(g.grant.cancelled_at)}</p>
                                              </>
                                            ) : <p>—</p>}
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Revoked At</p>
                                            {g.grant.revoked_at ? (
                                              <>
                                                <p className={revokedAt && revokedAt > now ? "text-red-400 font-semibold" : "text-muted-foreground"}>
                                                  {formatISODate(g.grant.revoked_at)}
                                                </p>
                                                <p className={`text-[10px] ${revokedAt && revokedAt > now ? "text-red-400/70" : "text-muted-foreground/70"}`}>{timeAgo(g.grant.revoked_at)}</p>
                                              </>
                                            ) : <p>—</p>}
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Activated By</p>
                                            {g.grant.activated_by
                                              ? <div className="flex items-center gap-1 font-mono">{g.grant.activated_by.slice(0, 8)}…<CopyButton text={g.grant.activated_by} /></div>
                                              : <p>—</p>}
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Revoked By</p>
                                            {g.grant.revoked_by
                                              ? <div className="flex items-center gap-1 font-mono">{g.grant.revoked_by.slice(0, 8)}…<CopyButton text={g.grant.revoked_by} /></div>
                                              : <p>—</p>}
                                          </div>
                                          <div className="col-span-2">
                                            <p className="text-muted-foreground uppercase tracking-wide mb-0.5">Note</p>
                                            <p>{g.grant.note || "—"}</p>
                                          </div>
                                          {pluginDef && (
                                            <div className="col-span-2 md:col-span-3 border-t border-border/40 pt-2 mt-1">
                                              <p className="text-muted-foreground uppercase tracking-wide mb-1.5">Grants</p>
                                              <div className="flex flex-wrap gap-x-6 gap-y-1">
                                                {([
                                                  { icon: "👥", label: "CCU", val: pluginDef.ccu_grant },
                                                  { icon: "👤", label: "Profiles", val: pluginDef.profiles_grant },
                                                  { icon: "📦", label: "Items", val: pluginDef.items_grant },
                                                  { icon: "🏪", label: "Shops", val: pluginDef.shops_grant },
                                                  { icon: "📜", label: "Quests", val: pluginDef.quests_grant ?? 0 },
                                                  { icon: "🔗", label: "Journey Node", val: pluginDef.node_defs_grant ?? 0 },
                                                  { icon: "📡", label: "Event Types", val: pluginDef.event_types_grant ?? 0 },
                                                  { icon: "📋", label: "Leaderboards", val: pluginDef.boards_grant ?? 0 },
                                                ] as { icon: string; label: string; val: number }[])
                                                  .filter((r) => r.val > 0)
                                                  .map((r) => (
                                                    <div key={r.label} className="flex items-center gap-1">
                                                      <span>{r.icon}</span>
                                                      <span className="text-muted-foreground">{r.label}:</span>
                                                      <span className="font-semibold">+{r.val.toLocaleString()}</span>

                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              )
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ------------------------------------------------------------------ */}
      {/* Create / Edit dialog */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={formOpen} onOpenChange={(o) => !saving && setFormOpen(o)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editingPlugin
                ? (t('plugins.editPlugin') || "Edit Plugin")
                : (t('plugins.createPlugin') || "Create Plugin")}
            </DialogTitle>
            <DialogDescription>
              {editingPlugin ? `Editing: ${editingPlugin.display_name}` : "Define a new custom plugin."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="dp-display-name">{t('plugins.fieldDisplayName') || "Display Name"}</Label>
              <Input
                id="dp-display-name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dp-description">{t('plugins.fieldDescription') || "Description"}</Label>
              <Textarea
                id="dp-description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { key: "ccu_grant", label: t('plugins.fieldCcuGrant') || "CCU Grant" },
                  { key: "profiles_grant", label: t('plugins.fieldProfilesGrant') || "Profiles Grant" },
                  { key: "items_grant", label: t('plugins.fieldItemsGrant') || "Items Grant" },
                  { key: "shops_grant", label: t('plugins.fieldShopsGrant') || "Shops Grant" },
                  { key: "node_defs_grant", label: t('plugins.fieldNodeDefsGrant') || "Journey Node Grant" },
                  { key: "event_types_grant", label: t('plugins.fieldEventTypesGrant') || "Event Types Grant" },
                  { key: "boards_grant", label: t('plugins.fieldBoardsGrant') || "Leaderboard Grant" },
                ] as { key: keyof PluginFormState; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`dp-${key}`}>{label}</Label>
                  <Input
                    id={`dp-${key}`}
                    type="number"
                    min={0}
                    value={form[key] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dp-duration">{t('plugins.fieldDurationDays') || "Duration (days)"}</Label>
              <Input
                id="dp-duration"
                type="number"
                min={0}
                value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('plugins.durationPermanent') || "0 = permanent"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="dp-template"
                checked={form.is_template}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_template: Boolean(v) }))}
              />
              <Label htmlFor="dp-template">{t('plugins.fieldIsTemplate') || "Reusable"}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPlugin ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirmation */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('plugins.deletePlugin') || "Delete Plugin"}</AlertDialogTitle>
            <AlertDialogDescription>
              {(t('plugins.deleteConfirm') || "Delete plugin {name}? This action cannot be undone.").replace("{name}", deleteTarget?.display_name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------------------------------------ */}
      {/* Revoke confirmation */}
      {/* ------------------------------------------------------------------ */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('plugins.revokeGrant') || "Revoke Grant"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('plugins.revokeConfirm') || "Revoke this plugin grant? The game will lose access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  )
}
