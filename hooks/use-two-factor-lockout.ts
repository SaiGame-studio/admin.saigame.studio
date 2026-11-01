"use client";

import { useCallback, useEffect, useState } from "react";

// The server enforces the account limit; storage keeps the dialog locked on reopen.
export function useTwoFactorLockout(userId?: string) {
    const storageKey = userId ? `two-factor-lockout:${userId}` : null;
    const [lockedUntil, setLockedUntil] = useState(0);
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        const read = () => {
            let until = 0;
            try {
                const stored = storageKey ? Number(localStorage.getItem(storageKey)) : 0;
                if (Number.isFinite(stored)) until = stored;
            } catch {
                // Server enforcement still applies when storage is unavailable.
            }
            setLockedUntil(until);
            setNow(Date.now());
        };
        read();
        const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
        window.addEventListener("storage", sync);
        return () => window.removeEventListener("storage", sync);
    }, [storageKey]);

    useEffect(() => {
        if (lockedUntil <= Date.now()) return;
        const timer = window.setInterval(() => {
            const currentTime = Date.now();
            setNow(currentTime);
            if (currentTime >= lockedUntil) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [lockedUntil]);

    const lockFor = useCallback((seconds: number) => {
        const currentTime = Date.now();
        const until = currentTime + seconds * 1000;
        setLockedUntil(until);
        setNow(currentTime);
        try {
            if (storageKey) localStorage.setItem(storageKey, String(until));
        } catch {
            // Keep the active dialog locked even when storage is unavailable.
        }
    }, [storageKey]);

    return { secondsRemaining: Math.max(0, Math.ceil((lockedUntil - now) / 1000)), lockFor };
}
