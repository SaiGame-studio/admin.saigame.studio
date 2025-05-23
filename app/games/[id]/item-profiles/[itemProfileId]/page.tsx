"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function ItemProfilePage() {
  const params = useParams() as { id: string; itemProfileId: string }
  const router = useRouter()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadItemProfile() {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")
        if (!token) throw new Error("Authentication required")
        const res = await fetch(`${API_URL}/api/item-profiles/${params.itemProfileId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to fetch item profile")
        const json = await res.json()
        setItem(json.data)
        setError(null)
      } catch (err: any) {
        setError(err.message || "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadItemProfile()
  }, [params.itemProfileId])

  if (loading) return <div className="container mx-auto py-6">Loading...</div>
  if (error) return <div className="container mx-auto py-6 text-red-500">{error}</div>
  if (!item) return null

  return (
    <div className="container mx-auto py-6 max-w-xl">
      <Button variant="outline" size="sm" className="mb-4" onClick={() => router.back()}>
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{item.name}</CardTitle>
          <CardDescription>Code: {item.code_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2">Status: <span className="font-semibold">{item.status}</span></div>
          <div className="mb-2">Type: <span className="font-semibold">{item.type}</span></div>
          <div className="mb-2">Description: {item.description || "-"}</div>
          <div className="mb-2">Level: {item.level_start} - {item.level_max}</div>
          <div className="mb-2">Stackable: {item.stackable ? "Yes" : "No"}</div>
          <div className="mb-2">Stack Limit: {item.stack_limit}</div>
          <div className="mb-2">Amount on Registry: {item.amount_on_registry}</div>
          <div className="mb-2">Create on Registry: {item.create_on_registry ? "Yes" : "No"}</div>
          <div className="mb-2">Game ID: {item.game_id}</div>
          <div className="mb-2">Inventory Profile ID: {item.inventory_profile_id}</div>
          <div className="mb-2">Created At: {item.created_at}</div>
          <div className="mb-2">Updated At: {item.updated_at}</div>
          {item.custom_data && (
            <div className="mb-2">
              <div className="font-semibold">Custom Data:</div>
              <div className="ml-4">
                {Object.entries(item.custom_data).map(([key, value]) => (
                  <div key={key}>{key}: {String(value)}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 