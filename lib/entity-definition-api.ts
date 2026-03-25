/**
 * Entity Definition API — game-scoped endpoints
 * Routes: /api/v1/games/{game_id}/entity-definitions
 */

import { api } from '@/lib/api-client'
import type {
  EntityDefinition,
  EntityType,
  CreateEntityDefinitionRequest,
  UpdateEntityDefinitionRequest,
  EntityPool,
  CreateEntityPoolRequest,
  UpdateEntityPoolRequest,
} from '@/types/entity-definition'

export interface ListEntityDefinitionsParams {
  type?: EntityType
  name?: string
  search?: string
}

/** POST /api/v1/games/:gameId/entity-definitions */
export async function createEntityDefinition(
  gameId: string,
  body: CreateEntityDefinitionRequest,
): Promise<EntityDefinition> {
  return api.post(`/api/v1/games/${gameId}/entity-definitions`, body)
}

/** GET /api/v1/games/:gameId/entity-definitions */
export async function listEntityDefinitions(
  gameId: string,
  params: ListEntityDefinitionsParams = {},
): Promise<EntityDefinition[]> {
  const query = new URLSearchParams()
  if (params.type) query.set('type', params.type)
  if (params.name) query.set('name', params.name)
  if (params.search) query.set('search', params.search)
  const qs = query.toString()
  return api.get(`/api/v1/games/${gameId}/entity-definitions${qs ? `?${qs}` : ''}`)
}

/** GET /api/v1/games/:gameId/entity-definitions/:entityDefId */
export async function getEntityDefinition(
  gameId: string,
  entityDefId: string,
): Promise<EntityDefinition> {
  return api.get(`/api/v1/games/${gameId}/entity-definitions/${entityDefId}`)
}

/** GET /api/v1/games/:gameId/entity-definitions/key/:entityDefKey */
export async function getEntityDefinitionByKey(
  gameId: string,
  entityDefKey: string,
): Promise<EntityDefinition> {
  return api.get(`/api/v1/games/${gameId}/entity-definitions/key/${entityDefKey}`)
}

/** PATCH /api/v1/games/:gameId/entity-definitions/:entityDefId */
export async function updateEntityDefinition(
  gameId: string,
  entityDefId: string,
  body: UpdateEntityDefinitionRequest,
): Promise<EntityDefinition> {
  return api.patch(`/api/v1/games/${gameId}/entity-definitions/${entityDefId}`, body)
}

/** DELETE /api/v1/games/:gameId/entity-definitions/:entityDefId — 204 No Content */
export async function deleteEntityDefinition(
  gameId: string,
  entityDefId: string,
): Promise<void> {
  return api.delete(`/api/v1/games/${gameId}/entity-definitions/${entityDefId}`)
}

/** GET /api/v1/entity-definitions/types */
export async function getEntityDefinitionTypes(): Promise<string[]> {
  const res = await api.get('/api/v1/entity-definitions/types') as { entity_types: string[] }
  return res.entity_types
}

/** POST /api/v1/games/:gameId/entity-definitions/bulk */
export async function bulkGetEntityDefinitions(
  gameId: string,
  keys: string[],
): Promise<EntityDefinition[]> {
  return api.post(`/api/v1/games/${gameId}/entity-definitions/bulk`, { keys })
}

// ─── Entity Pool ─────────────────────────────────────────────────────────────

/** GET /api/v1/games/:gameId/entity-pools */
export async function listEntityPools(gameId: string): Promise<EntityPool[]> {
  return api.get(`/api/v1/games/${gameId}/entity-pools`)
}

/** POST /api/v1/games/:gameId/entity-pools */
export async function createEntityPool(
  gameId: string,
  body: CreateEntityPoolRequest
): Promise<EntityPool> {
  return api.post(`/api/v1/games/${gameId}/entity-pools`, body)
}

/** GET /api/v1/games/:gameId/entity-pools/:id */
export async function getEntityPool(gameId: string, id: string): Promise<EntityPool> {
  return api.get(`/api/v1/games/${gameId}/entity-pools/${id}`)
}

/** PATCH /api/v1/games/:gameId/entity-pools/:id */
export async function updateEntityPool(
  gameId: string,
  id: string,
  body: UpdateEntityPoolRequest
): Promise<EntityPool> {
  return api.patch(`/api/v1/games/${gameId}/entity-pools/${id}`, body)
}

/** DELETE /api/v1/games/:gameId/entity-pools/:id */
export async function deleteEntityPool(gameId: string, id: string): Promise<void> {
  return api.delete(`/api/v1/games/${gameId}/entity-pools/${id}`)
}

