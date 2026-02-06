"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCapabilities } from "@/hooks/use-capabilities"
import { Users, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AllUsersPage() {
  const router = useRouter()
  const capabilities = useCapabilities()

  useEffect(() => {
    if (!capabilities.is_super_admin) {
      router.push("/")
    }
  }, [capabilities, router])

  if (!capabilities.is_super_admin) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You don't have permission to access this page. Super admin privileges required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8" />
          All Users
        </h1>
        <p className="text-muted-foreground">
          Manage all users across the platform (Super Admin)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            This page will display all users in the system with management capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. It will include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>View all registered users</li>
            <li>Search and filter users</li>
            <li>User account management</li>
            <li>Permission and role management</li>
            <li>Activity monitoring</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
