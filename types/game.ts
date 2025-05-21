export interface Game {
  id: string
  name: string
  status: string
  updated_at: number
  created_at: number
  shop_count: number
  studio_id?: string
}

export interface ApiResponse<T> {
  status: string
  message: string
  message_code: string
  data: T
}
