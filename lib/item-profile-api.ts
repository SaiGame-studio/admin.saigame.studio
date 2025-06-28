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

export async function updateItemProfileStatus(itemProfileId: string, status: string): Promise<ItemProfile> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/item-profiles/${itemProfileId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error("Failed to update item profile status")
  const data: ApiResponse<ItemProfile> = await res.json()
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

export interface LootboxItem {
  item_id: string
  quantity: number
}

export interface LootboxItemDetail {
  loot_box_fixed_id: string
  item_profile_id: string
  quantity: number
  game_id: string
  created_at: number
  updated_at: number
  item_profile: {
    id: string
    name: string
    code_name: string
    type: string
    status: string
    level_start: number
    level_max: number
    stackable: number
    stack_limit: number
    create_on_registry: number
    amount_on_registry: number
    custom_data: any
    game_id: string
    updated_at: number
    created_at: number
  }
}

export interface UpdateLootboxRequest {
  add: LootboxItem[]
  remove: string[]
}

/**
 * Fetch all items in a fixed loot box
 */
export async function fetchFixedLootboxItems(lootboxProfileId: string): Promise<LootboxItemDetail[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  const res = await fetch(`${API_URL}/api/loot-box-fixed/${lootboxProfileId}/item-profiles`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  
  if (!res.ok) throw new Error("Failed to fetch loot box items")
  
  const data: ApiResponse<LootboxItemDetail[]> = await res.json()
  return data.data
}

/**
 * Update loot box items (add/remove)
 */
export async function updateLootboxItems(lootboxProfileId: string, request: UpdateLootboxRequest): Promise<any> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  const res = await fetch(`${API_URL}/api/loot-box-fixed/${lootboxProfileId}/item-profiles`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })
  
  if (!res.ok) throw new Error("Failed to update loot box items")
  
  const data: ApiResponse<any> = await res.json()
  return data.data
}

export interface ItemProperty {
  id?: string
  name: string
  type: string
  value: any
  description?: string
  is_active: boolean
  is_visible: boolean
  metadata?: Record<string, any>
  item_profile_id?: string
  created_at?: number
  updated_at?: number
}

export interface CreatePropertyRequest {
  name: string
  type: string
  value: any
  description?: string
  is_active: boolean
  is_visible: boolean
  metadata?: Record<string, any>
}

export interface UpdatePropertyRequest {
  name?: string
  type?: string
  value?: any
  description?: string
  is_active?: boolean
  is_visible?: boolean
  metadata?: Record<string, any>
}

/**
 * Fetch all properties for an item profile
 */
export async function getItemProfileProperties(itemProfileId: string): Promise<ItemProperty[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  const res = await fetch(`${API_URL}/api/item-profiles/${itemProfileId}/properties`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to fetch item profile properties: ${res.status}`)
  }
  
  const data: ApiResponse<ItemProperty[]> = await res.json()
  return data.data || []
}

/**
 * Create a new property for an item profile
 */
export async function createItemProfileProperty(itemProfileId: string, propertyData: CreatePropertyRequest): Promise<ItemProperty> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  const res = await fetch(`${API_URL}/api/item-profiles/${itemProfileId}/properties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(propertyData),
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to create property: ${res.status}`, hints: error.hints || [] }
  }
  
  const data: ApiResponse<ItemProperty> = await res.json()
  return data.data
}

/**
 * Update an existing property
 */
export async function updateItemProfileProperty(itemProfileId: string, propertyId: string, propertyData: UpdatePropertyRequest): Promise<ItemProperty> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  const res = await fetch(`${API_URL}/api/item-profiles/${itemProfileId}/properties/${propertyId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(propertyData),
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw { message: error.message || `Failed to update property: ${res.status}`, hints: error.hints || [] }
  }
  
  const data: ApiResponse<ItemProperty> = await res.json()
  return data.data
}

/**
 * Delete a property
 */
export async function deleteItemProfileProperty(itemProfileId: string, propertyId: string): Promise<boolean> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  
  const res = await fetch(`${API_URL}/api/item-profiles/${itemProfileId}/properties/${propertyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to delete property: ${res.status}`)
  }
  
  return true
} 