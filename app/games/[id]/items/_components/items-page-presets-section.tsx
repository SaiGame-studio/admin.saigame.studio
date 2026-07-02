"use client";

import Link from "next/link";
import { Bot, Loader2, Package, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PresetDefinition } from "@/lib/inventory-api";

type ItemsPagePresetsSectionProps = {
  t: (key: string) => string;
  convPanelOpen: boolean;
  linkingPresetId: string | null;
  presetDefs: PresetDefinition[];
  presetSearch: string;
  presetSearchDebounced: string;
  filteredPresetDefs: PresetDefinition[];
  presetLoading: boolean;
  presetError: string | null;
  setPresetSearch: (value: string) => void;
  fetchPresetDefs: () => void | Promise<void>;
  setShowCreatePreset: (value: boolean) => void;
  handleLinkPresetToConversation: (def: PresetDefinition) => void | Promise<void>;
  setEditingPreset: (value: PresetDefinition | null) => void;
  setDeletingPreset: (value: PresetDefinition | null) => void;
};

export function ItemsPagePresetsSection({
  t,
  convPanelOpen,
  linkingPresetId,
  presetDefs,
  presetSearch,
  presetSearchDebounced,
  filteredPresetDefs,
  presetLoading,
  presetError,
  setPresetSearch,
  fetchPresetDefs,
  setShowCreatePreset,
  handleLinkPresetToConversation,
  setEditingPreset,
  setDeletingPreset,
}: ItemsPagePresetsSectionProps) {
  const used = presetDefs.length;
  const max = 500;
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t("items.presetsTitle")}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span className={used >= max ? "text-destructive font-medium" : ""}>
              {used.toLocaleString()} / {max.toLocaleString()}
            </span>
            <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
              <span
                className={`block h-full rounded-full transition-all ${used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="text-xs text-muted-foreground">{t("items.fixedLimitNoUpgrade")}</span>
            {presetSearchDebounced && (
              <span className="text-xs text-muted-foreground">
                ({filteredPresetDefs.length} {t("items.matching")})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("items.searchByNameTypeOrId")}
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              className="pl-8 h-8 w-64 text-sm"
            />
            {presetSearch && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setPresetSearch("")}
                title={t("items.clearSearch")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={fetchPresetDefs} title={t("common.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreatePreset(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("items.newPresetDefinition")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {presetLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : presetError ? (
            <div className="p-6 text-center text-destructive">{presetError}</div>
          ) : filteredPresetDefs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {presetSearchDebounced ? t("items.noMatchingPresets") : t("items.noPresetDefs")}
              </p>
              <p className="text-sm mt-1">
                {presetSearchDebounced
                  ? t("items.noPresetsMatchSearch").replace("{query}", presetSearchDebounced)
                  : t("items.clickNewPresetToCreate")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {convPanelOpen && <TableHead className="text-center w-12" />}
                  <TableHead>{t("items.name")}</TableHead>
                  <TableHead>{t("items.codeName")}</TableHead>
                  <TableHead>{t("items.presetType")}</TableHead>
                  <TableHead>{t("items.maxSlots")}</TableHead>
                  <TableHead>{t("items.metadata")}</TableHead>
                  <TableHead className="text-right">{t("items.actionsHeader")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPresetDefs.map((def) => (
                  <TableRow key={def.id} className="hover:bg-muted/40">
                    {convPanelOpen && (
                      <TableCell id={`presets-row-${def.id}-link-conv-cell`} className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                id={`presets-row-${def.id}-link-conv-btn`}
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                                disabled={linkingPresetId === def.id}
                                onClick={() => handleLinkPresetToConversation(def)}
                              >
                                {linkingPresetId === def.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <span id={`presets-row-${def.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                    <Bot className="h-3.5 w-3.5" />
                                    <Plus className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent id={`presets-row-${def.id}-link-conv-tooltip`} side="top">
                              {t("items.linkToConv")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {def.name}
                      <div className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-0.5" title={def.id}>
                        <span className="truncate max-w-[180px]">{def.id}</span>
                        <CopyButton text={def.id} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {def.code_name ? (
                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-0.5" title={def.code_name}>
                          <span className="truncate max-w-[180px]">{def.code_name}</span>
                          <CopyButton text={def.code_name} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">?</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border bg-blue-500/15 text-blue-400 border-blue-400/40 capitalize">
                        {def.preset_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{def.max_slots}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {Object.keys(def.metadata ?? {}).length > 0
                        ? Object.entries(def.metadata)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : <span className="italic">?</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" title={t("common.edit")} onClick={() => setEditingPreset(def)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("common.delete")}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingPreset(def)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
