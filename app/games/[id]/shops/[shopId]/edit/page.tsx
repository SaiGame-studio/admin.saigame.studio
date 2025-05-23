"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchShop, updateShop } from "@/lib/shop-api"

export default function EditShopPage() {
  const params = useParams() as { id: string; shopId: string }
  const router = useRouter()
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [currencyId, setCurrencyId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadShop() {
      try {
        setLoading(true)
        const shopData = await fetchShop(params.shopId)
        setShop(shopData)
        setName(shopData.name || "")
        setCurrencyId(shopData.currency_id || "")
        setError(null)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadShop()
  }, [params.shopId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateShop(params.shopId, { name, currency_id: currencyId })
      router.push(`/games/${params.id}/shops/${params.shopId}`)
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container mx-auto py-6">Loading...</div>
  if (error) return <div className="container mx-auto py-6 text-red-500">{error}</div>

  return (
    <div className="container mx-auto py-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Edit Shop</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block mb-1 font-medium">Shop Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Currency ID</label>
              <Input value={currencyId} onChange={e => setCurrencyId(e.target.value)} required />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 