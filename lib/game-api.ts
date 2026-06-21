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
    message?: string;
}

export interface CloneSessionEstimatedCost {
    currency?: string;
    amount?: number;
}

export interface CloneSessionLastRunResponse {
    warnings?: CloneSessionWarning[];
    estimated_clone_cost?: CloneSessionEstimatedCost;
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
    last_run_response?: CloneSessionLastRunResponse;
    progress?: Record<string, CloneSessionProgress>;
    message?: string;
}

export interface CloneSessionCurrentItemDefinition {
    id: string;
    game_id: string;
    item_code: string;
    name: string;
    category?: string;
    rarity?: string;
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

export type CloneSessionCurrentQuestDefinition = QuestDefinition;

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

export interface CloneSessionCurrentItemsParams {
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentItemContainersParams {
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentItemTagsParams {
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentQuestsParams {
    name?: string;
    limit?: number;
    offset?: number;
}

export interface ListCloneableGamesParams {
    targetGameId: string;
    name?: string;
    gameId?: string;
    offset?: number;
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
}): Promise<Game> {
    return await api.patch(`/api/v1/games/${gameId}`, gameData);
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

    const data = await api.get(`/api/v1/games/${params.targetGameId}/cloneable?${searchParams.toString()}`);
    const total = Number(data?.total ?? 0);
    return {
        games: Array.isArray(data?.games) ? data.games : [],
        total: Number.isFinite(total) ? total : 0,
    };
}

export async function createCloneSession(targetGameId: string, sourceGameId: string, name: string): Promise<CloneSessionResponse> {
    return await api.post(`/api/v1/games/${targetGameId}/clone-sessions`, {
        name,
        source_game_id: sourceGameId,
    }, { suppressToast: true });
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

export async function getCurrentCloneSessionItems(gameId: string, params?: CloneSessionCurrentItemsParams): Promise<CloneSessionCurrentItemsResponse> {
    const searchParams = new URLSearchParams();

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

export async function getCurrentCloneSessionQuests(gameId: string, params?: CloneSessionCurrentQuestsParams): Promise<CloneSessionCurrentQuestsResponse> {
    const searchParams = new URLSearchParams();

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

export async function deleteCurrentCloneSession(gameId: string): Promise<void> {
    await api.post(`/api/v1/games/${gameId}/clone-sessions/current/delete`, undefined, { suppressToast: true });
}
