/**
 * Returns the website name from environment variable or falls back to default
 */
export function getWebsiteName(): string {
  return process.env.NEXT_PUBLIC_WEBSITE_NAME || "Sai's Admins"
}
