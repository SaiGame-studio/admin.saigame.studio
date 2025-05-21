import type {ApiResponse, Studio} from "@/types/studio"
import type {Game} from "@/types/game"

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Fetches all studios for the current user
 */
export async function fetchUserStudios(): Promise<Studio[]> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/user/studios`, {
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

    const data: ApiResponse<Studio[]> = await response.json()
    return data.data
}

/**
 * Fetches a single studio by ID
 */
export async function fetchStudio(id: string): Promise<Studio> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/studios/${id}`, {
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

    const data: ApiResponse<Studio> = await response.json()
    return data.data
}

/**
 * Creates a new studio
 */
export async function createStudio(studioData: { name: string }): Promise<Studio> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/studios`, {
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

    const data: ApiResponse<Studio> = await response.json()
    return data.data
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
export async function createGame(studioId: string, gameData: { name: string; status?: string }): Promise<Game> {
    const token = localStorage.getItem("token")

    if (!token) {
        throw new Error("Authentication required")
    }

    const response = await fetch(`${API_URL}/api/studios/${studioId}/games`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(gameData),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || `Failed to create game: ${response.status}`)
    }

    const data = await response.json()
    return data.data
}

/**
 * Formats a timestamp to a readable date
 */
export function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
}
