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
  is_active: boolean
  metadata?: Record<string, unknown>
  inputs: Omit<CraftingRecipeInput, "id" | "recipe_id" | "studio_id" | "game_id" | "created_at" | "updated_at">[]
  outputs: Omit<CraftingRecipeOutput, "id" | "recipe_id" | "studio_id" | "game_id" | "created_at" | "updated_at">[]
}

export interface ListCraftingRecipesParams {
  category?: string
  page?: number
  page_size?: number
}
