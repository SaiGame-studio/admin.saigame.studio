"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus, RefreshCw, Trash2, Pencil, Loader2, Eye, EyeOff,
  ChevronDown, ChevronRight, Wand2, Link2, ArrowRight,
  GitBranch, ArrowDownRight, Layers, X, ChevronsUpDown, Check,
  List, LayoutGrid, Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChainFlowView } from "./ChainFlowView"
import { useToast } from "@/hooks/use-toast"
import { ApiError } from "@/lib/api-client"
import type { Game } from "@/types/game"
import {
  listQuestChains,
  createQuestChain,
  updateQuestChain,
  deleteQuestChain,
  listQuestDefinitions,
  listChainMembers,
  addChainMember,
  updateChainMember,
  removeChainMember,
  type QuestChain,
  type QuestChainMember,
  type ChainType,
  type CreateQuestChainRequest,
  type UpdateQuestChainRequest,
  type QuestDefinition,
  type AddChainMemberRequest,
  type UpdateChainMemberRequest,
} from "@/lib/quest-api"

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAIN_TYPE_OPTIONS: { value: ChainType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "linear", label: "Linear", icon: <ArrowRight className="h-4 w-4" />, description: "Sequential — each quest unlocks after the previous is claimed" },
  { value: "branching", label: "Branching", icon: <GitBranch className="h-4 w-4" />, description: "Multiple parallel branches with individual prerequisites" },
  { value: "parallel", label: "Parallel", icon: <Layers className="h-4 w-4" />, description: "All quests unlock immediately, no prerequisites" },
]

function chainTypeBadgeVariant(type: ChainType) {
  switch (type) {
    case "linear": return "default" as const
    case "branching": return "secondary" as const
    case "parallel": return "outline" as const
    default: return "outline" as const
  }
}

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

// ─── Unlock Quest IDs Picker ──────────────────────────────────────────────────

function UnlockQuestIdsPicker({
  value,
  onChange,
  chainMembers,
  allQuestDefs,
  questDefsMap,
  excludeQuestId,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  chainMembers: QuestChainMember[]
  allQuestDefs: QuestDefinition[]
  questDefsMap: Record<string, QuestDefinition>
  excludeQuestId?: string
}) {
  const available = chainMembers
    .filter((m) => m.quest_definition_id !== excludeQuestId)
    .map((m) => ({
      id: m.quest_definition_id,
      name: questDefsMap[m.quest_definition_id]?.name ?? m.quest_definition_id.slice(0, 8) + "…",
    }))

  const memberIds = new Set(chainMembers.map((m) => m.quest_definition_id))
  const extraQuests = allQuestDefs
    .filter((q) => !memberIds.has(q.id) && q.id !== excludeQuestId)
    .map((q) => ({ id: q.id, name: q.name }))

  const allOptions = [...available, ...extraQuests]

  return (
    <div className="space-y-2">
      <Label>Unlock Quest IDs</Label>
      <p className="text-xs text-muted-foreground">Select which quests will be unlocked when this quest is completed in this chain.</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const name = questDefsMap[id]?.name ?? id.slice(0, 8) + "…"
            return (
              <Badge key={id} variant="secondary" className="text-xs gap-1 pr-1">
                {name}
                <button
                  type="button"
                  className="ml-0.5 hover:text-destructive"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
      <Select
        value=""
        onValueChange={(v) => {
          if (v && !value.includes(v)) {
            onChange([...value, v])
          }
        }}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Add quest to unlock…" />
        </SelectTrigger>
        <SelectContent>
          {allOptions
            .filter((o) => !value.includes(o.id))
            .map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          {allOptions.filter((o) => !value.includes(o.id)).length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No quests available</div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Chain Tab (exported) ─────────────────────────────────────────────────────

export function ChainTab({ game }: { game: Game | null }) {
  const gameId = game?.id ?? ""
  const studioId = game?.studio_id ?? ""
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // ── State ─────────────────────────────────────────────────────────────────

  const [chains, setChains] = useState<QuestChain[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedChainId, setCopiedChainId] = useState<string | null>(null)

  // Expanded chain detail
  const [expandedChainId, setExpandedChainId] = useState<string | null>(null)
  const [expandedChain, setExpandedChain] = useState<QuestChain | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<QuestChainMember[]>([])
  const [expandedLoading, setExpandedLoading] = useState(false)
  const [memberCountMap, setMemberCountMap] = useState<Record<string, number>>({})

  // Quest definitions lookup
  const [questDefsMap, setQuestDefsMap] = useState<Record<string, QuestDefinition>>({})
  const [allQuestDefs, setAllQuestDefs] = useState<QuestDefinition[]>([])

  // Create / Edit chain
  const [createOpen, setCreateOpen] = useState(false)
  const [editChain, setEditChain] = useState<QuestChain | null>(null)
  const [chainForm, setChainForm] = useState<CreateQuestChainRequest>({
    chain_key: "",
    display_name: "",
    description: "",
    chain_type: "linear",
    is_active: false,
  })
  const [chainSaving, setChainSaving] = useState(false)
  const [autoSlug, setAutoSlug] = useState(true)

  // Delete chain
  const [deleteTarget, setDeleteTarget] = useState<QuestChain | null>(null)
  const [deleteDeleting, setDeleteDeleting] = useState(false)

  // Add member to chain
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addMemberChainId, setAddMemberChainId] = useState<string | null>(null)
  const [addMemberForm, setAddMemberForm] = useState<AddChainMemberRequest>({
    quest_definition_id: "",
    sort_order: 0,
    unlock_quest_ids: [],
  })
  const [addMemberSaving, setAddMemberSaving] = useState(false)

  // Edit member
  const [editMemberOpen, setEditMemberOpen] = useState(false)
  const [editMemberTarget, setEditMemberTarget] = useState<QuestChainMember | null>(null)
  const [editMemberForm, setEditMemberForm] = useState<UpdateChainMemberRequest>({
    sort_order: 0,
    unlock_quest_ids: [],
  })
  const [editMemberSaving, setEditMemberSaving] = useState(false)

  // Remove member
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ chainId: string; questId: string; questName: string } | null>(null)
  const [removeMemberDeleting, setRemoveMemberDeleting] = useState(false)

  const hasFetched = useRef(false)

  // ── Load quest definitions for name lookup ────────────────────────────────

  const loadQuestDefsMap = useCallback(async () => {
    if (!game) return
    try {
      const data = await listQuestDefinitions(studioId, gameId, { limit: 500 })
      const defs = Array.isArray(data) ? data : (data as any).quests ?? []
      const map: Record<string, QuestDefinition> = {}
      for (const d of defs) map[d.id] = d
      setQuestDefsMap(map)
      setAllQuestDefs(defs)
    } catch {
      // non-critical
    }
  }, [game, studioId, gameId])

  // ── Load chains ───────────────────────────────────────────────────────────

  const loadChains = useCallback(async () => {
    if (!game) return
    try {
      const data = await listQuestChains(studioId, gameId, { limit: 200 })
      setChains(data.chains ?? [])
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load quest chains"
      setError(msg)
    }
  }, [game, studioId, gameId])

  useEffect(() => {
    if (!game || hasFetched.current) return
    hasFetched.current = true
    setLoading(true)
    Promise.all([loadChains(), loadQuestDefsMap()]).finally(() => setLoading(false))
  }, [game, loadChains, loadQuestDefsMap])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    await Promise.all([loadChains(), loadQuestDefsMap()])
    setRefreshing(false)
  }

  // ── Load chain members (expand) ───────────────────────────────────────────

  const loadChainMembers = useCallback(async (chainId: string) => {
    try {
      const membersData = await listChainMembers(studioId, gameId, chainId)
      // Use chain from already-loaded list instead of a separate GET
      const chain = chains.find((c) => c.id === chainId) ?? null
      setExpandedChain(chain)
      const members = (membersData.members ?? []).sort((a, b) => a.sort_order - b.sort_order)
      setExpandedMembers(members)
      setMemberCountMap((prev) => ({ ...prev, [chainId]: members.length }))
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load chain members" })
      setExpandedChainId(null)
    }
  }, [studioId, gameId, toast, chains])

  const toggleExpand = async (chainId: string) => {
    if (expandedChainId === chainId) {
      setExpandedChainId(null)
      setExpandedChain(null)
      setExpandedMembers([])
      return
    }
    setExpandedChainId(chainId)
    setExpandedChain(null)
    setExpandedMembers([])
    setExpandedLoading(true)
    try {
      await loadChainMembers(chainId)
    } finally {
      setExpandedLoading(false)
    }
  }

  const refreshExpanded = async (chainId: string) => {
    try {
      await loadChainMembers(chainId)
    } catch {
      // silent
    }
  }

  // ── Create / Edit chain ───────────────────────────────────────────────────

  const openCreate = () => {
    setEditChain(null)
    setChainForm({
      chain_key: "",
      display_name: "",
      description: "",
      chain_type: "linear",
      is_active: false,
    })
    setAutoSlug(true)
    setCreateOpen(true)
  }

  const openEdit = (chain: QuestChain) => {
    setEditChain(chain)
    setChainForm({
      chain_key: chain.chain_key,
      display_name: chain.display_name,
      description: chain.description ?? "",
      chain_type: chain.chain_type,
      is_active: chain.is_active,
    })
    setAutoSlug(false)
    setCreateOpen(true)
  }

  const handleSaveChain = async () => {
    if (!chainForm.display_name.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Display Name is required" })
      return
    }
    if (!chainForm.chain_key.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Chain Key is required" })
      return
    }
    setChainSaving(true)
    try {
      if (editChain) {
        const patch: UpdateQuestChainRequest = {}
        if (chainForm.display_name !== editChain.display_name) patch.display_name = chainForm.display_name
        if ((chainForm.description ?? "") !== (editChain.description ?? "")) patch.description = chainForm.description
        if (chainForm.chain_type !== editChain.chain_type) patch.chain_type = chainForm.chain_type
        if (chainForm.is_active !== editChain.is_active) patch.is_active = chainForm.is_active
        await updateQuestChain(studioId, gameId, editChain.id, patch)
        toast({ title: "Chain updated" })
      } else {
        await createQuestChain(studioId, gameId, chainForm)
        toast({ title: "Chain created" })
      }
      setCreateOpen(false)
      await loadChains()
      if (expandedChainId) await refreshExpanded(expandedChainId)
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to save chain" })
    } finally {
      setChainSaving(false)
    }
  }

  // ── Delete chain ──────────────────────────────────────────────────────────

  const handleDeleteChain = async () => {
    if (!deleteTarget) return
    setDeleteDeleting(true)
    try {
      await deleteQuestChain(studioId, gameId, deleteTarget.id)
      toast({ title: "Chain deleted" })
      setDeleteTarget(null)
      if (expandedChainId === deleteTarget.id) {
        setExpandedChainId(null)
        setExpandedChain(null)
        setExpandedMembers([])
      }
      await loadChains()
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to delete chain" })
    } finally {
      setDeleteDeleting(false)
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (chain: QuestChain, checked: boolean) => {
    try {
      await updateQuestChain(studioId, gameId, chain.id, { is_active: checked })
      setChains((prev) => prev.map((c) => c.id === chain.id ? { ...c, is_active: checked } : c))
      if (expandedChain?.id === chain.id) setExpandedChain((prev) => prev ? { ...prev, is_active: checked } : prev)
      toast({ title: checked ? "Chain activated" : "Chain deactivated" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to update chain" })
    }
  }

  // ── Add member to chain ───────────────────────────────────────────────────

  const openAddMember = (chainId: string) => {
    setAddMemberChainId(chainId)
    const nextSort = expandedMembers.length > 0
      ? Math.max(...expandedMembers.map((m) => m.sort_order)) + 1
      : 0
    setAddMemberForm({
      quest_definition_id: "",
      sort_order: nextSort,
      unlock_quest_ids: [],
    })
    setAddMemberOpen(true)
  }

  const getAvailableQuests = (): QuestDefinition[] => {
    const memberQuestIds = new Set(expandedMembers.map((m) => m.quest_definition_id))
    return allQuestDefs.filter((q) => !memberQuestIds.has(q.id))
  }

  const handleAddMember = async () => {
    if (!addMemberChainId || !addMemberForm.quest_definition_id) {
      toast({ variant: "destructive", title: "Validation", description: "Please select a quest definition" })
      return
    }
    setAddMemberSaving(true)
    try {
      await addChainMember(studioId, gameId, addMemberChainId, addMemberForm)
      toast({ title: "Quest added to chain" })
      setAddMemberOpen(false)
      await Promise.all([refreshExpanded(addMemberChainId), loadQuestDefsMap()])
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast({ variant: "destructive", title: "Already in chain", description: "This quest is already a member of this chain." })
      } else {
        toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to add quest to chain" })
      }
    } finally {
      setAddMemberSaving(false)
    }
  }

  // ── Edit member ───────────────────────────────────────────────────────────

  const openEditMember = (member: QuestChainMember) => {
    setEditMemberTarget(member)
    setEditMemberForm({
      sort_order: member.sort_order,
      unlock_quest_ids: [...member.unlock_quest_ids],
    })
    setEditMemberOpen(true)
  }

  const handleEditMember = async () => {
    if (!editMemberTarget || !expandedChainId) return
    setEditMemberSaving(true)
    try {
      await updateChainMember(studioId, gameId, expandedChainId, editMemberTarget.quest_definition_id, editMemberForm)
      toast({ title: "Member updated" })
      setEditMemberOpen(false)
      await refreshExpanded(expandedChainId)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast({ variant: "destructive", title: "Not found", description: "This chain member no longer exists." })
      } else {
        toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to update member" })
      }
    } finally {
      setEditMemberSaving(false)
    }
  }

  // ── Remove member ─────────────────────────────────────────────────────────

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return
    setRemoveMemberDeleting(true)
    try {
      await removeChainMember(studioId, gameId, removeMemberTarget.chainId, removeMemberTarget.questId)
      toast({ title: "Quest removed from chain" })
      setRemoveMemberTarget(null)
      if (expandedChainId) await refreshExpanded(expandedChainId)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        toast({ variant: "destructive", title: "Not found", description: "This chain member no longer exists." })
        setRemoveMemberTarget(null)
        if (expandedChainId) await refreshExpanded(expandedChainId)
      } else {
        toast({ variant: "destructive", title: "Error", description: e instanceof ApiError ? e.message : "Failed to remove quest from chain" })
      }
    } finally {
      setRemoveMemberDeleting(false)
    }
  }

  // ── Navigate to quest edit in definitions tab ─────────────────────────────

  const navigateToQuestEdit = (questId: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete("tab")
    sp.set("editQuestId", questId)
    router.push(`/games/${gameId}/quests?${sp.toString()}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!game) return null

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Quest Chains</h2>
          <p className="text-sm text-muted-foreground">Manage sequential and branching quest chains. Add quests via the membership panel.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Chain
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading quest chains…
        </div>
      ) : chains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <Link2 className="h-10 w-10 opacity-30" />
            <p className="text-sm">No quest chains yet.</p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create Chain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chains.map((chain) => {
            const isExpanded = expandedChainId === chain.id
            return (
              <Card key={chain.id} className={isExpanded ? "border-primary/40" : ""}>
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Expand toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => toggleExpand(chain.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>

                    {/* Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(chain.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{chain.display_name}</CardTitle>
                        <Badge variant={chainTypeBadgeVariant(chain.chain_type)} className="text-xs">
                          {CHAIN_TYPE_OPTIONS.find((o) => o.value === chain.chain_type)?.label ?? chain.chain_type}
                        </Badge>
                        {chain.is_active ? (
                          <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                        {chain.description && (
                          <span className="text-sm text-muted-foreground truncate max-w-sm" title={chain.description}>
                            {chain.description.length > 250 ? chain.description.slice(0, 250) + "…" : chain.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono text-muted-foreground">{chain.id}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy chain ID"
                            onClick={(e) => {
                              e.stopPropagation()
                              const text = chain.id
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(text).catch(() => {
                                  const el = document.createElement('textarea')
                                  el.value = text
                                  el.style.position = 'fixed'
                                  el.style.opacity = '0'
                                  document.body.appendChild(el)
                                  el.focus()
                                  el.select()
                                  document.execCommand('copy')
                                  document.body.removeChild(el)
                                })
                              } else {
                                const el = document.createElement('textarea')
                                el.value = text
                                el.style.position = 'fixed'
                                el.style.opacity = '0'
                                document.body.appendChild(el)
                                el.focus()
                                el.select()
                                document.execCommand('copy')
                                document.body.removeChild(el)
                              }
                              setCopiedChainId(chain.id)
                              setTimeout(() => setCopiedChainId(null), 1500)
                            }}
                          >
                            {copiedChainId === chain.id
                              ? <Check className="h-3 w-3 text-green-500" />
                              : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-mono text-muted-foreground">{chain.chain_key}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status toggle */}
                      <div className="flex items-center gap-1.5" title="Toggle active">
                        <Switch
                          checked={chain.is_active}
                          onCheckedChange={(checked) => handleToggleActive(chain, checked)}
                          aria-label="Toggle chain active"
                          className="scale-90"
                        />
                      </div>
                      <Separator orientation="vertical" className="h-5" />
                      {/* Members count */}
                      <div className="text-center" title="Members">
                        <p className="text-xs text-muted-foreground leading-none">Members</p>
                        <p className="text-sm font-medium">{expandedChainId === chain.id ? expandedMembers.length : (memberCountMap[chain.id] ?? "—")}</p>
                      </div>
                      <Separator orientation="vertical" className="h-5" />
                      {/* Created */}
                      <div className="text-center" title="Created">
                        <p className="text-xs text-muted-foreground leading-none">Created</p>
                        <p className="text-sm font-medium">{new Date(chain.created_at).toLocaleDateString()}</p>
                      </div>
                      <Separator orientation="vertical" className="h-5" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(chain)} title="Edit chain">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteTarget(chain)}
                        title="Delete chain"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Detail — Chain Members */}
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <Separator />
                    {expandedLoading ? (
                      <div className="flex items-center gap-2 py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading chain details…
                      </div>
                    ) : expandedChain ? (
                      <div className="space-y-4">
                        {/* Members — List / Grid tabs */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              Quests in Chain
                              <Badge variant="outline" className="text-xs">{expandedMembers.length}</Badge>
                            </h4>
                          </div>

                          <Tabs
                            value={searchParams.get("subTab") === "list" ? "list" : "grid"}
                            onValueChange={(v) => {
                              const sp = new URLSearchParams(searchParams.toString())
                              sp.set("subTab", v)
                              router.replace(`?${sp.toString()}`, { scroll: false })
                            }}
                            className="w-full"
                          >
                            <TabsList className="h-8 mb-3">
                              <TabsTrigger value="grid" className="text-xs gap-1.5 px-3">
                                <LayoutGrid className="h-3.5 w-3.5" /> Graph
                              </TabsTrigger>
                              <TabsTrigger value="list" className="text-xs gap-1.5 px-3">
                                <List className="h-3.5 w-3.5" /> List
                              </TabsTrigger>
                            </TabsList>

                              {/* ── List View ─────────────────────────────── */}
                              <TabsContent value="list" className="mt-0">
                                <div className="flex justify-end mb-2">
                                  <Button size="sm" variant="outline" onClick={() => openAddMember(chain.id)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Quest
                                  </Button>
                                </div>
                                {expandedMembers.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">
                                    No quests in this chain yet. Click &quot;Add Quest&quot; to add quest definitions to this chain.
                                  </p>
                                ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-16">Order</TableHead>
                                      <TableHead>Quest</TableHead>
                                      <TableHead className="w-56">Unlocks</TableHead>
                                      <TableHead className="w-24">Status</TableHead>
                                      <TableHead className="w-24" />
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expandedMembers.map((member) => {
                                      const questDef = questDefsMap[member.quest_definition_id]
                                      return (
                                        <TableRow key={member.id}>
                                          <TableCell className="font-mono text-muted-foreground">
                                            {member.sort_order}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <p className="text-sm font-medium">
                                                {questDef?.name ?? member.quest_definition_id.slice(0, 8) + "…"}
                                              </p>
                                              {questDef?.description && (
                                                <p className="text-xs text-muted-foreground truncate max-w-md">{questDef.description}</p>
                                              )}
                                              {questDef && (
                                                <Badge variant="outline" className="text-xs mt-1">{questDef.quest_type}</Badge>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {member.unlock_quest_ids.length > 0 ? (
                                              <div className="flex flex-wrap gap-1">
                                                {member.unlock_quest_ids.map((uid) => {
                                                  const unlockDef = questDefsMap[uid]
                                                  return (
                                                    <Badge key={uid} variant="secondary" className="text-xs">
                                                      <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
                                                      {unlockDef?.name ?? uid.slice(0, 8) + "…"}
                                                    </Badge>
                                                  )
                                                })}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">— (end of chain)</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {questDef?.is_active ? (
                                              <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-xs">
                                                {questDef ? "Inactive" : "Unknown"}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-0.5">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                title="Edit membership"
                                                onClick={() => openEditMember(member)}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0 text-destructive"
                                                title="Remove from chain"
                                                onClick={() =>
                                                  setRemoveMemberTarget({
                                                    chainId: chain.id,
                                                    questId: member.quest_definition_id,
                                                    questName: questDef?.name ?? member.quest_definition_id.slice(0, 8) + "…",
                                                  })
                                                }
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                                )}
                              </TabsContent>

                              {/* ── Graph View ────────────────────────────── */}
                              <TabsContent value="grid" className="mt-0">
                                <ChainFlowView
                                  studioId={studioId}
                                  gameId={gameId}
                                  chainId={chain.id}
                                  members={expandedMembers}
                                  questDefsMap={questDefsMap}
                                  availableQuests={allQuestDefs.filter(
                                    (q) => !expandedMembers.some((m) => m.quest_definition_id === q.id)
                                  )}
                                  onQuickAdd={async (questId) => {
                                    const nextSort = expandedMembers.length > 0
                                      ? Math.max(...expandedMembers.map((m) => m.sort_order)) + 1
                                      : 0
                                    await addChainMember(studioId, gameId, chain.id, {
                                      quest_definition_id: questId,
                                      sort_order: nextSort,
                                      unlock_quest_ids: [],
                                    })
                                    toast({ title: "Quest added to chain" })
                                    await Promise.all([refreshExpanded(chain.id), loadQuestDefsMap()])
                                  }}
                                  onRefresh={async () => { await Promise.all([refreshExpanded(chain.id), loadQuestDefsMap()]) }}
                                  onEditMember={openEditMember}
                                  onRemoveMember={(member) => {
                                    const questDef = questDefsMap[member.quest_definition_id]
                                    setRemoveMemberTarget({
                                      chainId: chain.id,
                                      questId: member.quest_definition_id,
                                      questName: questDef?.name ?? member.quest_definition_id.slice(0, 8) + "…",
                                    })
                                  }}
                                  onConnectQuests={async (sourceQuestId, targetQuestId) => {
                                    const sourceMember = expandedMembers.find((m) => m.quest_definition_id === sourceQuestId)
                                    if (!sourceMember) return
                                    const newUnlockIds = [...new Set([...sourceMember.unlock_quest_ids, targetQuestId])]
                                    await updateChainMember(studioId, gameId, chain.id, sourceQuestId, {
                                      unlock_quest_ids: newUnlockIds,
                                    })
                                    toast({ title: "Connection added" })
                                    await refreshExpanded(chain.id)
                                  }}
                                  onDisconnectQuests={async (sourceQuestId, targetQuestId) => {
                                    const sourceMember = expandedMembers.find((m) => m.quest_definition_id === sourceQuestId)
                                    if (!sourceMember) return
                                    const newUnlockIds = sourceMember.unlock_quest_ids.filter((id) => id !== targetQuestId)
                                    await updateChainMember(studioId, gameId, chain.id, sourceQuestId, {
                                      unlock_quest_ids: newUnlockIds,
                                    })
                                    toast({ title: "Connection removed" })
                                    await refreshExpanded(chain.id)
                                  }}
                                />
                              </TabsContent>
                            </Tabs>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ─── Create / Edit Chain Sheet ────────────────────────────────────── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editChain ? "Edit Chain" : "Create Quest Chain"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Display Name */}
            <div className="space-y-1">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input
                value={chainForm.display_name}
                onChange={(e) => {
                  const name = e.target.value
                  setChainForm((f) => ({
                    ...f,
                    display_name: name,
                    ...(autoSlug && !editChain ? { chain_key: toSlug(name) } : {}),
                  }))
                }}
              />
              <p className="text-xs text-muted-foreground">Visible to players in the quest chain UI.</p>
            </div>

            {/* Chain Key */}
            <div className="space-y-1">
              <Label>Chain Key <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  value={chainForm.chain_key}
                  onChange={(e) => {
                    setAutoSlug(false)
                    setChainForm((f) => ({ ...f, chain_key: e.target.value }))
                  }}
                  disabled={!!editChain}
                  className={`flex-1 ${editChain ? "opacity-50" : ""}`}
                />
                {!editChain && (
                  <Button
                    type="button"
                    variant={autoSlug ? "default" : "outline"}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => {
                      const newAuto = !autoSlug
                      setAutoSlug(newAuto)
                      if (newAuto) {
                        const slug = toSlug(chainForm.display_name)
                        setChainForm((f) => ({ ...f, chain_key: slug }))
                      }
                    }}
                    title={autoSlug ? "Auto-slug enabled — click to disable" : "Auto-slug disabled — click to enable"}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {editChain
                  ? "Chain key cannot be changed after creation."
                  : autoSlug
                    ? "Auto-generated from display name. Edit manually to override."
                    : "Unique per game. Use snake_case."}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={chainForm.description ?? ""}
                onChange={(e) => setChainForm((f) => ({ ...f, description: e.target.value.slice(0, 200) }))}
                maxLength={200}
                rows={2}
              />
              <p className="text-xs text-muted-foreground text-right">
                {(chainForm.description ?? "").length}/200
              </p>
            </div>

            {/* Chain Type */}
            <div className="space-y-1">
              <Label>Chain Type <span className="text-destructive">*</span></Label>
              <Select
                value={chainForm.chain_type}
                onValueChange={(v) => setChainForm((f) => ({ ...f, chain_type: v as ChainType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAIN_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.icon}
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Players can see and interact with this chain.</p>
              </div>
              <Switch
                checked={chainForm.is_active}
                onCheckedChange={(checked) => setChainForm((f) => ({ ...f, is_active: checked }))}
              />
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleSaveChain} disabled={chainSaving}>
              {chainSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editChain ? "Save Changes" : "Create Chain"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Add Member Sheet ─────────────────────────────────────────────── */}
      <Sheet open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Quest to Chain</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Quest Selection — searchable combobox */}
            <div className="space-y-1">
              <Label>Quest Definition <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {addMemberForm.quest_definition_id
                      ? (() => {
                          const q = allQuestDefs.find((d) => d.id === addMemberForm.quest_definition_id)
                          return q ? `${q.name}  (${q.quest_type})` : addMemberForm.quest_definition_id.slice(0, 8) + "…"
                        })()
                      : "Select a quest…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search quests…" />
                    <CommandList>
                      <CommandEmpty>No quests found.</CommandEmpty>
                      <CommandGroup>
                        {getAvailableQuests().map((q) => (
                          <CommandItem
                            key={q.id}
                            value={`${q.name} ${q.quest_type}`}
                            onSelect={() => setAddMemberForm((f) => ({ ...f, quest_definition_id: q.id }))}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                addMemberForm.quest_definition_id === q.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="text-sm">{q.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{q.quest_type}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">A quest can belong to multiple chains with different sort orders and unlock rules.</p>
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <Label>Sort Order <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={addMemberForm.sort_order}
                onChange={(e) => setAddMemberForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Lower values display first in the chain.</p>
            </div>

            {/* Unlock Quest IDs */}
            <UnlockQuestIdsPicker
              value={addMemberForm.unlock_quest_ids}
              onChange={(ids) => setAddMemberForm((f) => ({ ...f, unlock_quest_ids: ids }))}
              chainMembers={expandedMembers}
              allQuestDefs={allQuestDefs}
              questDefsMap={questDefsMap}
              excludeQuestId={addMemberForm.quest_definition_id || undefined}
            />
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleAddMember} disabled={addMemberSaving || !addMemberForm.quest_definition_id}>
              {addMemberSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Chain
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Edit Member Sheet ────────────────────────────────────────────── */}
      <Sheet open={editMemberOpen} onOpenChange={setEditMemberOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Edit Member — {editMemberTarget ? (questDefsMap[editMemberTarget.quest_definition_id]?.name ?? "Quest") : ""}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Sort Order */}
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={editMemberForm.sort_order ?? 0}
                onChange={(e) => setEditMemberForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Lower values display first in the chain.</p>
            </div>

            {/* Unlock Quest IDs */}
            <UnlockQuestIdsPicker
              value={editMemberForm.unlock_quest_ids ?? []}
              onChange={(ids) => setEditMemberForm((f) => ({ ...f, unlock_quest_ids: ids }))}
              chainMembers={expandedMembers}
              allQuestDefs={allQuestDefs}
              questDefsMap={questDefsMap}
              excludeQuestId={editMemberTarget?.quest_definition_id}
            />

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Note:</strong> Unlock Quest IDs use full replacement. The entire list you save here will replace the current list — it is not an append operation.
              </AlertDescription>
            </Alert>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleEditMember} disabled={editMemberSaving}>
              {editMemberSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Delete Chain Confirmation ────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.display_name}</strong>?
              This is a soft delete — the chain will be hidden but quest definitions will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChain}
              disabled={deleteDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Remove Member Confirmation ───────────────────────────────────── */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={(open) => !open && setRemoveMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Quest from Chain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeMemberTarget?.questName}</strong> from this chain?
              The quest definition itself will not be deleted — only its membership in this chain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removeMemberDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMemberDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
