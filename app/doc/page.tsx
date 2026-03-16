"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  BookOpen,
  LayoutDashboard,
  Brush,
  Gamepad2,
  Users,
  Server,
  Puzzle,
  ShoppingBag,
  Package,
  Gift,
  Wallet,
  Cog,
  Shield,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Info,
  Zap,
  Star,
  Activity,
  Hash,
  Terminal,
  UserCircle,
  KeyRound,
  Layers,
  Swords,
  BarChart2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Section {
  id: string
  label: string
  icon: React.ReactNode
  sub?: { id: string; label: string }[]
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: <BookOpen className="h-4 w-4" /> },
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    id: "studios",
    label: "Studios",
    icon: <Brush className="h-4 w-4" />,
    sub: [
      { id: "studios-create", label: "Create a Studio" },
      { id: "studios-activate", label: "Studio Activation" },
      { id: "studios-rename", label: "Rename Studio" },
    ],
  },
  {
    id: "games",
    label: "Games",
    icon: <Gamepad2 className="h-4 w-4" />,
    sub: [
      { id: "games-create", label: "Create a Game" },
      { id: "games-servers", label: "Servers" },
      { id: "games-teams", label: "Teams" },
      { id: "games-users", label: "Game Users" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Gacha",
    icon: <Package className="h-4 w-4" />,
    sub: [
      { id: "inventory-items", label: "Item Definitions" },
      { id: "inventory-gacha", label: "Gacha / Loot Boxes" },
    ],
  },
  {
    id: "shops",
    label: "Shops",
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    id: "plugins",
    label: "Plugin System",
    icon: <Puzzle className="h-4 w-4" />,
    sub: [
      { id: "plugins-catalog", label: "Standard Plugins" },
      { id: "plugins-subscribe", label: "Subscribing" },
      { id: "plugins-limits", label: "Effective Limits" },
    ],
  },
  { id: "profiles", label: "User Profiles", icon: <UserCircle className="h-4 w-4" /> },
  { id: "payment", label: "Payment & Coins", icon: <Wallet className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Cog className="h-4 w-4" /> },
  {
    id: "admin",
    label: "Admin Tools",
    icon: <Shield className="h-4 w-4" />,
    sub: [
      { id: "admin-users", label: "All Users" },
      { id: "admin-studios", label: "All Studios" },
      { id: "admin-games", label: "All Games" },
      { id: "admin-giftcodes", label: "Gift Codes" },
      { id: "admin-plugins", label: "Custom Plugins" },
    ],
  },
  { id: "auth", label: "Authentication", icon: <KeyRound className="h-4 w-4" /> },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Heading1({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h1 id={id} className="text-2xl font-bold mt-8 mb-3 scroll-mt-20 flex items-center gap-2 group">
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 transition-opacity">
        <Hash className="h-5 w-5" />
      </a>
      {children}
    </h1>
  )
}

function Heading2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-semibold mt-6 mb-2 scroll-mt-20 flex items-center gap-2 group">
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 transition-opacity">
        <Hash className="h-4 w-4" />
      </a>
      {children}
    </h2>
  )
}

function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "success" | "tip"
  children: React.ReactNode
}) {
  const styles = {
    info: "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300",
    warning: "border-yellow-500/40 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300",
    success: "border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-300",
    tip: "border-purple-500/40 bg-purple-500/5 text-purple-700 dark:text-purple-300",
  }
  const icons = {
    info: <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />,
    warning: <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />,
    tip: <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />,
  }
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4 text-sm my-4", styles[type])}>
      {icons[type]}
      <div>{children}</div>
    </div>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 my-4">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {i + 1}
          </span>
          <span className="pt-0.5 text-muted-foreground">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function PropTable({ rows }: { rows: { field: string; type: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Field</th>
            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Type</th>
            <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-xs text-primary">{r.field}</td>
              <td className="px-4 py-2">
                <Badge variant="outline" className="text-xs font-mono">{r.type}</Badge>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocPage() {
  const [activeId, setActiveId] = useState("overview")
  const contentRef = useRef<HTMLDivElement>(null)

  // Intersection observer to highlight active section
  useEffect(() => {
    const allIds: string[] = []
    SECTIONS.forEach((s) => {
      allIds.push(s.id)
      s.sub?.forEach((sub) => allIds.push(sub.id))
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: "-20% 0px -70% 0px" }
    )

    allIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex gap-0 min-h-screen">
      {/* Sidebar TOC */}
      <aside className="hidden xl:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r bg-muted/20 py-6">
        <div className="px-5 mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-bold text-base">Documentation</span>
        </div>
        <nav className="px-3 space-y-0.5">
          {SECTIONS.map((section) => (
            <div key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={() => setActiveId(section.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  activeId === section.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {section.icon}
                {section.label}
              </a>
              {section.sub?.map((sub) => (
                <a
                  key={sub.id}
                  href={`#${sub.id}`}
                  onClick={() => setActiveId(sub.id)}
                  className={cn(
                    "flex items-center gap-2 pl-9 pr-3 py-1 rounded-md text-xs transition-colors",
                    activeId === sub.id
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                  {sub.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main ref={contentRef} className="flex-1 max-w-4xl mx-auto px-6 pb-24 pt-6">
        {/* ─── Overview ─── */}
        <Heading1 id="overview">
          <BookOpen className="h-6 w-6 text-primary" />
          Sai's Admin — Developer Documentation
        </Heading1>

        <p className="text-muted-foreground text-sm leading-relaxed">
          Sai's Admin is a multi-tenant game-server management platform. It lets <strong>studio owners</strong> create
          and configure game servers, manage teams and players, build in-game economies (items, shops, gacha), and scale
          capacity through the plugin system. Super-admins can manage all resources platform-wide.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[
            { icon: <Brush className="h-5 w-5 text-purple-500" />, title: "Studios", desc: "Organisational unit that owns games." },
            { icon: <Gamepad2 className="h-5 w-5 text-blue-500" />, title: "Games", desc: "Individual game projects inside a studio." },
            { icon: <Puzzle className="h-5 w-5 text-green-500" />, title: "Plugins", desc: "Scalable capacity packs (CCU, items, shops…)." },
            { icon: <Package className="h-5 w-5 text-orange-500" />, title: "Inventory", desc: "Item definitions and gacha loot boxes." },
            { icon: <ShoppingBag className="h-5 w-5 text-pink-500" />, title: "Shops", desc: "In-game currency stores." },
            { icon: <Wallet className="h-5 w-5 text-yellow-500" />, title: "Coins", desc: "Platform currency used to pay for plugins." },
          ].map((c) => (
            <Card key={c.title} className="bg-card hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  {c.icon} {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{c.desc}</CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-8" />

        {/* ─── Dashboard ─── */}
        <Heading1 id="dashboard">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          Dashboard
        </Heading1>

        <p className="text-sm text-muted-foreground">
          The home page (<code className="text-xs bg-muted px-1 py-0.5 rounded">/</code>) gives a bird's-eye view of all
          your studios and their games. Each studio card is expandable and shows real-time stats pulled from the API.
        </p>

        <PropTable
          rows={[
            { field: "Studios", type: "list", desc: "All studios owned by or shared with the current user." },
            { field: "Games per studio", type: "list", desc: "Click a studio card to expand its game list." },
            { field: "Usage bars", type: "visual", desc: "CCU / item / shop usage relative to plugin limits. Turns red at ≥ 90%." },
            { field: "Greeting", type: "info", desc: "Time-of-day aware greeting (morning / afternoon / evening / night)." },
          ]}
        />

        <Callout type="tip">
          Data refreshes automatically. Hit the <strong>Refresh</strong> icon on any card to force a reload.
        </Callout>

        <Separator className="my-8" />

        {/* ─── Studios ─── */}
        <Heading1 id="studios">
          <Brush className="h-6 w-6 text-primary" />
          Studios
        </Heading1>

        <p className="text-sm text-muted-foreground">
          A <strong>Studio</strong> is the top-level organisational unit. Every game belongs to exactly one studio.
          Navigate to <Link href="/studios" className="text-primary underline underline-offset-2">/studios</Link> to
          manage your studios.
        </p>

        <Heading2 id="studios-create">Create a Studio</Heading2>
        <StepList
          steps={[
            'Go to Studios from the sidebar.',
            'Click "New Studio" in the top-right corner.',
            'Enter a unique studio name and confirm.',
            'The studio is created and you are automatically assigned as the owner.',
          ]}
        />

        <Heading2 id="studios-activate">Studio Activation</Heading2>
        <Callout type="warning">
          Before a studio can subscribe to paid plugins it must be <strong>activated</strong>. This is a one-time
          operation that costs <strong>1 coin</strong> from the studio owner's wallet.
        </Callout>
        <p className="text-sm text-muted-foreground">
          Activation sets <code className="text-xs bg-muted px-1 py-0.5 rounded">studio.activated_at</code> to a
          timestamp. The UI will prompt you to activate when you try to subscribe to any non-free plugin.
        </p>

        <Heading2 id="studios-rename">Rename Studio</Heading2>
        <p className="text-sm text-muted-foreground">
          Click the editable studio name on the studio detail page. Changes are debounced and saved automatically via{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">PATCH /api/v1/studios/:id</code>.
        </p>

        <Separator className="my-8" />

        {/* ─── Games ─── */}
        <Heading1 id="games">
          <Gamepad2 className="h-6 w-6 text-primary" />
          Games
        </Heading1>

        <p className="text-sm text-muted-foreground">
          Games live inside studios. Navigate to{" "}
          <Link href="/games" className="text-primary underline underline-offset-2">/games</Link> to see all games
          you have access to, or drill into a studio to see its games.
        </p>

        <PropTable
          rows={[
            { field: "name", type: "string", desc: "Human-readable display name." },
            { field: "description", type: "string", desc: "Brief description of the game." },
            { field: "game_type", type: "enum", desc: "idle | action | puzzle | rpg | … — affects some defaults." },
            { field: "status", type: "enum", desc: "development | alpha | beta | released | archived." },
            { field: "is_active", type: "boolean", desc: "Whether the game is accepting API calls from clients." },
            { field: "config.max_players", type: "number", desc: "Soft cap on concurrent users (CCU). Enforced by plugin limits." },
            { field: "config.server_region", type: "string", desc: "Preferred region for new servers (e.g. us-west, ap-southeast)." },
          ]}
        />

        <Heading2 id="games-create">Create a Game</Heading2>
        <StepList
          steps={[
            'Open a studio or go to Games → New Game.',
            'Fill in name, description, and game type.',
            'Choose the initial player capacity via config.max_players.',
            'Click Create. The Common plugin is auto-granted (10 CCU, 1 shop, 1,000 profiles).',
            'You can now configure Servers, Items, Shops, etc. from the game detail page.',
          ]}
        />

        <Heading2 id="games-servers">Servers</Heading2>
        <p className="text-sm text-muted-foreground">
          Each game can have multiple servers (instances). Servers appear under{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">/servers/:id</code> or the Servers tab inside a game.
        </p>
        <PropTable
          rows={[
            { field: "name", type: "string", desc: "Server label shown to players." },
            { field: "status", type: "enum", desc: "online | offline | starting | stopping | maintenance." },
            { field: "players_online", type: "number", desc: "Current CCU on this server." },
            { field: "region", type: "string", desc: "Physical region of the server." },
          ]}
        />

        <Heading2 id="games-teams">Teams</Heading2>
        <p className="text-sm text-muted-foreground">
          Teams group players inside a game. You can add or remove members, edit member roles, and link teams to
          multiple games.
        </p>
        <StepList
          steps={[
            'Open a game → Teams tab.',
            'Click "Create Team" and enter a name.',
            'Add members via Add Member — search by username.',
            'Change a member\'s role with Edit Role (owner / admin / member).',
            'Link / unlink a team to other games using "Add Team to Game".',
          ]}
        />

        <Heading2 id="games-users">Game Users</Heading2>
        <p className="text-sm text-muted-foreground">
          The Users tab inside a game lists every registered player. Admins can set per-user limits, ban/unban, and
          inspect individual item inventories.
        </p>

        <Separator className="my-8" />

        {/* ─── Inventory & Gacha ─── */}
        <Heading1 id="inventory">
          <Package className="h-6 w-6 text-primary" />
          Inventory &amp; Gacha
        </Heading1>

        <Callout type="info">
          All inventory routes are game-scoped:{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/v1/games/:gameId/…</code>. The server resolves
          the studio automatically.
        </Callout>

        <Heading2 id="inventory-items">Item Definitions</Heading2>
        <p className="text-sm text-muted-foreground">
          Item definitions are the catalogue of collectible objects in your game. Players can hold instances of these
          items in their inventory.
        </p>
        <PropTable
          rows={[
            { field: "name", type: "string", desc: "Display name." },
            { field: "code_name", type: "string", desc: "Unique slug used by game clients." },
            { field: "category", type: "enum", desc: "weapon | armor | consumable | collectible | currency | …" },
            { field: "rarity", type: "enum", desc: "common | uncommon | rare | epic | legendary." },
            { field: "metadata", type: "object", desc: "Free-form JSON for game-specific attributes." },
            { field: "max_stack", type: "number", desc: "How many of this item a player can hold (0 = unlimited)." },
            { field: "is_tradeable", type: "boolean", desc: "Whether players can transfer this item." },
          ]}
        />

        <Heading2 id="inventory-gacha">Gacha / Loot Boxes</Heading2>
        <p className="text-sm text-muted-foreground">
          Gacha packs let players draw random items. Each pack has a pool with weighted entries.
        </p>
        <StepList
          steps={[
            'Go to game → Gacha tab.',
            'Create a pack: name, cost, currency, max rolls.',
            'Add pool entries: select an item definition and assign a weight (higher = more likely).',
            'Players can pull the pack in-game via the Gacha API.',
            'Review pull history in the Transactions log.',
          ]}
        />
        <Callout type="warning">
          The number of gacha packs you can create is capped by your active plugin limits (
          <code className="text-xs bg-muted px-1 py-0.5 rounded">gacha_grant</code>).
        </Callout>

        <Separator className="my-8" />

        {/* ─── Shops ─── */}
        <Heading1 id="shops">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Shops
        </Heading1>

        <p className="text-sm text-muted-foreground">
          Shops are virtual storefronts inside a game where players can purchase items using in-game currency. Each
          shop is linked to a currency and contains listing entries.
        </p>

        <PropTable
          rows={[
            { field: "name", type: "string", desc: "Display name shown to players." },
            { field: "code_name", type: "string", desc: "Unique slug for API references." },
            { field: "currency_id", type: "uuid", desc: "The currency item players pay with." },
            { field: "description", type: "string", desc: "Optional flavour text." },
          ]}
        />

        <StepList
          steps={[
            'Go to game → Shops tab.',
            'Click "New Shop", fill in name and select a currency.',
            'Add listings: each listing links an item with a price.',
            'The shop is immediately available via the Game API for clients.',
          ]}
        />

        <Callout type="tip">
          You can create up to <strong>N shops</strong> where N is determined by your plugin's{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">shops_grant</code> × stack count.
        </Callout>

        <Separator className="my-8" />

        {/* ─── Plugin System ─── */}
        <Heading1 id="plugins">
          <Puzzle className="h-6 w-6 text-primary" />
          Plugin System
        </Heading1>

        <p className="text-sm text-muted-foreground">
          Plugins are capacity packs that define how many concurrent users (CCU), item definitions, shops, and gacha
          packs your game can have. The Common plugin is auto-granted on game creation. Additional plugins are
          purchased with coins.
        </p>

        <Heading2 id="plugins-catalog">Standard Plugin Catalog</Heading2>

        <div className="overflow-x-auto my-4 rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Plugin", "CCU", "Profiles", "Items", "Shops", "Gacha", "Cost / Stack", "Max Stacks"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Common", badge: "bg-gray-400", ccu: 10, profiles: "1K", items: 100, shops: 1, gacha: "—", cost: "Free", max: "Auto" },
                { name: "Uncommon", badge: "bg-green-500", ccu: 50, profiles: "5K", items: 500, shops: 5, gacha: 5, cost: "50 🪙", max: 3 },
                { name: "Rare", badge: "bg-blue-500", ccu: 200, profiles: "20K", items: "2K", shops: 10, gacha: 10, cost: "150 🪙", max: 3 },
                { name: "Epic", badge: "bg-purple-500", ccu: "1K", profiles: "100K", items: "10K", shops: 25, gacha: 25, cost: "400 🪙", max: 2 },
                { name: "Legendary", badge: "bg-yellow-500", ccu: "5K", profiles: "500K", items: "50K", shops: 50, gacha: 50, cost: "1,000 🪙", max: 1 },
              ].map((row) => (
                <tr key={row.name} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${row.badge}`} />
                    {row.name}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.ccu}</td>
                  <td className="px-3 py-2 tabular-nums">{row.profiles}</td>
                  <td className="px-3 py-2 tabular-nums">{row.items}</td>
                  <td className="px-3 py-2 tabular-nums">{row.shops}</td>
                  <td className="px-3 py-2 tabular-nums">{row.gacha}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.cost}</td>
                  <td className="px-3 py-2 text-center">{row.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Heading2 id="plugins-subscribe">Subscribing to a Plugin</Heading2>
        <StepList
          steps={[
            'Ensure your studio is activated (costs 1 coin, one-time).',
            'Go to game → Plugins tab.',
            'Browse the catalog and pick a plugin tier.',
            'Choose how many stacks to purchase (multiply the grants proportionally).',
            'Confirm — coins are deducted from your wallet immediately.',
            'The new effective limits apply within seconds.',
          ]}
        />

        <Heading2 id="plugins-limits">Effective Limits</Heading2>
        <p className="text-sm text-muted-foreground">
          Effective limits are the <strong>sum</strong> of all active plugin grants multiplied by their stack counts:
        </p>
        <div className="rounded-lg bg-muted/40 border p-4 my-4 font-mono text-xs">
          effective_CCU = Σ (plugin.ccu_grant × subscription.stack_count)
          <br />
          effective_items = Σ (plugin.items_grant × subscription.stack_count)
          <br />
          effective_shops = Σ (plugin.shops_grant × subscription.stack_count)
        </div>
        <Callout type="info">
          Example: <strong>Rare × 2</strong> + <strong>Epic × 1</strong> = 200×2 + 1,000×1 ={" "}
          <strong>1,400 CCU</strong>. Dashboard usage bars reflect these live limits.
        </Callout>

        <Separator className="my-8" />

        {/* ─── User Profiles ─── */}
        <Heading1 id="profiles">
          <UserCircle className="h-6 w-6 text-primary" />
          User Profiles
        </Heading1>

        <p className="text-sm text-muted-foreground">
          Each platform user can have multiple in-game profiles (
          <code className="text-xs bg-muted px-1 py-0.5 rounded">developer</code> /
          <code className="text-xs bg-muted px-1 py-0.5 rounded">player</code>). Profiles drive per-user inventory,
          stats, and in-game identity.
        </p>

        <PropTable
          rows={[
            { field: "display_name", type: "string", desc: "Player name shown in-game." },
            { field: "avatar_url", type: "string", desc: "URL to profile picture." },
            { field: "role", type: "enum", desc: "developer | player — determines default capabilities." },
            { field: "game_id", type: "uuid", desc: "The game this profile belongs to." },
            { field: "metadata", type: "object", desc: "Custom attributes (level, rank, etc.)." },
          ]}
        />

        <Callout type="tip">
          The number of profiles per game is capped by{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">effective_limits.max_profiles</code>. Upgrade your
          plugin to increase it.
        </Callout>

        <Separator className="my-8" />

        {/* ─── Payment ─── */}
        <Heading1 id="payment">
          <Wallet className="h-6 w-6 text-primary" />
          Payment &amp; Coins
        </Heading1>

        <p className="text-sm text-muted-foreground">
          Coins are the platform currency used to pay for plugin subscriptions and studio activation. Purchase coins
          at <Link href="/payment" className="text-primary underline underline-offset-2">/payment</Link>.
        </p>

        <PropTable
          rows={[
            { field: "balance", type: "number", desc: "Current coin balance shown in the top-right corner." },
            { field: "transaction_type", type: "enum", desc: "purchase | refund | subscription | admin_grant." },
            { field: "amount", type: "number", desc: "Positive = credit, negative = debit." },
          ]}
        />

        <Callout type="info">
          Plugin subscriptions auto-renew monthly. If your balance is insufficient at renewal, the subscription is
          cancelled and limits revert to the remaining active plugins.
        </Callout>

        <Separator className="my-8" />

        {/* ─── Settings ─── */}
        <Heading1 id="settings">
          <Cog className="h-6 w-6 text-primary" />
          Settings
        </Heading1>

        <p className="text-sm text-muted-foreground">
          Global preferences available at{" "}
          <Link href="/profile?tab=settings" className="text-primary underline underline-offset-2">/profile?tab=settings</Link>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          {[
            {
              title: "Interface Language",
              desc: "Switch the UI language. Supported: English, Vietnamese, and more. Persisted per browser.",
              icon: <Layers className="h-4 w-4 text-blue-500" />,
            },
            {
              title: "Theme",
              desc: "Light, Dark, Dark-Blue, Dark-Purple, Dark-Green, Midnight, and auto-system. Toggle quickly from the sidebar.",
              icon: <Star className="h-4 w-4 text-yellow-500" />,
            },
            {
              title: "Item Types",
              desc: "Manage global item type definitions used when creating item catalogues across games.",
              icon: <Package className="h-4 w-4 text-orange-500" />,
            },
            {
              title: "Timezone",
              desc: "Your personal timezone is auto-detected and saved. Timestamps across the platform respect this setting.",
              icon: <Activity className="h-4 w-4 text-green-500" />,
            },
          ].map((s) => (
            <Card key={s.title} className="bg-card">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  {s.icon} {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{s.desc}</CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-8" />

        {/* ─── Admin Tools ─── */}
        <Heading1 id="admin">
          <Shield className="h-6 w-6 text-primary" />
          Admin Tools
          <Badge variant="destructive" className="ml-2 text-xs">Super Admin</Badge>
        </Heading1>

        <Callout type="warning">
          The sections below are only visible to users with the{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">is_super_admin</code> capability flag. They are
          hidden from the sidebar and inaccessible for regular users.
        </Callout>

        <Heading2 id="admin-users">All Users — <code className="text-xs font-mono">/admin/users</code></Heading2>
        <p className="text-sm text-muted-foreground">
          Browse and search every user registered on the platform. From here you can:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 my-2 ml-2">
          <li>View profile details and coin balances.</li>
          <li>Adjust per-user limits (override plugin caps for a specific user).</li>
          <li>Grant or revoke admin privileges.</li>
        </ul>

        <Heading2 id="admin-studios">All Studios — <code className="text-xs font-mono">/admin/studios</code></Heading2>
        <p className="text-sm text-muted-foreground">
          Inspect all studios platform-wide. Override studio limits independently of plugin subscriptions.
        </p>

        <Heading2 id="admin-games">All Games — <code className="text-xs font-mono">/admin/games</code></Heading2>
        <p className="text-sm text-muted-foreground">
          Complete list of every game. Apply custom per-game limit overrides.
        </p>

        <Heading2 id="admin-giftcodes">Gift Codes — <code className="text-xs font-mono">/admin/payments</code></Heading2>
        <p className="text-sm text-muted-foreground">
          Create and manage gift / promo codes that grant coins or plugin access when redeemed.
        </p>
        <PropTable
          rows={[
            { field: "code", type: "string", desc: "The redeemable string." },
            { field: "coins_value", type: "number", desc: "Coins awarded on redemption." },
            { field: "max_uses", type: "number", desc: "0 = unlimited." },
            { field: "expires_at", type: "timestamp", desc: "Optional expiry date." },
          ]}
        />

        <Heading2 id="admin-plugins">Custom Plugins — <code className="text-xs font-mono">/admin/plugins</code></Heading2>
        <p className="text-sm text-muted-foreground">
          Create bespoke plugin bundles with arbitrary grants and assign them directly to specific games for free.
          Useful for enterprise deals or promotional tie-ins.
        </p>

        <Separator className="my-8" />

        {/* ─── Authentication ─── */}
        <Heading1 id="auth">
          <KeyRound className="h-6 w-6 text-primary" />
          Authentication
        </Heading1>

        <p className="text-sm text-muted-foreground">
          All API calls use <strong>JWT Bearer tokens</strong> obtained at{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">POST /api/v1/auth/login</code>. The token is stored
          in <code className="text-xs bg-muted px-1 py-0.5 rounded">localStorage</code> and attached automatically by
          the API client.
        </p>

        <PropTable
          rows={[
            { field: "token", type: "JWT", desc: "Short-lived access token. Auto-refreshed before expiry." },
            { field: "refresh_token", type: "JWT", desc: "Used to obtain a new access token without re-logging in." },
            { field: "expires_in", type: "number", desc: "Seconds until the access token expires." },
          ]}
        />

        <Callout type="info">
          A <strong>token expiration warning banner</strong> appears in the UI 5 minutes before the session expires,
          giving you the option to extend it without losing your work.
        </Callout>

        <StepList
          steps={[
            'Register at /register or log in at /login.',
            'On success the JWT is stored and all subsequent API calls are authenticated.',
            'The AuthContext (contexts/auth-context.tsx) exposes user info and logout() to all pages.',
            'Super-admin capabilities are checked via the /api/v1/auth/me endpoint on every page load.',
          ]}
        />

        {/* Footer */}
        <Separator className="my-10" />
        <p className="text-xs text-muted-foreground text-center pb-4">
          Sai's Admin — Internal Documentation · Built with Next.js, Tailwind CSS, and shadcn/ui
        </p>
      </main>
    </div>
  )
}
