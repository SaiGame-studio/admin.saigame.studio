export interface Game {
  id: string
  name: string
  status: GameStatus
  shop_count: number
  updated_at: number
  created_at: number
}

export type GameStatus = "released" | "beta" | "alpha" | "development" | "archived"

export interface ApiResponse<T> {
  status: string
  message: string
  message_code: string
  data: T
}
