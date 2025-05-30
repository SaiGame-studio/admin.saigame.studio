import { ApiResponse } from "@/types/game"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface Shop {
  id: string
  name: string
  code_name: string
  description: string
  game_id: string
  updated_at: number
  created_at: number
  currency_id: string
}

export async function fetchGameShops(gameId: string): Promise<Shop[]> {
  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("Authentication required")
  }

  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/games/${gameId}/shops`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error("Failed to fetch shops")
  const data: ApiResponse<Shop[]> = await res.json()
  return data.data || []
}

export async function createShop(gameId: string, shopData: { name: string }, token?: string) {
  token = token || localStorage.getItem("token") || undefined;
  if (!token) throw new Error("Authentication required");
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.");
  const res = await fetch(`${API_URL}/api/games/${gameId}/shops`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(shopData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw { message: error.message || `Failed to create shop: ${res.status}`, hints: error.hints || [] };
  }
  const data = await res.json();
  return data.data;
}

export async function fetchShop(shopId: string) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/shops/${shopId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error("Failed to fetch shop")
  const data = await res.json()
  return data.data
}

export async function updateShop(shopId: string, updateData: { name?: string; currency_id?: string; code_name?: string }) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/shops/${shopId}`, {
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
    throw new Error(error.message || `Failed to update shop: ${res.status}`)
  }
  const data = await res.json()
  return data.data
}

export async function updateShopItemPrice(
  shopId: string,
  itemProfileId: string,
  data: { price_current: number; price_old?: number; currency_id?: string | null }
) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/shops/${shopId}/item-profiles/${itemProfileId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to update item price: ${res.status}`)
  }
  const responseData = await res.json()
  return responseData.data
}

export async function addItemToShop(
  shopId: string,
  itemProfileId: string,
  data: { price_current: number; price_old?: number; currency_id?: string | null }
) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/shops/${shopId}/item-profiles/${itemProfileId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to add item to shop: ${res.status}`)
  }
  const responseData = await res.json()
  return responseData.data
}

export async function removeItemFromShop(
  shopId: string,
  itemProfileId: string
) {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("Authentication required")
  }
  if (!API_URL) throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  const res = await fetch(`${API_URL}/api/shops/${shopId}/item-profiles/${itemProfileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || `Failed to remove item from shop: ${res.status}`)
  }
  return true
} 