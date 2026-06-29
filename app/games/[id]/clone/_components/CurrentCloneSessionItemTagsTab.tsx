"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentItemTag } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionItemTagsTabProps = {
    t: TranslationFn;
    itemTags: CloneSessionCurrentItemTag[];
    sessionId?: string;
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
    getManualOverwriteTargetId: (contentType: "item_tag", sourceId: string) => string | null;
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

function getTagColorStyle(color?: string) {
    if (!color) {
        return undefined;
    }

    return { backgroundColor: color };
}

function isIgnored(value: { ignored?: boolean; is_ignored?: boolean }) {
    return Boolean(value.ignored ?? value.is_ignored);
}

function CurrentCloneSessionItemTagList({
    itemTags,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    itemTags: CloneSessionCurrentItemTag[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "item_tag", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (itemTags.length === 0) {
        return (
            <div id="clone-game-source-current-session-item-tags-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(itemTags.map((itemTag) => [itemTag.id, getManualOverwriteTargetId("item_tag", itemTag.id)]));
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-item-tags-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-item-tags-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-item-tags-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-item-tags-table-head-row">
                        <th id="clone-game-source-current-session-item-tags-table-label-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemTagsLabelLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-tags-table-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemTagsKeyLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-tags-table-color-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemTagsColorLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-tags-table-usage-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionItemTagsUsageLabel")}
                        </th>
                        <th id="clone-game-source-current-session-item-tags-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-item-tags-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-item-tags-table-body">
                    {itemTags.map((itemTag) => {
                        const overwriteTargetId = overwriteTargetIds.get(itemTag.id) ?? null;

                        return (
                        <tr id={`clone-game-source-current-session-item-tag-row-${itemTag.id}`} key={itemTag.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-item-tag-label-cell-${itemTag.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-tag-label-${itemTag.id}`} className="font-medium">
                                    {itemTag.label}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-tag-key-cell-${itemTag.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-tag-key-${itemTag.id}`} className="font-mono text-xs text-muted-foreground">
                                    {itemTag.tag_key}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-tag-color-cell-${itemTag.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-item-tag-color-value-${itemTag.id}`} className="inline-flex items-center gap-2">
                                    <span id={`clone-game-source-current-session-item-tag-color-swatch-${itemTag.id}`} className="h-3 w-3 rounded-full border border-border" style={getTagColorStyle(itemTag.color)} />
                                    <span id={`clone-game-source-current-session-item-tag-color-text-${itemTag.id}`} className="font-mono text-xs text-muted-foreground">
                                        {itemTag.color || t("common.unknown")}
                                    </span>
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-tag-usage-cell-${itemTag.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                <span id={`clone-game-source-current-session-item-tag-usage-value-${itemTag.id}`}>
                                    {typeof itemTag.item_count === "number" ? itemTag.item_count.toLocaleString("en-US") : t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-item-tag-ignore-cell-${itemTag.id}`} className="px-3 py-2 align-middle">
                                <CloneSessionIgnoreSwitch id={`clone-game-source-current-session-item-tag-ignore-${itemTag.id}`} sessionId={sessionId} contentType="item_tag" sourceId={itemTag.id} initialIgnored={isIgnored(itemTag)} t={t} />
                            </td>
                            {hasOverwriteColumn ? (
                                <td id={`clone-game-source-current-session-item-tag-overwrite-cell-${itemTag.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionManualOverwriteButton
                                        id={`clone-game-source-current-session-item-tag-overwrite-${itemTag.id}`}
                                        sessionId={sessionId}
                                        contentType="item_tag"
                                        sourceId={itemTag.id}
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

export function CurrentCloneSessionItemTagsTab({
    t,
    itemTags,
    sessionId,
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
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
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
                <div id="clone-game-source-current-session-item-tags-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-item-tags-loading-header" className="grid min-w-[760px] grid-cols-[1.4fr_1.4fr_1fr_0.7fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-head-${index}`} key={`clone-game-source-current-session-item-tag-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-item-tag-skeleton-row-${index}`} key={`clone-game-source-current-session-item-tag-skeleton-row-${index}`} className="grid min-w-[760px] grid-cols-[1.4fr_1.4fr_1fr_0.7fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-label-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-color-${index}`} className="h-4 w-20" />
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-count-${index}`} className="ml-auto h-4 w-12" />
                            <Skeleton id={`clone-game-source-current-session-item-tag-skeleton-overwrite-${index}`} className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : itemTagsError ? (
                <div id="clone-game-source-current-session-item-tags-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {itemTagsError}
                </div>
            ) : (
                <CurrentCloneSessionItemTagList itemTags={itemTags} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
