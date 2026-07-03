"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Lock, RefreshCw, Search, Shield, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { createCloneSession, deleteCurrentCloneSession, getCurrentCloneSession, listCloneableGames, type CloneSessionSnapshot } from "@/lib/game-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Game } from "@/types/game";
import { useToast } from "@/hooks/use-toast";
import { CurrentCloneSessionCard } from "./CurrentCloneSessionCard";
import { SourceGameFilters } from "./SourceGameFilters";
import { SourceGameIndicators } from "./SourceGameIndicators";
import { getCloneCostCurrencyMeta, getCloneSessionErrorMessage, getRequiredCloneCost, getStartConfirmBillingDetails, getVisibilityLabel, getVisibilityPriceLabel, getVisibilityStatusStyle } from "./sourceGameCloneUtils";

const PAGE_SIZE = 12;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SourceGameTabProps = {
    targetGameId: string;
    targetGameName: string;
};
type LoadCurrentSessionOptions = {
    silent?: boolean;
};


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
    const [cloneSessionError, setCloneSessionError] = useState<string | null>(null);
    const [sgemBalance, setSgemBalance] = useState<number | null>(null);
    const [scoinBalance, setScoinBalance] = useState<number | null>(null);
    const [sameStudioFilter, setSameStudioFilter] = useState(false);
    const [myGamesFilter, setMyGamesFilter] = useState(false);
    const [isPurchasedFilter, setIsPurchasedFilter] = useState(false);
    const [startConfirmOpen, setStartConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const requestSeqRef = useRef(0);

    const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
    const selectedGameCurrency = getCloneCostCurrencyMeta(selectedGame?.clone_cost_currency);
    const hasCurrentCloneSession = Boolean(currentSession);
    const requiredCloneCost = getRequiredCloneCost(selectedGame);
    const selectedCurrencyBalance = selectedGameCurrency.code === "sCoin" ? scoinBalance : sgemBalance;
    const hasEnoughBalance = selectedCurrencyBalance === null || selectedCurrencyBalance >= requiredCloneCost;
    const shouldShowBuyMoreCurrency = Boolean(selectedGame) && requiredCloneCost > 0 && selectedCurrencyBalance !== null && !hasEnoughBalance;
    const startConfirmBillingDetails = selectedGame ? getStartConfirmBillingDetails(selectedGame, t) : null;

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
                    sameStudio: sameStudioFilter ? true : undefined,
                    isMyGame: myGamesFilter ? true : undefined,
                    isPurchased: isPurchasedFilter ? true : undefined,
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
        [targetGameId, t, sameStudioFilter, myGamesFilter, isPurchasedFilter],
    );

    const loadSgemWallet = useCallback(async () => {
        try {
            const data = await api.get("/api/v1/me/sgem-wallet");
            setSgemBalance(typeof data?.balance === "number" ? data.balance : null);
        } catch {
            setSgemBalance(null);
        }
    }, []);

    const loadScoinWallet = useCallback(async () => {
        try {
            const data = await api.get("/api/v1/coins/wallet");
            setScoinBalance(typeof data?.balance === "number" ? data.balance : null);
        } catch {
            setScoinBalance(null);
        }
    }, []);

    const loadCurrentSession = useCallback(async (options?: LoadCurrentSessionOptions) => {
        const silent = options?.silent === true;

        if (!silent) {
            setCurrentSessionLoading(true);
            setCurrentSessionError(null);
        }

        try {
            const session = await getCurrentCloneSession(targetGameId);
            setCurrentSession(session ?? null);
            if (session?.source_game_id) {
                setSelectedGameId(session.source_game_id);
            }
        } catch (error) {
            const status = (error as { status?: number } | null | undefined)?.status;

            if (!silent) {
                setCurrentSession(null);
            }

            if (!silent && status && status !== 404) {
                setCurrentSessionError(t("cloneGame.sourceGameCurrentSessionLoadError"));
            }
        } finally {
            if (!silent) {
                setCurrentSessionLoading(false);
            }
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
        void loadScoinWallet();
    }, [loadScoinWallet]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = event instanceof CustomEvent ? event.detail : null;
            if (detail?.skipSourceGameWalletRefresh) {
                return;
            }

            void loadSgemWallet();
        };

        window.addEventListener("sgem-wallet:refresh", handler);
        return () => window.removeEventListener("sgem-wallet:refresh", handler);
    }, [loadSgemWallet]);

    useEffect(() => {
        const handler = () => {
            void loadScoinWallet();
        };

        window.addEventListener("wallet:refresh", handler);
        return () => window.removeEventListener("wallet:refresh", handler);
    }, [loadScoinWallet]);

    useEffect(() => {
        setCloneSessionError(null);
    }, [selectedGameId]);

    const handleClearSearch = () => {
        setSearchInput("");
        setOffset(0);
    };

    const handleRefresh = async () => {
        await loadCurrentSession();
        await loadGames(offset, searchInput);
    };

    const handleRefreshCurrentSessionSilently = useCallback(async () => {
        await loadCurrentSession({ silent: true });
    }, [loadCurrentSession]);

    const handleLoadMore = () => {
        setOffset((current) => current + PAGE_SIZE);
    };

    const handleSameStudioFilterChange = (value: boolean) => {
        setSameStudioFilter(value);
        setOffset(0);
    };

    const handleMyGamesFilterChange = (value: boolean) => {
        setMyGamesFilter(value);
        setOffset(0);
    };

    const handleIsPurchasedFilterChange = (value: boolean) => {
        setIsPurchasedFilter(value);
        setOffset(0);
    };

    const handleStartCloneProgress = async () => {
        if (!selectedGame) {
            return;
        }

        setStartingClone(true);
        setCloneSessionError(null);

        try {
            await createCloneSession(targetGameId, selectedGame.id, `${selectedGame.name} -> ${targetGameName}`);
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
                onRefreshCurrentSession={handleRefreshCurrentSessionSilently}
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
                            {selectedGame ? (
                                <div id="clone-game-source-start-confirm-description-wrap" className="space-y-2">
                                    <p id="clone-game-source-start-confirm-description-main">
                                        {t("cloneGame.sourceGameStartConfirmDesc")
                                            .replace("{name}", selectedGame.name)
                                            .replace("{target}", targetGameName)}
                                    </p>
                                    <ul id="clone-game-source-start-confirm-description-billing" className="list-disc space-y-1 pl-5 text-foreground">
                                        {startConfirmBillingDetails?.items.map((item, index) => (
                                            <li
                                                id={`clone-game-source-start-confirm-description-billing-item-${item.id}-${index}`}
                                                key={`clone-game-source-start-confirm-description-billing-item-${item.id}-${index}`}
                                            >
                                                {item.text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <p id="clone-game-source-start-confirm-description-fallback">
                                    {t("cloneGame.sourceGameStartConfirmFallback")}
                                </p>
                            )}
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
                        <SourceGameFilters
                            sameStudio={sameStudioFilter}
                            myGames={myGamesFilter}
                            isPurchased={isPurchasedFilter}
                            onSameStudioChange={handleSameStudioFilterChange}
                            onMyGamesChange={handleMyGamesFilterChange}
                            onIsPurchasedChange={handleIsPurchasedFilterChange}
                        />
                        <Button
                            id="clone-game-source-refresh-btn"
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => void handleRefresh()}
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
                        <Button id="clone-game-source-error-retry-btn" variant="outline" onClick={() => void handleRefresh()}>
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
                            const isTargetGame = game.id === targetGameId;
                            const visibilityLabel = getVisibilityLabel(game, t);
                            const visibilityPriceLabel = getVisibilityPriceLabel(game, t);
                            const visibilityStatusStyle = getVisibilityStatusStyle(game.share_level);
                            const VisibilityIcon = game.share_level === "public" ? Globe : game.share_level === "protected" ? Shield : Lock;

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
                                                    <span id={`clone-game-source-card-name-${game.id}`} className="block truncate">
                                                        {game.name}
                                                    </span>
                                                </CardTitle>
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
                                        <SourceGameIndicators game={game} scope="card" compact />
                                    </CardContent>
                                    <CardFooter id={`clone-game-source-card-footer-${game.id}`} className="mt-auto flex flex-wrap items-center justify-between gap-2">
                                        <div id={`clone-game-source-card-actions-${game.id}`} className="flex flex-wrap items-center gap-2">
                                            {isSelected ? (
                                                <Badge id={`clone-game-source-card-selected-status-${game.id}`} variant="secondary">
                                                    {t("cloneGame.sourceGameSelected")}
                                                </Badge>
                                            ) : isTargetGame ? (
                                                <Button
                                                    id={`clone-game-source-card-select-btn-${game.id}`}
                                                    type="button"
                                                    disabled
                                                    className="self-center"
                                                >
                                                    {t("cloneGame.sourceGameIsTarget")}
                                                </Button>
                                            ) : (
                                                <Button
                                                    id={`clone-game-source-card-select-btn-${game.id}`}
                                                    type="button"
                                                    onClick={() => setSelectedGameId(game.id)}
                                                    className="self-center"
                                                >
                                                    {t("cloneGame.sourceGameSelect")}
                                                </Button>
                                            )}
                                            {isSelected ? (
                                                <Button
                                                    id={`clone-game-source-card-confirm-btn-${game.id}`}
                                                    type="button"
                                                    onClick={() => setStartConfirmOpen(true)}
                                                    disabled={startingClone || shouldShowBuyMoreCurrency}
                                                >
                                                    {startingClone ? t("common.loading") : t("common.confirm")}
                                                </Button>
                                            ) : null}
                                            {isSelected && shouldShowBuyMoreCurrency ? (
                                                <Button id={`clone-game-source-card-buy-more-currency-btn-${game.id}`} type="button" variant="link" className="h-auto px-0 py-0 text-xs" asChild>
                                                    <Link id={`clone-game-source-card-buy-more-currency-link-${game.id}`} href={`/payment?tab=${selectedGameCurrency.paymentTab}`}>
                                                        {selectedGameCurrency.code === "sCoin" ? t("payment.topUpSCoin") : t("llmTokenPurchase.buyMoreSGem")}
                                                    </Link>
                                                </Button>
                                            ) : null}
                                        </div>
                                        <div id={`clone-game-source-card-visibility-wrap-${game.id}`} className="flex items-center gap-2 text-right">
                                            {visibilityPriceLabel ? (
                                                <p id={`clone-game-source-card-visibility-price-${game.id}`} className="text-xs text-muted-foreground">
                                                    {visibilityPriceLabel}
                                                </p>
                                            ) : null}
                                            <TooltipProvider delayDuration={150}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span
                                                            id={`clone-game-source-card-visibility-${game.id}`}
                                                            aria-label={visibilityLabel}
                                                            className={`inline-flex items-center justify-center rounded-full border p-2 ${visibilityStatusStyle.pill}`}
                                                        >
                                                            <VisibilityIcon
                                                                id={`clone-game-source-card-visibility-icon-${game.id}`}
                                                                className="h-3.5 w-3.5"
                                                            />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent id={`clone-game-source-card-visibility-tooltip-${game.id}`} side="top">
                                                        {visibilityLabel}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
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
