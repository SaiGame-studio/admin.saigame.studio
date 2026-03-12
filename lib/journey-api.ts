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
  is_published: boolean
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
  is_published?: boolean
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
