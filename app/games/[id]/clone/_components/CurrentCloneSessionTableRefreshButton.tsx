"use client";

import { RefreshCw } from "lucide-react";
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
    return (
        <Button id={id} type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => void onRefresh()} disabled={loading} aria-label={t("common.refresh")} title={t("common.refresh")}>
            <RefreshCw id={iconId} className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
    );
}
