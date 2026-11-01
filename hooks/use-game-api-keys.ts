"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { listGameAPIKeys, type GameAPIKey, type GameAPIKeyMeta } from "@/lib/game-api-keys";

export function useGameAPIKeys(gameId: string) {
    const [keys, setKeys] = useState<GameAPIKey[]>([]);
    const [meta, setMeta] = useState<GameAPIKeyMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const generation = useRef(0);
    const load = useCallback(async (after?: string) => {
        const current = ++generation.current;
        setLoading(true);
        setError(null);
        try {
            const result = await listGameAPIKeys(gameId, after);
            if (current !== generation.current) return;
            setKeys(previous => after ? [...previous, ...result.data.filter(key => !previous.some(old => old.id === key.id))] : result.data);
            setMeta(result.meta);
        } catch (err) {
            if (current !== generation.current) return;
            setError(err);
            // Do not leave privileged controls or old records visible after access is lost.
            setMeta(null);
            setKeys([]);
        } finally {
            if (current === generation.current) setLoading(false);
        }
    }, [gameId]);
    useEffect(() => {
        setKeys([]);
        setMeta(null);
        void load();
        return () => { generation.current++; };
    }, [load]);
    return {
        keys, meta, loading, error,
        canRead: meta !== null,
        forbidden: error instanceof ApiError && error.status === 403,
        reload: () => load(),
        loadMore: () => meta?.next_cursor ? load(meta.next_cursor) : Promise.resolve(),
    };
}
export type GameAPIKeysState = ReturnType<typeof useGameAPIKeys>;
