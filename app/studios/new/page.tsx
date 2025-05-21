"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createStudio } from "@/lib/studio-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

export default function NewStudioPage() {
  const [name, setName] = useState("")
  const [tier, setTier] = useState("Education Tier")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      setError("Studio name is required")
      return
    }

    try {
      setLoading(true)
      setError(null)

      await createStudio({ name, tier })

      toast({
        title: "Studio created",
        description: "Your new studio has been created successfully.",
      })

      router.push("/studios")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create studio")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/studios")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Studios
      </Button>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Create New Studio</CardTitle>
          <CardDescription>Set up a new game development studio</CardDescription>
        </CardHeader>

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
                  Creating...
                </>
              ) : (
                "Create Studio"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
