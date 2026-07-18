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

/**
 * Get all database backup files
 */
export async function getDBBackups(): Promise<DBBackupsResult> {
    return api.get("/api/v1/admin/db-backups");
}

/**
 * Delete a database backup file
 */
export async function deleteDBBackup(fileName: string): Promise<void> {
    return api.delete(`/api/v1/admin/db-backups/${encodeURIComponent(fileName)}`);
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
