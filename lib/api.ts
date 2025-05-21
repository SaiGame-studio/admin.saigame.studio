/**
 * Fetches user profile data from the API
 * @returns Promise with user data
 */
export async function fetchUserProfile() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  }

  const token = localStorage.getItem("token")

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.")
  }

  const response = await fetch(`${apiUrl}/api/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to fetch user profile: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetches user profiles (developer/player) from the API
 * @returns Promise with user profiles data
 */
export async function fetchUserProfiles() {
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

/**
 * Formats a timestamp to a readable date
 * @param timestamp Unix timestamp
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
