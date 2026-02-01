import type {ApiResponse, Studio} from "@/types/studio"
import type {Game} from "@/types/game"
import type {Team} from "@/types/team"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Fetches all studios for the current user
 */
export async function fetchUserStudios(): Promise<Studio[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/studios/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch studios: ${response.status}`)
    }

    const data = await response.json()
    // API trả về trực tiếp array của studios, không có wrapper data
    return Array.isArray(data) ? data : []
}

/**
 * Fetches a single studio by ID
 */
export async function fetchStudio(id: string): Promise<Studio> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/studios/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch studio: ${response.status}`)
    }

    const data = await response.json()
    // API trả về trực tiếp studio object
    return data
}

/**
 * Creates a new studio
 */
export async function createStudio(studioData: { name: string }): Promise<Studio> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/studios`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(studioData),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to create studio: ${response.status}`)
    }

    const data = await response.json()
    // API trả về trực tiếp studio object
    return data
}

/**
 * Updates an existing studio
 */
export async function updateStudio(id: string, studioData: { name?: string }): Promise<Studio> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/studios/${id}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(studioData),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to update studio: ${response.status}`)
    }

    const data: ApiResponse<Studio> = await response.json()
    return data.data
}

/**
 * Creates a new game for a studio
 */
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
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

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
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to create game: ${response.status}`)
    }

    const data = await response.json()
    return data
}

/**
 * Fetches all games for a specific studio
 */
export async function fetchStudioGames(studioId: string): Promise<Game[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/games`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch studio games: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
}

/**
 * Fetches all teams for a specific studio
 */
export async function fetchStudioTeams(studioId: string): Promise<Team[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/v1/studios/${studioId}/teams`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to fetch studio teams: ${response.status}`)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
}
