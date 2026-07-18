"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentScript } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionScriptsTabProps = {
    t: TranslationFn;
    scripts: CloneSessionCurrentScript[];
    sessionId?: string;
    scriptsTotal: number;
    scriptsOffset: number;
    scriptsSearchInput: string;
    scriptsSearchName: string;
    scriptsLoading: boolean;
    scriptsError: string | null;
    onScriptsSearchInputChange: (value: string) => void;
    onScriptsSearch: () => void;
    onScriptsClearSearch: () => void;
    onScriptsPreviousPage: () => void;
    onScriptsNextPage: () => void;
    getManualOverwriteTargetId: (contentType: "script", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const SCRIPTS_PAGE_SIZE = 12;

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

function CurrentCloneSessionScriptList({
    scripts,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    scripts: CloneSessionCurrentScript[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "script", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (scripts.length === 0) {
        return (
            <div id="clone-game-source-current-session-scripts-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(
        scripts.map((script) => [script.id, getManualOverwriteTargetId("script", script.id)]),
    );
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-scripts-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-scripts-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-scripts-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-scripts-table-head-row">
                        <th id="clone-game-source-current-session-scripts-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-scripts-table-version-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            Version
                        </th>
                        <th id="clone-game-source-current-session-scripts-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-scripts-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-scripts-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-scripts-table-body">
                    {scripts.map((script) => {
                        const overwriteTargetId = overwriteTargetIds.get(script.id) ?? null;

                        return (
                            <tr id={`clone-game-source-current-session-script-row-${script.id}`} key={script.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                                <td id={`clone-game-source-current-session-script-name-cell-${script.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-script-name-${script.id}`} className="font-medium">
                                        {script.name || t("common.none")}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-script-version-cell-${script.id}`} className="px-3 py-2 align-middle">
                                    <span id={`clone-game-source-current-session-script-version-${script.id}`} className="text-muted-foreground">
                                        v{script.version || 1}
                                    </span>
                                </td>
                                <td id={`clone-game-source-current-session-script-previously-cloned-cell-${script.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionPreviouslyClonedStatus
                                        id={`clone-game-source-current-session-script-previously-cloned-${script.id}`}
                                        iconId={`clone-game-source-current-session-script-previously-cloned-icon-${script.id}`}
                                        labelId={`clone-game-source-current-session-script-previously-cloned-label-${script.id}`}
                                        previouslyCloned={script.previously_cloned}
                                        t={t}
                                    />
                                </td>
                                <td id={`clone-game-source-current-session-script-ignore-cell-${script.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionIgnoreSwitch
                                        id={`clone-game-source-current-session-script-ignore-${script.id}`}
                                        sessionId={sessionId}
                                        contentType="script"
                                        sourceId={script.id}
                                        initialIgnored={isIgnored(script)}
                                        t={t}
                                    />
                                </td>
                                {hasOverwriteColumn ? (
                                    <td id={`clone-game-source-current-session-script-overwrite-cell-${script.id}`} className="px-3 py-2 align-middle">
                                        <CloneSessionManualOverwriteButton
                                            id={`clone-game-source-current-session-script-overwrite-${script.id}`}
                                            sessionId={sessionId}
                                            contentType="script"
                                            sourceId={script.id}
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

export function CurrentCloneSessionScriptsTab({
    t,
    scripts,
    sessionId,
    scriptsTotal,
    scriptsOffset,
    scriptsSearchInput,
    scriptsSearchName,
    scriptsLoading,
    scriptsError,
    onScriptsSearchInputChange,
    onScriptsSearch,
    onScriptsClearSearch,
    onScriptsPreviousPage,
    onScriptsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionScriptsTabProps) {
    const currentScriptsCurrentPage = scriptsTotal > 0 ? Math.floor(scriptsOffset / SCRIPTS_PAGE_SIZE) + 1 : 0;
    const currentScriptsTotalPages = scriptsTotal > 0 ? Math.ceil(scriptsTotal / SCRIPTS_PAGE_SIZE) : 0;
    const currentScriptsStart = scriptsTotal > 0 ? scriptsOffset + 1 : 0;
    const currentScriptsEnd = scriptsTotal > 0 ? Math.min(scriptsOffset + SCRIPTS_PAGE_SIZE, scriptsTotal) : 0;
    const hasPreviousScriptsPage = scriptsOffset > 0;
    const hasNextScriptsPage = scriptsOffset + SCRIPTS_PAGE_SIZE < scriptsTotal;

    return (
        <div id="clone-game-source-current-session-scripts-section" className="space-y-3">
            <div id="clone-game-source-current-session-scripts-controls" className="space-y-2">
                <div id="clone-game-source-current-session-scripts-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-scripts-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-scripts-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-scripts-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-scripts-search-input"
                                value={scriptsSearchInput}
                                onChange={(event) => onScriptsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onScriptsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionScriptSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {scriptsSearchInput || scriptsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-scripts-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onScriptsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-scripts-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-scripts-search-btn"
                        type="button"
                        onClick={onScriptsSearch}
                        disabled={scriptsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-scripts-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-scripts-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-scripts-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onScriptsPreviousPage}
                                disabled={!hasPreviousScriptsPage || scriptsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-scripts-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-scripts-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-scripts-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentScriptsCurrentPage, currentScriptsTotalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-scripts-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onScriptsNextPage}
                                disabled={!hasNextScriptsPage || scriptsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-scripts-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-scripts-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-scripts-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(currentScriptsStart, currentScriptsEnd, scriptsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-scripts-refresh-btn" iconId="clone-game-source-current-session-scripts-refresh-icon" loading={scriptsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {scriptsLoading ? (
                <div id="clone-game-source-current-session-scripts-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-scripts-loading-header" className="grid min-w-[700px] grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-script-skeleton-head-${index}`} key={`clone-game-source-current-session-script-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-script-skeleton-row-${index}`} key={`clone-game-source-current-session-script-skeleton-row-${index}`} className="grid min-w-[700px] grid-cols-[1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-script-skeleton-name-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-script-skeleton-version-${index}`} className="h-4 w-12" />
                            <Skeleton id={`clone-game-source-current-session-script-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-script-skeleton-ignore-${index}`} className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            ) : scriptsError ? (
                <div id="clone-game-source-current-session-scripts-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {scriptsError}
                </div>
            ) : (
                <CurrentCloneSessionScriptList scripts={scripts} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId as any} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
