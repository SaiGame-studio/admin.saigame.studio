import { api } from "@/lib/api-client"

export interface AdminUser {
  id: string
  email: string
  username: string
  display_name: string
  is_active: boolean
  is_verified: boolean
  last_login_at: string
  created_at: number
  updated_at: number
}

export interface AdminUsersResult {
  page: number
  page_size: number
  total_count: number
  users: AdminUser[]
}

/**
 * Get all users (super admin only)
 */
export async function getAllUsersAdmin(params?: {
  email?: string
  username?: string
  display_name?: string
}): Promise<AdminUsersResult> {
  const searchParams = new URLSearchParams({ 
    page: "1",
    page_size: "100" 
  })
  
  if (params?.email) searchParams.set("email", params.email)
  if (params?.username) searchParams.set("username", params.username)
  if (params?.display_name) searchParams.set("display_name", params.display_name)
  
  const data = await api.get(`/api/v1/admin/users?${searchParams.toString()}`)
  return data
}

export interface AdminStudio {
  id: string
  name: string
  description: string
  owner_id: string
  game_count: number
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface AdminStudiosResult {
  count: number
  studios: AdminStudio[]
}

/**
 * Get all studios (super admin only)
 */
export async function getAllStudiosAdmin(params?: {
  name?: string
  sort_by?: string
  sort_order?: string
}): Promise<AdminStudiosResult> {
  const searchParams = new URLSearchParams({
    sort_by: params?.sort_by || "created_at",
    sort_order: params?.sort_order || "desc"
  })
  
  if (params?.name) searchParams.set("name", params.name)
  
  const data = await api.get(`/api/v1/admin/studios?${searchParams.toString()}`)
  return data
}

export interface AdminGame {
  id: string
  name: string
  description: string
  studio_id: string
  studio_name?: string
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface AdminGamesResult {
  count: number
  games: AdminGame[]
}

/**
 * Get all games (super admin only)
 */
export async function getAllGamesAdmin(params?: {
  name?: string
  studio_id?: string
  sort_by?: string
  sort_order?: string
}): Promise<AdminGamesResult> {
  const searchParams = new URLSearchParams({
    sort_by: params?.sort_by || "created_at",
    sort_order: params?.sort_order || "desc",
    page: "1",
    page_size: "200",
  })

  if (params?.name) searchParams.set("name", params.name)
  if (params?.studio_id) searchParams.set("studio_id", params.studio_id)

  const data = await api.get(`/api/v1/admin/games?${searchParams.toString()}`)
  return data
}

export interface UserLimits {
  max_studios?: number | null
}

export interface UserLimitsDetail {
  limits: UserLimits
  usage: {
    studios?: number | null
  }
}

/**
 * Get user limits & usage (super admin only)
 */
export async function getUserLimits(userId: string): Promise<UserLimitsDetail> {
  return await api.get(`/api/v1/admin/users/${userId}/limits`)
}

/**
 * Update user limits (super admin only)
 */
export async function updateUserLimits(
  userId: string,
  limits: UserLimits
): Promise<any> {
  return await api.put(`/api/v1/admin/users/${userId}/limits`, { limits })
}

export interface StudioLimits {
  max_games?: number | null
  max_total_members?: number | null
}

export interface GameLimits {
  max_player_profiles?: number | null
  max_concurrent_users?: number | null
  max_items?: number | null
  max_gacha_packs?: number | null
  max_shops?: number | null
  max_node_definitions?: number | null
  max_event_types?: number | null
}

export interface StudioLimitsDetail {
  limits: StudioLimits
  usage: {
    game_count?: number | null
  }
}

export interface GameLimitsDetail {
  limits: GameLimits
  usage: {
    player_profile_count?: number | null
    concurrent_users?: number | null
  }
}

/**
 * Get studio limits & usage (super admin only)
 */
export async function getStudioLimits(studioId: string): Promise<StudioLimitsDetail> {
  return await api.get(`/api/v1/admin/studios/${studioId}/limits`)
}

/**
 * Get game limits & usage (super admin only)
 */
export async function getGameLimitsDetail(gameId: string): Promise<GameLimitsDetail> {
  return await api.get(`/api/v1/admin/games/${gameId}/limits`)
}

/**
 * Update studio limits (super admin only)
 */
export async function updateStudioLimits(
  studioId: string,
  limits: StudioLimits
): Promise<any> {
  return await api.put(`/api/v1/admin/studios/${studioId}/limits`, { limits })
}

/**
 * Update game limits (super admin only)
 */
export async function updateGameLimits(
  gameId: string,
  limits: GameLimits
): Promise<any> {
  return await api.put(`/api/v1/admin/games/${gameId}/limits`, { limits })
}

export interface RecalcLimitSet {
  max_concurrent_users: number
  max_items: number
  max_player_profiles: number
  max_quests: number
  max_shops: number
}

export interface RecalcSubscription {
  subscription_id: string
  plugin_id: string
  display_name: string
  status: string
  contribution: RecalcLimitSet
}

export interface RecalcResult {
  game_id: string
  base: RecalcLimitSet
  subscriptions: RecalcSubscription[]
  overrides: Record<string, unknown>
  totals: RecalcLimitSet
}

/**
 * Recalculate game limits from subscriptions (super admin only)
 */
export async function recalculateGameLimits(gameId: string): Promise<RecalcResult> {
  return await api.post(`/api/v1/admin/games/${gameId}/limits/recalculate`, {})
}
// ---------------------------------------------------------------------------

export interface GiftCode {
  id: string
  code: string
  coins_amount: number
  max_uses: number
  used_count: number
  expires_at: string | null
  active_at: string | null
  description: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface GiftCodesResult {
  gift_codes: GiftCode[]
  total: number
  limit: number
  offset: number
}

export interface GiftCodeRedemption {
  id: string
  gift_code_id: string
  user_id: string
  redeemed_at: string
}

export interface GiftCodeRedemptionsResult {
  gift_code_id: string
  redemptions: GiftCodeRedemption[]
  total: number
  limit: number
  offset: number
}

export interface CreateGiftCodeBody {
  code: string
  coins_amount: number
  max_uses: number
  description: string
  active_at?: string | null
  expires_at?: string | null
}

export interface UpdateGiftCodeBody {
  description?: string
  active_at?: string | null
  expires_at?: string | null
  max_uses?: number
}

export async function listGiftCodes(limit = 20, offset = 0): Promise<GiftCodesResult> {
  return api.get(`/api/v1/admin/gift-codes?limit=${limit}&offset=${offset}`)
}

export async function getGiftCode(id: string): Promise<GiftCode> {
  return api.get(`/api/v1/admin/gift-codes/${id}`)
}

export async function createGiftCode(body: CreateGiftCodeBody): Promise<GiftCode> {
  return api.post(`/api/v1/admin/gift-codes`, body)
}

export async function updateGiftCode(id: string, body: UpdateGiftCodeBody): Promise<GiftCode> {
  return api.put(`/api/v1/admin/gift-codes/${id}`, body)
}

export async function deleteGiftCode(id: string): Promise<void> {
  return api.delete(`/api/v1/admin/gift-codes/${id}`)
}

export async function listGiftCodeRedemptions(
  id: string,
  limit = 20,
  offset = 0
): Promise<GiftCodeRedemptionsResult> {
  return api.get(`/api/v1/admin/gift-codes/${id}/redemptions?limit=${limit}&offset=${offset}`)
}

// ---------------------------------------------------------------------------
// Admin Coin Top-Up
// ---------------------------------------------------------------------------

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  type: string
  status: string
  balance_before: number | null
  balance_after: number | null
  reference_id: string | null
  reference_type: string | null
  description: string
  error_message: string | null
  created_by: string | null
  created_at: string
  processed_at: string | null
}

export async function adminCoinTopUp(body: {
  user_id: string
  amount: number
  description: string
}): Promise<CoinTransaction> {
  return api.post(`/api/v1/admin/coins/topup`, body)
}

// ---------------------------------------------------------------------------
// SuperAdmin — sCoin Packages
// ---------------------------------------------------------------------------

export interface SPackage {
  id: string
  package_key: string
  name: string
  description: string
  scoin_amount: number
  bonus_scoin: number
  price_amount: number
  price_currency: string
  is_active: boolean
  is_featured: boolean
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SPackagesResult {
  packages: SPackage[]
}

export interface CreateSPackageBody {
  package_key: string
  name: string
  description: string
  scoin_amount: number
  bonus_scoin: number
  price_amount: number
  price_currency: string
  is_active: boolean
  is_featured: boolean
  sort_order: number
  metadata: Record<string, unknown>
}

export interface UpdateSPackageBody {
  name?: string
  description?: string
  scoin_amount?: number
  bonus_scoin?: number
  price_amount?: number
  price_currency?: string
  is_active?: boolean
  is_featured?: boolean
  sort_order?: number
  metadata?: Record<string, unknown>
}

export async function listSPackages(): Promise<SPackagesResult> {
  return api.get("/api/v1/superadmin/payment/packages")
}

export async function getSPackage(id: string): Promise<SPackage> {
  return api.get(`/api/v1/superadmin/payment/packages/${id}`)
}

export async function createSPackage(body: CreateSPackageBody): Promise<SPackage> {
  return api.post("/api/v1/superadmin/payment/packages", body)
}

export async function updateSPackage(id: string, body: UpdateSPackageBody): Promise<SPackage> {
  return api.patch(`/api/v1/superadmin/payment/packages/${id}`, body)
}

export async function deleteSPackage(id: string): Promise<void> {
  return api.delete(`/api/v1/superadmin/payment/packages/${id}`)
}

// ---------------------------------------------------------------------------
// SuperAdmin — Payment Methods
// ---------------------------------------------------------------------------

export interface PaymentMethodConfig {
  id: string
  provider_key: string
  display_name: string
  description: string
  icon_url: string
  is_active: boolean
  supports_subscription: boolean
  config: Record<string, unknown>
  webhook_endpoint_suffix: string
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface PaymentMethodsResult {
  methods: PaymentMethodConfig[]
}

export async function listPaymentMethods(): Promise<PaymentMethodsResult> {
  return api.get("/api/v1/superadmin/payment/methods")
}

export async function getPaymentMethod(id: string): Promise<PaymentMethodConfig> {
  return api.get(`/api/v1/superadmin/payment/methods/${id}`)
}

export async function updatePaymentMethod(id: string, body: {
  display_name?: string
  description?: string
  icon_url?: string
  is_active?: boolean
  supports_subscription?: boolean
  config?: Record<string, unknown>
  webhook_endpoint_suffix?: string
  sort_order?: number
}): Promise<PaymentMethodConfig> {
  return api.patch(`/api/v1/superadmin/payment/methods/${id}`, body)
}

import type { Plugin, GamePluginSubscription } from "@/lib/plugin-api"
export type { Plugin, GamePluginSubscription }

export interface CreateCustomPluginBody {
  display_name?: string
  description?: string
  ccu_grant?: number
  profiles_grant?: number
  items_grant?: number
  shops_grant?: number
  node_defs_grant?: number
  event_types_grant?: number
  duration_days?: number | null
  is_template?: boolean
}

export interface UpdateCustomPluginBody {
  display_name?: string
  description?: string
  ccu_grant?: number
  profiles_grant?: number
  items_grant?: number
  shops_grant?: number
  node_defs_grant?: number
  event_types_grant?: number
  duration_days?: number | null
}

export async function createCustomPlugin(body: CreateCustomPluginBody): Promise<Plugin> {
  return api.post(`/api/v1/admin/plugins`, body)
}

export async function listCustomPlugins(): Promise<Plugin[]> {
  const data = await api.get(`/api/v1/admin/plugins`)
  return data?.plugins ?? []
}

export async function getCustomPlugin(pluginId: string): Promise<Plugin> {
  return api.get(`/api/v1/admin/plugins/${pluginId}`)
}

export async function updateCustomPlugin(
  pluginId: string,
  body: UpdateCustomPluginBody
): Promise<Plugin> {
  return api.put(`/api/v1/admin/plugins/${pluginId}`, body)
}

export async function deleteCustomPlugin(pluginId: string): Promise<void> {
  return api.delete(`/api/v1/admin/plugins/${pluginId}`)
}

// ---------------------------------------------------------------------------
// Admin — Grant Management
// ---------------------------------------------------------------------------

export interface AdminGameGrant {
  grant: GamePluginSubscription
  plugin?: Plugin
}

export async function grantPluginToGame(
  gameId: string,
  pluginId: string,
  note?: string
): Promise<GamePluginSubscription> {
  return api.post(`/api/v1/admin/games/${gameId}/plugins`, {
    plugin_id: pluginId,
    note: note ?? "",
  })
}

export async function listGameGrants(gameId: string): Promise<AdminGameGrant[]> {
  const data = await api.get(`/api/v1/admin/games/${gameId}/plugins`)
  return (data?.grants ?? []).map((g: GamePluginSubscription) => ({ grant: g }))
}

export async function revokeGameGrant(gameId: string, grantId: string): Promise<void> {
  return api.delete(`/api/v1/admin/games/${gameId}/plugins/${grantId}`)
}

// ---------------------------------------------------------------------------
// Admin — Worker / System Monitor
// ---------------------------------------------------------------------------

export interface WorkerDetails {
  [key: string]: string
}

export interface WorkerTelegramPreview {
  chat_id: string
  text: string
}

export interface WorkerMeta {
  description?: string
  collects_data?: string[]
  telegram_preview?: WorkerTelegramPreview
}

export interface Worker {
  name: string
  running: boolean
  last_event_at?: string
  details?: WorkerDetails
  meta?: WorkerMeta
}

export interface WorkersStatusResult {
  collected_at: string
  workers: Worker[]
}

export async function getWorkersStatus(): Promise<WorkersStatusResult> {
  return api.get(`/api/v1/admin/workers/status`)
}

// ---------------------------------------------------------------------------
// SuperAdmin — Payment Transactions
// ---------------------------------------------------------------------------

export type AdminTransactionStatus =
  | "completed"
  | "failed"
  | "credit_failed"
  | "processing"
  | "awaiting_payment"
  | "expired"

export interface AdminTransaction {
  id: string
  idempotency_key: string
  user_id: string
  scoin_package_id: string
  payment_method_config_id: string
  provider_key: string
  amount: number
  currency: string
  scoin_amount: number
  status: AdminTransactionStatus
  provider_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AdminTransactionsResult {
  limit: number
  transactions: AdminTransaction[]
}

export async function manuallyCreditTransaction(id: string, reason: string): Promise<void> {
  return api.post(`/api/v1/superadmin/payment/transactions/${encodeURIComponent(id)}/manually-credit`, { reason })
}

export async function listAdminTransactions(params?: {
  limit?: number
  status?: AdminTransactionStatus | ""
  id?: string
}): Promise<AdminTransactionsResult> {
  const query = new URLSearchParams()
  if (params?.limit) query.set("limit", String(params.limit))
  if (params?.status) query.set("status", params.status)
  if (params?.id) query.set("id", params.id)
  const qs = query.toString()
  return api.get(`/api/v1/superadmin/payment/transactions${qs ? `?${qs}` : ""}`)
}