import { api } from "@/lib/api-client";
import type {
    CloneSessionResponse,
    CloneSessionSnapshot,
    CloneSessionRunOptions,
    CloneSessionIgnoreContentType,
    CloneSessionManualOverwritePairPayload,
    ActiveCloneSessionsResponse,
} from "./clone-session-types";

export async function createCloneSession(targetGameId: string, sourceGameId: string, name: string): Promise<CloneSessionResponse> {
    const response = await api.post(`/api/v1/games/${targetGameId}/clone-sessions`, {
        name,
        source_game_id: sourceGameId,
    }, { suppressToast: true });

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sgem-wallet:refresh", {
            detail: { skipSourceGameWalletRefresh: true },
        }));
    }

    return response;
}

export async function getCurrentCloneSession(gameId: string): Promise<CloneSessionSnapshot> {
    return await api.get(`/api/v1/games/${gameId}/clone-sessions/current`, { suppressToast: true });
}

export async function runCloneSession(sessionId: string): Promise<CloneSessionSnapshot> {
    return await api.post(`/api/v1/game-clone-sessions/${sessionId}/run`, undefined, { suppressToast: true });
}

export async function completeCloneSession(sessionId: string): Promise<CloneSessionSnapshot> {
    return await api.post(`/api/v1/game-clone-sessions/${sessionId}/complete`, undefined, { suppressToast: true });
}

export async function updateCloneSessionRunOptions(
    sessionId: string,
    options: CloneSessionRunOptions,
): Promise<CloneSessionSnapshot> {
    return await api.patch(`/api/v1/game-clone-sessions/${sessionId}/run-options`, options, { suppressToast: true });
}

export async function ignoreCloneSessionContent(sessionId: string, contentType: CloneSessionIgnoreContentType, sourceId: string): Promise<void> {
    await api.post(`/api/v1/game-clone-sessions/${sessionId}/ignore`, {
        content_type: contentType,
        source_id: sourceId,
    }, { suppressToast: true });
}

export async function unignoreCloneSessionContent(sessionId: string, contentType: CloneSessionIgnoreContentType, sourceId: string): Promise<void> {
    await api.post(`/api/v1/game-clone-sessions/${sessionId}/unignore`, {
        content_type: contentType,
        source_id: sourceId,
    }, { suppressToast: true });
}

export async function createCloneSessionManualOverwritePair(
    sessionId: string,
    payload: CloneSessionManualOverwritePairPayload,
): Promise<void> {
    await api.post(`/api/v1/game-clone-sessions/${sessionId}/manual-overwrite-pairs`, payload, { suppressToast: true });
}

export async function deleteCurrentCloneSession(gameId: string): Promise<void> {
    await api.post(`/api/v1/games/${gameId}/clone-sessions/current/delete`, undefined, { suppressToast: true });
}

export async function getActiveCloneSessions(sourceGameId: string): Promise<ActiveCloneSessionsResponse> {
    return await api.get(`/api/v1/games/${sourceGameId}/clone-sessions/active`, { suppressToast: true });
}
