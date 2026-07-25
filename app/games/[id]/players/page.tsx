"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getGameProgressList, GameProgress, getPlayerIdentityMapByUserIds, PlayerIdentity } from "@/lib/game-user-api";
import { getGame } from "@/lib/game-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, User, Trophy, Coins, Star, ArrowLeft, Hammer, Eye, Mail } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from '@/lib/i18n/use-translation';
import { GameNavButtons } from "@/components/GameNavButtons";
import { CopyButton } from "@/components/CopyButton";
import { createGamerProgress } from "@/lib/script-api";
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
    const [playerIdentityMap, setPlayerIdentityMap] = useState<Record<string, PlayerIdentity>>({});
    const [addingCurrentUser, setAddingCurrentUser] = useState(false);
    const [addCurrentUserError, setAddCurrentUserError] = useState<string | null>(null);
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
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        loadData(searchInput || undefined);
    };
    const handleClearSearch = () => {
        setSearchInput("");
        setSearchQuery("");
        loadData();
    };
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
    return (<div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {game && (<div className="mb-2">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink href="/studios">{game.studio?.name || t('common.studios')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <span>{t('gameUsers.players')}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>)}

      <div className="flex flex-col gap-4 mb-6 md:flex-row md:justify-between md:items-center md:gap-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href={`/games/${gameId}`}><ArrowLeft className="h-4 w-4"/></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
              {t('gameUsers.players')}{game ? ` - ${game.name}` : ""}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 flex-wrap text-sm">
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
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="players"/>
        </div>
      </div>

      {/* Content */}
      {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (<Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4"/>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full"/>
                <Skeleton className="h-4 w-2/3"/>
                <Skeleton className="h-4 w-1/2"/>
              </CardContent>
            </Card>))}
        </div>) : error ? (<Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => loadData()}>
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
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {progressList.length} / {totalCount} {t('gameUsers.playersFound')}
              {searchQuery && ` ${t('gameUsers.forQuery')} "${searchQuery}"`}
            </p>
            <form onSubmit={handleSearch} className="flex items-center gap-1 w-full sm:w-auto">
              <div className="relative grid flex-1 sm:flex-none">
                <span className="invisible col-start-1 row-start-1 pl-8 pr-3 h-8 text-sm whitespace-pre pointer-events-none select-none border hidden sm:block" aria-hidden>
                  {t('gameUsers.searchPlaceholder')}
                </span>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
                <Input placeholder={t('gameUsers.searchPlaceholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="col-start-1 row-start-1 pl-8 h-8 w-full text-sm"/>
              </div>
              <Button type="submit" variant="default" size="icon" className="h-8 w-8 shrink-0">
                <Search className="h-3.5 w-3.5"/>
              </Button>
              {searchQuery && (<Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleClearSearch}>
                  ×
                </Button>)}
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => loadData(searchQuery || undefined)} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
              </Button>
            </form>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressList.map((item) => {
                const identity = playerIdentityMap[item.user_id];
                return (<Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0"/>
                      <span className="truncate">{identity?.display_name || item.user_display_name || t('gameUsers.unknown')}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{identity?.masked_email || "***@saigame.studio"}</p>
                    <p className="text-xs text-muted-foreground truncate">{t('gameUsers.gamer')}: {identity?.gamer_name || "-"}</p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center min-w-0"><span className="truncate">{t('gameUsers.userId')}: {item.user_id}</span><CopyButton text={item.user_id}/></p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center min-w-0"><span className="truncate">{t('gameUsers.progressId')}: {item.id}</span><CopyButton text={item.id}/></p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.banned_at && <Badge variant="destructive">{t('gameUsers.banned')}</Badge>}
                    <Badge variant="secondary">v{item.version}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Star className="h-4 w-4 text-yellow-500"/>
                    <span className="text-xs text-muted-foreground">{t('gameUsers.level')}</span>
                    <span className="font-semibold text-sm">{item.level}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Trophy className="h-4 w-4 text-blue-500"/>
                    <span className="text-xs text-muted-foreground">{t('gameUsers.exp')}</span>
                    <span className="font-semibold text-sm">{item.experience}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Coins className="h-4 w-4 text-amber-500"/>
                    <span className="text-xs text-muted-foreground">{t('gameUsers.gold')}</span>
                    <span className="font-semibold text-sm">{item.gold}</span>
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
    </div>);
}
