import { apiRequest } from "@/lib/api-client";

export interface AdminTwoFactorDisableResult {
    user_id: string;
    enabled: false;
    sessions_revoked: boolean;
    reauthentication_required: boolean;
}

export function getAdminUserTwoFactorStatuses(userIds: string[]): Promise<{ statuses: Record<string, boolean> }> {
    return apiRequest("/api/v1/admin/users/2fa/status", { method: "POST", body: { user_ids: userIds }, suppressToast: true });
}

// Administrative management intentionally supports disabling only.
export function disableAdminUserTwoFactor(userId: string): Promise<AdminTwoFactorDisableResult> {
    return apiRequest(`/api/v1/admin/users/${encodeURIComponent(userId)}/2fa/disable`, { method: "POST", body: {}, suppressToast: true });
}
