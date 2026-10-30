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
    image_url: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface UpsertGamePublicInfoInput {
    game_name: string;
    release_status: GameReleaseStatus;
    release_at?: string;
    release_date_text?: string;
    content: string;
    image_url?: string;
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

/** A presigned S3 POST form for one game image (POST /api/v1/games/{game_id}/public-info/image-upload). */
export interface GameImageUpload {
    upload_url: string;
    fields: Record<string, string>;
    public_url: string;
    max_bytes: number;
    expires_at: string;
}

export const acceptedGameImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export async function createGameImageUpload(gameId: string, contentType: string): Promise<GameImageUpload> {
    return api.post(`/api/v1/games/${gameId}/public-info/image-upload`, { content_type: contentType }, { suppressToast: true });
}

/** Uploads the file straight to S3 with the signed form; no credentials are sent from the browser. */
export async function uploadToPresignedPost(upload: GameImageUpload, file: File): Promise<void> {
    const form = new FormData();
    for (const [name, value] of Object.entries(upload.fields)) {
        form.append(name, value);
    }
    form.append("file", file);
    const response = await fetch(upload.upload_url, { method: "POST", body: form });
    if (!response.ok) {
        throw new Error(`Image upload failed with status ${response.status}`);
    }
}
