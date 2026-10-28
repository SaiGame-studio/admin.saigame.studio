"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Activity, BarChart3, Clock, MessageCircle, Database, FileText, LayoutDashboard, LogOut, Shield, ShieldCheck, Terminal, User, Users, Moon, Sun, Brush, Gamepad2, ChevronLeft, ChevronRight, Wallet, Gift, ReceiptText, Puzzle, Map, Bug, Download, BookOpen, PenSquare, Rocket, type LucideIcon, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useTheme } from "next-themes";
import { safeGetItem, safeSetItem } from "@/lib/storage-utils";
import { SITE_NAME } from "@/lib/utils/site-config";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useTranslation } from "@/lib/i18n/use-translation";
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;
const COLLAPSED_WIDTH = 80;
const SIDEBAR_WIDTH_KEY = "sai-admin-sidebar-width";
const SIDEBAR_COLLAPSED_KEY = "sai-admin-sidebar-collapsed";
export function SideNav({ mobile = false }: {
    mobile?: boolean;
} = {}) {
    const { logout, isAuthenticated } = useAuth();
    const capabilities = useCapabilities();
    const { theme, setTheme } = useTheme();
    const { t, locale } = useTranslation();
    const pathname = usePathname();
    const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const [isCollapsedState, setIsCollapsed] = useState(false);
    const isCollapsed = mobile ? false : isCollapsedState;
    const sidebarRef = useRef<HTMLDivElement>(null);
    // Load saved width and collapsed state on mount
    useEffect(() => {
        const savedWidth = safeGetItem(SIDEBAR_WIDTH_KEY);
        const savedCollapsed = safeGetItem(SIDEBAR_COLLAPSED_KEY);
        if (savedCollapsed === 'true') {
            setIsCollapsed(true);
            setSidebarWidth(COLLAPSED_WIDTH);
        }
        else if (savedWidth) {
            const width = Number.parseInt(savedWidth, 10);
            if (!isNaN(width) && width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
                setSidebarWidth(width);
            }
        }
    }, []);
    // Handle mouse events for resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || isCollapsed)
                return;
            const newWidth = e.clientX;
            if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
                setSidebarWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(false);
                // Save the width to localStorage
                safeSetItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
            }
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, sidebarWidth, isCollapsed]);
    const toggleTheme = () => {
        setTheme(theme === "dark-green" ? "light-warm" : "dark-green");
    };
    const toggleCollapse = () => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        if (newCollapsed) {
            setSidebarWidth(COLLAPSED_WIDTH);
        }
        else {
            setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
        }
        safeSetItem(SIDEBAR_COLLAPSED_KEY, newCollapsed.toString());
    };
    return (<div ref={sidebarRef} className={mobile
            ? "flex flex-col h-full w-full bg-muted/40 dark:bg-background"
            : "hidden border-r bg-muted/40 lg:flex dark:bg-background flex-col mr-[20px]"} style={mobile
            ? undefined
            : {
                width: `${sidebarWidth}px`,
                height: "100vh",
                minHeight: "100vh",
                maxHeight: "100vh",
                position: "sticky",
                top: 0,
            }}>
        <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px]">
          {!isCollapsed && (<Link href="/" className="flex items-center gap-2 font-semibold whitespace-nowrap">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="flex-shrink-0" style={{ width: 24, height: 24 }}/>
              <span>{SITE_NAME}</span>
            </Link>)}
          {isCollapsed && (<div className="flex justify-center w-full">
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="flex-shrink-0" style={{ width: 24, height: 24 }}/>
            </div>)}
          {!mobile && (<Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleCollapse}>
              {isCollapsed ? (<ChevronRight className="h-4 w-4"/>) : (<ChevronLeft className="h-4 w-4"/>)}
            </Button>)}
        </div>
        <ScrollArea className="flex-1 px-3 py-2">
          <div id="side-nav-groups" className="side-nav-groups space-y-4">
            {isAuthenticated && (<div id="side-nav-main" className="side-nav-main space-y-1">
                <NavItem id="side-nav-dashboard-link" href="/" icon={LayoutDashboard} label={t('common.dashboard')} active={isActive("/")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-studios-link" href="/studios" icon={Brush} label={t('common.studios')} active={isActive("/studios")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-games-link" href="/games" icon={Gamepad2} label={t('common.games')} active={isActive("/games")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-roadmap-link" href="/roadmap" icon={Map} label={t('common.roadmap')} active={isActive("/roadmap")} collapsed={isCollapsed}/>
              </div>)}
            {isAuthenticated && (<div id="side-nav-account" className="side-nav-account space-y-1">
                <NavGroupTitle id="side-nav-account-title" title={t('common.administration')} collapsed={isCollapsed}/>
                <NavItem id="side-nav-profile-link" href="/profile" icon={User} label={t('common.profile')} active={isActive("/profile")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-payment-link" href="/payment" icon={Wallet} label={t('common.payment')} active={isActive("/payment")} collapsed={isCollapsed}/>
              </div>)}
            <div id="side-nav-support" className="side-nav-support space-y-1">
              <NavGroupTitle id="side-nav-support-title" title={t('common.support')} collapsed={isCollapsed}/>
              <NavItem id="side-nav-tutorials-link" href="/tutorials" icon={BookOpen} iconClassName="animate-pulse" label={t('tutorials.title')} active={isActive("/tutorials")} collapsed={isCollapsed} suffix={<span className="animate-pulse text-yellow-400 text-[10px]">&#9733;</span>}/>
              <NavItem id="side-nav-why-sai-server-link" href="/why-sai-server" icon={Rocket} label={t('common.whySaiServer')} active={isActive("/why-sai-server")} collapsed={isCollapsed}/>
              <NavItem id="side-nav-unity-package-link" href="https://github.com/SaiGame-studio/ss-unity/releases" external icon={Download} label="Unity Package" collapsed={isCollapsed}/>
              <NavItem id="side-nav-discord-support-link" href="https://discord.gg/UU3YarmVde" external icon={MessageCircle} label={t('common.discordSupport')} collapsed={isCollapsed}/>
              <NavItem id="side-nav-bug-report-link" href="https://discord.gg/UU3YarmVde" external icon={Bug} label={t('common.bugReport')} collapsed={isCollapsed}/>
            </div>
            {capabilities.is_super_admin && (<div id="side-nav-admin" className="side-nav-admin space-y-1">
                <NavGroupTitle id="side-nav-admin-title" title={t('common.admin')} collapsed={isCollapsed}/>
                <NavItem id="side-nav-admin-monitor-link" href="/admin/monitor" icon={Activity} label="Monitor" active={isActive("/admin/monitor")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-admin-support-link" href="/admin/support" icon={MessageCircle} label="Support chat" active={isActive("/admin/support")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-admin-payments-link" href="/admin/payments" icon={ReceiptText} label={t('common.transactions')} active={isActive("/admin/payments")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-admin-plugins-link" href="/admin/plugins" icon={Puzzle} label={t('common.allPlugins') || 'Plugins'} active={isActive("/admin/plugins")} collapsed={isCollapsed}/>
                <NavItem id="side-nav-admin-cms-link" href="/admin/cms" icon={PenSquare} label="CMS" active={isActive("/admin/cms")} collapsed={isCollapsed}/>
              </div>)}
            <div id="side-nav-settings" className="side-nav-settings space-y-1">
              <div className="border-t border-border/50 my-2"></div>
              {isCollapsed ? (<div id="side-nav-language-compact" className="side-nav-language-compact flex justify-center">
                  <LanguageSelector compact fullWidth largeFlag/>
                </div>) : (<div id="side-nav-language" className="side-nav-language space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {t('settings.interfaceLanguage')}
                  </div>
                  <LanguageSelector fullWidth/>
                </div>)}
              {(() => {
                const themeLabel = theme === "dark-green" ? t('settings.themes.lightWarm' as any) : t('settings.themes.darkGreen' as any);
                const ThemeIcon = theme === "dark-green" ? Sun : Moon;
                return (<Button id="side-nav-theme-toggle" variant="outline" size="sm" className={`side-nav-theme-toggle w-full gap-2 px-2 ${isCollapsed ? "justify-center" : "justify-start"}`} onClick={toggleTheme} title={isCollapsed ? themeLabel : undefined} aria-label={themeLabel}>
                    <ThemeIcon className="h-4 w-4 flex-shrink-0"/>
                    {!isCollapsed && <span className="whitespace-nowrap">{themeLabel}</span>}
                  </Button>);
              })()}
              {isAuthenticated && (<Button id="side-nav-logout" variant="outline" size="sm" className={`side-nav-logout w-full gap-2 px-2 ${isCollapsed ? "justify-center" : "justify-start"}`} onClick={logout} title={isCollapsed ? t('common.logout') : undefined} aria-label={t('common.logout')}>
                  <LogOut className="h-4 w-4 flex-shrink-0"/>
                  {!isCollapsed && <span className="whitespace-nowrap">{t('common.logout')}</span>}
                </Button>)}
            </div>
          </div>
        </ScrollArea>

        {/* Resize handle */}
        {!mobile && !isCollapsed && (<div className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-primary/10 active:bg-primary/20 transition-colors" onMouseDown={() => setIsResizing(true)} aria-hidden="true"/>)}
    </div>);
}

type NavItemProps = {
    id: string;
    href: string;
    icon: LucideIcon;
    label: string;
    collapsed: boolean;
    active?: boolean;
    external?: boolean;
    iconClassName?: string;
    suffix?: ReactNode;
};

/** Sidebar link: icon + label when expanded, icon only (label as tooltip) when collapsed. */
function NavItem({ id, href, icon: Icon, label, collapsed, active = false, external = false, iconClassName = "", suffix }: NavItemProps) {
    const content = (<>
        <Icon className={`h-4 w-4 flex-shrink-0 ${iconClassName}`}/>
        {!collapsed && <span className="whitespace-nowrap">{label}{suffix && <> {suffix}</>}</span>}
      </>);
    return (<Button id={id} variant={active ? "secondary" : "ghost"} size="sm" className={`${id} w-full gap-2 px-2 ${collapsed ? "justify-center" : "justify-start"}`} title={collapsed ? label : undefined} aria-label={label} asChild>
        {external
            ? (<a href={href} target="_blank" rel="noopener noreferrer">{content}</a>)
            : (<Link href={href}>{content}</Link>)}
      </Button>);
}

/** Group heading; collapses to a thin divider so every item stays visible. */
function NavGroupTitle({ id, title, collapsed }: { id: string; title: string; collapsed: boolean }) {
    if (collapsed)
        return <div id={id} className={`${id} mx-2 border-t border-border/50`} aria-hidden="true"/>;
    return <h3 id={id} className={`${id} text-xs font-medium text-muted-foreground px-2`}>{title}</h3>;
}
