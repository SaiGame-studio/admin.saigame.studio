export interface CraftingRecipeInput {
  id?: string
  recipe_id?: string
  studio_id?: string
  game_id?: string
  item_definition_id: string
  quantity: number
  is_consumed: boolean
  created_at?: string
  updated_at?: string
}

export type CraftingOutputType = "main" | "bonus" | string

export interface CraftingRecipeOutput {
  id?: string
  recipe_id?: string
  studio_id?: string
  game_id?: string
  item_definition_id: string
  quantity_min: number
  quantity_max: number
  output_type: CraftingOutputType
  level_increment?: number | null
  properties_patch?: Record<string, unknown> | null
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface CraftingRecipe {
  id: string
  studio_id: string
  game_id: string
  recipe_key: string
  name: string
  description?: string
  category: string
  success_rate: number
  bonus_rate: number
  available_from?: string | null
  available_until?: string | null
  is_active: boolean
  metadata?: Record<string, unknown>
  created_by?: string
  created_at: string
  updated_at: string
  inputs?: CraftingRecipeInput[]
  outputs?: CraftingRecipeOutput[]
}

export interface CreateCraftingRecipeRequest {
  recipe_key: string
  name: string
  description?: string
  category: string
  success_rate: number
  bonus_rate: number
  available_from?: string | null
  available_until?: string | null
  is_active: boolean
  metadata?: Record<string, unknown>
  inputs: Omit<CraftingRecipeInput, "id" | "recipe_id" | "studio_id" | "game_id" | "created_at" | "updated_at">[]
  outputs: Omit<CraftingRecipeOutput, "id" | "recipe_id" | "studio_id" | "game_id" | "created_at" | "updated_at">[]
}

export interface UpdateCraftingRecipeRequest {
  recipe_key?: string
  name?: string
  description?: string
  category?: string
  success_rate?: number
  bonus_rate?: number
  is_active?: boolean
  metadata?: Record<string, unknown>
  inputs?: Omit<CraftingRecipeInput, "id" | "recipe_id" | "studio_id" | "game_id" | "created_at" | "updated_at">[]
  outputs?: Omit<CraftingRecipeOutput, "id" | "recipe_id" | "studio_id" | "game_id" | "created_at" | "updated_at">[]
}

export interface ListCraftingRecipesParams {
  category?: string
  page?: number
  page_size?: number
}

export interface CraftingHistoryMaterialSnapshot {
  item_definition_id: string
  item_definition_name: string
  quantity: number
  was_consumed: boolean
}

export interface CraftingHistoryOutputSnapshot {
  item_definition_id: string
  item_definition_name: string
  quantity: number
  was_consumed: boolean
}

export interface CraftingHistoryTransaction {
  id: string
  game_id: string
  user_id: string
  recipe_id: string
  idempotency_key: string
  status: "success" | "failed" | string
  success: boolean
  bonus_triggered: boolean
  materials_snapshot: CraftingHistoryMaterialSnapshot[]
  outputs_snapshot: CraftingHistoryOutputSnapshot[]
  craft_count_at_time: number
  created_at: string
}

export interface ListCraftingRecipeHistoryParams {
  status?: "success" | "failed"
  page?: number
  page_size?: number
}

export interface CraftingRecipeHistoryResponse {
  transactions: CraftingHistoryTransaction[]
  total: number
  page: number
  page_size: number
}
