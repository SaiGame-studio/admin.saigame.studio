"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/utils/date-utils"
import { fetchPlayerProfiles } from "@/lib/user-profile-api"
import type { UserProfile } from "@/types/user-profile"
import { Button } from "@/components/ui/button"

export default function UsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Player Profiles</h1>
        <Button variant="outline" onClick={loadProfiles} disabled={loading}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
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
          <CardHeader>
            <CardTitle>All Player Profiles</CardTitle>
            <CardDescription>List of all player profiles across your studios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Tier</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Created At</th>
                    <th className="px-4 py-2 text-left">Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono">{profile.id}</td>
                      <td className="px-4 py-2">{profile.tier}</td>
                      <td className="px-4 py-2">{profile.type}</td>
                      <td className="px-4 py-2">{formatTimestamp(profile.created_at)}</td>
                      <td className="px-4 py-2">{formatTimestamp(profile.updated_at)}</td>
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