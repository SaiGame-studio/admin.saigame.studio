const TIMEZONE_KEY = 'user_timezone'

/**
 * Returns the effective timezone: user's saved timezone > browser local
 */
export function getUserTimezone(): string {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(TIMEZONE_KEY) : null
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}

/**
 * Formats a Unix timestamp (seconds) to DD/MM/YYYY HH:mm:ss in the user's timezone.
 */
export function formatTimestamp(timestamp: number, timeZone?: string): string {
  const tz = timeZone ?? getUserTimezone()
  const date = new Date(timestamp * 1000)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const p: Record<string, string> = {}
  for (const { type, value } of parts) p[type] = value
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`
}