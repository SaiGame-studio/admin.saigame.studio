"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CloneSessionCurrentPresetDefinition } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionPresetDefinitionsTabProps = {
    t: TranslationFn;
    presetDefinitions: CloneSessionCurrentPresetDefinition[];
    sessionId?: string;
    presetDefinitionsTotal: number;
    presetDefinitionsOffset: number;
    presetDefinitionsSearchInput: string;
    presetDefinitionsSearchName: string;
    presetDefinitionsLoading: boolean;
    presetDefinitionsError: string | null;
    onPresetDefinitionsSearchInputChange: (value: string) => void;
    onPresetDefinitionsSearch: () => void;
    onPresetDefinitionsClearSearch: () => void;
    onPresetDefinitionsPreviousPage: () => void;
    onPresetDefinitionsNextPage: () => void;
    getManualOverwriteTargetId: (contentType: "preset_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const PRESET_DEFINITIONS_PAGE_SIZE = 12;

function formatRange(start: number, end: number, total: number) {
    if (total <= 0) {
        return "0 / 0";
    }

    return `${start.toLocaleString("en-US")} - ${end.toLocaleString("en-US")}/${total.toLocaleString("en-US")}`;
}

function formatPage(currentPage: number, totalPages: number) {
    if (totalPages <= 0) {
        return "0/0";
    }

    return `${currentPage.toLocaleString("en-US")}/${totalPages.toLocaleString("en-US")}`;
}

function isIgnored(value: { ignored?: boolean; is_ignored?: boolean }) {
    return Boolean(value.ignored ?? value.is_ignored);
}

function CurrentCloneSessionPresetDefinitionList({
    presetDefinitions,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    presetDefinitions: CloneSessionCurrentPresetDefinition[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "preset_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (presetDefinitions.length === 0) {
        return (
            <div id="clone-game-source-current-session-preset-definitions-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(presetDefinitions.map((presetDefinition) => [presetDefinition.id, getManualOverwriteTargetId("preset_definition", presetDefinition.id)]));
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-preset-definitions-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-preset-definitions-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-preset-definitions-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-preset-definitions-table-head-row">
                        <th id="clone-game-source-current-session-preset-definitions-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-preset-definitions-table-code-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCodeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-preset-definitions-table-type-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPresetTypeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-preset-definitions-table-slots-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPresetMaxSlotsLabel")}
                        </th>
                        <th id="clone-game-source-current-session-preset-definitions-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-preset-definitions-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-preset-definitions-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-preset-definitions-table-body">
                    {presetDefinitions.map((presetDefinition) => {
                        const overwriteTargetId = overwriteTargetIds.get(presetDefinition.id) ?? null;

                        return (
                            <tr id={`clone-game-source-current-session-preset-definition-row-${presetDefinition.id}`} key={presetDefinition.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                <td id={`clone-game-source-current-session-preset-definition-name-cell-${presetDefinition.id}`} className="px-3 py-2 align-middle">
                                    <div id={`clone-game-source-current-session-preset-definition-name-wrap-${presetDefinition.id}`} className="space-y-0.5">
                                        <span id={`clone-game-source-current-session-preset-definition-name-${presetDefinition.id}`} className="font-medium">
                                            {presetDefinition.name || t("common.unknown")}
                                        </span>
                                        <div id={`clone-game-source-current-session-preset-definition-id-wrap-${presetDefinition.id}`} className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                            <span id={`clone-game-source-current-session-preset-definition-id-${presetDefinition.id}`} className="truncate">
                                                {presetDefinition.id}
                                            </span>
                                            <CopyButton
                                                id={`clone-game-source-current-session-preset-definition-id-copy-btn-${presetDefinition.id}`}
                                                iconId={`clone-game-source-current-session-preset-definition-id-copy-icon-${presetDefinition.id}`}
                                                text={presetDefinition.id}
                                                size="h-3 w-3"
                                                className="ml-0"
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td id={`clone-game-source-current-session-preset-definition-code-cell-${presetDefinition.id}`} className="px-3 py-2 align-middle">
                                    <div id={`clone-game-source-current-session-preset-definition-code-wrap-${presetDefinition.id}`} className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                        <span id={`clone-game-source-current-session-preset-definition-code-${presetDefinition.id}`} className="truncate">
                                            {presetDefinition.code_name || t("common.unknown")}
                                        </span>
                                        {presetDefinition.code_name ? (
                                            <CopyButton
                                                id={`clone-game-source-current-session-preset-definition-code-copy-btn-${presetDefinition.id}`}
                                                iconId={`clone-game-source-current-session-preset-definition-code-copy-icon-${presetDefinition.id}`}
                                                text={presetDefinition.code_name}
                                                size="h-3 w-3"
                                                className="ml-0"
                                            />
                                        ) : null}
                                    </div>
                                </td>
                                <td id={`clone-game-source-current-session-preset-definition-type-cell-${presetDefinition.id}`} className="px-3 py-2 align-middle">
                                    <Badge id={`clone-game-source-current-session-preset-definition-type-${presetDefinition.id}`} variant="outline">
                                        {presetDefinition.preset_type || t("common.unknown")}
                                    </Badge>
                                </td>
                                <td id={`clone-game-source-current-session-preset-definition-slots-cell-${presetDefinition.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                    <span id={`clone-game-source-current-session-preset-definition-slots-${presetDefinition.id}`}>
                                        {typeof presetDefinition.max_slots === "number" ? presetDefinition.max_slots.toLocaleString("en-US") : t("common.unknown")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-preset-definition-previously-cloned-cell-${presetDefinition.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionPreviouslyClonedStatus
                                        id={`clone-game-source-current-session-preset-definition-previously-cloned-${presetDefinition.id}`}
                                        iconId={`clone-game-source-current-session-preset-definition-previously-cloned-icon-${presetDefinition.id}`}
                                        labelId={`clone-game-source-current-session-preset-definition-previously-cloned-label-${presetDefinition.id}`}
                                        previouslyCloned={presetDefinition.previously_cloned}
                                        t={t}
                                    />
                                </td>
                                <td id={`clone-game-source-current-session-preset-definition-ignore-cell-${presetDefinition.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionIgnoreSwitch id={`clone-game-source-current-session-preset-definition-ignore-${presetDefinition.id}`} sessionId={sessionId} contentType="preset_definition" sourceId={presetDefinition.id} initialIgnored={isIgnored(presetDefinition)} t={t} />
                                </td>
                                {hasOverwriteColumn ? (
                                    <td id={`clone-game-source-current-session-preset-definition-overwrite-cell-${presetDefinition.id}`} className="px-3 py-2 align-middle">
                                        <CloneSessionManualOverwriteButton
                                            id={`clone-game-source-current-session-preset-definition-overwrite-${presetDefinition.id}`}
                                            sessionId={sessionId}
                                            contentType="preset_definition"
                                            sourceId={presetDefinition.id}
                                            targetId={overwriteTargetId}
                                            t={t}
                                            onSuccess={onManualOverwriteSuccess}
                                        />
                                    </td>
                                ) : null}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function CurrentCloneSessionPresetDefinitionsTab({
    t,
    presetDefinitions,
    sessionId,
    presetDefinitionsTotal,
    presetDefinitionsOffset,
    presetDefinitionsSearchInput,
    presetDefinitionsSearchName,
    presetDefinitionsLoading,
    presetDefinitionsError,
    onPresetDefinitionsSearchInputChange,
    onPresetDefinitionsSearch,
    onPresetDefinitionsClearSearch,
    onPresetDefinitionsPreviousPage,
    onPresetDefinitionsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionPresetDefinitionsTabProps) {
    const currentPage = presetDefinitionsTotal > 0 ? Math.floor(presetDefinitionsOffset / PRESET_DEFINITIONS_PAGE_SIZE) + 1 : 0;
    const totalPages = presetDefinitionsTotal > 0 ? Math.ceil(presetDefinitionsTotal / PRESET_DEFINITIONS_PAGE_SIZE) : 0;
    const start = presetDefinitionsTotal > 0 ? presetDefinitionsOffset + 1 : 0;
    const end = presetDefinitionsTotal > 0 ? Math.min(presetDefinitionsOffset + PRESET_DEFINITIONS_PAGE_SIZE, presetDefinitionsTotal) : 0;
    const hasPreviousPage = presetDefinitionsOffset > 0;
    const hasNextPage = presetDefinitionsOffset + PRESET_DEFINITIONS_PAGE_SIZE < presetDefinitionsTotal;

    return (
        <div id="clone-game-source-current-session-preset-definitions-section" className="space-y-3">
            <div id="clone-game-source-current-session-preset-definitions-controls" className="space-y-2">
                <div id="clone-game-source-current-session-preset-definitions-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-preset-definitions-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-preset-definitions-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-preset-definitions-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-preset-definitions-search-input"
                                value={presetDefinitionsSearchInput}
                                onChange={(event) => onPresetDefinitionsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onPresetDefinitionsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionPresetSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {presetDefinitionsSearchInput || presetDefinitionsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-preset-definitions-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onPresetDefinitionsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-preset-definitions-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-preset-definitions-search-btn"
                        type="button"
                        onClick={onPresetDefinitionsSearch}
                        disabled={presetDefinitionsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-preset-definitions-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-preset-definitions-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-preset-definitions-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onPresetDefinitionsPreviousPage}
                                disabled={!hasPreviousPage || presetDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-preset-definitions-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-preset-definitions-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-preset-definitions-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentPage, totalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-preset-definitions-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onPresetDefinitionsNextPage}
                                disabled={!hasNextPage || presetDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-preset-definitions-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-preset-definitions-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-preset-definitions-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(start, end, presetDefinitionsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-preset-definitions-refresh-btn" iconId="clone-game-source-current-session-preset-definitions-refresh-icon" loading={presetDefinitionsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {presetDefinitionsLoading ? (
                <div id="clone-game-source-current-session-preset-definitions-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-preset-definitions-loading-header" className="grid min-w-[920px] grid-cols-[1.4fr_1.2fr_0.8fr_0.6fr_0.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-head-${index}`} key={`clone-game-source-current-session-preset-definition-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-preset-definition-skeleton-row-${index}`} key={`clone-game-source-current-session-preset-definition-skeleton-row-${index}`} className="grid min-w-[920px] grid-cols-[1.4fr_1.2fr_0.8fr_0.6fr_0.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-name-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-code-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-type-${index}`} className="h-4 w-16" />
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-slots-${index}`} className="ml-auto h-4 w-10" />
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-preset-definition-skeleton-overwrite-${index}`} className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : presetDefinitionsError ? (
                <div id="clone-game-source-current-session-preset-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {presetDefinitionsError}
                </div>
            ) : (
                <CurrentCloneSessionPresetDefinitionList
                    presetDefinitions={presetDefinitions}
                    sessionId={sessionId}
                    t={t}
                    getManualOverwriteTargetId={getManualOverwriteTargetId}
                    onManualOverwriteSuccess={onManualOverwriteSuccess}
                />
            )}
        </div>
    );
}
