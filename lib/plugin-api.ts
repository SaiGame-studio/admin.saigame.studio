import { api, apiRequest } from "@/lib/api-client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Plugin {
  id: string
  plugin_type: "standard" | "custom"
  display_name: string
  description: string
  is_active: boolean
  ccu_grant: number
  profiles_grant: number
  items_grant: number
  shops_grant: number
  cost_coins: number
  max_stacks: number
  sort_order: number
  duration_days?: number | null
  is_template?: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface GamePluginSubscription {
  id: string
  game_id: string
  plugin_id: string
  activated_by: string
  stack_count: number
  coins_per_month: number
  activated_at: string
  expires_at?: string | null
  renewed_at: string
  is_revoked: boolean
  revoked_at?: string | null
  revoked_by?: string | null
  cancelled_at?: string | null
  note: string
}

export interface EffectiveLimits {
  max_concurrent_users: number
  max_profiles: number
  max_items: number
  max_shops: number
}

export interface GamePluginsResult {
  subscriptions: Array<{
    subscription: GamePluginSubscription
    plugin: Plugin
    is_cancelled: boolean
  }>
  effective_limits: EffectiveLimits
  pending_limits?: EffectiveLimits | null
}

// ---------------------------------------------------------------------------
// Public catalog (no auth required)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/plugins
 * Returns all active subscribable standard plugins.
 */
export async function getPluginCatalog(): Promise<Plugin[]> {
  const data = await apiRequest("/api/v1/plugins", { requireAuth: false })
  return data?.plugins ?? []
}

// ---------------------------------------------------------------------------
// Studio activation
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/studios/{studioId}/activate
 * Charges 1 coin from owner wallet. Returns updated studio.
 */
export async function activateStudio(studioId: string): Promise<any> {
  return await api.post(`/api/v1/studios/${studioId}/activate`)
}

// ---------------------------------------------------------------------------
// Game plugin subscriptions
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/games/{gameId}/plugins
 * Returns active subscriptions and effective limits.
 */
export async function getGamePlugins(gameId: string): Promise<GamePluginsResult> {
  return await api.get(`/api/v1/games/${gameId}/plugins`)
}

/**
 * DELETE /api/v1/games/{gameId}/plugins/{pluginId}
 * Unsubscribe / remove a plugin stack from the game.
 */
export async function unsubscribeFromPlugin(
  gameId: string,
  pluginId: string
): Promise<void> {
  return await api.delete(`/api/v1/games/${gameId}/plugins/${pluginId}`)
}

/**
 * POST /api/v1/games/{gameId}/plugins
 * Subscribe to a standard plugin. Deducts cost from owner wallet.
 */
export async function subscribeToPlugin(
  gameId: string,
  pluginId: string,
  stacks: number = 1
): Promise<GamePluginSubscription> {
  return await api.post(`/api/v1/games/${gameId}/plugins`, {
    plugin_id: pluginId,
    stacks,
  })
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Returns the remaining purchasable stacks for a plugin given current subscriptions.
 */
export function getRemainingStacks(
  plugin: Plugin,
  subscriptions: GamePluginsResult["subscriptions"]
): number {
  const totalStacks = subscriptions
    .filter((s) => s.plugin.id === plugin.id)
    .reduce((sum, s) => sum + (s.subscription.stack_count ?? 0), 0)
  return plugin.max_stacks - totalStacks
}

/**
 * Computes total subscription cost.
 */
export function getSubscriptionCost(plugin: Plugin, stacks: number): number {
  return plugin.cost_coins * stacks
}

/**
 * Tier color class by plugin id.
 */
export function getPluginTierColor(pluginId: string): string {
  switch (pluginId) {
    case "common":
      return "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30"
    case "uncommon":
      return "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
    case "rare":
      return "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
    case "epic":
      return "border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30"
    case "legendary":
      return "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
    default:
      return "border-pink-300 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/30"
  }
}

export function getPluginBadgeColor(pluginId: string): string {
  switch (pluginId) {
    case "common":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    case "uncommon":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    case "rare":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    case "epic":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
    case "legendary":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
    default:
      return "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300"
  }
}
