import { api } from "@/lib/api-client"
import { safeGetItem, safeSetItem } from "@/lib/storage-utils"

const PLAYER_IDENTITY_CACHE_KEY = "saigame_player_identity_cache_v1"

export interface GameProgress {
  id: string
  user_id: string
  game_id: string
  level: number
  experience: number
  gold: number
  game_data: Record<string, any>
  created_at: number
  updated_at: number
  version: number
  user_display_name: string
  user_email: string
  user_created_at: number
  banned_at?: string | null
  banned_by?: string | null
}

export interface GameProgressResult {
  progress: GameProgress[]
  total_count: number
}

export interface GameProgressDetail {
  id: string
  user_id: string
  game_id: string
  level: number
  experience: number
  gold: number
  game_data?: Record<string, any>
  created_at: number
  updated_at: number
  version: number
  user_display_name?: string
  user_email?: string
  user_created_at?: number
  banned_at?: string | null
  banned_by?: string | null
}

export interface PlayerIdentity {
  user_id: string
  gamer_name: string
  display_name: string
  masked_email: string
}

type PlayerIdentityCacheMap = Record<string, PlayerIdentity>

function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "***@saigame.studio"
  const [localPart, domain] = email.split("@")
  if (!localPart) return `***@${domain || "saigame.studio"}`
  const visible = localPart.slice(0, Math.min(2, localPart.length))
  return `${visible}${"*".repeat(Math.max(1, localPart.length - visible.length))}@${domain || "saigame.studio"}`
}

function buildIdentityFallback(userId: string, displayName?: string, email?: string): PlayerIdentity {
  const shortId = userId.slice(0, 8)
  const name = displayName?.trim() || `player_${shortId}`
  return {
    user_id: userId,
    gamer_name: name,
    display_name: name,
    masked_email: maskEmail(email),
  }
}

function getIdentityCache(): PlayerIdentityCacheMap {
  const raw = safeGetItem(PLAYER_IDENTITY_CACHE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      return parsed as PlayerIdentityCacheMap
    }
  } catch (error) {
    console.error("Failed to parse player identity cache", error)
  }

  return {}
}

function saveIdentityCache(cache: PlayerIdentityCacheMap): void {
  safeSetItem(PLAYER_IDENTITY_CACHE_KEY, JSON.stringify(cache))
}

export async function getPlayerIdentityMapByUserIds(
  userIds: string[],
  seed?: Array<{ user_id: string; user_display_name?: string; user_email?: string }>,
  gameId?: string,
): Promise<Record<string, PlayerIdentity>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return {}

  const seedMap = new Map<string, { user_display_name?: string; user_email?: string }>()
  if (seed?.length) {
    for (const item of seed) {
      if (!item?.user_id) continue
      seedMap.set(item.user_id, {
        user_display_name: item.user_display_name,
        user_email: item.user_email,
      })
    }
  }

  const cache = getIdentityCache()
  const result: Record<string, PlayerIdentity> = {}
  const missingUserIds: string[] = []

  for (const userId of uniqueUserIds) {
    const cached = cache[userId]
    if (cached) {
      result[userId] = cached
      continue
    }

    const seedData = seedMap.get(userId)
    if (seedData?.user_display_name || seedData?.user_email) {
      const fallback = buildIdentityFallback(userId, seedData.user_display_name, seedData.user_email)
      result[userId] = fallback
      cache[userId] = fallback
      continue
    }

    missingUserIds.push(userId)
  }

  if (missingUserIds.length > 0) {
    try {
      let userMap: Map<string, { display_name?: string; username?: string; email?: string }>

      if (gameId) {
        const { progress } = await getGameProgressList(gameId)
        userMap = new Map(
          progress.map((p) => [p.user_id, { display_name: p.user_display_name, email: p.user_email }])
        )
      } else {
        const { getAllUsersAdmin } = await import("@/lib/admin-api")
        const adminUsers = await getAllUsersAdmin()
        userMap = new Map(adminUsers.users.map((user) => [user.id, user]))
      }

      for (const userId of missingUserIds) {
        const user = userMap.get(userId)
        const identity = buildIdentityFallback(userId, user?.display_name || (user as any)?.username, user?.email)
        result[userId] = identity
        cache[userId] = identity
      }
    } catch (error) {
      for (const userId of missingUserIds) {
        result[userId] = buildIdentityFallback(userId)
      }
      console.error("Failed to fetch player identities", error)
    }
  }

  saveIdentityCache(cache)
  return result
}

// Lấy danh sách progress (gamers) của 1 game
export async function getGameProgressList(
  gameId: string,
  params?: { display_name?: string }
): Promise<GameProgressResult> {
  const searchParams = new URLSearchParams({ page_size: "100" })
  if (params?.display_name) {
    searchParams.set("display_name", params.display_name)
  }
  const data = await api.get(`/api/v1/games/${gameId}/progress-list?${searchParams.toString()}`)
  return {
    progress: data?.progress && Array.isArray(data.progress) ? data.progress : [],
    total_count: data?.total_count ?? 0,
  }
}

// Get detail of a player progress
export async function getGameProgressDetail(progressId: string): Promise<GameProgressDetail> {
  const data = await api.get(`/api/v1/gamer-progress/${progressId}`)
  return data?.data ?? data
}

// Ban a player progress
export async function banProgress(progressId: string): Promise<void> {
  await api.post(`/api/v1/gamer-progress/${progressId}/ban`, {})
}

// Unban a player progress
export async function unbanProgress(progressId: string): Promise<void> {
  await api.post(`/api/v1/gamer-progress/${progressId}/unban`, {})
}

// ─── Player Items ─────────────────────────────────────────────────────────────

export interface PlayerItemDefinition {
  id: string
  game_id: string
  item_code: string
  name: string
  category: string
  rarity: string
  base_stats: Record<string, number>
  metadata: Record<string, unknown>
  is_stackable: boolean
  max_stack_size: number | null
  grid_width: number
  grid_height: number
  client_writable: boolean
  allow_client_update_qty: boolean
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface PlayerItem {
  id: string
  game_id: string
  user_id: string
  item_definition_id: string
  item_container_id: string
  grid_x: number
  grid_y: number
  quantity: number
  level: number
  private_properties: Record<string, unknown> | null
  public_properties: Record<string, unknown> | null
  acquired_at: string
  last_modified_at: string
  version: number
  definition: PlayerItemDefinition
}

export interface PlayerItemsResult {
  items: PlayerItem[]
  limit: number
  offset: number
  profile_id: string
  total: number
  user_id: string
}

export async function getProgressItems(
  progressId: string,
  params?: { limit?: number; offset?: number; name?: string; category?: string; rarity?: string; container_id?: string },
): Promise<PlayerItemsResult> {
  const qs = new URLSearchParams()
  if (params?.limit        != null) qs.set("limit",        String(params.limit))
  if (params?.offset       != null) qs.set("offset",       String(params.offset))
  if (params?.name)                 qs.set("name",         params.name)
  if (params?.category)             qs.set("category",     params.category)
  if (params?.rarity)               qs.set("rarity",       params.rarity)
  if (params?.container_id)         qs.set("container_id", params.container_id)
  const query = qs.toString()
  return api.get(`/api/v1/gamer-progress/${progressId}/items${query ? `?${query}` : ""}`)
}

// ─── Player Containers ────────────────────────────────────────────────────────

export interface PlayerContainerDefinition {
  id: string
  game_id: string
  name: string
  code_name?: string
  container_type: string
  grid_cols: number
  grid_rows: number
  is_portable: boolean
  instanced_per_item: boolean
  linked_item_definition_id?: string | null
  metadata?: Record<string, unknown> | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface PlayerContainer {
  id: string
  studio_id?: string
  game_id?: string
  owner_user_id?: string
  item_container_definition_id?: string
  container_type: string
  position_data?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  definition?: PlayerContainerDefinition
}

export interface PlayerContainersResult {
  containers: PlayerContainer[]
  limit: number
  offset: number
  has_more: boolean
  profile_id: string
  user_id: string
}

export async function getProgressContainers(
  progressId: string,
  params?: { limit?: number; offset?: number; type?: string; include_deleted?: boolean; instance_id?: string },
): Promise<PlayerContainersResult> {
  const qs = new URLSearchParams()
  if (params?.limit         != null) qs.set("limit",           String(params.limit))
  if (params?.offset        != null) qs.set("offset",          String(params.offset))
  if (params?.type)                  qs.set("type",            params.type)
  if (params?.include_deleted)       qs.set("include_deleted", "true")
  if (params?.instance_id)           qs.set("instance_id",     params.instance_id)
  const query = qs.toString()
  return api.get(`/api/v1/gamer-progress/${progressId}/containers${query ? `?${query}` : ""}`)
}

export async function getProgressContainer(
  progressId: string,
  containerId: string,
): Promise<PlayerContainer> {
  return api.get(`/api/v1/gamer-progress/${progressId}/containers/${containerId}`)
}

export interface ContainerItemsResult {
  container_id: string
  items: PlayerItem[]
  profile_id: string
  user_id: string
}

export async function getContainerItems(
  progressId: string,
  containerId: string,
  params?: { limit?: number; offset?: number },
): Promise<ContainerItemsResult> {
  const qs = new URLSearchParams()
  if (params?.limit  != null) qs.set("limit",  String(params.limit))
  if (params?.offset != null) qs.set("offset", String(params.offset))
  const query = qs.toString()
  return api.get(`/api/v1/gamer-progress/${progressId}/containers/${containerId}/items${query ? `?${query}` : ""}`)
}

// ─── Player Presets ───────────────────────────────────────────────────────────

export interface PlayerPresetContainer {
  id: string
  preset_type: string
  name: string
  max_slots: number
  is_temp: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PlayerPresetsResult {
  user_id: string
  containers: PlayerPresetContainer[]
}

export async function getPlayerPresets(
  gameId: string,
  userId: string,
): Promise<PlayerPresetsResult> {
  return api.get(`/api/v1/games/${gameId}/presets/users/${userId}`)
}

export interface PlayerPresetDefinition {
  id: string
  preset_type: string
  name: string
  max_slots: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PlayerPresetSlot {
  slot_index: number
  inventory_item_id: string
  item_definition_id?: string
  item_definition_name?: string
}

export interface PlayerPresetDetail {
  container: {
    id: string
    definition_id: string
    definition: PlayerPresetDefinition
    preset_type: string
    max_slots: number
    is_temp: boolean
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
  }
  slots: PlayerPresetSlot[]
}

export async function getPlayerPresetDetail(
  gameId: string,
  userId: string,
  presetId: string,
): Promise<PlayerPresetDetail> {
  return api.get(`/api/v1/games/${gameId}/presets/users/${userId}/presets/${presetId}`)
}

// ─── Gacha Transactions ───────────────────────────────────────────────────────

export interface GachaItemGranted {
  item_definition_id: string
  name: string
  category: string
  quantity: number
  quantity_min: number
  quantity_max: number
  inventory_item_id: string
  drop_seed: string
  qty_seed: string
}

export interface GachaKeyConsumed {
  item_definition_id: string
  quantity: number
}

export interface GachaTransaction {
  id: string
  studio_id: string
  game_id: string
  user_id: string
  idempotency_key: string
  pack_definition_id?: string
  pack_name?: string
  items_granted: GachaItemGranted[]
  keys_consumed: GachaKeyConsumed[]
  request_id: string
  client_ip: string
  user_agent: string
  created_at: string
}

export interface GachaTransactionsResult {
  limit: number
  offset: number
  profile_id: string
  total: number
  transactions: GachaTransaction[]
  user_id: string
}

export async function getGachaTransactions(
  progressId: string,
  params?: { limit?: number; offset?: number },
): Promise<GachaTransactionsResult> {
  const qs = new URLSearchParams()
  if (params?.limit  != null) qs.set("limit",  String(params.limit))
  if (params?.offset != null) qs.set("offset", String(params.offset))
  const query = qs.toString()
  return api.get(`/api/v1/gamer-progress/${progressId}/gacha/transactions${query ? `?${query}` : ""}`)
}

// ─── Quest History ─────────────────────────────────────────────────────────────

export interface QuestDefinitionSummary {
  id: string
  name: string
  [key: string]: unknown
}

export interface QuestProgressData {
  id: string
  status: string
  progress_data?: Record<string, unknown>
  [key: string]: unknown
}

export interface QuestHistoryStart {
  quest: QuestDefinitionSummary
  progress: QuestProgressData
}

export interface QuestClaimReward {
  [key: string]: unknown
}

export interface QuestHistoryClaim {
  id: string
  quest_definition_id: string
  rewards_granted: QuestClaimReward[]
  claimed_at: string
  quest_definition: QuestDefinitionSummary
}

export interface QuestHistoryResult {
  user_id: string
  starts_total: number
  starts: QuestHistoryStart[]
  claims_total: number
  claims: QuestHistoryClaim[]
  limit: number
  offset: number
}

export async function getPlayerQuestHistory(
  studioId: string,
  gameId: string,
  userId: string,
  params?: { limit?: number; offset?: number },
): Promise<QuestHistoryResult> {
  const qs = new URLSearchParams()
  if (params?.limit  != null) qs.set("limit",  String(params.limit))
  if (params?.offset != null) qs.set("offset", String(params.offset))
  const query = qs.toString()
  return api.get(
    `/api/v1/studios/${studioId}/games/${gameId}/players/${userId}/quest-history${query ? `?${query}` : ""}`
  )
}

// ─── Battle Sessions ──────────────────────────────────────────────────────────

export interface BattleEnemy {
  id: string
  name: string
  alive: boolean
  hp: number
  max_hp: number
  attack: number
  defense: number
  speed: number
  position: number
}

export interface BattlePlayerChar {
  id: string
  name: string
  alive: boolean
  hp: number
  max_hp: number
  mp: number
  attack: number
  defense: number
}

export interface BattleStartData {
  turn: number
  battle_over: boolean
  victory: boolean
  battle_log: string[]
  enemies: BattleEnemy[]
  player_chars: BattlePlayerChar[]
}

export interface BattleEndData {
  victory: boolean
  kills: number
  turns_taken: number
  survival_pct: number
  summary: string
}

export interface BattleSession {
  id: string
  game_id: string
  player_id: string
  studio_id: string
  status: string
  started_at: string
  expires_at: string
  ended_at: string | null
  start_data: BattleStartData
  end_data: BattleEndData | null
}

export interface BattleSessionsResult {
  limit: number
  offset: number
  total: number
  sessions: BattleSession[]
}

export async function getBattleSessions(
  gameId: string,
  playerId: string,
  params?: { limit?: number; offset?: number },
): Promise<BattleSessionsResult> {
  const qs = new URLSearchParams()
  if (params?.limit  != null) qs.set("limit",  String(params.limit))
  if (params?.offset != null) qs.set("offset", String(params.offset))
  const query = qs.toString()
  return api.get(`/api/v1/games/${gameId}/players/${playerId}/battle-sessions${query ? `?${query}` : ""}`)
}

// ─── Journey Sessions ─────────────────────────────────────────────────────────

export interface JourneySession {
  session_id: string
  started_at: string
  ended_at: string | null
  event_count: number
}

export interface JourneySessionsResult {
  game_id: string
  user_id: string
  from: string | null
  to: string | null
  limit: number
  offset: number
  total: number
  sessions: JourneySession[]
}

export async function getJourneySessions(
  gameId: string,
  userId: string,
  params?: { limit?: number; offset?: number; from?: string; to?: string },
): Promise<JourneySessionsResult> {
  const qs = new URLSearchParams()
  if (params?.limit  != null) qs.set("limit",  String(params.limit))
  if (params?.offset != null) qs.set("offset", String(params.offset))
  if (params?.from)           qs.set("from",   params.from)
  if (params?.to)             qs.set("to",     params.to)
  const query = qs.toString()
  return api.get(`/api/v1/games/${gameId}/players/${userId}/sessions${query ? `?${query}` : ""}`)
}

export interface JourneyEvent {
  id: string
  game_id: string
  user_id: string
  event_type: string
  event_data: Record<string, unknown> | null
  session_id: string
  occurred_at: string
}

export interface JourneyEventsResult {
  game_id: string
  session_id: string
  limit: number
  offset: number
  total: number
  events: JourneyEvent[]
}

export async function getJourneySessionEvents(
  gameId: string,
  sessionId: string,
  params?: { limit?: number; offset?: number },
): Promise<JourneyEventsResult> {
  const qs = new URLSearchParams()
  if (params?.limit  != null) qs.set("limit",  String(params.limit))
  if (params?.offset != null) qs.set("offset", String(params.offset))
  const query = qs.toString()
  return api.get(`/api/v1/games/${gameId}/sessions/${sessionId}/events${query ? `?${query}` : ""}`)
}

// ─── Player Equipped Items ────────────────────────────────────────────────────

export interface PlayerEquippedItem {
  slot_key: string
  slot_name: string
  item_id: string
  item_definition_id: string
  item_name: string
  category: string
  rarity: string
  slot_data: Record<string, unknown>
}

export interface PlayerEquippedResult {
  equipped: PlayerEquippedItem[]
}

/** GET /api/v1/games/:gameId/players/:progressId/equipped */
export async function getPlayerEquipped(
  gameId: string,
  progressId: string,
): Promise<PlayerEquippedResult> {
  return api.get(`/api/v1/games/${gameId}/players/${progressId}/equipped`)
}
