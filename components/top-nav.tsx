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
import { useServerConfig } from "@/hooks/use-server-config"

export function TopNav() {
  const { logout, user, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const isAdminZone = pathname?.startsWith("/admin")
  const { config } = useServerConfig()
  const registrationEnabled = config === null || config.features.registration_enabled

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b bg-background px-3 sm:gap-3 sm:px-4 lg:h-[60px] lg:gap-4 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] sm:w-[300px] p-0">
          <SideNav mobile />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 items-center gap-2 lg:hidden">
        <Image src="/logo.png" alt="Logo" width={24} height={24} className="shrink-0" style={{ width: 24, height: 24 }} />
        <Link href="/" className="hidden truncate whitespace-nowrap font-semibold sm:inline-block">
          Sai's Admin
        </Link>
      </div>
      <TipsBanner />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {isAdminZone && (
          <div className="flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-1 text-white text-[10px] font-semibold select-none sm:px-3 sm:text-xs">
            <ShieldAlert className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Admin Zone</span>
          </div>
        )}
        <ThemeToggle />
        {!isAuthenticated && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            {registrationEnabled && (
              <Button size="sm" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            )}
          </>
        )}
        {isAuthenticated && (
          <>
            <CoinBalance />
            <Button variant="ghost" className="flex items-center gap-2 px-1.5 h-9 sm:px-2" asChild>
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
            <Button variant="outline" size="icon" onClick={logout} className="shrink-0">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
