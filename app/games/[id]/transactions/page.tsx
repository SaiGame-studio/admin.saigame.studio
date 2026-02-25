"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ScrollText, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { getGame } from "@/lib/game-api"
import { listTransactions } from "@/lib/inventory-api"
import type { InventoryTransaction, TxType, ItemRarity } from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"

const TX_TYPES: TxType[] = ["GACHA_OPEN", "ITEM_ADD", "ITEM_REMOVE", "ITEM_EQUIP", "ITEM_TRADE"]

const TX_COLORS: Record<TxType, string> = {
  GACHA_OPEN:  "bg-purple-500/10 text-purple-500 border-purple-500/30",
  ITEM_ADD:    "bg-green-500/10 text-green-500 border-green-500/30",
  ITEM_REMOVE: "bg-red-500/10 text-red-500 border-red-500/30",
  ITEM_EQUIP:  "bg-blue-500/10 text-blue-500 border-blue-500/30",
  ITEM_TRADE:  "bg-amber-500/10 text-amber-500 border-amber-500/30",
}

function TxBadge({ type }: { type: TxType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${TX_COLORS[type]}`}>
      {type.replace(/_/g, " ")}
    </span>
  )
}

function RarityDot({ rarity }: { rarity: ItemRarity }) {
  const c = RARITY_COLORS[rarity]
  return <span className={`inline-block w-2 h-2 rounded-full ${c.bg} border ${c.border}`} title={rarity} />
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function GameTransactionsPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const gameId = params.id

  const [gameName, setGameName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TxType | "all">("all")
  const LIMIT = 20

  useEffect(() => {
    getGame(gameId)
      .then((g) => { setGameName(g.name); setStudioId(g.studio_id ?? "") })
      .catch(() => {})
  }, [gameId])

  const fetchTx = useCallback(async (reset = true) => {
    if (!studioId) return
    if (reset) setLoading(true)
    else setLoadingMore(true)
    setError(null)
    try {
      const result = await listTransactions(
        { studioId, gameId },
        {
          limit: LIMIT,
          offset: reset ? 0 : transactions.length,
          ...(typeFilter !== "all" ? { type: typeFilter } : {}),
        },
      )
      const incoming = result.transactions ?? []
      setTransactions(reset ? incoming : (prev) => [...prev, ...incoming])
      setTotal(result.total)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load transactions")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [studioId, gameId, typeFilter, transactions.length])

  useEffect(() => { fetchTx(true) }, [studioId, gameId, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps
  // Only re-fetch on filter change, not on transactions.length change

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem><BreadcrumbLink href="/games">Games</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><span>Transactions</span></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScrollText className="h-6 w-6" />
              Transaction History
            </h1>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${total} transaction${total !== 1 ? "s" : ""}` : "No transactions yet"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchTx(true)} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${typeFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
        >
          All
        </button>
        {TX_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${typeFilter === t ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ScrollText className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No transactions found</p>
          {typeFilter !== "all" && <p className="text-sm mt-1">Try removing the filter.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              {/* Type badge */}
              <div className="pt-0.5 shrink-0">
                <TxBadge type={tx.transaction_type} />
              </div>

              {/* Items */}
              <div className="flex-1 min-w-0">
                {tx.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No items</p>
                ) : (
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {tx.items.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-sm">
                        <RarityDot rarity={item.rarity} />
                        <span className="font-medium">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                        )}
                        <Badge variant="outline" className="capitalize text-xs leading-none py-0 h-4">
                          {item.category}
                        </Badge>
                      </span>
                    ))}
                  </div>
                )}
                {tx.reference_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ref: <code className="font-mono">{tx.reference_id.slice(0, 8)}…</code>
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs text-muted-foreground shrink-0 pt-0.5" title={tx.created_at}>
                {timeAgo(tx.created_at)}
              </span>
            </div>
          ))}

          {/* Load more */}
          {transactions.length < total && (
            <div className="pt-3 text-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => fetchTx(false)}
              >
                {loadingMore ? "Loading…" : `Load more (${total - transactions.length} remaining)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
