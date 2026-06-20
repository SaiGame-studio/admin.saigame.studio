"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Users, Package, Mail, ScrollText, Hammer, BarChart2, Gamepad2, Trophy, ChevronsLeftRight, AlignJustify, Skull, Code2, BookOpen, Bot, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/i18n/use-translation";
import { LS_PANEL_OPEN } from "@/components/llm-conversations/conversation-panel-utils";
import { LLMTokenPurchaseDialog } from "@/components/LLMTokenPurchaseDialog";
const LS_KEY = "game-nav-expanded";
type GameNavSection = "shops" | "players" | "users" | "items" | "entities" | "mailbox" | "quests" | "leaderboard" | "plugins" | "analytic" | "detail" | "clone" | "scripts" | "lore" | "sysprompts";
interface GameNavButtonsProps {
    gameId: string;
    active?: GameNavSection;
    id?: string;
}
interface NavItem {
    section: GameNavSection;
    href: string;
    icon: React.ReactNode;
    label: string;
}
export function GameNavButtons({ gameId, active, id }: GameNavButtonsProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [isConvOpen, setIsConvOpen] = useState(false);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    // Load from localStorage after mount (avoids SSR mismatch)
    useEffect(() => {
        try {
            setExpanded(localStorage.getItem(LS_KEY) === "1");
        }
        catch { }
    }, []);
    // Sync conversation panel open state
    useEffect(() => {
        const sync = () => {
            try {
                setIsConvOpen(localStorage.getItem(LS_PANEL_OPEN) === 'true');
            }
            catch { }
        };
        sync();
        window.addEventListener('ss:conv-state-changed', sync);
        return () => window.removeEventListener('ss:conv-state-changed', sync);
    }, []);
    const toggle = () => {
        setExpanded((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(LS_KEY, next ? "1" : "0");
            }
            catch { }
            return next;
        });
    };
    const items: NavItem[] = [
        { section: "detail", href: `/games/${gameId}`, icon: <Gamepad2 className="h-4 w-4"/>, label: t("game.navGame") },
        { section: "clone", href: `/games/${gameId}/clone`, icon: <Copy className="h-4 w-4"/>, label: t("game.navClone") },
        { section: "players", href: `/games/${gameId}/players`, icon: <Users className="h-4 w-4"/>, label: t("game.users") },
        { section: "items", href: `/games/${gameId}/items`, icon: <Package className="h-4 w-4"/>, label: t("game.items") },
        { section: "entities", href: `/games/${gameId}/entities`, icon: <Skull className="h-4 w-4"/>, label: t("game.navEntities") },
        { section: "quests", href: `/games/${gameId}/quests`, icon: <ScrollText className="h-4 w-4"/>, label: t("game.quests") },
        { section: "shops", href: `/games/${gameId}/shops`, icon: <ShoppingCart className="h-4 w-4"/>, label: t("game.shops") },
        { section: "leaderboard", href: `/games/${gameId}/leaderboard`, icon: <Trophy className="h-4 w-4"/>, label: t("game.navLeaderboard") },
        { section: "analytic", href: `/games/${gameId}/analytic`, icon: <BarChart2 className="h-4 w-4"/>, label: t("game.navAnalytic") },
        { section: "mailbox", href: `/games/${gameId}/mailbox`, icon: <Mail className="h-4 w-4"/>, label: t("game.navMailbox") },
        { section: "scripts", href: `/games/${gameId}/scripts`, icon: <Code2 className="h-4 w-4"/>, label: t("game.navScripts") },
        { section: "lore", href: `/games/${gameId}/lore`, icon: <BookOpen className="h-4 w-4"/>, label: t("game.navLore") },
        { section: "plugins", href: `/games/${gameId}/plugins`, icon: <Hammer className="h-4 w-4"/>, label: t("game.navUpgrade") },
    ];
    const toggleBtn = (<Tooltip>
      <TooltipTrigger asChild>
        <Button id="game-nav-toggle-btn" variant="outline" size="icon" className={`h-8 w-8 shrink-0 transition-all border-dashed ${expanded ? "border-primary text-primary hover:text-primary hover:bg-primary/10" : "text-muted-foreground"}`} onClick={toggle}>
          {expanded
            ? <ChevronsLeftRight className="h-4 w-4"/>
            : <AlignJustify className="h-4 w-4"/>}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {expanded ? t("game.compactNav") : t("game.expandNav")}
      </TooltipContent>
    </Tooltip>);
    const openTokenPurchase = () => {
        setPurchaseOpen(true);
    };
    const openConversation = () => {
        window.dispatchEvent(new CustomEvent('ss:conv-toggle'));
    };
    const quickMenu = (<DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button id="game-nav-quick-menu-btn" variant="outline" size="icon" className="h-8 w-8">
              <Bot className="h-4 w-4"/>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          AI Menu
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent id="game-nav-quick-menu-content" align="start">
        <DropdownMenuItem id="game-nav-quick-menu-conv" onSelect={() => openConversation()}>
          {t("llmConversation.title")}
        </DropdownMenuItem>
        <DropdownMenuItem id="game-nav-quick-menu-llm-purchase" onSelect={() => window.setTimeout(openTokenPurchase, 0)}>
          {t("llmTokenPurchase.triggerLabel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator id="game-nav-quick-menu-separator-1" />
        <DropdownMenuItem id="game-nav-quick-menu-sysprompts" onSelect={() => window.location.assign(`/games/${gameId}/sysprompts`)}>
          {t("game.navSysPrompts")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>);
    if (expanded) {
        const half = Math.ceil(items.length / 2);
        const row1 = items.slice(0, half);
        const row2 = items.slice(half);
        const renderBtn = ({ section, href, icon, label }: NavItem) => {
            const isActive = active === section;
            return (<Button id={`game-nav-${section}-btn`} key={section} asChild variant={isActive ? "default" : "outline"} size="sm" className="flex items-center gap-1.5">
          <Link href={href}>{icon}{label}</Link>
        </Button>);
        };
        return (<TooltipProvider delayDuration={300}>
        <div id={id ?? "game-nav-buttons"} className="flex flex-col gap-1.5">
          <div className="flex gap-1.5 flex-wrap items-center">
            {row1.map(renderBtn)}
          </div>
          <div className="flex gap-1.5 items-start">
            <div className="flex gap-1.5 flex-wrap items-center">
              {row2.map(renderBtn)}
            </div>
            <div className="flex gap-1.5 items-start">
              {quickMenu}
              {toggleBtn}
            </div>
          </div>
        </div>
      </TooltipProvider>);
    }
    return (<TooltipProvider delayDuration={300}>
      <div id={id ?? "game-nav-buttons"} className="flex gap-1.5 items-start">
        <div className="flex gap-1.5 flex-wrap items-center flex-1">
        {items.map(({ section, href, icon, label }) => {
            const isActive = active === section;
            if (isActive) {
                return (<Button id={`game-nav-${section}-btn`} key={section} asChild variant="default" size="sm" className="flex items-center gap-1.5">
                <Link href={href}>
                  {icon}
                  {label}
                </Link>
              </Button>);
            }
            return (<Tooltip key={section}>
              <TooltipTrigger asChild>
                <Button id={`game-nav-${section}-btn`} asChild variant="outline" size="icon" className="h-8 w-8">
                  <Link href={href}>{icon}</Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{label}</TooltipContent>
            </Tooltip>);
        })}
        </div>
        <div className="flex gap-1.5 items-start">
          {quickMenu}
          {toggleBtn}
        </div>
      </div>
      <LLMTokenPurchaseDialog gameId={gameId} open={purchaseOpen} onOpenChange={setPurchaseOpen}/>
    </TooltipProvider>);
}
