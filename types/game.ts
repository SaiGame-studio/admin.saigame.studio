export interface Game {
  id: string
  name: string
  status: string
  updated_at: number
  created_at: number
  shop_count: number
  studio_id?: string
  tier?: string
  studio?: {
    id: string
    name: string
    tier: string
    games_count: number
    user_profile_id: string
    updated_at: number
    created_at: number
  }
  total_player?: number
}

export interface ApiResponse<T> {
  status: string
  message: string
  message_code: string
  data: T
}

export enum GameStatus {
  Development = "development",
  Alpha = "alpha",
  Beta = "beta",
  Released = "released",
  Archived = "archived"
}
