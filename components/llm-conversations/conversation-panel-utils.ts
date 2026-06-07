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
export const lsEntityLinks = (convId: string) => `ss_conv_entity_links_${convId}`
export const lsPresetLinks = (convId: string) => `ss_conv_preset_links_${convId}`
export const lsLoreTitles = (convId: string) => `ss_conv_lore_titles_${convId}`
export const lsItemNames = (convId: string) => `ss_conv_item_names_${convId}`
export const lsEntityNames = (convId: string) => `ss_conv_entity_names_${convId}`
export const lsPresetNames = (convId: string) => `ss_conv_preset_names_${convId}`
export const lsContainerNames = (convId: string) => `ss_conv_container_names_${convId}`
export const lsEntityPoolLinks = (convId: string) => `ss_conv_entity_pool_links_${convId}`
export const lsEntityPoolNames = (convId: string) => `ss_conv_entity_pool_names_${convId}`
export const lsEntityPoolKeys = (convId: string) => `ss_conv_entity_pool_keys_${convId}`
export const lsQuestLinks = (convId: string) => `ss_conv_quest_links_${convId}`
export const lsQuestNames = (convId: string) => `ss_conv_quest_names_${convId}`
export const lsQuestCodes = (convId: string) => `ss_conv_quest_codes_${convId}`
export const lsScrollPos = (convId: string) => `ss_conv_scroll_${convId}`
export const lsTagApplied = (convId: string) => `ss_conv_tag_applied_${convId}`
export const lsItemTagCreated = (convId: string) => `ss_conv_item_tag_created_${convId}`
export const lsPendingCraftingRecipeEdit = (gameId: string) => `ss_pending_crafting_recipe_edit_${gameId}`
export const lsPendingEntityPoolEdit = (gameId: string) => `ss_pending_entity_pool_edit_${gameId}`
export const lsPendingQuestCreate = (gameId: string) => `ss_pending_quest_create_${gameId}`
export const lsPendingQuestEdit = (gameId: string) => `ss_pending_quest_edit_${gameId}`

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
  | { type: 'entityDefinition'; text: string; entityDefinition: Record<string, unknown>; entityDefinitionIdx: number }
  | { type: 'preset'; text: string; preset: Record<string, unknown>; presetIdx: number }
  | { type: 'container'; text: string; container: Record<string, unknown>; containerIdx: number }
  | { type: 'gachaPack'; text: string; gachaPack: Record<string, unknown>; gachaPackIdx: number }
  | { type: 'equipmentSlot'; text: string; equipmentSlot: Record<string, unknown>; equipmentSlotIdx: number }
  | { type: 'craftingRecipe'; text: string; craftingRecipe: Record<string, unknown>; craftingRecipeIdx: number }
  | { type: 'entityPool'; text: string; entityPool: Record<string, unknown>; entityPoolIdx: number }
  | { type: 'questDefinition'; text: string; questDefinition: Record<string, unknown>; questDefinitionIdx: number }

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

export function splitEntityDefinitionResponseSegments(text: string): ResponseSegment[] {
  const looksLikeEntityDefinition = (obj: Record<string, unknown>) =>
    typeof obj.entity_key === 'string' && typeof obj.entity_type === 'string' && typeof obj.name === 'string'

  const boundaries: Array<{ start: number; end: number; entityDefinition: Record<string, unknown> }> = []

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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeEntityDefinition(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, entityDefinition: parsed as Record<string, unknown> })
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
            if (looksLikeEntityDefinition(obj)) boundaries.push({ start, end: i + 1, entityDefinition: obj })
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
  let entityDefinitionIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({
      type: 'entityDefinition',
      text: text.slice(boundary.start, boundary.end),
      entityDefinition: boundary.entityDefinition,
      entityDefinitionIdx: entityDefinitionIdx++,
    })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}

export function splitEntityPoolResponseSegments(text: string): ResponseSegment[] {
  const looksLikeEntityPool = (obj: Record<string, unknown>) =>
    typeof obj.pool_key === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.entries)

  const boundaries: Array<{ start: number; end: number; entityPool: Record<string, unknown> }> = []

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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeEntityPool(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, entityPool: parsed as Record<string, unknown> })
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
            if (looksLikeEntityPool(obj)) boundaries.push({ start, end: i + 1, entityPool: obj })
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
  let entityPoolIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({
      type: 'entityPool',
      text: text.slice(boundary.start, boundary.end),
      entityPool: boundary.entityPool,
      entityPoolIdx: entityPoolIdx++,
    })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}

export function splitQuestDefinitionResponseSegments(text: string): ResponseSegment[] {
  const looksLikeQuestDefinition = (obj: Record<string, unknown>) =>
    typeof obj.name === 'string' &&
    typeof obj.quest_type === 'string' &&
    obj.conditions && typeof obj.conditions === 'object' && !Array.isArray(obj.conditions)

  const boundaries: Array<{ start: number; end: number; questDefinition: Record<string, unknown> }> = []

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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeQuestDefinition(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, questDefinition: parsed as Record<string, unknown> })
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
            if (looksLikeQuestDefinition(obj)) boundaries.push({ start, end: i + 1, questDefinition: obj })
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
  let questDefinitionIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({
      type: 'questDefinition',
      text: text.slice(boundary.start, boundary.end),
      questDefinition: boundary.questDefinition,
      questDefinitionIdx: questDefinitionIdx++,
    })
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

export const lsGachaPackLinks = (convId: string) => `ss_conv_gacha_pack_links_${convId}`
export const lsGachaPackNames = (convId: string) => `ss_conv_gacha_pack_names_${convId}`
export const lsPendingGachaCreate = (gameId: string) => `ss_pending_gacha_create_${gameId}`
export const lsPendingGachaEdit = (gameId: string) => `ss_pending_gacha_edit_${gameId}`
export const lsEquipmentSlotLinks = (convId: string) => `ss_conv_equipment_slot_links_${convId}`
export const lsEquipmentSlotNames = (convId: string) => `ss_conv_equipment_slot_names_${convId}`
export const lsPendingEquipmentSlotCreate = (gameId: string) => `ss_pending_equipment_slot_create_${gameId}`
export const lsPendingEquipmentSlotEdit = (gameId: string) => `ss_pending_equipment_slot_edit_${gameId}`
export const lsCraftingRecipeLinks = (convId: string) => `ss_conv_crafting_recipe_links_${convId}`
export const lsCraftingRecipeNames = (convId: string) => `ss_conv_crafting_recipe_names_${convId}`
export const lsPendingCraftingRecipeCreate = (gameId: string) => `ss_pending_crafting_recipe_create_${gameId}`
export const lsPendingEntityDefinitionCreate = (gameId: string) => `ss_pending_entity_definition_create_${gameId}`
export const lsPendingEntityPoolCreate = (gameId: string) => `ss_pending_entity_pool_create_${gameId}`

// ---------------------------------------------------------------------------
// Parse generated entity pools from entity_pool_creating response text.
// Each pool is emitted as its own fenced JSON block or bare JSON object.
// ---------------------------------------------------------------------------

export function parseGeneratedEntityPoolsResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeEntityPool = (obj: Record<string, unknown>) =>
    typeof obj.pool_key === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.entries)

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const pools = parsed.filter((el) => el && typeof el === 'object' && looksLikeEntityPool(el as Record<string, unknown>))
        if (pools.length > 0) return pools
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.pools)) return record.pools
        if (Array.isArray(record.generated_pools)) return record.generated_pools
        if (looksLikeEntityPool(record)) return [record]
      }
    } catch {
      // ignore parse failures
    }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedPools: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedPools.push(...parsed)
  }
  if (fencedPools.length > 0) return fencedPools

  const arrayCandidate = trimmed.match(/\[[\s\S]*\]/)
  if (arrayCandidate) {
    const parsed = tryParse(arrayCandidate[0])
    if (parsed) return parsed
  }

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const pools = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeEntityPool(el as Record<string, unknown>))
    if (pools.length > 0) return pools
    if (extracted.length > 1) return extracted
  }

  const objectCandidate = trimmed.match(/\{[\s\S]*\}/)
  if (objectCandidate) {
    const parsed = tryParse(objectCandidate[0])
    if (parsed) return parsed
  }

  return []
}

// ---------------------------------------------------------------------------
// Parse generated crafting recipes from crafting_recipe_creating response text.
// The backend prompt returns one fenced JSON object per recipe block.
// ---------------------------------------------------------------------------

export function parseGeneratedCraftingRecipesResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeCraftingRecipe = (obj: Record<string, unknown>) =>
    typeof obj.recipe_key === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.inputs) &&
    Array.isArray(obj.outputs)

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const recipes = parsed.filter((el) => el && typeof el === 'object' && looksLikeCraftingRecipe(el as Record<string, unknown>))
        if (recipes.length > 0) return recipes
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_recipes)) return record.generated_recipes
        if (Array.isArray(record.recipes)) return record.recipes
        if (looksLikeCraftingRecipe(record)) return [record]
      }
    } catch { /* ignore */ }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedRecipes: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedRecipes.push(...parsed)
  }
  if (fencedRecipes.length > 0) return fencedRecipes

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const recipes = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeCraftingRecipe(el as Record<string, unknown>))
    if (recipes.length > 0) return recipes
  }

  return []
}

export function parseGeneratedEntityDefinitionsResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeEntityDefinition = (obj: Record<string, unknown>) =>
    typeof obj.entity_key === 'string' && typeof obj.entity_type === 'string' && typeof obj.name === 'string'

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const defs = parsed.filter((el) => el && typeof el === 'object' && looksLikeEntityDefinition(el as Record<string, unknown>))
        if (defs.length > 0) return defs
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.entity_definitions)) return record.entity_definitions
        if (looksLikeEntityDefinition(record)) return [record]
      }
    } catch {
      // ignore parse failures
    }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedDefs: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedDefs.push(...parsed)
  }
  if (fencedDefs.length > 0) return fencedDefs

  const arrayCandidate = trimmed.match(/\[[\s\S]*\]/)
  if (arrayCandidate) {
    const parsed = tryParse(arrayCandidate[0])
    if (parsed) return parsed
  }

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const defs = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeEntityDefinition(el as Record<string, unknown>))
    if (defs.length > 0) return defs
    if (extracted.length > 1) return extracted
  }

  const objectCandidate = trimmed.match(/\{[\s\S]*\}/)
  if (objectCandidate) {
    const parsed = tryParse(objectCandidate[0])
    if (parsed) return parsed
  }

  return []
}

export function splitCraftingRecipeResponseSegments(text: string): ResponseSegment[] {
  const looksLikeCraftingRecipe = (obj: Record<string, unknown>) =>
    typeof obj.recipe_key === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.inputs) &&
    Array.isArray(obj.outputs)

  const boundaries: Array<{ start: number; end: number; craftingRecipe: Record<string, unknown> }> = []

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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeCraftingRecipe(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, craftingRecipe: parsed as Record<string, unknown> })
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
            if (looksLikeCraftingRecipe(obj)) boundaries.push({ start, end: i + 1, craftingRecipe: obj })
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
  let craftingRecipeIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({ type: 'craftingRecipe', text: text.slice(boundary.start, boundary.end), craftingRecipe: boundary.craftingRecipe, craftingRecipeIdx: craftingRecipeIdx++ })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}

// ---------------------------------------------------------------------------
// Parse generated gacha packs from gacha_pack_creating response text.
// ---------------------------------------------------------------------------

export function parseGeneratedGachaPacksResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeGachaPack = (obj: Record<string, unknown>) =>
    typeof obj.code_name === 'string' &&
    Array.isArray(obj.item_pool) &&
    obj.item_pool.length > 0

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const packs = parsed.filter((el) => el && typeof el === 'object' && looksLikeGachaPack(el as Record<string, unknown>))
        if (packs.length > 0) return packs
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_packs)) return record.generated_packs
        if (Array.isArray(record.packs)) return record.packs
        if (looksLikeGachaPack(record)) return [record]
      }
    } catch { /* ignore */ }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedPacks: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedPacks.push(...parsed)
  }
  if (fencedPacks.length > 0) return fencedPacks

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const packs = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeGachaPack(el as Record<string, unknown>))
    if (packs.length > 0) return packs
  }

  return []
}

// ---------------------------------------------------------------------------
// Split gacha pack response text into interleaved text/gachaPack segments.
// ---------------------------------------------------------------------------

export function splitGachaPackResponseSegments(text: string): ResponseSegment[] {
  const looksLikeGachaPack = (obj: Record<string, unknown>) =>
    typeof obj.code_name === 'string' &&
    Array.isArray(obj.item_pool) &&
    obj.item_pool.length > 0

  const boundaries: Array<{ start: number; end: number; gachaPack: Record<string, unknown> }> = []

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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeGachaPack(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, gachaPack: parsed as Record<string, unknown> })
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
            if (looksLikeGachaPack(obj)) boundaries.push({ start, end: i + 1, gachaPack: obj })
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
  let gachaPackIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({ type: 'gachaPack', text: text.slice(boundary.start, boundary.end), gachaPack: boundary.gachaPack, gachaPackIdx: gachaPackIdx++ })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}

// ---------------------------------------------------------------------------
// Parse generated equipment slots from equipment_slot_generation response text.
// ---------------------------------------------------------------------------

export function parseGeneratedEquipmentSlotsResponse(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const looksLikeEquipmentSlot = (obj: Record<string, unknown>) =>
    typeof obj.slot_key === 'string' && Array.isArray(obj.allowed_categories)

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed: unknown = JSON.parse(input)
      if (Array.isArray(parsed)) {
        const slots = parsed.filter((el) => el && typeof el === 'object' && looksLikeEquipmentSlot(el as Record<string, unknown>))
        if (slots.length > 0) return slots
        return parsed
      }
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>
        if (Array.isArray(record.generated_slots)) return record.generated_slots
        if (Array.isArray(record.slots)) return record.slots
        if (looksLikeEquipmentSlot(record)) return [record]
      }
    } catch { /* ignore */ }
    return null
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((m) => m[1].trim())
  const fencedSlots: unknown[] = []
  for (const block of fencedBlocks) {
    const parsed = tryParse(block)
    if (parsed) fencedSlots.push(...parsed)
  }
  if (fencedSlots.length > 0) return fencedSlots

  const extracted = extractTopLevelJsonObjects(trimmed)
  if (extracted.length > 0) {
    const slots = extracted.filter((el) => el && typeof el === 'object' && !Array.isArray(el) && looksLikeEquipmentSlot(el as Record<string, unknown>))
    if (slots.length > 0) return slots
  }

  return []
}

// ---------------------------------------------------------------------------
// Split equipment slot response text into interleaved text/equipmentSlot segments.
// ---------------------------------------------------------------------------

export function splitEquipmentSlotResponseSegments(text: string): ResponseSegment[] {
  const looksLikeEquipmentSlot = (obj: Record<string, unknown>) =>
    typeof obj.slot_key === 'string' && Array.isArray(obj.allowed_categories)

  const boundaries: Array<{ start: number; end: number; equipmentSlot: Record<string, unknown> }> = []

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
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && looksLikeEquipmentSlot(parsed as Record<string, unknown>)) {
        boundaries.push({ start: m.index, end: m.index + m[0].length, equipmentSlot: parsed as Record<string, unknown> })
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
            if (looksLikeEquipmentSlot(obj)) boundaries.push({ start, end: i + 1, equipmentSlot: obj })
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
  let equipmentSlotIdx = 0

  for (const boundary of boundaries) {
    if (boundary.start > lastEnd) {
      const textBefore = text.slice(lastEnd, boundary.start)
      if (textBefore.trim()) segments.push({ type: 'text', text: textBefore })
    }
    segments.push({ type: 'equipmentSlot', text: text.slice(boundary.start, boundary.end), equipmentSlot: boundary.equipmentSlot, equipmentSlotIdx: equipmentSlotIdx++ })
    lastEnd = boundary.end
  }

  if (lastEnd < text.length) {
    const remaining = text.slice(lastEnd)
    if (remaining.trim()) segments.push({ type: 'text', text: remaining })
  }

  return segments
}
