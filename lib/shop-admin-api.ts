/**
 * Shop Admin API — v1 endpoints
 * Docs: docs/shop-admin-ui-guide.md
 *
 * Routes: /api/v1/games/{game_id}/shops/...
 */

import { api } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopType = 'permanent' | 'event'
export type PurchaseLimitType = 'unlimited' | 'player' | 'global'
export type RestockSchedule = 'none' | 'daily' | 'weekly' | 'monthly'

export interface ShopDefinition {
  id: string
  studio_id: string
  game_id: string
  shop_key: string
  name: string
  description: string
  shop_type: ShopType
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  currency_item_def_id?: string | null
  item_limit?: number | null
  item_count?: number
  created_at: string
  updated_at: string
  items?: ShopItem[]
}

export interface ShopItem {
  id: string
  shop_id: string
  item_def_id: string
  display_name: string
  description: string
  price: number
  currency_item_def_id?: string | null
  purchase_limit_type: PurchaseLimitType
  purchase_limit: number
  restock_schedule: RestockSchedule
  stock: number
  sort_order: number
  is_active: boolean
  available_from?: string | null
  available_until?: string | null
  created_at: string
  updated_at: string
  purchased_count?: number
}

export interface CreateShopPayload {
  shop_key: string
  name: string
  description?: string
  shop_type: ShopType
  is_active: boolean
  starts_at?: string
  ends_at?: string
  currency_item_def_id?: string
}

export interface UpdateShopPayload {
  name?: string
  description?: string
  shop_type?: ShopType
  is_active?: boolean
  starts_at?: string | null
  ends_at?: string | null
  currency_item_def_id?: string | null
}

export interface AddShopItemPayload {
  item_def_id: string
  display_name: string
  description?: string
  price: number
  currency_item_def_id?: string
  purchase_limit_type: PurchaseLimitType
  purchase_limit: number
  restock_schedule: RestockSchedule
  stock: number
  sort_order?: number
  is_active: boolean
  available_from?: string
  available_until?: string
}

export interface UpdateShopItemPayload {
  display_name?: string
  description?: string
  price?: number
  currency_item_def_id?: string
  purchase_limit_type?: PurchaseLimitType
  purchase_limit?: number
  restock_schedule?: RestockSchedule
  stock?: number
  sort_order?: number
  is_active?: boolean
  available_from?: string
  available_until?: string
}

export interface ListShopsResponse {
  shops: ShopDefinition[]
  total: number
  limit: number
  offset: number
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** GET /api/v1/games/:gameId/shops */
export async function listShops(
  gameId: string,
  params: { activeOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<ListShopsResponse> {
  const qs = new URLSearchParams({
    active_only: String(params.activeOnly ?? false),
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  })
  return api.get(`/api/v1/games/${gameId}/shops?${qs}`)
}

/** GET /api/v1/games/:gameId/shops/:shopId */
export async function getShop(gameId: string, shopId: string): Promise<ShopDefinition> {
  return api.get(`/api/v1/games/${gameId}/shops/${shopId}`)
}

/** POST /api/v1/games/:gameId/shops */
export async function createShopV1(
  gameId: string,
  payload: CreateShopPayload,
): Promise<ShopDefinition> {
  return api.post(`/api/v1/games/${gameId}/shops`, payload)
}

/** PATCH /api/v1/games/:gameId/shops/:shopId */
export async function updateShop(
  gameId: string,
  shopId: string,
  payload: UpdateShopPayload,
): Promise<ShopDefinition> {
  return api.patch(`/api/v1/games/${gameId}/shops/${shopId}`, payload)
}

export interface ListShopItemsResponse {
  items: ShopItem[]
  total: number
  limit: number
  offset: number
}

/** GET /api/v1/games/:gameId/shops/:shopId/items */
export async function listShopItems(
  gameId: string,
  shopId: string,
  params: { limit?: number; offset?: number } = {},
): Promise<ListShopItemsResponse> {
  const qs = new URLSearchParams({
    limit: String(params.limit ?? 200),
    offset: String(params.offset ?? 0),
  })
  return api.get(`/api/v1/games/${gameId}/shops/${shopId}/items?${qs}`)
}

/** POST /api/v1/games/:gameId/shops/:shopId/items */
export async function addShopItem(
  gameId: string,
  shopId: string,
  payload: AddShopItemPayload,
): Promise<ShopItem> {
  return api.post(`/api/v1/games/${gameId}/shops/${shopId}/items`, payload)
}

/** PATCH /api/v1/games/:gameId/shops/:shopId/items/:itemId */
export async function updateShopItem(
  gameId: string,
  shopId: string,
  itemId: string,
  payload: UpdateShopItemPayload,
): Promise<ShopItem> {
  return api.patch(`/api/v1/games/${gameId}/shops/${shopId}/items/${itemId}`, payload)
}

/** DELETE /api/v1/games/:gameId/shops/:shopId/items/:itemId */
export async function deleteShopItem(
  gameId: string,
  shopId: string,
  itemId: string,
): Promise<{ message: string }> {
  return api.delete(`/api/v1/games/${gameId}/shops/${shopId}/items/${itemId}`)
}
