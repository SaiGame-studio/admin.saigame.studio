"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CloneSessionCurrentItemTag } from "@/lib/game-api";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionItemTagsTabProps = {
    t: TranslationFn;
    itemTags: CloneSessionCurrentItemTag[];
    itemTagsTotal: number;
    itemTagsOffset: number;
    itemTagsSearchInput: string;
    itemTagsSearchName: string;
    itemTagsLoading: boolean;
    itemTagsError: string | null;
    onItemTagsSearchInputChange: (value: string) => void;
    onItemTagsSearch: () => void;
    onItemTagsClearSearch: () => void;
    onItemTagsPreviousPage: () => void;
    onItemTagsNextPage: () => void;
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

function getTagColorStyle(color?: string) {
    if (!color) {
        return undefined;
    }

    return { backgroundColor: color };
}

function CurrentCloneSessionItemTagList({ itemTags, t }: { itemTags: CloneSessionCurrentItemTag[]; t: TranslationFn; }) {
    if (itemTags.length === 0) {
        return (
            <div id="clone-game-source-current-session-item-tags-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-item-tags-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {itemTags.map((itemTag) => (
                <div id={`clone-game-source-current-session-item-tag-${itemTag.id}`} key={itemTag.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-item-tag-header-${itemTag.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-item-tag-title-row-${itemTag.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-item-tag-label-${itemTag.id}`} className="font-medium">
                                {itemTag.label}
                            </p>
                            <Badge id={`clone-game-source-current-session-item-tag-count-${itemTag.id}`} variant="secondary">
                                {typeof itemTag.item_count === "number" ? itemTag.item_count.toLocaleString("en-US") : t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-item-tag-key-${itemTag.id}`} className="font-mono text-xs text-muted-foreground">
                            {itemTag.tag_key}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-item-tag-meta-${itemTag.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-item-tag-color-${itemTag.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-tag-color-label-${itemTag.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemTagsColorLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-tag-color-value-${itemTag.id}`} className="flex items-center gap-2 text-foreground">
                                <span id={`clone-game-source-current-session-item-tag-color-swatch-${itemTag.id}`} className="h-3 w-3 rounded-full border border-border" style={getTagColorStyle(itemTag.color)} />
                                <span id={`clone-game-source-current-session-item-tag-color-text-${itemTag.id}`}>
                                    {itemTag.color || t("common.unknown")}
                                </span>
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-item-tag-usage-${itemTag.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-item-tag-usage-label-${itemTag.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionItemTagsUsageLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-item-tag-usage-value-${itemTag.id}`} className="text-foreground">
                                {typeof itemTag.item_count === "number" ? itemTag.item_count.toLocaleString("en-US") : t("common.unknown")}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CurrentCloneSessionItemTagsTab({
    t,
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
}: CurrentCloneSessionItemTagsTabProps) {
    const currentPage = itemTagsTotal > 0 ? Math.floor(itemTagsOffset / ITEMS_PAGE_SIZE) + 1 : 0;
    const totalPages = itemTagsTotal > 0 ? Math.ceil(itemTagsTotal / ITEMS_PAGE_SIZE) : 0;
    const start = itemTagsTotal > 0 ? itemTagsOffset + 1 : 0;
    const end = itemTagsTotal > 0 ? Math.min(itemTagsOffset + ITEMS_PAGE_SIZE, itemTagsTotal) : 0;
    const hasPreviousPage = itemTagsOffset > 0;
    const hasNextPage = itemTagsOffset + ITEMS_PAGE_SIZE < itemTagsTotal;

    return (
        <div id="clone-game-source-current-session-item-tags-section" className="space-y-3">
            <div id="clone-game-source-current-session-item-tags-controls" className="space-y-2">
                <div id="clone-game-source-current-session-item-tags-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-item-tags-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-item-tags-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-item-tags-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-item-tags-search-input"
                                value={itemTagsSearchInput}
                                onChange={(event) => onItemTagsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onItemTagsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionItemTagsSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {itemTagsSearchInput || itemTagsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-item-tags-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onItemTagsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-item-tags-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-item-tags-search-btn"
                        type="button"
                        onClick={onItemTagsSearch}
                        disabled={itemTagsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-item-tags-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-item-tags-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-item-tags-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onItemTagsPreviousPage}
                                disabled={!hasPreviousPage || itemTagsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-item-tags-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-item-tags-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-item-tags-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentPage, totalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-item-tags-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onItemTagsNextPage}
                                disabled={!hasNextPage || itemTagsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-item-tags-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-item-tags-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-item-tags-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(start, end, itemTagsTotal)}
                        </p>
                    </div>
                </div>
            </div>

            {itemTagsLoading ? (
                <div id="clone-game-source-current-session-item-tags-loading" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-item-tag-skeleton-${index}`} key={`clone-game-source-current-session-item-tag-skeleton-${index}`} className="rounded-md border bg-background px-3 py-2">
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-title-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-key-${index}`} className="mt-2 h-3 w-1/2" />
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-meta-${index}`} className="mt-3 h-3 w-3/4" />
                        </div>
                    ))}
                </div>
            ) : itemTagsError ? (
                <div id="clone-game-source-current-session-item-tags-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {itemTagsError}
                </div>
            ) : (
                <CurrentCloneSessionItemTagList itemTags={itemTags} t={t} />
            )}
        </div>
    );
}
