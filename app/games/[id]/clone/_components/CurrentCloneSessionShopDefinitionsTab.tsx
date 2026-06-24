"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CloneSessionCurrentShopDefinition } from "@/lib/game-api";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionShopDefinitionsTabProps = {
    t: TranslationFn;
    shopDefinitions: CloneSessionCurrentShopDefinition[];
    shopDefinitionsTotal: number;
    shopDefinitionsOffset: number;
    shopDefinitionsSearchInput: string;
    shopDefinitionsSearchName: string;
    shopDefinitionsLoading: boolean;
    shopDefinitionsError: string | null;
    onShopDefinitionsSearchInputChange: (value: string) => void;
    onShopDefinitionsSearch: () => void;
    onShopDefinitionsClearSearch: () => void;
    onShopDefinitionsPreviousPage: () => void;
    onShopDefinitionsNextPage: () => void;
};

const SHOP_DEFINITIONS_PAGE_SIZE = 12;

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

function getShopTypeBadgeVariant(shopType?: string) {
    const normalized = (shopType ?? "").toLowerCase();

    if (normalized === "permanent") {
        return "default" as const;
    }

    if (normalized === "event") {
        return "secondary" as const;
    }

    return "outline" as const;
}

function CurrentCloneSessionShopDefinitionList({
    shopDefinitions,
    t,
}: {
    shopDefinitions: CloneSessionCurrentShopDefinition[];
    t: TranslationFn;
}) {
    if (shopDefinitions.length === 0) {
        return (
            <div id="clone-game-source-current-session-shop-definitions-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    return (
        <div id="clone-game-source-current-session-shop-definitions-list" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shopDefinitions.map((shop) => (
                <div id={`clone-game-source-current-session-shop-definition-${shop.id}`} key={shop.id} className="rounded-md border bg-background px-3 py-2">
                    <div id={`clone-game-source-current-session-shop-definition-header-${shop.id}`} className="space-y-1">
                        <div id={`clone-game-source-current-session-shop-definition-title-row-${shop.id}`} className="flex items-start justify-between gap-2">
                            <p id={`clone-game-source-current-session-shop-definition-name-${shop.id}`} className="font-medium">
                                {shop.name}
                            </p>
                            <Badge id={`clone-game-source-current-session-shop-definition-type-${shop.id}`} variant={getShopTypeBadgeVariant(shop.shop_type)}>
                                {shop.shop_type || t("common.unknown")}
                            </Badge>
                        </div>
                        <p id={`clone-game-source-current-session-shop-definition-key-${shop.id}`} className="font-mono text-xs text-muted-foreground">
                            {shop.shop_key || t("common.unknown")}
                        </p>
                    </div>
                    <div id={`clone-game-source-current-session-shop-definition-meta-${shop.id}`} className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div id={`clone-game-source-current-session-shop-definition-status-${shop.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-shop-definition-status-label-${shop.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionShopStatusLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-shop-definition-status-value-${shop.id}`} className="text-foreground">
                                {shop.is_active ? t("common.active") : t("common.inactive")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-shop-definition-items-${shop.id}`} className="flex items-center justify-between gap-2">
                            <span id={`clone-game-source-current-session-shop-definition-items-label-${shop.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionShopItemsLabel")}
                            </span>
                            <span id={`clone-game-source-current-session-shop-definition-items-value-${shop.id}`} className="text-foreground">
                                {typeof shop.item_count === "number" ? shop.item_count.toLocaleString("en-US") : t("common.unknown")}
                            </span>
                        </div>
                        <div id={`clone-game-source-current-session-shop-definition-description-${shop.id}`} className="space-y-1">
                            <span id={`clone-game-source-current-session-shop-definition-description-label-${shop.id}`} className="uppercase tracking-wide">
                                {t("cloneGame.sourceGameCurrentSessionShopDescriptionLabel")}
                            </span>
                            <p id={`clone-game-source-current-session-shop-definition-description-value-${shop.id}`} className="text-foreground">
                                {shop.description || t("common.unknown")}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function CurrentCloneSessionShopDefinitionsTab({
    t,
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
}: CurrentCloneSessionShopDefinitionsTabProps) {
    const currentPage = shopDefinitionsTotal > 0 ? Math.floor(shopDefinitionsOffset / SHOP_DEFINITIONS_PAGE_SIZE) + 1 : 0;
    const totalPages = shopDefinitionsTotal > 0 ? Math.ceil(shopDefinitionsTotal / SHOP_DEFINITIONS_PAGE_SIZE) : 0;
    const start = shopDefinitionsTotal > 0 ? shopDefinitionsOffset + 1 : 0;
    const end = shopDefinitionsTotal > 0 ? Math.min(shopDefinitionsOffset + SHOP_DEFINITIONS_PAGE_SIZE, shopDefinitionsTotal) : 0;
    const hasPreviousPage = shopDefinitionsOffset > 0;
    const hasNextPage = shopDefinitionsOffset + SHOP_DEFINITIONS_PAGE_SIZE < shopDefinitionsTotal;

    return (
        <div id="clone-game-source-current-session-shop-definitions-section" className="space-y-3">
            <div id="clone-game-source-current-session-shop-definitions-controls" className="space-y-2">
                <div id="clone-game-source-current-session-shop-definitions-search-row" className="flex flex-wrap items-center gap-2">
                    <div id="clone-game-source-current-session-shop-definitions-search-field" className="w-full md:w-1/2">
                        <div id="clone-game-source-current-session-shop-definitions-search-input-wrap" className="relative">
                            <Search id="clone-game-source-current-session-shop-definitions-search-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-current-session-shop-definitions-search-input"
                                value={shopDefinitionsSearchInput}
                                onChange={(event) => onShopDefinitionsSearchInputChange(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        onShopDefinitionsSearch();
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameCurrentSessionShopSearchPlaceholder")}
                                className="h-8 pl-8 pr-20 text-xs"
                                autoComplete="off"
                            />
                            {shopDefinitionsSearchInput || shopDefinitionsSearchName ? (
                                <Button
                                    id="clone-game-source-current-session-shop-definitions-clear-search-inline-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-1.5"
                                    onClick={onShopDefinitionsClearSearch}
                                >
                                    <X id="clone-game-source-current-session-shop-definitions-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        id="clone-game-source-current-session-shop-definitions-search-btn"
                        type="button"
                        onClick={onShopDefinitionsSearch}
                        disabled={shopDefinitionsLoading}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                    >
                        {t("common.search")}
                    </Button>
                    <div id="clone-game-source-current-session-shop-definitions-pagination" className="ml-auto flex items-center gap-2">
                        <div id="clone-game-source-current-session-shop-definitions-pagination-actions" className="flex items-center gap-1">
                            <Button
                                id="clone-game-source-current-session-shop-definitions-pagination-prev"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onShopDefinitionsPreviousPage}
                                disabled={!hasPreviousPage || shopDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronLeft id="clone-game-source-current-session-shop-definitions-pagination-prev-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-shop-definitions-pagination-prev-label" className="sr-only">
                                    {t("common.previous")}
                                </span>
                            </Button>
                            <p id="clone-game-source-current-session-shop-definitions-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                {formatPage(currentPage, totalPages)}
                            </p>
                            <Button
                                id="clone-game-source-current-session-shop-definitions-pagination-next"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onShopDefinitionsNextPage}
                                disabled={!hasNextPage || shopDefinitionsLoading}
                                className="h-7 w-7 p-0"
                            >
                                <ChevronRight id="clone-game-source-current-session-shop-definitions-pagination-next-icon" className="h-3.5 w-3.5" />
                                <span id="clone-game-source-current-session-shop-definitions-pagination-next-label" className="sr-only">
                                    {t("common.next")}
                                </span>
                            </Button>
                        </div>
                        <p id="clone-game-source-current-session-shop-definitions-pagination-summary" className="text-[10px] text-muted-foreground tabular-nums">
                            {formatRange(start, end, shopDefinitionsTotal)}
                        </p>
                    </div>
                </div>
            </div>

            {shopDefinitionsLoading ? (
                <div id="clone-game-source-current-session-shop-definitions-loading" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-shop-definition-skeleton-${index}`} key={`clone-game-source-current-session-shop-definition-skeleton-${index}`} className="rounded-md border bg-background px-3 py-2">
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-title-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-key-${index}`} className="mt-2 h-3 w-1/2" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-meta-${index}`} className="mt-3 h-3 w-3/4" />
                        </div>
                    ))}
                </div>
            ) : shopDefinitionsError ? (
                <div id="clone-game-source-current-session-shop-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {shopDefinitionsError}
                </div>
            ) : (
                <CurrentCloneSessionShopDefinitionList shopDefinitions={shopDefinitions} t={t} />
            )}
        </div>
    );
}
