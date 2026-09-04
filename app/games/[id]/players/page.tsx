"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { addPlayerToGame, getGameProgressList, GameProgress, getPlayerIdentityMapByUserIds, PlayerIdentity } from "@/lib/game-user-api";
import { getGame, updateGame } from "@/lib/game-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Search, RefreshCw, User, UserPlus, Trophy, Coins, Star, ArrowLeft, Hammer, Eye, Mail, XCircle, CircleHelp } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from '@/lib/i18n/use-translation';
import { GameNavButtons } from "@/components/GameNavButtons";
import { CopyButton } from "@/components/CopyButton";
import { createGamerProgress } from "@/lib/script-api";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
type AddPlayerResult = {
    email: string;
    status: "pending" | "success" | "error";
    message?: string;
};
export default function GameUserProfilesPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = React.use(params);
    const gameId = id;
    const { t } = useTranslation();
    const [progressList, setProgressList] = useState<GameProgress[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [playerIdentityMap, setPlayerIdentityMap] = useState<Record<string, PlayerIdentity>>({});
    const [addingCurrentUser, setAddingCurrentUser] = useState(false);
    const [addCurrentUserError, setAddCurrentUserError] = useState<string | null>(null);
    const [isAddPlayerPanelOpen, setIsAddPlayerPanelOpen] = useState(false);
    const [playerEmails, setPlayerEmails] = useState("");
    const [addingPlayer, setAddingPlayer] = useState(false);
    const [addPlayerResults, setAddPlayerResults] = useState<AddPlayerResult[]>([]);
    const [updatingAllowNewPlayers, setUpdatingAllowNewPlayers] = useState(false);
    const [allowNewPlayersError, setAllowNewPlayersError] = useState<string | null>(null);
    const loadData = useCallback(async (displayName?: string) => {
        try {
            setLoading(true);
            const [progressRes, gameRes] = await Promise.all([
                getGameProgressList(gameId, displayName ? { display_name: displayName } : undefined),
                game ? Promise.resolve(game) : getGame(gameId),
            ]);
            const identityMap = await getPlayerIdentityMapByUserIds(progressRes.progress.map((item) => item.user_id), progressRes.progress.map((item) => ({
                user_id: item.user_id,
                user_display_name: item.user_display_name,
                user_email: item.user_email,
            })));
            setProgressList(progressRes.progress);
            setPlayerIdentityMap(identityMap);
            setTotalCount(progressRes.total_count);
            if (!game)
                setGame(gameRes);
            setError(null);
        }
        catch (err) {
            setError("Failed to load game progress data");
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }, [gameId, game]);
    useEffect(() => {
        loadData();
    }, [gameId]);
    const handleSearchInput = (value: string) => {
        setSearchInput(value);
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setSearchQuery(value);
            loadData(value || undefined);
        }, 400);
    };
    const handleClearSearch = () => {
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
        setSearchInput("");
        setSearchQuery("");
        loadData();
    };
    useEffect(() => () => {
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
    }, []);
    const handleAddCurrentUser = async () => {
        setAddingCurrentUser(true);
        setAddCurrentUserError(null);
        try {
            await createGamerProgress(gameId);
            await loadData();
        }
        catch (err) {
            setAddCurrentUserError(err instanceof Error ? err.message : t('gameUsers.addMeFailed'));
        }
        finally {
            setAddingCurrentUser(false);
        }
    };
    const handleAddPlayer = async (event: React.FormEvent) => {
        event.preventDefault();
        const emails = playerEmails.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean);
        if (emails.length === 0)
            return;
        setAddingPlayer(true);
        setAddPlayerResults(emails.map((email) => ({ email, status: "pending" })));
        try {
            for (const [index, email] of emails.entries()) {
                try {
                    await addPlayerToGame(gameId, email);
                    setAddPlayerResults((results) => results.map((result, resultIndex) => resultIndex === index ? { ...result, status: "success" } : result));
                }
                catch (err) {
                    setAddPlayerResults((results) => results.map((result, resultIndex) => resultIndex === index ? {
                        ...result,
                        status: "error",
                        message: err instanceof Error ? err.message : t('gameUsers.addPlayerFailed'),
                    } : result));
                }
            }
            await loadData();
        }
        finally {
            setAddingPlayer(false);
        }
    };
    const handleAllowNewPlayersChange = async (checked: boolean) => {
        if (!game)
            return;
        setUpdatingAllowNewPlayers(true);
        setAllowNewPlayersError(null);
        try {
            const updatedGame = await updateGame(gameId, {
                settings: { ...game.settings, allow_new_players: checked },
            });
            setGame(updatedGame);
        }
        catch (err) {
            setAllowNewPlayersError(err instanceof Error ? err.message : t('gameUsers.allowNewPlayersUpdateFailed'));
        }
        finally {
            setUpdatingAllowNewPlayers(false);
        }
    };
    return (<div id="game-players-page" className="game-players-page container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {game && (<div id="game-players-breadcrumb-container" className="game-players-breadcrumb-container mb-2">
          <Breadcrumb id="game-players-breadcrumb" className="game-players-breadcrumb">
            <BreadcrumbList id="game-players-breadcrumb-list" className="game-players-breadcrumb-list flex-nowrap overflow-x-auto whitespace-nowrap">
              <BreadcrumbItem id="game-players-studio-breadcrumb-item" className="game-players-breadcrumb-item">
                <BreadcrumbLink id="game-players-studio-breadcrumb-link" className="game-players-breadcrumb-link" href="/studios">{game.studio?.name || t('common.studios')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator id="game-players-studio-breadcrumb-separator" className="game-players-breadcrumb-separator">/</BreadcrumbSeparator>
              <BreadcrumbItem id="game-players-game-breadcrumb-item" className="game-players-breadcrumb-item">
                <BreadcrumbLink id="game-players-game-breadcrumb-link" className="game-players-breadcrumb-link" href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator id="game-players-current-breadcrumb-separator" className="game-players-breadcrumb-separator">/</BreadcrumbSeparator>
              <BreadcrumbItem id="game-players-current-breadcrumb-item" className="game-players-breadcrumb-item">
                <span id="game-players-current-breadcrumb-label" className="game-players-current-breadcrumb-label">{t('gameUsers.players')}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>)}

      <div id="game-players-page-header" className="game-players-page-header flex flex-col gap-4 mb-6 md:flex-row md:justify-between md:items-center md:gap-0">
        <div id="game-players-page-title-container" className="game-players-page-title-container flex items-center gap-3 min-w-0">
          <Button id="game-players-back-button" variant="outline" size="icon" asChild className="game-players-back-button shrink-0">
            <Link id="game-players-back-link" className="game-players-back-link" href={`/games/${gameId}`}><ArrowLeft id="game-players-back-icon" className="h-4 w-4"/></Link>
          </Button>
          <div id="game-players-page-title-copy" className="game-players-page-title-copy min-w-0 flex-1">
            <h1 id="game-players-page-title" className="game-players-page-title text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
              {t('gameUsers.players')}{game ? ` - ${game.name}` : ""}
            </h1>
            <p id="game-players-limit-summary" className="game-players-limit-summary text-muted-foreground flex items-center gap-2 flex-wrap text-sm">
              {game?.limits?.max_player_profiles != null
            ? (() => {
                const used = totalCount;
                const max = game.limits.max_player_profiles;
                const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
                return (<>
                        <span className={used >= max ? "text-destructive font-medium" : ""}>
                          {used.toLocaleString()} / {max.toLocaleString()} {t('gameUsers.playersLower')}
                        </span>
                        <span className="inline-block h-1.5 w-20 shrink-0 rounded-full bg-muted overflow-hidden align-middle sm:w-24">
                          <span className={`block h-full rounded-full transition-all ${used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
                        </span>
                        <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0" title="Manage plugins / raise limits">
                          <Hammer className="h-3.5 w-3.5"/>
                        </Link>
                      </>);
            })()
            : <span>{totalCount.toLocaleString()} {t('gameUsers.playersRegistered')}</span>}
            </p>
          </div>
        </div>
        <div id="game-players-navigation" className="game-players-navigation flex gap-2 items-center flex-wrap">
          <div id="game-players-navigation-buttons" className="game-players-navigation-buttons">
          <GameNavButtons gameId={gameId} active="players"/>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (<div id="game-players-loading-list" className="game-players-loading-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (<Card id={`game-players-loading-card-${i}`} key={i} className="game-players-loading-card">
              <CardHeader id={`game-players-loading-card-header-${i}`} className="game-players-loading-card-header">
                <Skeleton id={`game-players-loading-title-${i}`} className="game-players-loading-title h-5 w-3/4"/>
              </CardHeader>
              <CardContent id={`game-players-loading-card-content-${i}`} className="game-players-loading-card-content space-y-2">
                <Skeleton id={`game-players-loading-line-one-${i}`} className="game-players-loading-line h-4 w-full"/>
                <Skeleton id={`game-players-loading-line-two-${i}`} className="game-players-loading-line h-4 w-2/3"/>
                <Skeleton id={`game-players-loading-line-three-${i}`} className="game-players-loading-line h-4 w-1/2"/>
              </CardContent>
            </Card>))}
        </div>) : error ? (<Card id="game-players-error-card" className="game-players-error-card border-destructive">
          <CardHeader id="game-players-error-header" className="game-players-error-header">
            <CardTitle id="game-players-error-title" className="game-players-error-title">{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent id="game-players-error-content" className="game-players-error-content">
            <p id="game-players-error-message" className="game-players-error-message">{error}</p>
            <Button id="game-players-error-retry-button" variant="outline" className="game-players-error-retry-button mt-4" onClick={() => loadData()}>
              {t('gameUsers.tryAgain')}
            </Button>
          </CardContent>
        </Card>) : progressList.length === 0 ? (<Card id="game-players-empty-card" className="text-center p-6">
          <CardHeader id="game-players-empty-header">
            <User id="game-players-empty-icon" className="mx-auto h-12 w-12 text-muted-foreground"/>
            <CardTitle id="game-players-empty-title" className="mt-4">{t('gameUsers.noPlayers')}</CardTitle>
            {searchQuery && (<p id="game-players-empty-search-message" className="text-muted-foreground mt-2">
                {t('gameUsers.noResults')} &quot;{searchQuery}&quot;.{" "}
                <button id="game-players-empty-clear-search" className="text-primary hover:underline" onClick={handleClearSearch}>
                  {t('gameUsers.clearSearch')}
                </button>
              </p>)}
            {!searchQuery && totalCount === 0 && (<div id="game-players-add-me-container" className="mt-4 flex flex-col items-center gap-2">
                <Button id="game-players-add-me-button" onClick={handleAddCurrentUser} disabled={addingCurrentUser}>
                  {addingCurrentUser ? t('gameUsers.addingMe') : t('gameUsers.addMeAsPlayer')}
                </Button>
                {addCurrentUserError && (<p id="game-players-add-me-error" className="text-sm text-destructive">{addCurrentUserError}</p>)}
              </div>)}
          </CardHeader>
        </Card>) : (<>
          <div id="game-players-toolbar" className="game-players-toolbar flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <p id="game-players-result-summary" className="game-players-result-summary text-sm text-muted-foreground">
              {progressList.length} / {totalCount} {t('gameUsers.playersFound')}
              {searchQuery && ` ${t('gameUsers.forQuery')} "${searchQuery}"`}
            </p>
            <div id="game-players-search-controls" className="game-players-search-controls flex w-full flex-col gap-2 sm:w-auto">
              {game && <div id="game-players-allow-new-players-setting" className="game-players-allow-new-players-setting flex items-center gap-2 self-start px-2 py-1 sm:self-end">
                <div id="game-players-allow-new-players-header" className="game-players-allow-new-players-header flex items-center gap-2">
                  <div id="game-players-allow-new-players-copy" className="game-players-allow-new-players-copy">
                    <p id="game-players-allow-new-players-label" className="game-players-allow-new-players-label whitespace-nowrap text-xs font-medium">{t('gameUsers.allowNewPlayers')}</p>
                  </div>
                  <Switch id="game-players-allow-new-players-switch" className="game-players-allow-new-players-switch" checked={game.settings?.allow_new_players ?? false} onCheckedChange={handleAllowNewPlayersChange} disabled={updatingAllowNewPlayers}/>
                </div>
                {allowNewPlayersError && <p id="game-players-allow-new-players-error" className="game-players-allow-new-players-error text-xs text-destructive">{allowNewPlayersError}</p>}
                <div id="game-players-setting-action" className="game-players-setting-action grid h-7 shrink-0 items-center">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button id="game-players-allow-new-players-help" type="button" variant="ghost" size="icon" aria-label={t('gameUsers.allowNewPlayersDescription')} className={`game-players-allow-new-players-help col-start-1 row-start-1 h-7 w-7 ${(game.settings?.allow_new_players ?? false) ? "" : "invisible"}`}>
                          <CircleHelp id="game-players-allow-new-players-help-icon" className="h-3.5 w-3.5"/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent id="game-players-allow-new-players-description" side="top" className="game-players-allow-new-players-description max-w-xs text-xs">
                        {t('gameUsers.allowNewPlayersDescription')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button id="game-players-add-player-button" type="button" size="sm" aria-hidden={game.settings?.allow_new_players ?? false} tabIndex={(game.settings?.allow_new_players ?? false) ? -1 : undefined} className={`game-players-add-player-button col-start-1 row-start-1 h-7 gap-1 px-2 text-xs ${(game.settings?.allow_new_players ?? false) ? "invisible" : ""}`} onClick={() => setIsAddPlayerPanelOpen(true)}>
                    <UserPlus id="game-players-add-player-icon" className="h-3.5 w-3.5"/>
                    {t('gameUsers.addPlayer')}
                  </Button>
                </div>
              </div>}
            <div id="game-players-search-form" className="game-players-search-form flex items-center gap-1 w-full sm:w-auto">
              <div id="game-players-search-input-container" className="game-players-search-input-container relative grid flex-1 sm:flex-none">
                <span id="game-players-search-input-measure" className="game-players-search-input-measure invisible col-start-1 row-start-1 pl-8 pr-3 h-8 text-sm whitespace-pre pointer-events-none select-none border hidden sm:block" aria-hidden>
                  {t('gameUsers.searchPlaceholder')}
                </span>
                <Search id="game-players-search-input-icon" className="game-players-search-input-icon absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
                <Input id="game-players-search-input" placeholder={t('gameUsers.searchPlaceholder')} value={searchInput} onChange={(e) => handleSearchInput(e.target.value)} className="game-players-search-input col-start-1 row-start-1 pl-8 h-8 w-full text-sm"/>
              </div>
              {searchQuery && (<Button id="game-players-clear-search-button" type="button" variant="outline" size="icon" className="game-players-clear-search-button h-8 w-8 shrink-0" onClick={handleClearSearch}>
                  ×
                </Button>)}
              <Button id="game-players-refresh-button" type="button" variant="outline" size="icon" className="game-players-refresh-button h-8 w-8 shrink-0" onClick={() => loadData(searchQuery || undefined)} disabled={loading}>
                <RefreshCw id="game-players-refresh-icon" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
              </Button>
            </div>
            </div>
          </div>
          <div id="game-players-list" className="game-players-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressList.map((item) => {
                const identity = playerIdentityMap[item.user_id];
                return (<Card id={`game-players-card-${item.id}`} key={item.id} className="game-players-card">
              <CardHeader id={`game-players-card-header-${item.id}`} className="game-players-card-header pb-3">
                <div id={`game-players-card-summary-${item.id}`} className="game-players-card-summary flex items-start justify-between gap-2">
                  <div id={`game-players-card-identity-${item.id}`} className="game-players-card-identity flex flex-col gap-1 min-w-0 flex-1">
                    <CardTitle id={`game-players-card-name-${item.id}`} className="game-players-card-name text-base flex items-center gap-2">
                      <User id={`game-players-card-user-icon-${item.id}`} className="h-4 w-4 shrink-0"/>
                      <span id={`game-players-card-display-name-${item.id}`} className="game-players-card-display-name truncate">{identity?.display_name || item.user_display_name || t('gameUsers.unknown')}</span>
                    </CardTitle>
                    <p id={`game-players-card-email-${item.id}`} className="game-players-card-email text-xs text-muted-foreground truncate">{identity?.masked_email || "***@saigame.studio"}</p>
                    <p id={`game-players-card-gamer-${item.id}`} className="game-players-card-gamer text-xs text-muted-foreground truncate">{t('gameUsers.gamer')}: {identity?.gamer_name || "-"}</p>
                    <p id={`game-players-card-user-id-${item.id}`} className="game-players-card-user-id text-xs text-muted-foreground font-mono flex items-center min-w-0"><span id={`game-players-card-user-id-text-${item.id}`} className="game-players-card-user-id-text truncate">{t('gameUsers.userId')}: {item.user_id}</span><CopyButton text={item.user_id}/></p>
                    <p id={`game-players-card-progress-id-${item.id}`} className="game-players-card-progress-id text-xs text-muted-foreground font-mono flex items-center min-w-0"><span id={`game-players-card-progress-id-text-${item.id}`} className="game-players-card-progress-id-text truncate">{t('gameUsers.progressId')}: {item.id}</span><CopyButton text={item.id}/></p>
                  </div>
                  <div id={`game-players-card-badges-${item.id}`} className="game-players-card-badges flex items-center gap-2 shrink-0">
                    {item.banned_at && <Badge id={`game-players-card-banned-${item.id}`} className="game-players-card-banned" variant="destructive">{t('gameUsers.banned')}</Badge>}
                    <Badge id={`game-players-card-version-${item.id}`} className="game-players-card-version" variant="secondary">v{item.version}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent id={`game-players-card-content-${item.id}`} className="game-players-card-content space-y-3">
                <div id={`game-players-card-stats-${item.id}`} className="game-players-card-stats grid grid-cols-3 gap-2 text-center">
                  <div id={`game-players-card-level-${item.id}`} className="game-players-card-stat flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Star id={`game-players-card-level-icon-${item.id}`} className="h-4 w-4 text-yellow-500"/>
                    <span id={`game-players-card-level-label-${item.id}`} className="game-players-card-stat-label text-xs text-muted-foreground">{t('gameUsers.level')}</span>
                    <span id={`game-players-card-level-value-${item.id}`} className="game-players-card-stat-value font-semibold text-sm">{item.level}</span>
                  </div>
                  <div id={`game-players-card-exp-${item.id}`} className="game-players-card-stat flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Trophy id={`game-players-card-exp-icon-${item.id}`} className="h-4 w-4 text-blue-500"/>
                    <span id={`game-players-card-exp-label-${item.id}`} className="game-players-card-stat-label text-xs text-muted-foreground">{t('gameUsers.exp')}</span>
                    <span id={`game-players-card-exp-value-${item.id}`} className="game-players-card-stat-value font-semibold text-sm">{item.experience}</span>
                  </div>
                  <div id={`game-players-card-gold-${item.id}`} className="game-players-card-stat flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Coins id={`game-players-card-gold-icon-${item.id}`} className="h-4 w-4 text-amber-500"/>
                    <span id={`game-players-card-gold-label-${item.id}`} className="game-players-card-stat-label text-xs text-muted-foreground">{t('gameUsers.gold')}</span>
                    <span id={`game-players-card-gold-value-${item.id}`} className="game-players-card-stat-value font-semibold text-sm">{item.gold}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between items-center gap-3 flex-wrap">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate">{t('gameUsers.joined')}: {formatTimestamp(item.user_created_at)}</span>
                    <span className="truncate">{t('gameUsers.updated')}: {formatTimestamp(item.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="icon" title={t('gameUsers.sendMail')}>
                      <Link href={`/games/${gameId}/mailbox?userId=${item.id}`}>
                        <Mail className="h-4 w-4"/>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="icon" title={t('common.viewDetails')}>
                      <Link href={`/games/${gameId}/players/${item.id}`}>
                        <Eye className="h-4 w-4"/>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>);
            })}
          </div>
        </>)}
      <Sheet open={isAddPlayerPanelOpen} onOpenChange={setIsAddPlayerPanelOpen}>
        <SheetContent id="game-players-add-player-panel" side="right" className="flex h-full w-full flex-col overflow-hidden sm:max-w-xl">
          <SheetHeader id="game-players-add-player-header" className="shrink-0">
            <SheetTitle>{t('gameUsers.addPlayer')}</SheetTitle>
            <SheetDescription>{t('gameUsers.addPlayerDescription')}</SheetDescription>
          </SheetHeader>
          <form id="game-players-add-player-form" className="shrink-0" onSubmit={handleAddPlayer}>
            <div id="game-players-add-player-fields" className="py-4">
              <Textarea id="game-players-add-player-email-input" value={playerEmails} onChange={(event) => { setPlayerEmails(event.target.value); setAddPlayerResults([]); }} placeholder={t('gameUsers.emailListPlaceholder')} autoComplete="email" required disabled={addingPlayer} rows={6} className="resize-y"/>
              <p id="game-players-add-player-hint" className="mt-2 text-xs text-muted-foreground">{t('gameUsers.emailListHint')}</p>
            </div>
            <div id="game-players-add-player-footer" className="flex justify-end gap-2">
              <Button id="game-players-add-player-cancel" type="button" variant="outline" onClick={() => setIsAddPlayerPanelOpen(false)} disabled={addingPlayer}>{t('gameUsers.cancel')}</Button>
              <Button id="game-players-add-player-submit" type="submit" disabled={addingPlayer}>{addingPlayer ? t('gameUsers.addingPlayer') : t('gameUsers.addPlayer')}</Button>
            </div>
          </form>
          {addPlayerResults.length > 0 && <div id="game-players-add-player-results-panel" className="mt-6 flex min-h-0 flex-1 flex-col">
          <div id="game-players-add-player-results-header" className="shrink-0">
            <p id="game-players-add-player-results-title" className="font-medium">{t('gameUsers.addPlayerResults')}</p>
            <p id="game-players-add-player-results-description" className="text-sm text-muted-foreground">{t('gameUsers.addPlayerResultsDescription')}</p>
          </div>
          <p id="game-players-add-player-results-summary" className="shrink-0 text-sm text-muted-foreground">
            {addPlayerResults.filter((result) => result.status === "success").length} {t('gameUsers.addPlayerSuccessCount')} · {addPlayerResults.filter((result) => result.status === "error").length} {t('gameUsers.addPlayerErrorCount')} · {addPlayerResults.length} {t('gameUsers.addPlayerTotalCount')}
          </p>
          <div id="game-players-add-player-results-list" className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
            {addPlayerResults.map((result, index) => <div id={`game-players-add-player-result-${index}`} key={`${result.email}-${index}`} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${result.status === "success" ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400" : result.status === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-muted bg-muted/50 text-muted-foreground"}`}>
              {result.status === "success" ? <CheckCircle2 id={`game-players-add-player-result-success-${index}`} className="h-4 w-4 shrink-0"/> : result.status === "error" ? <XCircle id={`game-players-add-player-result-error-${index}`} className="h-4 w-4 shrink-0"/> : <RefreshCw id={`game-players-add-player-result-pending-${index}`} className="h-4 w-4 shrink-0 animate-spin"/>}
              <span id={`game-players-add-player-result-email-${index}`} className="min-w-0 truncate">{result.email}</span>
              {result.message && <span id={`game-players-add-player-result-message-${index}`} className="min-w-0 truncate text-xs">{result.message}</span>}
            </div>)}
          </div>
          </div>}
        </SheetContent>
      </Sheet>
    </div>);
}
