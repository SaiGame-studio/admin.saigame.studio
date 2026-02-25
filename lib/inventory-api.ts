/**
 * Inventory & Gacha API — Studio Owner management functions
 * Docs: INVENTORY_GACHA_FRONTEND_GUIDE.md
 *
 * Routes are game-scoped: /api/v1/games/{game_id}/...
 * The server resolves studio_id automatically from the game record.
 * X-Studio-ID and X-Game-ID headers are NOT used.
 */

import { api } from '@/lib/api-client'
import type {
  ItemDefinition,
  CreateItemRequest,
  GachaPack,
  GachaPackResult,
  InventoryTransaction,
  Paginated,
  ItemCategory,
  ItemRarity,
  TxType,
} from '@/types/inventory'

/** Tenant context required by every call to the inventory/gacha service */
export interface TenantCtx {
  studioId?: string  // kept for backward compat — no longer sent as a header
  gameId: string
}

// ─── Studio Owner — Item Catalogue ───────────────────────────────────────────

/** POST /api/v1/games/:gameId/items — Create a new item definition */
export async function createItemDefinition(
  ctx: TenantCtx,
  body: CreateItemRequest,
): Promise<{ item: ItemDefinition }> {
  return api.post(`/api/v1/games/${ctx.gameId}/items`, body)
}

export interface ListItemsParams {
  limit?: number
  offset?: number
  category?: ItemCategory
  rarity?: ItemRarity
  name?: string
}

/** GET /api/v1/games/:gameId/items — List item definitions with optional filtering */
export async function listItemDefinitions(
  ctx: TenantCtx,
  params: ListItemsParams = {},
): Promise<Paginated<ItemDefinition>> {
  const qs = new URLSearchParams()
  if (params.limit    != null) qs.set('limit',    String(params.limit))
  if (params.offset   != null) qs.set('offset',   String(params.offset))
  if (params.category)         qs.set('category', params.category)
  if (params.rarity)           qs.set('rarity',   params.rarity)
  if (params.name)             qs.set('name',     params.name)

  const query = qs.toString()
  return api.get(`/api/v1/games/${ctx.gameId}/items${query ? `?${query}` : ''}`)
}

/** GET /api/v1/games/:gameId/items/:itemId — Get a single item definition */
export async function getItemDefinition(
  ctx: TenantCtx,
  itemId: string,
): Promise<{ item: ItemDefinition }> {
  return api.get(`/api/v1/games/${ctx.gameId}/items/${itemId}`)
}

// ─── Studio Owner — Gacha Packs (read-only until admin API ships) ────────────

/**
 * There is no HTTP admin API for gacha packs yet.
 * This helper fetches currency items to display pack cost info in the dashboard.
 */
export async function listCurrencyItems(
  ctx: TenantCtx,
): Promise<ItemDefinition[]> {
  const result = await listItemDefinitions(ctx, { category: 'currency', limit: 50 })
  return result.items ?? []
}

/** POST /api/v1/games/:gameId/gacha/open — Open a gacha pack (requires idempotency key) */
export async function openGachaPack(
  ctx: TenantCtx,
  packType: string,
  idempotencyKey: string,
): Promise<GachaPackResult> {
  return api.post(
    `/api/v1/games/${ctx.gameId}/gacha/open`,
    { pack_type: packType },
    { headers: { 'X-Idempotency-Key': idempotencyKey } },
  )
}

/** GET /api/v1/games/:gameId/transactions — List a player's transaction history */
export async function listTransactions(
  ctx: TenantCtx,
  params: { limit?: number; offset?: number; type?: TxType } = {},
): Promise<Paginated<InventoryTransaction>> {
  const qs = new URLSearchParams()
  if (params.limit  != null) qs.set('limit',  String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  if (params.type)            qs.set('type',   params.type)

  const query = qs.toString()
  return api.get(`/api/v1/games/${ctx.gameId}/transactions${query ? `?${query}` : ''}`)
}
