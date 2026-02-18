import { api } from "@/lib/api-client"
import { safeGetItem, safeSetItem } from "@/lib/storage-utils"
import { getAllUsersAdmin } from "@/lib/admin-api"

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
  seed?: Array<{ user_id: string; user_display_name?: string; user_email?: string }>
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
      const adminUsers = await getAllUsersAdmin()
      const userMap = new Map(adminUsers.users.map((user) => [user.id, user]))

      for (const userId of missingUserIds) {
        const user = userMap.get(userId)
        const identity = buildIdentityFallback(userId, user?.display_name || user?.username, user?.email)
        result[userId] = identity
        cache[userId] = identity
      }
    } catch (error) {
      for (const userId of missingUserIds) {
        result[userId] = buildIdentityFallback(userId)
      }
      console.error("Failed to fetch player identities from admin endpoint", error)
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