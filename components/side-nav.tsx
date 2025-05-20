"use client"

import Link from "next/link"
import {
  BarChart3,
  Clock,
  Cog,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Server,
  Shield,
  Terminal,
  User,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"

export function SideNav() {
  const { logout } = useAuth()

  return (
    <div className="hidden border-r bg-muted/40 lg:block dark:bg-background">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Server className="h-6 w-6" />
            <span>Game Server Admin</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4 py-2 lg:px-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/servers">
                  <Server className="h-4 w-4" />
                  Servers
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/users">
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/logs">
                  <Terminal className="h-4 w-4" />
                  Logs
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/backups">
                  <Database className="h-4 w-4" />
                  Backups
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/stats">
                  <BarChart3 className="h-4 w-4" />
                  Statistics
                </Link>
              </Button>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground">Administration</h3>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/profile">
                  <User className="h-4 w-4" />
                  My Profile
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/settings">
                  <Cog className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/security">
                  <Shield className="h-4 w-4" />
                  Security
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/schedules">
                  <Clock className="h-4 w-4" />
                  Schedules
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" asChild>
                <Link href="/documentation">
                  <FileText className="h-4 w-4" />
                  Documentation
                </Link>
              </Button>
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto border-t p-4 lg:p-6">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
