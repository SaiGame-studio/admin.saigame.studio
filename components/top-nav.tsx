"use client"

import Link from "next/link"
import Image from "next/image"
import { LogOut, Menu, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SideNav } from "@/components/side-nav"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { CoinBalance } from "@/components/coin-balance"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TipsBanner } from "@/components/TipsBanner"

export function TopNav() {
  const { logout, user } = useAuth()

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
        <Image src="/logo.png" alt="Logo" width={24} height={24} />
        <Link href="/" className="font-semibold">
          Sai's Admin
        </Link>
      </div>
      <TipsBanner />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
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
      </div>
    </header>
  )
}
