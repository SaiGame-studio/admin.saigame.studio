"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionTableRefreshButtonProps = {
    id: string;
    iconId: string;
    loading: boolean;
    t: TranslationFn;
    onRefresh: () => Promise<void>;
};

export function CurrentCloneSessionTableRefreshButton({ id, iconId, loading, t, onRefresh }: CurrentCloneSessionTableRefreshButtonProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
    const successTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (successTimeoutRef.current !== null) {
                window.clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const handleRefresh = async () => {
        if (isRefreshing || loading) {
            return;
        }

        if (successTimeoutRef.current !== null) {
            window.clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = null;
        }

        setShowRefreshSuccess(false);
        setIsRefreshing(true);

        try {
            await onRefresh();
            setShowRefreshSuccess(true);
            successTimeoutRef.current = window.setTimeout(() => {
                setShowRefreshSuccess(false);
                successTimeoutRef.current = null;
            }, 1600);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Button
            id={id}
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => void handleRefresh()}
            disabled={loading || isRefreshing}
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
        >
            {showRefreshSuccess ? (
                <Check id={`${iconId}-success`} className="h-3.5 w-3.5" />
            ) : (
                <RefreshCw id={iconId} className={`h-3.5 w-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`} />
            )}
        </Button>
    );
}
