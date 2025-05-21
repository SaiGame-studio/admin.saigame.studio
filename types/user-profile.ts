import { Tier } from "./studio"

export interface UserProfile {
  id: string
  tier: Tier
  type: string
  owner_id: number
  updated_at: number
  created_at: number
  studios_count?: number // Optional as it might only exist for developer profiles
}

export interface UserProfilesResponse {
  status: string
  message: string
  message_code: string
  data: UserProfile[]
}
