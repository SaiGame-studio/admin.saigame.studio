"use client";

import type { Dispatch, SetStateAction } from "react";
import { Check, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SystemPrompt } from "@/lib/system-prompt-api";
import type { SystemPromptProvider } from "@/lib/system-prompt-api";
import type { PromptTypeOption, SystemPromptFormState } from "./system-prompt-shared";

interface SystemPromptEditorSheetProps {
  open: boolean;
  editingPrompt: SystemPrompt | null;
  form: SystemPromptFormState;
  setForm: Dispatch<SetStateAction<SystemPromptFormState>>;
  saving: boolean;
  formError: string | null;
  needsUnlockWarning: boolean;
  promptTypeOptions: PromptTypeOption[];
  t: (key: string) => string;
  onClose: () => void;
  onSave: () => void;
}

export function SystemPromptEditorSheet({
  open,
  editingPrompt,
  form,
  setForm,
  saving,
  formError,
  needsUnlockWarning,
  promptTypeOptions,
  t,
  onClose,
  onSave,
}: SystemPromptEditorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent id="game-sysprompts-editor-sheet" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader id="game-sysprompts-editor-header" className="space-y-2">
          <SheetTitle id="game-sysprompts-editor-title">
            {editingPrompt ? t("systemPrompts.editTitle") : t("systemPrompts.createTitle")}
          </SheetTitle>
          <SheetDescription id="game-sysprompts-editor-desc">
            {editingPrompt ? t("systemPrompts.editDescription") : t("systemPrompts.createDescription")}
          </SheetDescription>
        </SheetHeader>

        <div id="game-sysprompts-editor-body" className="mt-6 space-y-4">
          {formError && (
            <Alert id="game-sysprompts-editor-error" variant="destructive">
              <ShieldAlert id="game-sysprompts-editor-error-icon" className="h-4 w-4" />
              <AlertDescription id="game-sysprompts-editor-error-text">{formError}</AlertDescription>
            </Alert>
          )}

          {needsUnlockWarning && (
            <Alert id="game-sysprompts-editor-warning" className="border-amber-500/40 bg-amber-500/10">
              <ShieldAlert id="game-sysprompts-editor-warning-icon" className="h-4 w-4" />
              <AlertDescription id="game-sysprompts-editor-warning-text">
                {t("systemPrompts.activeCostWarning")}
              </AlertDescription>
            </Alert>
          )}

          <div id="game-sysprompts-editor-name-wrap" className="space-y-2">
            <Label id="game-sysprompts-editor-name-label" htmlFor="game-sysprompts-editor-name-input">
              {t("systemPrompts.name")}
            </Label>
            <Input
              id="game-sysprompts-editor-name-input"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder={t("systemPrompts.namePlaceholder")}
              disabled={saving}
            />
          </div>

          <div id="game-sysprompts-editor-type-wrap" className="space-y-2">
            <Label id="game-sysprompts-editor-type-label" htmlFor="game-sysprompts-editor-type-trigger">
              {t("systemPrompts.promptType")}
            </Label>
            <Select value={form.prompt_type} onValueChange={(value) => setForm((current) => ({ ...current, prompt_type: value }))}>
              <SelectTrigger id="game-sysprompts-editor-type-trigger" disabled={saving}>
                <SelectValue placeholder={t("systemPrompts.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent id="game-sysprompts-editor-type-content">
                {promptTypeOptions.map((option) => (
                  <SelectItem id={`game-sysprompts-editor-type-${option.value}`} key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div id="game-sysprompts-editor-desc-wrap" className="space-y-2">
            <Label id="game-sysprompts-editor-desc-label" htmlFor="game-sysprompts-editor-desc-input">
              {t("systemPrompts.description")}
            </Label>
            <Textarea
              id="game-sysprompts-editor-desc-input"
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              placeholder={t("systemPrompts.descriptionPlaceholder")}
              disabled={saving}
              rows={3}
            />
          </div>

          <div id="game-sysprompts-editor-content-wrap" className="space-y-2">
            <Label id="game-sysprompts-editor-content-label" htmlFor="game-sysprompts-editor-content-input">
              {t("systemPrompts.content")}
            </Label>
            <Textarea
              id="game-sysprompts-editor-content-input"
              value={form.content}
              onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
              placeholder={t("systemPrompts.contentPlaceholder")}
              disabled={saving}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div id="game-sysprompts-editor-active-wrap" className="flex items-center justify-between rounded-lg border p-3">
            <div id="game-sysprompts-editor-active-copy" className="space-y-1">
              <Label id="game-sysprompts-editor-active-label" htmlFor="game-sysprompts-editor-active-switch">
                {t("systemPrompts.active")}
              </Label>
              <p id="game-sysprompts-editor-active-help" className="text-xs text-muted-foreground">
                {t("systemPrompts.activeHelp")}
              </p>
            </div>
            <Switch
              id="game-sysprompts-editor-active-switch"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
              disabled={saving}
            />
          </div>

          <div id="game-sysprompts-editor-token-grid" className="grid gap-4 md:grid-cols-3">
            <div id="game-sysprompts-editor-max-input-wrap" className="space-y-2">
              <Label id="game-sysprompts-editor-max-input-label" htmlFor="game-sysprompts-editor-max-input">
                {t("systemPrompts.maxInputTokens")}
              </Label>
              <Input
                id="game-sysprompts-editor-max-input"
                type="number"
                min="1"
                value={form.max_input_tokens}
                onChange={(e) => setForm((current) => ({ ...current, max_input_tokens: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div id="game-sysprompts-editor-max-output-wrap" className="space-y-2">
              <Label id="game-sysprompts-editor-max-output-label" htmlFor="game-sysprompts-editor-max-output">
                {t("systemPrompts.maxOutputTokens")}
              </Label>
              <Input
                id="game-sysprompts-editor-max-output"
                type="number"
                min="1"
                value={form.max_output_tokens}
                onChange={(e) => setForm((current) => ({ ...current, max_output_tokens: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div id="game-sysprompts-editor-temp-wrap" className="space-y-2">
              <Label id="game-sysprompts-editor-temp-label" htmlFor="game-sysprompts-editor-temp">
                {t("systemPrompts.temperature")}
              </Label>
              <Input
                id="game-sysprompts-editor-temp"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={form.temperature}
                onChange={(e) => setForm((current) => ({ ...current, temperature: e.target.value }))}
                disabled={saving}
              />
            </div>
          </div>

          <div id="game-sysprompts-editor-provider-grid" className="grid gap-4 md:grid-cols-2">
            <div id="game-sysprompts-editor-provider-wrap" className="space-y-2">
              <Label id="game-sysprompts-editor-provider-label" htmlFor="game-sysprompts-editor-provider-trigger">
                {t("systemPrompts.provider")}
              </Label>
              <Select value={form.provider || "none"} onValueChange={(value) => setForm((current) => ({ ...current, provider: value === "none" ? "" : value as SystemPromptProvider }))}>
                <SelectTrigger id="game-sysprompts-editor-provider-trigger" disabled={saving}>
                  <SelectValue placeholder={t("systemPrompts.providerPlaceholder")} />
                </SelectTrigger>
                <SelectContent id="game-sysprompts-editor-provider-content">
                  <SelectItem id="game-sysprompts-editor-provider-none" value="none">
                    {t("common.none")}
                  </SelectItem>
                  <SelectItem id="game-sysprompts-editor-provider-gemini" value="gemini">Gemini</SelectItem>
                  <SelectItem id="game-sysprompts-editor-provider-openai" value="openai">OpenAI</SelectItem>
                  <SelectItem id="game-sysprompts-editor-provider-anthropic" value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div id="game-sysprompts-editor-model-wrap" className="space-y-2">
              <Label id="game-sysprompts-editor-model-label" htmlFor="game-sysprompts-editor-model-input">
                {t("systemPrompts.model")}
              </Label>
              <Input
                id="game-sysprompts-editor-model-input"
                value={form.model}
                onChange={(e) => setForm((current) => ({ ...current, model: e.target.value }))}
                placeholder={t("systemPrompts.modelPlaceholder")}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <SheetFooter id="game-sysprompts-editor-footer" className="mt-6 gap-2 sm:gap-2">
          <Button id="game-sysprompts-editor-cancel-btn" variant="outline" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            id="game-sysprompts-editor-save-btn"
            onClick={() => onSave()}
            disabled={saving || !form.name.trim() || !form.prompt_type.trim() || !form.content.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {editingPrompt ? t("systemPrompts.updatePrompt") : t("systemPrompts.createPrompt")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
