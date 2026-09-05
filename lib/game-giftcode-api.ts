import { api } from '@/lib/api-client'
import type {
  GameGiftCode,
  GameGiftCodePage,
  GameGiftCodeRedemptionPage,
  CreateGameGiftCodeRequest,
  UpdateGameGiftCodeRequest
} from '@/types/game-giftcode'

export async function listGameGiftCodes(
  gameId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GameGiftCodePage> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())
  
  return api.get<GameGiftCodePage>(`/api/v1/games/${gameId}/gift-codes?${params.toString()}`)
}

export async function getGameGiftCode(gameId: string, id: string): Promise<GameGiftCode> {
  return api.get<GameGiftCode>(`/api/v1/games/${gameId}/gift-codes/${id}`)
}

export async function createGameGiftCode(
  gameId: string,
  req: CreateGameGiftCodeRequest
): Promise<GameGiftCode> {
  return api.post<GameGiftCode>(`/api/v1/games/${gameId}/gift-codes`, req)
}

export async function updateGameGiftCode(
  gameId: string,
  id: string,
  req: UpdateGameGiftCodeRequest
): Promise<GameGiftCode> {
  return api.put<GameGiftCode>(`/api/v1/games/${gameId}/gift-codes/${id}`, req)
}

export async function deleteGameGiftCode(gameId: string, id: string): Promise<void> {
  return api.delete(`/api/v1/games/${gameId}/gift-codes/${id}`)
}

export async function listGameGiftCodeRedemptions(
  gameId: string,
  id: string,
  limit: number = 50,
  offset: number = 0
): Promise<GameGiftCodeRedemptionPage> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())
  
  return api.get<GameGiftCodeRedemptionPage>(
    `/api/v1/games/${gameId}/gift-codes/${id}/redemptions?${params.toString()}`
  )
}
