"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, Pencil, X } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n/use-translation";
import { GameNavButtons } from "@/components/GameNavButtons";
import { getGame, updateGame } from "@/lib/game-api";
import { ApiError } from "@/lib/api-client";
import type { Game } from "@/types/game";
import { useToast } from "@/hooks/use-toast";
import { ActiveCloneSessionsCard } from "./_components/ActiveCloneSessionsCard";
import { formatCloneCost, getCloneCostCurrencyMeta } from "./_components/sourceGameCloneUtils";
import { SourceGameTab } from "./_components/SourceGameTab";

type CloneTab = "clone-setting" | "from-another-game";
type TranslationFn = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

function getUpdateGameErrorMessage(error: unknown, t: TranslationFn, fallbackKey: string) {
  if (error instanceof ApiError) {
    const messageCode = typeof error.data?.message_code === "string" ? error.data.message_code.trim() : "";

    if (messageCode) {
      const translationKey = `cloneGame.errors.${messageCode}`;
      const translatedMessage = t(translationKey, error.data?.message_params);

      if (translatedMessage !== translationKey) {
        return translatedMessage;
      }
    }

    const rawMessage = typeof error.data?.message === "string"
      ? error.data.message
      : typeof error.data?.error === "string"
        ? error.data.error
        : error.message;

    if (rawMessage) {
      return rawMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t(fallbackKey);
}

export default function GameClonePage() {
  const params = useParams() as { id: string };
  const gameId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);
  const [shareLevelDraft, setShareLevelDraft] = useState<Game["share_level"]>("private");
  const [cloneCostDraft, setCloneCostDraft] = useState("7");
  const [cloneCostCurrencyDraft, setCloneCostCurrencyDraft] = useState<"sGem" | "sCoin">("sGem");
  const [editingCloneCost, setEditingCloneCost] = useState(false);
  const [savingShareStatus, setSavingShareStatus] = useState(false);
  const [savingCloneCost, setSavingCloneCost] = useState(false);

  const activeTab = (searchParams.get("tab") === "from-another-game" ? "from-another-game" : "clone-setting") as CloneTab;
  const parsedCloneCost = Number(cloneCostDraft);
  const cloneCostValue = Number.isFinite(parsedCloneCost) ? Math.trunc(parsedCloneCost) : (game?.clone_cost ?? 7);
  const cloneCostCurrencyLabel = getCloneCostCurrencyMeta(editingCloneCost ? cloneCostCurrencyDraft : game?.clone_cost_currency).label;

  useEffect(() => {
    if (!game) {
      return;
    }
    setShareLevelDraft(game.share_level ?? "private");
    setCloneCostDraft(String(game.clone_cost ?? 7));
    setCloneCostCurrencyDraft(getCloneCostCurrencyMeta(game.clone_cost_currency).code);
    setEditingCloneCost(false);
  }, [game]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setGameError(null);

      try {
        const gameData = await getGame(gameId);
        setGame(gameData);
      } catch {
        setGame(null);
        setGameError(t("cloneGame.loadGameError"));
      }

      setLoading(false);
    }

    void load();
  }, [gameId, t]);

  const updateTab = (nextTab: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    router.replace(`/games/${gameId}/clone?${nextParams.toString()}`, { scroll: false });
  };
  const buildTabHref = (nextTab: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    return `/games/${gameId}/clone?${nextParams.toString()}`;
  };

  const handleShareLevelChange = async (nextShareLevel: Game["share_level"]) => {
    if (!game) {
      return;
    }

    if (game.is_cloned_game && nextShareLevel === "public") {
      return;
    }

    const previousShareLevel = shareLevelDraft;
    if (nextShareLevel === previousShareLevel) {
      return;
    }

    setShareLevelDraft(nextShareLevel);
    setSavingShareStatus(true);
    try {
      const payload: { share_level: Game["share_level"]; clone_cost?: number; clone_cost_currency?: "sGem" | "sCoin" } = {
        share_level: nextShareLevel,
      };

      if (nextShareLevel === "public") {
        payload.clone_cost = Math.max(game.clone_cost ?? 7, 7);
        payload.clone_cost_currency = cloneCostCurrencyDraft;
      }

      const updated = await updateGame(game.id, {
        ...payload,
      }, { suppressToast: true });
      setGame(updated);
      setShareLevelDraft(updated.share_level ?? "private");
      setCloneCostDraft(String(updated.clone_cost ?? 7));
      setCloneCostCurrencyDraft(getCloneCostCurrencyMeta(updated.clone_cost_currency).code);
      toast({
        title: t("common.saved"),
        description: t("cloneGame.visibilitySaved"),
      });
    } catch (error) {
      setShareLevelDraft(previousShareLevel);
      toast({
        title: t("common.error"),
        description: getUpdateGameErrorMessage(error, t, "cloneGame.visibilitySaveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingShareStatus(false);
    }
  };

  const handleCloneCostSave = async () => {
    if (!game) {
      return;
    }

    if (shareLevelDraft !== "public") {
      return;
    }

    const parsedCloneCost = Number(cloneCostDraft);
    const normalizedCloneCost = Number.isFinite(parsedCloneCost) ? Math.trunc(parsedCloneCost) : NaN;
    const previousCloneCost = String(game.clone_cost ?? 7);
    const previousCloneCostCurrency = getCloneCostCurrencyMeta(game.clone_cost_currency).code;

    if (!Number.isFinite(normalizedCloneCost) || normalizedCloneCost < 7) {
      toast({
        title: t("common.error"),
        description: t("cloneGame.clonePriceMinError").replace("{unit}", cloneCostCurrencyLabel),
        variant: "destructive",
      });
      return;
    }

    setSavingCloneCost(true);
    try {
      const updated = await updateGame(game.id, {
        clone_cost: normalizedCloneCost,
        clone_cost_currency: cloneCostCurrencyDraft,
      }, { suppressToast: true });
      setGame(updated);
      setCloneCostDraft(String(updated.clone_cost ?? normalizedCloneCost));
      setCloneCostCurrencyDraft(getCloneCostCurrencyMeta(updated.clone_cost_currency).code);
      setEditingCloneCost(false);
      toast({
        title: t("common.saved"),
        description: t("cloneGame.clonePriceSaved"),
      });
    } catch (error) {
      setCloneCostDraft(previousCloneCost);
      setCloneCostCurrencyDraft(previousCloneCostCurrency);
      toast({
        title: t("common.error"),
        description: getUpdateGameErrorMessage(error, t, "cloneGame.clonePriceSaveFailed"),
        variant: "destructive",
      });
    } finally {
      setSavingCloneCost(false);
    }
  };

  if (loading) {
    return (
      <div id="clone-game-page-loading" className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <Card id="clone-game-loading-card">
          <CardContent id="clone-game-loading-content" className="flex items-center gap-3 py-8">
            <Loader2 id="clone-game-loading-icon" className="h-5 w-5 animate-spin text-muted-foreground" />
            <p id="clone-game-loading-text" className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div id="clone-game-page-error" className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <Card id="clone-game-error-card" className="border-destructive">
          <CardHeader id="clone-game-error-header">
            <CardTitle id="clone-game-error-title">{t("common.error")}</CardTitle>
            <CardDescription id="clone-game-error-description">{gameError ?? t("cloneGame.loadGameError")}</CardDescription>
          </CardHeader>
          <CardContent id="clone-game-error-content" className="flex flex-wrap gap-2">
            <Button id="clone-game-error-back-btn" variant="outline" asChild>
              <Link href={`/games/${gameId}`}>{t("common.back")}</Link>
            </Button>
            <Button id="clone-game-error-retry-btn" onClick={() => router.refresh()}>
              {t("common.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="clone-game-page" className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <div id="clone-game-breadcrumb-wrap" className="mb-2">
        <Breadcrumb id="clone-game-breadcrumb">
          <BreadcrumbList id="clone-game-breadcrumb-list" className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem id="clone-game-breadcrumb-studios-item">
              <BreadcrumbLink id="clone-game-breadcrumb-studios-link" href="/games">
                {t("common.games")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator id="clone-game-breadcrumb-separator-1">/</BreadcrumbSeparator>
            <BreadcrumbItem id="clone-game-breadcrumb-game-item">
              <BreadcrumbLink id="clone-game-breadcrumb-game-link" href={`/games/${gameId}`}>
                {game.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator id="clone-game-breadcrumb-separator-2">/</BreadcrumbSeparator>
            <BreadcrumbItem id="clone-game-breadcrumb-clone-item">
              <span id="clone-game-breadcrumb-clone-text">{t("cloneGame.title")}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div id="clone-game-header" className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div id="clone-game-header-main" className="flex items-center gap-3 min-w-0">
          <Button id="clone-game-back-btn" variant="outline" size="icon" asChild className="shrink-0">
            <Link href={`/games/${gameId}`}>
              <ArrowLeft id="clone-game-back-icon" className="h-4 w-4" />
            </Link>
          </Button>
          <div id="clone-game-header-copy" className="min-w-0">
            <div id="clone-game-header-title-row" className="flex items-center gap-2 flex-wrap">
              <h1 id="clone-game-title" className="text-2xl font-semibold tracking-tight">
                {t("cloneGame.title")}
              </h1>
              <Badge id="clone-game-status-badge" variant={game.is_active ? "default" : "destructive"} className={game.is_active ? "bg-green-600 hover:bg-green-600" : ""}>
                {game.is_active ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
          </div>
        </div>
        <div id="clone-game-nav-wrap" className="flex flex-col gap-2 items-start md:items-end">
          <GameNavButtons gameId={gameId} active="clone" id="clone-game-nav" />
        </div>
      </div>

      <Tabs id="clone-game-tabs" value={activeTab} onValueChange={updateTab} className="space-y-4">
        <TabsList id="clone-game-tabs-list">
          <TabsTrigger id="clone-game-tab-trigger-clone-setting" value="clone-setting" href={buildTabHref("clone-setting")}>
            {t("cloneGame.tabCloneSetting")}
          </TabsTrigger>
          <TabsTrigger id="clone-game-tab-trigger-from-another-game" value="from-another-game" href={buildTabHref("from-another-game")}>
            {t("cloneGame.tabFromAnotherGame")}
          </TabsTrigger>
        </TabsList>

        <TabsContent id="clone-game-tab-content-clone-setting" value="clone-setting" className="mt-0 space-y-4">
          <Card id="clone-game-current-card">
            <CardContent id="clone-game-current-card-content" className="p-4">
              <div id="clone-game-current-settings" className="space-y-4">
                <div id="clone-game-current-visibility-row" className="space-y-3">
                  <div id="clone-game-current-visibility-copy" className="min-w-0 space-y-3">
                    <p id="clone-game-current-visibility-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("cloneGame.visibility")}
                    </p>
                    <div id="clone-game-current-visibility-explanations" className="space-y-2">
                      <div
                        id="clone-game-current-visibility-private"
                        className={`rounded-md border px-3 py-2 transition-colors ${shareLevelDraft === "private" ? "border-primary bg-primary/5 shadow-sm" : "bg-background"}`}
                      >
                        <div id="clone-game-current-visibility-private-header" className="flex items-center justify-between gap-2">
                          <p id="clone-game-current-visibility-private-title" className="text-sm font-medium">
                            {t("cloneGame.private")}
                          </p>
                          {shareLevelDraft === "private" ? (
                            <span id="clone-game-current-visibility-private-active" className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                              {t("common.active")}
                            </span>
                          ) : (
                            <Button
                              id="clone-game-current-visibility-private-select-btn"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleShareLevelChange("private")}
                            >
                              {t("common.select")}
                            </Button>
                          )}
                        </div>
                        <div id="clone-game-current-visibility-private-body" className="mt-1 flex items-end justify-between gap-3">
                          <p id="clone-game-current-visibility-private-description" className="text-xs text-muted-foreground">
                            {t("cloneGame.visibilityPrivateDesc")}
                          </p>
                        </div>
                      </div>
                      <div
                        id="clone-game-current-visibility-protected"
                        className={`rounded-md border px-3 py-2 transition-colors ${shareLevelDraft === "protected" ? "border-primary bg-primary/5 shadow-sm" : "bg-background"}`}
                      >
                        <div id="clone-game-current-visibility-protected-header" className="flex items-center justify-between gap-2">
                          <p id="clone-game-current-visibility-protected-title" className="text-sm font-medium">
                            {t("cloneGame.protected")}
                          </p>
                          {shareLevelDraft === "protected" ? (
                            <span id="clone-game-current-visibility-protected-active" className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                              {t("common.active")}
                            </span>
                          ) : (
                            <Button
                              id="clone-game-current-visibility-protected-select-btn"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleShareLevelChange("protected")}
                            >
                              {t("common.select")}
                            </Button>
                          )}
                        </div>
                        <div id="clone-game-current-visibility-protected-body" className="mt-1 flex items-end justify-between gap-3">
                          <p id="clone-game-current-visibility-protected-description" className="text-xs text-muted-foreground">
                            {t("cloneGame.visibilityProtectedDesc")}
                          </p>
                        </div>
                      </div>
                      <div
                        id="clone-game-current-visibility-public"
                        className={`rounded-md border px-3 py-2 transition-colors ${shareLevelDraft === "public" ? "border-primary bg-primary/5 shadow-sm" : "bg-background"}`}
                      >
                        <div id="clone-game-current-visibility-public-header" className="flex items-center justify-between gap-2">
                          <p id="clone-game-current-visibility-public-title" className="text-sm font-medium">
                            {t("cloneGame.public")}
                          </p>
                          {shareLevelDraft === "public" ? (
                            <span id="clone-game-current-visibility-public-active" className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                              {t("common.active")}
                            </span>
                          ) : (
                            <Button
                              id="clone-game-current-visibility-public-select-btn"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleShareLevelChange("public")}
                              disabled={game.is_cloned_game}
                            >
                              {t("common.select")}
                            </Button>
                          )}
                        </div>
                        <div id="clone-game-current-visibility-public-body" className="mt-1 flex items-end justify-between gap-3">
                          <div id="clone-game-current-visibility-public-copy" className="space-y-1">
                            <p id="clone-game-current-visibility-public-description" className="text-xs text-muted-foreground">
                              {t("cloneGame.visibilityPublicDesc")}
                            </p>
                            <p id="clone-game-current-visibility-public-price" className="text-xs text-muted-foreground">
                              {t("cloneGame.clonePricePublicDesc").replace("{unit}", cloneCostCurrencyLabel)}
                            </p>
                            <p id="clone-game-current-visibility-public-payout" className="text-xs text-muted-foreground">
                              {t("cloneGame.clonePricePayoutDesc").replace("{unit}", cloneCostCurrencyLabel)}
                            </p>
                            {game.is_cloned_game ? (
                              <p id="clone-game-current-visibility-public-cloned-note" className="text-xs text-amber-600">
                                {t("cloneGame.clonedGamePublicDisabledNote")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {shareLevelDraft === "public" ? (
                  <div id="clone-game-current-clone-cost-row" className="flex items-start justify-between gap-4 border-t pt-4">
                    <div id="clone-game-current-clone-cost-copy" className="min-w-0 space-y-1">
                      <p id="clone-game-current-clone-cost-label" className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("cloneGame.clonePrice")}
                      </p>
                      {editingCloneCost ? (
                        <div id="clone-game-current-clone-cost-edit" className="flex flex-wrap items-center gap-2">
                          <Input
                            id="clone-game-current-clone-cost-input"
                            type="number"
                            min={7}
                            step={1}
                            value={cloneCostDraft}
                            onChange={(e) => setCloneCostDraft(e.target.value)}
                            className="w-28"
                          />
                          <div id="clone-game-current-clone-cost-currency-wrap" className="flex flex-col gap-1">
                            <span id="clone-game-current-clone-cost-currency-label" className="text-xs text-muted-foreground">
                              {t("cloneGame.clonePriceCurrency")}
                            </span>
                            <Select
                              value={cloneCostCurrencyDraft}
                              onValueChange={(value) => setCloneCostCurrencyDraft(value as "sGem" | "sCoin")}
                              disabled={savingCloneCost}
                            >
                              <SelectTrigger id="clone-game-current-clone-cost-currency-trigger" className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent id="clone-game-current-clone-cost-currency-content">
                                <SelectItem id="clone-game-current-clone-cost-currency-sgem" value="sGem">
                                  {getCloneCostCurrencyMeta("sGem").label}
                                </SelectItem>
                                <SelectItem id="clone-game-current-clone-cost-currency-scoin" value="sCoin">
                                  {getCloneCostCurrencyMeta("sCoin").label}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button id="clone-game-current-clone-cost-save-btn" size="sm" onClick={handleCloneCostSave} disabled={savingCloneCost}>
                            {savingCloneCost ? <Loader2 id="clone-game-current-clone-cost-save-loading-icon" className="h-4 w-4 animate-spin" /> : <Check id="clone-game-current-clone-cost-save-icon" className="h-4 w-4" />}
                          </Button>
                          <Button
                            id="clone-game-current-clone-cost-cancel-btn"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCloneCostDraft(String(game.clone_cost ?? 7));
                              setCloneCostCurrencyDraft(getCloneCostCurrencyMeta(game.clone_cost_currency).code);
                              setEditingCloneCost(false);
                            }}
                            disabled={savingCloneCost}
                          >
                            <X id="clone-game-current-clone-cost-cancel-icon" className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p id="clone-game-current-clone-cost-value" className="text-sm font-medium">
                          {formatCloneCost(cloneCostValue, game.clone_cost_currency)}{" "}
                          <span id="clone-game-current-clone-cost-value-unit" className="inline-flex items-center gap-1">
                            <span id="clone-game-current-clone-cost-value-unit-text" className="sr-only">{cloneCostCurrencyLabel}</span>
                          </span>
                        </p>
                      )}
                      <p id="clone-game-current-clone-cost-description" className="text-xs text-muted-foreground">
                        {t("cloneGame.clonePricePublicDesc").replace("{unit}", cloneCostCurrencyLabel)}
                      </p>
                    </div>
                    <Button
                      id="clone-game-current-clone-cost-edit-btn"
                      variant="ghost"
                      size="icon"
                      disabled={savingCloneCost || editingCloneCost}
                      aria-label={t("common.edit")}
                      onClick={() => {
                        setCloneCostDraft(String(game.clone_cost ?? 7));
                        setCloneCostCurrencyDraft(getCloneCostCurrencyMeta(game.clone_cost_currency).code);
                        setEditingCloneCost(true);
                      }}
                    >
                      <Pencil id="clone-game-current-clone-cost-edit-icon" className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
          {shareLevelDraft === "protected" || shareLevelDraft === "public" ? (
            <ActiveCloneSessionsCard sourceGameId={gameId} />
          ) : null}
        </TabsContent>

        <TabsContent id="clone-game-tab-content-from-another-game" value="from-another-game" className="mt-0 space-y-4">
          <SourceGameTab targetGameId={gameId} targetGameName={game.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
