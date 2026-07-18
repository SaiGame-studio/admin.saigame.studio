import { api } from "@/lib/api-client";
import type {
    CloneSessionCurrentItemsParams,
    CloneSessionCurrentItemsResponse,
    CloneSessionCurrentCraftingRecipesParams,
    CloneSessionCurrentCraftingRecipesResponse,
    CloneSessionCurrentItemContainersParams,
    CloneSessionCurrentItemContainersResponse,
    CloneSessionCurrentItemTagsParams,
    CloneSessionCurrentItemTagsResponse,
    CloneSessionCurrentEquipmentSlotDefinitionsParams,
    CloneSessionCurrentEquipmentSlotDefinitionsResponse,
    CloneSessionCurrentQuestsParams,
    CloneSessionCurrentQuestsResponse,
    CloneSessionCurrentShopDefinitionsParams,
    CloneSessionCurrentShopDefinitionsResponse,
    CloneSessionCurrentPresetDefinitionsParams,
    CloneSessionCurrentPresetDefinitionsResponse,
    CloneSessionCurrentGachaPacksParams,
    CloneSessionCurrentGachaPacksResponse,
    CloneSessionCurrentEntityDefinitionsParams,
    CloneSessionCurrentEntityDefinitionsResponse,
    CloneSessionCurrentLeaderboardDefinitionsParams,
    CloneSessionCurrentLeaderboardDefinitionsResponse,
    CloneSessionCurrentEntityPoolsResponse,
    CloneSessionCurrentScriptsParams,
    CloneSessionCurrentScriptsResponse,
} from "./clone-session-types";

export async function getCurrentCloneSessionItems(gameId: string, params?: CloneSessionCurrentItemsParams): Promise<CloneSessionCurrentItemsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/items${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionEntityPools(gameId: string, params?: CloneSessionCurrentItemsParams): Promise<CloneSessionCurrentEntityPoolsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (params?.limit !== undefined) {
        searchParams.set("limit", String(params.limit));
    }

    if (params?.offset !== undefined) {
        searchParams.set("offset", String(params.offset));
    }

    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/entity-pools?${searchParams.toString()}`);
}

export async function getCurrentCloneSessionCraftingRecipes(gameId: string, params?: CloneSessionCurrentCraftingRecipesParams): Promise<CloneSessionCurrentCraftingRecipesResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    const response = await api.get(`/api/v1/games/${gameId}/clone-sessions/current/crafting-recipes${query ? `?${query}` : ""}`, { suppressToast: true });
    return response as CloneSessionCurrentCraftingRecipesResponse;
}

export async function getCurrentCloneSessionItemContainers(gameId: string, params?: CloneSessionCurrentItemContainersParams): Promise<CloneSessionCurrentItemContainersResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/item-containers${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionItemTags(gameId: string, params?: CloneSessionCurrentItemTagsParams): Promise<CloneSessionCurrentItemTagsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/item-tags${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionEquipmentSlotDefinitions(gameId: string, params?: CloneSessionCurrentEquipmentSlotDefinitionsParams): Promise<CloneSessionCurrentEquipmentSlotDefinitionsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/equipment-slot-definitions${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionQuests(gameId: string, params?: CloneSessionCurrentQuestsParams): Promise<CloneSessionCurrentQuestsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/quests${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionShopDefinitions(gameId: string, params?: CloneSessionCurrentShopDefinitionsParams): Promise<CloneSessionCurrentShopDefinitionsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/shop-definitions${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionPresetDefinitions(gameId: string, params?: CloneSessionCurrentPresetDefinitionsParams): Promise<CloneSessionCurrentPresetDefinitionsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/preset-definitions${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionGachaPacks(gameId: string, params?: CloneSessionCurrentGachaPacksParams): Promise<CloneSessionCurrentGachaPacksResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/gacha-packs${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionEntityDefinitions(gameId: string, params?: CloneSessionCurrentEntityDefinitionsParams): Promise<CloneSessionCurrentEntityDefinitionsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/entity-definitions${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionLeaderboardDefinitions(gameId: string, params?: CloneSessionCurrentLeaderboardDefinitionsParams): Promise<CloneSessionCurrentLeaderboardDefinitionsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/leaderboard-definitions${query ? `?${query}` : ""}`, { suppressToast: true });
}

export async function getCurrentCloneSessionScripts(gameId: string, params?: CloneSessionCurrentScriptsParams): Promise<CloneSessionCurrentScriptsResponse> {
    const searchParams = new URLSearchParams();

    if (params?.id) {
        searchParams.set("id", params.id);
    }

    if (params?.name) {
        searchParams.set("name", params.name);
    }

    if (typeof params?.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    if (typeof params?.offset === "number") {
        searchParams.set("offset", String(params.offset));
    }

    const query = searchParams.toString();
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current/scripts${query ? `?${query}` : ""}`, { suppressToast: true });
}
