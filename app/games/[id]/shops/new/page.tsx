"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createShop } from "@/lib/shop-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function NewShopPage() {
  const router = useRouter()
  const params = useParams() as { id: string }
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Shop name is required")
      return
    }
    try {
      setLoading(true)
      setError(null)
      await createShop(params.id, { name })
      router.push(`/games/${params.id}/shops`)
    } catch (err: any) {
      setError(err.message || "Failed to create shop. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="outline" size="sm" onClick={() => router.push(`/games/${params.id}/shops`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shops
      </Button>
      <Card className="max-w-md mx-auto mt-6">
        <CardHeader>
          <CardTitle>Create New Shop</CardTitle>
          <CardDescription>Enter the information for your new shop</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name</Label>
              <Input
                id="name"
                placeholder="Enter shop name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push(`/games/${params.id}/shops`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shop
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 