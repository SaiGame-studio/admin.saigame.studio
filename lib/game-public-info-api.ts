import { api } from "@/lib/api-client";

export type GameReleaseStatus = "released" | "coming_soon" | "to_be_announced";

export interface GamePublicInfo {
    id: string | null;
    game_id: string | null;
    game_name: string;
    release_status: GameReleaseStatus | null;
    release_at: string | null;
    release_date_text: string | null;
    content: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface UpsertGamePublicInfoInput {
    game_name: string;
    release_status: GameReleaseStatus;
    release_at?: string;
    release_date_text?: string;
    content: string;
}

export async function getGamePublicInfo(gameId: string): Promise<GamePublicInfo> {
    return api.get(`/api/v1/public/games/${gameId}/info`, {
        requireAuth: false,
        suppressToast: true,
    });
}

export async function upsertGamePublicInfo(gameId: string, input: UpsertGamePublicInfoInput): Promise<GamePublicInfo> {
    return api.put(`/api/v1/games/${gameId}/public-info`, input);
}
