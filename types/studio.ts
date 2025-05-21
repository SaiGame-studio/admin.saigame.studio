export interface Studio {
  id: string
  name: string
  tier: string
  games_count: number
  user_profile_id: string
  updated_at: number
  created_at: number
}

export interface ApiResponse<T> {
  status: string
  message: string
  message_code: string
  data: T
}
