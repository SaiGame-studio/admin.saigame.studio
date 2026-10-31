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
    /** Default false: hidden from players on Sai Play; studio members still see it. */
    is_public: boolean;
    /** The game's main currency, shown in the Shops tab on Sai Play; sGem by default. */
    main_currency: GameMainCurrency | null;
    /** Seconds left (at response time) before the banner can be deleted or replaced; 0 when it already can. */
    image_locked_seconds?: number;
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
    /** game_media_assets id from createGameImageUpload; the server saves that asset's URL as image_url. */
    image_asset_id?: string;
    /** Omit to keep the saved value. */
    is_public?: boolean;
    /** Omit to keep the saved value (a new record uses sgem). */
    main_currency_type?: "sgem" | "item";
    /** Required when main_currency_type is "item": a currency item definition of the game. */
    main_currency_item_def_id?: string;
}

export interface GameMainCurrency {
    type: "sgem" | "item";
    item_def_id: string | null;
    item_code: string | null;
    name: string;
}

/** Main currency picker value for sGem (the default); any other value is a currency item definition id. */
export const MAIN_CURRENCY_SGEM = "sgem";

export function mainCurrencyValue(currency: GameMainCurrency | null | undefined): string {
    return currency?.type === "item" && currency.item_def_id ? currency.item_def_id : MAIN_CURRENCY_SGEM;
}

export function mainCurrencyPayload(value: string): Pick<UpsertGamePublicInfoInput, "main_currency_type" | "main_currency_item_def_id"> {
    return value === MAIN_CURRENCY_SGEM ? { main_currency_type: "sgem" } : { main_currency_type: "item", main_currency_item_def_id: value };
}

export async function getGamePublicInfo(gameId: string): Promise<GamePublicInfo> {
    // Signed in, so a game that is not public still loads for studio members.
    return api.get(`/api/v1/public/games/${gameId}/info`, {
        suppressToast: true,
    });
}

export async function upsertGamePublicInfo(gameId: string, input: UpsertGamePublicInfoInput, options?: { suppressToast?: boolean }): Promise<GamePublicInfo> {
    return api.put(`/api/v1/games/${gameId}/public-info`, input, options);
}

/**
 * DELETE /api/v1/games/{game_id}/public-info/image — the server deletes the image from the CDN first,
 * then from the database, and returns the updated public info.
 */
export async function deleteGamePublicInfoImage(gameId: string): Promise<GamePublicInfo> {
    return api.delete(`/api/v1/games/${gameId}/public-info/image`, { suppressToast: true });
}

/** A presigned upload URL for one game image (POST /api/v1/games/{game_id}/public-info/image-upload). */
export interface GameImageUpload {
    asset_id: string;
    upload_url: string;
    method: string;
    headers: Record<string, string>;
    public_url: string;
    max_bytes: number;
    expires_at: string;
}

export const acceptedGameImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
/** Mirrors the server default (MEDIA_UPLOAD_MAX_BYTES); the server has the final say. */
export const maxGameImageBytes = 5 * 1024 * 1024;

export async function createGameImageUpload(gameId: string, file: File): Promise<GameImageUpload> {
    return api.post(`/api/v1/games/${gameId}/public-info/image-upload`, { content_type: file.type, size: file.size }, { suppressToast: true });
}

/** Uploads the file straight to the bucket (S3 / R2) with the signed URL; no credentials are sent from the browser. */
export async function uploadToPresignedUrl(upload: GameImageUpload, file: File): Promise<void> {
    const response = await fetch(upload.upload_url, { method: upload.method, headers: upload.headers, body: file });
    if (!response.ok) {
        throw new Error(`Image upload failed with status ${response.status}`);
    }
}
