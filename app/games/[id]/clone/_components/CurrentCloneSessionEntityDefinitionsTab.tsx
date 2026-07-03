"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentEntityDefinition } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionEntityDefinitionsTabProps = {
    t: TranslationFn;
    entityDefinitions: CloneSessionCurrentEntityDefinition[];
    sessionId?: string;
    entityDefinitionsTotal: number;
    entityDefinitionsOffset: number;
    entityDefinitionsSearchInput: string;
    entityDefinitionsSearchName: string;
    entityDefinitionsLoading: boolean;
    entityDefinitionsError: string | null;
    onEntityDefinitionsSearchInputChange: (value: string) => void;
    onEntityDefinitionsSearch: () => void;
    onEntityDefinitionsClearSearch: () => void;
    onEntityDefinitionsPreviousPage: () => void;
    onEntityDefinitionsNextPage: () => void;
    getManualOverwriteTargetId: (contentType: "entity_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const ENTITY_DEFINITIONS_PAGE_SIZE = 12;

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

function CurrentCloneSessionEntityDefinitionList({
    entityDefinitions,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    entityDefinitions: CloneSessionCurrentEntityDefinition[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "entity_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (entityDefinitions.length === 0) {
        return (
            <div id="clone-game-source-current-session-entity-definitions-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(
        entityDefinitions.map((entity) => [entity.id, getManualOverwriteTargetId("entity_definition", entity.id)]),
    );
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-entity-definitions-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-entity-definitions-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-entity-definitions-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-entity-definitions-table-head-row">
                        <th id="clone-game-source-current-session-entity-definitions-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-definitions-table-entity-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionEntityKeyLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-definitions-table-type-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionTypeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-definitions-table-rarity-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionRarityLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-definitions-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-definitions-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-entity-definitions-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-entity-definitions-table-body">
                    {entityDefinitions.map((entity) => {
                        const overwriteTargetId = overwriteTargetIds.get(entity.id) ?? null;

                        return (
                            <tr id={`clone-game-source-current-session-entity-definition-row-${entity.id}`} key={entity.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                <td id={`clone-game-source-current-session-entity-definition-name-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-entity-definition-name-${entity.id}`} className="font-medium">
                                        {entity.name}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-entity-definition-entity-key-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-entity-definition-entity-key-${entity.id}`} className="font-mono text-xs text-muted-foreground">
                                        {entity.entity_key || t("common.unknown")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-entity-definition-type-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-entity-definition-type-${entity.id}`} className="text-xs text-muted-foreground">
                                        {entity.entity_type || t("common.none")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-entity-definition-rarity-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-entity-definition-rarity-${entity.id}`} className="text-xs text-muted-foreground">
                                        {entity.rarity || t("common.none")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-entity-definition-previously-cloned-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionPreviouslyClonedStatus
                                        id={`clone-game-source-current-session-entity-definition-previously-cloned-${entity.id}`}
                                        iconId={`clone-game-source-current-session-entity-definition-previously-cloned-icon-${entity.id}`}
                                        labelId={`clone-game-source-current-session-entity-definition-previously-cloned-label-${entity.id}`}
                                        previouslyCloned={entity.previously_cloned}
                                        t={t}
                                    />
                                </td>
                                <td id={`clone-game-source-current-session-entity-definition-ignore-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionIgnoreSwitch
                                        id={`clone-game-source-current-session-entity-definition-ignore-${entity.id}`}
                                        sessionId={sessionId}
                                        contentType="entity_definition"
                                        sourceId={entity.id}
                                        initialIgnored={isIgnored(entity)}
                                        t={t}
                                    />
                                </td>
                                {hasOverwriteColumn ? (
                                    <td id={`clone-game-source-current-session-entity-definition-overwrite-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                        <CloneSessionManualOverwriteButton
                                            id={`clone-game-source-current-session-entity-definition-overwrite-${entity.id}`}
                                            sessionId={sessionId}
                                            contentType="entity_definition"
                                            sourceId={entity.id}
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

export function CurrentCloneSessionEntityDefinitionsTab({
    t,
    entityDefinitions,
    sessionId,
    entityDefinitionsTotal,
    entityDefinitionsOffset,
    entityDefinitionsSearchInput,
    entityDefinitionsSearchName,
    entityDefinitionsLoading,
    entityDefinitionsError,
    onEntityDefinitionsSearchInputChange,
    onEntityDefinitionsSearch,
    onEntityDefinitionsClearSearch,
    onEntityDefinitionsPreviousPage,
    onEntityDefinitionsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionEntityDefinitionsTabProps) {
    const currentEntityDefinitionsCurrentPage = entityDefinitionsTotal > 0 ? Math.floor(entityDefinitionsOffset / ENTITY_DEFINITIONS_PAGE_SIZE) + 1 : 0;
    const currentEntityDefinitionsTotalPages = entityDefinitionsTotal > 0 ? Math.ceil(entityDefinitionsTotal / ENTITY_DEFINITIONS_PAGE_SIZE) : 0;
    const currentEntityDefinitionsStart = entityDefinitionsTotal > 0 ? entityDefinitionsOffset + 1 : 0;
    const currentEntityDefinitionsEnd = entityDefinitionsTotal > 0 ? Math.min(entityDefinitionsOffset + ENTITY_DEFINITIONS_PAGE_SIZE, entityDefinitionsTotal) : 0;
    const hasPreviousEntityDefinitionsPage = entityDefinitionsOffset > 0;
    const hasNextEntityDefinitionsPage = entityDefinitionsOffset + ENTITY_DEFINITIONS_PAGE_SIZE < entityDefinitionsTotal;

    return (
        <div id="clone-game-source-current-session-entity-definitions-section" className="space-y-3">
            <div id="clone-game-source-current-session-entity-definitions-controls" className="space-y-2">
                <div id="clone-game-source-current-session-entity-definitions-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-entity-definitions-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-entity-definitions-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-entity-definitions-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-entity-definitions-search-input"
                                value={entityDefinitionsSearchInput}
                                onChange={(event) => onEntityDefinitionsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onEntityDefinitionsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionEntityDefinitionSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {entityDefinitionsSearchInput || entityDefinitionsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-entity-definitions-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onEntityDefinitionsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-entity-definitions-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-entity-definitions-search-btn"
                        type="button"
                        onClick={onEntityDefinitionsSearch}
                        disabled={entityDefinitionsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-entity-definitions-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-entity-definitions-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-entity-definitions-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEntityDefinitionsPreviousPage}
                                disabled={!hasPreviousEntityDefinitionsPage || entityDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-entity-definitions-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-entity-definitions-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-entity-definitions-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentEntityDefinitionsCurrentPage, currentEntityDefinitionsTotalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-entity-definitions-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEntityDefinitionsNextPage}
                                disabled={!hasNextEntityDefinitionsPage || entityDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-entity-definitions-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-entity-definitions-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-entity-definitions-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(currentEntityDefinitionsStart, currentEntityDefinitionsEnd, entityDefinitionsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-entity-definitions-refresh-btn" iconId="clone-game-source-current-session-entity-definitions-refresh-icon" loading={entityDefinitionsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {entityDefinitionsLoading ? (
                <div id="clone-game-source-current-session-entity-definitions-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-entity-definitions-loading-header" className="grid min-w-[700px] grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-entity-definition-skeleton-head-${index}`} key={`clone-game-source-current-session-entity-definition-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-entity-definition-skeleton-row-${index}`} key={`clone-game-source-current-session-entity-definition-skeleton-row-${index}`} className="grid min-w-[700px] grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-entity-definition-skeleton-name-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-entity-definition-skeleton-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-entity-definition-skeleton-type-${index}`} className="h-4 w-20" />
                            <Skeleton id={`clone-game-source-current-session-entity-definition-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-entity-definition-skeleton-ignore-${index}`} className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            ) : entityDefinitionsError ? (
                <div id="clone-game-source-current-session-entity-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {entityDefinitionsError}
                </div>
            ) : (
                <CurrentCloneSessionEntityDefinitionList entityDefinitions={entityDefinitions} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId as any} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
