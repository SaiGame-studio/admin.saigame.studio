"use client";

import { Check, X } from "lucide-react";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CloneSessionPreviouslyClonedStatusProps = {
    id: string;
    iconId: string;
    labelId: string;
    previouslyCloned?: boolean;
    t: TranslationFn;
};

export function CloneSessionPreviouslyClonedStatus({
    id,
    iconId,
    labelId,
    previouslyCloned,
    t,
}: CloneSessionPreviouslyClonedStatusProps) {
    const label = previouslyCloned ? t("common.yes") : t("common.no");

    return (
        <div id={id} className="flex items-center justify-center">
            {previouslyCloned ? (
                <Check id={iconId} aria-hidden="true" className="h-4 w-4 text-green-500" />
            ) : (
                <X id={iconId} aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            )}
            <span id={labelId} className="sr-only">
                {label}
            </span>
        </div>
    );
}
