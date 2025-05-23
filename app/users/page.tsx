"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { fetchPlayerProfiles } from "@/lib/user-profile-api"
import type { UserProfile } from "@/types/user-profile"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function UsersPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const profiles = await fetchPlayerProfiles(50)
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
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">User ID</th>
                    <th className="px-4 py-2 text-left">Tier</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Created At</th>
                    <th className="px-4 py-2 text-left">Updated At</th>
                    <th className="px-4 py-2 text-left">Game Name</th>
                    <th className="px-4 py-2 text-left">Studio Name</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((item, idx) => (
                    <tr key={item.user_profile?.id || idx} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono">{item.user_profile?.id || '-'}</td>
                      <td className="px-4 py-2">{item.user_profile?.tier || '-'}</td>
                      <td className="px-4 py-2">{item.user_profile?.type || '-'}</td>
                      <td className="px-4 py-2">{formatTimestamp(item.user_profile?.created_at ?? 0)}</td>
                      <td className="px-4 py-2">{formatTimestamp(item.user_profile?.updated_at ?? 0)}</td>
                      <td className="px-4 py-2">{item.game?.name || '-'}</td>
                      <td className="px-4 py-2">{item.studio?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 