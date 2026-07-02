"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";

import { useTranslation } from "@/lib/i18n/use-translation";
import { getItemDefinition, listItemDefinitions } from "@/lib/inventory-api";
import type { ItemDefinition } from "@/types/inventory";
import { CopyButton } from "@/components/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ItemsPageGeneratorSectionProps = {
  studioId: string;
  gameId: string;
  generatorItems: ItemDefinition[];
  setGeneratorItems: (items: ItemDefinition[]) => void;
  generatorLoading: boolean;
  setGeneratorLoading: (value: boolean) => void;
  generatorError: string | null;
  setGeneratorError: (value: string | null) => void;
  activeTab: string;
  refreshKey: number;
  onAddGenerator: () => void;
};

export function ItemsPageGeneratorSection({
  studioId,
  gameId,
  generatorItems,
  setGeneratorItems,
  generatorLoading,
  setGeneratorLoading,
  generatorError,
  setGeneratorError,
  activeTab,
  refreshKey,
  onAddGenerator,
}: ItemsPageGeneratorSectionProps) {
  const { t } = useTranslation();
  const [poolNames, setPoolNames] = useState<Record<string, string>>({});

  const fetchGenerators = useCallback(() => {
    if (!gameId) {
      return;
    }

    setGeneratorLoading(true);
    setGeneratorError(null);
    setPoolNames({});

    listItemDefinitions({ studioId, gameId }, { category: "generator", limit: 500 })
      .then((res) => {
        setGeneratorItems(res.items ?? []);

        const ids = new Set<string>();
        (res.items ?? []).forEach((item) => {
          const generatorConfig = item.metadata?.generator_config as Record<string, unknown> | undefined;
          if (!generatorConfig) {
            return;
          }

          const pool = Array.isArray(generatorConfig.output_pool)
            ? (generatorConfig.output_pool as Array<Record<string, unknown>>)
            : [];

          pool.forEach((entry) => {
            const id = String(entry.item_definition_id ?? "");
            if (id) {
              ids.add(id);
            }
          });
        });

        ids.forEach((id) => {
          getItemDefinition({ studioId, gameId }, id)
            .then((result) => setPoolNames((prev) => ({ ...prev, [id]: result.item?.name ?? id })))
            .catch(() => {});
        });
      })
      .catch((e) => setGeneratorError(e?.message ?? t("items.failedLoadGenerators")))
      .finally(() => setGeneratorLoading(false));
  }, [gameId, setGeneratorError, setGeneratorItems, setGeneratorLoading, studioId, t]);

  useEffect(() => {
    if (activeTab !== "generators" || !gameId) {
      return;
    }
    if (generatorItems.length > 0 || generatorLoading) {
      return;
    }
    fetchGenerators();
    // Keep this aligned with the original tab behavior:
    // auto-load once when entering the Generators tab, not after every empty/error result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gameId]);

  useEffect(() => {
    if (refreshKey === 0 || !gameId) {
      return;
    }
    fetchGenerators();
  }, [fetchGenerators, gameId, refreshKey]);

  if (generatorLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">{t("items.loadingGenerators")}</span>
      </div>
    );
  }

  if (generatorError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t("common.refresh")}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1" />
            {t("items.addGenerator")}
          </Button>
        </div>
        <div className="text-center py-12 text-sm text-destructive">{generatorError}</div>
      </div>
    );
  }

  if (generatorItems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t("common.refresh")}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1" />
            {t("items.addGenerator")}
          </Button>
        </div>
        <div className="text-center py-12 text-sm text-muted-foreground">{t("items.noGeneratorItems")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("items.generatorsTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {generatorItems.length} {t("items.generatorsDefined")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t("common.refresh")}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1" />
            {t("items.addGenerator")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-semibold text-foreground">{t("items.generatorIntervalShort")}</span> {t("items.generatorIntervalDescPre")}{" "}
          <code className="bg-muted px-1 rounded">interval</code> {t("items.generatorIntervalDescPost")}
        </p>
        <p>
          <span className="font-semibold text-foreground">{t("items.tickCapacity")}</span> {t("items.generatorTickCapDescPre")}{" "}
          <code className="bg-muted px-1 rounded">interval x tick_cap</code> {t("items.generatorTickCapDescPost")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {generatorItems.map((item) => {
          const generatorConfig = (item.metadata?.generator_config ?? {}) as Record<string, unknown>;
          const interval = Number(generatorConfig.production_interval_seconds) || 0;
          const ticks = Number(generatorConfig.tick_capacity) || 0;
          const maxSeconds = interval * ticks;
          const hours = Math.floor(maxSeconds / 3600);
          const mins = Math.floor((maxSeconds % 3600) / 60);
          const timeStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
          const outputPool = Array.isArray(generatorConfig.output_pool)
            ? (generatorConfig.output_pool as Array<Record<string, unknown>>)
            : [];

          return (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold truncate">{item.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {item.rarity}
                  </Badge>
                </div>
                {item.item_code && (
                  <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    {item.item_code} <CopyButton text={item.item_code} />
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t("items.generatorIntervalShort")}</p>
                    <p className="font-semibold text-sm">{interval}s</p>
                  </div>
                  <div className="rounded-md border px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t("items.generatorTickCap")}</p>
                    <p className="font-semibold text-sm">{ticks}</p>
                  </div>
                </div>

                {interval > 0 && ticks > 0 && (
                  <div className="rounded-md bg-muted/50 border border-dashed px-3 py-1.5 text-[11px] text-muted-foreground">
                    ~ {t("items.maxOffline")}: <span className="font-semibold text-foreground">{timeStr}</span>
                    <span className="mx-1">·</span>
                    <span className="font-mono">
                      {interval}s - {ticks}
                    </span>{" "}
                    = {maxSeconds.toLocaleString()}s
                  </div>
                )}

                {outputPool.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {t("items.outputPoolCount")} ({outputPool.length})
                    </p>
                    <div className="space-y-1">
                      {outputPool.map((entry, idx) => {
                        const defId = String(entry.item_definition_id ?? "");
                        const name = poolNames[defId];
                        const dropPct = entry.drop_rate != null ? `${(Number(entry.drop_rate) * 100).toFixed(1)}%` : "N/A";

                        return (
                          <div key={idx} className="flex items-center gap-2 rounded border px-2.5 py-2 bg-background">
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <Link href={`/games/${gameId}/items/${defId}`} className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors" title={defId}>
                                <span className="truncate max-w-[160px]">{name || `${defId.slice(0, 16)}...`}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </Link>
                              {defId && <CopyButton text={defId} />}
                            </div>
                            <span className="text-muted-foreground shrink-0">{dropPct}</span>
                            <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                              {String(entry.quantity_min ?? 1)} - {String(entry.quantity_max ?? 1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-4 flex justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title={t("common.edit")}>
                  <Link href={`/games/${gameId}/items/${item.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
