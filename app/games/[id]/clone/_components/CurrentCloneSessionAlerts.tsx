"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import type { CloneSessionConflict, CloneSessionWarning } from "@/lib/game-api";
import { getConflictProgressTab } from "./cloneSessionConflictNavigation";

type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

type CurrentCloneSessionAlertsProps = {
    t: TranslationFn;
    targetGameId: string;
    sourceGameId?: string;
    warnings: CloneSessionWarning[];
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
    targetGameId,
    sourceGameId,
    warnings,
    conflicts,
    onConflictClick,
}: CurrentCloneSessionAlertsProps) {
    if (warnings.length === 0 && conflicts.length === 0) {
        return null;
    }

    const getWarningMessage = (warning: CloneSessionWarning) => {
        if (warning.message_code === "clone_quota_quest_definitions") {
            const availableSlot = warning.message_params?.available_slot;
            const requiredTotal = warning.message_params?.required_total;

            if (availableSlot != null && requiredTotal != null) {
                return t("cloneGame.warnings.clone_quota_quest_definitions", {
                    available_slot: availableSlot,
                    required_total: requiredTotal,
                });
            }
        }

        if (warning.message_code) {
            const translatedMessage = t(`cloneGame.warnings.${warning.message_code}`, warning.message_params);
            if (translatedMessage !== `cloneGame.warnings.${warning.message_code}`) {
                return translatedMessage;
            }
        }

        return warning.message || t("common.unknown");
    };

    const getConflictMessage = (conflict: CloneSessionConflict) => {
        if (conflict.message_code) {
            const translatedMessage = t(`cloneGame.conflicts.${conflict.message_code}`, conflict.message_params);
            if (translatedMessage !== `cloneGame.conflicts.${conflict.message_code}`) {
                return translatedMessage;
            }
        }

        return conflict.message || t("common.unknown");
    };

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
                            const conflictValue = conflict.value || conflict.target_id || conflict.target_definition_id || t("common.unknown");
                            const idSegment = toKebabIdSegment(conflict.field ?? conflict.target_id ?? conflict.target_definition_id);
                            const hasItemCodeConflictLinks = conflict.field === "item_code"
                                && Boolean(conflict.value)
                                && Boolean(conflict.source_item_definitions_id || conflict.target_definition_id);
                            const hasContainerCodeNameConflictLinks = getConflictProgressTab(conflict) === "item_container_definitions"
                                && Boolean(conflict.value)
                                && Boolean(conflict.source_id || conflict.target_id);
                            const hasQuestCodeNameConflictLinks = getConflictProgressTab(conflict) === "quest_definitions"
                                && Boolean(conflict.value)
                                && Boolean(conflict.source_id || conflict.target_id);
                            const hasShopKeyConflictLinks = conflict.field === "shop_key"
                                && Boolean(conflict.value)
                                && Boolean(conflict.source_id || conflict.target_id);

                            return (
                                <div
                                    id={`clone-game-source-current-session-conflict-${idSegment}-${index}`}
                                    key={`${conflict.field ?? "conflict"}-${conflict.target_id ?? conflict.target_definition_id ?? conflict.value ?? index}`}
                                    className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-muted-foreground"
                                >
                                    {hasItemCodeConflictLinks ? (
                                        <div id={`clone-game-source-current-session-conflict-item-code-wrap-${idSegment}-${index}`} className="space-y-1">
                                            <p id={`clone-game-source-current-session-conflict-field-${idSegment}-${index}`} className="font-medium text-foreground">
                                                {fieldLabel}
                                            </p>
                                            {sourceGameId && conflict.source_item_definitions_id ? (
                                                <div id={`clone-game-source-current-session-conflict-source-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-source-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Source:
                                                    </span>
                                                    <Button
                                                        id={`clone-game-source-current-session-conflict-source-link-${idSegment}-${index}`}
                                                        type="button"
                                                        variant="link"
                                                        className="h-auto p-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                        onClick={() => onConflictClick(conflict)}
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-source-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                    </Button>
                                                    <span id={`clone-game-source-current-session-conflict-source-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.source_item_definitions_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-source-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-source-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.source_item_definitions_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                            {conflict.target_definition_id ? (
                                                <div id={`clone-game-source-current-session-conflict-target-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-target-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Target:
                                                    </span>
                                                    <Link
                                                        id={`clone-game-source-current-session-conflict-target-link-${idSegment}-${index}`}
                                                        href={`/games/${targetGameId}/items/${conflict.target_definition_id}`}
                                                        className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-target-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                        <ExternalLink
                                                            id={`clone-game-source-current-session-conflict-target-link-icon-${idSegment}-${index}`}
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                    <span id={`clone-game-source-current-session-conflict-target-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.target_definition_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-target-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-target-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.target_definition_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : hasContainerCodeNameConflictLinks ? (
                                        <div id={`clone-game-source-current-session-conflict-container-code-wrap-${idSegment}-${index}`} className="space-y-1">
                                            <p id={`clone-game-source-current-session-conflict-field-${idSegment}-${index}`} className="font-medium text-foreground">
                                                {fieldLabel}
                                            </p>
                                            {sourceGameId && conflict.source_id ? (
                                                <div id={`clone-game-source-current-session-conflict-source-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-source-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Source:
                                                    </span>
                                                    <Button
                                                        id={`clone-game-source-current-session-conflict-source-link-${idSegment}-${index}`}
                                                        type="button"
                                                        variant="link"
                                                        className="h-auto p-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                        onClick={() => onConflictClick(conflict)}
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-source-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                    </Button>
                                                    <span id={`clone-game-source-current-session-conflict-source-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.source_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-source-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-source-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.source_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                            {conflict.target_id ? (
                                                <div id={`clone-game-source-current-session-conflict-target-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-target-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Target:
                                                    </span>
                                                    <Link
                                                        id={`clone-game-source-current-session-conflict-target-link-${idSegment}-${index}`}
                                                        href={`/games/${targetGameId}/items?tab=containers&q=${conflict.target_id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-target-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                        <ExternalLink
                                                            id={`clone-game-source-current-session-conflict-target-link-icon-${idSegment}-${index}`}
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                    <span id={`clone-game-source-current-session-conflict-target-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.target_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-target-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-target-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.target_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : hasQuestCodeNameConflictLinks ? (
                                        <div id={`clone-game-source-current-session-conflict-quest-code-wrap-${idSegment}-${index}`} className="space-y-1">
                                            <p id={`clone-game-source-current-session-conflict-field-${idSegment}-${index}`} className="font-medium text-foreground">
                                                {fieldLabel}
                                            </p>
                                            {sourceGameId && conflict.source_id ? (
                                                <div id={`clone-game-source-current-session-conflict-source-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-source-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Source:
                                                    </span>
                                                    <Button
                                                        id={`clone-game-source-current-session-conflict-source-link-${idSegment}-${index}`}
                                                        type="button"
                                                        variant="link"
                                                        className="h-auto p-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                        onClick={() => onConflictClick(conflict)}
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-source-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                    </Button>
                                                    <span id={`clone-game-source-current-session-conflict-source-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.source_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-source-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-source-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.source_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                            {conflict.target_id ? (
                                                <div id={`clone-game-source-current-session-conflict-target-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-target-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Target:
                                                    </span>
                                                    <Link
                                                        id={`clone-game-source-current-session-conflict-target-link-${idSegment}-${index}`}
                                                        href={`/games/${targetGameId}/quests?editQuestId=${conflict.target_id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-target-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                        <ExternalLink
                                                            id={`clone-game-source-current-session-conflict-target-link-icon-${idSegment}-${index}`}
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                    <span id={`clone-game-source-current-session-conflict-target-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.target_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-target-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-target-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.target_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : hasShopKeyConflictLinks ? (
                                        <div id={`clone-game-source-current-session-conflict-shop-key-wrap-${idSegment}-${index}`} className="space-y-1">
                                            <p id={`clone-game-source-current-session-conflict-field-${idSegment}-${index}`} className="font-medium text-foreground">
                                                {fieldLabel}
                                            </p>
                                            {sourceGameId && conflict.source_id ? (
                                                <div id={`clone-game-source-current-session-conflict-source-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-source-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Source:
                                                    </span>
                                                    <Button
                                                        id={`clone-game-source-current-session-conflict-source-link-${idSegment}-${index}`}
                                                        type="button"
                                                        variant="link"
                                                        className="h-auto p-0 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                        onClick={() => onConflictClick(conflict)}
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-source-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                    </Button>
                                                    <span id={`clone-game-source-current-session-conflict-source-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.source_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-source-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-source-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.source_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                            {conflict.target_id ? (
                                                <div id={`clone-game-source-current-session-conflict-target-row-${idSegment}-${index}`} className="flex flex-wrap items-center gap-2">
                                                    <span id={`clone-game-source-current-session-conflict-target-label-${idSegment}-${index}`} className="text-muted-foreground">
                                                        Target:
                                                    </span>
                                                    <Link
                                                        id={`clone-game-source-current-session-conflict-target-link-${idSegment}-${index}`}
                                                        href={`/games/${targetGameId}/shops/${conflict.target_id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                                                    >
                                                        <span id={`clone-game-source-current-session-conflict-target-value-${idSegment}-${index}`}>
                                                            {conflictValue}
                                                        </span>
                                                        <ExternalLink
                                                            id={`clone-game-source-current-session-conflict-target-link-icon-${idSegment}-${index}`}
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                    <span id={`clone-game-source-current-session-conflict-target-id-${idSegment}-${index}`} className="font-mono break-all">
                                                        {conflict.target_id}
                                                    </span>
                                                    <CopyButton
                                                        id={`clone-game-source-current-session-conflict-target-id-copy-btn-${idSegment}-${index}`}
                                                        iconId={`clone-game-source-current-session-conflict-target-id-copy-icon-${idSegment}-${index}`}
                                                        text={conflict.target_id}
                                                        size="h-3 w-3"
                                                        className="ml-0"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
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
                                    )}
                                    <p id={`clone-game-source-current-session-conflict-message-${idSegment}-${index}`}>
                                        {getConflictMessage(conflict)}
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
                                    {warning.field === "quest_definitions" && targetGameId ? (
                                        <Link
                                            id={`clone-game-source-current-session-warning-field-link-${idSegment}-${index}`}
                                            href={`/games/${targetGameId}/quests`}
                                            className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                                        >
                                            <span id={`clone-game-source-current-session-warning-field-${idSegment}-${index}`}>
                                                {formatTechnicalLabel(warning.field) || t("common.unknown")}
                                            </span>
                                            <ExternalLink
                                                id={`clone-game-source-current-session-warning-field-link-icon-${idSegment}-${index}`}
                                                className="h-3.5 w-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    ) : (
                                        <p id={`clone-game-source-current-session-warning-field-${idSegment}-${index}`} className="font-medium text-foreground">
                                            {formatTechnicalLabel(warning.field) || t("common.unknown")}
                                        </p>
                                    )}
                                    <p id={`clone-game-source-current-session-warning-message-${idSegment}-${index}`}>
                                        {getWarningMessage(warning)}
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
