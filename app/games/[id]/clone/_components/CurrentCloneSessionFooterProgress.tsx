"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCloneSessionPhaseLabel, getProgressValue } from "./cloneSessionProgressUtils";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CurrentCloneSessionFooterProgressProps = {
    t: TranslationFn;
    progressEntries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>;
    onRefresh: () => void | Promise<void>;
};

function toKebabIdSegment(value?: string) {
    if (!value) {
        return "unknown";
    }

    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function CurrentCloneSessionFooterProgress({
    t,
    progressEntries,
    onRefresh,
}: CurrentCloneSessionFooterProgressProps) {
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

    if (progressEntries.length === 0) {
        return null;
    }

    const handleRefresh = async () => {
        if (isRefreshing) {
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

    const totalProcessed = progressEntries.reduce((sum, [, progress]) => sum + (progress.processed ?? 0), 0);
    const totalItems = progressEntries.reduce((sum, [, progress]) => sum + (progress.total ?? 0), 0);
    const allCompleted = progressEntries.length > 0 && progressEntries.every(([, progress]) => progress.completed);
    const totalProgressValue = getProgressValue(totalProcessed, totalItems, allCompleted);

    return (
        <div id="clone-game-source-current-session-footer-progress" className="space-y-3 border-t px-6 pt-4 pb-4">
            <div id="clone-game-source-current-session-footer-progress-header" className="flex items-center justify-between gap-2">
                <p id="clone-game-source-current-session-footer-progress-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("cloneGame.sourceGameCurrentSessionProgressLabel")}
                </p>
                <Button
                    id="clone-game-source-current-session-footer-progress-refresh-btn"
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void handleRefresh()}
                    disabled={isRefreshing}
                    aria-label={t("common.refresh")}
                    title={t("common.refresh")}
                >
                    {showRefreshSuccess ? (
                        <Check id="clone-game-source-current-session-footer-progress-refresh-success-icon" className="h-3.5 w-3.5" />
                    ) : (
                        <RefreshCw
                            id="clone-game-source-current-session-footer-progress-refresh-icon"
                            className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                    )}
                </Button>
            </div>
            <div id="clone-game-source-current-session-total-progress-wrap" className="relative mb-4 mt-2">
                <Progress
                    id="clone-game-source-current-session-total-progress-bar"
                    value={totalProgressValue}
                    className="h-4"
                />
                <div id="clone-game-source-current-session-total-progress-overlay" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p id="clone-game-source-current-session-total-progress-text" className="text-[10px] font-medium text-foreground">
                        {totalProcessed}/{totalItems} ({Math.round(totalProgressValue)}%)
                    </p>
                </div>
            </div>
            <div id="clone-game-source-current-session-footer-progress-list" className="grid grid-cols-2 gap-3">
                {progressEntries.map(([phaseKey, progress], index) => {
                    const idSegment = toKebabIdSegment(phaseKey);
                    const progressValue = getProgressValue(progress.processed, progress.total, progress.completed);

                    return (
                        <div
                            id={`clone-game-source-current-session-footer-progress-item-${idSegment}-${index}`}
                            key={`clone-game-source-current-session-footer-progress-item-${phaseKey}-${index}`}
                            className="space-y-1.5"
                        >
                            <div
                                id={`clone-game-source-current-session-footer-progress-item-header-${idSegment}-${index}`}
                                className="flex items-center justify-between gap-3 text-xs"
                            >
                                <span id={`clone-game-source-current-session-footer-progress-item-title-${idSegment}-${index}`} className="font-medium text-foreground">
                                    {getCloneSessionPhaseLabel(phaseKey, t)}
                                </span>
                                <span id={`clone-game-source-current-session-footer-progress-item-stats-${idSegment}-${index}`} className="tabular-nums text-muted-foreground">
                                    {progress.processed ?? 0}/{progress.total ?? 0} ({Math.round(progressValue)}%)
                                </span>
                            </div>
                            <Progress
                                id={`clone-game-source-current-session-footer-progress-item-bar-${idSegment}-${index}`}
                                value={progressValue}
                                className="h-2"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
