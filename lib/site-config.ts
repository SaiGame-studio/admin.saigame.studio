/**
 * Gets the website name from environment variables or falls back to a default
 * @returns The website name
 */
export function getWebsiteName(): string {
  return process.env.NEXT_PUBLIC_WEBSITE_NAME || "Sai's Admins"
}
