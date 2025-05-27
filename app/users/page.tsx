"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { fetchPlayerProfiles } from "@/lib/user-profile-api"
import type { UserProfile } from "@/types/user-profile"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function UsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const profiles = await fetchPlayerProfiles()
      setProfiles(profiles)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold">Player Profiles</h1>
          <p className="text-muted-foreground text-base">List of all player profiles across your studios</p>
        </div>
        <Button onClick={loadProfiles} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {error ? (
        <Card className="border-destructive mb-4">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>There was a problem loading player profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : profiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Player Profiles Found</CardTitle>
            <CardDescription>There are no player profiles to display.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
          {profiles.map((profile: UserProfile, idx) => (
            <Card key={profile.id || idx} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-mono">{profile.id || '-'}</CardTitle>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground"></span>
                  </div>
                </div>
                <CardDescription>
                  <div>Type: {profile.type || '-'}</div>
                  <div>Tier: {profile.tier || '-'}</div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>Created At: {formatTimestamp(profile.created_at)}</span>
                  <span>Updated At: {formatTimestamp(profile.updated_at)}</span>
                  {profile.studios_count !== undefined && (
                    <span>Studios Count: {profile.studios_count}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 