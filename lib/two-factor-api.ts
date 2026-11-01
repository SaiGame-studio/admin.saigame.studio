import { apiRequest, ApiError } from "@/lib/api-client";

export interface TwoFactorStatus { enabled: boolean; can_disable: boolean; available: boolean; recovery_codes_remaining: number }
export interface TwoFactorSetup { secret: string; qr_code: string; expires_in: number }
export interface TwoFactorChallenge { user_id: string; challenge_token: string; expires_in: number; message_code: "TWO_FACTOR_REQUIRED" }
export interface TwoFactorLogin { access_token: string; refresh_token: string }
export interface TwoFactorProof { code?: string; recovery_code?: string }
export interface TwoFactorChange { enabled: boolean; issuer?: string; recovery_codes?: string[]; reauthentication_required: boolean }

export function factorProof(value: string, recovery: boolean): TwoFactorProof {
    return recovery ? { recovery_code: value.trim() } : { code: value.trim() };
}
export function validFactorProof(value: string, recovery: boolean): boolean {
    return recovery ? /^[a-f0-9]{32}$/i.test(value.replace(/-/g, "")) : /^\d{6}$/.test(value);
}

export const twoFactorApi = {
    status: (): Promise<TwoFactorStatus> => apiRequest("/api/v1/auth/2fa/status", { suppressToast: true }),
    setup: (): Promise<TwoFactorSetup> => apiRequest("/api/v1/auth/2fa/setup", { method: "POST", suppressToast: true }),
    change: (enable: boolean, proof: TwoFactorProof): Promise<TwoFactorChange> => apiRequest(`/api/v1/auth/2fa/${enable ? "confirm" : "disable"}`, { method: "POST", body: proof, suppressToast: true }),
    replacementSetup: (proof: TwoFactorProof): Promise<TwoFactorSetup> => apiRequest("/api/v1/auth/2fa/replacement/setup", { method: "POST", body: proof, suppressToast: true }),
    replacementConfirm: (code: string): Promise<TwoFactorChange> => apiRequest("/api/v1/auth/2fa/replacement/confirm", { method: "POST", body: { code }, suppressToast: true }),
    regenerateRecovery: (proof: TwoFactorProof): Promise<TwoFactorChange> => apiRequest("/api/v1/auth/2fa/recovery-codes/regenerate", { method: "POST", body: proof, suppressToast: true }),
    verify: (challenge: TwoFactorChallenge, proof: TwoFactorProof): Promise<TwoFactorLogin> => apiRequest("/api/v1/auth/2fa/verify", { method: "POST", requireAuth: false, suppressToast: true, body: { user_id: challenge.user_id, challenge_token: challenge.challenge_token, ...proof } }),
};

export function twoFactorErrorKey(error: unknown): string {
    const code = error instanceof ApiError ? error.data?.message_code : undefined;
    const keys: Record<string, string> = {
        TWO_FACTOR_INVALID_CODE: "invalidCode", TWO_FACTOR_RATE_LIMITED: "rateLimited",
        TWO_FACTOR_STUDIO_HISTORY_LOCKED: "studioLocked", TWO_FACTOR_STATE_CHANGED: "stateChanged",
        TWO_FACTOR_UNAVAILABLE: "unavailable",
    };
    return `twoFactor.${keys[code] || "failed"}`;
}
