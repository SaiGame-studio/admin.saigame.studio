import { api } from "@/lib/api-client";
import type { TwoFactorProof } from "@/lib/two-factor-api";

export interface SteamRewardItem { item_definition_id: string; quantity: number }
export interface GameSteamSettings {
    game_id: string;
    enabled: boolean;
    app_id: number;
    reward_code: string;
    items: SteamRewardItem[];
    has_publisher_key: boolean;
    updated_at: string | null;
}
export interface UpdateGameSteamSettings {
    enabled: boolean;
    app_id: number;
    reward_code: string;
    items: SteamRewardItem[];
    publisher_key?: string;
}
const endpoint = (gameId: string) => `/api/v1/games/${encodeURIComponent(gameId)}/steam`;
export function getGameSteamSettings(gameId: string): Promise<GameSteamSettings> {
    return api.get(endpoint(gameId), { suppressToast: true });
}
export function saveGameSteamSettings(gameId: string, input: UpdateGameSteamSettings, proof: TwoFactorProof): Promise<GameSteamSettings> {
    return api.put(endpoint(gameId), { ...input, ...proof }, { suppressToast: true });
}
