"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentLeaderboardDefinition } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionLeaderboardDefinitionsTabProps = {
    t: TranslationFn;
    leaderboardDefinitions: CloneSessionCurrentLeaderboardDefinition[];
    sessionId?: string;
    leaderboardDefinitionsTotal: number;
    leaderboardDefinitionsOffset: number;
    leaderboardDefinitionsSearchInput: string;
    leaderboardDefinitionsSearchName: string;
    leaderboardDefinitionsLoading: boolean;
    leaderboardDefinitionsError: string | null;
    onLeaderboardDefinitionsSearchInputChange: (value: string) => void;
    onLeaderboardDefinitionsSearch: () => void;
    onLeaderboardDefinitionsClearSearch: () => void;
    onLeaderboardDefinitionsPreviousPage: () => void;
    onLeaderboardDefinitionsNextPage: () => void;
    getManualOverwriteTargetId: (contentType: "leaderboard_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const ITEMS_PAGE_SIZE = 12;

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

function CurrentCloneSessionLeaderboardDefinitionList({
    leaderboards,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    leaderboards: CloneSessionCurrentLeaderboardDefinition[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "leaderboard_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (leaderboards.length === 0) {
        return (
            <div id="clone-game-source-current-session-leaderboards-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(leaderboards.map((board) => [board.source_id, getManualOverwriteTargetId("leaderboard_definition", board.source_id)]));
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-leaderboards-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-leaderboards-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-leaderboards-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-leaderboards-table-head-row">
                        <th id="clone-game-source-current-session-leaderboards-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-leaderboards-table-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCodeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-leaderboards-table-scoremode-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionLeaderboardScoreModeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-leaderboards-table-reset-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionLeaderboardResetScheduleLabel")}
                        </th>
                        <th id="clone-game-source-current-session-leaderboards-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-leaderboards-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-leaderboards-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-leaderboards-table-body">
                    {leaderboards.map((board) => {
                        const overwriteTargetId = overwriteTargetIds.get(board.source_id) ?? null;

                        return (
                        <tr id={`clone-game-source-current-session-leaderboard-row-${board.source_id}`} key={board.source_id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-leaderboard-name-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-leaderboard-name-${board.source_id}`} className="font-medium">
                                    {board.source_data.name}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-leaderboard-key-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-leaderboard-key-${board.source_id}`} className="font-mono text-xs text-muted-foreground">
                                    {board.source_data.board_key}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-leaderboard-scoremode-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-leaderboard-scoremode-${board.source_id}`}>
                                    {board.source_data.score_mode || t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-leaderboard-reset-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-leaderboard-reset-${board.source_id}`}>
                                    {board.source_data.reset_schedule || t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-leaderboard-previously-cloned-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                <CloneSessionPreviouslyClonedStatus
                                    id={`clone-game-source-current-session-leaderboard-previously-cloned-${board.source_id}`}
                                    iconId={`clone-game-source-current-session-leaderboard-previously-cloned-icon-${board.source_id}`}
                                    labelId={`clone-game-source-current-session-leaderboard-previously-cloned-label-${board.source_id}`}
                                    previouslyCloned={!!board.target_id}
                                    t={t}
                                />
                            </td>
                            <td id={`clone-game-source-current-session-leaderboard-ignore-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                <CloneSessionIgnoreSwitch id={`clone-game-source-current-session-leaderboard-ignore-${board.source_id}`} sessionId={sessionId} contentType="leaderboard_definition" sourceId={board.source_id} initialIgnored={isIgnored(board)} t={t} />
                            </td>
                            {hasOverwriteColumn ? (
                                <td id={`clone-game-source-current-session-leaderboard-overwrite-cell-${board.source_id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionManualOverwriteButton
                                        id={`clone-game-source-current-session-leaderboard-overwrite-${board.source_id}`}
                                        sessionId={sessionId}
                                        contentType="leaderboard_definition"
                                        sourceId={board.source_id}
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

export function CurrentCloneSessionLeaderboardDefinitionsTab({
    t,
    leaderboardDefinitions,
    sessionId,
    leaderboardDefinitionsTotal,
    leaderboardDefinitionsOffset,
    leaderboardDefinitionsSearchInput,
    leaderboardDefinitionsSearchName,
    leaderboardDefinitionsLoading,
    leaderboardDefinitionsError,
    onLeaderboardDefinitionsSearchInputChange,
    onLeaderboardDefinitionsSearch,
    onLeaderboardDefinitionsClearSearch,
    onLeaderboardDefinitionsPreviousPage,
    onLeaderboardDefinitionsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionLeaderboardDefinitionsTabProps) {
    const currentPage = leaderboardDefinitionsTotal > 0 ? Math.floor(leaderboardDefinitionsOffset / ITEMS_PAGE_SIZE) + 1 : 0;
    const totalPages = leaderboardDefinitionsTotal > 0 ? Math.ceil(leaderboardDefinitionsTotal / ITEMS_PAGE_SIZE) : 0;
    const start = leaderboardDefinitionsTotal > 0 ? leaderboardDefinitionsOffset + 1 : 0;
    const end = leaderboardDefinitionsTotal > 0 ? Math.min(leaderboardDefinitionsOffset + ITEMS_PAGE_SIZE, leaderboardDefinitionsTotal) : 0;
    const hasPreviousPage = leaderboardDefinitionsOffset > 0;
    const hasNextPage = leaderboardDefinitionsOffset + ITEMS_PAGE_SIZE < leaderboardDefinitionsTotal;

    return (
        <div id="clone-game-source-current-session-leaderboards-section" className="space-y-3">
            <div id="clone-game-source-current-session-leaderboards-controls" className="space-y-2">
                <div id="clone-game-source-current-session-leaderboards-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-leaderboards-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-leaderboards-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-leaderboards-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-leaderboards-search-input"
                                value={leaderboardDefinitionsSearchInput}
                                onChange={(event) => onLeaderboardDefinitionsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onLeaderboardDefinitionsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionLeaderboardsSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {leaderboardDefinitionsSearchInput || leaderboardDefinitionsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-leaderboards-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onLeaderboardDefinitionsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-leaderboards-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-leaderboards-search-btn"
                        type="button"
                        onClick={onLeaderboardDefinitionsSearch}
                        disabled={leaderboardDefinitionsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-leaderboards-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-leaderboards-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-leaderboards-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onLeaderboardDefinitionsPreviousPage}
                                disabled={!hasPreviousPage || leaderboardDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-leaderboards-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-leaderboards-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-leaderboards-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentPage, totalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-leaderboards-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onLeaderboardDefinitionsNextPage}
                                disabled={!hasNextPage || leaderboardDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-leaderboards-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-leaderboards-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-leaderboards-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(start, end, leaderboardDefinitionsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-leaderboards-refresh-btn" iconId="clone-game-source-current-session-leaderboards-refresh-icon" loading={leaderboardDefinitionsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {leaderboardDefinitionsLoading ? (
                <div id="clone-game-source-current-session-leaderboards-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-leaderboards-loading-header" className="grid min-w-[900px] grid-cols-[1.4fr_1.4fr_1fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-head-${index}`} key={`clone-game-source-current-session-leaderboards-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-leaderboards-skeleton-row-${index}`} key={`clone-game-source-current-session-leaderboards-skeleton-row-${index}`} className="grid min-w-[900px] grid-cols-[1.4fr_1.4fr_1fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-label-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-mode-${index}`} className="h-4 w-20" />
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-schedule-${index}`} className="h-4 w-12" />
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-ignore-${index}`} className="h-4 w-12" />
                            <Skeleton id={`clone-game-source-current-session-leaderboards-skeleton-overwrite-${index}`} className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : leaderboardDefinitionsError ? (
                <div id="clone-game-source-current-session-leaderboards-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {leaderboardDefinitionsError}
                </div>
            ) : (
                <CurrentCloneSessionLeaderboardDefinitionList leaderboards={leaderboardDefinitions} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
