import { api } from './api-client';
export interface ReferralCode {
    id: string;
    code: string;
    created_by: string;
    usage_limit: number;
    current_usage: number;
    is_active: boolean;
    metadata: Record<string, string> | null;
    created_at: string;
    updated_at: string;
}
export interface ReferralCodesResponse {
    items: ReferralCode[];
    limit: number;
    offset: number;
}
export interface CreateReferralCodePayload {
    code: string;
    usage_limit: number;
    metadata?: Record<string, string>;
}
export async function getReferralCodes(params?: {
    limit?: number;
    offset?: number;
}): Promise<ReferralCodesResponse> {
    const qs = new URLSearchParams();
    qs.set("limit", String(params?.limit ?? 20));
    qs.set("offset", String(params?.offset ?? 0));
    return api.get(`/api/v1/referral/me/codes?${qs.toString()}`);
}
export async function createReferralCode(payload: CreateReferralCodePayload): Promise<ReferralCode> {
    return api.post('/api/v1/referral/me/codes', payload);
}
export async function updateReferralCode(codeId: string, payload: {
    is_active: boolean;
}): Promise<ReferralCode> {
    return api.patch(`/api/v1/referral/me/codes/${codeId}`, payload);
}
export async function activateReferralCode(code: string): Promise<void> {
    await api.post('/api/v1/referral/me/activate', { code });
}
