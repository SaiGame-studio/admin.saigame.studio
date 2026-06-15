"use client";

import { useMemo, useState } from "react";
import { Eye, RefreshCw, BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import type { SystemPrompt } from "@/lib/system-prompt-api";
import { getPromptTypeLabel } from "./system-prompt-shared";

interface DefaultSystemPromptsContentProps {
  t: (key: string) => string;
  prompts: SystemPrompt[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function DefaultSystemPromptsContent({
  t,
  prompts,
  loading,
  error,
  refreshing,
  onRefresh,
}: DefaultSystemPromptsContentProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);

  const sortedPrompts = useMemo(() => {
    return [...prompts].sort((a, b) => a.name.localeCompare(b.name));
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
        <Button id="game-sysprompts-default-refresh-btn" variant="outline" size="icon" onClick={onRefresh} disabled={refreshing} title={t("systemPrompts.refresh")} className="h-8 w-8">
          <RefreshCw id="game-sysprompts-default-refresh-icon" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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
                  <TableHead id="game-sysprompts-default-table-head-order" className="w-16">{t("systemPrompts.order")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-name">{t("systemPrompts.name")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-type">{t("systemPrompts.promptType")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-tokens" className="text-right">{t("systemPrompts.inputOutputTokens")}</TableHead>
                  <TableHead id="game-sysprompts-default-table-head-actions" className="text-right">{t("systemPrompts.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id="game-sysprompts-default-table-body">
                {sortedPrompts.map((prompt, index) => {
                  return (
                    <TableRow id={`game-sysprompts-default-row-${prompt.id}`} key={prompt.id} className="hover:bg-muted/40">
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-order-cell`} className="py-2 align-middle text-muted-foreground">
                        <span id={`game-sysprompts-default-row-${prompt.id}-order`} className="font-mono text-sm">
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-name-cell`} className="py-2 align-middle">
                        <div id={`game-sysprompts-default-row-${prompt.id}-name-wrap`} className="space-y-1">
                          <span id={`game-sysprompts-default-row-${prompt.id}-name`} className="font-medium">
                            {prompt.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-type-cell`} className="py-2 align-middle">
                        <Badge id={`game-sysprompts-default-row-${prompt.id}-type-badge`} variant="outline" className="font-normal">
                          {getPromptTypeLabel(t, prompt.prompt_type)}
                        </Badge>
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-tokens-cell`} className="py-2 align-middle text-right text-sm font-mono">
                        {prompt.max_input_tokens.toLocaleString()} / {prompt.max_output_tokens.toLocaleString()}
                      </TableCell>
                      <TableCell id={`game-sysprompts-default-row-${prompt.id}-actions-cell`} className="py-2 align-middle text-right">
                        <div id={`game-sysprompts-default-row-${prompt.id}-actions-wrap`} className="flex items-center justify-end gap-1">
                          <Button
                            id={`game-sysprompts-default-row-${prompt.id}-view-btn`}
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPrompt(prompt)}
                            title={t("common.viewDetails")}
                          >
                            <Eye id={`game-sysprompts-default-row-${prompt.id}-view-icon`} className="h-4 w-4" />
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

      <Sheet open={!!selectedPrompt} onOpenChange={(open) => { if (!open) setSelectedPrompt(null); }}>
        <SheetContent id="game-sysprompts-default-sheet" side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-6">
          <SheetHeader id="game-sysprompts-default-sheet-header" className="text-left">
            <div id="game-sysprompts-default-sheet-title-wrap" className="space-y-1">
              <h2 id="game-sysprompts-default-sheet-title" className="text-lg font-semibold">
                {selectedPrompt?.name || t("systemPrompts.contentPreview")}
              </h2>
              <p id="game-sysprompts-default-sheet-desc" className="text-sm text-muted-foreground">
                {t("systemPrompts.contentPreview")}
              </p>
            </div>
          </SheetHeader>
          <div id="game-sysprompts-default-sheet-body" className="mt-6 flex-1 rounded-lg border bg-muted/30 p-4">
            <pre id="game-sysprompts-default-sheet-content" className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {selectedPrompt?.content || ""}
            </pre>
          </div>
          {selectedPrompt && (
            <div id="game-sysprompts-default-sheet-meta" className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <p id="game-sysprompts-default-sheet-meta-type">
                {t("systemPrompts.promptType")}: {getPromptTypeLabel(t, selectedPrompt.prompt_type)}
              </p>
              <p id="game-sysprompts-default-sheet-meta-tokens">
                {t("systemPrompts.inputOutputTokens")}: {selectedPrompt.max_input_tokens.toLocaleString()} / {selectedPrompt.max_output_tokens.toLocaleString()}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
