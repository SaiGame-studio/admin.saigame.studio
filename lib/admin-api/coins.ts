import { api } from "@/lib/api-client";

export interface CoinTransaction {
    id: string;
    user_id: string;
    amount: number;
    type: string;
    status: string;
    balance_before: number | null;
    balance_after: number | null;
    reference_id: string | null;
    reference_type: string | null;
    description: string;
    error_message: string | null;
    created_by: string | null;
    created_at: string;
    processed_at: string | null;
}

export async function adminCoinTopUp(body: {
    user_id: string;
    amount: number;
    description: string;
}): Promise<CoinTransaction> {
    return api.post(`/api/v1/admin/coins/topup`, body);
}
