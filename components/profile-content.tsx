"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Mail, Calendar, UserIcon, Clock, Copy, Check } from "lucide-react"
import { fetchUserProfile, formatDate } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { UserProfiles } from "@/components/user-profiles"
import { useTranslation } from '@/lib/i18n/use-translation'

interface UserData {
  id: string
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: number
}

export function ProfileContent() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetchUserProfile()

        if (response.user) {
          setUserData(response.user)
        } else {
          throw new Error("Invalid response format")
        }
      } catch (err) {
        console.error("Failed to load user profile:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")

        // If the error is related to authentication, redirect to login
        if (err instanceof Error && err.message.includes("Authentication")) {
          setTimeout(() => router.push("/login"), 2000)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [router])

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('common.error')}</AlertTitle>
        <AlertDescription>
          {error}
          {error.includes("Authentication") && <div className="mt-2">{t('profilePage.redirectingToLogin')}</div>}
        </AlertDescription>
      </Alert>
    )
  }

  if (!userData) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('profilePage.noData')}</AlertTitle>
        <AlertDescription>{t('profilePage.noDataDesc')}</AlertDescription>
      </Alert>
    )
  }

  // Get initials for avatar
  const getInitials = () => {
    if (userData.username && userData.username.trim() !== "") {
      return userData.username
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return userData.email.substring(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{userData.username || t('profilePage.unnamedUser')}</CardTitle>
              <CardDescription className="flex items-center">
                <Mail className="mr-1 h-4 w-4" />
                {userData.email}
                {userData.is_verified ? (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> {t('profilePage.verified')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                    {t('profilePage.notVerified')}
                  </Badge>
                )}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profilePage.accountInfo')}</CardTitle>
            <CardDescription>{t('profilePage.accountInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center">
                <UserIcon className="mr-2 h-4 w-4" /> {t('profilePage.userId')}
              </div>
              <div className="flex items-center gap-2">
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm break-all">
                  {userData.id}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(userData.id)
                    } else {
                      const textarea = document.createElement('textarea')
                      textarea.value = userData.id
                      textarea.style.position = 'fixed'
                      textarea.style.opacity = '0'
                      document.body.appendChild(textarea)
                      textarea.select()
                      document.execCommand('copy')
                      document.body.removeChild(textarea)
                    }
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center">
                <Calendar className="mr-2 h-4 w-4" /> {t('profilePage.memberSince')}
              </div>
              <div className="font-medium">{formatDate(userData.created_at * 1000)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center">
                <UserIcon className="mr-2 h-4 w-4" /> {t('profilePage.status')}
              </div>
              <div className="font-medium">
                {userData.is_active ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {t('common.active')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    {t('common.inactive')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profilePage.accountActions')}</CardTitle>
            <CardDescription>{t('profilePage.accountActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{t('profilePage.accountActionsHint')}</div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button className="w-full">{t('profilePage.editProfile')}</Button>
            <Button variant="outline" className="w-full">
              {t('profilePage.changePassword')}
            </Button>
            {!userData.is_verified && (
              <Button variant="secondary" className="w-full">
                {t('profilePage.verifyEmail')}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* User Profiles Section */}
      <UserProfiles />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
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

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>

      {/* Skeleton for User Profiles */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
