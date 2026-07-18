import { api } from "@/lib/api-client";

export interface WorkerDetails {
    [key: string]: string;
}

export interface WorkerTelegramPreview {
    chat_id: string;
    text: string;
}

export interface WorkerMeta {
    description?: string;
    collects_data?: string[];
    telegram_preview?: WorkerTelegramPreview;
    no_trigger_reason?: string;
}

export type WorkerState = "running" | "idle" | "pending" | "disabled";

export interface Worker {
    name: string;
    state: WorkerState;
    running: boolean;
    last_event_at?: string;
    last_run?: string;
    next_notify_at?: string;
    details?: WorkerDetails;
    meta?: WorkerMeta;
}

export interface WorkersStatusResult {
    collected_at: string;
    workers: Worker[];
}

export interface BackfillRequest {
    studio_id: string;
    game_id: string;
    dates: string[];
}

export async function getWorkersStatus(): Promise<WorkersStatusResult> {
    return api.get(`/api/v1/admin/workers/status`);
}

export async function triggerWorker(name: string): Promise<void> {
    return api.post(`/api/v1/admin/workers/${encodeURIComponent(name)}/trigger`);
}

export async function triggerSystemMonitorNotify(): Promise<void> {
    return api.post(`/api/v1/admin/system-monitor/notify`);
}

export async function triggerPlatformReport(date?: string): Promise<void> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    return api.post(`/api/v1/admin/notifications/platform/report${qs}`);
}

export async function triggerReportBackfill(body: BackfillRequest): Promise<void> {
    return api.post(`/api/v1/admin/reports/backfill`, body);
}

export interface SystemStats {
    cpu_pct: number;
    ram_pct: number;
    ram_used_mb: number;
    ram_total_mb: number;
    disk_pct: number;
    disk_used_gb: number;
    disk_total_gb: number;
}

export async function getSystemStats(): Promise<SystemStats> {
    return api.get(`/api/v1/admin/system-monitor/stats`);
}
