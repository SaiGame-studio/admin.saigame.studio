export enum Tier {
  EducationTier = "Education Tier",
  IndieStudio = "Indie Studio",
  MidCoreStudio = "Mid-Core Studio",
  AaaStudio = "AAA Studio"
}

export interface Studio {
  id: string
  name: string
  slug: string
  description?: string
  tier: Tier
  game_count: number
  user_profile_id: string
  owner_user_id: string
  is_active: boolean
  updated_at: number
  created_at: number
}

export interface ApiResponse<T> {
  status: string
  message: string
  message_code: string
  data: T
}
