"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw, Search, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n/use-translation";
import { listCloneableGames } from "@/lib/game-api";
import type { Game } from "@/types/game";

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

function getRangeLabel(offset: number, count: number, total: number) {
    if (total <= 0 || count <= 0) {
        return "0 / 0";
    }

    const start = offset + 1;
    const end = offset + count;
    return `${start.toLocaleString("en-US")} - ${end.toLocaleString("en-US")} / ${total.toLocaleString("en-US")}`;
}

export function SourceGameTab({ targetGameId, targetGameName }: SourceGameTabProps) {
    const { t } = useTranslation();
    const [searchInput, setSearchInput] = useState("");
    const [games, setGames] = useState<Game[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const requestSeqRef = useRef(0);

    const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
    const trimmedSearch = searchInput.trim();
    const searchMode = trimmedSearch.length > 0 && UUID_PATTERN.test(trimmedSearch) ? "game_id" : "name";

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

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadGames(offset, searchInput);
        }, 350);

        return () => window.clearTimeout(timer);
    }, [loadGames, offset, searchInput]);

    const handleClearSearch = () => {
        setSearchInput("");
        setOffset(0);
    };

    const handleRefresh = () => {
        void loadGames(offset, searchInput);
    };

    const handleLoadMore = () => {
        setOffset((current) => current + PAGE_SIZE);
    };

    const hasMore = offset + games.length < total;
    const loadedStart = total > 0 ? offset + 1 : 0;
    const loadedEnd = offset + games.length;

    return (
        <div id="clone-game-source-tab" className="space-y-4">
            <Card id="clone-game-source-intro-card">
                <CardHeader id="clone-game-source-intro-header" className="space-y-2">
                    <CardTitle id="clone-game-source-intro-title" className="text-xl">
                        {t("cloneGame.sourceGameTitle")}
                    </CardTitle>
                    <CardDescription id="clone-game-source-intro-description">
                        {t("cloneGame.sourceGameSubtitle")}
                    </CardDescription>
                    <p id="clone-game-source-target-game" className="text-xs text-muted-foreground">
                        {t("cloneGame.sourceGameTargetGameLabel")}: <span id="clone-game-source-target-game-name" className="font-medium text-foreground">{targetGameName}</span>
                    </p>
                </CardHeader>
                <CardContent id="clone-game-source-intro-content" className="space-y-4">
                    <div id="clone-game-source-search-wrap" className="space-y-2">
                        <Label id="clone-game-source-search-label" htmlFor="clone-game-source-search-input">
                            {t("cloneGame.sourceGameSearchLabel")}
                        </Label>
                        <div id="clone-game-source-search-field" className="relative">
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
                        <p id="clone-game-source-search-help" className="text-xs text-muted-foreground">
                            {searchMode === "game_id" ? t("cloneGame.sourceGameExactLookupHint") : t("cloneGame.sourceGameSearchHint")}
                        </p>
                    </div>

                    <div id="clone-game-source-actions" className="flex flex-wrap items-center gap-2">
                        <Button
                            id="clone-game-source-refresh-btn"
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={loading}
                            aria-label={t("common.refresh")}
                            title={t("common.refresh")}
                        >
                            {loading ? <Loader2 id="clone-game-source-refresh-loading-icon" className="h-4 w-4 animate-spin" /> : <RefreshCw id="clone-game-source-refresh-icon" className="h-4 w-4" />}
                        </Button>
                        <Button id="clone-game-source-clear-btn" type="button" variant="ghost" onClick={handleClearSearch} disabled={!searchInput && offset === 0}>
                            {t("cloneGame.sourceGameClear")}
                        </Button>
                        <p id="clone-game-source-count" className="text-sm text-muted-foreground">
                            {loading ? t("common.loading") : `${t("cloneGame.sourceGameResultsLabel")}: ${getRangeLabel(offset, games.length, total)}`}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {selectedGame ? (
                <Card id="clone-game-source-selected-card" className="border-primary/40 bg-primary/5">
                    <CardHeader id="clone-game-source-selected-header" className="space-y-2">
                        <CardTitle id="clone-game-source-selected-title" className="text-sm uppercase tracking-wide text-muted-foreground">
                            {t("cloneGame.sourceGameSelected")}
                        </CardTitle>
                        <div id="clone-game-source-selected-copy" className="flex flex-col gap-2">
                            <div id="clone-game-source-selected-title-row" className="flex flex-wrap items-center gap-2">
                                <span id="clone-game-source-selected-name" className="text-base font-semibold">
                                    {selectedGame.name}
                                </span>
                                <Badge id="clone-game-source-selected-badge" variant={getVisibilityBadgeVariant(selectedGame.share_level)}>
                                    {getVisibilityLabel(selectedGame, t)}
                                </Badge>
                            </div>
                            {getVisibilityPriceLabel(selectedGame, t) ? (
                                <p id="clone-game-source-selected-price" className="text-xs text-muted-foreground">
                                    {getVisibilityPriceLabel(selectedGame, t)}
                                </p>
                            ) : null}
                            <div id="clone-game-source-selected-id-row" className="flex flex-wrap items-center gap-1 text-xs font-mono text-muted-foreground">
                                <span id="clone-game-source-selected-id-label">{t("cloneGame.sourceGameIdLabel")}</span>
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
                </Card>
            ) : null}

            {loading && games.length === 0 ? (
                <div id="clone-game-source-skeleton-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Card id={`clone-game-source-skeleton-card-${index}`} key={`clone-game-source-skeleton-${index}`}>
                            <CardHeader id={`clone-game-source-skeleton-header-${index}`} className="space-y-3">
                                <Skeleton id={`clone-game-source-skeleton-title-${index}`} className="h-5 w-3/4" />
                                <Skeleton id={`clone-game-source-skeleton-badge-${index}`} className="h-4 w-24" />
                            </CardHeader>
                            <CardContent id={`clone-game-source-skeleton-content-${index}`} className="space-y-2">
                                <Skeleton id={`clone-game-source-skeleton-line-1-${index}`} className="h-4 w-full" />
                                <Skeleton id={`clone-game-source-skeleton-line-2-${index}`} className="h-4 w-2/3" />
                                <Skeleton id={`clone-game-source-skeleton-line-3-${index}`} className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : error ? (
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
            ) : games.length === 0 ? (
                <Card id="clone-game-source-empty-card" className="text-center">
                    <CardHeader id="clone-game-source-empty-header">
                        <CardTitle id="clone-game-source-empty-title">{t("cloneGame.sourceGameNoResults")}</CardTitle>
                        <CardDescription id="clone-game-source-empty-description">{t("cloneGame.sourceGameNoResultsDesc")}</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
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
                                        <Button id={`clone-game-source-card-select-btn-${game.id}`} type="button" variant={isSelected ? "default" : "outline"} onClick={() => setSelectedGameId(game.id)} className="self-center">
                                            {isSelected ? t("cloneGame.sourceGameSelected") : t("cloneGame.sourceGameSelect")}
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
            )}
        </div>
    );
}
