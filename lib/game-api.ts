import type {ApiResponse, Game} from "@/types/game"
import Interceptors from "undici-types/interceptors";
import dump = Interceptors.dump;

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Get all games for a specific studio
export async function getStudioGames(studioId: string, limit: number = 50, offset: number = 0): Promise<Game[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/games?limit=${limit}&offset=${offset}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            throw new Error(`Error fetching studio games: ${response.status}`)
        }

        const data = await response.json()
        return Array.isArray(data) ? data : []
    } catch (error) {
        console.error("Failed to fetch studio games:", error)
        throw error
    }
}

// Get a specific game by ID
export async function getGame(gameId: string): Promise<Game> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/games/${gameId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            throw new Error(`Error fetching game: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Failed to fetch game:", error)
        throw error
    }
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
    },
    token: string,
): Promise<Game> {
    try {
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

        const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/games`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(requestData),
        })

        if (!response.ok) {
            // Lấy message chi tiết từ API nếu có
            let errorMessage = `Error creating game: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {}
            throw new Error(errorMessage);
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Failed to create game:", error)
        throw error
    }
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
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }
    
    try {
        const response = await fetch(`${API_URL}/api/v1/games/${gameId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(gameData),
        })

        if (!response.ok) {
            throw new Error(`Error updating game: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Failed to update game:", error)
        throw error
    }
}

// Get all games (across all studios)
export async function getAllGames(): Promise<Game[]> {
    const token = localStorage.getItem("token")

    try {
        // This is a mock implementation since there's no direct API for this
        // In a real app, you might have an endpoint like /api/games or need to fetch from each studio
        const response = await fetch(`${API_URL}/api/games`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            throw new Error(`Error fetching all games: ${response.status}`)
        }

        const data: ApiResponse<Game[]> = await response.json()
        return data.data || []
    } catch (error) {
        console.error("Failed to fetch all games:", error)
        throw error
    }
}

// Lấy tất cả item profiles của 1 game
export async function fetchGameItemProfiles(gameId: string, params?: Record<string, string>): Promise<any[]> {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("Authentication required");
    }
    let query = '';
    if (params) {
        query = '?' + new URLSearchParams(params).toString();
    }
    const response = await fetch(`${API_URL}/api/games/${gameId}/item-profiles${query}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`Error fetching item profiles: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
}
