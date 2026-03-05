"use client"

import Link from "next/link"
import { ShieldX, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="flex flex-col items-center max-w-md w-full text-center gap-6">
        {/* Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-12 h-12 text-destructive" />
          </div>
          <span className="absolute -top-1 -right-1 text-xs font-bold bg-destructive text-destructive-foreground rounded-full w-7 h-7 flex items-center justify-center shadow">
            403
          </span>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Access Forbidden</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You don&apos;t have permission to perform this action or access this resource.
            <br />
            Contact your studio admin if you believe this is a mistake.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
