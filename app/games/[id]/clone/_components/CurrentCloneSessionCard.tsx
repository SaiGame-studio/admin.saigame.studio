"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/CopyButton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { ApiError } from "@/lib/api-client";
import {
    getCurrentCloneSessionItems,
    type CloneSessionCurrentItemDefinition,
    type CloneSessionSnapshot,
} from "@/lib/game-api";

type TranslationFn = (key: string) => string;
const ITEMS_PAGE_SIZE = 12;

type CurrentCloneSessionCardProps = {
    targetGameId: string;
    currentSession: CloneSessionSnapshot | null;
    currentSessionLoading: boolean;
    currentSessionError: string | null;
    deletingCurrentSession: boolean;
    onRetry: () => void;
    onDelete: () => void;
};

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

    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "unknown";
}

function getCloneSessionBadgeVariant(status?: string) {
    if (status === "running" || status === "created") {
        return "default" as const;
    }

    if (status === "blocked" || status === "failed") {
        return "destructive" as const;
    }

    if (status === "completed") {
        return "secondary" as const;
    }

    return "outline" as const;
}

function getBooleanBadgeVariant(value?: boolean) {
    if (value === undefined) {
        return "outline" as const;
    }

    return value ? "default" as const : "secondary" as const;
}

function getCloneSessionErrorMessage(error: unknown, t: TranslationFn) {
    const rawMessage = error instanceof ApiError
        ? (error.data?.message || error.data?.error || error.message)
        : error instanceof Error
            ? error.message
            : "";

    const normalizedMessage = rawMessage.trim().toLowerCase();

    if (normalizedMessage === "insufficient balance") {
        return t("cloneGame.sourceGameCloneProgressInsufficientBalance");
    }

    return rawMessage || t("common.error");
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

function CurrentCloneSessionLoadingCard() {
    return (
        <Card id="clone-game-source-current-session-loading-card" className="border-primary/30">
            <CardHeader id="clone-game-source-current-session-loading-header" className="space-y-2">
                <Skeleton id="clone-game-source-current-session-loading-title" className="h-5 w-56" />
                <Skeleton id="clone-game-source-current-session-loading-description" className="h-4 w-3/4" />
            </CardHeader>
            <CardContent id="clone-game-source-current-session-loading-content" className="space-y-3">
                <Skeleton id="clone-game-source-current-session-loading-line-1" className="h-4 w-full" />
                <Skeleton id="clone-game-source-current-session-loading-line-2" className="h-4 w-2/3" />
            </CardContent>
        </Card>
    );
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
                <div
                    id={`clone-game-source-current-session-item-${item.id}`}
                    key={item.id}
                    className="rounded-md border bg-background px-3 py-2"
                >
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

function formatItemsRange(start: number, end: number, total: number) {
    if (total <= 0) {
        return "0 / 0";
    }

    return `${start.toLocaleString("en-US")} - ${end.toLocaleString("en-US")}/${total.toLocaleString("en-US")}`;
}

function formatItemsPage(currentPage: number, totalPages: number) {
    if (totalPages <= 0) {
        return "0/0";
    }

    return `${currentPage.toLocaleString("en-US")}/${totalPages.toLocaleString("en-US")}`;
}

function getProgressValue(processed?: number, total?: number) {
    if (!total || total <= 0) {
        return 0;
    }

    return Math.min(100, Math.max(0, ((processed ?? 0) / total) * 100));
}

export function CurrentCloneSessionCard({
    targetGameId,
    currentSession,
    currentSessionLoading,
    currentSessionError,
    deletingCurrentSession,
    onRetry,
    onDelete,
}: CurrentCloneSessionCardProps) {
    const { t } = useTranslation();
    const [activeProgressTab, setActiveProgressTab] = useState<string | null>(null);
    const [items, setItems] = useState<CloneSessionCurrentItemDefinition[]>([]);
    const [itemsTotal, setItemsTotal] = useState(0);
    const [itemsOffset, setItemsOffset] = useState(0);
    const [itemsSearchInput, setItemsSearchInput] = useState("");
    const [itemsSearchName, setItemsSearchName] = useState("");
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);
    const currentSessionProgressEntries = Object.entries(currentSession?.progress ?? {});
    const currentSessionEstimatedCost = currentSession?.last_run_response?.estimated_clone_cost;
    const currentSessionWarnings = currentSession?.last_run_response?.warnings ?? [];
    const currentItemsCurrentPage = itemsTotal > 0 ? Math.floor(itemsOffset / ITEMS_PAGE_SIZE) + 1 : 0;
    const currentItemsTotalPages = itemsTotal > 0 ? Math.ceil(itemsTotal / ITEMS_PAGE_SIZE) : 0;
    const currentItemsStart = itemsTotal > 0 ? itemsOffset + 1 : 0;
    const currentItemsEnd = itemsTotal > 0 ? Math.min(itemsOffset + ITEMS_PAGE_SIZE, itemsTotal) : 0;
    const hasPreviousItemsPage = itemsOffset > 0;
    const hasNextItemsPage = itemsOffset + ITEMS_PAGE_SIZE < itemsTotal;

    useEffect(() => {
        if (currentSessionProgressEntries.length === 0) {
            setActiveProgressTab(null);
            return;
        }

        setActiveProgressTab((current) => (current && currentSessionProgressEntries.some(([phaseKey]) => phaseKey === current) ? current : currentSessionProgressEntries[0]?.[0] ?? null));
    }, [currentSessionProgressEntries]);

    useEffect(() => {
        if (!currentSession || activeProgressTab !== "item_definitions") {
            return;
        }

        let cancelled = false;

        const loadItems = async () => {
            setItemsLoading(true);
            setItemsError(null);

            try {
                const response = await getCurrentCloneSessionItems(targetGameId, {
                    name: itemsSearchName || undefined,
                    limit: ITEMS_PAGE_SIZE,
                    offset: itemsOffset,
                });

                if (cancelled) {
                    return;
                }

                setItems(Array.isArray(response.items) ? response.items : []);
                setItemsTotal(Number(response.total ?? 0));
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setItems([]);
                setItemsTotal(0);
                setItemsError(getCloneSessionErrorMessage(error, t));
            } finally {
                if (!cancelled) {
                    setItemsLoading(false);
                }
            }
        };

        void loadItems();

        return () => {
            cancelled = true;
        };
    }, [activeProgressTab, currentSession, itemsOffset, itemsSearchName, targetGameId, t]);

    const handleSearchItems = () => {
        setItemsOffset(0);
        setItemsSearchName(itemsSearchInput.trim());
    };

    const handleClearItemsSearch = () => {
        setItemsSearchInput("");
        setItemsSearchName("");
        setItemsOffset(0);
    };

    const handlePreviousItemsPage = () => {
        setItemsOffset((current) => Math.max(0, current - ITEMS_PAGE_SIZE));
    };

    const handleNextItemsPage = () => {
        setItemsOffset((current) => current + ITEMS_PAGE_SIZE);
    };

    if (currentSessionLoading) {
        return <CurrentCloneSessionLoadingCard />;
    }

    if (currentSessionError) {
        return (
            <Card id="clone-game-source-current-session-error-card" className="border-destructive">
                <CardHeader id="clone-game-source-current-session-error-header">
                    <CardTitle id="clone-game-source-current-session-error-title">{t("common.error")}</CardTitle>
                    <CardDescription id="clone-game-source-current-session-error-description">{currentSessionError}</CardDescription>
                </CardHeader>
                <CardFooter id="clone-game-source-current-session-error-footer" className="flex flex-wrap gap-2">
                    <Button id="clone-game-source-current-session-error-retry-btn" type="button" variant="outline" onClick={onRetry}>
                        {t("common.retry")}
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (!currentSession) {
        return null;
    }

    return (
        <Card id="clone-game-source-current-session-card" className="border-primary/40 bg-primary/5">
            <CardHeader id="clone-game-source-current-session-header" className="space-y-3">
                <div id="clone-game-source-current-session-title-row" className="flex flex-wrap items-start justify-between gap-3">
                    <div id="clone-game-source-current-session-title-copy" className="space-y-1">
                        <CardTitle id="clone-game-source-current-session-title" className="text-sm uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameCurrentSessionTitle")}
                        </CardTitle>
                        <CardDescription id="clone-game-source-current-session-description">
                            {currentSession.message || t("cloneGame.sourceGameCurrentSessionActiveDesc")}
                        </CardDescription>
                    </div>
                    <div id="clone-game-source-current-session-top-right" className="flex flex-col items-end gap-2 self-start">
                        <div id="clone-game-source-current-session-session-id-wrap" className="flex items-center gap-1">
                            <p
                                id="clone-game-source-current-session-session-id-text"
                                className="max-w-[220px] truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
                            >
                                {currentSession.session_id || t("common.unknown")}
                            </p>
                            {currentSession.session_id ? (
                                <CopyButton
                                    id="clone-game-source-current-session-session-id-copy-btn"
                                    iconId="clone-game-source-current-session-session-id-copy-icon"
                                    text={currentSession.session_id}
                                    size="h-3 w-3"
                                    className="ml-0"
                                />
                            ) : null}
                        </div>
                        <Badge
                            id="clone-game-source-current-session-status-badge"
                            variant={getCloneSessionBadgeVariant(currentSession.status)}
                        >
                            {formatTechnicalLabel(currentSession.status) || t("common.unknown")}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
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
                                variant={getBooleanBadgeVariant(currentSession.same_studio)}
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
                                    {currentSessionEstimatedCost.amount ?? 0} {currentSessionEstimatedCost.currency === "sGem" ? "💎 " : ""}{currentSessionEstimatedCost.currency || t("common.unknown")}
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
                        <Tabs id="clone-game-source-current-session-progress-tabs" value={activeProgressTab ?? currentSessionProgressEntries[0]?.[0] ?? ""} onValueChange={setActiveProgressTab} className="w-full">
                            <div id="clone-game-source-current-session-progress-tabs-scroll" className="overflow-x-auto">
                                <TabsList id="clone-game-source-current-session-progress-tabs-list" className="mb-3 inline-flex min-w-max">
                                    {currentSessionProgressEntries.map(([phaseKey], index) => (
                                        <TabsTrigger
                                            id={`clone-game-source-current-session-progress-tab-trigger-${toKebabIdSegment(phaseKey)}`}
                                            key={phaseKey}
                                            value={phaseKey}
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
                            {currentSessionProgressEntries.map(([phaseKey, progress], index) => (
                                <TabsContent
                                    id={`clone-game-source-current-session-progress-tab-content-${toKebabIdSegment(phaseKey)}`}
                                    key={phaseKey}
                                    value={phaseKey}
                                    className="mt-0 space-y-3"
                                >
                                    <div
                                        id={`clone-game-source-current-session-progress-item-${toKebabIdSegment(phaseKey)}`}
                                        className={phaseKey === "item_definitions" ? "space-y-2" : "rounded-md border bg-background px-3 py-2"}
                                    >
                                        {phaseKey !== "item_definitions" ? (
                                            <div id={`clone-game-source-current-session-progress-item-header-${toKebabIdSegment(phaseKey)}`} className="flex items-center justify-between gap-2">
                                                <p id={`clone-game-source-current-session-progress-item-phase-${toKebabIdSegment(phaseKey)}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    {index + 1}. {formatTechnicalLabel(phaseKey)}
                                                </p>
                                                <Badge id={`clone-game-source-current-session-progress-item-badge-${toKebabIdSegment(phaseKey)}`} variant={progress.completed ? "default" : "outline"}>
                                                    {progress.completed ? t("common.completed") : t("common.pending")}
                                                </Badge>
                                            </div>
                                        ) : null}
                                        {phaseKey === "item_definitions" ? (
                                            <div id={`clone-game-source-current-session-progress-item-bar-wrap-${toKebabIdSegment(phaseKey)}`} className="relative">
                                                <Progress
                                                    id={`clone-game-source-current-session-progress-item-bar-${toKebabIdSegment(phaseKey)}`}
                                                    value={getProgressValue(progress.processed, progress.total)}
                                                    className="h-5"
                                                />
                                                <div id={`clone-game-source-current-session-progress-item-bar-overlay-${toKebabIdSegment(phaseKey)}`} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                    <p id={`clone-game-source-current-session-progress-item-bar-text-${toKebabIdSegment(phaseKey)}`} className="text-[10px] font-medium text-foreground">
                                                        {progress.processed ?? 0}/{progress.total ?? 0} ({Math.round(getProgressValue(progress.processed, progress.total))}%)
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p id={`clone-game-source-current-session-progress-item-value-${toKebabIdSegment(phaseKey)}`} className="mt-1 text-sm">
                                                {progress.processed ?? 0} / {progress.total ?? 0}
                                            </p>
                                        )}
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
                                                                onChange={(event) => setItemsSearchInput(event.target.value)}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === "Enter") {
                                                                        event.preventDefault();
                                                                        handleSearchItems();
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
                                                                    onClick={handleClearItemsSearch}
                                                                >
                                                                    <X id="clone-game-source-current-session-item-definitions-clear-search-inline-icon" className="h-3.5 w-3.5" />
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        id="clone-game-source-current-session-item-definitions-search-btn"
                                                        type="button"
                                                        onClick={handleSearchItems}
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
                                                                onClick={handlePreviousItemsPage}
                                                                disabled={!hasPreviousItemsPage || itemsLoading}
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                <ChevronLeft id="clone-game-source-current-session-item-definitions-pagination-prev-icon" className="h-3.5 w-3.5" />
                                                                <span id="clone-game-source-current-session-item-definitions-pagination-prev-label" className="sr-only">
                                                                    {t("common.previous")}
                                                                </span>
                                                            </Button>
                                                            <p id="clone-game-source-current-session-item-definitions-pagination-page" className="min-w-8 text-center text-[10px] text-muted-foreground tabular-nums">
                                                                {formatItemsPage(currentItemsCurrentPage, currentItemsTotalPages)}
                                                            </p>
                                                            <Button
                                                                id="clone-game-source-current-session-item-definitions-pagination-next"
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleNextItemsPage}
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
                                                            {formatItemsRange(currentItemsStart, currentItemsEnd, itemsTotal)}
                                                        </p>
                                                    </div>
                                            </div>
                                        </div>

                                            {itemsLoading ? (
                                                <div id="clone-game-source-current-session-item-definitions-loading" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                    {Array.from({ length: 3 }).map((_, index) => (
                                                        <div
                                                            id={`clone-game-source-current-session-item-skeleton-${index}`}
                                                            key={`clone-game-source-current-session-item-skeleton-${index}`}
                                                            className="rounded-md border bg-background px-3 py-2"
                                                        >
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
                                    ) : null}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                ) : null}
            </CardContent>
            <CardFooter id="clone-game-source-current-session-footer" className="flex flex-wrap items-center justify-end gap-2">
                <Button
                    id="clone-game-source-current-session-delete-btn"
                    type="button"
                    variant="destructive"
                    onClick={onDelete}
                    disabled={deletingCurrentSession}
                >
                    {deletingCurrentSession ? <Loader2 id="clone-game-source-current-session-delete-loading-icon" className="h-4 w-4 animate-spin" /> : null}
                    {deletingCurrentSession ? t("common.loading") : t("common.delete")}
                </Button>
                <Button id="clone-game-source-current-session-refresh-btn" type="button" variant="outline" onClick={onRetry}>
                    {t("common.refresh")}
                </Button>
            </CardFooter>
        </Card>
    );
}
