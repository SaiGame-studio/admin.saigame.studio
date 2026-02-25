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

export function TopNav() {
  const { logout } = useAuth()

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
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <CoinBalance />
        <Button variant="outline" size="icon" asChild>
          <Link href="/profile">
            <User className="h-5 w-5" />
            <span className="sr-only">User Profile</span>
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
