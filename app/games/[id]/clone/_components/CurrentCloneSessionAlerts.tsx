"use client";

import { Button } from "@/components/ui/button";
import type { CloneSessionConflict } from "@/lib/game-api";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionAlertsProps = {
    t: TranslationFn;
    warnings: Array<{ field?: string; message?: string }>;
    conflicts: CloneSessionConflict[];
    onConflictClick: (conflict: CloneSessionConflict) => void;
};

function formatTechnicalLabel(value?: string) {
    if (!value) {
        return "";
    }

    return value
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function toKebabIdSegment(value?: string) {
    if (!value) {
        return "unknown";
    }

    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function CurrentCloneSessionAlerts({
    t,
    warnings,
    conflicts,
    onConflictClick,
}: CurrentCloneSessionAlertsProps) {
    if (warnings.length === 0 && conflicts.length === 0) {
        return null;
    }

    return (
        <div id="clone-game-source-current-session-alerts" className="space-y-3 border-t pt-4">
            {conflicts.length > 0 ? (
                <div id="clone-game-source-current-session-conflicts" className="space-y-2">
                    <p id="clone-game-source-current-session-conflicts-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("cloneGame.sourceGameCurrentSessionConflictsLabel")}
                    </p>
                    <div id="clone-game-source-current-session-conflicts-list" className="space-y-2">
                        {conflicts.map((conflict, index) => {
                            const fieldLabel = formatTechnicalLabel(conflict.field) || t("common.unknown");
                            const conflictValue = conflict.value || conflict.target_definition_id || t("common.unknown");
                            const idSegment = toKebabIdSegment(conflict.field ?? conflict.target_definition_id);

                            return (
                                <div
                                    id={`clone-game-source-current-session-conflict-${idSegment}-${index}`}
                                    key={`${conflict.field ?? "conflict"}-${conflict.target_definition_id ?? conflict.value ?? index}`}
                                    className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-muted-foreground"
                                >
                                    <Button
                                        id={`clone-game-source-current-session-conflict-link-${idSegment}-${index}`}
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 text-xs font-medium text-foreground underline-offset-4"
                                        onClick={() => onConflictClick(conflict)}
                                    >
                                        <span id={`clone-game-source-current-session-conflict-field-${idSegment}-${index}`}>
                                            {fieldLabel}
                                        </span>
                                        <span id={`clone-game-source-current-session-conflict-separator-${idSegment}-${index}`}>
                                            :&nbsp;
                                        </span>
                                        <span id={`clone-game-source-current-session-conflict-value-${idSegment}-${index}`}>
                                            {conflictValue}
                                        </span>
                                    </Button>
                                    <p id={`clone-game-source-current-session-conflict-message-${idSegment}-${index}`}>
                                        {conflict.message || t("common.unknown")}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {warnings.length > 0 ? (
                <div id="clone-game-source-current-session-warnings" className="space-y-2">
                    <p id="clone-game-source-current-session-warnings-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("cloneGame.sourceGameCurrentSessionWarningsLabel")}
                    </p>
                    <div id="clone-game-source-current-session-warnings-list" className="space-y-2">
                        {warnings.map((warning, index) => {
                            const idSegment = toKebabIdSegment(warning.field);

                            return (
                                <div
                                    id={`clone-game-source-current-session-warning-${idSegment}-${index}`}
                                    key={`${warning.field ?? "warning"}-${index}`}
                                    className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground"
                                >
                                    <p id={`clone-game-source-current-session-warning-field-${idSegment}-${index}`} className="font-medium text-foreground">
                                        {formatTechnicalLabel(warning.field) || t("common.unknown")}
                                    </p>
                                    <p id={`clone-game-source-current-session-warning-message-${idSegment}-${index}`}>
                                        {warning.message || t("common.unknown")}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
