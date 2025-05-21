"use client"

import { useEffect, useState } from "react"
import { Code, Gamepad2, Clock, Calendar, Brush } from "lucide-react"
import { fetchUserProfiles } from "@/lib/user-profile-api"
import { formatDate } from "@/lib/api"
import type { UserProfile } from "@/types/user-profile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

export function UserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserProfiles() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetchUserProfiles()

        if (response.status === "success" && response.data) {
          setProfiles(response.data)
        } else {
          throw new Error("Invalid response format")
        }
      } catch (err) {
        console.error("Failed to load user profiles:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfiles()
  }, [])

  if (isLoading) {
    return <ProfilesSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Profiles</AlertTitle>
        <AlertDescription>No user profiles available.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Your Profiles</CardTitle>
          <CardDescription>Your developer and player profiles</CardDescription>
        </CardHeader>
      </Card>

      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  )
}

function ProfileCard({ profile }: { profile: UserProfile }) {
  const isDeveloper = profile.type === "developer"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Badge variant={isDeveloper ? "default" : "secondary"} className="mb-2">
            {isDeveloper ? <Code className="mr-1 h-3 w-3" /> : <Gamepad2 className="mr-1 h-3 w-3" />}
            {profile.type.charAt(0).toUpperCase() + profile.type.slice(1)}
          </Badge>
          <Badge variant="outline">{profile.tier}</Badge>
        </div>
        <CardTitle>{isDeveloper ? "Developer Profile" : "Player Profile"}</CardTitle>
        <CardDescription>Profile ID: {profile.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDeveloper && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground flex items-center">
              <Brush className="mr-2 h-4 w-4" /> Studios
            </div>
            <div className="font-medium">{profile.studios_count || 0}</div>
          </div>
        )}
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground flex items-center">
            <Calendar className="mr-2 h-4 w-4" /> Created
          </div>
          <div className="font-medium">{formatDate(profile.created_at)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground flex items-center">
            <Clock className="mr-2 h-4 w-4" /> Last Updated
          </div>
          <div className="font-medium">{formatDate(profile.updated_at)}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfilesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
      </Card>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-40" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
