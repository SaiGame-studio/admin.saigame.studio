// Inventory & Gacha System Types
// Matches the backend API defined in INVENTORY_GACHA_FRONTEND_GUIDE.md

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'currency'
  | 'material'
  | 'card'
  | 'container'
  | 'decoration'
  | 'gacha_pack'
  | 'generator'
  | 'other'

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type TxType =
  | 'GACHA_OPEN'
  | 'ITEM_ADD'
  | 'ITEM_REMOVE'
  | 'ITEM_EQUIP'
  | 'ITEM_TRADE'

export interface ItemDefinition {
  id: string
  studio_id: string
  game_id: string
  item_code: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  is_stackable: boolean
  max_stack_size: number | null
  grid_width: number
  grid_height: number
  base_stats: Record<string, number>
  metadata: Record<string, unknown>
  client_writable: boolean
  allow_client_update_qty?: boolean
  tags?: import('@/lib/inventory-api').ItemTag[]
  created_at: string
  updated_at: string
}

export interface CreateItemRequest {
  item_code?: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  is_stackable?: boolean
  max_stack_size?: number | null
  grid_width?: number
  grid_height?: number
  base_stats?: Record<string, number>
  metadata?: Record<string, unknown>
  client_writable?: boolean
  allow_client_update_qty?: boolean
}

export interface UpdateItemRequest {
  name?: string
  category?: ItemCategory
  rarity?: ItemRarity
  is_stackable?: boolean
  max_stack_size?: number | null
  grid_width?: number
  grid_height?: number
  base_stats?: Record<string, number>
  metadata?: Record<string, unknown>
  client_writable?: boolean
  allow_client_update_qty?: boolean
}

export interface GachaPoolEntry {
  item_definition_id: string
  weight: number
  rarity?: ItemRarity
  quantity_min: number
  quantity_max: number
}

export interface KeyRequirement {
  item_definition_id: string
  quantity: number
}

export interface GachaPack {
  id: string
  studio_id: string
  game_id: string
  name: string
  code_name?: string
  collect_destination?: 'mailbox' | 'inventory'
  item_pool: GachaPoolEntry[]
  key_requirements: KeyRequirement[]
  is_enabled: boolean
  created_at?: string | number
  updated_at?: string | number
}

export interface CreateGachaPackRequest {
  name: string
  code_name?: string
  collect_destination: 'mailbox' | 'inventory'
  is_enabled?: boolean
  item_pool: GachaPoolEntry[]
  key_requirements: KeyRequirement[]
}

export interface UpdateGachaPackRequest {
  name?: string
  code_name?: string
  collect_destination?: 'mailbox' | 'inventory'
  is_enabled?: boolean
  item_pool?: GachaPoolEntry[]
  key_requirements?: KeyRequirement[]
}

export interface GrantedItem {
  item_definition_id: string
  name: string
  rarity: ItemRarity
  category: ItemCategory
  quantity: number
  inventory_item_id: string
}

export interface GachaPackResult {
  transaction_id: string
  is_duplicate: boolean
  items_granted: GrantedItem[]
}

export interface TransactionItem {
  item_definition_id: string
  name: string
  quantity: number
  rarity: ItemRarity
  category: ItemCategory
}

export interface InventoryTransaction {
  id: string
  user_id: string
  studio_id: string
  game_id: string
  transaction_type: TxType
  items: TransactionItem[]
  metadata: Record<string, unknown> | null
  reference_id: string | null
  created_at: string
}

export interface Paginated<T> {
  items?: T[]
  transactions?: T[]
  total: number
  limit: number
  offset: number
}

// ─── Container Definitions ────────────────────────────────────────────────────

export type ContainerType = 'inventory' | 'chest' | 'bag' | 'vault' | 'shulker_box' | 'equipment'

export interface ContainerDefinition {
  id: string
  game_id: string
  name: string
  container_type: ContainerType
  grid_cols: number
  grid_rows: number
  is_portable: boolean
  instanced_per_item?: boolean
  linked_item_definition_id?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface CreateContainerDefinitionRequest {
  name: string
  container_type: ContainerType
  grid_cols: number
  grid_rows: number
  is_portable: boolean
  linked_item_definition_id?: string
  metadata?: Record<string, unknown>
}

export interface UpdateContainerDefinitionRequest {
  name?: string
  grid_cols?: number
  grid_rows?: number
  instanced_per_item?: boolean
  linked_item_definition_id?: string
  metadata?: Record<string, unknown>
}

export interface EquipmentSlot {
  id: string
  studio_id: string
  game_id: string
  slot_key: string
  name: string
  description: string
  allowed_categories: string[]
  allowed_item_definition_ids: string[] | null
  sort_order: number
  metadata: Record<string, unknown>
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

/** Suggested rarity colour mapping */
export const RARITY_COLORS: Record<ItemRarity, { text: string; border: string; bg: string }> = {
  common: {
    text: 'text-gray-400',
    border: 'border-gray-400',
    bg: 'bg-gray-400/10',
  },
  rare: {
    text: 'text-blue-500',
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
  },
  epic: {
    text: 'text-purple-500',
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
  },
  legendary: {
    text: 'text-amber-500',
    border: 'border-amber-500',
    bg: 'bg-amber-500/10',
  },
}
