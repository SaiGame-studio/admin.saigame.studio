/**
 * Entity Definition types — mirrors the SS-GO entity-definitions API
 */

export type EntityType = 'enemy' | 'boss' | 'room' | 'relic' | 'defense_unit' | 'npc'

export type EntityRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface EntityAbility {
  id: string
  trigger: string
  effect_type: string
  target: string
  magnitude: number
  magnitude_scale?: string
  duration_turns?: number
  metadata?: Record<string, unknown>
}

export interface EntityDefinition {
  id: string
  studio_id: string
  game_id: string
  entity_key: string
  entity_type: EntityType
  name: string
  description?: string
  icon_url?: string
  rarity?: EntityRarity
  stats?: Record<string, unknown>
  abilities?: EntityAbility[]
  metadata?: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateEntityDefinitionRequest {
  entity_key: string
  entity_type: EntityType
  name: string
  description?: string
  icon_url?: string
  rarity?: EntityRarity
  stats?: Record<string, unknown>
  abilities?: EntityAbility[]
  metadata?: Record<string, unknown>
}

export interface UpdateEntityDefinitionRequest {
  entity_type?: EntityType
  name?: string
  description?: string
  icon_url?: string
  rarity?: EntityRarity
  stats?: Record<string, unknown>
  abilities?: EntityAbility[]
  metadata?: Record<string, unknown>
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  enemy: 'Enemy',
  boss: 'Boss',
  room: 'Room',
  relic: 'Relic',
  defense_unit: 'Defense Unit',
  npc: 'NPC',
}

export const ENTITY_RARITY_COLORS: Record<EntityRarity, { text: string; border: string; bg: string }> = {
  common:    { text: 'text-gray-600',   border: 'border-gray-400',   bg: 'bg-gray-50'    },
  uncommon:  { text: 'text-green-700',  border: 'border-green-500',  bg: 'bg-green-50'   },
  rare:      { text: 'text-blue-700',   border: 'border-blue-500',   bg: 'bg-blue-50'    },
  epic:      { text: 'text-purple-700', border: 'border-purple-500', bg: 'bg-purple-50'  },
  legendary: { text: 'text-orange-700', border: 'border-orange-500', bg: 'bg-orange-50'  },
}
