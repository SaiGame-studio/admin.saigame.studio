import type { UserProfilesResponse, UserProfile } from "@/types/user-profile"

/**
 * Fetches player profiles (all players across user's studios)
 * @param perPage Number of profiles per page (default 50)
 * @returns Promise with array of UserProfile
 */
export async function fetchPlayerProfiles(perPage: number = 50): Promise<any[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  }

  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.")
  }

  const response = await fetch(`${apiUrl}/api/studios/users/profiles?per_page=${perPage}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch player profiles: ${response.status}`)
  }

  const data = await response.json()
  // Drill down to the actual profiles array (now each item has user_profile, game, studio)
  return data.data.data || []
}
