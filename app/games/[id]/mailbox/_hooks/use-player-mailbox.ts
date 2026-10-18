import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { listItemDefinitions } from "@/lib/inventory-api";
import type { ItemDefinition } from "@/types/inventory";
import { isValidUUID, type MailboxResponse } from "../_components/mailbox-types";

export function usePlayerMailbox(gameId: string, receiverId: string) {
    const [mailboxData, setMailboxData] = useState<MailboxResponse | null>(null);
    const [mailboxLoading, setMailboxLoading] = useState(false);
    const [mailboxError, setMailboxError] = useState<string | null>(null);
    // Item definitions map for resolving attachment names
    const [itemDefsMap, setItemDefsMap] = useState<Record<string, ItemDefinition>>({});
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const fetchPlayerMailbox = useCallback(async (progressId: string) => {
        if (!progressId || !isValidUUID(progressId)) {
            setMailboxData(null);
            setMailboxError(null);
            return;
        }
        setMailboxLoading(true);
        setMailboxError(null);
        try {
            const data = await api.get(`/api/v1/gamer-progress/${progressId}/mailbox?limit=50`);
            setMailboxData(data);
            // Collect all unique definition_ids from attachments
            const defIds = new Set<string>();
            for (const msg of (data.messages ?? [])) {
                for (const att of (msg.attachments ?? [])) {
                    if (att.definition_id)
                        defIds.add(att.definition_id);
                }
            }
            // Fetch item definitions if we have IDs not yet in the map
            if (defIds.size > 0) {
                try {
                    const res = await listItemDefinitions({ gameId }, { limit: 200 });
                    setItemDefsMap((prev) => {
                        const map: Record<string, ItemDefinition> = { ...prev };
                        for (const item of (res.items ?? [])) {
                            map[item.id] = item;
                        }
                        return map;
                    });
                }
                catch {
                    // silently ignore — will fall back to showing IDs
                }
            }
        }
        catch (err: any) {
            setMailboxError(err?.message || "Failed to load mailbox");
            setMailboxData(null);
        }
        finally {
            setMailboxLoading(false);
        }
    }, [gameId]);
    // Debounced fetch when receiver_id changes
    useEffect(() => {
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchPlayerMailbox(receiverId);
        }, 600);
        return () => {
            if (debounceRef.current)
                clearTimeout(debounceRef.current);
        };
    }, [receiverId, fetchPlayerMailbox]);
    return { mailboxData, mailboxLoading, mailboxError, itemDefsMap, fetchPlayerMailbox };
}
