import { api } from "@/lib/api-client"

export interface AdminUser {
  id: string
  email: string
  username: string
  display_name: string
  is_active: boolean
  is_verified: boolean
  last_login_at: string
  created_at: number
  updated_at: number
}

export interface AdminUsersResult {
  page: number
  page_size: number
  total_count: number
  users: AdminUser[]
}

/**
 * Get all users (super admin only)
 */
export async function getAllUsersAdmin(params?: {
  email?: string
  username?: string
  display_name?: string
}): Promise<AdminUsersResult> {
  const searchParams = new URLSearchParams({ 
    page: "1",
    page_size: "100" 
  })
  
  if (params?.email) searchParams.set("email", params.email)
  if (params?.username) searchParams.set("username", params.username)
  if (params?.display_name) searchParams.set("display_name", params.display_name)
  
  const data = await api.get(`/api/v1/admin/users?${searchParams.toString()}`)
  return data
}

export interface AdminStudio {
  id: string
  name: string
  description: string
  owner_id: string
  game_count: number
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface AdminStudiosResult {
  count: number
  studios: AdminStudio[]
}

/**
 * Get all studios (super admin only)
 */
export async function getAllStudiosAdmin(params?: {
  name?: string
  sort_by?: string
  sort_order?: string
}): Promise<AdminStudiosResult> {
  const searchParams = new URLSearchParams({
    sort_by: params?.sort_by || "created_at",
    sort_order: params?.sort_order || "desc"
  })
  
  if (params?.name) searchParams.set("name", params.name)
  
  const data = await api.get(`/api/v1/admin/studios?${searchParams.toString()}`)
  return data
}

export interface AdminGame {
  id: string
  name: string
  description: string
  studio_id: string
  studio_name?: string
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface AdminGamesResult {
  count: number
  games: AdminGame[]
}

/**
 * Get all games (super admin only)
 */
export async function getAllGamesAdmin(params?: {
  name?: string
  studio_id?: string
  sort_by?: string
  sort_order?: string
}): Promise<AdminGamesResult> {
  const searchParams = new URLSearchParams({
    sort_by: params?.sort_by || "created_at",
    sort_order: params?.sort_order || "desc",
    page: "1",
    page_size: "200",
  })

  if (params?.name) searchParams.set("name", params.name)
  if (params?.studio_id) searchParams.set("studio_id", params.studio_id)

  const data = await api.get(`/api/v1/admin/games?${searchParams.toString()}`)
  return data
}

export interface UserLimits {
  max_studios?: number | null
}

export interface UserLimitsDetail {
  limits: UserLimits
  usage: {
    studios?: number | null
  }
}

/**
 * Get user limits & usage (super admin only)
 */
export async function getUserLimits(userId: string): Promise<UserLimitsDetail> {
  return await api.get(`/api/v1/admin/users/${userId}/limits`)
}

/**
 * Update user limits (super admin only)
 */
export async function updateUserLimits(
  userId: string,
  limits: UserLimits
): Promise<any> {
  return await api.put(`/api/v1/admin/users/${userId}/limits`, { limits })
}

export interface StudioLimits {
  max_games?: number | null
  max_total_members?: number | null
}

export interface GameLimits {
  max_player_profiles?: number | null
  max_concurrent_users?: number | null
  max_items?: number | null
  max_shops?: number | null
}

export interface StudioLimitsDetail {
  limits: StudioLimits
  usage: {
    game_count?: number | null
  }
}

export interface GameLimitsDetail {
  limits: GameLimits
  usage: {
    player_profile_count?: number | null
    concurrent_users?: number | null
  }
}

/**
 * Get studio limits & usage (super admin only)
 */
export async function getStudioLimits(studioId: string): Promise<StudioLimitsDetail> {
  return await api.get(`/api/v1/admin/studios/${studioId}/limits`)
}

/**
 * Get game limits & usage (super admin only)
 */
export async function getGameLimitsDetail(gameId: string): Promise<GameLimitsDetail> {
  return await api.get(`/api/v1/admin/games/${gameId}/limits`)
}

/**
 * Update studio limits (super admin only)
 */
export async function updateStudioLimits(
  studioId: string,
  limits: StudioLimits
): Promise<any> {
  return await api.put(`/api/v1/admin/studios/${studioId}/limits`, { limits })
}

/**
 * Update game limits (super admin only)
 */
export async function updateGameLimits(
  gameId: string,
  limits: GameLimits
): Promise<any> {
  return await api.put(`/api/v1/admin/games/${gameId}/limits`, { limits })
}
