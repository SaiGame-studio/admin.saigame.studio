export enum Tier {
  EducationTier = "Education Tier",
  IndieStudio = "Indie Studio",
  MidCoreStudio = "Mid-Core Studio",
  AaaStudio = "AAA Studio"
}

export interface Studio {
  id: string
  name: string
  tier: Tier
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
