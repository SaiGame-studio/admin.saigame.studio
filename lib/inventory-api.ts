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
  EquipmentSlot,
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
  tags?: string[]
  allow_client_update_qty?: boolean
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
  if (params.tags && params.tags.length > 0) qs.set('tags', params.tags.join(','))
  if (params.allow_client_update_qty != null) qs.set('allow_client_update_qty', String(params.allow_client_update_qty))

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

// ─── Container Types ──────────────────────────────────────────────────────────

export interface ContainerTypeOption {
  value: string
  description: string
}

/** GET /api/v1/container-types — List all available container types */
export async function fetchContainerTypes(): Promise<ContainerTypeOption[]> {
  const res: any = await api.get('/api/v1/container-types')
  return Array.isArray(res) ? res : (res.container_types ?? [])
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

// ─── Equipment Slots ──────────────────────────────────────────────────────────

export interface ListEquipmentSlotsParams {
  limit?: number
  offset?: number
  is_active?: boolean
}

/** GET /api/v1/games/:gameId/equipment-slots */
export async function listEquipmentSlots(
  ctx: TenantCtx,
  params: ListEquipmentSlotsParams = {},
): Promise<{ slots: EquipmentSlot[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.limit    != null) qs.set('limit',     String(params.limit))
  if (params.offset   != null) qs.set('offset',    String(params.offset))
  if (params.is_active != null) qs.set('is_active', String(params.is_active))
  const query = qs.toString()
  return api.get(`/api/v1/games/${ctx.gameId}/equipment-slots${query ? `?${query}` : ''}`)
}

/** GET /api/v1/games/:gameId/equipment-slots/:slotKey */
export async function getEquipmentSlot(
  ctx: TenantCtx,
  slotKey: string,
): Promise<EquipmentSlot> {
  return api.get(`/api/v1/games/${ctx.gameId}/equipment-slots/${slotKey}`)
}

export interface CreateEquipmentSlotRequest {
  slot_key: string
  name: string
  description?: string
  allowed_categories?: string[]
  allowed_item_definition_ids?: string[] | null
  metadata?: Record<string, unknown>
}

export interface UpdateEquipmentSlotRequest {
  name?: string
  description?: string
  allowed_categories?: string[]
  allowed_item_definition_ids?: string[] | null
  metadata?: Record<string, unknown>
  is_active?: boolean
}

/** POST /api/v1/games/:gameId/equipment-slots */
export async function createEquipmentSlot(
  ctx: TenantCtx,
  body: CreateEquipmentSlotRequest,
): Promise<EquipmentSlot> {
  return api.post(`/api/v1/games/${ctx.gameId}/equipment-slots`, body)
}

/** PUT /api/v1/games/:gameId/equipment-slots/:slotKey */
export async function updateEquipmentSlot(
  ctx: TenantCtx,
  slotKey: string,
  body: UpdateEquipmentSlotRequest,
): Promise<EquipmentSlot> {
  return api.put(`/api/v1/games/${ctx.gameId}/equipment-slots/${slotKey}`, body)
}

/** DELETE /api/v1/games/:gameId/equipment-slots/:slotKey */
export async function deleteEquipmentSlot(
  ctx: TenantCtx,
  slotKey: string,
): Promise<void> {
  return api.delete(`/api/v1/games/${ctx.gameId}/equipment-slots/${slotKey}`)
}

// ─── Item Tags ────────────────────────────────────────────────────────────────

export interface ItemTag {
  id: string
  studio_id: string
  game_id: string
  tag_key: string
  label: string
  color: string
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
  item_count: number
}

export interface ListItemTagsParams {
  limit?: number
  offset?: number
}

export interface CreateItemTagRequest {
  tag_key: string
  label: string
  color?: string
  metadata?: Record<string, unknown>
}

export interface UpdateItemTagRequest {
  label?: string
  color?: string
  metadata?: Record<string, unknown>
}

/** GET /api/v1/games/:gameId/item-tags */
export async function listItemTags(
  ctx: TenantCtx,
  params: ListItemTagsParams = {},
): Promise<{ tags: ItemTag[]; total: number; limit: number; offset: number }> {
  const qs = new URLSearchParams()
  if (params.limit  != null) qs.set('limit',  String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return api.get(`/api/v1/games/${ctx.gameId}/item-tags${query ? `?${query}` : ''}`)
}

/** GET /api/v1/games/:gameId/item-tags/:tagId */
export async function getItemTag(
  ctx: TenantCtx,
  tagId: string,
): Promise<ItemTag> {
  return api.get(`/api/v1/games/${ctx.gameId}/item-tags/${tagId}`)
}

/** POST /api/v1/games/:gameId/item-tags */
export async function createItemTag(
  ctx: TenantCtx,
  body: CreateItemTagRequest,
): Promise<ItemTag> {
  return api.post(`/api/v1/games/${ctx.gameId}/item-tags`, body)
}

/** PUT /api/v1/games/:gameId/item-tags/:tagId */
export async function updateItemTag(
  ctx: TenantCtx,
  tagId: string,
  body: UpdateItemTagRequest,
): Promise<ItemTag> {
  return api.put(`/api/v1/games/${ctx.gameId}/item-tags/${tagId}`, body)
}

/** DELETE /api/v1/games/:gameId/item-tags/:tagId — returns 204 No Content */
export async function deleteItemTag(
  ctx: TenantCtx,
  tagId: string,
): Promise<void> {
  return api.delete(`/api/v1/games/${ctx.gameId}/item-tags/${tagId}`)
}

// ─── Tag Assignments (per Item Definition) ────────────────────────────────────

/** GET /api/v1/games/:gameId/items/:itemId/tags */
export async function getItemDefinitionTags(
  ctx: TenantCtx,
  itemId: string,
): Promise<{ tags: ItemTag[] }> {
  return api.get(`/api/v1/games/${ctx.gameId}/items/${itemId}/tags`)
}

/** PUT /api/v1/games/:gameId/items/:itemId/tags — assign (replace) tags */
export async function assignTagsToItemDefinition(
  ctx: TenantCtx,
  itemId: string,
  tag_keys: string[],
): Promise<{ tags: ItemTag[] }> {
  return api.put(`/api/v1/games/${ctx.gameId}/items/${itemId}/tags`, { tag_keys })
}

/** DELETE /api/v1/games/:gameId/items/:itemId/tags — remove specific tag_keys */
export async function removeTagsFromItemDefinition(
  ctx: TenantCtx,
  itemId: string,
  tag_keys: string[],
): Promise<void> {
  return api.delete(`/api/v1/games/${ctx.gameId}/items/${itemId}/tags`, { body: { tag_keys } })
}

// ─── Preset Definitions ───────────────────────────────────────────────────────

export interface PresetDefinition {
  id: string
  preset_type: string
  name: string
  max_slots: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePresetDefinitionRequest {
  preset_type: string
  name: string
  max_slots: number
  metadata?: Record<string, unknown>
}

export interface UpdatePresetDefinitionRequest {
  name?: string
  max_slots?: number
  metadata?: Record<string, unknown>
}

/** GET /api/v1/games/:gameId/preset-definitions */
export async function listPresetDefinitions(
  ctx: TenantCtx,
): Promise<{ definitions: PresetDefinition[] }> {
  return api.get(`/api/v1/games/${ctx.gameId}/preset-definitions`)
}

/** POST /api/v1/games/:gameId/preset-definitions */
export async function createPresetDefinition(
  ctx: TenantCtx,
  body: CreatePresetDefinitionRequest,
): Promise<PresetDefinition> {
  return api.post(`/api/v1/games/${ctx.gameId}/preset-definitions`, body)
}

/** PATCH /api/v1/games/:gameId/preset-definitions/:presetId */
export async function updatePresetDefinition(
  ctx: TenantCtx,
  presetId: string,
  body: UpdatePresetDefinitionRequest,
): Promise<PresetDefinition> {
  return api.patch(`/api/v1/games/${ctx.gameId}/preset-definitions/${presetId}`, body)
}

/** DELETE /api/v1/games/:gameId/preset-definitions/:presetId */
export async function deletePresetDefinition(
  ctx: TenantCtx,
  presetId: string,
): Promise<void> {
  return api.delete(`/api/v1/games/${ctx.gameId}/preset-definitions/${presetId}`)
}
