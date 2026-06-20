"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { CloneSessionCurrentItemContainer, CloneSessionCurrentItemDefinition, CloneSessionSnapshot } from "@/lib/game-api";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionProgressTabsProps = {
    t: TranslationFn;
    currentSession: CloneSessionSnapshot;
    activeProgressTab: string | null;
    onActiveProgressTabChange: (value: string) => void;
    currentSessionProgressEntries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>;
    currentSessionEstimatedCost?: { currency?: string; amount?: number };
    currentSessionWarnings: Array<{ field?: string; message?: string }>;
    items: CloneSessionCurrentItemDefinition[];
    itemsTotal: number;
    itemsOffset: number;
    itemsSearchInput: string;
    itemsSearchName: string;
    itemsLoading: boolean;
    itemsError: string | null;
    onItemsSearchInputChange: (value: string) => void;
    onItemsSearch: () => void;
    onItemsClearSearch: () => void;
    onItemsPreviousPage: () => void;
    onItemsNextPage: () => void;
    itemContainers: CloneSessionCurrentItemContainer[];
    itemContainersTotal: number;
    itemContainersOffset: number;
    itemContainersSearchInput: string;
    itemContainersSearchName: string;
    itemContainersLoading: boolean;
    itemContainersError: string | null;
    onItemContainersSearchInputChange: (value: string) => void;
    onItemContainersSearch: () => void;
    onItemContainersClearSearch: () => void;
    onItemContainersPreviousPage: () => void;
    onItemContainersNextPage: () => void;
};

const ITEMS_PAGE_SIZE = 12;

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

function getItemBadgeVariant(rarity?: string) {
    const normalized = (rarity ?? "").toLowerCase();

    if (normalized === "common") {
        return "outline" as const;
    }

    if (normalized === "uncommon") {
        return "secondary" as const;
    }

    if (normalized === "rare" || normalized === "epic" || normalized === "legendary") {
        return "default" as const;
    }

    return "outline" as const;
}

function getContainerTypeBadgeVariant(containerType?: string) {
    const normalized = (containerType ?? "").toLowerCase();

    if (normalized === "inventory") {
        return "default" as const;
    }

    if (normalized === "equipment") {
        return "secondary" as const;
    }

    if (normalized === "vault" || normalized === "shulker_box") {
        return "destructive" as const;
    }

    return "outline" as const;
}

function getProgressValue(processed?: number, total?: number) {
    if (!total || total <= 0) {
        return 0;
    }

    return Math.min(100, Math.max(0, ((processed ?? 0) / total) * 100));
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

function CurrentCloneSessionItemList({ items, t }: { items: CloneSessionCurrentItemDefinition[]; t: TranslationFn; }) {
    if (items.length === 0) {
        return (
            <div id="clone-game-source-current-session-items-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-items-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
                <div id={`clone-game-source-current-session-item-${item.id}`} key={item.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-item-header-${item.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-item-title-row-${item.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-item-name-${item.id}`} className="font-medium">
                                {item.name}
                            </p>
                            <Badge id={`clone-game-source-current-session-item-rarity-${item.id}`} variant={getItemBadgeVariant(item.rarity)}>
                                {item.rarity || t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-item-code-${item.id}`} className="font-mono text-xs text-muted-foreground">
                            {item.item_code}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-item-meta-${item.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-item-category-${item.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-category-label-${item.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemCategoryLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-category-value-${item.id}`} className="text-foreground">
                                {item.category || t("common.unknown")}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CurrentCloneSessionItemContainerList({ itemContainers, t }: { itemContainers: CloneSessionCurrentItemContainer[]; t: TranslationFn; }) {
    if (itemContainers.length === 0) {
        return (
            <div id="clone-game-source-current-session-item-containers-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-item-containers-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itemContainers.map((container) => (
                <div id={`clone-game-source-current-session-item-container-${container.id}`} key={container.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-item-container-header-${container.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-item-container-title-row-${container.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-item-container-name-${container.id}`} className="font-medium">
                                {container.name}
                            </p>
                            <Badge id={`clone-game-source-current-session-item-container-type-${container.id}`} variant={getContainerTypeBadgeVariant(container.container_type)}>
                                {container.container_type || t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-item-container-code-${container.id}`} className="font-mono text-xs text-muted-foreground">
                            {container.code_name}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-item-container-meta-${container.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-item-container-grid-${container.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-container-grid-label-${container.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemContainerGridLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-container-grid-value-${container.id}`} className="text-foreground">
                                {container.grid_cols} x {container.grid_rows}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-item-container-portable-${container.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-container-portable-label-${container.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemContainerPortableLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-container-portable-value-${container.id}`} className="text-foreground">
                                {container.is_portable ? t("common.yes") : t("common.no")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-item-container-instanced-${container.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-container-instanced-label-${container.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemContainerInstancedLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-container-instanced-value-${container.id}`} className="text-foreground">
                                {container.instanced_per_item ? t("common.yes") : t("common.no")}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CurrentCloneSessionProgressTabs({
    t,
    currentSession,
    activeProgressTab,
    onActiveProgressTabChange,
    currentSessionProgressEntries,
    currentSessionEstimatedCost,
    currentSessionWarnings,
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
}: CurrentCloneSessionProgressTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
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

    return (
        <CardContent id="clone-game-source-current-session-content" className="space-y-4 text-sm">
            <div id="clone-game-source-current-session-meta" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
                <div id="clone-game-source-current-session-meta-left" className="space-y-3">
                    <div id="clone-game-source-current-session-phase" className="space-y-1">
                        <p id="clone-game-source-current-session-phase-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionPhaseLabel")}
                        </p>
                        <p id="clone-game-source-current-session-phase-value" className="break-all font-medium">
                            {formatTechnicalLabel(currentSession.current_phase) || t("common.unknown")}
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
                                {currentSessionEstimatedCost.amount ?? 0} {currentSessionEstimatedCost.currency || t("common.unknown")}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            {currentSessionWarnings.length > 0 ? (
                <div id="clone-game-source-current-session-warnings" className="space-y-2 border-t pt-4">
                    <p id="clone-game-source-current-session-warnings-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("cloneGame.sourceGameCurrentSessionWarningsLabel")}
                    </p>
                    <div id="clone-game-source-current-session-warnings-list" className="space-y-2">
                        {currentSessionWarnings.map((warning, index) => (
                            <div
                                id={`clone-game-source-current-session-warning-${toKebabIdSegment(warning.field)}-${index}`}
                                key={`${warning.field ?? "warning"}-${index}`}
                                className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground"
                            >
                                <p id={`clone-game-source-current-session-warning-field-${toKebabIdSegment(warning.field)}-${index}`} className="font-medium text-foreground">
                                    {formatTechnicalLabel(warning.field) || t("common.unknown")}
                                </p>
                                <p id={`clone-game-source-current-session-warning-message-${toKebabIdSegment(warning.field)}-${index}`}>{warning.message || t("common.unknown")}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

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
                                            {formatTechnicalLabel(phaseKey)}
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
                                                </div>
                                            </div>
                                        </div>

                                        {itemsLoading ? (
                                            <div id="clone-game-source-current-session-item-definitions-loading" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                {Array.from({ length: 3 }).map((_, index) => (
                                                    <div id={`clone-game-source-current-session-item-skeleton-${index}`} key={`clone-game-source-current-session-item-skeleton-${index}`} className="rounded-md border bg-background px-3 py-2">
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-title-${index}`} className="h-4 w-2/3" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-code-${index}`} className="mt-2 h-3 w-1/2" />
                                                        <Skeleton id={`clone-game-source-current-session-item-skeleton-meta-${index}`} className="mt-3 h-3 w-3/4" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : itemsError ? (
                                            <div id="clone-game-source-current-session-item-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                                {itemsError}
                                            </div>
                                        ) : (
                                            <CurrentCloneSessionItemList items={items} t={t} />
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
                                                </div>
                                            </div>
                                        </div>

                                        {itemContainersLoading ? (
                                            <div id="clone-game-source-current-session-item-containers-loading" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                {Array.from({ length: 3 }).map((_, index) => (
                                                    <div id={`clone-game-source-current-session-item-container-skeleton-${index}`} key={`clone-game-source-current-session-item-container-skeleton-${index}`} className="rounded-md border bg-background px-3 py-2">
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-title-${index}`} className="h-4 w-2/3" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-code-${index}`} className="mt-2 h-3 w-1/2" />
                                                        <Skeleton id={`clone-game-source-current-session-item-container-skeleton-meta-${index}`} className="mt-3 h-3 w-3/4" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : itemContainersError ? (
                                            <div id="clone-game-source-current-session-item-containers-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                                {itemContainersError}
                                            </div>
                                        ) : (
                                            <CurrentCloneSessionItemContainerList itemContainers={itemContainers} t={t} />
                                        )}
                                    </div>
                                ) : null}
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            ) : null}
        </CardContent>
    );
}
