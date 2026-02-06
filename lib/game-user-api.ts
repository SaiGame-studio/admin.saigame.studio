import { api } from "@/lib/api-client"

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

// Ban a player progress
export async function banProgress(progressId: string): Promise<void> {
  await api.post(`/api/v1/gamer-progress/${progressId}/ban`, {})
}

// Unban a player progress
export async function unbanProgress(progressId: string): Promise<void> {
  await api.post(`/api/v1/gamer-progress/${progressId}/unban`, {})
} 