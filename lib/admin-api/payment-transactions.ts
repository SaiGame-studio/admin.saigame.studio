import { api } from "@/lib/api-client";

export type AdminTransactionStatus = "pending" | "completed" | "failed" | "credit_failed" | "processing" | "awaiting_payment" | "expired" | "rejected";

export interface AdminTransaction {
    id: string;
    idempotency_key: string;
    user_id: string;
    currency_type: "sgem" | "scoin";
    currency_package_id: string;
    payment_method_config_id: string;
    provider_key: string;
    amount: number;
    currency: string;
    currency_amount: number;
    status: AdminTransactionStatus;
    provider_data: Record<string, unknown> & {
        transfer_info?: unknown;
        status_reason?: unknown;
    };
    currency_credited_at?: string;
    created_at: string;
    updated_at: string;
}

export interface AdminTransactionsResult {
    limit: number;
    transactions: AdminTransaction[];
}

export interface ManuallyRejectTransactionResult {
    status: "rejected";
}

export async function manuallyCreditTransaction(id: string, reason: string): Promise<void> {
    return api.post(`/api/v1/superadmin/payment/transactions/${encodeURIComponent(id)}/manually-credit`, { reason });
}

export async function manuallyRejectTransaction(id: string, reason: string): Promise<ManuallyRejectTransactionResult> {
    return api.post(`/api/v1/superadmin/payment/transactions/${encodeURIComponent(id)}/manually-reject`, { reason });
}

export async function listAdminTransactions(params?: {
    limit?: number;
    status?: AdminTransactionStatus | "";
    id?: string;
}): Promise<AdminTransactionsResult> {
    const query = new URLSearchParams();
    if (params?.limit)
        query.set("limit", String(params.limit));
    if (params?.status)
        query.set("status", params.status);
    if (params?.id)
        query.set("id", params.id);
    const qs = query.toString();
    return api.get(`/api/v1/superadmin/payment/transactions${qs ? `?${qs}` : ""}`);
}
