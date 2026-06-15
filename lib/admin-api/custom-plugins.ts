import { api } from "@/lib/api-client";
import type { GamePluginSubscription, Plugin } from "@/lib/plugin-api";

export type { GamePluginSubscription, Plugin };

export interface CreateCustomPluginBody {
    display_name?: string;
    description?: string;
    ccu_grant?: number;
    profiles_grant?: number;
    items_grant?: number;
    shops_grant?: number;
    node_defs_grant?: number;
    event_types_grant?: number;
    boards_grant?: number;
    quests_grant?: number;
    entity_defs_grant?: number;
    gacha_grant?: number;
    scripts_grant?: number;
    duration_days?: number | null;
    is_template?: boolean;
}

export interface UpdateCustomPluginBody {
    display_name?: string;
    description?: string;
    ccu_grant?: number;
    profiles_grant?: number;
    items_grant?: number;
    shops_grant?: number;
    node_defs_grant?: number;
    event_types_grant?: number;
    boards_grant?: number;
    quests_grant?: number;
    entity_defs_grant?: number;
    gacha_grant?: number;
    scripts_grant?: number;
    duration_days?: number | null;
}

export interface AdminGameGrant {
    grant: GamePluginSubscription;
    plugin?: Plugin;
}

export async function createCustomPlugin(body: CreateCustomPluginBody): Promise<Plugin> {
    return api.post(`/api/v1/admin/plugins`, body);
}

export async function listCustomPlugins(): Promise<Plugin[]> {
    const data = await api.get(`/api/v1/admin/plugins`);
    return data?.plugins ?? [];
}

export async function getCustomPlugin(pluginId: string): Promise<Plugin> {
    return api.get(`/api/v1/admin/plugins/${pluginId}`);
}

export async function updateCustomPlugin(pluginId: string, body: UpdateCustomPluginBody): Promise<Plugin> {
    return api.put(`/api/v1/admin/plugins/${pluginId}`, body);
}

export async function deleteCustomPlugin(pluginId: string): Promise<void> {
    return api.delete(`/api/v1/admin/plugins/${pluginId}`);
}

export async function grantPluginToGame(gameId: string, pluginId: string, note?: string): Promise<GamePluginSubscription> {
    return api.post(`/api/v1/admin/games/${gameId}/plugins`, {
        plugin_id: pluginId,
        note: note ?? "",
    });
}

export async function listGameGrants(gameId: string): Promise<AdminGameGrant[]> {
    const data = await api.get(`/api/v1/admin/games/${gameId}/plugins`);
    return (data?.grants ?? []).map((g: GamePluginSubscription) => ({ grant: g }));
}

export async function revokeGameGrant(gameId: string, grantId: string): Promise<void> {
    return api.delete(`/api/v1/admin/games/${gameId}/plugins/${grantId}`);
}
