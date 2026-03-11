"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Check,
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
  type CreateCustomPluginBody,
  type UpdateCustomPluginBody,
  type AdminGameGrant,
  type AdminGame,
} from "@/lib/admin-api"
import type { Plugin } from "@/lib/plugin-api"
import { formatISODate } from "@/lib/utils/date-utils"

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

  function setActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
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

  // ---------------------------------------------------------------------------
  // Grant state
  // ---------------------------------------------------------------------------
  const [grantGameId, setGrantGameId] = useState("")
  const [grantGameOpen, setGrantGameOpen] = useState(false)
  const [grantPluginId, setGrantPluginId] = useState("")
  const [grantNote, setGrantNote] = useState("")
  const [granting, setGranting] = useState(false)

  // All games for searchable dropdown
  const [allGames, setAllGames] = useState<AdminGame[]>([])
  const [loadingGames, setLoadingGames] = useState(false)

  // View grants for a game
  const [viewGrantsGameId, setViewGrantsGameId] = useState("")
  const [grants, setGrants] = useState<AdminGameGrant[]>([])
  const [loadingGrants, setLoadingGrants] = useState(false)

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<{ gameId: string; grant: AdminGameGrant } | null>(null)
  const [revoking, setRevoking] = useState(false)

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
      .then((res) => setAllGames(res.games ?? []))
      .catch(() => {})
      .finally(() => setLoadingGames(false))
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
  // Grant plugin to game
  // ---------------------------------------------------------------------------
  async function handleGrant() {
    if (!grantGameId.trim() || !grantPluginId) return
    setGranting(true)
    try {
      await grantPluginToGame(grantGameId.trim(), grantPluginId, grantNote.trim() || undefined)
      toast({ title: t('plugins.grantSuccess') || "Plugin granted." })
      setGrantGameId("")
      setGrantPluginId("")
      setGrantNote("")
      setGrantGameOpen(false)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('plugins.grantFailed') || "Grant failed.", description: err?.message })
    } finally {
      setGranting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // View / revoke grants
  // ---------------------------------------------------------------------------
  async function handleViewGrants() {
    if (!viewGrantsGameId.trim()) return
    setLoadingGrants(true)
    try {
      const data = await listGameGrants(viewGrantsGameId.trim())
      setGrants(data)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load grants", description: err?.message })
    } finally {
      setLoadingGrants(false)
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await revokeGameGrant(revokeTarget.gameId, revokeTarget.grant.grant.id)
      setGrants((prev) => prev.filter((g) => g.grant.id !== revokeTarget.grant.grant.id))
      toast({ title: t('plugins.revokeSuccess') || "Grant revoked." })
      setRevokeTarget(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: t('plugins.revokeFailed') || "Revoke failed.", description: err?.message })
    } finally {
      setRevoking(false)
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
                    <TableHead>Name</TableHead>
                    <TableHead>CCU</TableHead>
                    <TableHead>Profiles</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Shops</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reusable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plugins.map((plugin) => (
                    <TableRow key={plugin.id}>
                      <TableCell className="font-medium">
                        <div>{plugin.display_name}</div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center">{plugin.id}<CopyButton text={plugin.id} /></div>
                      </TableCell>
                      <TableCell>{(plugin.ccu_grant ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{(plugin.profiles_grant ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{(plugin.items_grant ?? 0).toLocaleString()}</TableCell>
                      <TableCell>{plugin.shops_grant ?? 0}</TableCell>
                      <TableCell>
                        {plugin.duration_days ? `${plugin.duration_days}d` : "Permanent"}
                      </TableCell>
                      <TableCell>
                        {plugin.is_template ? <Check className="h-4 w-4 text-green-600" /> : null}
                      </TableCell>
                      <TableCell className="text-right">
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
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Tab: Grant to Game */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="grants" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Grant form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('plugins.grantToGame') || "Grant Plugin to Game"}</CardTitle>
              <CardDescription>Grant a custom plugin to a specific game for free.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Popover open={grantGameOpen} onOpenChange={setGrantGameOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={grantGameOpen}
                        className="w-full justify-between font-normal"
                        disabled={loadingGames}
                      >
                        {loadingGames
                          ? "Loading games..."
                          : grantGameId
                            ? (allGames.find((g) => g.id === grantGameId)?.name ?? grantGameId)
                            : "Select game..."}
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
                                onSelect={() => {
                                  setGrantGameId(g.id)
                                  setGrantGameOpen(false)
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${grantGameId === g.id ? "opacity-100" : "opacity-0"}`} />
                                <span className="truncate">{g.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground font-mono truncate max-w-[120px]">{g.id}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{t('plugins.fieldPluginId') || "Plugin"}</Label>
                  <Select value={grantPluginId} onValueChange={setGrantPluginId}>
                    <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="grant-note">{t('plugins.fieldNote') || "Note"} (optional)</Label>
                <Input
                  id="grant-note"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="Why this grant..."
                />
              </div>
              <Button onClick={handleGrant} disabled={granting || !grantGameId.trim() || !grantPluginId}>
                {granting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {t('plugins.grantToGame') || "Grant"}
              </Button>
            </CardContent>
          </Card>

          {/* View grants for a game */}
          <Card>
            <CardHeader>
              <CardTitle>View Game Grants</CardTitle>
              <CardDescription>Look up all plugin grants for a specific game.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={viewGrantsGameId}
                  onChange={(e) => setViewGrantsGameId(e.target.value)}
                  placeholder="Game ID..."
                  onKeyDown={(e) => e.key === "Enter" && handleViewGrants()}
                />
                <Button onClick={handleViewGrants} disabled={loadingGrants || !viewGrantsGameId.trim()}>
                  {loadingGrants ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Look up
                </Button>
              </div>

              {grants.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plugin</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grants.map((g) => (
                      <TableRow key={g.grant.id}>
                        <TableCell className="font-medium">
                          {plugins.find((p) => p.id === g.grant.plugin_id)?.display_name ?? g.grant.plugin_id}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{g.grant.note ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={!g.grant.is_revoked ? "default" : "secondary"}>
                            {g.grant.is_revoked ? "revoked" : "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {g.grant.expires_at
                            ? formatISODate(g.grant.expires_at)
                            : "Permanent"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!g.grant.is_revoked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRevokeTarget({ gameId: viewGrantsGameId, grant: g })}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          </div>
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
