/**
 * Quest Definitions API — v1 endpoints
 * Routes: /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions
 * Requires: quest:write or quest:read permission
 *
 * Condition model: compound AND/OR tree (migration 055+)
 * Refs: docs/quest-condition-type.md, docs/quest-definition-fields.md
 */

import { api } from '@/lib/api-client'

// ─── Quest Types ──────────────────────────────────────────────────────────────

export type QuestType =
  | 'one_time'
  | 'daily'
  | 'repeatable'
  | 'battle_pass_task'
  | 'story'

// ─── Condition Tree ───────────────────────────────────────────────────────────

export interface ItemRequirement {
  item_definition_id: string
  quantity: number
}

/** A single trackable requirement (leaf node in the condition tree) */
export interface QuestConditionLeaf {
  clause_id: string
  type: string
  /** Required for counter types: login, gacha_opened */
  target?: number
  /** Required for item_collect type */
  items?: ItemRequirement[]
  /** Optional extra filter metadata (future use) */
  details?: Record<string, unknown>
}

/** An AND/OR group of conditions (inner or root node) */
export interface QuestConditionGroup {
  operator: 'AND' | 'OR'
  clauses: (QuestConditionLeaf | QuestConditionGroup)[]
}

export function isConditionLeaf(
  node: QuestConditionLeaf | QuestConditionGroup,
): node is QuestConditionLeaf {
  return 'type' in node
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

export type RewardType = 'coin' | 'item' | string

export interface QuestReward {
  reward_type: RewardType
  /** Used when reward_type = coin */
  amount?: number
  /** Used when reward_type = item */
  item_definition_id?: string
  quantity_min?: number
  quantity_max?: number
}

// ─── Quest Definition ─────────────────────────────────────────────────────────

export interface QuestDefinition {
  id: string
  studio_id: string
  game_id: string
  name: string
  description?: string
  quest_type: QuestType
  conditions: QuestConditionGroup
  quest_chain_id: string | null
  prerequisite_quest_id: string | null
  is_active: boolean
  sort_order: number
  rewards: QuestReward[]
  created_at: string
  updated_at: string
}

export interface ListQuestDefinitionsResponse {
  quests: QuestDefinition[]
  total?: number
}

export interface CreateQuestDefinitionRequest {
  name: string
  description?: string
  quest_type: QuestType
  conditions: QuestConditionGroup
  quest_chain_id?: string | null
  prerequisite_quest_id?: string | null
  is_active?: boolean
  sort_order?: number
  rewards?: QuestReward[]
}

export interface UpdateQuestDefinitionRequest {
  name?: string
  description?: string
  quest_type?: QuestType
  conditions?: QuestConditionGroup
  quest_chain_id?: string | null
  prerequisite_quest_id?: string | null
  is_active?: boolean
  sort_order?: number
  rewards?: QuestReward[]
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function listQuestDefinitions(
  studioId: string,
  gameId: string,
  params?: { active_only?: boolean; limit?: number; offset?: number }
): Promise<ListQuestDefinitionsResponse> {
  const qs = new URLSearchParams()
  if (params?.active_only !== undefined) qs.set('active_only', String(params.active_only))
  if (params?.limit !== undefined) qs.set('limit', String(params.limit))
  if (params?.offset !== undefined) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs}` : ''
  return api.get(`/api/v1/studios/${studioId}/games/${gameId}/quest-definitions${query}`)
}

export async function getQuestDefinition(
  studioId: string,
  gameId: string,
  questId: string
): Promise<QuestDefinition> {
  return api.get(`/api/v1/studios/${studioId}/games/${gameId}/quest-definitions/${questId}`)
}

export async function createQuestDefinition(
  studioId: string,
  gameId: string,
  data: CreateQuestDefinitionRequest
): Promise<QuestDefinition> {
  return api.post(`/api/v1/studios/${studioId}/games/${gameId}/quest-definitions`, data)
}

export async function updateQuestDefinition(
  studioId: string,
  gameId: string,
  questId: string,
  data: UpdateQuestDefinitionRequest
): Promise<QuestDefinition> {
  return api.patch(`/api/v1/studios/${studioId}/games/${gameId}/quest-definitions/${questId}`, data)
}

export async function deleteQuestDefinition(
  studioId: string,
  gameId: string,
  questId: string
): Promise<void> {
  return api.delete(`/api/v1/studios/${studioId}/games/${gameId}/quest-definitions/${questId}`)
}

// ─── Daily Quest Pool Types ───────────────────────────────────────────────────

export type AssignmentStrategy =
  | 'weighted_random'
  | 'fixed_rotation'
  | 'weekly_schedule'
  | 'monthly_schedule'

export interface DailyQuestPoolQuest {
  id: string
  pool_id: string
  quest_definition_id: string
  studio_id: string
  game_id: string
  weight: number
  created_at: string
}

export interface ListPoolQuestsResponse {
  quests: DailyQuestPoolQuest[]
}

export interface CompletionBonus {
  id: string
  studio_id: string
  game_id: string
  pool_id: string
  rewards: QuestReward[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DailyQuestPool {
  id: string
  studio_id: string
  game_id: string
  pool_key: string
  display_name: string
  description?: string
  assignment_strategy: AssignmentStrategy
  slots_per_day: number
  reset_hour_utc: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDailyQuestPoolRequest {
  pool_key: string
  display_name: string
  description?: string
  assignment_strategy: AssignmentStrategy
  slots_per_day: number
  reset_hour_utc?: number
  is_active?: boolean
}

export interface UpdateDailyQuestPoolRequest {
  display_name?: string
  description?: string
  slots_per_day?: number
  reset_hour_utc?: number
  is_active?: boolean
}

export interface AddQuestToPoolRequest {
  quest_id: string
  weight: number
  sequence_order: number
}

export interface SetCompletionBonusRequest {
  rewards: QuestReward[]
}

export interface ListDailyQuestPoolsResponse {
  pools: DailyQuestPool[]
  total?: number
  limit?: number
  offset?: number
}

// ─── Daily Quest Pool API Functions ───────────────────────────────────────────

export async function listDailyQuestPools(
  studioId: string,
  gameId: string,
  params?: { active_only?: boolean; limit?: number; offset?: number }
): Promise<ListDailyQuestPoolsResponse> {
  const qs = new URLSearchParams()
  if (params?.active_only !== undefined) qs.set('active_only', String(params.active_only))
  if (params?.limit !== undefined) qs.set('limit', String(params.limit))
  if (params?.offset !== undefined) qs.set('offset', String(params.offset))
  const query = qs.toString() ? `?${qs}` : ''
  return api.get(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools${query}`)
}

export async function getDailyQuestPool(
  studioId: string,
  gameId: string,
  poolId: string
): Promise<DailyQuestPool> {
  return api.get(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}`)
}

export async function listPoolQuests(
  studioId: string,
  gameId: string,
  poolId: string
): Promise<ListPoolQuestsResponse> {
  return api.get(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}/quests`)
}

export async function createDailyQuestPool(
  studioId: string,
  gameId: string,
  data: CreateDailyQuestPoolRequest
): Promise<DailyQuestPool> {
  return api.post(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools`, data)
}

export async function updateDailyQuestPool(
  studioId: string,
  gameId: string,
  poolId: string,
  data: UpdateDailyQuestPoolRequest
): Promise<DailyQuestPool> {
  return api.patch(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}`, data)
}

export async function addQuestToPool(
  studioId: string,
  gameId: string,
  poolId: string,
  data: AddQuestToPoolRequest
): Promise<DailyQuestPoolQuest> {
  return api.post(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}/quests`, data)
}

export async function removeQuestFromPool(
  studioId: string,
  gameId: string,
  poolId: string,
  questId: string
): Promise<void> {
  return api.delete(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}/quests/${questId}`)
}

export async function setCompletionBonus(
  studioId: string,
  gameId: string,
  poolId: string,
  data: SetCompletionBonusRequest
): Promise<CompletionBonus> {
  return api.put(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}/completion-bonus`, data)
}

export async function getCompletionBonus(
  studioId: string,
  gameId: string,
  poolId: string
): Promise<CompletionBonus> {
  return api.get(`/api/v1/studios/${studioId}/games/${gameId}/daily-quest-pools/${poolId}/completion-bonus`)
}
