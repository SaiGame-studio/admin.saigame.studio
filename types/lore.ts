export interface LoreEntry {
  ID: string
  GameID: string
  LoreType: string
  Title: string
  Summary: string
  Content: string
  CreatedAt: string
  UpdatedAt: string
}

export interface ListLoreEntriesResponse {
  data: LoreEntry[]
  total: number
  limit: number
  offset: number
}

export interface CreateLoreEntryRequest {
  lore_type: string
  title: string
  summary: string
  content: string
}

export interface UpdateLoreEntryRequest {
  lore_type?: string
  title?: string
  summary?: string
  content?: string
}
