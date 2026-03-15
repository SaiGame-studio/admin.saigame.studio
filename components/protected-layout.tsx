"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { SideNav } from "@/components/side-nav"
import { TopNav } from "@/components/top-nav"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const isAuthPage = pathname === "/login" || pathname === "/register"

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If not authenticated and not on auth page, don't render anything
  // (the auth context will handle the redirect)
  if (!isAuthenticated && !isAuthPage) {
    return null
  }

  // If on auth page, just render the page without layout
  if (isAuthPage) {
    return <>{children}</>
  }

  // If authenticated, render with full layout
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex flex-1 flex-col min-h-screen min-w-0">
        <TopNav />
        <main className="flex-1 overflow-auto [&_.container]:ml-0">{children}</main>
      </div>
    </div>
  )
}
