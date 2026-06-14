import { api } from '@/lib/api-client';
import type { LoreEntry, ListLoreEntriesResponse, CreateLoreEntryRequest, UpdateLoreEntryRequest, } from '@/types/lore';
export interface ListLoreParams {
    limit?: number;
    offset?: number;
    type?: string;
    q?: string;
    id?: string;
}
/** GET /api/v1/games/:gameId/lore — List lore entries with optional type filter, text search and pagination */
export async function listLoreEntries(gameId: string, params?: ListLoreParams): Promise<ListLoreEntriesResponse> {
    const query = new URLSearchParams();
    if (params?.limit != null)
        query.set('limit', String(params.limit));
    if (params?.offset != null)
        query.set('offset', String(params.offset));
    if (params?.type)
        query.set('type', params.type);
    if (params?.q)
        query.set('q', params.q);
    if (params?.id)
        query.set('id', params.id);
    const qs = query.toString();
    return api.get(`/api/v1/games/${gameId}/lore${qs ? `?${qs}` : ''}`);
}
/** POST /api/v1/games/:gameId/lore — Create a lore entry */
export async function createLoreEntry(gameId: string, body: CreateLoreEntryRequest): Promise<LoreEntry> {
    return api.post(`/api/v1/games/${gameId}/lore`, body);
}
/** GET /api/v1/games/:gameId/lore/:loreEntryId — Get a lore entry */
export async function getLoreEntry(gameId: string, loreEntryId: string): Promise<LoreEntry> {
    return api.get(`/api/v1/games/${gameId}/lore/${loreEntryId}`);
}
/** PATCH /api/v1/games/:gameId/lore/:loreEntryId — Partially update a lore entry */
export async function updateLoreEntry(gameId: string, loreEntryId: string, body: UpdateLoreEntryRequest): Promise<LoreEntry> {
    return api.patch(`/api/v1/games/${gameId}/lore/${loreEntryId}`, body);
}
/** DELETE /api/v1/games/:gameId/lore/:loreEntryId — Soft-delete a lore entry */
export async function deleteLoreEntry(gameId: string, loreEntryId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/lore/${loreEntryId}`);
}
/** GET /api/v1/lore/types — Get all available lore type values */
export async function getLoreTypes(): Promise<string[]> {
    const res: {
        data: string[];
    } = await api.get('/api/v1/lore/types');
    return res.data ?? [];
}
