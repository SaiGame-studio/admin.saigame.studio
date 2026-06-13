import { api } from '@/lib/api-client';
import type { TenantCtx } from '@/lib/inventory-api';
import type { CraftingRecipe, CreateCraftingRecipeRequest, UpdateCraftingRecipeRequest, ListCraftingRecipesParams, ListCraftingRecipeHistoryParams, CraftingRecipeHistoryResponse, } from '@/types/crafting';
import type { Paginated } from '@/types/inventory';
/** GET /api/v1/games/:gameId/crafting/recipes - List crafting recipes */
export async function listCraftingRecipes(ctx: TenantCtx, params: ListCraftingRecipesParams = {}): Promise<{
    recipes: CraftingRecipe[];
    page: number;
    page_size: number;
    total: number;
}> {
    const qs = new URLSearchParams();
    if (params.category)
        qs.set('category', params.category);
    if (params.page != null)
        qs.set('page', String(params.page));
    if (params.page_size != null)
        qs.set('page_size', String(params.page_size));
    const query = qs.toString();
    return api.get(`/api/v1/games/${ctx.gameId}/crafting/recipes${query ? `?${query}` : ''}`);
}
/** POST /api/v1/games/:gameId/crafting/recipes - Create a crafting recipe */
export async function createCraftingRecipe(ctx: TenantCtx, body: CreateCraftingRecipeRequest): Promise<CraftingRecipe> {
    return api.post(`/api/v1/games/${ctx.gameId}/crafting/recipes`, body);
}
/** GET /api/v1/games/:gameId/crafting/recipes/:id - Get full crafting recipe details */
export async function getCraftingRecipe(ctx: TenantCtx, recipeId: string): Promise<CraftingRecipe> {
    return api.get(`/api/v1/games/${ctx.gameId}/crafting/recipes/${recipeId}`);
}
/** GET /api/v1/games/:gameId/crafting/recipes-by-key/:recipeKey - Get crafting recipe by recipe_key */
export async function getCraftingRecipeByKey(ctx: TenantCtx, recipeKey: string, options?: {
    suppressToast?: boolean;
}): Promise<CraftingRecipe> {
    return api.get(`/api/v1/games/${ctx.gameId}/crafting/recipes-by-key/${encodeURIComponent(recipeKey)}`, {
        suppressToast: options?.suppressToast,
    });
}
/** DELETE /api/v1/games/:gameId/crafting/recipes/:id - Delete a crafting recipe */
export async function deleteCraftingRecipe(ctx: TenantCtx, recipeId: string): Promise<void> {
    return api.delete(`/api/v1/games/${ctx.gameId}/crafting/recipes/${recipeId}`);
}
/** PUT /api/v1/games/:gameId/crafting/recipes/:id - Update a crafting recipe */
export async function updateCraftingRecipe(ctx: TenantCtx, recipeId: string, body: UpdateCraftingRecipeRequest): Promise<CraftingRecipe> {
    return api.put(`/api/v1/games/${ctx.gameId}/crafting/recipes/${recipeId}`, body);
}
/** GET /api/v1/games/:gameId/crafting/recipes/:recipeId/history - List craft history */
export async function listCraftingRecipeHistory(ctx: TenantCtx, recipeId: string, params: ListCraftingRecipeHistoryParams = {}): Promise<CraftingRecipeHistoryResponse> {
    const qs = new URLSearchParams();
    if (params.status)
        qs.set('status', params.status);
    if (params.page != null)
        qs.set('page', String(params.page));
    if (params.page_size != null)
        qs.set('page_size', String(params.page_size));
    const query = qs.toString();
    return api.get(`/api/v1/games/${ctx.gameId}/crafting/recipes/${recipeId}/history${query ? `?${query}` : ''}`);
}
