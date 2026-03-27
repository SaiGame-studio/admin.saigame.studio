import { api } from '@/lib/api-client'
import type { GameScript, CreateScriptRequest, UpdateScriptRequest, SampleScript } from '@/types/script'

/** GET /api/v1/games/:gameId/scripts — List all scripts */
export async function listScripts(gameId: string): Promise<GameScript[]> {
  return api.get(`/api/v1/games/${gameId}/scripts`)
}

/** POST /api/v1/games/:gameId/scripts — Create a script */
export async function createScript(
  gameId: string,
  body: CreateScriptRequest,
): Promise<GameScript> {
  return api.post(`/api/v1/games/${gameId}/scripts`, body)
}

/** GET /api/v1/scripts/samples — List built-in Lua script templates */
export async function listSampleScripts(): Promise<SampleScript[]> {
  return api.get(`/api/v1/scripts/samples`)
}

/** GET /api/v1/scripts/turn-base-samples — List turn-base Lua script templates */
export async function listTurnBaseSampleScripts(): Promise<SampleScript[]> {
  return api.get(`/api/v1/scripts/turn-base-samples`)
}

export interface EntitiesPoolSampleResponse {
  api_reference: Record<string, any>
  description: string
  prerequisites: Record<string, string>
  samples: SampleScript[]
}

/** GET /api/v1/scripts/entities-pool-sample — List entities pool sample scripts */
export async function listEntitiesPoolSamples(): Promise<EntitiesPoolSampleResponse> {
  return api.get(`/api/v1/scripts/entities-pool-sample`)
}

export async function getScript(gameId: string, scriptId: string): Promise<GameScript> {
  return api.get(`/api/v1/games/${gameId}/scripts/${scriptId}`)
}

/** PATCH /api/v1/games/:gameId/scripts/:scriptId — Update a script */
export async function updateScript(
  gameId: string,
  scriptId: string,
  body: UpdateScriptRequest,
): Promise<GameScript> {
  return api.patch(`/api/v1/games/${gameId}/scripts/${scriptId}`, body)
}
/** DELETE /api/v1/games/:gameId/scripts/:scriptId — Delete a script */
export async function deleteScript(gameId: string, scriptId: string): Promise<void> {
  return api.delete(`/api/v1/games/${gameId}/scripts/${scriptId}`)
}
