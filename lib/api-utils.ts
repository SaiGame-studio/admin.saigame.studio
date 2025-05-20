/**
 * Gets the full API URL by combining the base API URL from environment variables
 * with the provided endpoint path
 *
 * @param endpoint - The API endpoint path (e.g., "/api/login")
 * @returns The complete API URL
 * @throws Error if NEXT_PUBLIC_API_URL is not defined
 */
export function getApiUrl(endpoint: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (!apiUrl) {
    throw new Error("API URL is not configured. Please set the NEXT_PUBLIC_API_URL environment variable.")
  }

  // Ensure endpoint starts with a slash
  const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`

  // Ensure no double slashes when combining
  const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl

  return `${baseUrl}${formattedEndpoint}`
}
