"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { SideNav } from "@/components/side-nav"
import { TopNav } from "@/components/top-nav"
import { Footer } from "@/components/footer"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname)
  const isPublicPage = pathname.startsWith("/tutorials")

  if (isLoading && !isPublicPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If not authenticated and not on auth/public page, don't render anything
  if (!isAuthenticated && !isAuthPage && !isPublicPage) {
    return null
  }

  // All pages render with full layout (sidebar + topnav)
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex flex-1 flex-col h-screen min-w-0">
        <TopNav />
        <main className="flex-1 overflow-auto [&_.container]:ml-0 pr-5">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
