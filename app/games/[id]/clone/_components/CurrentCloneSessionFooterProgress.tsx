"use client";

import { Progress } from "@/components/ui/progress";
import { getCloneSessionPhaseLabel, getProgressValue } from "./cloneSessionProgressUtils";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CurrentCloneSessionFooterProgressProps = {
    t: TranslationFn;
    progressEntries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>;
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
}: CurrentCloneSessionFooterProgressProps) {
    if (progressEntries.length === 0) {
        return null;
    }

    return (
        <div id="clone-game-source-current-session-footer-progress" className="space-y-3 border-t px-6 pt-4 pb-4">
            <p id="clone-game-source-current-session-footer-progress-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("cloneGame.sourceGameCurrentSessionProgressLabel")}
            </p>
            <div id="clone-game-source-current-session-footer-progress-list" className="space-y-3">
                {progressEntries.map(([phaseKey, progress], index) => {
                    const idSegment = toKebabIdSegment(phaseKey);
                    const progressValue = getProgressValue(progress.processed, progress.total);

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
