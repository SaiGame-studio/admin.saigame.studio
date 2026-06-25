"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Loader2, RefreshCw, Search, User, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { createCloneSession, deleteCurrentCloneSession, getCurrentCloneSession, listCloneableGames, type CloneSessionSnapshot } from "@/lib/game-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";
import { useToast } from "@/hooks/use-toast";
import { CurrentCloneSessionCard } from "./CurrentCloneSessionCard";

const PAGE_SIZE = 12;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SourceGameTabProps = {
    targetGameId: string;
    targetGameName: string;
};

type TranslationFn = (key: string) => string;

function getVisibilityLabel(game: Game, t: TranslationFn) {
    const shareLevel = game.share_level ?? "private";

    if (shareLevel === "public") {
        return t("cloneGame.public");
    }

    if (shareLevel === "protected") {
        return t("cloneGame.protected");
    }

    return t("cloneGame.private");
}

function getVisibilityBadgeVariant(shareLevel?: Game["share_level"]) {
    if (shareLevel === "public") {
        return "default" as const;
    }

    if (shareLevel === "protected") {
        return "secondary" as const;
    }

    return "outline" as const;
}

function getVisibilityPriceLabel(game: Game, t: TranslationFn) {
    const shareLevel = game.share_level ?? "private";

    if (shareLevel !== "public") {
        return null;
    }

    return `${game.clone_cost ?? 7} ${t("cloneGame.clonePriceUnit")}`;
}

function getRequiredCloneCost(game: Game | null) {
    if (!game) {
        return 0;
    }

    return game.share_level === "public" ? game.clone_cost ?? 7 : 0;
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

type SourceGameIndicatorsProps = {
    game: Game;
    compact?: boolean;
};

function SourceGameIndicators({ game, compact = false }: SourceGameIndicatorsProps) {
    const { t } = useTranslation();

    if (!game.same_studio && !game.is_my_game) {
        return null;
    }

    const iconClassName = compact ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
        <TooltipProvider delayDuration={150}>
            <div
                id={`clone-game-source-indicators-${game.id}`}
                className={`flex flex-wrap items-center gap-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
            >
                {game.same_studio ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                id={`clone-game-source-indicator-same-studio-${game.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1"
                            >
                                <Building2
                                    id={`clone-game-source-indicator-same-studio-icon-${game.id}`}
                                    className={iconClassName}
                                />
                                <span id={`clone-game-source-indicator-same-studio-label-${game.id}`}>
                                    {t("cloneGame.sourceGameSameStudio")}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent id={`clone-game-source-indicator-same-studio-tooltip-${game.id}`} side="top">
                            {t("cloneGame.sourceGameSameStudioTooltip")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
                {game.is_my_game ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                id={`clone-game-source-indicator-my-game-${game.id}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2 py-1"
                            >
                                <User
                                    id={`clone-game-source-indicator-my-game-icon-${game.id}`}
                                    className={iconClassName}
                                />
                                <span id={`clone-game-source-indicator-my-game-label-${game.id}`}>
                                    {t("cloneGame.sourceGameMyGame")}
                                </span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent id={`clone-game-source-indicator-my-game-tooltip-${game.id}`} side="top">
                            {t("cloneGame.sourceGameMyGameTooltip")}
                        </TooltipContent>
                    </Tooltip>
                ) : null}
            </div>
        </TooltipProvider>
    );
}

export function SourceGameTab({ targetGameId, targetGameName }: SourceGameTabProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [searchInput, setSearchInput] = useState("");
    const [games, setGames] = useState<Game[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentSession, setCurrentSession] = useState<CloneSessionSnapshot | null>(null);
    const [currentSessionLoading, setCurrentSessionLoading] = useState(false);
    const [currentSessionError, setCurrentSessionError] = useState<string | null>(null);
    const [deletingCurrentSession, setDeletingCurrentSession] = useState(false);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [startingClone, setStartingClone] = useState(false);
    const [cloneSessionId, setCloneSessionId] = useState<string | null>(null);
    const [cloneSessionError, setCloneSessionError] = useState<string | null>(null);
    const [sgemBalance, setSgemBalance] = useState<number | null>(null);
    const [startConfirmOpen, setStartConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const requestSeqRef = useRef(0);

    const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
    const hasCurrentCloneSession = Boolean(currentSession);
    const requiredCloneCost = getRequiredCloneCost(selectedGame);
    const hasEnoughSgem = sgemBalance === null || sgemBalance >= requiredCloneCost;
    const shouldShowBuyMoreSgem = Boolean(selectedGame) && requiredCloneCost > 0 && sgemBalance !== null && !hasEnoughSgem;

    const loadGames = useCallback(
        async (nextOffset: number, rawSearch: string) => {
            const query = rawSearch.trim();
            const isUuidLookup = query.length > 0 && UUID_PATTERN.test(query);
            const requestId = ++requestSeqRef.current;

            setLoading(true);
            setError(null);

            try {
                const response = await listCloneableGames({
                    targetGameId,
                    offset: nextOffset,
                    name: isUuidLookup ? undefined : query || undefined,
                    gameId: isUuidLookup ? query : undefined,
                });

                if (requestId !== requestSeqRef.current) {
                    return;
                }

                setGames(response.games);
                setTotal(response.total);
                setSelectedGameId((current) => (current && response.games.some((game) => game.id === current) ? current : null));
            } catch {
                if (requestId !== requestSeqRef.current) {
                    return;
                }

                setGames([]);
                setTotal(0);
                setSelectedGameId(null);
                setError(t("cloneGame.sourceGameLoadError"));
            } finally {
                if (requestId !== requestSeqRef.current) {
                    return;
                }

                setLoading(false);
            }
        },
        [targetGameId, t],
    );

    const loadSgemWallet = useCallback(async () => {
        try {
            const data = await api.get("/api/v1/me/sgem-wallet");
            setSgemBalance(typeof data?.balance === "number" ? data.balance : null);
        } catch {
            setSgemBalance(null);
        }
    }, []);

    const loadCurrentSession = useCallback(async () => {
        setCurrentSessionLoading(true);
        setCurrentSessionError(null);

        try {
            const session = await getCurrentCloneSession(targetGameId);
            setCurrentSession(session ?? null);
            if (session?.source_game_id) {
                setSelectedGameId(session.source_game_id);
            }
        } catch (error) {
            setCurrentSession(null);
            const status = (error as { status?: number } | null | undefined)?.status;
            if (status && status !== 404) {
                setCurrentSessionError(t("cloneGame.sourceGameCurrentSessionLoadError"));
            }
        } finally {
            setCurrentSessionLoading(false);
        }
    }, [targetGameId, t]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadGames(offset, searchInput);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [loadGames, offset, searchInput]);

    useEffect(() => {
        void loadCurrentSession();
    }, [loadCurrentSession]);

    useEffect(() => {
        void loadSgemWallet();
    }, [loadSgemWallet]);

    useEffect(() => {
        const handler = () => {
            void loadSgemWallet();
        };

        window.addEventListener("sgem-wallet:refresh", handler);
        return () => window.removeEventListener("sgem-wallet:refresh", handler);
    }, [loadSgemWallet]);

    useEffect(() => {
        setCloneSessionId(null);
        setCloneSessionError(null);
    }, [selectedGameId]);

    const handleClearSearch = () => {
        setSearchInput("");
        setOffset(0);
    };

    const handleRefresh = () => {
        void loadGames(offset, searchInput);
        void loadCurrentSession();
    };

    const handleLoadMore = () => {
        setOffset((current) => current + PAGE_SIZE);
    };

    const handleStartCloneProgress = async () => {
        if (!selectedGame) {
            return;
        }

        setStartingClone(true);
        setCloneSessionError(null);

        try {
            const response = await createCloneSession(targetGameId, selectedGame.id, `${selectedGame.name} -> ${targetGameName}`);
            setCloneSessionId(response.session_id ?? null);
            void loadCurrentSession();
            toast({
                title: t("common.saved"),
                description: t("cloneGame.sourceGameCloneProgressStarted"),
            });
        } catch (error) {
            const description = getCloneSessionErrorMessage(error, t);

            setCloneSessionError(description);
            toast({
                title: t("common.error"),
                description,
                variant: "destructive",
            });
        } finally {
            setStartingClone(false);
        }
    };

    const handleDeleteCurrentSession = async () => {
        if (!currentSession?.session_id || deletingCurrentSession) {
            return;
        }

        setDeletingCurrentSession(true);
        try {
            await deleteCurrentCloneSession(targetGameId);
            setCloneSessionId(null);
            await loadCurrentSession();
            toast({
                title: t("common.deleted"),
                description: t("cloneGame.sourceGameCurrentSessionDeleted"),
            });
        } catch {
            toast({
                title: t("common.error"),
                description: t("cloneGame.sourceGameCurrentSessionDeleteFailed"),
                variant: "destructive",
            });
        } finally {
            setDeletingCurrentSession(false);
        }
    };

    const confirmStartCloneProgress = async () => {
        setStartConfirmOpen(false);
        await handleStartCloneProgress();
    };

    const confirmDeleteCurrentSession = async () => {
        setDeleteConfirmOpen(false);
        await handleDeleteCurrentSession();
    };

    const hasMore = offset + games.length < total;
    const loadedStart = total > 0 ? offset + 1 : 0;
    const loadedEnd = offset + games.length;

    return (
        <div id="clone-game-source-tab" className="space-y-4">
            <CurrentCloneSessionCard
                targetGameId={targetGameId}
                currentSession={currentSession}
                currentSessionLoading={currentSessionLoading}
                currentSessionError={currentSessionError}
                deletingCurrentSession={deletingCurrentSession}
                onRetry={handleRefresh}
                onDelete={() => setDeleteConfirmOpen(true)}
            />

            <AlertDialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}>
                <AlertDialogContent id="clone-game-source-start-confirm-dialog">
                    <AlertDialogHeader id="clone-game-source-start-confirm-header">
                        <AlertDialogTitle id="clone-game-source-start-confirm-title">
                            {t("cloneGame.sourceGameStartConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription id="clone-game-source-start-confirm-description">
                            {selectedGame
                                ? t("cloneGame.sourceGameStartConfirmDesc")
                                      .replace("{name}", selectedGame.name)
                                      .replace("{target}", targetGameName)
                                : t("cloneGame.sourceGameStartConfirmFallback")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter id="clone-game-source-start-confirm-footer">
                        <AlertDialogCancel id="clone-game-source-start-confirm-cancel" disabled={startingClone}>
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            id="clone-game-source-start-confirm-action"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={startingClone}
                            onClick={() => void confirmStartCloneProgress()}
                        >
                            {startingClone ? t("common.loading") : t("cloneGame.sourceGameStartConfirmAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent id="clone-game-source-delete-confirm-dialog">
                    <AlertDialogHeader id="clone-game-source-delete-confirm-header">
                        <AlertDialogTitle id="clone-game-source-delete-confirm-title">
                            {t("cloneGame.sourceGameDeleteConfirmTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription id="clone-game-source-delete-confirm-description">
                            {currentSession?.session_id
                                ? t("cloneGame.sourceGameDeleteConfirmDesc").replace("{sessionId}", currentSession.session_id)
                                : t("cloneGame.sourceGameDeleteConfirmFallback")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter id="clone-game-source-delete-confirm-footer">
                        <AlertDialogCancel id="clone-game-source-delete-confirm-cancel" disabled={deletingCurrentSession}>
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            id="clone-game-source-delete-confirm-action"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deletingCurrentSession}
                            onClick={() => void confirmDeleteCurrentSession()}
                        >
                            {deletingCurrentSession ? t("common.loading") : t("common.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {!hasCurrentCloneSession && selectedGame ? (
                <Card id="clone-game-source-selected-card" className="border-primary/40 bg-primary/5">
                    <CardHeader id="clone-game-source-selected-header" className="relative space-y-2 pr-36">
                        <CardTitle id="clone-game-source-selected-title" className="text-sm uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameSelected")}
                        </CardTitle>
                        <div id="clone-game-source-start-actions" className="absolute right-4 top-4 flex flex-col items-end gap-1">
                            <Button
                                id="clone-game-source-start-clone-progress-btn"
                                type="button"
                                onClick={() => setStartConfirmOpen(true)}
                                disabled={startingClone || shouldShowBuyMoreSgem}
                            >
                                {startingClone ? t("common.loading") : t("cloneGame.sourceGameStartCloneProgress")}
                            </Button>
                            {shouldShowBuyMoreSgem ? (
                                <Button
                                    id="clone-game-source-buy-more-sgem-btn"
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 py-0 text-xs"
                                    asChild
                                >
                                    <Link id="clone-game-source-buy-more-sgem-link" href="/payment?tab=buy-sgem">
                                        {t("llmTokenPurchase.buyMoreSGem")}
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                        <div id="clone-game-source-selected-copy" className="flex flex-col gap-2">
                            <div id="clone-game-source-selected-title-row" className="flex flex-wrap items-center gap-2">
                                <span id="clone-game-source-selected-name" className="text-base font-semibold">
                                    {selectedGame.name}
                                </span>
                                <Badge id="clone-game-source-selected-badge" variant={getVisibilityBadgeVariant(selectedGame.share_level)}>
                                    {getVisibilityLabel(selectedGame, t)}
                                </Badge>
                            </div>
                            <SourceGameIndicators game={selectedGame} compact />
                            {getVisibilityPriceLabel(selectedGame, t) ? (
                                <p id="clone-game-source-selected-price" className="text-xs text-muted-foreground">
                                    {getVisibilityPriceLabel(selectedGame, t)}
                                </p>
                            ) : null}
                            <div id="clone-game-source-selected-id-row" className="flex flex-wrap items-center gap-1 text-xs font-mono text-muted-foreground">
                                <span id="clone-game-source-selected-id-label">{t("cloneGame.sourceGameIdLabel")}</span>:
                                <span id="clone-game-source-selected-id-value" className="break-all">
                                    {selectedGame.id}
                                </span>
                                <CopyButton
                                    id={`clone-game-source-selected-copy-id-btn-${selectedGame.id}`}
                                    iconId={`clone-game-source-selected-copy-id-icon-${selectedGame.id}`}
                                    text={selectedGame.id}
                                    size="h-3 w-3"
                                    className="ml-0"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent id="clone-game-source-selected-content" className="text-sm text-muted-foreground">
                        {selectedGame.description || t("cloneGame.sourceGameNoDescription")}
                    </CardContent>
                    {cloneSessionError ? (
                        <div id="clone-game-source-selected-error" className="px-6 pb-2 text-sm text-destructive">
                            {cloneSessionError}
                        </div>
                    ) : null}
                    <CardFooter id="clone-game-source-selected-footer" className="flex flex-wrap items-center justify-end gap-2">
                        {cloneSessionId ? (
                            <span id="clone-game-source-selected-session" className="text-xs text-muted-foreground">
                                {cloneSessionId}
                            </span>
                        ) : null}
                    </CardFooter>
                </Card>
            ) : null}

            {!hasCurrentCloneSession ? (
                <div id="clone-game-source-search-wrap" className="space-y-2">
                    <Label id="clone-game-source-search-label" htmlFor="clone-game-source-search-input">
                        {t("cloneGame.sourceGameSearchLabel")}
                    </Label>
                    <div id="clone-game-source-search-row" className="flex flex-wrap items-start gap-2">
                        <div id="clone-game-source-search-field" className="relative min-w-0 flex-1">
                            <Search id="clone-game-source-search-icon" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="clone-game-source-search-input"
                                value={searchInput}
                                onChange={(event) => {
                                    setSearchInput(event.target.value);
                                    if (offset !== 0) {
                                        setOffset(0);
                                    }
                                }}
                                placeholder={t("cloneGame.sourceGameSearchPlaceholder")}
                                className="pl-9 pr-24"
                                autoComplete="off"
                            />
                            {searchInput ? (
                                <Button
                                    id="clone-game-source-clear-search-btn"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-2"
                                    onClick={handleClearSearch}
                                >
                                    <X id="clone-game-source-clear-search-icon" className="h-4 w-4" />
                                </Button>
                            ) : null}
                        </div>
                        <Button
                            id="clone-game-source-refresh-btn"
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={loading}
                            aria-label={t("common.refresh")}
                            title={t("common.refresh")}
                            className="shrink-0"
                        >
                            {loading ? <Loader2 id="clone-game-source-refresh-loading-icon" className="h-4 w-4 animate-spin" /> : <RefreshCw id="clone-game-source-refresh-icon" className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            ) : null}

            {!hasCurrentCloneSession && loading && games.length === 0 ? (
                    <div id="clone-game-source-skeleton-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Card id={`clone-game-source-skeleton-card-${index}`} key={`clone-game-source-skeleton-${index}`}>
                                <CardHeader id={`clone-game-source-skeleton-header-${index}`} className="space-y-3">
                                    <div id={`clone-game-source-skeleton-title-${index}`} className="h-5 w-3/4 rounded bg-muted" />
                                    <div id={`clone-game-source-skeleton-badge-${index}`} className="h-4 w-24 rounded bg-muted" />
                                </CardHeader>
                                <CardContent id={`clone-game-source-skeleton-content-${index}`} className="space-y-2">
                                    <div id={`clone-game-source-skeleton-line-1-${index}`} className="h-4 w-full rounded bg-muted" />
                                    <div id={`clone-game-source-skeleton-line-2-${index}`} className="h-4 w-2/3 rounded bg-muted" />
                                    <div id={`clone-game-source-skeleton-line-3-${index}`} className="h-4 w-1/2 rounded bg-muted" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
            ) : !hasCurrentCloneSession && error ? (
                <Card id="clone-game-source-error-card" className="border-destructive">
                    <CardHeader id="clone-game-source-error-header">
                        <CardTitle id="clone-game-source-error-title">{t("common.error")}</CardTitle>
                        <CardDescription id="clone-game-source-error-description">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter id="clone-game-source-error-footer" className="flex flex-wrap gap-2">
                        <Button id="clone-game-source-error-retry-btn" variant="outline" onClick={handleRefresh}>
                            {t("common.retry")}
                        </Button>
                    </CardFooter>
                </Card>
            ) : !hasCurrentCloneSession && games.length === 0 ? (
                <Card id="clone-game-source-empty-card" className="text-center">
                    <CardHeader id="clone-game-source-empty-header">
                        <CardTitle id="clone-game-source-empty-title">{t("cloneGame.sourceGameNoResults")}</CardTitle>
                        <CardDescription id="clone-game-source-empty-description">{t("cloneGame.sourceGameNoResultsDesc")}</CardDescription>
                    </CardHeader>
                </Card>
            ) : !hasCurrentCloneSession ? (
                <>
                    <div id="clone-game-source-results-bar" className="flex flex-wrap items-center justify-between gap-2">
                        <p id="clone-game-source-results-summary" className="text-sm text-muted-foreground">
                            {t("cloneGame.sourceGameResultsSummaryPrefix")} {loadedStart.toLocaleString("en-US")} - {loadedEnd.toLocaleString("en-US")} {t("cloneGame.sourceGameResultsSummaryMiddle")} {total.toLocaleString("en-US")} {t("cloneGame.sourceGameResultsSummarySuffix")}
                        </p>
                        {hasMore ? (
                            <p id="clone-game-source-results-hint" className="text-xs text-muted-foreground">
                                {t("cloneGame.sourceGameSearchToLoadMore")}
                            </p>
                        ) : null}
                    </div>

                    <Separator id="clone-game-source-results-separator" />

                    <div id="clone-game-source-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {games.map((game) => {
                            const isSelected = selectedGameId === game.id;
                            const isCurrentGame = game.id === targetGameId;
                            const visibilityLabel = getVisibilityLabel(game, t);
                            const visibilityPriceLabel = getVisibilityPriceLabel(game, t);

                            return (
                                <Card
                                    id={`clone-game-source-card-${game.id}`}
                                    key={game.id}
                                    className={`flex h-full flex-col ${isSelected ? "border-primary bg-primary/5 shadow-sm" : ""}`}
                                >
                                    <CardHeader id={`clone-game-source-card-header-${game.id}`} className="space-y-3">
                                        <div id={`clone-game-source-card-title-row-${game.id}`} className="flex items-start gap-3">
                                            <div id={`clone-game-source-card-title-copy-${game.id}`} className="min-w-0 space-y-1">
                                                <CardTitle id={`clone-game-source-card-title-${game.id}`} className="text-base">
                                                    <Link id={`clone-game-source-card-link-${game.id}`} href={`/games/${game.id}`} className="inline-flex items-center gap-1 hover:text-primary">
                                                        <span id={`clone-game-source-card-name-${game.id}`} className="truncate">
                                                            {game.name}
                                                        </span>
                                                        <ExternalLink id={`clone-game-source-card-link-icon-${game.id}`} className="h-4 w-4 shrink-0" />
                                                    </Link>
                                                </CardTitle>
                                                {isCurrentGame ? (
                                                    <Badge id={`clone-game-source-card-current-badge-${game.id}`} variant="outline">
                                                        {t("cloneGame.sourceGameYourGame")}
                                                    </Badge>
                                                ) : null}
                                                <SourceGameIndicators game={game} compact />
                                            </div>
                                        </div>
                                        <div id={`clone-game-source-card-id-row-${game.id}`} className="flex flex-wrap items-center gap-1 text-xs font-mono text-muted-foreground">
                                            <span id={`clone-game-source-card-id-label-${game.id}`}>{t("cloneGame.sourceGameIdLabel")}</span>:
                                            <span id={`clone-game-source-card-id-value-${game.id}`} className="break-all">
                                                {game.id}
                                            </span>
                                            <CopyButton
                                                id={`clone-game-source-card-copy-id-btn-${game.id}`}
                                                iconId={`clone-game-source-card-copy-id-icon-${game.id}`}
                                                text={game.id}
                                                size="h-3 w-3"
                                                className="ml-0"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent id={`clone-game-source-card-content-${game.id}`} className="flex-1 space-y-3">
                                        <p id={`clone-game-source-card-description-${game.id}`} className="line-clamp-3 text-sm text-muted-foreground">
                                            {game.description || t("cloneGame.sourceGameNoDescription")}
                                        </p>
                                        {Array.isArray(game.tags) && game.tags.length > 0 ? (
                                            <div id={`clone-game-source-card-tags-${game.id}`} className="flex flex-wrap gap-1.5">
                                                {game.tags.slice(0, 4).map((tag) => (
                                                    <Badge id={`clone-game-source-card-tag-${game.id}-${tag}`} key={`${game.id}-${tag}`} variant="outline">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : null}
                                    </CardContent>
                                    <CardFooter id={`clone-game-source-card-footer-${game.id}`} className="mt-auto flex flex-wrap items-center justify-between gap-2">
                                        <Button
                                            id={`clone-game-source-card-select-btn-${game.id}`}
                                            type="button"
                                            variant={isSelected ? "default" : "outline"}
                                            onClick={() => setSelectedGameId(game.id)}
                                            className="self-center"
                                            disabled={isCurrentGame}
                                        >
                                            {isCurrentGame ? t("cloneGame.sourceGameYourGame") : isSelected ? t("cloneGame.sourceGameSelected") : t("cloneGame.sourceGameSelect")}
                                        </Button>
                                        <div id={`clone-game-source-card-visibility-wrap-${game.id}`} className="flex items-center gap-2 text-right">
                                            {visibilityPriceLabel ? (
                                                <p id={`clone-game-source-card-visibility-price-${game.id}`} className="text-xs text-muted-foreground">
                                                    {visibilityPriceLabel}
                                                </p>
                                            ) : null}
                                            <Badge id={`clone-game-source-card-visibility-${game.id}`} variant={getVisibilityBadgeVariant(game.share_level)}>
                                                {visibilityLabel}
                                            </Badge>
                                        </div>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>

                    {hasMore ? (
                        <Card id="clone-game-source-more-card">
                            <CardContent id="clone-game-source-more-content" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div id="clone-game-source-more-copy" className="space-y-1">
                                    <p id="clone-game-source-more-title" className="text-sm font-medium">
                                        {t("cloneGame.sourceGameMoreTitle")}
                                    </p>
                                    <p id="clone-game-source-more-description" className="text-xs text-muted-foreground">
                                        {t("cloneGame.sourceGameMoreDescription")}
                                    </p>
                                </div>
                                <Button id="clone-game-source-load-more-btn" type="button" variant="outline" onClick={handleLoadMore} disabled={loading}>
                                    {loading ? <Loader2 id="clone-game-source-load-more-loading-icon" className="h-4 w-4 animate-spin" /> : null}
                                    {t("cloneGame.sourceGameLoadMore")}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
