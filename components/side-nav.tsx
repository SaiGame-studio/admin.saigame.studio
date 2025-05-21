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
  Moon,
  Sun,
  Brush,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"

export function SideNav() {
  const { logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="hidden border-r bg-muted/40 lg:block dark:bg-background w-auto">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold whitespace-nowrap">
            <Server className="h-5 w-5 flex-shrink-0" />
            <span>Sai's Admin</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/">
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/studios">
                  <Brush className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Studios</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/users">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Users</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/logs">
                  <Terminal className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Logs</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/backups">
                  <Database className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Backups</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/stats">
                  <BarChart3 className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Statistics</span>
                </Link>
              </Button>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground px-2">Administration</h3>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/profile">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">My Profile</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/settings">
                  <Cog className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Settings</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/security">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Security</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/schedules">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Schedules</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/documentation">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Documentation</span>
                </Link>
              </Button>
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto border-t p-3">
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 px-2" onClick={toggleTheme}>
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Dark Mode</span>
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 px-2" onClick={logout}>
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
