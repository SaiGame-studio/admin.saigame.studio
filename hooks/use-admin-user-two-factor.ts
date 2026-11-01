"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getAdminUserTwoFactorStatuses } from "@/lib/admin-user-two-factor-api";

export function useAdminUserTwoFactor(users: { id: string }[]) {
    const [flags, setFlags] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const generation = useRef(0);
    useEffect(() => {
        const current = ++generation.current;
        setFlags({}); setLoading(true);
        if (!users.length) { setLoading(false); return; }
        getAdminUserTwoFactorStatuses(users.map(user => user.id))
            .then(result => { if (generation.current === current) setFlags(result.statuses); })
            .catch(() => { if (generation.current === current) setFlags({}); })
            .finally(() => { if (generation.current === current) setLoading(false); });
        return () => { generation.current++; };
    }, [users]);
    const markDisabled = useCallback((userId: string) => {
        generation.current++;
        setFlags(previous => ({ ...previous, [userId]: false }));
        setLoading(false);
    }, []);
    return { flags, loading, markDisabled };
}
