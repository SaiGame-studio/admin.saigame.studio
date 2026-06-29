"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CloneSessionManualOverwriteButton } from "./CloneSessionManualOverwriteButton";
import type { CloneSessionCurrentShopDefinition } from "@/lib/game-api";
import { CloneSessionIgnoreSwitch } from "./CloneSessionIgnoreSwitch";

type TranslationFn = (key: string) => string;

type CurrentCloneSessionShopDefinitionsTabProps = {
    t: TranslationFn;
    shopDefinitions: CloneSessionCurrentShopDefinition[];
    sessionId?: string;
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
    getManualOverwriteTargetId: (contentType: "shop_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
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

function isIgnored(value: { ignored?: boolean; is_ignored?: boolean }) {
    return Boolean(value.ignored ?? value.is_ignored);
}

function CurrentCloneSessionShopDefinitionList({
    shopDefinitions,
    sessionId,
    t,
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
}: {
    shopDefinitions: CloneSessionCurrentShopDefinition[];
    sessionId?: string;
    t: TranslationFn;
    getManualOverwriteTargetId: (contentType: "shop_definition", sourceId: string) => string | null;
    onManualOverwriteSuccess: () => Promise<void>;
}) {
    if (shopDefinitions.length === 0) {
        return (
            <div id="clone-game-source-current-session-shop-definitions-empty" className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                {t("common.noData")}
            </div>
        );
    }

    const overwriteTargetIds = new Map(shopDefinitions.map((shop) => [shop.id, getManualOverwriteTargetId("shop_definition", shop.id)]));
    const hasOverwriteColumn = Array.from(overwriteTargetIds.values()).some(Boolean);

    return (
        <div id="clone-game-source-current-session-shop-definitions-table-wrap" className="overflow-x-auto rounded-md border bg-background">
            <table id="clone-game-source-current-session-shop-definitions-table" className="w-full caption-bottom text-sm">
                <thead id="clone-game-source-current-session-shop-definitions-table-head" className="border-b bg-muted/40">
                    <tr id="clone-game-source-current-session-shop-definitions-table-head-row">
                        <th id="clone-game-source-current-session-shop-definitions-table-name-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionNameLabel")}
                        </th>
                        <th id="clone-game-source-current-session-shop-definitions-table-key-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionShopKeyLabel")}
                        </th>
                        <th id="clone-game-source-current-session-shop-definitions-table-type-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionShopTypeLabel")}
                        </th>
                        <th id="clone-game-source-current-session-shop-definitions-table-status-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionShopStatusLabel")}
                        </th>
                        <th id="clone-game-source-current-session-shop-definitions-table-items-head" className="h-9 px-3 text-right align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionShopItemsLabel")}
                        </th>
                        <th id="clone-game-source-current-session-shop-definitions-table-description-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionShopDescriptionLabel")}
                        </th>
                        <th id="clone-game-source-current-session-shop-definitions-table-ignore-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionIgnoreLabel")}
                        </th>
                        {hasOverwriteColumn ? (
                            <th id="clone-game-source-current-session-shop-definitions-table-overwrite-head" className="h-9 px-3 text-left align-middle text-xs font-medium text-amber-300">
                                {t("cloneGame.sourceGameCurrentSessionOverwriteAction")}
                            </th>
                        ) : null}
                    </tr>
                </thead>
                <tbody id="clone-game-source-current-session-shop-definitions-table-body">
                    {shopDefinitions.map((shop) => {
                        const overwriteTargetId = overwriteTargetIds.get(shop.id) ?? null;

                        return (
                        <tr id={`clone-game-source-current-session-shop-definition-row-${shop.id}`} key={shop.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                            <td id={`clone-game-source-current-session-shop-definition-name-cell-${shop.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-shop-definition-name-${shop.id}`} className="font-medium">
                                    {shop.name}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-shop-definition-key-cell-${shop.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-shop-definition-key-${shop.id}`} className="font-mono text-xs text-muted-foreground">
                                    {shop.shop_key || t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-shop-definition-type-cell-${shop.id}`} className="px-3 py-2 align-middle">
                                <Badge id={`clone-game-source-current-session-shop-definition-type-${shop.id}`} variant={getShopTypeBadgeVariant(shop.shop_type)}>
                                    {shop.shop_type || t("common.unknown")}
                                </Badge>
                            </td>
                            <td id={`clone-game-source-current-session-shop-definition-status-cell-${shop.id}`} className="px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-shop-definition-status-value-${shop.id}`}>
                                    {shop.is_active ? t("common.active") : t("common.inactive")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-shop-definition-items-cell-${shop.id}`} className="px-3 py-2 text-right align-middle tabular-nums">
                                <span id={`clone-game-source-current-session-shop-definition-items-value-${shop.id}`}>
                                    {typeof shop.item_count === "number" ? shop.item_count.toLocaleString("en-US") : t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-shop-definition-description-cell-${shop.id}`} className="max-w-[320px] px-3 py-2 align-middle">
                                <span id={`clone-game-source-current-session-shop-definition-description-value-${shop.id}`} className="line-clamp-2 text-muted-foreground">
                                    {shop.description || t("common.unknown")}
                                </span>
                            </td>
                            <td id={`clone-game-source-current-session-shop-definition-ignore-cell-${shop.id}`} className="px-3 py-2 align-middle">
                                <CloneSessionIgnoreSwitch id={`clone-game-source-current-session-shop-definition-ignore-${shop.id}`} sessionId={sessionId} contentType="shop_definition" sourceId={shop.id} initialIgnored={isIgnored(shop)} t={t} />
                            </td>
                            {hasOverwriteColumn ? (
                                <td id={`clone-game-source-current-session-shop-definition-overwrite-cell-${shop.id}`} className="px-3 py-2 align-middle">
                                    <CloneSessionManualOverwriteButton
                                        id={`clone-game-source-current-session-shop-definition-overwrite-${shop.id}`}
                                        sessionId={sessionId}
                                        contentType="shop_definition"
                                        sourceId={shop.id}
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

export function CurrentCloneSessionShopDefinitionsTab({
    t,
    shopDefinitions,
    sessionId,
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
    getManualOverwriteTargetId,
    onManualOverwriteSuccess,
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
                <div id="clone-game-source-current-session-shop-definitions-loading" className="overflow-x-auto rounded-md border bg-background">
                    <div id="clone-game-source-current-session-shop-definitions-loading-header" className="grid min-w-[980px] grid-cols-[1.4fr_1.2fr_0.8fr_0.7fr_0.7fr_1.8fr_0.9fr] gap-3 border-b bg-muted/40 px-3 py-2">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-head-${index}`} key={`clone-game-source-current-session-shop-definition-skeleton-head-${index}`} className="h-4 w-20" />
                        ))}
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div id={`clone-game-source-current-session-shop-definition-skeleton-row-${index}`} key={`clone-game-source-current-session-shop-definition-skeleton-row-${index}`} className="grid min-w-[980px] grid-cols-[1.4fr_1.2fr_0.8fr_0.7fr_0.7fr_1.8fr_0.9fr] gap-3 border-b px-3 py-3 last:border-0">
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-name-${index}`} className="h-4 w-2/3" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-key-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-type-${index}`} className="h-4 w-16" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-status-${index}`} className="h-4 w-14" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-items-${index}`} className="ml-auto h-4 w-10" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-description-${index}`} className="h-4 w-3/4" />
                            <Skeleton id={`clone-game-source-current-session-shop-definition-skeleton-overwrite-${index}`} className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : shopDefinitionsError ? (
                <div id="clone-game-source-current-session-shop-definitions-error" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {shopDefinitionsError}
                </div>
            ) : (
                <CurrentCloneSessionShopDefinitionList shopDefinitions={shopDefinitions} sessionId={sessionId} t={t} getManualOverwriteTargetId={getManualOverwriteTargetId} onManualOverwriteSuccess={onManualOverwriteSuccess} />
            )}
        </div>
    );
}
