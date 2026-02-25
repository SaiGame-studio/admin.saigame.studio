"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  BarChart3,
  Clock,
  Cog,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  Terminal,
  User,
  Users,
  Moon,
  Sun,
  Brush,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Gift,
  ReceiptText,
  Puzzle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { useCapabilities } from "@/hooks/use-capabilities"
import { useTheme } from "next-themes"
import { safeGetItem, safeSetItem } from "@/lib/storage-utils"
import { SITE_NAME } from "@/lib/utils/site-config"
import { LanguageSelector } from "@/components/ui/language-selector"
import { useTranslation } from "@/lib/i18n/use-translation"

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 400
const DEFAULT_SIDEBAR_WIDTH = 240
const COLLAPSED_WIDTH = 80
const SIDEBAR_WIDTH_KEY = "sai-admin-sidebar-width"
const SIDEBAR_COLLAPSED_KEY = "sai-admin-sidebar-collapsed"

export function SideNav() {
  const { logout } = useAuth()
  const capabilities = useCapabilities()
  const { theme, setTheme } = useTheme()
  const { t, locale } = useTranslation()
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load saved width and collapsed state on mount
  useEffect(() => {
    const savedWidth = safeGetItem(SIDEBAR_WIDTH_KEY)
    const savedCollapsed = safeGetItem(SIDEBAR_COLLAPSED_KEY)
    
    if (savedCollapsed === 'true') {
      setIsCollapsed(true)
      setSidebarWidth(COLLAPSED_WIDTH)
    } else if (savedWidth) {
      const width = Number.parseInt(savedWidth, 10)
      if (!isNaN(width) && width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(width)
      }
    }
  }, [])

  // Handle mouse events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || isCollapsed) return

      const newWidth = e.clientX
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false)
        // Save the width to localStorage
        safeSetItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString())
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, sidebarWidth, isCollapsed])

  const toggleTheme = () => {
    setTheme(theme === "dark-green" ? "light-warm" : "dark-green")
  }

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    if (newCollapsed) {
      setSidebarWidth(COLLAPSED_WIDTH)
    } else {
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    }
    safeSetItem(SIDEBAR_COLLAPSED_KEY, newCollapsed.toString())
  }

  return (
    <>
      <style jsx global>{`
        main {
          margin-left: var(--sidebar-width);
          transition: margin-left 0.2s ease-in-out;
        }
        .sidebar-container {
          height: 100vh;
          min-height: 100vh;
          max-height: 100vh;
          position: sticky;
          top: 0;
        }
      `}</style>
      <div
        ref={sidebarRef}
        className="hidden border-r bg-muted/40 lg:flex dark:bg-background flex-col sidebar-container"
        style={{ 
          width: `${sidebarWidth}px`
        }}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px]">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2 font-semibold whitespace-nowrap">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="flex-shrink-0" />
              <span>{SITE_NAME}</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="flex justify-center w-full">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="flex-shrink-0" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/">
                  <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{t('common.dashboard')}</span>}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/studios">
                  <Brush className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{t('common.studios')}</span>}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/games">
                  <Gamepad2 className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{t('common.games')}</span>}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                <Link href="/users">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{t('common.users')}</span>}
                </Link>
              </Button>
            </div>
            {!isCollapsed && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground px-2">{t('common.administration')}</h3>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/profile">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.profile')}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/payment">
                    <Wallet className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.payment')}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/settings">
                    <Cog className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.settings')}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/documentation">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.documentation')}</span>
                  </Link>
                </Button>
              </div>
            )}
            {!isCollapsed && capabilities.is_super_admin && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground px-2">{t('common.admin')}</h3>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/admin/users">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.allUsers')}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/admin/studios">
                    <Brush className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.allStudios')}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/admin/games">
                    <Gamepad2 className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">All Games</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/admin/gift-codes">
                    <ReceiptText className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.transactions')}</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2" asChild>
                  <Link href="/admin/plugins">
                    <Puzzle className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{t('common.allPlugins') || 'Plugins'}</span>
                  </Link>
                </Button>
              </div>
            )}
            {!isCollapsed && (
              <div className="space-y-1">
                {/* Separator line */}
                <div className="border-t border-border/50 my-2"></div>
                {isCollapsed ? (
                  <div className="px-2">
                    <LanguageSelector compact fullWidth />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      {t('settings.interfaceLanguage')}
                    </div>
                    <LanguageSelector fullWidth />
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 px-2" onClick={toggleTheme}>
                  {theme === "dark-green" ? (
                    <>
                      <Sun className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span className="whitespace-nowrap">Warm Light</span>}
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span className="whitespace-nowrap">Dark Green</span>}
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 px-2" onClick={logout}>
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap">{t('common.logout')}</span>}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-primary/10 active:bg-primary/20 transition-colors"
            onMouseDown={() => setIsResizing(true)}
            aria-hidden="true"
          />
        )}
      </div>
    </>
  )
}
