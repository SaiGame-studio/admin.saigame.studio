import { api } from "@/lib/api-client";
import { getValidToken } from "@/lib/auth-utils";

export interface DBBackupItem {
    file_name: string;
    size_bytes: number;
    modified_at: string;
}

export interface DBBackupsResult {
    items: DBBackupItem[];
    total: number;
}

export interface CurrentDatabaseInfo {
    database_name: string;
    user_count: number;
    latest_user_name: string;
    latest_user_created_at: string | null;
    item_definition_count: number;
    latest_item_definition_name: string;
    latest_item_definition_created_at: string | null;
}

/**
 * Get all database backup files
 */
export async function getDBBackups(): Promise<DBBackupsResult> {
    return api.get("/api/v1/admin/db-backups");
}

/**
 * Get summary information for the database used by the running backend.
 */
export async function getCurrentDatabaseInfo(): Promise<CurrentDatabaseInfo> {
    return api.get("/api/v1/admin/db-backups/current-database");
}

/**
 * Delete a database backup file
 */
export async function deleteDBBackup(fileName: string): Promise<void> {
    return api.delete(`/api/v1/admin/db-backups/${encodeURIComponent(fileName)}`);
}

/**
 * Create a database backup on demand. This is available even when scheduled
 * backups are disabled.
 */
export async function triggerDBBackup(): Promise<void> {
    return api.post("/api/v1/admin/workers/db_backup/trigger");
}

/**
 * Helper to download a backup file using fetch to handle JWT Authorization
 */
export async function downloadDBBackup(fileName: string): Promise<void> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) {
        throw new Error("API URL is not configured.");
    }

    const token = getValidToken();
    const response = await fetch(`${API_URL}/api/v1/admin/db-backups/${encodeURIComponent(fileName)}/download`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}
