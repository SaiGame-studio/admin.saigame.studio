"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentEntityPool } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionEntityPoolsTabProps = {
    t: TranslationFn;
    entityPools: CloneSessionCurrentEntityPool[];
    sessionId?: string;
    entityPoolsTotal: number;
    entityPoolsOffset: number;
    entityPoolsSearchInput: string;
    entityPoolsSearchName: string;
    entityPoolsLoading: boolean;
    entityPoolsError: string | null;
    onEntityPoolsSearchInputChange: (value: string) => void;
    onEntityPoolsSearch: () => void;
    onEntityPoolsClearSearch: () => void;
    onEntityPoolsPreviousPage: () => void;
    onEntityPoolsNextPage: () => void;
    getManualOverwriteTargetId: (contentType: "entity_pool", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const ENTITY_POOLS_PAGE_SIZE = 12;

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

function CurrentCloneSessionEntityPoolList({
    entityPools,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    entityPools: CloneSessionCurrentEntityPool[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "entity_pool", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (entityPools.length === 0) {
        return (
            <div id="clone-game-source-current-session-entity-pools-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(
        entityPools.map((entity) => [entity.id, getManualOverwriteTargetId("entity_pool", entity.id)]),
    );
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-entity-pools-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-entity-pools-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-entity-pools-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-entity-pools-table-head-row">
                        <th id="clone-game-source-current-session-entity-pools-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-pools-table-entity-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionEntityPoolKeyLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-pools-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-entity-pools-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-entity-pools-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-entity-pools-table-body">
                    {entityPools.map((entity) => {
                        const overwriteTargetId = overwriteTargetIds.get(entity.id) ?? null;

                        return (
                            <tr id={`clone-game-source-current-session-entity-pool-row-${entity.id}`} key={entity.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                <td id={`clone-game-source-current-session-entity-pool-name-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-entity-pool-name-${entity.id}`} className="font-medium">
                                        {entity.name || t("common.none")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-entity-pool-entity-key-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-entity-pool-entity-key-${entity.id}`} className="font-mono text-xs text-muted-foreground">
                                        {entity.pool_key || t("common.unknown")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-entity-pool-previously-cloned-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionPreviouslyClonedStatus
                                        id={`clone-game-source-current-session-entity-pool-previously-cloned-${entity.id}`}
                                        iconId={`clone-game-source-current-session-entity-pool-previously-cloned-icon-${entity.id}`}
                                        labelId={`clone-game-source-current-session-entity-pool-previously-cloned-label-${entity.id}`}
                                        previouslyCloned={entity.previously_cloned}
                                        t={t}
                                    />
                                </td>
                                <td id={`clone-game-source-current-session-entity-pool-ignore-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionIgnoreSwitch
                                        id={`clone-game-source-current-session-entity-pool-ignore-${entity.id}`}
                                        sessionId={sessionId}
                                        contentType="entity_pool"
                                        sourceId={entity.id}
                                        initialIgnored={isIgnored(entity)}
                                        t={t}
                                    />
                                </td>
                                {hasOverwriteColumn ? (
                                    <td id={`clone-game-source-current-session-entity-pool-overwrite-cell-${entity.id}`} className="px-3 py-2 align-middle">
                                        <CloneSessionManualOverwriteButton
                                            id={`clone-game-source-current-session-entity-pool-overwrite-${entity.id}`}
                                            sessionId={sessionId}
                                            contentType="entity_pool"
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

export function CurrentCloneSessionEntityPoolsTab({
    t,
    entityPools,
    sessionId,
    entityPoolsTotal,
    entityPoolsOffset,
    entityPoolsSearchInput,
    entityPoolsSearchName,
    entityPoolsLoading,
    entityPoolsError,
    onEntityPoolsSearchInputChange,
    onEntityPoolsSearch,
    onEntityPoolsClearSearch,
    onEntityPoolsPreviousPage,
    onEntityPoolsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionEntityPoolsTabProps) {
    const currentEntityPoolsCurrentPage = entityPoolsTotal > 0 ? Math.floor(entityPoolsOffset / ENTITY_POOLS_PAGE_SIZE) + 1 : 0;
    const currentEntityPoolsTotalPages = entityPoolsTotal > 0 ? Math.ceil(entityPoolsTotal / ENTITY_POOLS_PAGE_SIZE) : 0;
    const currentEntityPoolsStart = entityPoolsTotal > 0 ? entityPoolsOffset + 1 : 0;
    const currentEntityPoolsEnd = entityPoolsTotal > 0 ? Math.min(entityPoolsOffset + ENTITY_POOLS_PAGE_SIZE, entityPoolsTotal) : 0;
    const hasPreviousEntityPoolsPage = entityPoolsOffset > 0;
    const hasNextEntityPoolsPage = entityPoolsOffset + ENTITY_POOLS_PAGE_SIZE < entityPoolsTotal;

    return (
        <div id="clone-game-source-current-session-entity-pools-section" className="space-y-3">
            <div id="clone-game-source-current-session-entity-pools-controls" className="space-y-2">
                <div id="clone-game-source-current-session-entity-pools-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-entity-pools-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-entity-pools-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-entity-pools-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-entity-pools-search-input"
                                value={entityPoolsSearchInput}
                                onChange={(event) => onEntityPoolsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onEntityPoolsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionEntityPoolSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {entityPoolsSearchInput || entityPoolsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-entity-pools-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onEntityPoolsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-entity-pools-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-entity-pools-search-btn"
                        type="button"
                        onClick={onEntityPoolsSearch}
                        disabled={entityPoolsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-entity-pools-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-entity-pools-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-entity-pools-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEntityPoolsPreviousPage}
                                disabled={!hasPreviousEntityPoolsPage || entityPoolsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-entity-pools-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-entity-pools-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-entity-pools-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentEntityPoolsCurrentPage, currentEntityPoolsTotalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-entity-pools-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onEntityPoolsNextPage}
                                disabled={!hasNextEntityPoolsPage || entityPoolsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-entity-pools-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-entity-pools-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-entity-pools-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(currentEntityPoolsStart, currentEntityPoolsEnd, entityPoolsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-entity-pools-refresh-btn" iconId="clone-game-source-current-session-entity-pools-refresh-icon" loading={entityPoolsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {entityPoolsLoading ? (
                <div id="clone-game-source-current-session-entity-pools-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-entity-pools-loading-header" className="grid min-w-[700px] grid-cols-[1fr_1fr_0.8fr_0.8fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-entity-pool-skeleton-head-${index}`} key={`clone-game-source-current-session-entity-pool-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-entity-pool-skeleton-row-${index}`} key={`clone-game-source-current-session-entity-pool-skeleton-row-${index}`} className="grid min-w-[700px] grid-cols-[1fr_1fr_0.8fr_0.8fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-entity-pool-skeleton-name-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-entity-pool-skeleton-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-entity-pool-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-entity-pool-skeleton-ignore-${index}`} className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            ) : entityPoolsError ? (
                <div id="clone-game-source-current-session-entity-pools-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {entityPoolsError}
                </div>
            ) : (
                <CurrentCloneSessionEntityPoolList entityPools={entityPools} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId as any} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
