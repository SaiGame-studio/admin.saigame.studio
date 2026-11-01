import type { TwoFactorProof } from "@/lib/two-factor-api";
import { api } from "@/lib/api-client";

export interface GameAPIKey {
    id: string;
    game_id: string;
    key_name: string;
    key_prefix: string;
    status: "active" | "revoked";
    last_used_at: string | null;
    revoked_at: string | null;
    revoked_by: string | null;
    created_at: number;
    api_key?: string;
}
export interface GameAPIKeyMeta {
    limit: number;
    used: number;
    next_cursor?: string;
    can_generate: boolean;
    can_revoke: boolean;
}
export interface GameAPIKeyResult<T> {
    success: boolean;
    data: T;
    meta: GameAPIKeyMeta;
}
const base = (gameId: string) => `/api/v1/games/${encodeURIComponent(gameId)}/api-keys`;
const options = { suppressToast: true };
export function listGameAPIKeys(gameId: string, after?: string): Promise<GameAPIKeyResult<GameAPIKey[]>> {
    const query = new URLSearchParams({ limit: "20" });
    if (after) query.set("after", after);
    return api.get(`${base(gameId)}?${query}`, options);
}
export function createGameAPIKey(gameId: string, keyName: string, proof: TwoFactorProof): Promise<GameAPIKeyResult<GameAPIKey>> {
    return api.post(base(gameId), { key_name: keyName, ...proof }, options);
}
export function renameGameAPIKey(gameId: string, keyId: string, keyName: string): Promise<GameAPIKeyResult<GameAPIKey>> {
    return api.patch(`${base(gameId)}/${encodeURIComponent(keyId)}`, { key_name: keyName }, options);
}
export function revokeGameAPIKey(gameId: string, keyId: string, proof: TwoFactorProof): Promise<GameAPIKeyResult<GameAPIKey>> {
    return api.delete(`${base(gameId)}/${encodeURIComponent(keyId)}`, { ...options, body: proof });
}

export interface GameAPIKeyAudit {
 id: string;
 game_id: string;
 key_id: string;
 key_name: string;
 action: "create" | "rename" | "revoke";
 actor: { id: string; name: string; email: string };
 created_at: string;
}
export function listGameAPIKeyAudit(gameId: string, after?: string): Promise<GameAPIKeyResult<GameAPIKeyAudit[]>> {
 const query = new URLSearchParams({ limit: "20" });
 if (after) query.set("after", after);
 return api.get(`${base(gameId)}/logs?${query}`, options);
}
