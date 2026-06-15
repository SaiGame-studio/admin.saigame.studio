"use client";
import { useState, useCallback } from "react";
import { getLLMTokenStats, getAllUsersAdmin, type AdminUser, type LLMTokenStatsFilterMode, type LLMTokenStatsPeriod, type LLMTokenStatsResult, } from "@/lib/admin-api";
import { getGame } from "@/lib/game-api";
import { fetchStudio } from "@/lib/studio-api";
import type { Game } from "@/types/game";
import type { Studio } from "@/types/studio";
import Link from "next/link";
import { Search, Loader2, ExternalLink, User, Gamepad2, Building2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { TokenStatsResultTabs } from "@/components/token-stats-result-tabs";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ---------------------------------------------------------------------------
// Entity detail types
// ---------------------------------------------------------------------------
type EntityDetailState = {
    mode: "user_id";
    user: AdminUser;
} | {
    mode: "game_id";
    game: Game;
} | {
    mode: "studio_id";
    studio: Studio;
};
// ---------------------------------------------------------------------------
// Entity detail card
// ---------------------------------------------------------------------------
function EntityDetailCard({ detail, t, }: {
    detail: EntityDetailState;
    t: ReturnType<typeof useTranslation>["t"];
}) {
    if (detail.mode === "user_id") {
        const { user } = detail;
        return (<Card id="token-stats-entity-card">
        <CardHeader id="token-stats-entity-header" className="pb-3">
          <CardTitle id="token-stats-entity-title" className="text-base flex items-center gap-2">
            <User id="token-stats-entity-icon" className="h-4 w-4 text-muted-foreground"/>
            {t("tokenStats.entityDetailTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent id="token-stats-entity-content">
          <div id="token-stats-entity-user-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div id="token-stats-entity-user-displayname">
              <p id="token-stats-entity-user-displayname-label" className="text-xs text-muted-foreground">{t("tokenStats.entityDisplayName")}</p>
              <p id="token-stats-entity-user-displayname-val" className="font-medium">{user.display_name || "—"}</p>
            </div>
            <div id="token-stats-entity-user-username">
              <p id="token-stats-entity-user-username-label" className="text-xs text-muted-foreground">{t("tokenStats.entityUsername")}</p>
              <p id="token-stats-entity-user-username-val" className="font-mono">{user.username || "—"}</p>
            </div>
            <div id="token-stats-entity-user-email">
              <p id="token-stats-entity-user-email-label" className="text-xs text-muted-foreground">{t("tokenStats.entityEmail")}</p>
              <p id="token-stats-entity-user-email-val" className="font-mono text-xs truncate">{user.email || "—"}</p>
            </div>
            <div id="token-stats-entity-user-status">
              <p id="token-stats-entity-user-status-label" className="text-xs text-muted-foreground">{t("tokenStats.entityActive")}</p>
              <Badge id="token-stats-entity-user-status-badge" variant={user.is_active ? "default" : "secondary"}>
                {user.is_active ? t("tokenStats.entityActive") : t("tokenStats.entityInactive")}
              </Badge>
            </div>
            <div id="token-stats-entity-user-verified">
              <p id="token-stats-entity-user-verified-label" className="text-xs text-muted-foreground">{t("tokenStats.entityVerified")}</p>
              <Badge id="token-stats-entity-user-verified-badge" variant={user.is_verified ? "default" : "outline"}>
                {user.is_verified ? t("tokenStats.entityVerified") : t("tokenStats.entityUnverified")}
              </Badge>
            </div>
            <div id="token-stats-entity-user-lastlogin">
              <p id="token-stats-entity-user-lastlogin-label" className="text-xs text-muted-foreground">{t("tokenStats.entityLastLogin")}</p>
              <p id="token-stats-entity-user-lastlogin-val" className="text-xs">
                {user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-GB") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>);
    }
    if (detail.mode === "game_id") {
        const { game } = detail;
        return (<Card id="token-stats-entity-card">
        <CardHeader id="token-stats-entity-header" className="pb-3">
          <CardTitle id="token-stats-entity-title" className="text-base flex items-center gap-2">
            <Gamepad2 id="token-stats-entity-icon" className="h-4 w-4 text-muted-foreground"/>
            {t("tokenStats.entityDetailTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent id="token-stats-entity-content">
          <div id="token-stats-entity-game-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <div id="token-stats-entity-game-name">
              <p id="token-stats-entity-game-name-label" className="text-xs text-muted-foreground">{t("tokenStats.entityName")}</p>
              <p id="token-stats-entity-game-name-val" className="font-medium">{game.name}</p>
            </div>
            <div id="token-stats-entity-game-type">
              <p id="token-stats-entity-game-type-label" className="text-xs text-muted-foreground">{t("tokenStats.entityGameType")}</p>
              <p id="token-stats-entity-game-type-val" className="font-mono text-xs">{game.game_type || "—"}</p>
            </div>
            <div id="token-stats-entity-game-studio">
              <p id="token-stats-entity-game-studio-label" className="text-xs text-muted-foreground">{t("tokenStats.entityStudioRef")}</p>
              <Link id="token-stats-entity-game-studio-link" href={`/studios/${game.studio_id}`} className="text-xs font-mono hover:underline flex items-center gap-1">
                <ExternalLink id="token-stats-entity-game-studio-icon" className="h-3 w-3"/>
                {game.studio_id}
              </Link>
            </div>
            <div id="token-stats-entity-game-status">
              <p id="token-stats-entity-game-status-label" className="text-xs text-muted-foreground">{t("tokenStats.entityActive")}</p>
              <Badge id="token-stats-entity-game-status-badge" variant={game.is_active ? "default" : "secondary"}>
                {game.is_active ? t("tokenStats.entityActive") : t("tokenStats.entityInactive")}
              </Badge>
            </div>
            <div id="token-stats-entity-game-created">
              <p id="token-stats-entity-game-created-label" className="text-xs text-muted-foreground">{t("tokenStats.entityCreatedAt")}</p>
              <p id="token-stats-entity-game-created-val" className="text-xs">
                {game.created_at ? new Date(game.created_at * 1000).toLocaleDateString("en-GB") : "—"}
              </p>
            </div>
            <div id="token-stats-entity-game-view">
              <p id="token-stats-entity-game-view-label" className="text-xs text-muted-foreground">&nbsp;</p>
              <Link id="token-stats-entity-game-view-link" href={`/games/${game.id}`} className="text-xs flex items-center gap-1 hover:underline text-primary">
                <ExternalLink id="token-stats-entity-game-view-icon" className="h-3 w-3"/>
                {t("tokenStats.entityViewLink")}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>);
    }
    // studio_id
    const { studio } = detail;
    return (<Card id="token-stats-entity-card">
      <CardHeader id="token-stats-entity-header" className="pb-3">
        <CardTitle id="token-stats-entity-title" className="text-base flex items-center gap-2">
          <Building2 id="token-stats-entity-icon" className="h-4 w-4 text-muted-foreground"/>
          {t("tokenStats.entityDetailTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent id="token-stats-entity-content">
        <div id="token-stats-entity-studio-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div id="token-stats-entity-studio-name">
            <p id="token-stats-entity-studio-name-label" className="text-xs text-muted-foreground">{t("tokenStats.entityName")}</p>
            <p id="token-stats-entity-studio-name-val" className="font-medium">{studio.name}</p>
          </div>
          <div id="token-stats-entity-studio-tier">
            <p id="token-stats-entity-studio-tier-label" className="text-xs text-muted-foreground">{t("tokenStats.entityTier")}</p>
            <p id="token-stats-entity-studio-tier-val" className="font-mono text-xs">{studio.tier || "—"}</p>
          </div>
          <div id="token-stats-entity-studio-gamecount">
            <p id="token-stats-entity-studio-gamecount-label" className="text-xs text-muted-foreground">{t("tokenStats.entityGameCount")}</p>
            <p id="token-stats-entity-studio-gamecount-val" className="font-medium">{studio.game_count}</p>
          </div>
          <div id="token-stats-entity-studio-owner">
            <p id="token-stats-entity-studio-owner-label" className="text-xs text-muted-foreground">{t("tokenStats.entityOwnerID")}</p>
            <p id="token-stats-entity-studio-owner-val" className="font-mono text-xs truncate">{studio.owner_user_id}</p>
          </div>
          <div id="token-stats-entity-studio-status">
            <p id="token-stats-entity-studio-status-label" className="text-xs text-muted-foreground">{t("tokenStats.entityActive")}</p>
            <Badge id="token-stats-entity-studio-status-badge" variant={studio.is_active ? "default" : "secondary"}>
              {studio.is_active ? t("tokenStats.entityActive") : t("tokenStats.entityInactive")}
            </Badge>
          </div>
          <div id="token-stats-entity-studio-view">
            <p id="token-stats-entity-studio-view-label" className="text-xs text-muted-foreground">&nbsp;</p>
            <Link id="token-stats-entity-studio-view-link" href={`/studios/${studio.id}`} className="text-xs flex items-center gap-1 hover:underline text-primary">
              <ExternalLink id="token-stats-entity-studio-view-icon" className="h-3 w-3"/>
              {t("tokenStats.entityViewLink")}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>);
}
// ---------------------------------------------------------------------------
// Main exported tab
// ---------------------------------------------------------------------------
export function TokenStatsTab() {
    const { t } = useTranslation();
    const [filterMode, setFilterMode] = useState<LLMTokenStatsFilterMode>("game_id");
    const [period, setPeriod] = useState<LLMTokenStatsPeriod>("daily");
    const [idValue, setIdValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<LLMTokenStatsResult | null>(null);
    const [entityDetail, setEntityDetail] = useState<EntityDetailState | null>(null);
    const showIdInput = filterMode !== "all";
    const handleSearch = useCallback(async () => {
        const trimmedId = idValue.trim();
        if (!period) {
            setError(t("tokenStats.errorMissingPeriod"));
            return;
        }
        if (showIdInput && !trimmedId) {
            setError(t("tokenStats.errorMissingFilter"));
            return;
        }
        if (showIdInput && !UUID_REGEX.test(trimmedId)) {
            setError(t("tokenStats.errorInvalidUUID"));
            return;
        }
        setError(null);
        setResult(null);
        setEntityDetail(null);
        setLoading(true);
        try {
            const statsId = showIdInput ? trimmedId : undefined;
            const [statsResult, entityResult] = await Promise.allSettled([
                getLLMTokenStats(period, filterMode, statsId),
                (async (): Promise<EntityDetailState | null> => {
                    if (filterMode === "all") {
                        return null;
                    }
                    if (filterMode === "user_id") {
                        const res = await getAllUsersAdmin({ id: trimmedId, page_size: 1 });
                        if (res.users.length > 0)
                            return { mode: "user_id", user: res.users[0] };
                        return null;
                    }
                    if (filterMode === "game_id") {
                        const game = await getGame(trimmedId);
                        return { mode: "game_id", game };
                    }
                    if (filterMode === "studio_id") {
                        const studio = await fetchStudio(trimmedId);
                        return { mode: "studio_id", studio };
                    }
                    return null;
                })(),
            ]);
            if (statsResult.status === "fulfilled") {
                setResult(statsResult.value);
            }
            else {
                setError(String(statsResult.reason));
            }
            if (entityResult.status === "fulfilled" && entityResult.value) {
                setEntityDetail(entityResult.value);
            }
        }
        finally {
            setLoading(false);
        }
    }, [period, filterMode, idValue, showIdInput, t]);
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter")
            handleSearch();
    }, [handleSearch]);
    return (<div id="token-stats-tab-root" className="space-y-6">
      {/* Page header */}
      <div id="token-stats-tab-header">
        <h2 id="token-stats-tab-title" className="text-lg font-semibold">
          {t("tokenStats.title")}
        </h2>
        <p id="token-stats-tab-desc" className="text-sm text-muted-foreground">
          {t("tokenStats.description")}
        </p>
      </div>

      {/* Filter bar */}
      <Card id="token-stats-filter-card">
        <CardContent id="token-stats-filter-content" className="pt-6">
          <div id="token-stats-filter-row" className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            {/* Filter mode */}
            <div id="token-stats-filter-mode-group" className="space-y-2">
              <Label id="token-stats-filter-mode-label" className="text-xs font-medium uppercase tracking-wide">
                {t("tokenStats.filterMode")}
              </Label>
              <RadioGroup id="token-stats-filter-mode-radio" value={filterMode} onValueChange={(v: string) => {
            setFilterMode(v as LLMTokenStatsFilterMode);
            setResult(null);
            setError(null);
            setEntityDetail(null);
        }} className="flex gap-4">
                <div id="token-stats-filter-mode-studio" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-studio" value="studio_id"/>
                  <Label id="token-stats-radio-studio-label" htmlFor="token-stats-radio-studio">
                    {t("tokenStats.filterStudio")}
                  </Label>
                </div>
                <div id="token-stats-filter-mode-game" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-game" value="game_id"/>
                  <Label id="token-stats-radio-game-label" htmlFor="token-stats-radio-game">
                    {t("tokenStats.filterGame")}
                  </Label>
                </div>
                <div id="token-stats-filter-mode-user" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-user" value="user_id"/>
                  <Label id="token-stats-radio-user-label" htmlFor="token-stats-radio-user">
                    {t("tokenStats.filterUser")}
                  </Label>
                </div>
                <div id="token-stats-filter-mode-all" className="flex items-center gap-1.5">
                  <RadioGroupItem id="token-stats-radio-all" value="all"/>
                  <Label id="token-stats-radio-all-label" htmlFor="token-stats-radio-all">
                    {t("tokenStats.filterAll")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Period */}
            <div id="token-stats-period-group" className="space-y-2">
              <Label id="token-stats-period-label" className="text-xs font-medium uppercase tracking-wide">
                {t("tokenStats.period")}
              </Label>
              <Select value={period} onValueChange={(v: string) => {
            setPeriod(v as LLMTokenStatsPeriod);
            setResult(null);
            setError(null);
        }}>
                <SelectTrigger id="token-stats-period-trigger" className="w-36">
                  <SelectValue id="token-stats-period-value"/>
                </SelectTrigger>
                <SelectContent id="token-stats-period-content">
                  <SelectItem id="token-stats-period-hourly" value="hourly">
                    {t("tokenStats.periodHourly")}
                  </SelectItem>
                  <SelectItem id="token-stats-period-daily" value="daily">
                    {t("tokenStats.periodDaily")}
                  </SelectItem>
                  <SelectItem id="token-stats-period-weekly" value="weekly">
                    {t("tokenStats.periodWeekly")}
                  </SelectItem>
                  <SelectItem id="token-stats-period-monthly" value="monthly">
                    {t("tokenStats.periodMonthly")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* UUID input + search */}
            {showIdInput ? (<div id="token-stats-id-group" className="flex-1 space-y-2">
              <Label id="token-stats-id-label" className="text-xs font-medium uppercase tracking-wide">
                ID
              </Label>
              <div id="token-stats-id-row" className="flex gap-2">
                <Input id="token-stats-id-input" placeholder={t("tokenStats.idPlaceholder")} value={idValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setIdValue(e.target.value);
            setError(null);
            setEntityDetail(null);
        }} onKeyDown={handleKeyDown} className="font-mono text-sm"/>
              </div>
            </div>) : (<div id="token-stats-scope-group" className="flex-1 space-y-2">
              <Label id="token-stats-scope-label" className="text-xs font-medium uppercase tracking-wide">
                {t("tokenStats.scope")}
              </Label>
              <div id="token-stats-scope-all-wrap" className="flex h-10 items-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3">
                <span id="token-stats-scope-all-text" className="text-sm text-muted-foreground">
                  {t("tokenStats.scopeAll")}
                </span>
              </div>
            </div>)}
            <div id="token-stats-search-actions" className="flex items-end">
              <Button id="token-stats-search-btn" onClick={handleSearch} disabled={loading} className="flex items-center gap-1.5 shrink-0">
                {loading ? (<Loader2 id="token-stats-search-spinner" className="h-4 w-4 animate-spin"/>) : (<Search id="token-stats-search-icon" className="h-4 w-4"/>)}
                {t("tokenStats.searchBtn")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (<Card id="token-stats-error-card" className="border-destructive/50">
          <CardContent id="token-stats-error-content" className="pt-4 text-destructive text-sm">
            {error}
          </CardContent>
        </Card>)}

      {/* Loading skeleton */}
      {loading && (<div id="token-stats-skeleton-root" className="space-y-4">
          <div id="token-stats-skeleton-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton id="token-stats-skeleton-card-1" className="h-20"/>
            <Skeleton id="token-stats-skeleton-card-2" className="h-20"/>
            <Skeleton id="token-stats-skeleton-card-3" className="h-20"/>
          </div>
          <Skeleton id="token-stats-skeleton-chart" className="h-[320px] w-full"/>
          <Skeleton id="token-stats-skeleton-table" className="h-48 w-full"/>
        </div>)}

      {/* Results */}
      {!loading && result && (<div id="token-stats-results-root" className="space-y-6">
          {entityDetail && (<EntityDetailCard detail={entityDetail} t={t}/>)}
          <TokenStatsResultTabs result={result} t={t}/>
        </div>)}
    </div>);
}
