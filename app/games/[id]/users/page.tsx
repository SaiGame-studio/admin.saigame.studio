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
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { GameNavButtons } from "@/components/GameNavButtons";
import { CopyButton } from "@/components/CopyButton";
export default function GameUserProfilesPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = React.use(params);
    const gameId = id;
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const [progressList, setProgressList] = useState<GameProgress[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [playerIdentityMap, setPlayerIdentityMap] = useState<Record<string, PlayerIdentity>>({});
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
    return (<div className="container mx-auto py-6">
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

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/games/${gameId}`}><ArrowLeft className="h-4 w-4"/></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('gameUsers.players')}{game ? ` - ${game.name}` : ""}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {game?.limits?.max_player_profiles != null
            ? (() => {
                const used = totalCount;
                const max = game.limits.max_player_profiles;
                const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
                return (<>
                        <span className={used >= max ? "text-destructive font-medium" : ""}>
                          {used.toLocaleString()} / {max.toLocaleString()} players
                        </span>
                        <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                          <span className={`block h-full rounded-full transition-all ${used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
                        </span>
                        <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title="Manage plugins / raise limits">
                          <Hammer className="h-3.5 w-3.5"/>
                        </Link>
                      </>);
            })()
            : <span>{totalCount.toLocaleString()} players registered</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" size="icon" onClick={() => loadData(searchQuery || undefined)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
          </Button>
          <div className="w-px h-6 bg-border"/>
          <GameNavButtons gameId={gameId} active="users"/>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input placeholder={t('gameUsers.searchPlaceholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9"/>
        </div>
        <Button type="submit" variant="default" size="default">
          {t('gameUsers.search')}
        </Button>
        {searchQuery && (<Button type="button" variant="outline" size="default" onClick={handleClearSearch}>
            {t('gameUsers.clear')}
          </Button>)}
      </form>

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
        </Card>) : progressList.length === 0 ? (<Card className="text-center p-6">
          <CardHeader>
            <User className="mx-auto h-12 w-12 text-muted-foreground"/>
            <CardTitle className="mt-4">{t('gameUsers.noPlayers')}</CardTitle>
            {searchQuery && (<p className="text-muted-foreground mt-2">
                {t('gameUsers.noResults')} &quot;{searchQuery}&quot;.{" "}
                <button className="text-primary hover:underline" onClick={handleClearSearch}>
                  {t('gameUsers.clearSearch')}
                </button>
              </p>)}
          </CardHeader>
        </Card>) : (<>
          <p className="text-sm text-muted-foreground mb-3">
            {progressList.length} / {totalCount} {t('gameUsers.playersFound')}
            {searchQuery && ` ${t('gameUsers.forQuery')} "${searchQuery}"`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressList.map((item) => {
                const identity = playerIdentityMap[item.user_id];
                return (<Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4"/>
                      {identity?.display_name || item.user_display_name || t('gameUsers.unknown')}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{identity?.masked_email || "***@saigame.studio"}</p>
                    <p className="text-xs text-muted-foreground">{t('gameUsers.gamer')}: {identity?.gamer_name || "-"}</p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center">{t('gameUsers.userId')}: {item.user_id}<CopyButton text={item.user_id}/></p>
                    <p className="text-xs text-muted-foreground font-mono flex items-center">{t('gameUsers.progressId')}: {item.id}<CopyButton text={item.id}/></p>
                  </div>
                  <div className="flex items-center gap-2">
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

                <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span>{t('gameUsers.joined')}: {formatTimestamp(item.user_created_at)}</span>
                    <span>{t('gameUsers.updated')}: {formatTimestamp(item.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" title={t('common.viewDetails')}>
                      <Link href={`/games/${gameId}/players/${item.id}`}>
                        <Eye className="h-4 w-4"/>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="icon" title={t('gameUsers.sendMail')}>
                      <Link href={`/games/${gameId}/mailbox?userId=${item.user_id}`}>
                        <Mail className="h-4 w-4"/>
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
