export interface GameGiftCode {
  id: string
  game_id: string
  code: string
  gacha_pack_ids: string[]
  max_uses: number
  used_count: number
  expires_at: string | null
  active_at: string | null
  is_active: boolean
  description: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface GameGiftCodeRedemption {
  id: string
  game_gift_code_id: string
  user_id: string
  email?: string
  display_name?: string
  redeemed_at: string
}

export interface GameGiftCodePage {
  game_gift_codes: GameGiftCode[]
  total: number
  limit: number
  offset: number
}

export interface GameGiftCodeRedemptionPage {
  redemptions: GameGiftCodeRedemption[]
  total: number
  limit: number
  offset: number
}

export interface CreateGameGiftCodeRequest {
  code: string
  gacha_pack_ids: string[]
  max_uses: number
  expires_at?: string | null
  active_at?: string | null
  description: string
}

export interface UpdateGameGiftCodeRequest {
  code?: string
  gacha_pack_ids?: string[]
  max_uses?: number
  expires_at?: string | null
  active_at?: string | null
  description?: string
}
