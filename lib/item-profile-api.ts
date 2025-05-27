import { ApiResponse } from "@/types/game"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface ItemProfile {
  id: string
  name: string
  code_name: string
  status: string
  type: string
  level_start: number
  level_max: number
  stack_limit: number
  custom_data: Record<string, any>
  updated_at: number
  created_at: number
}

export async function fetchGameItemProfiles(gameId: string): Promise<ItemProfile[]> {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("Authentication required")
  }

  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/games/${gameId}/item-profiles`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error("Failed to fetch item profiles")
  const data: ApiResponse<ItemProfile[]> = await res.json()
  return data.data || []
}

export async function createItemProfile(gameId: string, profileData: { name: string; code_name?: string; type?: string; level_start?: number; level_max?: number; stack_limit?: number; custom_data?: Record<string, any> }) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/games/${gameId}/item-profiles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(profileData),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to create item profile: ${res.status}`, hints: error.hints || [] }
  }
  const data = await res.json()
  return data.data
}

export async function fetchItemProfile(profileId: string): Promise<ItemProfile> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/item-profiles/${profileId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error("Failed to fetch item profile")
  const data: ApiResponse<ItemProfile> = await res.json()
  return data.data
}

export async function updateItemProfile(profileId: string, updateData: { name?: string; code_name?: string; type?: string; level_start?: number; level_max?: number; stack_limit?: number; custom_data?: Record<string, any> }) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/item-profiles/${profileId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(updateData),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to update item profile: ${res.status}`)
  }
  const data = await res.json()
  return data.data
}

export async function deleteItemProfile(profileId: string) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/item-profiles/${profileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to delete item profile: ${res.status}`)
  }
  return true
} 