"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Mail, Calendar, UserIcon, Clock } from "lucide-react"
import { fetchUserProfile, formatDate } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { UserProfiles } from "@/components/user-profiles"

interface UserData {
  id: number
  name: string
  email: string
  email_verified_at: number | null
  created_at: number
  updated_at: number
}

export function ProfileContent() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetchUserProfile()

        if (response.status === "success" && response.data) {
          setUserData(response.data)
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
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          {error.includes("Authentication") && <div className="mt-2">Redirecting to login page...</div>}
        </AlertDescription>
      </Alert>
    )
  }

  if (!userData) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No user profile data available.</AlertDescription>
      </Alert>
    )
  }

  // Get initials for avatar
  const getInitials = () => {
    if (userData.name && userData.name.trim() !== "") {
      return userData.name
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
              <CardTitle className="text-2xl">{userData.name || "Unnamed User"}</CardTitle>
              <CardDescription className="flex items-center">
                <Mail className="mr-1 h-4 w-4" />
                {userData.email}
                {userData.email_verified_at ? (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                    Not Verified
                  </Badge>
                )}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center">
                <UserIcon className="mr-2 h-4 w-4" /> User ID
              </div>
              <div className="font-medium">{userData.id}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center">
                <Calendar className="mr-2 h-4 w-4" /> Member Since
              </div>
              <div className="font-medium">{formatDate(userData.created_at * 1000)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center">
                <Clock className="mr-2 h-4 w-4" /> Last Updated
              </div>
              <div className="font-medium">{formatDate(userData.updated_at * 1000)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Update your profile information and preferences</div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button className="w-full">Edit Profile</Button>
            <Button variant="outline" className="w-full">
              Change Password
            </Button>
            {!userData.email_verified_at && (
              <Button variant="secondary" className="w-full">
                Verify Email
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
