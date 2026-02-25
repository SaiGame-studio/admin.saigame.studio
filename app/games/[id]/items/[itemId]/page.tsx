"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { getGame } from "@/lib/game-api"
import { getItemDefinition } from "@/lib/inventory-api"
import type { ItemDefinition, ItemRarity } from "@/types/inventory"
import { RARITY_COLORS } from "@/types/inventory"

function RarityBadge({ rarity }: { rarity: ItemRarity }) {
  const c = RARITY_COLORS[rarity]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${c.text} ${c.border} ${c.bg} capitalize`}>
      {rarity}
    </span>
  )
}

function CopyUUID({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 group"
      title="Copy"
    >
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">{value}</code>
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
        : <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />}
    </button>
  )
}

export default function ItemDefinitionDetailPage() {
  const params = useParams() as { id: string; itemId: string }
  const router = useRouter()
  const { id: gameId, itemId } = params

  const [item, setItem] = useState<ItemDefinition | null>(null)
  const [gameName, setGameName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const game = await getGame(gameId)
        setGameName(game.name)
        const sid = game.studio_id ?? ""
        setStudioId(sid)
        if (sid) {
          const data = await getItemDefinition({ studioId: sid, gameId }, itemId)
          setItem(data.item)
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load item")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gameId, itemId])

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error ?? "Item not found"}</CardContent>
        </Card>
      </div>
    )
  }

  const c = RARITY_COLORS[item.rarity]

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}/items`}>Item Catalogue</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{item.name}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg border ${c.border} ${c.bg}`}>
            <Package className={`h-6 w-6 ${c.text}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <RarityBadge rarity={item.rarity} />
              <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">Item ID</span>
              <CopyUUID value={item.id} />
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">Studio ID</span>
              <CopyUUID value={item.studio_id} />
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-muted-foreground shrink-0">Game ID</span>
              <CopyUUID value={item.game_id} />
            </div>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{item.name}</span>
            </div>
            {item.item_code && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground shrink-0">Item Code</span>
                <CopyUUID value={item.item_code} />
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rarity</span>
              <RarityBadge rarity={item.rarity} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stackable</span>
              <span className={item.is_stackable ? "text-green-500 font-medium" : "text-muted-foreground"}>
                {item.is_stackable ? `Yes` : "No"}
              </span>
            </div>
            {item.is_stackable && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Stack</span>
                <span>{item.max_stack_size != null ? item.max_stack_size.toLocaleString() : "Unlimited (∞)"}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grid Size</span>
              <span>{item.grid_width} × {item.grid_height}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-xs">{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-xs">{new Date(item.updated_at).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Base Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Base Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(item.base_stats ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No base stats defined.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(item.base_stats).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(item.metadata ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No metadata defined.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm border-b border-muted/50 pb-1.5">
                    <span className="text-muted-foreground font-mono text-xs">{key}</span>
                    <span className="text-xs font-medium max-w-[200px] truncate text-right" title={String(value)}>
                      {typeof value === "boolean"
                        ? value ? "true" : "false"
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
