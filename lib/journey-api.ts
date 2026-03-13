/**
 * Journey API — v1 endpoints
 * Routes: /api/v1/games/{game_id}/journeys
 */

import { api } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Journey {
  id: string
  studio_id: string
  game_id: string
  journey_key: string
  name: string
  description?: string
  is_active: boolean
  version: number
  start_node_id?: string
  metadata?: Record<string, string>
  created_by: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface CreateJourneyRequest {
  name: string
  journey_key: string
  description?: string
  version?: string
  start_node_id?: string
  metadata?: Record<string, string>
}

export interface UpdateJourneyRequest {
  name?: string
  description?: string
  is_active?: boolean
  metadata?: Record<string, string>
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function listJourneys(gameId: string): Promise<Journey[]> {
  const data = await api.get(`/api/v1/games/${gameId}/journeys`)
  return Array.isArray(data) ? data : []
}

export async function getJourney(gameId: string, journeyId: string): Promise<Journey> {
  return api.get(`/api/v1/games/${gameId}/journeys/${journeyId}`)
}

export async function createJourney(gameId: string, body: CreateJourneyRequest): Promise<Journey> {
  return api.post(`/api/v1/games/${gameId}/journeys`, body)
}

export async function updateJourney(
  gameId: string,
  journeyId: string,
  body: UpdateJourneyRequest,
): Promise<Journey> {
  return api.patch(`/api/v1/games/${gameId}/journeys/${journeyId}`, body)
}

export async function deleteJourney(gameId: string, journeyId: string): Promise<void> {
  return api.delete(`/api/v1/games/${gameId}/journeys/${journeyId}`)
}

// ─── DAG Types ────────────────────────────────────────────────────────────────

export interface JourneyDagNodeDefinition {
  id: string
  studio_id: string
  game_id: string
  node_key: string
  name: string
  description: string
  event_type: string
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
}

export interface JourneyDagNode {
  id: string
  journey_id: string
  node_definition_id: string
  definition: JourneyDagNodeDefinition
  node_type: "start" | "end" | string
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface JourneyDagEdge {
  id: string
  journey_id: string
  from_node_id: string
  to_node_id: string
  metadata: Record<string, unknown>
  sort_order: number
  created_at: string
}

export interface JourneyDag {
  nodes: JourneyDagNode[]
  edges: JourneyDagEdge[]
}

export async function getJourneyDag(gameId: string, journeyId: string): Promise<JourneyDag> {
  return api.get(`/api/v1/games/${gameId}/journeys/${journeyId}/dag`)
}

export interface SaveDagNodePayload {
  definition_id: string
  node_type: string
  position_x: number
  position_y: number
}

export interface SaveDagEdgePayload {
  from_definition_id: string
  to_definition_id: string
}

export interface SaveJourneyDagRequest {
  nodes: SaveDagNodePayload[]
  edges: SaveDagEdgePayload[]
}

export async function saveJourneyDag(
  gameId: string,
  journeyId: string,
  body: SaveJourneyDagRequest,
): Promise<JourneyDag> {
  return api.put(`/api/v1/games/${gameId}/journeys/${journeyId}/dag`, body)
}

// ─── Node Definition API ──────────────────────────────────────────────────────

export interface CreateNodeDefinitionRequest {
  name: string
  node_key: string
  description?: string
  event_type: string
  metadata?: Record<string, unknown>
}

export interface UpdateNodeDefinitionRequest {
  name?: string
  description?: string
  event_type?: string
  metadata?: Record<string, unknown>
}

export async function listNodeDefinitions(gameId: string): Promise<JourneyDagNodeDefinition[]> {
  const data = await api.get(`/api/v1/games/${gameId}/journey-node-definitions`)
  return Array.isArray(data) ? data : []
}

export async function createNodeDefinition(
  gameId: string,
  body: CreateNodeDefinitionRequest,
): Promise<JourneyDagNodeDefinition> {
  return api.post(`/api/v1/games/${gameId}/journey-node-definitions`, body)
}

export async function updateNodeDefinition(
  gameId: string,
  nodeDefId: string,
  body: UpdateNodeDefinitionRequest,
): Promise<JourneyDagNodeDefinition> {
  return api.patch(`/api/v1/games/${gameId}/journey-node-definitions/${nodeDefId}`, body)
}

export async function deleteNodeDefinition(gameId: string, nodeDefId: string): Promise<void> {
  return api.delete(`/api/v1/games/${gameId}/journey-node-definitions/${nodeDefId}`)
}

// ─── Journey Node (DAG) API ───────────────────────────────────────────────────

export interface AddNodeToJourneyRequest {
  node_definition_id: string
  node_type: string
  position_x: number
  position_y: number
}

export async function addNodeToJourney(
  gameId: string,
  journeyId: string,
  body: AddNodeToJourneyRequest,
): Promise<JourneyDagNode> {
  return api.post(`/api/v1/games/${gameId}/journeys/${journeyId}/nodes`, body)
}

// ─── Event Stats API ──────────────────────────────────────────────────────────

export interface EventStat {
  studio_id: string
  game_id: string
  event_type: string
  stat_date: string
  player_count: number
  event_count: number
  refreshed_at: string
}

export interface EventStatsResponse {
  game_id: string
  from: string | null
  to: string | null
  event_type: string
  stats: EventStat[]
}

export async function getEventStats(
  gameId: string,
  params?: { from?: string; to?: string; event_type?: string },
): Promise<EventStatsResponse> {
  const q = new URLSearchParams()
  if (params?.from) q.set("from", params.from)
  if (params?.to) q.set("to", params.to)
  if (params?.event_type) q.set("event_type", params.event_type)
  const qs = q.toString()
  return api.get(`/api/v1/games/${gameId}/event-stats${qs ? `?${qs}` : ""}`)
}
