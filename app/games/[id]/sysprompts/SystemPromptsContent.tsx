"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BotMessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import type { SystemPrompt } from "@/lib/system-prompt-api";
import {
  FALLBACK_REQUEST_TYPES,
  getPromptTypeLabel,
  type PromptTypeOption,
  type StatusFilter,
} from "./system-prompt-shared";

interface SystemPromptsContentProps {
  t: (key: string) => string;
  prompts: SystemPrompt[];
  requestTypes: string[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  billingNotice: string | null;
  nameFilter: string;
  setNameFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (prompt: SystemPrompt) => void;
  onToggle: (prompt: SystemPrompt) => void;
  onDelete: (prompt: SystemPrompt) => void;
  onDismissBilling: () => void;
}

export function SystemPromptsContent({
  t,
  prompts,
  requestTypes,
  loading,
  error,
  refreshing,
  billingNotice,
  nameFilter,
  setNameFilter,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
  onDismissBilling,
}: SystemPromptsContentProps) {
  const promptTypeOptions = useMemo<PromptTypeOption[]>(() => {
    const merged = [...FALLBACK_REQUEST_TYPES, ...requestTypes];
    return merged
      .filter((value, index, array) => array.indexOf(value) === index)
      .map((value) => ({ value, label: getPromptTypeLabel(t, value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [requestTypes, t]);

  const filteredPrompts = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    return [...prompts]
      .filter((prompt) => {
        if (query && !prompt.name.toLowerCase().includes(query))
          return false;
        if (typeFilter !== "all" && prompt.prompt_type !== typeFilter)
          return false;
        if (statusFilter === "active" && !prompt.is_active)
          return false;
        if (statusFilter === "inactive" && prompt.is_active)
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [nameFilter, prompts, statusFilter, typeFilter]);

  return (
    <div id="game-sysprompts-content" className="space-y-4">
      {billingNotice && (
        <Alert id="game-sysprompts-billing-alert" className="border-amber-500/40 bg-amber-500/10">
          <ShieldAlert id="game-sysprompts-billing-icon" className="h-4 w-4" />
          <AlertDescription id="game-sysprompts-billing-description" className="flex flex-wrap items-center justify-between gap-3">
            <span id="game-sysprompts-billing-text">{billingNotice}</span>
            <span id="game-sysprompts-billing-actions" className="flex items-center gap-2">
              <Button id="game-sysprompts-billing-payment-btn" asChild size="sm" variant="outline">
                <Link href="/payment">{t("systemPrompts.topUpSCoin")}</Link>
              </Button>
              <Button id="game-sysprompts-billing-dismiss-btn" size="icon" variant="ghost" className="h-8 w-8" onClick={onDismissBilling}>
                <X className="h-4 w-4" />
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div id="game-sysprompts-toolbar" className="flex items-center justify-between gap-2 flex-wrap">
        <div id="game-sysprompts-toolbar-copy">
          <h2 id="game-sysprompts-toolbar-title" className="text-lg font-semibold">{t("systemPrompts.listHeading")}</h2>
          <p id="game-sysprompts-toolbar-desc" className="text-sm text-muted-foreground">
            {prompts.length > 0 ? t("systemPrompts.listDescription").replace("{count}", String(prompts.length)) : t("systemPrompts.noPrompts")}
          </p>
        </div>
        <div id="game-sysprompts-toolbar-actions" className="flex items-center gap-2 flex-wrap">
          {(nameFilter || typeFilter !== "all" || statusFilter !== "all") && (
            <button
              id="game-sysprompts-clear-filters-btn"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setNameFilter("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              {t("systemPrompts.clearFilters")}
            </button>
          )}
          <div id="game-sysprompts-filter-name-wrap" className="relative">
            <Search id="game-sysprompts-filter-name-icon" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="game-sysprompts-filter-name-input"
              type="text"
              placeholder={t("systemPrompts.searchPlaceholder")}
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {nameFilter && (
              <button
                id="game-sysprompts-filter-name-clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setNameFilter("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            id="game-sysprompts-filter-type-select"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option id="game-sysprompts-filter-type-all" value="all">{t("systemPrompts.allTypes")}</option>
            {promptTypeOptions.map((option) => (
              <option id={`game-sysprompts-filter-type-${option.value}`} key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            id="game-sysprompts-filter-status-select"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option id="game-sysprompts-filter-status-all" value="all">{t("systemPrompts.allStatuses")}</option>
            <option id="game-sysprompts-filter-status-active" value="active">{t("systemPrompts.activeOnly")}</option>
            <option id="game-sysprompts-filter-status-inactive" value="inactive">{t("systemPrompts.inactiveOnly")}</option>
          </select>
          <Button id="game-sysprompts-refresh-btn" variant="outline" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={refreshing} title={t("systemPrompts.refresh")}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button id="game-sysprompts-create-btn" size="sm" className="h-8" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {t("systemPrompts.createPrompt")}
          </Button>
        </div>
      </div>

      <Card id="game-sysprompts-table-card" className="overflow-hidden">
        <CardContent id="game-sysprompts-table-content" className="p-0">
          {loading ? (
            <div id="game-sysprompts-loading" className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div id={`game-sysprompts-loading-row-${index}`} key={index} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div id="game-sysprompts-error-wrap" className="p-6 text-center text-destructive">
              <p id="game-sysprompts-error-text">{error}</p>
              <div id="game-sysprompts-error-actions" className="mt-4 flex justify-center">
                <Button id="game-sysprompts-error-retry-btn" onClick={onRefresh}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {t("common.retry")}
                </Button>
              </div>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div id="game-sysprompts-empty-wrap" className="p-12 text-center text-muted-foreground">
              <BotMessageSquare id="game-sysprompts-empty-icon" className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p id="game-sysprompts-empty-title" className="text-lg font-medium">
                {prompts.length === 0 ? t("systemPrompts.noPrompts") : t("systemPrompts.noMatches")}
              </p>
              <p id="game-sysprompts-empty-desc" className="text-sm mt-1">
                {prompts.length === 0 ? t("systemPrompts.noPromptsDesc") : t("systemPrompts.noMatchesDesc")}
              </p>
              <Button id="game-sysprompts-empty-create-btn" className="mt-4" onClick={onCreate}>
                <Plus className="h-4 w-4" />
                {t("systemPrompts.createPrompt")}
              </Button>
            </div>
          ) : (
            <Table id="game-sysprompts-table">
              <TableHeader id="game-sysprompts-table-head">
                <TableRow id="game-sysprompts-table-head-row">
                  <TableHead id="game-sysprompts-table-head-name">{t("systemPrompts.name")}</TableHead>
                  <TableHead id="game-sysprompts-table-head-type">{t("systemPrompts.promptType")}</TableHead>
                  <TableHead id="game-sysprompts-table-head-status" className="text-center">{t("systemPrompts.status")}</TableHead>
                  <TableHead id="game-sysprompts-table-head-actions" className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id="game-sysprompts-table-body">
                {filteredPrompts.map((prompt) => {
                  return (
                    <TableRow id={`game-sysprompts-row-${prompt.id}`} key={prompt.id} className="hover:bg-muted/40">
                      <TableCell id={`game-sysprompts-row-${prompt.id}-name-cell`} className="align-top">
                        <span id={`game-sysprompts-row-${prompt.id}-name`} className="font-medium">
                          {prompt.name}
                        </span>
                      </TableCell>
                      <TableCell id={`game-sysprompts-row-${prompt.id}-type-cell`} className="align-top">
                        <span id={`game-sysprompts-row-${prompt.id}-type-badge`} className="inline-flex rounded-md border px-2 py-1 text-xs font-normal">
                          {getPromptTypeLabel(t, prompt.prompt_type)}
                        </span>
                      </TableCell>
                      <TableCell id={`game-sysprompts-row-${prompt.id}-status-cell`} className="align-top text-center">
                        <div id={`game-sysprompts-row-${prompt.id}-status-wrap`} className="flex justify-center">
                          <Switch
                            id={`game-sysprompts-row-${prompt.id}-status-switch`}
                            checked={prompt.is_active}
                            onCheckedChange={() => onToggle(prompt)}
                            disabled={refreshing}
                          />
                        </div>
                      </TableCell>
                      <TableCell id={`game-sysprompts-row-${prompt.id}-actions-cell`} className="align-top text-right">
                        <div id={`game-sysprompts-row-${prompt.id}-actions-wrap`} className="flex items-center justify-end gap-1">
                          <Button id={`game-sysprompts-row-${prompt.id}-edit-btn`} variant="ghost" size="icon" onClick={() => onEdit(prompt)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button id={`game-sysprompts-row-${prompt.id}-delete-btn`} variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(prompt)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
