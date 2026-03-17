/**
 * Leaderboard Admin API
 * Routes: /api/v1/studios/{studio_id}/games/{game_id}/leaderboards/...
 */

import { api } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreMode = 'sum' | 'max' | 'min' | 'latest'
export type SortDirection = 'DESC' | 'ASC'
export type ResetSchedule = 'never' | 'season' | 'daily' | 'weekly' | 'monthly'

export interface LeaderboardBoard {
  id: string
  studio_id: string
  game_id: string
  board_key: string
  name: string
  description: string
  score_mode: ScoreMode
  sort_direction: SortDirection
  reset_schedule: ResetSchedule
  season_id: string | null
  is_active: boolean
  max_score_delta: number | null
  created_at: string
  updated_at: string
}

export interface LeaderboardSeason {
  id: string
  board_id: string
  season_number: number
  name: string
  started_at: string
  ended_at: string | null
  reward_dispatched_at: string | null
}

export interface EndSeasonResult {
  OldSeasonID: string
  NewSeasonID: string
  TopN: any[]
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateBoardPayload {
  board_key: string
  name: string
  description?: string
  score_mode: ScoreMode
  sort_direction: SortDirection
  reset_schedule: ResetSchedule
  max_score_delta?: number | null
  first_season_start_at?: string | null
}

export async function createBoard(
  studioId: string,
  gameId: string,
  payload: CreateBoardPayload
): Promise<LeaderboardBoard> {
  const data = await api.post(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards`,
    payload
  )
  return data.board
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listBoards(
  studioId: string,
  gameId: string
): Promise<LeaderboardBoard[]> {
  const data = await api.get(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards`
  )
  return data.boards ?? []
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getBoard(
  studioId: string,
  gameId: string,
  boardId: string
): Promise<LeaderboardBoard> {
  const data = await api.get(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}`
  )
  return data.board
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateBoardPayload {
  name?: string
  description?: string
  is_active?: boolean
  max_score_delta?: number | null
}

export async function updateBoard(
  studioId: string,
  gameId: string,
  boardId: string,
  payload: UpdateBoardPayload
): Promise<LeaderboardBoard> {
  const data = await api.patch(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}`,
    payload
  )
  return data.board
}

// ─── Start Season ─────────────────────────────────────────────────────────────

export async function startSeason(
  studioId: string,
  gameId: string,
  boardId: string,
  seasonName: string,
  startAt?: string | null
): Promise<LeaderboardSeason> {
  const body: Record<string, unknown> = { season_name: seasonName }
  if (startAt) body.start_at = startAt
  const data = await api.post(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}/seasons`,
    body
  )
  return data.season
}

// ─── End Season ───────────────────────────────────────────────────────────────

export async function endSeason(
  studioId: string,
  gameId: string,
  boardId: string
): Promise<EndSeasonResult> {
  const data = await api.post(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}/seasons/end`
  )
  return data.result
}

// ─── Delete Season ────────────────────────────────────────────────────────────

export async function deleteSeason(
  studioId: string,
  gameId: string,
  boardId: string,
  seasonId: string
): Promise<void> {
  await api.delete(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}/seasons/${seasonId}`
  )
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteBoard(
  studioId: string,
  gameId: string,
  boardId: string
): Promise<void> {
  await api.delete(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}`
  )
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getBoardHistory(
  studioId: string,
  gameId: string,
  boardId: string
): Promise<LeaderboardSeason[]> {
  const data = await api.get(
    `/api/v1/studios/${studioId}/games/${gameId}/leaderboards/${boardId}/history`
  )
  return data.seasons ?? []
}

// ─── Reset Schedule Options ───────────────────────────────────────────────────

export interface ResetScheduleOption {
  value: ResetSchedule
  label: string
  description: string
}

let _resetScheduleOptionsCache: ResetScheduleOption[] | null = null

export async function getResetScheduleOptions(): Promise<ResetScheduleOption[]> {
  if (_resetScheduleOptionsCache) return _resetScheduleOptionsCache
  const data = await api.get('/api/v1/leaderboards/reset-schedule-options')
  _resetScheduleOptionsCache = data.reset_schedules ?? []
  return _resetScheduleOptionsCache!
}
