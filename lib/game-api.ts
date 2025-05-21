import type { ApiResponse, Game } from "@/types/game"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

// Get all games for a specific studio
export async function getStudioGames(studioId: string, token: string): Promise<Game[]> {
  try {
    const response = await fetch(`${API_URL}/studios/${studioId}/games`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Error fetching studio games: ${response.status}`)
    }

    const data: ApiResponse<Game[]> = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Failed to fetch studio games:", error)
    throw error
  }
}

// Get a specific game by ID
export async function getGame(gameId: string, token: string): Promise<Game> {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Error fetching game: ${response.status}`)
    }

    const data: ApiResponse<Game> = await response.json()
    return data.data
  } catch (error) {
    console.error("Failed to fetch game:", error)
    throw error
  }
}

// Create a new game for a studio
export async function createGame(
  studioId: string,
  gameData: { name: string; status: string },
  token: string,
): Promise<Game> {
  try {
    const response = await fetch(`${API_URL}/studios/${studioId}/games`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(gameData),
    })

    if (!response.ok) {
      throw new Error(`Error creating game: ${response.status}`)
    }

    const data: ApiResponse<Game> = await response.json()
    return data.data
  } catch (error) {
    console.error("Failed to create game:", error)
    throw error
  }
}

// Update an existing game
export async function updateGame(
  gameId: string,
  gameData: { name: string; status: string },
  token: string,
): Promise<Game> {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      method: "PUT",
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

    const data: ApiResponse<Game> = await response.json()
    return data.data
  } catch (error) {
    console.error("Failed to update game:", error)
    throw error
  }
}

// Get all games (across all studios)
export async function getAllGames(token: string): Promise<Game[]> {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("Authentication required")
  }

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
