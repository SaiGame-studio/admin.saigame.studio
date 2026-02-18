"use client"

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";
import { getGameProgressList, GameProgress, banProgress, unbanProgress, getPlayerIdentityMapByUserIds, PlayerIdentity } from "@/lib/game-user-api";
import { getGame } from "@/lib/game-api";
import { formatTimestamp } from "@/lib/utils/date-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, User, Trophy, Coins, Star, ShieldBan, ShieldCheck, Loader2 } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function GameUserProfilesPage({ params }: { params: { id: string } }) {
  const gameId = params.id;
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);
  const [progressList, setProgressList] = useState<GameProgress[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [banningIds, setBanningIds] = useState<Set<string>>(new Set());
  const [playerIdentityMap, setPlayerIdentityMap] = useState<Record<string, PlayerIdentity>>({});

  const loadData = useCallback(async (displayName?: string) => {
    try {
      setLoading(true);
      const [progressRes, gameRes] = await Promise.all([
        getGameProgressList(gameId, displayName ? { display_name: displayName } : undefined),
        game ? Promise.resolve(game) : getGame(gameId),
      ]);
      const identityMap = await getPlayerIdentityMapByUserIds(
        progressRes.progress.map((item) => item.user_id),
        progressRes.progress.map((item) => ({
          user_id: item.user_id,
          user_display_name: item.user_display_name,
          user_email: item.user_email,
        }))
      );
      setProgressList(progressRes.progress);
      setPlayerIdentityMap(identityMap);
      setTotalCount(progressRes.total_count);
      if (!game) setGame(gameRes);
      setError(null);
    } catch (err) {
      setError("Failed to load game progress data");
      console.error(err);
    } finally {
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

  return (
    <div className="container mx-auto py-6">
      {game && (
        <div className="mb-2">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink href={`/studios/${game.studio?.id}`}>{game.studio?.name || t('common.studio')}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/games/${game.id}`}>{game.name}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <span>Players</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Players {game ? `- ${game.name}` : ""}
          </h1>
          <p className="text-muted-foreground">
            {progressList.length} / {totalCount} player{totalCount !== 1 ? "s" : ""} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(searchQuery || undefined)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by display name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="default" size="default">
          Search
        </Button>
        {searchQuery && (
          <Button type="button" variant="outline" size="default" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </form>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => loadData()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : progressList.length === 0 ? (
        <Card className="text-center p-6">
          <CardHeader>
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">No players found</CardTitle>
            {searchQuery && (
              <p className="text-muted-foreground mt-2">
                No results for &quot;{searchQuery}&quot;.{" "}
                <button className="text-primary hover:underline" onClick={handleClearSearch}>
                  Clear search
                </button>
              </p>
            )}
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressList.map((item) => {
            const identity = playerIdentityMap[item.user_id];
            return (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {identity?.display_name || item.user_display_name || "Unknown"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{identity?.masked_email || "***@saigame.studio"}</p>
                    <p className="text-xs text-muted-foreground">Gamer: {identity?.gamer_name || "-"}</p>
                    <p className="text-xs text-muted-foreground font-mono">User ID: {item.user_id}</p>
                    <p className="text-xs text-muted-foreground font-mono">Progress ID: {item.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.banned_at && <Badge variant="destructive">Banned</Badge>}
                    <Badge variant="secondary">v{item.version}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">Level</span>
                    <span className="font-semibold text-sm">{item.level}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">EXP</span>
                    <span className="font-semibold text-sm">{item.experience}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Gold</span>
                    <span className="font-semibold text-sm">{item.gold}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span>Joined: {formatTimestamp(item.user_created_at)}</span>
                    <span>Updated: {formatTimestamp(item.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/games/${gameId}/users/${item.id}`}>{t('common.viewDetails')}</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={item.banned_at ? "outline" : "destructive"}
                          size="sm"
                          disabled={banningIds.has(item.id)}
                        >
                          {banningIds.has(item.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : item.banned_at ? (
                            <><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Unban</>
                          ) : (
                            <><ShieldBan className="h-3.5 w-3.5 mr-1" /> Ban</>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {item.banned_at ? "Unban" : "Ban"} player?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to {item.banned_at ? "unban" : "ban"}{" "}
                            <strong>{identity?.display_name || item.user_display_name || "this player"}</strong>?
                            {!item.banned_at && " This player will no longer be able to access the game."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className={!item.banned_at ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                            onClick={async () => {
                              setBanningIds(prev => new Set(prev).add(item.id));
                              try {
                                if (item.banned_at) {
                                  await unbanProgress(item.id);
                                } else {
                                  await banProgress(item.id);
                                }
                                setProgressList(prev =>
                                  prev.map(p => p.id === item.id ? { ...p, banned_at: p.banned_at ? null : new Date().toISOString() } : p)
                                );
                              } catch (err) {
                                console.error("Ban/unban failed", err);
                              } finally {
                                setBanningIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(item.id);
                                  return next;
                                });
                              }
                            }}
                          >
                            {item.banned_at ? "Unban" : "Ban"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 