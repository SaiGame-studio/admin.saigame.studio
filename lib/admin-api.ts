import { api } from "@/lib/api-client"

export interface AdminUser {
  id: string
  email: string
  username: string
  display_name: string
  is_active: boolean
  is_verified: boolean
  last_login_at: string
  created_at: number
  updated_at: number
}

export interface AdminUsersResult {
  page: number
  page_size: number
  total_count: number
  users: AdminUser[]
}

/**
 * Get all users (super admin only)
 */
export async function getAllUsersAdmin(params?: {
  email?: string
  username?: string
  display_name?: string
}): Promise<AdminUsersResult> {
  const searchParams = new URLSearchParams({ 
    page: "1",
    page_size: "100" 
  })
  
  if (params?.email) searchParams.set("email", params.email)
  if (params?.username) searchParams.set("username", params.username)
  if (params?.display_name) searchParams.set("display_name", params.display_name)
  
  const data = await api.get(`/api/v1/admin/users?${searchParams.toString()}`)
  return data
}

export interface AdminStudio {
  id: string
  name: string
  description: string
  owner_id: string
  game_count: number
  is_active: boolean
  created_at: number
  updated_at: number
}

export interface AdminStudiosResult {
  count: number
  studios: AdminStudio[]
}

/**
 * Get all studios (super admin only)
 */
export async function getAllStudiosAdmin(params?: {
  name?: string
  sort_by?: string
  sort_order?: string
}): Promise<AdminStudiosResult> {
  const searchParams = new URLSearchParams({
    sort_by: params?.sort_by || "created_at",
    sort_order: params?.sort_order || "desc"
  })
  
  if (params?.name) searchParams.set("name", params.name)
  
  const data = await api.get(`/api/v1/admin/studios?${searchParams.toString()}`)
  return data
}
