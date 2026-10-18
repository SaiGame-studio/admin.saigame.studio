export interface MailboxAttachment {
    type: string;
    definition_id?: string;
    quantity: number;
}
export interface MailboxMessage {
    id: string;
    sender_id: string | null;
    subject: string;
    body: string;
    message_type: string;
    status: string;
    attachments: MailboxAttachment[];
    expires_at: string | null;
    read_at: string | null;
    claimed_at: string | null;
    created_at: string;
}
export interface MailboxResponse {
    limit: number;
    messages: MailboxMessage[];
    offset: number;
    profile_id: string;
    total: number;
    user_id: string;
}
export interface SystemMailForm {
    receiver_id: string;
    subject: string;
    body: string;
    message_type: "system_reward";
    idempotency_key: string;
    expires_in_days: number;
    attachments: Array<{
        type: "item" | "coin";
        definition_id?: string;
        quantity: number;
    }>;
}
export function isValidUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}
export function formatDate(dateStr: string | null): string {
    if (!dateStr)
        return "—";
    return new Date(dateStr).toLocaleString();
}
