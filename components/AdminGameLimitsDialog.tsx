"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, RefreshCw, Sliders, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { AdminGame, updateGameLimits } from "@/lib/admin-api"
import { getGame } from "@/lib/game-api"
import type { Game } from "@/types/game"

interface Props {
  game: AdminGame
}

function UsageBar({ value, limit }: { value: number; limit: number | null | undefined }) {
  if (limit == null || limit <= 0) return null
  const pct = Math.min(100, Math.round((value / limit) * 100))
  return (
    <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function AdminGameLimitsDialog({ game }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Game | null>(null)
  const [loading, setLoading] = useState(false)

  // which field key is currently being edited
  const [editingKey, setEditingKey] = useState<string | null>(null)
  // draft value for the currently edited field
  const [draftValue, setDraftValue] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setEditingKey(null)
    try {
      const res = await getGame(game.id)
      setDetail(res)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const u = detail?.usage
  const l = detail?.limits

  const fields: { key: string; label: string; usage: number; limit?: number | null }[] = [
    { key: "max_player_profiles", label: "Player Profiles", usage: u?.player_profiles ?? 0, limit: l?.max_player_profiles },
    { key: "max_concurrent_users", label: "Concurrent Users", usage: u?.concurrent_users ?? 0, limit: l?.max_concurrent_users },
    { key: "max_items", label: "Items", usage: u?.items ?? 0, limit: l?.max_items },
    { key: "max_shops", label: "Shops", usage: u?.shops ?? 0, limit: l?.max_shops },
    { key: "max_gacha_packs", label: "Gacha Packs", usage: u?.gacha_packs ?? 0, limit: l?.max_gacha_packs },
    { key: "max_node_definitions", label: "Journey Node", usage: u?.node_definitions ?? 0, limit: l?.max_node_definitions },
    { key: "max_event_types", label: "Event Types", usage: u?.event_types ?? 0, limit: l?.max_event_types },
  ]

  function startEdit(key: string, currentLimit: number | null | undefined) {
    setEditingKey(key)
    setDraftValue(currentLimit != null ? String(currentLimit) : "")
  }

  function cancelEdit() {
    setEditingKey(null)
    setDraftValue("")
  }

  async function saveField(key: string, label: string) {
    const raw = draftValue.trim()
    let newVal: number | null
    if (raw === "") {
      newVal = null
    } else {
      const n = parseInt(raw, 10)
      if (isNaN(n) || n < 0) {
        toast({ title: "Invalid value", description: `${label} must be a non-negative integer.`, variant: "destructive" })
        return
      }
      newVal = n
    }

    setSaving(true)
    try {
      await updateGameLimits(game.id, { [key]: newVal })
      toast({ title: "Saved", description: `${label} limit updated.` })
      await load()
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message || "Could not update limit.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5" />
          Limits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Game Limits — {game.name}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono break-all">{game.id}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="py-1">
            <div className="space-y-1">
              {fields.map((f) => {
                const isEditing = editingKey === f.key
                const atLimit = f.limit != null && f.usage >= f.limit
                return (
                  <div key={f.key} className="group rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">{f.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold tabular-nums ${atLimit ? "text-destructive" : ""}`}>
                          {f.usage}
                          <span className={`font-normal ${atLimit ? "text-destructive/70" : "text-muted-foreground"}`}>
                            {" / "}{f.limit != null ? f.limit : "∞"}
                          </span>
                        </span>
                        {!isEditing && (
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            title={`Edit ${f.label} limit`}
                            onClick={() => startEdit(f.key, f.limit)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <UsageBar value={f.usage} limit={f.limit} />

                    {isEditing && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Input
                          autoFocus
                          type="number"
                          min={0}
                          placeholder="unlimited"
                          className="h-8 text-sm flex-1"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveField(f.key, f.label)
                            if (e.key === "Escape") cancelEdit()
                          }}
                          disabled={saving}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10 shrink-0"
                          onClick={() => saveField(f.key, f.label)}
                          disabled={saving}
                          title="Save"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={cancelEdit}
                          disabled={saving}
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Click <Pencil className="inline h-3 w-3 mx-0.5" /> to edit a limit. Leave blank to remove it.</p>
              <Button variant="ghost" size="sm" onClick={load} disabled={loading || saving} className="shrink-0">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reload
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

