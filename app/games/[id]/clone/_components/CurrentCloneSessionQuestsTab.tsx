"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentQuestDefinition } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import { CloneSessionPreviouslyClonedStatus } from "./CloneSessionPreviouslyClonedStatus";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionQuestsTabProps = {
    t: TranslationFn;
    quests: CloneSessionCurrentQuestDefinition[];
    sessionId?: string;
    questsTotal: number;
    questsOffset: number;
    questsSearchInput: string;
    questsSearchName: string;
    questsLoading: boolean;
    questsError: string | null;
    onQuestsSearchInputChange: (value: string) => void;
    onQuestsSearch: () => void;
    onQuestsClearSearch: () => void;
    onQuestsPreviousPage: () => void;
    onQuestsNextPage: () => void;
    getManualOverwriteTargetId: (contentType: "quest_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
};

const QUESTS_PAGE_SIZE = 12;

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

function getQuestTypeBadgeVariant(questType?: string) {
    const normalized = (questType ?? "").toLowerCase();

    if (normalized === "daily") {
        return "default" as const;
    }

    if (normalized === "repeatable") {
        return "secondary" as const;
    }

    if (normalized === "battle_pass_task") {
        return "destructive" as const;
    }

    return "outline" as const;
}

function isIgnored(value: CloneSessionCurrentQuestDefinition) {
    return Boolean(value.ignored ?? value.is_ignored);
}

function CurrentCloneSessionQuestList({
    quests,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    quests: CloneSessionCurrentQuestDefinition[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "quest_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (quests.length === 0) {
        return (
            <div id="clone-game-source-current-session-quests-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(quests.map((quest) => [quest.id, getManualOverwriteTargetId("quest_definition", quest.id)]));
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-quests-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-quests-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-quests-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-quests-table-head-row">
                        <th id="clone-game-source-current-session-quests-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-quests-table-code-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionCodeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-quests-table-type-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionQuestTypeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-quests-table-status-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionQuestStatusLabel")}
                        </th>
                        <th id="clone-game-source-current-session-quests-table-rewards-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionQuestRewardsLabel")}
                        </th>
                        <th id="clone-game-source-current-session-quests-table-previously-cloned-head" className="h-9 px-3 text-center align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPreviouslyClonedLabel")}
                        </th>
                        <th id="clone-game-source-current-session-quests-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-quests-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-quests-table-body">
                    {quests.map((quest) => {
                        const overwriteTargetId = overwriteTargetIds.get(quest.id) ?? null;

                        return (
                        <tr id={`clone-game-source-current-session-quest-row-${quest.id}`} key={quest.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-quest-name-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-quest-name-${quest.id}`} className="font-medium">
                                    {quest.name}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-quest-code-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-quest-code-${quest.id}`} className="font-mono text-xs text-muted-foreground">
                                    {quest.code_name || t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-quest-type-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                <Badge id={`clone-game-source-current-session-quest-type-${quest.id}`} variant={getQuestTypeBadgeVariant(quest.quest_type)}>
                                    {quest.quest_type || t("common.unknown")}
                                </Badge>
                            </td>
                            <td id={`clone-game-source-current-session-quest-status-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-quest-status-value-${quest.id}`}>
                                    {quest.is_active ? t("common.active") : t("common.inactive")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-quest-rewards-cell-${quest.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                <span id={`clone-game-source-current-session-quest-rewards-value-${quest.id}`}>
                                    {(quest.rewards ?? []).length.toLocaleString("en-US")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-quest-previously-cloned-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                <CloneSessionPreviouslyClonedStatus
                                    id={`clone-game-source-current-session-quest-previously-cloned-${quest.id}`}
                                    iconId={`clone-game-source-current-session-quest-previously-cloned-icon-${quest.id}`}
                                    labelId={`clone-game-source-current-session-quest-previously-cloned-label-${quest.id}`}
                                    previouslyCloned={quest.previously_cloned}
                                    t={t}
                                />
                            </td>
                            <td id={`clone-game-source-current-session-quest-ignore-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                <CloneSessionIgnoreSwitch id={`clone-game-source-current-session-quest-ignore-${quest.id}`} sessionId={sessionId} contentType="quest_definition" sourceId={quest.id} initialIgnored={isIgnored(quest)} t={t} />
                            </td>
                            {hasOverwriteColumn ? (
                                <td id={`clone-game-source-current-session-quest-overwrite-cell-${quest.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionManualOverwriteButton
                                        id={`clone-game-source-current-session-quest-overwrite-${quest.id}`}
                                        sessionId={sessionId}
                                        contentType="quest_definition"
                                        sourceId={quest.id}
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

export function CurrentCloneSessionQuestsTab({
    t,
    quests,
    sessionId,
    questsTotal,
    questsOffset,
    questsSearchInput,
    questsSearchName,
    questsLoading,
    questsError,
    onQuestsSearchInputChange,
    onQuestsSearch,
    onQuestsClearSearch,
    onQuestsPreviousPage,
    onQuestsNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionQuestsTabProps) {
    const currentPage = questsTotal > 0 ? Math.floor(questsOffset / QUESTS_PAGE_SIZE) + 1 : 0;
    const totalPages = questsTotal > 0 ? Math.ceil(questsTotal / QUESTS_PAGE_SIZE) : 0;
    const start = questsTotal > 0 ? questsOffset + 1 : 0;
    const end = questsTotal > 0 ? Math.min(questsOffset + QUESTS_PAGE_SIZE, questsTotal) : 0;
    const hasPreviousPage = questsOffset > 0;
    const hasNextPage = questsOffset + QUESTS_PAGE_SIZE < questsTotal;

    return (
        <div id="clone-game-source-current-session-quests-section" className="space-y-3">
            <div id="clone-game-source-current-session-quests-controls" className="space-y-2">
                <div id="clone-game-source-current-session-quests-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-quests-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-quests-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-quests-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-quests-search-input"
                                value={questsSearchInput}
                                onChange={(event) => onQuestsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onQuestsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionQuestSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {questsSearchInput || questsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-quests-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onQuestsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-quests-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-quests-search-btn"
                        type="button"
                        onClick={onQuestsSearch}
                        disabled={questsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-quests-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-quests-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-quests-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onQuestsPreviousPage}
                                disabled={!hasPreviousPage || questsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-quests-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-quests-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-quests-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentPage, totalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-quests-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onQuestsNextPage}
                                disabled={!hasNextPage || questsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-quests-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-quests-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-quests-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(start, end, questsTotal)}
                        </p>
                        <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-quests-refresh-btn" iconId="clone-game-source-current-session-quests-refresh-icon" loading={questsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                    </div>
                </div>
            </div>

            {questsLoading ? (
                <div id="clone-game-source-current-session-quests-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-quests-loading-header" className="grid min-w-[900px] grid-cols-[1.4fr_1.2fr_0.8fr_0.7fr_0.7fr_0.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-head-${index}`} key={`clone-game-source-current-session-quest-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-quest-skeleton-row-${index}`} key={`clone-game-source-current-session-quest-skeleton-row-${index}`} className="grid min-w-[900px] grid-cols-[1.4fr_1.2fr_0.8fr_0.7fr_0.7fr_0.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-name-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-code-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-type-${index}`} className="h-4 w-16" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-status-${index}`} className="h-4 w-14" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-rewards-${index}`} className="ml-auto h-4 w-10" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-overwrite-${index}`} className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : questsError ? (
                <div id="clone-game-source-current-session-quests-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {questsError}
                </div>
            ) : (
                <CurrentCloneSessionQuestList quests={quests} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
