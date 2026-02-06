"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCapabilities } from "@/hooks/use-capabilities"
import { Brush, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AllStudiosPage() {
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
          <Brush className="h-8 w-8" />
          All Studios
        </h1>
        <p className="text-muted-foreground">
          Manage all game studios across the platform (Super Admin)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Studio Management</CardTitle>
          <CardDescription>
            This page will display all studios in the system with management capabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature is under development. It will include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>View all registered studios</li>
            <li>Search and filter studios</li>
            <li>Studio ownership and team management</li>
            <li>Resource allocation and quotas</li>
            <li>Analytics and reporting</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
