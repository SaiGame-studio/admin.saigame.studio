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
}

// Lấy danh sách progress (gamers) của 1 game
export async function getGameProgressList(
  gameId: string,
  params?: { display_name?: string }
): Promise<GameProgress[]> {
  let query = ""
  if (params?.display_name) {
    query = "?" + new URLSearchParams({ display_name: params.display_name }).toString()
  }
  const data = await api.get(`/api/v1/games/${gameId}/progress-list${query}`)
  return data?.progress && Array.isArray(data.progress) ? data.progress : []
} 