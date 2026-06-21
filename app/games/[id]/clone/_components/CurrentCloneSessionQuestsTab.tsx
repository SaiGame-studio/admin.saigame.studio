"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CloneSessionCurrentQuestDefinition } from "@/lib/game-api";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionQuestsTabProps = {
    t: TranslationFn;
    quests: CloneSessionCurrentQuestDefinition[];
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

function CurrentCloneSessionQuestList({ quests, t }: { quests: CloneSessionCurrentQuestDefinition[]; t: TranslationFn; }) {
    if (quests.length === 0) {
        return (
            <div id="clone-game-source-current-session-quests-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-quests-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quests.map((quest) => (
                <div id={`clone-game-source-current-session-quest-${quest.id}`} key={quest.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-quest-header-${quest.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-quest-title-row-${quest.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-quest-name-${quest.id}`} className="font-medium">
                                {quest.name}
                            </p>
                            <Badge id={`clone-game-source-current-session-quest-type-${quest.id}`} variant={getQuestTypeBadgeVariant(quest.quest_type)}>
                                {quest.quest_type || t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-quest-code-${quest.id}`} className="font-mono text-xs text-muted-foreground">
                            {quest.code_name || t("common.unknown")}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-quest-meta-${quest.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-quest-status-${quest.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-quest-status-label-${quest.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionQuestStatusLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-quest-status-value-${quest.id}`} className="text-foreground">
                                {quest.is_active ? t("common.active") : t("common.inactive")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-quest-sort-${quest.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-quest-sort-label-${quest.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionQuestSortOrderLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-quest-sort-value-${quest.id}`} className="text-foreground">
                                {typeof quest.sort_order === "number" ? quest.sort_order.toLocaleString("en-US") : t("common.unknown")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-quest-rewards-${quest.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-quest-rewards-label-${quest.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionQuestRewardsLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-quest-rewards-value-${quest.id}`} className="text-foreground">
                                {(quest.rewards ?? []).length.toLocaleString("en-US")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-quest-description-${quest.id}`} className="space-y-1">
                            <span id={`clone-game-source-current-session-quest-description-label-${quest.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionQuestDescriptionLabel")}
                            </span>
                            <p id={`clone-game-source-current-session-quest-description-value-${quest.id}`} className="text-foreground">
                                {quest.description || t("common.unknown")}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CurrentCloneSessionQuestsTab({
    t,
    quests,
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
                    </div>
                </div>
            </div>

            {questsLoading ? (
                <div id="clone-game-source-current-session-quests-loading" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-quest-skeleton-${index}`} key={`clone-game-source-current-session-quest-skeleton-${index}`} className="rounded-md border bg-background px-3 py-2">
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-title-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-code-${index}`} className="mt-2 h-3 w-1/2" />
                            <Skeleton id={`clone-game-source-current-session-quest-skeleton-meta-${index}`} className="mt-3 h-3 w-3/4" />
                        </div>
                    ))}
                </div>
            ) : questsError ? (
                <div id="clone-game-source-current-session-quests-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {questsError}
                </div>
            ) : (
                <CurrentCloneSessionQuestList quests={quests} t={t} />
            )}
        </div>
    );
}
