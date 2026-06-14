import type { ApiResponse, Studio } from "@/types/studio";
import type { Game } from "@/types/game";
import type { Team } from "@/types/team";
export interface StudioMember {
    id: string;
    studio_id: string;
    user_id: string;
    is_owner: boolean;
    is_active: boolean;
    invited_by?: string;
    invited_at?: string;
    joined_at?: string;
    created_at: string;
    updated_at: string;
    email?: string;
    display_name?: string;
    teams?: {
        id: string;
        name: string;
    }[];
}
import { getCacheItem, setCacheItem } from "@/lib/utils/cache-utils";
import { api } from "@/lib/api-client";
/**
 * Fetches all studios for the current user
 */
export async function fetchUserStudios(): Promise<Studio[]> {
    const data = await api.get("/api/v1/studios/me");
    // API trả về trực tiếp array của studios, không có wrapper data
    return Array.isArray(data) ? data : [];
}
/**
 * Fetches a single studio by ID
 */
export async function fetchStudio(id: string): Promise<Studio> {
    const data = await api.get(`/api/v1/studios/${id}`);
    // API trả về trực tiếp studio object
    return data;
}
/**
 * Fetches a single studio by ID with caching support
 * @param id Studio ID
 * @param forceRefresh If true, bypass cache and fetch fresh data
 * @param cacheExpiry Cache expiry time in milliseconds (default: 24 hours)
 */
export async function fetchStudioWithCache(id: string, forceRefresh: boolean = false, cacheExpiry: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<Studio> {
    const cacheKey = `studio_${id}`;
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
        const cachedStudio = getCacheItem<Studio>(cacheKey);
        if (cachedStudio) {
            return cachedStudio;
        }
    }
    // Fetch from API
    const studio = await fetchStudio(id);
    // Cache the result
    setCacheItem(cacheKey, studio, cacheExpiry);
    return studio;
}
/**
 * Creates a new studio
 */
export async function createStudio(studioData: {
    name: string;
}): Promise<Studio> {
    const data = await api.post("/api/v1/studios", studioData);
    // API trả về trực tiếp studio object
    return data;
}
/**
 * Updates an existing studio
 */
export async function updateStudio(id: string, studioData: {
    name?: string;
    description?: string;
}): Promise<Studio> {
    const data = await api.put(`/api/v1/studios/${id}`, studioData);
    return data.data || data;
}
/**
 * Creates a new game for a studio
 */
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
    const data = await api.post(`/api/v1/studios/${studioId}/games`, requestData);
    return data;
}
/**
 * Fetches all games for a specific studio
 */
export async function fetchStudioGames(studioId: string): Promise<Game[]> {
    const data = await api.get(`/api/v1/studios/${studioId}/games/me`);
    return Array.isArray(data) ? data : [];
}
/**
 * Fetches all teams for a specific studio
 */
export async function fetchStudioTeams(studioId: string): Promise<Team[]> {
    const data = await api.get(`/api/v1/studios/${studioId}/teams`);
    return Array.isArray(data) ? data : [];
}
/**
 * Fetches all members of a specific studio
 */
export async function fetchStudioMembers(studioId: string): Promise<StudioMember[]> {
    const data = await api.get(`/api/v1/studios/${studioId}/members`);
    return Array.isArray(data) ? data : [];
}
/**
 * Removes a member from a studio
 */
export async function removeStudioMember(studioId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/studios/${studioId}/members/${userId}`);
}
