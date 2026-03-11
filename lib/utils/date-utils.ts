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
export function formatTimestamp(timestamp: number | null | undefined, timeZone?: string): string {
  if (timestamp == null || !Number.isFinite(timestamp) || timestamp <= 0) return '-'
  const tz = timeZone ?? getUserTimezone()
  const date = new Date(timestamp * 1000)
  if (isNaN(date.getTime())) return '-'
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

/**
 * Formats an ISO date string to DD/MM/YYYY HH:mm:ss in the user's timezone.
 */
export function formatISODate(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '-'
  const tz = timeZone ?? getUserTimezone()
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

/**
 * Converts a UTC ISO string to a datetime-local input value (yyyy-MM-ddTHH:mm)
 * in the user's timezone.
 */
export function toUserDatetime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const tz = getUserTimezone()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const p: Record<string, string> = {}
  for (const { type, value } of parts) p[type] = value
  const h = p.hour === '24' ? '00' : p.hour
  return `${p.year}-${p.month}-${p.day}T${h}:${p.minute}`
}

/**
 * Converts a datetime-local input value (interpreted as user's timezone) back to
 * a UTC ISO string for storage.
 */
export function fromUserDatetime(localDt: string): string {
  if (!localDt) return ''
  const tz = getUserTimezone()
  const [datePart, timePart = '00:00'] = localDt.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, m] = timePart.split(':').map(Number)
  // Start with initial UTC guess
  let utcMs = Date.UTC(y, mo - 1, d, h, m)
  // Iteratively correct for timezone offset (converges in 1-2 iterations)
  for (let i = 0; i < 3; i++) {
    const probe = new Date(utcMs)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(probe)
    const p: Record<string, string> = {}
    for (const { type, value } of parts) p[type] = value
    const localH = p.hour === '24' ? 0 : parseInt(p.hour)
    const localM = parseInt(p.minute)
    const probeLocal = Date.UTC(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day), localH, localM)
    const target = Date.UTC(y, mo - 1, d, h, m)
    const diff = target - probeLocal
    if (diff === 0) break
    utcMs += diff
  }
  return new Date(utcMs).toISOString()
}

/**
 * Returns a short relative time string: "3 minutes ago", "in 2 days", etc.
 */
export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const diffMs = d.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const isFuture = diffMs > 0

  let str: string
  if (abs < 60_000) {
    str = 'just now'
  } else if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000)
    str = `${m} minute${m !== 1 ? 's' : ''}`
  } else if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000)
    str = `${h} hour${h !== 1 ? 's' : ''}`
  } else if (abs < 30 * 86_400_000) {
    const days = Math.round(abs / 86_400_000)
    str = `${days} day${days !== 1 ? 's' : ''}`
  } else if (abs < 365 * 86_400_000) {
    const mo = Math.round(abs / (30 * 86_400_000))
    str = `${mo} month${mo !== 1 ? 's' : ''}`
  } else {
    const y = Math.round(abs / (365 * 86_400_000))
    str = `${y} year${y !== 1 ? 's' : ''}`
  }

  if (str === 'just now') return str
  return isFuture ? `in ${str}` : `${str} ago`
}

/**
 * Returns the current hour (0-23) in the user's timezone.
 */
export function getUserLocalHour(): number {
  const tz = getUserTimezone()
  const h = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(new Date()),
    10
  )
  return h % 24
}