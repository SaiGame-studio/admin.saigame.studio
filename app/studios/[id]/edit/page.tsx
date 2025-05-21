"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchStudio, updateStudio } from "@/lib/studio-api"
import type { Studio } from "@/types/studio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditStudioPage({ params }: { params: { id: string } }) {
  const [studio, setStudio] = useState<Studio | null>(null)
  const [name, setName] = useState("")
  const [tier, setTier] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function loadStudio() {
      try {
        setFetchLoading(true)
        const data = await fetchStudio(params.id)
        setStudio(data)
        setName(data.name)
        setTier(data.tier)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load studio details")
      } finally {
        setFetchLoading(false)
      }
    }

    loadStudio()
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      setError("Studio name is required")
      return
    }

    try {
      setLoading(true)
      setError(null)

      await updateStudio(params.id, { name, tier })

      toast({
        title: "Studio updated",
        description: "Your studio has been updated successfully.",
      })

      router.push(`/studios/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update studio")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" className="mb-6" onClick={() => router.push(`/studios/${params.id}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Studio Details
      </Button>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Edit Studio</CardTitle>
          <CardDescription>Update your studio details</CardDescription>
        </CardHeader>

        {fetchLoading ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        ) : error && !studio ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Studio Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter studio name"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select value={tier} onValueChange={setTier} disabled={loading}>
                  <SelectTrigger id="tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Education Tier">Education Tier</SelectItem>
                    <SelectItem value="Indie Tier">Indie Tier</SelectItem>
                    <SelectItem value="Professional Tier">Professional Tier</SelectItem>
                    <SelectItem value="Enterprise Tier">Enterprise Tier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Studio"
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
