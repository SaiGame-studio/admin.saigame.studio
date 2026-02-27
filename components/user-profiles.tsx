"use client"

import { useEffect, useState } from "react"
import { Code, Gamepad2, Clock, Calendar, Brush } from "lucide-react"
import { fetchPlayerProfiles } from "@/lib/user-profile-api"
import { formatDate } from "@/lib/api"
import type { UserProfile } from "@/types/user-profile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { useTranslation } from '@/lib/i18n/use-translation'

export function UserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    async function loadUserProfiles() {
      try {
        setIsLoading(true)
        setError(null)

        const profiles = await fetchPlayerProfiles()

        setProfiles(profiles)
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
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('profilePage.noProfiles')}</AlertTitle>
        <AlertDescription>{t('profilePage.noProfilesDesc')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t('profilePage.yourProfiles')}</CardTitle>
          <CardDescription>{t('profilePage.yourProfilesDesc')}</CardDescription>
        </CardHeader>
      </Card>

      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  )
}

function ProfileCard({ profile }: { profile: UserProfile }) {
  const isDeveloper = profile.profile_type === "developer"
  const isGames = profile.profile_type === "gamer"
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Badge variant={isDeveloper ? "default" : "secondary"} className="mb-2">
            {isDeveloper ? <Code className="mr-1 h-3 w-3" /> : <Gamepad2 className="mr-1 h-3 w-3" />}
            {profile.profile_type.charAt(0).toUpperCase() + profile.profile_type.slice(1)}
          </Badge>
        </div>
        <CardTitle>{isDeveloper ? t('profilePage.developerProfile') : isGames ? t('profilePage.gamesProfile') : t('profilePage.profileFallback')}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t('profilePage.profileId')}: {profile.id}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" /> {t('profilePage.created')}
              </div>
              <div className="font-medium text-lg text-left">{formatDate(profile.created_at * 1000)}</div>
            </div>
            <div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" /> {t('profilePage.lastUpdated')}
              </div>
              <div className="font-medium text-lg text-left">{formatDate(profile.updated_at * 1000)}</div>
            </div>
          </div>
          {profile.custom_data && (
            <div className="flex flex-col items-end justify-start h-full">
              {profile.custom_data.studio_count !== undefined && (
                <>
                  <div className="flex items-center text-sm text-muted-foreground w-full justify-end">
                    <Brush className="mr-2 h-4 w-4" /> {t('profilePage.studiosCount')}
                  </div>
                  <div className="font-bold text-2xl text-right w-full">{profile.custom_data.studio_count}</div>
                </>
              )}
              {profile.custom_data.games_joined_count !== undefined && (
                <>
                  <div className="flex items-center text-sm text-muted-foreground w-full justify-end mt-4">
                    <Gamepad2 className="mr-2 h-4 w-4" /> {t('profilePage.gamesJoined')}
                  </div>
                  <div className="font-bold text-2xl text-right w-full">{profile.custom_data.games_joined_count}</div>
                </>
              )}
            </div>
          )}
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
