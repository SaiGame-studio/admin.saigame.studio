"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/CopyButton";
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
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);
    const currentSessionProgressEntries = Object.entries(currentSession?.progress ?? {});
    const currentSessionEstimatedCost = currentSession?.last_run_response?.estimated_clone_cost;
    const currentSessionWarnings = currentSession?.last_run_response?.warnings ?? [];

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
                const response = await getCurrentCloneSessionItems(targetGameId);
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
    }, [activeProgressTab, currentSession, targetGameId, t]);

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
                                        className="rounded-md border bg-background px-3 py-2"
                                    >
                                        <div id={`clone-game-source-current-session-progress-item-header-${toKebabIdSegment(phaseKey)}`} className="flex items-center justify-between gap-2">
                                            <p id={`clone-game-source-current-session-progress-item-phase-${toKebabIdSegment(phaseKey)}`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {index + 1}. {formatTechnicalLabel(phaseKey)}
                                            </p>
                                            <Badge id={`clone-game-source-current-session-progress-item-badge-${toKebabIdSegment(phaseKey)}`} variant={progress.completed ? "default" : "outline"}>
                                                {progress.completed ? t("common.completed") : t("common.pending")}
                                            </Badge>
                                        </div>
                                        <p id={`clone-game-source-current-session-progress-item-value-${toKebabIdSegment(phaseKey)}`} className="mt-1 text-sm">
                                            {progress.processed ?? 0} / {progress.total ?? 0}
                                        </p>
                                    </div>

                                    {phaseKey === "item_definitions" ? (
                                        <div id="clone-game-source-current-session-item-definitions-section" className="space-y-3">
                                            <div id="clone-game-source-current-session-item-definitions-summary" className="flex flex-wrap items-center justify-between gap-2">
                                                <p id="clone-game-source-current-session-item-definitions-summary-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    {t("game.items")}
                                                </p>
                                                <p id="clone-game-source-current-session-item-definitions-summary-value" className="text-xs text-muted-foreground">
                                                    {itemsTotal.toLocaleString("en-US")} {t("game.items")}
                                                </p>
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
