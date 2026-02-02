import type {ApiResponse, Game} from "@/types/game"
import { api } from "@/lib/api-client"

// Get all games for a specific studio
export async function getStudioGames(studioId: string, limit: number = 50, offset: number = 0): Promise<Game[]> {
    const data = await api.get(`/api/v1/studios/${studioId}/games?limit=${limit}&offset=${offset}`)
    return Array.isArray(data) ? data : []
}

// Get a specific game by ID
export async function getGame(gameId: string): Promise<Game> {
    return await api.get(`/api/v1/games/${gameId}`)
}

// Create a new game for a studio
export async function createGame(
    studioId: string,
    gameData: { 
        name: string
        description?: string
        game_type?: string
        config?: {
            max_players?: number
            server_region?: string
            [key: string]: any
        }
    }
): Promise<Game> {
    // Set default values
    const requestData = {
        name: gameData.name,
        description: gameData.description || "",
        game_type: gameData.game_type || "idle",
        config: gameData.config || {
            max_players: 1000,
            server_region: "us-west"
        }
    }

    return await api.post(`/api/v1/studios/${studioId}/games`, requestData)
}

// Update an existing game
export async function updateGame(
    gameId: string,
    gameData: { 
        name?: string
        description?: string
        is_active?: boolean
        status?: string
        config?: {
            max_players?: number
            server_region?: string
            [key: string]: any
        }
    }
): Promise<Game> {
    return await api.patch(`/api/v1/games/${gameId}`, gameData)
}

// Get all games (across all studios)
export async function getAllGames(): Promise<Game[]> {
    const data = await api.get("/api/games")
    return data.data || data || []
}

// Lấy tất cả item profiles của 1 game
export async function fetchGameItemProfiles(gameId: string, params?: Record<string, string>): Promise<any[]> {
    let query = '';
    if (params) {
        query = '?' + new URLSearchParams(params).toString();
    }
    const data = await api.get(`/api/games/${gameId}/item-profiles${query}`);
    return data.data || [];
}

/**
 * Deletes a game by ID
 */
export async function deleteGame(gameId: string): Promise<void> {
    await api.delete(`/api/v1/games/${gameId}`)
}
