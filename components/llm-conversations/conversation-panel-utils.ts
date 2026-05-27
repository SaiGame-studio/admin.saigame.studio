// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
export const LS_PANEL_OPEN = 'ss_conv_panel_open'
export const LS_PANEL_MINIMIZED = 'ss_conv_panel_minimized'
export const LS_PANEL_WIDTH = 'ss_conv_panel_width'
export const LS_SIDEBAR_WIDTH = 'ss_conv_sidebar_width'
export const LS_SIDEBAR_SPLIT = 'ss_conv_sidebar_split'
export const LS_ARCHIVED_COLLAPSED = 'ss_conv_archived_collapsed'
export const lsActiveConv = (gameId: string) => `ss_conv_active_${gameId}`
export const lsConvHistory = (convId: string) => `ss_conv_history_${convId}`
export const lsLoreLinks = (convId: string) => `ss_conv_lore_links_${convId}`
export const lsItemLinks = (convId: string) => `ss_conv_item_links_${convId}`

// ---------------------------------------------------------------------------
// Panel dimensions
// ---------------------------------------------------------------------------
export const PANEL_MIN_WIDTH = 320
export const PANEL_MAX_WIDTH = 1200
export const PANEL_DEFAULT_WIDTH = 380

// ---------------------------------------------------------------------------
// Sidebar dimensions
// ---------------------------------------------------------------------------
export const SIDEBAR_MIN_WIDTH = 100
export const SIDEBAR_MAX_WIDTH = 500
export const SIDEBAR_DEFAULT_WIDTH = 140

// ---------------------------------------------------------------------------
// Split dimensions
// ---------------------------------------------------------------------------
export const SPLIT_MIN = 60
export const SPLIT_DEFAULT = 180

// ---------------------------------------------------------------------------
// Helper to extract game_id from pathname "/games/[id]/..."
// ---------------------------------------------------------------------------
export function extractGameId(pathname: string): string | null {
  const match = pathname.match(/^\/games\/([^/]+)/)
  return match ? match[1] : null
}

// ---------------------------------------------------------------------------
// Parse title= / summary= lines from the top of a lore building response.
// Returns { title, summary, content } where content is everything after those lines.
// ---------------------------------------------------------------------------
export function parseLoreResponse(text: string): { title: string; summary: string; content: string } {
  let remaining = text
  let title = ''
  let summary = ''

  const titleMatch = remaining.match(/^title=(.+?)(?:\r?\n|$)/m)
  if (titleMatch) {
    title = titleMatch[1].trim()
    remaining = remaining.slice(remaining.indexOf(titleMatch[0]) + titleMatch[0].length)
  }

  const summaryMatch = remaining.match(/^summary=(.+?)(?:\r?\n|$)/m)
  if (summaryMatch) {
    summary = summaryMatch[1].trim()
    remaining = remaining.slice(remaining.indexOf(summaryMatch[0]) + summaryMatch[0].length)
  }

  return { title, summary, content: remaining.trim() }
}

// ---------------------------------------------------------------------------
// Parse generated items from item_generation response text.
// Supports raw JSON arrays, JSON objects with items/generated_items, and
// fenced code blocks containing JSON.
// ---------------------------------------------------------------------------
export function parseGeneratedItemsResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_items)) return record.generated_items
        if (Array.isArray(record.items)) return record.items
      }
    } catch {
      // ignore parse failures
    }
    return null
  }

  // 1) Parse full response directly.
  const direct = tryParse(trimmed)
  if (direct) return direct

  // 2) Parse fenced code blocks first (```json ... ``` or ``` ... ```).
  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) return parsed
  }

  // 3) Parse first JSON array substring.
  const arrayCandidate = trimmed.match(/\[[\s\S]*\]/)
  if (arrayCandidate) {
    const parsed = tryParse(arrayCandidate[0])
    if (parsed) return parsed
  }

  // 4) Parse first JSON object substring.
  const objectCandidate = trimmed.match(/\{[\s\S]*\}/)
  if (objectCandidate) {
    const parsed = tryParse(objectCandidate[0])
    if (parsed) return parsed
  }

  return []
}

