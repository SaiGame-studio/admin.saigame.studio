"use client";

import { useEffect, useState } from "react";
import { twoFactorApi } from "@/lib/two-factor-api";

export function useTwoFactorGrace(open: boolean) {
    const [trusted, setTrusted] = useState(false);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setTrusted(false);
        setLoading(open);
        if (open) {
            twoFactorApi.status()
                .then(status => { if (!cancelled) setTrusted(status.enabled && status.verification_required === false); })
                .catch(() => { if (!cancelled) setTrusted(false); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }
        return () => { cancelled = true; };
    }, [open]);
    return { trusted, loading, requireVerification: () => setTrusted(false) };
}
