import { api } from "@/lib/api-client"
import { getUserTimezone } from "@/lib/utils/date-utils"

/**
 * Fetches user profile data from the API
 * @returns Promise with user data
 */
export async function fetchUserProfile() {
  return await api.get("/api/v1/auth/me")
}

/**
 * Updates the current user's timezone
 */
export async function updateUserTimezone(timezone: string) {
  return await api.patch("/api/v1/me/timezone", { timezone })
}

/**
 * Fetches user profiles (developer/player) from the API
 * @returns Promise with user profiles data
 */
export async function fetchUserProfiles() {
  return await api.get("/api/user/profiles")
}

/**
 * Updates the current user's display name
 */
export async function updateDisplayName(userId: string, displayName: string) {
  return await api.patch(`/api/v1/users/${userId}/display-name`, { display_name: displayName })
}

/**
 * Formats a millisecond timestamp to a readable date in the user's timezone
 */
export function formatDate(timestamp: number): string {
  const tz = getUserTimezone()
  return new Date(timestamp).toLocaleDateString(undefined, {
    timeZone: tz,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
