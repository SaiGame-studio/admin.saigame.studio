export enum Tier {
  EducationTier = "Education Tier",
  IndieStudio = "Indie Studio",
  MidCoreStudio = "Mid-Core Studio",
  AaaStudio = "AAA Studio"
}

export interface StudioLimits {
  max_games: number
  max_teams: number
  max_total_members: number
}

export interface StudioUsage {
  games: number
  teams: number
  total_members: number
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
  activated_at?: string | null   // null = not activated; set = plugin-ready
  updated_at: number
  created_at: number
  limits?: StudioLimits
  usage?: StudioUsage
}

export interface ApiResponse<T> {
  status: string
  message: string
  message_code: string
  data: T
}
