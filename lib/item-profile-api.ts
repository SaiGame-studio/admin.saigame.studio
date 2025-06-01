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
  stackable?: boolean
  create_on_registry?: boolean
  amount_on_registry?: number
  description?: string
  game_id?: string
  inventory_profile_id?: string
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

export async function updateItemProfile(profileId: string, updateData: { 
  name?: string; 
  code_name?: string; 
  type?: string; 
  status?: string;
  level_start?: number; 
  level_max?: number; 
  stack_limit?: number; 
  stackable?: boolean | number;
  create_on_registry?: boolean | number;
  amount_on_registry?: number;
  description?: string;
  custom_data?: Record<string, any> 
}) {
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
    throw { message: error.message || `Failed to update item profile: ${res.status}`, hints: error.hints || [] }
  }
  const data = await res.json()
  return data.data
}

export async function updateItemProfileCustomData(profileId: string, customData: Record<string, any>) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/item-profiles/${profileId}/custom-data`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(customData),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to update custom data: ${res.status}`, hints: error.hints || [] }
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

export async function updateItemProfileStatus(profileId: string, status: string) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/item-profiles/${profileId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to update item profile status: ${res.status}`, hints: error.hints || [] }
  }
  const data = await res.json()
  return data.data
}

// Inventory API functions
export async function getInventoryItemProfiles(inventoryProfileId: string): Promise<ItemProfile[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/inventories/${inventoryProfileId}/item-profiles`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to fetch inventory item profiles: ${res.status}`)
  }
  const data: ApiResponse<ItemProfile[]> = await res.json()
  return data.data || []
}

export async function addItemToInventory(inventoryProfileId: string, itemProfileIds: string[]) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/inventories/${inventoryProfileId}/item-profiles`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      add: itemProfileIds,
      remove: []
    }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to add items to inventory: ${res.status}`, hints: error.hints || [] }
  }
  const data = await res.json()
  return data.data
}

export async function removeItemFromInventory(inventoryProfileId: string, itemProfileIds: string[]) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/inventories/${inventoryProfileId}/item-profiles`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      add: [],
      remove: itemProfileIds
    }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to remove items from inventory: ${res.status}`, hints: error.hints || [] }
  }
  const data = await res.json()
  return data.data
}

// Get all inventory profiles for a game
export async function getGameInventoryProfiles(gameId: string): Promise<ItemProfile[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  // Get all item profiles for the game and filter for inventory type
  const allItems = await fetchGameItemProfiles(gameId)
  return allItems.filter(item => item.type === 'inventory')
} 