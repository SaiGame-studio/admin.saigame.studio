/**
 * Event Type API — v1 endpoints
 * Routes: /api/v1/games/{game_id}/event-types
 */
import { api } from '@/lib/api-client';
// ─── Types ────────────────────────────────────────────────────────────────────
export interface EventType {
    id: string;
    studio_id: string;
    game_id: string;
    event_type: string;
    description: string;
    created_by: string;
    created_at: string;
}
export interface CreateEventTypeRequest {
    event_type: string;
    description?: string;
}
export interface UpdateEventTypeRequest {
    description?: string;
}
// ─── API functions ────────────────────────────────────────────────────────────
export async function listEventTypes(gameId: string): Promise<EventType[]> {
    const data = await api.get(`/api/v1/games/${gameId}/event-types`);
    return Array.isArray(data) ? data : [];
}
export async function createEventType(gameId: string, body: CreateEventTypeRequest): Promise<EventType> {
    return api.post(`/api/v1/games/${gameId}/event-types`, body);
}
export async function updateEventType(gameId: string, eventTypeId: string, body: UpdateEventTypeRequest): Promise<EventType> {
    return api.patch(`/api/v1/games/${gameId}/event-types/${eventTypeId}`, body);
}
export async function deleteEventType(gameId: string, eventTypeId: string): Promise<void> {
    await api.delete(`/api/v1/games/${gameId}/event-types/${eventTypeId}`);
}
