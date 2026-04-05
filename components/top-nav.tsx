"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LogOut, Menu, User, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SideNav } from "@/components/side-nav"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { CoinBalance } from "@/components/coin-balance"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TipsBanner } from "@/components/TipsBanner"

export function TopNav() {
  const { logout, user, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const isAdminZone = pathname?.startsWith("/admin")

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] sm:w-[300px]">
          <SideNav />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2 lg:hidden">
        <Image src="/logo.png" alt="Logo" width={24} height={24} style={{ width: 24, height: 24 }} />
        <Link href="/" className="font-semibold">
          Sai's Admin
        </Link>
      </div>
      <TipsBanner />
      <div className="ml-auto flex items-center gap-2">
        {isAdminZone && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-white text-xs font-semibold select-none">
            <ShieldAlert className="h-3 w-3 shrink-0" />
            Admin Zone
          </div>
        )}
        <ThemeToggle />
        {!isAuthenticated && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </>
        )}
        {isAuthenticated && (
          <>
            <CoinBalance />
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9" asChild>
              <Link href="/profile">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {(user?.display_name || user?.username)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline-block">
                  {user?.display_name || user?.username}
                </span>
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
