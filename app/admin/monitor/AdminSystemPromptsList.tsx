"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BotMessageSquare, Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listDefaultSystemPrompts, type SystemPrompt } from "@/lib/admin-api";
import { useTranslation } from "@/lib/i18n/use-translation";

function getPromptTypeLabel(t: (key: string) => string, promptType: string): string {
  return t(`llmConversation.requestTypes.${promptType}`) || promptType;
}

export function AdminSystemPromptsList() {
  const { t } = useTranslation();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => a.name.localeCompare(b.name));
  }, [prompts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDefaultSystemPrompts();
      setPrompts(result.data ?? []);
    } catch (err) {
      setError(t("systemPrompts.defaultLoadError"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <div id="admin-monitor-sysprompts-content" className="space-y-4">
      <div id="admin-monitor-sysprompts-toolbar" className="flex flex-wrap items-center justify-between gap-2">
        <div id="admin-monitor-sysprompts-toolbar-copy">
          <h2 id="admin-monitor-sysprompts-toolbar-title" className="text-lg font-semibold">
            {t("systemPrompts.defaultListHeading")}
          </h2>
          <p id="admin-monitor-sysprompts-toolbar-desc" className="text-sm text-muted-foreground">
            {sortedPrompts.length > 0
              ? t("systemPrompts.defaultListDescription").replace("{count}", String(sortedPrompts.length))
              : t("systemPrompts.defaultNoPrompts")}
          </p>
        </div>
        <Button
          id="admin-monitor-sysprompts-refresh-btn"
          variant="outline"
          size="icon"
          onClick={() => void handleRefresh()}
          disabled={loading || refreshing}
          title={t("systemPrompts.refresh")}
          className="h-8 w-8"
        >
          <RefreshCw
            id="admin-monitor-sysprompts-refresh-icon"
            className={`h-4 w-4 ${(loading || refreshing) ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <Card id="admin-monitor-sysprompts-table-card" className="overflow-hidden">
        <CardContent id="admin-monitor-sysprompts-table-content" className="p-0">
          {loading ? (
            <div id="admin-monitor-sysprompts-loading" className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  id={`admin-monitor-sysprompts-loading-row-${index}`}
                  key={index}
                  className="h-10 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : error ? (
            <div id="admin-monitor-sysprompts-error-wrap" className="p-6 text-center text-destructive">
              <p id="admin-monitor-sysprompts-error-text">{error}</p>
              <div id="admin-monitor-sysprompts-error-actions" className="mt-4 flex justify-center">
                <Button id="admin-monitor-sysprompts-error-retry-btn" onClick={() => void handleRefresh()}>
                  <RefreshCw
                    id="admin-monitor-sysprompts-error-retry-icon"
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {t("common.retry")}
                </Button>
              </div>
            </div>
          ) : sortedPrompts.length === 0 ? (
            <div id="admin-monitor-sysprompts-empty-wrap" className="p-12 text-center text-muted-foreground">
              <BotMessageSquare id="admin-monitor-sysprompts-empty-icon" className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p id="admin-monitor-sysprompts-empty-title" className="text-lg font-medium">
                {t("systemPrompts.defaultNoPrompts")}
              </p>
              <p id="admin-monitor-sysprompts-empty-desc" className="mt-1 text-sm">
                {t("systemPrompts.defaultNoPromptsDesc")}
              </p>
            </div>
          ) : (
            <Table id="admin-monitor-sysprompts-table">
              <TableHeader id="admin-monitor-sysprompts-table-head">
                <TableRow id="admin-monitor-sysprompts-table-head-row">
                  <TableHead id="admin-monitor-sysprompts-table-head-order" className="w-16">
                    {t("systemPrompts.order")}
                  </TableHead>
                  <TableHead id="admin-monitor-sysprompts-table-head-name">
                    {t("systemPrompts.name")}
                  </TableHead>
                  <TableHead id="admin-monitor-sysprompts-table-head-type">
                    {t("systemPrompts.promptType")}
                  </TableHead>
                  <TableHead id="admin-monitor-sysprompts-table-head-tokens" className="text-right">
                    {t("systemPrompts.inputOutputTokens")}
                  </TableHead>
                  <TableHead id="admin-monitor-sysprompts-table-head-actions" className="text-right">
                    {t("systemPrompts.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id="admin-monitor-sysprompts-table-body">
                {sortedPrompts.map((prompt, index) => (
                  <TableRow id={`admin-monitor-sysprompts-row-${prompt.id}`} key={prompt.id} className="hover:bg-muted/40">
                    <TableCell id={`admin-monitor-sysprompts-row-${prompt.id}-order-cell`} className="align-middle py-2 text-muted-foreground">
                      <span id={`admin-monitor-sysprompts-row-${prompt.id}-order`} className="font-mono text-sm">
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCell id={`admin-monitor-sysprompts-row-${prompt.id}-name-cell`} className="align-middle py-2">
                      <div id={`admin-monitor-sysprompts-row-${prompt.id}-name-wrap`} className="space-y-1">
                        <span id={`admin-monitor-sysprompts-row-${prompt.id}-name`} className="font-medium">
                          {prompt.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell id={`admin-monitor-sysprompts-row-${prompt.id}-type-cell`} className="align-middle py-2">
                      <Badge id={`admin-monitor-sysprompts-row-${prompt.id}-type-badge`} variant="outline" className="font-normal">
                        {getPromptTypeLabel(t, prompt.prompt_type)}
                      </Badge>
                    </TableCell>
                    <TableCell id={`admin-monitor-sysprompts-row-${prompt.id}-tokens-cell`} className="align-middle py-2 text-right font-mono text-sm">
                      {prompt.max_input_tokens.toLocaleString()} / {prompt.max_output_tokens.toLocaleString()}
                    </TableCell>
                    <TableCell id={`admin-monitor-sysprompts-row-${prompt.id}-actions-cell`} className="align-middle py-2 text-right">
                      <div id={`admin-monitor-sysprompts-row-${prompt.id}-actions-wrap`} className="flex items-center justify-end gap-1">
                        <Button
                          id={`admin-monitor-sysprompts-row-${prompt.id}-view-btn`}
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPrompt(prompt)}
                          title={t("common.viewDetails")}
                        >
                          <Eye id={`admin-monitor-sysprompts-row-${prompt.id}-view-icon`} className="h-4 w-4" />
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

      <Sheet open={!!selectedPrompt} onOpenChange={(open) => { if (!open) setSelectedPrompt(null); }}>
        <SheetContent id="admin-monitor-sysprompts-sheet" side="right" className="flex h-full w-full flex-col overflow-y-auto p-6 sm:max-w-2xl">
          <SheetHeader id="admin-monitor-sysprompts-sheet-header" className="text-left">
            <div id="admin-monitor-sysprompts-sheet-header-row" className="flex items-start justify-between gap-3">
              <div id="admin-monitor-sysprompts-sheet-title-wrap" className="space-y-1">
                <h2 id="admin-monitor-sysprompts-sheet-title" className="text-lg font-semibold">
                  {selectedPrompt?.name || t("systemPrompts.contentPreview")}
                </h2>
                <p id="admin-monitor-sysprompts-sheet-desc" className="text-sm text-muted-foreground">
                  {t("systemPrompts.contentPreview")}
                </p>
              </div>
            </div>
          </SheetHeader>
          <div id="admin-monitor-sysprompts-sheet-body" className="mt-6 flex-1 rounded-lg border bg-muted/30 p-4">
            <pre id="admin-monitor-sysprompts-sheet-content" className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {selectedPrompt?.content || ""}
            </pre>
          </div>
          {selectedPrompt && (
            <div id={`admin-monitor-sysprompts-sheet-footer-${selectedPrompt.id}`} className="mt-4 flex items-center justify-between gap-4">
              <div id={`admin-monitor-sysprompts-sheet-meta-${selectedPrompt.id}`} className="space-y-1 text-xs text-muted-foreground">
                <p id={`admin-monitor-sysprompts-sheet-meta-type-${selectedPrompt.id}`}>
                  {t("systemPrompts.promptType")}: {getPromptTypeLabel(t, selectedPrompt.prompt_type)}
                </p>
                <p id={`admin-monitor-sysprompts-sheet-meta-tokens-${selectedPrompt.id}`}>
                  {t("systemPrompts.inputOutputTokens")}: {selectedPrompt.max_input_tokens.toLocaleString()} / {selectedPrompt.max_output_tokens.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
