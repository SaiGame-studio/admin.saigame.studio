import type { Game } from "@/types/game";
import type { Team } from "@/types/team";
import type { QuestDefinition } from "@/lib/quest-api";
import { api } from "@/lib/api-client";

export interface CloneableGamesResponse {
    games: Game[];
    total: number;
}

export interface CloneSessionResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    same_studio?: boolean;
    status?: string;
    message?: string;
}

export interface CloneSessionProgress {
    total?: number;
    processed?: number;
    completed?: boolean;
}

export interface CloneSessionWarning {
    field?: string;
    source_id?: string;
    message_code?: string;
    message?: string;
    message_params?: Record<string, string | number | boolean | null | undefined>;
}

export interface CloneSessionConflict {
    content_type?: CloneSessionIgnoreContentType;
    field?: string;
    value?: string;
    source_id?: string;
    target_id?: string;
    source_item_definitions_id?: string;
    target_definition_id?: string;
    phase?: string;
    definition_type?: string;
    message_code?: string;
    message?: string;
    message_params?: Record<string, string | number | boolean | null | undefined>;
}

export interface CloneSessionEstimatedCost {
    currency?: string;
    amount?: number;
}

export interface ActiveCloneSessionSummary {
    session_id: string;
    target_game_id: string;
    target_game_name?: string;
    status?: string;
    expires_at?: number;
    expires_in_seconds?: number;
}

export interface ActiveCloneSessionsResponse {
    source_game_id?: string;
    source_game_name?: string;
    session_ttl_seconds?: number;
    active_session_count?: number;
    active_sessions?: ActiveCloneSessionSummary[];
}

export interface CloneSessionLastRunResponse {
    warnings?: CloneSessionWarning[];
    conflicts?: CloneSessionConflict[];
    estimated_clone_cost?: CloneSessionEstimatedCost;
}

export interface CloneSessionRunOptions {
    overwrite_all_conflicting_codes?: boolean;
}

export interface CloneSessionSnapshot {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    same_studio?: boolean;
    status?: string;
    current_phase?: string;
    current_batch_index?: number;
    batch_size?: number;
    clone_run_options?: CloneSessionRunOptions;
    last_run_response?: CloneSessionLastRunResponse;
    progress?: Record<string, CloneSessionProgress>;
    session_ttl_seconds?: number;
    expires_at?: number;
    expires_in_seconds?: number;
    message?: string;
}

export interface CloneSessionCurrentItemDefinition {
    id: string;
    game_id: string;
    item_code: string;
    name: string;
    category?: string;
    rarity?: string;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentItemsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    items?: CloneSessionCurrentItemDefinition[];
}

export interface CloneSessionCurrentItemContainer {
    id: string;
    game_id: string;
    code_name: string;
    name: string;
    container_type: string;
    grid_cols: number;
    grid_rows: number;
    is_portable: boolean;
    instanced_per_item: boolean;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentItemContainersResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    item_containers?: CloneSessionCurrentItemContainer[];
}

export interface CloneSessionCurrentItemTag {
    id: string;
    game_id: string;
    tag_key: string;
    label: string;
    color?: string;
    item_count?: number;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentItemTagsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    item_tags?: CloneSessionCurrentItemTag[];
    tags?: CloneSessionCurrentItemTag[];
}

export interface CloneSessionCurrentEquipmentSlotDefinition {
    id: string;
    game_id: string;
    slot_key: string;
    name: string;
    description?: string;
    allowed_categories?: string[];
    allowed_item_definition_ids?: string[];
    metadata?: Record<string, string | number | boolean | null | undefined>;
    is_active?: boolean;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    ignored?: boolean;
    is_ignored?: boolean;
    previously_cloned?: boolean;
    cloned_target_id?: string | null;
    clone_adoption_kind?: string | null;
}

export interface CloneSessionCurrentEquipmentSlotDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    equipment_slot_definitions?: CloneSessionCurrentEquipmentSlotDefinition[];
}

export type CloneSessionCurrentQuestDefinition = QuestDefinition & {
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
};

export interface CloneSessionCurrentShopDefinition {
    id: string;
    game_id: string;
    shop_key: string;
    name: string;
    description: string;
    shop_type: string;
    is_active: boolean;
    item_count?: number;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CloneSessionCurrentPresetDefinition {
    id: string;
    game_id: string;
    code_name: string;
    preset_type: string;
    name: string;
    max_slots?: number;
    metadata?: Record<string, string | number | boolean | null | undefined>;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CloneSessionCurrentGachaPackPoolItem {
    item_definition_id: string;
    weight: number;
    quantity_min: number;
    quantity_max: number;
}

export interface CloneSessionCurrentGachaPackKeyRequirement {
    item_definition_id: string;
    quantity: number;
}

export interface CloneSessionCurrentGachaPack {
    id: string;
    game_id: string;
    code_name: string;
    name: string;
    item_pool?: CloneSessionCurrentGachaPackPoolItem[];
    collect_destination?: string;
    key_requirements?: CloneSessionCurrentGachaPackKeyRequirement[];
    metadata?: Record<string, string | number | boolean | null | undefined>;
    is_enabled?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
    previously_cloned?: boolean;
    cloned_target_id?: string | null;
    clone_adoption_kind?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CloneSessionCurrentQuestsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    quests?: CloneSessionCurrentQuestDefinition[];
    quest_definitions?: CloneSessionCurrentQuestDefinition[];
}

export interface CloneSessionCurrentShopDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    shop_definitions?: CloneSessionCurrentShopDefinition[];
    shops?: CloneSessionCurrentShopDefinition[];
}

export interface CloneSessionCurrentPresetDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    preset_definitions?: CloneSessionCurrentPresetDefinition[];
    presets?: CloneSessionCurrentPresetDefinition[];
}

export interface CloneSessionCurrentGachaPacksResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    gacha_packs?: CloneSessionCurrentGachaPack[];
}

export interface CloneSessionCurrentItemsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentItemContainersParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentItemTagsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentEquipmentSlotDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentQuestsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentShopDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentPresetDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentGachaPacksParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export type CloneSessionIgnoreContentType =
    | "item_definition"
    | "item_container_definition"
    | "equipment_slot_definition"
    | "item_tag"
    | "quest_definition"
    | "shop_definition"
    | "preset_definition"
    | "gacha_pack";

export interface CloneSessionManualOverwritePairPayload {
    content_type: CloneSessionIgnoreContentType;
    source_id: string;
    target_id: string;
}

export interface ListCloneableGamesParams {
    targetGameId: string;
    name?: string;
    gameId?: string;
    offset?: number;
    sameStudio?: boolean;
    isMyGame?: boolean;
    isPurchased?: boolean;
}
// Get all games for a specific studio
export async function getStudioGames(studioId: string, limit: number = 50, offset: number = 0): Promise<Game[]> {
    const data = await api.get(`/api/v1/studios/${studioId}/games/me?limit=${limit}&offset=${offset}`);
    return Array.isArray(data) ? data : [];
}
// Get a specific game by ID
export async function getGame(gameId: string): Promise<Game> {
    return await api.get(`/api/v1/games/${gameId}`);
}
// Create a new game for a studio
export async function createGame(studioId: string, gameData: {
    name: string;
    description?: string;
    game_type?: string;
    config?: {
        max_players?: number;
        server_region?: string;
        [key: string]: any;
    };
}): Promise<Game> {
    // Set default values
    const requestData = {
        name: gameData.name,
        description: gameData.description || "",
        game_type: gameData.game_type || "idle",
        config: gameData.config || {
            max_players: 1000,
            server_region: "us-west"
        }
    };
    return await api.post(`/api/v1/studios/${studioId}/games`, requestData);
}
// Update an existing game
export async function updateGame(gameId: string, gameData: {
    name?: string;
    description?: string;
    is_active?: boolean;
    status?: string;
    share_level?: "private" | "protected" | "public";
    clone_cost?: number;
    tags?: string[];
    config?: {
        max_players?: number;
        server_region?: string;
        [key: string]: any;
    };
    settings?: {
        allow_player_trading?: boolean;
        [key: string]: any;
    };
}, options?: { suppressToast?: boolean }): Promise<Game> {
    return await api.patch(`/api/v1/games/${gameId}`, gameData, options);
}
// Get all games of current user
export async function getAllGames(): Promise<Game[]> {
    const data = await api.get("/api/v1/me/games");
    return data?.games && Array.isArray(data.games) ? data.games : [];
}

export async function listCloneableGames(params: ListCloneableGamesParams): Promise<CloneableGamesResponse> {
    const searchParams = new URLSearchParams({
        offset: String(params.offset ?? 0),
    });

    if (params.name) {
        searchParams.set("name", params.name);
    }

    if (params.gameId) {
        searchParams.set("game_id", params.gameId);
    }

    if (typeof params.sameStudio === "boolean") {
        searchParams.set("same_studio", String(params.sameStudio));
    }

    if (typeof params.isMyGame === "boolean") {
        searchParams.set("is_my_game", String(params.isMyGame));
    }

    if (typeof params.isPurchased === "boolean") {
        searchParams.set("is_purchased", String(params.isPurchased));
    }

    const data = await api.get(`/api/v1/games/${params.targetGameId}/cloneable?${searchParams.toString()}`);
    const total = Number(data?.total ?? 0);
    return {
        games: Array.isArray(data?.games) ? data.games : [],
        total: Number.isFinite(total) ? total : 0,
    };
}

export async function createCloneSession(targetGameId: string, sourceGameId: string, name: string): Promise<CloneSessionResponse> {
    const response = await api.post(`/api/v1/games/${targetGameId}/clone-sessions`, {
        name,
        source_game_id: sourceGameId,
    }, { suppressToast: true });

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sgem-wallet:refresh", {
            detail: { skipSourceGameWalletRefresh: true },
        }));
    }

    return response;
}
// Lấy tất cả item profiles của 1 game
export async function fetchGameItemProfiles(gameId: string, params?: Record<string, string>): Promise<any[]> {
    let query = '';
    if (params) {
        query = '?' + new URLSearchParams(params).toString();
    }
    const data = await api.get(`/api/games/${gameId}/item-profiles${query}`);
    return data.data || [];
}
/**
 * Deletes a game by ID
 */
export async function deleteGame(gameId: string): Promise<void> {
    await api.delete(`/api/v1/games/${gameId}`);
}
/**
 * Fetches all teams assigned to a specific game
 */
export async function fetchGameTeams(gameId: string): Promise<Team[]> {
    const data = await api.get(`/api/v1/games/${gameId}/teams`);
    return data?.teams && Array.isArray(data.teams) ? data.teams : [];
}
/**
 * Unassigns a team from a game
 */
export async function unassignTeamFromGame(gameId: string, teamId: string): Promise<void> {
    await api.delete(`/api/v1/teams/${teamId}/games/${gameId}`);
}
/**
 * Assigns a team to a game
 */
export async function assignTeamToGame(teamId: string, gameId: string): Promise<void> {
    await api.post(`/api/v1/teams/${teamId}/games`, {
        game_id: gameId,
    });
}
export interface GameCcu {
    game_id: string;
    ccu: {
        current: number;
        limit: number;
        utilization_pct: number;
    };
}
/**
 * Get CCU (concurrent connected users) for a game
 */
export async function getGameCcu(gameId: string): Promise<GameCcu> {
    return await api.get(`/api/v1/games/${gameId}/ccu`);
}
/**
 * Get all available game tags
 */
export async function getAllGameTags(): Promise<string[]> {
    const data = await api.get(`/api/v1/game-tags`);
    return Array.isArray(data) ? data : (data?.tags ?? []);
}

export async function getCurrentCloneSession(gameId: string): Promise<CloneSessionSnapshot> {
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current`, { suppressToast: true });
}

export async function runCloneSession(sessionId: string): Promise<CloneSessionSnapshot> {
    return await api.post(`/api/v1/game-clone-sessions/${sessionId}/run`, undefined, { suppressToast: true });
}

export async function completeCloneSession(sessionId: string): Promise<CloneSessionSnapshot> {
    return await api.post(`/api/v1/game-clone-sessions/${sessionId}/complete`, undefined, { suppressToast: true });
}

export async function updateCloneSessionRunOptions(
    sessionId: string,
    options: CloneSessionRunOptions,
): Promise<CloneSessionSnapshot> {
    return await api.patch(`/api/v1/game-clone-sessions/${sessionId}/run-options`, options, { suppressToast: true });
}

export async function ignoreCloneSessionContent(sessionId: string, contentType: CloneSessionIgnoreContentType, sourceId: string): Promise<void> {
    await api.post(`/api/v1/game-clone-sessions/${sessionId}/ignore`, {
        content_type: contentType,
        source_id: sourceId,
    }, { suppressToast: true });
}

export async function unignoreCloneSessionContent(sessionId: string, contentType: CloneSessionIgnoreContentType, sourceId: string): Promise<void> {
    await api.post(`/api/v1/game-clone-sessions/${sessionId}/unignore`, {
        content_type: contentType,
        source_id: sourceId,
    }, { suppressToast: true });
}

export async function createCloneSessionManualOverwritePair(
    sessionId: string,
    payload: CloneSessionManualOverwritePairPayload,
): Promise<void> {
    await api.post(`/api/v1/game-clone-sessions/${sessionId}/manual-overwrite-pairs`, payload, { suppressToast: true });
}

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

export async function deleteCurrentCloneSession(gameId: string): Promise<void> {
    await api.post(`/api/v1/games/${gameId}/clone-sessions/current/delete`, undefined, { suppressToast: true });
}

export async function getActiveCloneSessions(sourceGameId: string): Promise<ActiveCloneSessionsResponse> {
    return await api.get(`/api/v1/games/${sourceGameId}/clone-sessions/active`, { suppressToast: true });
}
