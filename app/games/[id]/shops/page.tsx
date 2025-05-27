"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/utils/date-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { fetchGameShops, Shop, fetchShop, createShop } from "@/lib/shop-api"
import { ArrowLeft } from "lucide-react"
import { getGame } from "@/lib/game-api"
import { ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, X } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb"

export default function GameShopsPage() {
  const params = useParams() as { id: string }
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [gameName, setGameName] = useState<string>("")
  const [game, setGame] = useState<any>(null)
  const [shopItemCounts, setShopItemCounts] = useState<Record<string, number>>({})
  const [quickShopName, setQuickShopName] = useState("")
  const [quickShopLoading, setQuickShopLoading] = useState(false)
  const [createShopError, setCreateShopError] = useState<{ message: string; hints: string[] } | null>(null)
  const quickInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadShopsAndGame() {
      try {
        setLoading(true)
        const [shops, gameData] = await Promise.all([
          fetchGameShops(params.id),
          getGame(params.id),
        ])
        setShops(shops)
        setGameName(gameData.name)
        setGame(gameData)
        setError(null)
        // Fetch item count for each shop
        const countsMap: Record<string, number> = {}
        await Promise.all(
          shops.map(async (shop) => {
            try {
              const detail = await fetchShop(shop.id)
              countsMap[shop.id] = Array.isArray(detail.items_in_shop) ? detail.items_in_shop.length : 0
            } catch (e) {
              countsMap[shop.id] = 0
            }
          })
        )
        setShopItemCounts(countsMap)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadShopsAndGame()
  }, [params.id])

  async function handleQuickCreateShop() {
    if (!quickShopName.trim()) return;
    setQuickShopLoading(true)
    setCreateShopError(null)
    try {
      await createShop(params.id, { name: quickShopName })
      setQuickShopName("")
      if (quickInputRef.current) quickInputRef.current.value = ""
      // reload shops
      const [shops, game] = await Promise.all([
        fetchGameShops(params.id),
        getGame(params.id),
      ])
      setShops(shops)
      setGameName(game.name)
      const countsMap: Record<string, number> = {}
      await Promise.all(
        shops.map(async (shop) => {
          try {
            const detail = await fetchShop(shop.id)
            countsMap[shop.id] = Array.isArray(detail.items_in_shop) ? detail.items_in_shop.length : 0
          } catch (e) {
            countsMap[shop.id] = 0
          }
        })
      )
      setShopItemCounts(countsMap)
    } catch (e: any) {
      if (e && typeof e === 'object' && 'message' in e && 'hints' in e) {
        setCreateShopError({ message: e.message, hints: Array.isArray(e.hints) ? e.hints : [] });
      } else {
        setCreateShopError({ message: e?.message || 'Failed to create shop', hints: [] });
      }
    } finally {
      setQuickShopLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem loading shops</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-2">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href={`/studios/${game?.studio?.id}`}>{game?.studio?.name || 'Studio'}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${params.id}`}>{gameName || 'Game'}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-muted-foreground">Shops</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Game Shops</h1>
          <p className="text-muted-foreground text-base">List of all shops for the game: {gameName && (
            <Link href={`/games/${params.id}`} className="text-lg font-normal text-muted-foreground inline-flex items-center gap-1 hover:text-primary">
              {gameName}
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            ref={quickInputRef}
            type="text"
            className="border rounded px-2 py-1 bg-background text-foreground"
            placeholder="Quick shop name..."
            value={quickShopName}
            onChange={e => setQuickShopName(e.target.value)}
            disabled={quickShopLoading}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickCreateShop() }}
            style={{ minWidth: 160 }}
          />
          <Button onClick={handleQuickCreateShop} disabled={quickShopLoading || !quickShopName.trim()}>
            {quickShopLoading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
      {createShopError && (
        <Alert variant="destructive" className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {typeof createShopError === 'string' ? createShopError : createShopError.message}
                {Array.isArray(createShopError?.hints) && createShopError.hints.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-base text-destructive">
                    {createShopError.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCreateShopError(null)}>
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}
      {shops.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Shops Found</CardTitle>
            <CardDescription>There are no shops for this game.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <Card key={shop.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-mono">
                  <Link href={`/games/${params.id}/shops/${shop.id}`} className="inline-flex items-center gap-1">
                    {shop.name}
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </CardTitle>
                <CardDescription>Code: {shop.code_name}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>Shop ID: <code className="font-mono">{shop.id}</code></span>
                  <span>Items in Shop: <span className="font-semibold">{shopItemCounts[shop.id] ?? '-'}</span></span>
                  <span>Created At: {formatTimestamp(shop.created_at)}</span>
                  <span>Updated At: {formatTimestamp(shop.updated_at)}</span>
                </div>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`/games/${params.id}/shops/${shop.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}