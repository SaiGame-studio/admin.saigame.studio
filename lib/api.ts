import { api } from "@/lib/api-client"

/**
 * Fetches user profile data from the API
 * @returns Promise with user data
 */
export async function fetchUserProfile() {
  return await api.get("/api/v1/auth/me")
}

/**
 * Fetches user profiles (developer/player) from the API
 * @returns Promise with user profiles data
 */
export async function fetchUserProfiles() {
  return await api.get("/api/user/profiles")
}

/**
 * Formats a timestamp to a readable date
 * @param timestamp Unix timestamp
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
