"use client";

import { useMemo } from "react";
import { RefreshCw, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SystemPrompt } from "@/lib/system-prompt-api";
import { getPromptTypeLabel, getProviderLabel, formatDateTime } from "./system-prompt-shared";

interface DefaultSystemPromptsContentProps {
  locale: string;
  t: (key: string) => string;
  prompts: SystemPrompt[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DefaultSystemPromptsContent({
  locale,
  t,
  prompts,
  loading,
  error,
  refreshing,
  onRefresh,
}: DefaultSystemPromptsContentProps) {
  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [prompts]);

  return (
    <div id="game-sysprompts-default-content" className="space-y-4">
      <div id="game-sysprompts-default-toolbar" className="flex items-center justify-between gap-2 flex-wrap">
        <div id="game-sysprompts-default-toolbar-copy">
          <h2 id="game-sysprompts-default-toolbar-title" className="text-lg font-semibold">
            {t("systemPrompts.defaultListHeading")}
          </h2>
          <p id="game-sysprompts-default-toolbar-desc" className="text-sm text-muted-foreground">
            {sortedPrompts.length > 0
              ? t("systemPrompts.defaultListDescription").replace("{count}", String(sortedPrompts.length))
              : t("systemPrompts.defaultNoPrompts")}
          </p>
        </div>
        <Button id="game-sysprompts-default-refresh-btn" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw id="game-sysprompts-default-refresh-icon" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("systemPrompts.refresh")}
        </Button>
      </div>

      <Card id="game-sysprompts-default-table-card" className="overflow-hidden">
        <CardContent id="game-sysprompts-default-table-content" className="p-0">
          {loading ? (
            <div id="game-sysprompts-default-loading" className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div id={`game-sysprompts-default-loading-row-${index}`} key={index} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div id="game-sysprompts-default-error-wrap" className="p-6 text-center text-destructive">
              <p id="game-sysprompts-default-error-text">{error}</p>
              <div id="game-sysprompts-default-error-actions" className="mt-4 flex justify-center">
                <Button id="game-sysprompts-default-error-retry-btn" onClick={onRefresh}>
                  <RefreshCw id="game-sysprompts-default-error-retry-icon" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {t("common.retry")}
                </Button>
              </div>
            </div>
          ) : sortedPrompts.length === 0 ? (
            <div id="game-sysprompts-default-empty-wrap" className="p-12 text-center text-muted-foreground">
              <BotMessageSquare id="game-sysprompts-default-empty-icon" className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p id="game-sysprompts-default-empty-title" className="text-lg font-medium">
                {t("systemPrompts.defaultNoPrompts")}
              </p>
              <p id="game-sysprompts-default-empty-desc" className="text-sm mt-1">
                {t("systemPrompts.defaultNoPromptsDesc")}
              </p>
            </div>
          ) : (
            <Table id="game-sysprompts-default-table">
              <TableHeader id="game-sysprompts-default-table-head">
                <TableRow id="game-sysprompts-default-table-head-row">
                  <TableHead id="game-sysprompts-default-table-head-name">{t("systemPrompts.name")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-type">{t("systemPrompts.promptType")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-status" className="text-center">{t("systemPrompts.status")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-provider">{t("systemPrompts.provider")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-tokens" className="text-right">{t("systemPrompts.tokens")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-updated">{t("systemPrompts.updatedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id="game-sysprompts-default-table-body">
                {sortedPrompts.map((prompt) => {
                  const providerLabel = getProviderLabel(prompt.provider);
                  return (
                    <TableRow id={`game-sysprompts-default-row-${prompt.id}`} key={prompt.id} className="hover:bg-muted/40">
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-name-cell`} className="align-top">
                        <div id={`game-sysprompts-default-row-${prompt.id}-name-wrap`} className="space-y-1">
                          <div id={`game-sysprompts-default-row-${prompt.id}-name-line`} className="flex flex-wrap items-center gap-2">
                            <span id={`game-sysprompts-default-row-${prompt.id}-name`} className="font-medium">
                              {prompt.name}
                            </span>
                          </div>
                          <p id={`game-sysprompts-default-row-${prompt.id}-description`} className="max-w-[34rem] text-xs text-muted-foreground line-clamp-2">
                            {prompt.description || t("systemPrompts.noDescription")}
                          </p>
                          <p id={`game-sysprompts-default-row-${prompt.id}-id`} className="font-mono text-[11px] text-muted-foreground">
                            {prompt.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-type-cell`} className="align-top">
                        <Badge id={`game-sysprompts-default-row-${prompt.id}-type-badge`} variant="outline" className="font-normal">
                          {getPromptTypeLabel(t, prompt.prompt_type)}
                        </Badge>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-status-cell`} className="align-top text-center">
                        <Badge id={`game-sysprompts-default-row-${prompt.id}-status-badge`} variant={prompt.is_active ? "default" : "secondary"} className="font-normal">
                          {prompt.is_active ? t("systemPrompts.statusActive") : t("systemPrompts.statusInactive")}
                        </Badge>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-provider-cell`} className="align-top">
                        <div id={`game-sysprompts-default-row-${prompt.id}-provider-wrap`} className="space-y-1">
                          <p id={`game-sysprompts-default-row-${prompt.id}-provider`} className="text-sm">
                            {providerLabel || t("common.none")}
                          </p>
                          {prompt.model && (
                            <p id={`game-sysprompts-default-row-${prompt.id}-model`} className="text-xs text-muted-foreground">
                              {prompt.model}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-tokens-cell`} className="align-top text-right text-sm font-mono">
                        {prompt.max_input_tokens.toLocaleString()} / {prompt.max_output_tokens.toLocaleString()}
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-updated-cell`} className="align-top text-sm text-muted-foreground">
                        {formatDateTime(prompt.updated_at, locale)}
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
