import type { UserProfilesResponse } from "@/types/user-profile"

/**
 * Fetches user profiles from the API
 * @returns Promise with user profiles data
 */
export async function fetchUserProfiles(): Promise<UserProfilesResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  }

  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.")
  }

  const response = await fetch(`${apiUrl}/api/user/profiles`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch user profiles: ${response.status}`)
  }

  return response.json()
}
