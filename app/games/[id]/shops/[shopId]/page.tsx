"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { fetchShop } from "@/lib/shop-api"
import { formatTimestamp } from "@/lib/utils/date-utils"

export default function ShopDetailPage() {
  const params = useParams() as { id: string; shopId: string }
  const router = useRouter()
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadShop() {
      try {
        setLoading(true)
        const shopData = await fetchShop(params.shopId)
        setShop(shopData)
        setError(null)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadShop()
  }, [params.shopId])

  if (loading) return <div className="container mx-auto py-6">Loading...</div>
  if (error) return (
    <div className="container mx-auto py-6">
      <Card className="border-destructive mb-4">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>There was a problem loading the shop</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(`/games/${params.id}/shops`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shops
        </Button>
        <Button variant="default" size="sm" onClick={() => router.push(`/games/${params.id}/shops/${params.shopId}/edit`)}>
          Edit Shop
        </Button>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{shop.name}</CardTitle>
          <CardDescription>Code: {shop.code_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2">Game: <span className="font-semibold">{shop.game?.name}</span></div>
          <div className="mb-2">Created At: {formatTimestamp(shop.created_at)}</div>
          <div className="mb-2">Updated At: {formatTimestamp(shop.updated_at)}</div>
          {shop.currency && (
            <div className="mb-2">Currency: <span className="font-semibold">
              <Link href={`/games/${params.id}/item-profiles/${shop.currency.id}`} className="inline-flex items-center gap-1 underline hover:text-primary">
                {shop.currency.name}
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
            </span></div>
          )}
          <div className="mb-2">Description: {shop.description || "No description"}</div>
        </CardContent>
      </Card>
      <h2 className="text-xl font-bold mb-4">Items in Shop</h2>
      {shop.items_in_shop?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Items Found</CardTitle>
            <CardDescription>This shop has no items.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shop.items_in_shop?.map((item: any) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.item_profile?.name}</CardTitle>
                <CardDescription>Type: {item.item_profile?.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <div>Current Price: {item.price_current}</div>
                <div>Old Price: {item.price_old}</div>
                <div>HP Max: {item.item_profile?.custom_data?.hp_max}</div>
                <div>HP Current: {item.item_profile?.custom_data?.hp_current}</div>
                {/* Add more item details as needed */}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 