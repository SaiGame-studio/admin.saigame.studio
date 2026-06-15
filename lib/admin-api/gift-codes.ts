import { api } from "@/lib/api-client";

export interface GiftCode {
    id: string;
    code: string;
    coins_amount: number;
    max_uses: number;
    used_count: number;
    expires_at: string | null;
    active_at: string | null;
    description: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface GiftCodesResult {
    gift_codes: GiftCode[];
    total: number;
    limit: number;
    offset: number;
}

export interface GiftCodeRedemption {
    id: string;
    gift_code_id: string;
    user_id: string;
    redeemed_at: string;
}

export interface GiftCodeRedemptionsResult {
    gift_code_id: string;
    redemptions: GiftCodeRedemption[];
    total: number;
    limit: number;
    offset: number;
}

export interface CreateGiftCodeBody {
    code: string;
    coins_amount: number;
    max_uses: number;
    description: string;
    active_at?: string | null;
    expires_at?: string | null;
}

export interface UpdateGiftCodeBody {
    description?: string;
    active_at?: string | null;
    expires_at?: string | null;
    max_uses?: number;
}

export async function listGiftCodes(limit = 20, offset = 0): Promise<GiftCodesResult> {
    return api.get(`/api/v1/admin/gift-codes?limit=${limit}&offset=${offset}`);
}

export async function getGiftCode(id: string): Promise<GiftCode> {
    return api.get(`/api/v1/admin/gift-codes/${id}`);
}

export async function createGiftCode(body: CreateGiftCodeBody): Promise<GiftCode> {
    return api.post(`/api/v1/admin/gift-codes`, body);
}

export async function updateGiftCode(id: string, body: UpdateGiftCodeBody): Promise<GiftCode> {
    return api.put(`/api/v1/admin/gift-codes/${id}`, body);
}

export async function deleteGiftCode(id: string): Promise<void> {
    return api.delete(`/api/v1/admin/gift-codes/${id}`);
}

export async function listGiftCodeRedemptions(id: string, limit = 20, offset = 0): Promise<GiftCodeRedemptionsResult> {
    return api.get(`/api/v1/admin/gift-codes/${id}/redemptions?limit=${limit}&offset=${offset}`);
}
