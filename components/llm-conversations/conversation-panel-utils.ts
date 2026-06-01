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
export const lsPresetLinks = (convId: string) => `ss_conv_preset_links_${convId}`
export const lsLoreTitles = (convId: string) => `ss_conv_lore_titles_${convId}`
export const lsItemNames = (convId: string) => `ss_conv_item_names_${convId}`
export const lsPresetNames = (convId: string) => `ss_conv_preset_names_${convId}`
export const lsScrollPos = (convId: string) => `ss_conv_scroll_${convId}`
export const lsTagApplied = (convId: string) => `ss_conv_tag_applied_${convId}`
export const lsItemTagCreated = (convId: string) => `ss_conv_item_tag_created_${convId}`

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
// Supports raw JSON arrays, JSON objects with items/generated_items, fenced
// code blocks containing JSON, and multiple concatenated JSON objects.
// ---------------------------------------------------------------------------

/** Extract all top-level JSON objects from a string using bracket counting. */
function extractTopLevelJsonObjects(text: string): unknown[] {
  const results: unknown[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        try { results.push(JSON.parse(text.slice(start, i + 1))) } catch { /* ignore */ }
        start = -1
      }
    }
  }
  return results
}

export function parseGeneratedItemsResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeItem = (obj: Record<string, unknown>) =>
    typeof obj.name === 'string' && (obj.category !== undefined || obj.rarity !== undefined || obj.item_code !== undefined)

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        // Filter out non-item entries if it looks like a mixed array
        const items = parsed.filter((el) => el && typeof el === 'object' && looksLikeItem(el as Record<string, unknown>))
        if (items.length > 0) return items
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_items)) return record.generated_items
        if (Array.isArray(record.items)) return record.items
        // Single item object — wrap in array
        if (looksLikeItem(record)) return [record]
      }
    } catch {
      // ignore parse failures
    }
    return null
  }

  // 1) Parse full response directly.
  const direct = tryParse(trimmed)
  if (direct) return direct

  // 2) Collect items from ALL fenced code blocks (```json ... ``` or ``` ... ```).
  //    Each block may contain a single item object or a JSON array. Accumulate all.
  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedItems: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedItems.push(...parsed)
  }
  if (fencedItems.length > 0) return fencedItems

  // 3) Parse first JSON array substring.
  const arrayCandidate = trimmed.match(/\[[\s\S]*\]/)
  if (arrayCandidate) {
    const parsed = tryParse(arrayCandidate[0])
    if (parsed) return parsed
  }

  // 4) Extract all top-level JSON objects scattered across the text
  //    (handles concatenated objects and objects separated by markdown prose).
  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const items = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeItem(el as Record<string, unknown>))
    if (items.length > 0) return items
    if (extracted.length > 1) return extracted
  }

  // 5) Fallback: parse first JSON object substring.
  const objectCandidate = trimmed.match(/\{[\s\S]*\}/)
  if (objectCandidate) {
    const parsed = tryParse(objectCandidate[0])
    if (parsed) return parsed
  }

  return []
}

// ---------------------------------------------------------------------------
// Split item response text into interleaved text/item segments so each item
// block can have its save button rendered immediately after it.
// ---------------------------------------------------------------------------
export type ResponseSegment =
  | { type: 'text'; text: string }
  | { type: 'item'; text: string; item: Record<string, unknown>; itemIdx: number }
  | { type: 'preset'; text: string; preset: Record<string, unknown>; presetIdx: number }
  | { type: 'container'; text: string; container: Record<string, unknown>; containerIdx: number }

export function splitItemResponseSegments(text: string): ResponseSegment[] {
  const looksLikeItem = (obj: Record<string, unknown>) =>
    typeof obj.name === 'string' && (obj.category !== undefined || obj.rarity !== undefined || obj.item_code !== undefined)

  const boundaries: Array<{ start: number; end: number; item: Record<string, unknown> }> = []

  // 1. Fenced code blocks that contain a single item JSON object.
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = fenceRegex.exec(text)) !== null) {
    try {
      const content = m[1].trim()
      let parsed: unknown
      try { parsed = JSON.parse(content) } catch { /* ignore */ }
      if (!parsed) {
        const objMatch = content.match(/\{[\s\S]*\}/)
        if (objMatch) try { parsed = JSON.parse(objMatch[0]) } catch { /* ignore */ }
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeItem(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, item: parsed as Record<string, unknown> })
      }
    } catch { /* ignore */ }
  }

  // 2. If no fenced item blocks found, fall back to bare JSON objects.
  if (boundaries.length === 0) {
    let depth = 0, start = -1, inString = false, escape = false
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') { if (depth === 0) start = i; depth++ }
      else if (ch === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          try {
            const obj = JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>
            if (looksLikeItem(obj)) boundaries.push({ start, end: i + 1, item: obj })
          } catch { /* ignore */ }
          start = -1
        }
      }
    }
  }

  if (boundaries.length === 0) return [{ type: 'text', text }]

  boundaries.sort((a, b) => a.start - b.start)

  const segments: ResponseSegment[] = []
  let lastEnd = 0
  let itemIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({ type: 'item', text: text.slice(boundary.start, boundary.end), item: boundary.item, itemIdx: itemIdx++ })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}

// ---------------------------------------------------------------------------
// Parse generated presets from preset_generation response text.
// Extracts fenced JSON blocks where the object has code_name and preset_type.
// ---------------------------------------------------------------------------

export function parseGeneratedPresetsResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikePreset = (obj: Record<string, unknown>) =>
    typeof obj.code_name === 'string' && typeof obj.preset_type === 'string'

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const presets = parsed.filter((el) => el && typeof el === 'object' && looksLikePreset(el as Record<string, unknown>))
        if (presets.length > 0) return presets
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_presets)) return record.generated_presets
        if (Array.isArray(record.presets)) return record.presets
        if (looksLikePreset(record)) return [record]
      }
    } catch { /* ignore */ }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedPresets: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedPresets.push(...parsed)
  }
  if (fencedPresets.length > 0) return fencedPresets

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const presets = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikePreset(el as Record<string, unknown>))
    if (presets.length > 0) return presets
  }

  return []
}

// ---------------------------------------------------------------------------
// Split preset response text into interleaved text/preset segments so each
// preset block can have its save button rendered immediately after it.
// ---------------------------------------------------------------------------

export function splitPresetResponseSegments(text: string): ResponseSegment[] {
  const looksLikePreset = (obj: Record<string, unknown>) =>
    typeof obj.code_name === 'string' && typeof obj.preset_type === 'string'

  const boundaries: Array<{ start: number; end: number; preset: Record<string, unknown> }> = []

  // 1. Fenced code blocks containing a single preset JSON object.
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = fenceRegex.exec(text)) !== null) {
    try {
      const content = m[1].trim()
      let parsed: unknown
      try { parsed = JSON.parse(content) } catch { /* ignore */ }
      if (!parsed) {
        const objMatch = content.match(/\{[\s\S]*\}/)
        if (objMatch) try { parsed = JSON.parse(objMatch[0]) } catch { /* ignore */ }
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikePreset(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, preset: parsed as Record<string, unknown> })
      }
    } catch { /* ignore */ }
  }

  // 2. Fallback to bare JSON objects.
  if (boundaries.length === 0) {
    let depth = 0, start = -1, inString = false, escape = false
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') { if (depth === 0) start = i; depth++ }
      else if (ch === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          try {
            const obj = JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>
            if (looksLikePreset(obj)) boundaries.push({ start, end: i + 1, preset: obj })
          } catch { /* ignore */ }
          start = -1
        }
      }
    }
  }

  if (boundaries.length === 0) return [{ type: 'text', text }]

  boundaries.sort((a, b) => a.start - b.start)

  const segments: ResponseSegment[] = []
  let lastEnd = 0
  let presetIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({ type: 'preset', text: text.slice(boundary.start, boundary.end), preset: boundary.preset, presetIdx: presetIdx++ })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}

export const lsContainerLinks = (convId: string) => `ss_conv_container_links_${convId}`

// ---------------------------------------------------------------------------
// Parse generated containers from container_generation response text.
// ---------------------------------------------------------------------------

export function parseGeneratedContainersResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeContainer = (obj: Record<string, unknown>) =>
    typeof obj.name === 'string' && typeof obj.container_type === 'string' &&
    (typeof obj.grid_cols === 'number' || typeof obj.grid_rows === 'number')

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const containers = parsed.filter((el) => el && typeof el === 'object' && looksLikeContainer(el as Record<string, unknown>))
        if (containers.length > 0) return containers
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_containers)) return record.generated_containers
        if (Array.isArray(record.containers)) return record.containers
        if (looksLikeContainer(record)) return [record]
      }
    } catch { /* ignore */ }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedContainers: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedContainers.push(...parsed)
  }
  if (fencedContainers.length > 0) return fencedContainers

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const containers = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeContainer(el as Record<string, unknown>))
    if (containers.length > 0) return containers
  }

  return []
}

// ---------------------------------------------------------------------------
// Split container response text into interleaved text/container segments.
// ---------------------------------------------------------------------------

export function splitContainerResponseSegments(text: string): ResponseSegment[] {
  const looksLikeContainer = (obj: Record<string, unknown>) =>
    typeof obj.name === 'string' && typeof obj.container_type === 'string' &&
    (typeof obj.grid_cols === 'number' || typeof obj.grid_rows === 'number')

  const boundaries: Array<{ start: number; end: number; container: Record<string, unknown> }> = []

  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g
  let m: RegExpExecArray | null
  while ((m = fenceRegex.exec(text)) !== null) {
    try {
      const content = m[1].trim()
      let parsed: unknown
      try { parsed = JSON.parse(content) } catch { /* ignore */ }
      if (!parsed) {
        const objMatch = content.match(/\{[\s\S]*\}/)
        if (objMatch) try { parsed = JSON.parse(objMatch[0]) } catch { /* ignore */ }
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeContainer(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, container: parsed as Record<string, unknown> })
      }
    } catch { /* ignore */ }
  }

  if (boundaries.length === 0) {
    let depth = 0, start = -1, inString = false, escape = false
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') { if (depth === 0) start = i; depth++ }
      else if (ch === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          try {
            const obj = JSON.parse(text.slice(start, i + 1)) as Record<string, unknown>
            if (looksLikeContainer(obj)) boundaries.push({ start, end: i + 1, container: obj })
          } catch { /* ignore */ }
          start = -1
        }
      }
    }
  }

  if (boundaries.length === 0) return [{ type: 'text', text }]

  boundaries.sort((a, b) => a.start - b.start)

  const segments: ResponseSegment[] = []
  let lastEnd = 0
  let containerIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({ type: 'container', text: text.slice(boundary.start, boundary.end), container: boundary.container, containerIdx: containerIdx++ })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}
