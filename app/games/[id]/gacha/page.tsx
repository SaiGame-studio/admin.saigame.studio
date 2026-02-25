"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Dices, Info, Package, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { getGame } from "@/lib/game-api"
import { listItemDefinitions, listCurrencyItems } from "@/lib/inventory-api"
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

function DropRateBar({ weight, total }: { weight: number; total: number }) {
  const pct = total > 0 ? (weight / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">
        {pct.toFixed(pct < 1 ? 2 : 1)}%
      </span>
    </div>
  )
}

export default function GameGachaPage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const gameId = params.id

  const [gameName, setGameName] = useState("")
  const [studioId, setStudioId] = useState("")
  const [currencies, setCurrencies] = useState<ItemDefinition[]>([])
  const [totalItems, setTotalItems] = useState(0)
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
          const ctx = { studioId: sid, gameId }
          const [currencyList, itemsResult] = await Promise.all([
            listCurrencyItems(ctx),
            listItemDefinitions(ctx, { limit: 1 }),
          ])
          setCurrencies(currencyList)
          setTotalItems(itemsResult.total)
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [gameId])

  const defaultCurrency = currencies.find(
    (c) => c.metadata?.is_default_currency === true,
  ) ?? currencies[0]

  return (
    <div className="container mx-auto py-6">
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
              <span>Gacha Packs</span>
            </BreadcrumbItem>
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
              <Dices className="h-6 w-6" />
              Gacha Packs
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure and review randomised item packs
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/games/${gameId}/items`}>
            <Package className="h-4 w-4 mr-2" />
            Item Catalogue
          </Link>
        </Button>
      </div>

      {/* Status banner */}
      <Alert className="mb-6 border-amber-500/50 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600">Admin API not yet available</AlertTitle>
        <AlertDescription className="text-sm">
          Gacha pack management via HTTP is planned for a future release. Pack configuration is
          currently done via <strong>database migration/seed SQL</strong> using the item UUIDs
          from your Item Catalogue.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — catalogue summary + currency */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Item Catalogue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{totalItems}</div>
                <p className="text-sm text-muted-foreground mt-1">item definitions</p>
                {totalItems === 0 && (
                  <p className="text-xs text-amber-500 mt-2">
                    ⚠ Create items in your catalogue first before configuring gacha packs.
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/games/${gameId}/items`}>Manage Items →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Currency Items</CardTitle>
                <CardDescription className="text-xs">
                  Used as payment for pack openings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No currency items defined. Create a stackable currency item (e.g. Gold) in
                    the Item Catalogue first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currencies.map((cur) => (
                      <div
                        key={cur.id}
                        className="flex items-center justify-between py-1.5 border-b last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{cur.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{cur.id.slice(0, 8)}…</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RarityBadge rarity={cur.rarity} />
                          {!!cur.metadata?.is_default_currency && (
                            <Badge variant="secondary" className="text-xs">default</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — setup guide + SQL template */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Setup Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>
                    Create a <strong className="text-foreground">currency item</strong> (e.g. Gold,
                    Gems) — must be stackable — in the Item Catalogue.
                  </li>
                  <li>
                    Create all <strong className="text-foreground">loot items</strong> (weapons,
                    armor, consumables, etc.) that should appear in the gacha pool.
                  </li>
                  <li>
                    Copy the item UUIDs and run the <strong className="text-foreground">SQL seed</strong>
                    {" "}below against your database to configure the pack.
                  </li>
                  <li>
                    Verify by using the Postman collection (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      POST /api/v1/gacha/open
                    </code>
                    ) as a test player.
                  </li>
                </ol>

                {defaultCurrency && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Default currency detected:{" "}
                      <strong>{defaultCurrency.name}</strong>{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {defaultCurrency.id}
                      </code>
                      . Use this UUID as{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        currency_item_definition_id
                      </code>{" "}
                      in the seed SQL.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">SQL Seed Template</CardTitle>
                <CardDescription className="text-xs">
                  Replace the placeholder UUIDs with real values from your catalogue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted rounded p-4 overflow-x-auto leading-relaxed whitespace-pre">
{`INSERT INTO gacha_packs (
    studio_id,
    game_id,
    name,
    pack_type,
    currency_item_definition_id,
    cost,
    item_pool,
    is_enabled
) VALUES (
    '${studioId || "<studio_id>"}',
    '${gameId}',
    'Standard Pack',
    'standard',
    '${defaultCurrency?.id ?? "<currency_item_definition_id>"}',
    100,
    '[
      {
        "item_definition_id": "<item_uuid_1>",
        "weight": 700000,
        "rarity": "common",
        "quantity_min": 1,
        "quantity_max": 1
      },
      {
        "item_definition_id": "<item_uuid_2>",
        "weight": 250000,
        "rarity": "rare",
        "quantity_min": 1,
        "quantity_max": 1
      },
      {
        "item_definition_id": "<item_uuid_3>",
        "weight": 49000,
        "rarity": "epic",
        "quantity_min": 1,
        "quantity_max": 1
      },
      {
        "item_definition_id": "<item_uuid_4>",
        "weight": 1000,
        "rarity": "legendary",
        "quantity_min": 1,
        "quantity_max": 1
      }
    ]',
    true
);`}
                </pre>

                <div className="mt-3 p-3 bg-muted/50 rounded text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Drop weight rules:</strong> Weights are relative integers. Using a
                    total of 1,000,000 makes percentages obvious (e.g. 700,000 = 70%).
                  </p>
                  <p>
                    All <code className="bg-muted px-1 rounded">item_definition_id</code> values
                    must exist in the item catalogue for this game.
                  </p>
                  <p>
                    The <code className="bg-muted px-1 rounded">pack_type</code> string is what
                    players pass when calling{" "}
                    <code className="bg-muted px-1 rounded">POST /api/v1/gacha/open</code>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Drop rate visualiser example */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Example Pack Preview</CardTitle>
                <CardDescription className="text-xs">
                  Visual preview of an example &quot;Standard Pack&quot; drop table
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">Standard Pack</p>
                    <p className="text-xs text-muted-foreground">
                      Cost: 100 {defaultCurrency?.name ?? "Gold"} per open
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    Enabled ✓
                  </Badge>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "Common Item",    rarity: "common"    as ItemRarity, weight: 700000, total: 1000000 },
                    { name: "Rare Shield",    rarity: "rare"      as ItemRarity, weight: 250000, total: 1000000 },
                    { name: "Epic Staff",     rarity: "epic"      as ItemRarity, weight:  49000, total: 1000000 },
                    { name: "Legendary Blade",rarity: "legendary" as ItemRarity, weight:   1000, total: 1000000 },
                  ].map((row) => (
                    <div key={row.name} className="flex items-center gap-3">
                      <RarityBadge rarity={row.rarity} />
                      <span className="text-sm flex-1">{row.name}</span>
                      <DropRateBar weight={row.weight} total={row.total} />
                      <span className="text-xs text-muted-foreground w-14 text-right">
                        qty 1
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
