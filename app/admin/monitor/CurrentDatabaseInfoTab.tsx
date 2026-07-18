"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Loader2, Package, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCurrentDatabaseInfo, type CurrentDatabaseInfo } from "@/lib/admin-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatISODate } from "@/lib/utils/date-utils";

export function CurrentDatabaseInfoTab() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<CurrentDatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setInfo(await getCurrentDatabaseInfo());
    } catch (loadError) {
      console.error(loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  if (loading) {
    return (
      <div id="current-database-info-loading" className="flex min-h-48 items-center justify-center">
        <Loader2 id="current-database-info-loading-icon" className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <Card id="current-database-info-error-card">
        <CardContent id="current-database-info-error-content" className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
          <p id="current-database-info-error-text" className="text-sm text-destructive">
            {t("dbBackups.currentInfoError") || "Failed to load current database information."}
          </p>
          <Button id="current-database-info-error-retry-button" variant="outline" onClick={() => void loadInfo()}>
            {t("dbBackups.retry") || "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div id="current-database-info-container" className="space-y-4">
      <div id="current-database-info-header" className="flex items-center justify-between gap-3">
        <div id="current-database-info-heading-group">
          <h3 id="current-database-info-title" className="text-lg font-semibold">
            {t("dbBackups.currentInfoTitle") || "Current Database Info"}
          </h3>
          <p id="current-database-info-description" className="text-sm text-muted-foreground">
            {t("dbBackups.currentInfoDescription") || "Live information from the database used by this backend process."}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button id="current-database-info-refresh-button" variant="outline" size="icon" onClick={() => void loadInfo()}>
                <RefreshCw id="current-database-info-refresh-icon" className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p id="current-database-info-refresh-tooltip">{t("dbBackups.refreshCurrentInfo") || "Refresh database info"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card id="current-database-info-name-card">
        <CardContent id="current-database-info-name-content" className="flex items-center gap-3 p-5">
          <Database id="current-database-info-name-icon" className="h-8 w-8 text-primary" />
          <div id="current-database-info-name-group">
            <p id="current-database-info-name-label" className="text-xs text-muted-foreground">{t("dbBackups.currentDatabase") || "Current database"}</p>
            <p id="current-database-info-name-value" className="font-mono text-lg font-semibold">{info.database_name}</p>
          </div>
        </CardContent>
      </Card>

      <div id="current-database-info-stats-grid" className="grid gap-4 md:grid-cols-2">
        <Card id="current-database-info-users-card">
          <CardHeader id="current-database-info-users-header" className="pb-2">
            <CardTitle id="current-database-info-users-title" className="flex items-center gap-2 text-base">
              <UserRound id="current-database-info-users-icon" className="h-4 w-4 text-primary" />
              {t("dbBackups.users") || "Users"}
            </CardTitle>
          </CardHeader>
          <CardContent id="current-database-info-users-content" className="space-y-2">
            <p id="current-database-info-users-count" className="text-2xl font-semibold">{info.user_count.toLocaleString()}</p>
            <p id="current-database-info-latest-user" className="text-sm">
              {t("dbBackups.latestUser") || "Latest user"}: {info.latest_user_name || "—"}
            </p>
            <p id="current-database-info-latest-user-created-at" className="text-xs text-muted-foreground">
              {t("dbBackups.createdAt") || "Created at"}: {info.latest_user_created_at ? formatISODate(info.latest_user_created_at) : "—"}
            </p>
          </CardContent>
        </Card>

        <Card id="current-database-info-items-card">
          <CardHeader id="current-database-info-items-header" className="pb-2">
            <CardTitle id="current-database-info-items-title" className="flex items-center gap-2 text-base">
              <Package id="current-database-info-items-icon" className="h-4 w-4 text-primary" />
              {t("dbBackups.itemDefinitions") || "Item definitions"}
            </CardTitle>
          </CardHeader>
          <CardContent id="current-database-info-items-content" className="space-y-2">
            <p id="current-database-info-items-count" className="text-2xl font-semibold">{info.item_definition_count.toLocaleString()}</p>
            <p id="current-database-info-latest-item" className="text-sm">
              {t("dbBackups.latestItem") || "Latest item"}: {info.latest_item_definition_name || "—"}
            </p>
            <p id="current-database-info-latest-item-created-at" className="text-xs text-muted-foreground">
              {t("dbBackups.createdAt") || "Created at"}: {info.latest_item_definition_created_at ? formatISODate(info.latest_item_definition_created_at) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
