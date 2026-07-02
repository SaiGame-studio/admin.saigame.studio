"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { CurrentCloneSessionItemContainerList, CurrentCloneSessionItemList } from "./CurrentCloneSessionLists";
import { CurrentCloneSessionGachaPacksTab } from "./CurrentCloneSessionGachaPacksTab";
import { CurrentCloneSessionItemTagsTab } from "./CurrentCloneSessionItemTagsTab";
import { CurrentCloneSessionPresetDefinitionsTab } from "./CurrentCloneSessionPresetDefinitionsTab";
import { CurrentCloneSessionQuestsTab } from "./CurrentCloneSessionQuestsTab";
import { CurrentCloneSessionShopDefinitionsTab } from "./CurrentCloneSessionShopDefinitionsTab";
import { CurrentCloneSessionTableRefreshButton } from "./CurrentCloneSessionTableRefreshButton";
import type { CurrentCloneSessionProgressTabsProps } from "./currentCloneSessionProgressTabs.types";
import { formatDurationCompact, getCloneSessionPhaseLabel, getProgressValue } from "./cloneSessionProgressUtils";

const ITEMS_PAGE_SIZE = 12;

function isSGemCurrency(value?: string) {
    return value?.trim().toLowerCase() === "sgem";
}

function toKebabIdSegment(value?: string) {
    if (!value) {
        return "unknown";
    }

    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

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

export function CurrentCloneSessionProgressTabs({
    t,
    currentSession,
    activeProgressTab,
    onActiveProgressTabChange,
    currentSessionProgressEntries,
    currentSessionEstimatedCost,
    items,
    itemsTotal,
    itemsOffset,
    itemsSearchInput,
    itemsSearchName,
    itemsLoading,
    itemsError,
    onItemsSearchInputChange,
    onItemsSearch,
    onItemsClearSearch,
    onItemsPreviousPage,
    onItemsNextPage,
    itemContainers,
    itemContainersTotal,
    itemContainersOffset,
    itemContainersSearchInput,
    itemContainersSearchName,
    itemContainersLoading,
    itemContainersError,
    onItemContainersSearchInputChange,
    onItemContainersSearch,
    onItemContainersClearSearch,
    onItemContainersPreviousPage,
    onItemContainersNextPage,
    itemTags,
    itemTagsTotal,
    itemTagsOffset,
    itemTagsSearchInput,
    itemTagsSearchName,
    itemTagsLoading,
    itemTagsError,
    onItemTagsSearchInputChange,
    onItemTagsSearch,
    onItemTagsClearSearch,
    onItemTagsPreviousPage,
    onItemTagsNextPage,
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
    shopDefinitions,
    shopDefinitionsTotal,
    shopDefinitionsOffset,
    shopDefinitionsSearchInput,
    shopDefinitionsSearchName,
    shopDefinitionsLoading,
    shopDefinitionsError,
    onShopDefinitionsSearchInputChange,
    onShopDefinitionsSearch,
    onShopDefinitionsClearSearch,
    onShopDefinitionsPreviousPage,
    onShopDefinitionsNextPage,
    presetDefinitions, presetDefinitionsTotal, presetDefinitionsOffset, presetDefinitionsSearchInput, presetDefinitionsSearchName,
    presetDefinitionsLoading, presetDefinitionsError, onPresetDefinitionsSearchInputChange, onPresetDefinitionsSearch,
    onPresetDefinitionsClearSearch, onPresetDefinitionsPreviousPage, onPresetDefinitionsNextPage,
    gachaPacks, gachaPacksSessionId, gachaPacksTotal, gachaPacksOffset, gachaPacksSearchInput, gachaPacksSearchName,
    gachaPacksLoading, gachaPacksError, onGachaPacksSearchInputChange, onGachaPacksSearch,
    onGachaPacksClearSearch, onGachaPacksPreviousPage, onGachaPacksNextPage,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: CurrentCloneSessionProgressTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, Math.floor(currentSession.expires_in_seconds ?? 0)));
    const currentItemsCurrentPage = itemsTotal > 0 ? Math.floor(itemsOffset / ITEMS_PAGE_SIZE) + 1 : 0;
    const currentItemsTotalPages = itemsTotal > 0 ? Math.ceil(itemsTotal / ITEMS_PAGE_SIZE) : 0;
    const currentItemsStart = itemsTotal > 0 ? itemsOffset + 1 : 0;
    const currentItemsEnd = itemsTotal > 0 ? Math.min(itemsOffset + ITEMS_PAGE_SIZE, itemsTotal) : 0;
    const hasPreviousItemsPage = itemsOffset > 0;
    const hasNextItemsPage = itemsOffset + ITEMS_PAGE_SIZE < itemsTotal;
    const currentItemContainersCurrentPage = itemContainersTotal > 0 ? Math.floor(itemContainersOffset / ITEMS_PAGE_SIZE) + 1 : 0;
    const currentItemContainersTotalPages = itemContainersTotal > 0 ? Math.ceil(itemContainersTotal / ITEMS_PAGE_SIZE) : 0;
    const currentItemContainersStart = itemContainersTotal > 0 ? itemContainersOffset + 1 : 0;
    const currentItemContainersEnd = itemContainersTotal > 0 ? Math.min(itemContainersOffset + ITEMS_PAGE_SIZE, itemContainersTotal) : 0;
    const hasPreviousItemContainersPage = itemContainersOffset > 0;
    const hasNextItemContainersPage = itemContainersOffset + ITEMS_PAGE_SIZE < itemContainersTotal;
    const buildProgressTabHref = (phaseKey: string) => {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", phaseKey);
        return `${pathname}?${nextParams.toString()}`;
    };
    const handleProgressTabChange = (value: string) => {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("subTab", value);
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
        onActiveProgressTabChange(value);
    };

    useEffect(() => {
        setRemainingSeconds(Math.max(0, Math.floor(currentSession.expires_in_seconds ?? 0)));
    }, [currentSession.expires_in_seconds, currentSession.session_id]);
    useEffect(() => {
        if (remainingSeconds <= 0) {
            return;
        }
        const timer = window.setInterval(() => {
            setRemainingSeconds((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [currentSession.expires_in_seconds, currentSession.session_id]);
    const expiresInText = formatDurationCompact(remainingSeconds);
    const expiresAtText = formatTimestamp(currentSession.expires_at);
    const sessionTtlText = formatDurationCompact(currentSession.session_ttl_seconds);

    return (
        <CardContent id="clone-game-source-current-session-content" className="space-y-4 text-sm">
            <div id="clone-game-source-current-session-meta" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
                <div id="clone-game-source-current-session-meta-left" className="space-y-3">
                    <div id="clone-game-source-current-session-phase" className="space-y-1">
                        <p id="clone-game-source-current-session-phase-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPhaseLabel")}
                        </p>
                        <p id="clone-game-source-current-session-phase-value" className="break-all font-medium">
                            {getCloneSessionPhaseLabel(currentSession.current_phase, t)}
                        </p>
                    </div>
                    <div id="clone-game-source-current-session-source-name" className="space-y-1">
                        <p id="clone-game-source-current-session-source-name-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionSourceNameLabel")}
                        </p>
                        <p id="clone-game-source-current-session-source-name-value" className="break-all font-medium">
                            {currentSession.source_game_name || t("common.unknown")}
                        </p>
                    </div>
                    <div id="clone-game-source-current-session-batch" className="space-y-1">
                        <p id="clone-game-source-current-session-batch-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionBatchLabel")}
                        </p>
                        <p id="clone-game-source-current-session-batch-value" className="font-medium">
                            {currentSession.current_batch_index ?? 0} / {currentSession.batch_size ?? 0}
                        </p>
                    </div>
                </div>
                <div id="clone-game-source-current-session-meta-right" className="space-y-3">
                    <div id="clone-game-source-current-session-same-studio" className="space-y-1">
                        <p id="clone-game-source-current-session-same-studio-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionSameStudioLabel")}
                        </p>
                        <Badge
                            id="clone-game-source-current-session-same-studio-badge"
                            variant={currentSession.same_studio === undefined ? "outline" : currentSession.same_studio ? "default" : "secondary"}
                        >
                            {currentSession.same_studio === undefined
                                ? t("common.unknown")
                                : currentSession.same_studio
                                    ? t("common.yes")
                                    : t("common.no")}
                        </Badge>
                    </div>
                    {currentSessionEstimatedCost ? (
                        <div id="clone-game-source-current-session-cost" className="space-y-1">
                            <p id="clone-game-source-current-session-cost-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                                {t("cloneGame.sourceGameCurrentSessionCostLabel")}
                            </p>
                            <p id="clone-game-source-current-session-cost-value" className="font-medium">
                                <span id="clone-game-source-current-session-cost-amount">
                                    {currentSessionEstimatedCost.amount ?? 0}
                                </span>{" "}
                                {isSGemCurrency(currentSessionEstimatedCost.currency) ? (
                                    <span id="clone-game-source-current-session-cost-currency" className="inline-flex items-center gap-1">
                                        <span id="clone-game-source-current-session-cost-currency-icon" aria-hidden="true">
                                            {"\u{1F48E}"}
                                        </span>
                                        <span id="clone-game-source-current-session-cost-currency-text">
                                            {currentSessionEstimatedCost.currency}
                                        </span>
                                    </span>
                                ) : (
                                    <span id="clone-game-source-current-session-cost-currency">
                                        {currentSessionEstimatedCost.currency || t("common.unknown")}
                                    </span>
                                )}
                            </p>
                        </div>
                    ) : null}
                    {expiresInText ? (
                        <div id="clone-game-source-current-session-expiry" className="space-y-1">
                            <p id="clone-game-source-current-session-expiry-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                                {t("cloneGame.sourceGameCurrentSessionExpiresInLabel")}
                            </p>
                            <p id="clone-game-source-current-session-expiry-value" className="font-medium tabular-nums">
                                {remainingSeconds > 0 ? expiresInText : t("cloneGame.sourceGameCurrentSessionExpired")}
                            </p>
                            {expiresAtText !== "-" ? (
                                <p id="clone-game-source-current-session-expiry-at" className="text-xs text-muted-foreground">
                                    {t("cloneGame.sourceGameCurrentSessionExpiresAtLabel")}: {expiresAtText}
                                </p>
                            ) : null}
                            {sessionTtlText ? (
                                <p id="clone-game-source-current-session-ttl" className="text-xs text-muted-foreground">
                                    {t("cloneGame.sourceGameCurrentSessionTtlLabel")}: {sessionTtlText}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            {currentSessionProgressEntries.length > 0 ? (
                <div id="clone-game-source-current-session-progress" className="space-y-2 border-t pt-4">
                    <p id="clone-game-source-current-session-progress-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("cloneGame.sourceGameCurrentSessionProgressLabel")}
                    </p>
                    <Tabs id="clone-game-source-current-session-progress-tabs" value={activeProgressTab ?? currentSessionProgressEntries[0]?.[0] ?? ""} onValueChange={handleProgressTabChange} className="w-full">
                        <div id="clone-game-source-current-session-progress-tabs-scroll" className="overflow-x-auto">
                            <TabsList id="clone-game-source-current-session-progress-tabs-list" className="mb-3 inline-flex min-w-max">
                                {currentSessionProgressEntries.map(([phaseKey], index) => (
                                    <TabsTrigger
                                        id={`clone-game-source-current-session-progress-tab-trigger-${toKebabIdSegment(phaseKey)}`}
                                        key={phaseKey}
                                        value={phaseKey}
                                        href={buildProgressTabHref(phaseKey)}
                                        className="flex items-center gap-2"
                                    >
                                        <span id={`clone-game-source-current-session-progress-tab-index-${toKebabIdSegment(phaseKey)}`} className="text-xs font-semibold tabular-nums">
                                            {index + 1}
                                        </span>
                                        <span id={`clone-game-source-current-session-progress-tab-label-${toKebabIdSegment(phaseKey)}`} className="whitespace-nowrap">
                                            {getCloneSessionPhaseLabel(phaseKey, t)}
                                        </span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        {currentSessionProgressEntries.map(([phaseKey, progress]) => (
                            <TabsContent
                                id={`clone-game-source-current-session-progress-tab-content-${toKebabIdSegment(phaseKey)}`}
                                key={phaseKey}
                                value={phaseKey}
                                className="mt-0 space-y-3"
                            >
                                <div id={`clone-game-source-current-session-progress-item-${toKebabIdSegment(phaseKey)}`} className="space-y-1">
                                    <div id={`clone-game-source-current-session-progress-item-bar-wrap-${toKebabIdSegment(phaseKey)}`} className="relative">
                                        <Progress
                                            id={`clone-game-source-current-session-progress-item-bar-${toKebabIdSegment(phaseKey)}`}
                                            value={getProgressValue(progress.processed, progress.total)}
                                            className="h-4"
                                        />
                                        <div id={`clone-game-source-current-session-progress-item-bar-overlay-${toKebabIdSegment(phaseKey)}`} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                            <p id={`clone-game-source-current-session-progress-item-bar-text-${toKebabIdSegment(phaseKey)}`} className="text-[10px] font-medium text-foreground">
                                                {progress.processed ?? 0}/{progress.total ?? 0} ({Math.round(getProgressValue(progress.processed, progress.total))}%)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {phaseKey === "item_definitions" ? (
                                    <div id="clone-game-source-current-session-item-definitions-section" className="space-y-3">
                                        <div id="clone-game-source-current-session-item-definitions-controls" className="space-y-2">
                                            <div id="clone-game-source-current-session-item-definitions-search-row" className="flex flex-wrap items-center gap-2">
                                                <div id="clone-game-source-current-session-item-definitions-search-field" className="w-full md:w-1/2">
                                                    <div id="clone-game-source-current-session-item-definitions-search-input-wrap" className="relative">
                                                        <Search id="clone-game-source-current-session-item-definitions-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                        <Input
                                                            id="clone-game-source-current-session-item-definitions-search-input"
                                                            value={itemsSearchInput}
                                                            onChange={(event) => onItemsSearchInputChange(event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter") {
                                                                    event.preventDefault();
                                                                    onItemsSearch();
                                                                }
                                                            }}
                                                            placeholder={t("cloneGame.sourceGameCurrentSessionItemSearchPlaceholder")}
                                                            className="h-8 pl-8 pr-20 text-xs"
                                                            autoComplete="off"
                                                        />
                                                        {itemsSearchInput || itemsSearchName ? (
                                                            <Button
                                                                id="clone-game-source-current-session-item-definitions-clear-search-inline-btn"
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                                                onClick={onItemsClearSearch}
                                                            >
                                                                <X id="clone-game-source-current-session-item-definitions-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <Button
                                                    id="clone-game-source-current-session-item-definitions-search-btn"
                                                    type="button"
                                                    onClick={onItemsSearch}
                                                    disabled={itemsLoading}
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs"
                                                >
                                                    {t("common.search")}
                                                </Button>
                                                <div id="clone-game-source-current-session-item-definitions-pagination" className="ml-auto flex items-center gap-2">
                                                    <div id="clone-game-source-current-session-item-definitions-pagination-actions" className="flex items-center gap-1">
                                                        <Button
                                                            id="clone-game-source-current-session-item-definitions-pagination-prev"
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={onItemsPreviousPage}
                                                            disabled={!hasPreviousItemsPage || itemsLoading}
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <ChevronLeft id="clone-game-source-current-session-item-definitions-pagination-prev-icon" className="h-3.5 w-3.5" />
                                                            <span id="clone-game-source-current-session-item-definitions-pagination-prev-label" className="sr-only">
                                                                {t("common.previous")}
                                                            </span>
                                                        </Button>
                                                        <p id="clone-game-source-current-session-item-definitions-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                                            {formatPage(currentItemsCurrentPage, currentItemsTotalPages)}
                                                        </p>
                                                        <Button
                                                            id="clone-game-source-current-session-item-definitions-pagination-next"
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={onItemsNextPage}
                                                            disabled={!hasNextItemsPage || itemsLoading}
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <ChevronRight id="clone-game-source-current-session-item-definitions-pagination-next-icon" className="h-3.5 w-3.5" />
                                                            <span id="clone-game-source-current-session-item-definitions-pagination-next-label" className="sr-only">
                                                                {t("common.next")}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                    <p id="clone-game-source-current-session-item-definitions-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                                                        {formatRange(currentItemsStart, currentItemsEnd, itemsTotal)}
                                                    </p>
                                                    <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-item-definitions-refresh-btn" iconId="clone-game-source-current-session-item-definitions-refresh-icon" loading={itemsLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                                                </div>
                                            </div>
                                        </div>

                                        {itemsLoading ? (
                                            <div id="clone-game-source-current-session-item-definitions-loading" className="overflow-x-auto rounded-md border bg-background">
                                                <div id="clone-game-source-current-session-item-definitions-loading-header" className="grid min-w-[900px] grid-cols-[1.4fr_1.4fr_0.8fr_1fr_0.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                                                    {Array.from({ length: 6 }).map((_, index) => (
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-head-${index}`} key={`clone-game-source-current-session-item-skeleton-head-${index}`} className="h-4 w-20" />
                                                    ))}
                                                </div>
                                                {Array.from({ length: 3 }).map((_, index) => (
                                                    <div id={`clone-game-source-current-session-item-skeleton-row-${index}`} key={`clone-game-source-current-session-item-skeleton-row-${index}`} className="grid min-w-[900px] grid-cols-[1.4fr_1.4fr_0.8fr_1fr_0.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-name-${index}`} className="h-4 w-2/3" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-code-${index}`} className="h-4 w-3/4" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-rarity-${index}`} className="h-4 w-16" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-category-${index}`} className="h-4 w-20" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-overwrite-${index}`} className="h-4 w-16" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : itemsError ? (
                                            <div id="clone-game-source-current-session-item-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                                {itemsError}
                                            </div>
                                        ) : (
                                            <CurrentCloneSessionItemList items={items} sessionId={currentSession.session_id} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess} />
                                        )}
                                    </div>
                                ) : phaseKey === "item_container_definitions" ? (
                                    <div id="clone-game-source-current-session-item-containers-section" className="space-y-3">
                                        <div id="clone-game-source-current-session-item-containers-controls" className="space-y-2">
                                            <div id="clone-game-source-current-session-item-containers-search-row" className="flex flex-wrap items-center gap-2">
                                                <div id="clone-game-source-current-session-item-containers-search-field" className="w-full md:w-1/2">
                                                    <div id="clone-game-source-current-session-item-containers-search-input-wrap" className="relative">
                                                        <Search id="clone-game-source-current-session-item-containers-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                        <Input
                                                            id="clone-game-source-current-session-item-containers-search-input"
                                                            value={itemContainersSearchInput}
                                                            onChange={(event) => onItemContainersSearchInputChange(event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter") {
                                                                    event.preventDefault();
                                                                    onItemContainersSearch();
                                                                }
                                                            }}
                                                            placeholder={t("cloneGame.sourceGameCurrentSessionItemContainerSearchPlaceholder")}
                                                            className="h-8 pl-8 pr-20 text-xs"
                                                            autoComplete="off"
                                                        />
                                                        {itemContainersSearchInput || itemContainersSearchName ? (
                                                            <Button
                                                                id="clone-game-source-current-session-item-containers-clear-search-inline-btn"
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                                                onClick={onItemContainersClearSearch}
                                                            >
                                                                <X id="clone-game-source-current-session-item-containers-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <Button
                                                    id="clone-game-source-current-session-item-containers-search-btn"
                                                    type="button"
                                                    onClick={onItemContainersSearch}
                                                    disabled={itemContainersLoading}
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs"
                                                >
                                                    {t("common.search")}
                                                </Button>
                                                <div id="clone-game-source-current-session-item-containers-pagination" className="ml-auto flex items-center gap-2">
                                                    <div id="clone-game-source-current-session-item-containers-pagination-actions" className="flex items-center gap-1">
                                                        <Button
                                                            id="clone-game-source-current-session-item-containers-pagination-prev"
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={onItemContainersPreviousPage}
                                                            disabled={!hasPreviousItemContainersPage || itemContainersLoading}
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <ChevronLeft id="clone-game-source-current-session-item-containers-pagination-prev-icon" className="h-3.5 w-3.5" />
                                                            <span id="clone-game-source-current-session-item-containers-pagination-prev-label" className="sr-only">
                                                                {t("common.previous")}
                                                            </span>
                                                        </Button>
                                                        <p id="clone-game-source-current-session-item-containers-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                                            {formatPage(currentItemContainersCurrentPage, currentItemContainersTotalPages)}
                                                        </p>
                                                        <Button
                                                            id="clone-game-source-current-session-item-containers-pagination-next"
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={onItemContainersNextPage}
                                                            disabled={!hasNextItemContainersPage || itemContainersLoading}
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <ChevronRight id="clone-game-source-current-session-item-containers-pagination-next-icon" className="h-3.5 w-3.5" />
                                                            <span id="clone-game-source-current-session-item-containers-pagination-next-label" className="sr-only">
                                                                {t("common.next")}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                    <p id="clone-game-source-current-session-item-containers-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                                                        {formatRange(currentItemContainersStart, currentItemContainersEnd, itemContainersTotal)}
                                                    </p>
                                                    <CurrentCloneSessionTableRefreshButton id="clone-game-source-current-session-item-containers-refresh-btn" iconId="clone-game-source-current-session-item-containers-refresh-icon" loading={itemContainersLoading} t={t} onRefresh={onManualOverwriteSuccess} />
                                                </div>
                                            </div>
                                        </div>

                                        {itemContainersLoading ? (
                                            <div id="clone-game-source-current-session-item-containers-loading" className="overflow-x-auto rounded-md border bg-background">
                                                <div id="clone-game-source-current-session-item-containers-loading-header" className="grid min-w-[1000px] grid-cols-[1.3fr_1.3fr_0.9fr_0.7fr_0.8fr_1fr_0.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                                                    {Array.from({ length: 8 }).map((_, index) => (
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-head-${index}`} key={`clone-game-source-current-session-item-container-skeleton-head-${index}`} className="h-4 w-20" />
                                                    ))}
                                                </div>
                                                {Array.from({ length: 3 }).map((_, index) => (
                                                    <div id={`clone-game-source-current-session-item-container-skeleton-row-${index}`} key={`clone-game-source-current-session-item-container-skeleton-row-${index}`} className="grid min-w-[1000px] grid-cols-[1.3fr_1.3fr_0.9fr_0.7fr_0.8fr_1fr_0.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-name-${index}`} className="h-4 w-2/3" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-code-${index}`} className="h-4 w-3/4" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-type-${index}`} className="h-4 w-16" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-grid-${index}`} className="h-4 w-12" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-portable-${index}`} className="h-4 w-12" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-instanced-${index}`} className="h-4 w-12" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-previously-cloned-${index}`} className="mx-auto h-4 w-4" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-overwrite-${index}`} className="h-4 w-16" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : itemContainersError ? (
                                            <div id="clone-game-source-current-session-item-containers-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                                {itemContainersError}
                                            </div>
                                        ) : (
                                            <CurrentCloneSessionItemContainerList itemContainers={itemContainers} sessionId={currentSession.session_id} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess} />
                                        )}
                                    </div>
                                ) : phaseKey === "item_tags" || phaseKey === "item_tag_definitions" ? (
                                    <CurrentCloneSessionItemTagsTab
                                        t={t}
                                        itemTags={itemTags}
                                        sessionId={currentSession.session_id}
                                        itemTagsTotal={itemTagsTotal}
                                        itemTagsOffset={itemTagsOffset}
                                        itemTagsSearchInput={itemTagsSearchInput}
                                        itemTagsSearchName={itemTagsSearchName}
                                        itemTagsLoading={itemTagsLoading}
                                        itemTagsError={itemTagsError}
                                        onItemTagsSearchInputChange={onItemTagsSearchInputChange}
                                        onItemTagsSearch={onItemTagsSearch}
                                        onItemTagsClearSearch={onItemTagsClearSearch}
                                        onItemTagsPreviousPage={onItemTagsPreviousPage}
                                        onItemTagsNextPage={onItemTagsNextPage}
                                        getManualOverwriteTargetId={getManualOverwriteTargetId}
                                        onManualOverwriteSuccess={onManualOverwriteSuccess}
                                    />
                                ) : phaseKey === "quest_definitions" ? (
                                    <CurrentCloneSessionQuestsTab
                                        t={t}
                                        quests={quests}
                                        sessionId={currentSession.session_id}
                                        questsTotal={questsTotal}
                                        questsOffset={questsOffset}
                                        questsSearchInput={questsSearchInput}
                                        questsSearchName={questsSearchName}
                                        questsLoading={questsLoading}
                                        questsError={questsError}
                                        onQuestsSearchInputChange={onQuestsSearchInputChange}
                                        onQuestsSearch={onQuestsSearch}
                                        onQuestsClearSearch={onQuestsClearSearch}
                                        onQuestsPreviousPage={onQuestsPreviousPage}
                                        onQuestsNextPage={onQuestsNextPage}
                                        getManualOverwriteTargetId={getManualOverwriteTargetId}
                                        onManualOverwriteSuccess={onManualOverwriteSuccess}
                                    />
                                ) : phaseKey === "shop_definitions" ? (
                                    <CurrentCloneSessionShopDefinitionsTab
                                        t={t}
                                        shopDefinitions={shopDefinitions}
                                        sessionId={currentSession.session_id}
                                        shopDefinitionsTotal={shopDefinitionsTotal}
                                        shopDefinitionsOffset={shopDefinitionsOffset}
                                        shopDefinitionsSearchInput={shopDefinitionsSearchInput}
                                        shopDefinitionsSearchName={shopDefinitionsSearchName}
                                        shopDefinitionsLoading={shopDefinitionsLoading}
                                        shopDefinitionsError={shopDefinitionsError}
                                        onShopDefinitionsSearchInputChange={onShopDefinitionsSearchInputChange}
                                        onShopDefinitionsSearch={onShopDefinitionsSearch}
                                        onShopDefinitionsClearSearch={onShopDefinitionsClearSearch}
                                        onShopDefinitionsPreviousPage={onShopDefinitionsPreviousPage}
                                        onShopDefinitionsNextPage={onShopDefinitionsNextPage}
                                        getManualOverwriteTargetId={getManualOverwriteTargetId}
                                        onManualOverwriteSuccess={onManualOverwriteSuccess}
                                    />
                                ) : phaseKey === "preset_definitions" ? (
                                    <CurrentCloneSessionPresetDefinitionsTab
                                        t={t} presetDefinitions={presetDefinitions} sessionId={currentSession.session_id}
                                        presetDefinitionsTotal={presetDefinitionsTotal} presetDefinitionsOffset={presetDefinitionsOffset}
                                        presetDefinitionsSearchInput={presetDefinitionsSearchInput} presetDefinitionsSearchName={presetDefinitionsSearchName}
                                        presetDefinitionsLoading={presetDefinitionsLoading} presetDefinitionsError={presetDefinitionsError}
                                        onPresetDefinitionsSearchInputChange={onPresetDefinitionsSearchInputChange} onPresetDefinitionsSearch={onPresetDefinitionsSearch}
                                        onPresetDefinitionsClearSearch={onPresetDefinitionsClearSearch} onPresetDefinitionsPreviousPage={onPresetDefinitionsPreviousPage}
                                        onPresetDefinitionsNextPage={onPresetDefinitionsNextPage} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess}
                                    />
                                ) : phaseKey === "gacha_packs" || phaseKey === "gacha_pack_definitions" ? (
                                    <CurrentCloneSessionGachaPacksTab
                                        t={t}
                                        gachaPacks={gachaPacks}
                                        sessionId={gachaPacksSessionId}
                                        gachaPacksTotal={gachaPacksTotal}
                                        gachaPacksOffset={gachaPacksOffset}
                                        gachaPacksSearchInput={gachaPacksSearchInput}
                                        gachaPacksSearchName={gachaPacksSearchName}
                                        gachaPacksLoading={gachaPacksLoading}
                                        gachaPacksError={gachaPacksError}
                                        onGachaPacksSearchInputChange={onGachaPacksSearchInputChange}
                                        onGachaPacksSearch={onGachaPacksSearch}
                                        onGachaPacksClearSearch={onGachaPacksClearSearch}
                                        onGachaPacksPreviousPage={onGachaPacksPreviousPage}
                                        onGachaPacksNextPage={onGachaPacksNextPage}
                                        onManualOverwriteSuccess={onManualOverwriteSuccess}
                                    />
                                ) : null}
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            ) : null}
        </CardContent>
    );
}
