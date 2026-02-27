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
  UpdateItemRequest,
  GachaPack,
  GachaPoolEntry,
  GachaPackResult,
  CreateGachaPackRequest,
  UpdateGachaPackRequest,
  InventoryTransaction,
  Paginated,
  ItemCategory,
  ItemRarity,
  TxType,
  ContainerDefinition,
  ContainerType,
  CreateContainerDefinitionRequest,
  UpdateContainerDefinitionRequest,
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

/** PATCH /api/v1/games/:gameId/items/:itemId — Update an item definition */
export async function updateItemDefinition(
  ctx: TenantCtx,
  itemId: string,
  body: UpdateItemRequest,
): Promise<{ item: ItemDefinition }> {
  return api.patch(`/api/v1/games/${ctx.gameId}/items/${itemId}`, body)
}

/** DELETE /api/v1/games/:gameId/items/:itemId — Delete an item definition */
export async function deleteItemDefinition(
  ctx: TenantCtx,
  itemId: string,
): Promise<{ message: string }> {
  return api.delete(`/api/v1/games/${ctx.gameId}/items/${itemId}`)
}

// ─── Studio Owner — Gacha Packs (Admin) ─────────────────────────────────────

/** GET /api/v1/games/:gameId/gacha/packs — List all gacha packs */
export async function listGachaPacks(
  ctx: TenantCtx,
): Promise<{ packs: GachaPack[] }> {
  return api.get(`/api/v1/games/${ctx.gameId}/gacha/packs`)
}

/** GET /api/v1/games/:gameId/gacha/packs/:packId — Get a single gacha pack */
export async function getGachaPack(
  ctx: TenantCtx,
  packId: string,
): Promise<{ pack: GachaPack }> {
  return api.get(`/api/v1/games/${ctx.gameId}/gacha/packs/${packId}`)
}

/** POST /api/v1/games/:gameId/gacha/packs — Create a gacha pack */
export async function createGachaPack(
  ctx: TenantCtx,
  body: CreateGachaPackRequest,
): Promise<{ pack: GachaPack }> {
  return api.post(`/api/v1/games/${ctx.gameId}/gacha/packs`, body)
}

/** PATCH /api/v1/games/:gameId/gacha/packs/:packId — Update a gacha pack */
export async function updateGachaPack(
  ctx: TenantCtx,
  packId: string,
  body: UpdateGachaPackRequest,
): Promise<{ pack: GachaPack }> {
  return api.patch(`/api/v1/games/${ctx.gameId}/gacha/packs/${packId}`, body)
}

/** DELETE /api/v1/games/:gameId/gacha/packs/:packId — Delete a gacha pack */
export async function deleteGachaPack(
  ctx: TenantCtx,
  packId: string,
): Promise<{ message: string }> {
  return api.delete(`/api/v1/games/${ctx.gameId}/gacha/packs/${packId}`)
}

/** PATCH /api/v1/games/:gameId/gacha/packs/:packId/enabled — Toggle pack enabled */
export async function setGachaPackEnabled(
  ctx: TenantCtx,
  packId: string,
  isEnabled: boolean,
): Promise<{ is_enabled: boolean }> {
  return api.patch(
    `/api/v1/games/${ctx.gameId}/gacha/packs/${packId}/enabled`,
    { is_enabled: isEnabled },
  )
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

/** GET /api/v1/items/categories — List available item categories */
export async function fetchItemCategories(): Promise<ItemCategory[]> {
  const res: any = await api.get('/api/v1/items/categories')
  return Array.isArray(res) ? res : (res.categories ?? [])
}

/** GET /api/v1/items/rarities — List available item rarities */
export async function fetchItemRarities(): Promise<ItemRarity[]> {
  const res: any = await api.get('/api/v1/items/rarities')
  return Array.isArray(res) ? res : (res.rarities ?? [])
}

// ─── Container Definitions ────────────────────────────────────────────────────

export interface ListContainerDefsParams {
  limit?: number
  offset?: number
  container_type?: ContainerType
}

/** GET /api/v1/games/:gameId/container-definitions */
export async function listContainerDefinitions(
  ctx: TenantCtx,
  params: ListContainerDefsParams = {},
): Promise<{ container_definitions: ContainerDefinition[]; total: number; limit: number; offset: number }> {
  const qs = new URLSearchParams()
  if (params.limit        != null) qs.set('limit',          String(params.limit))
  if (params.offset       != null) qs.set('offset',         String(params.offset))
  if (params.container_type)       qs.set('container_type', params.container_type)
  const query = qs.toString()
  return api.get(`/api/v1/games/${ctx.gameId}/container-definitions${query ? `?${query}` : ''}`)
}

/** POST /api/v1/games/:gameId/container-definitions */
export async function createContainerDefinition(
  ctx: TenantCtx,
  body: CreateContainerDefinitionRequest,
): Promise<{ container_definition: ContainerDefinition }> {
  return api.post(`/api/v1/games/${ctx.gameId}/container-definitions`, body)
}

/** GET /api/v1/games/:gameId/container-definitions/:definitionId */
export async function getContainerDefinition(
  ctx: TenantCtx,
  definitionId: string,
): Promise<{ container_definition: ContainerDefinition }> {
  return api.get(`/api/v1/games/${ctx.gameId}/container-definitions/${definitionId}`)
}

/** PATCH /api/v1/games/:gameId/container-definitions/:definitionId */
export async function updateContainerDefinition(
  ctx: TenantCtx,
  definitionId: string,
  body: UpdateContainerDefinitionRequest,
): Promise<{ container_definition: ContainerDefinition }> {
  return api.patch(`/api/v1/games/${ctx.gameId}/container-definitions/${definitionId}`, body)
}

/** DELETE /api/v1/games/:gameId/container-definitions/:definitionId */
export async function deleteContainerDefinition(
  ctx: TenantCtx,
  definitionId: string,
): Promise<{ message: string }> {
  return api.delete(`/api/v1/games/${ctx.gameId}/container-definitions/${definitionId}`)
}
