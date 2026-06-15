"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { GameNavButtons } from "@/components/GameNavButtons";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getGame } from "@/lib/game-api";
import { listRequestTypes } from "@/lib/llm-conversation-api";
import { createGameSystemPrompt, deleteGameSystemPrompt, listDefaultSystemPrompts, listGameSystemPrompts, updateGameSystemPrompt, type CreateSystemPromptBody, type SystemPrompt, type UpdateSystemPromptBody } from "@/lib/system-prompt-api";
import type { Game } from "@/types/game";
import { ApiError } from "@/lib/api-client";
import { DefaultSystemPromptsContent } from "./DefaultSystemPromptsContent";
import { SystemPromptsContent } from "./SystemPromptsContent";
import { SystemPromptEditorSheet } from "./SystemPromptEditorSheet";
import { DEFAULT_FORM, FALLBACK_REQUEST_TYPES, SLOT_LIMIT, asNumber, buildFormFromPrompt, getPromptTypeLabel, trimOrEmpty, type PromptTypeOption, type StatusFilter, type SystemPromptFormState } from "./system-prompt-shared";

function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export default function GameSystemPromptsPage() {
  const params = useParams() as { id: string };
  const gameId = params.id;
  const { toast } = useToast();
  const { locale } = useLanguage();
  const { t } = useTranslation(locale);

  const [game, setGame] = useState<Game | null>(null);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [defaultPrompts, setDefaultPrompts] = useState<SystemPrompt[]>([]);
  const [requestTypes, setRequestTypes] = useState<string[]>(FALLBACK_REQUEST_TYPES);
  const [loading, setLoading] = useState(true);
  const [defaultLoading, setDefaultLoading] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);
  const [defaultError, setDefaultError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"game-prompts" | "default-prompts">("game-prompts");

  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [form, setForm] = useState<SystemPromptFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SystemPrompt | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setDefaultLoading(true);
    setGameError(null);
    setDefaultError(null);
    try {
      const [gameRes, promptsRes, defaultPromptsRes, typesRes] = await Promise.allSettled([
        getGame(gameId),
        listGameSystemPrompts(gameId),
        listDefaultSystemPrompts(),
        listRequestTypes().catch(() => FALLBACK_REQUEST_TYPES),
      ]);

      if (gameRes.status === "fulfilled") {
        setGame(gameRes.value);
      }
      else {
        console.error("Failed to load game:", gameRes.reason);
        setGameError(gameRes.reason instanceof Error ? gameRes.reason.message : t("systemPrompts.loadError"));
      }

      if (promptsRes.status === "fulfilled") {
        setPrompts(Array.isArray(promptsRes.value?.data) ? promptsRes.value.data : []);
      }
      else {
        console.error("Failed to load game system prompts:", promptsRes.reason);
        setPrompts([]);
        setGameError(promptsRes.reason instanceof Error ? promptsRes.reason.message : t("systemPrompts.loadError"));
      }

      if (defaultPromptsRes.status === "fulfilled") {
        setDefaultPrompts(Array.isArray(defaultPromptsRes.value?.data) ? defaultPromptsRes.value.data : []);
      }
      else {
        console.error("Failed to load default system prompts:", defaultPromptsRes.reason);
        setDefaultPrompts([]);
        setDefaultError(defaultPromptsRes.reason instanceof Error ? defaultPromptsRes.reason.message : t("systemPrompts.defaultLoadError"));
      }

      if (typesRes.status === "fulfilled") {
        const requestTypeValues = Array.isArray(typesRes.value) ? typesRes.value : FALLBACK_REQUEST_TYPES;
        setRequestTypes(requestTypeValues.filter((value, index, array) => array.indexOf(value) === index));
      }
      else {
        setRequestTypes(FALLBACK_REQUEST_TYPES);
      }
    }
    catch (err) {
      console.error("Unexpected failure while loading system prompts:", err);
      setGameError(err instanceof Error ? err.message : t("systemPrompts.loadError"));
    }
    finally {
      setLoading(false);
      setDefaultLoading(false);
      setRefreshing(false);
    }
  }, [gameId, t]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const promptTypeOptions = useMemo<PromptTypeOption[]>(() => {
    const merged = [...FALLBACK_REQUEST_TYPES, ...requestTypes];
    return merged
      .filter((value, index, array) => array.indexOf(value) === index)
      .map((value) => ({ value, label: getPromptTypeLabel(t, value) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [requestTypes, t]);

  const activePromptCount = useMemo(() => prompts.filter((prompt) => prompt.is_active).length, [prompts]);
  const lockedSlots = Math.max(activePromptCount - SLOT_LIMIT, 0);
  const freeSlots = Math.max(SLOT_LIMIT - activePromptCount, 0);
  const effectiveActiveCount = activePromptCount - (editingPrompt?.is_active ? 1 : 0) + (form.is_active ? 1 : 0);
  const needsUnlockWarning = form.is_active && effectiveActiveCount > SLOT_LIMIT;

  function openCreate() {
    setEditingPrompt(null);
    setForm({ ...DEFAULT_FORM });
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(prompt: SystemPrompt) {
    setEditingPrompt(prompt);
    setForm(buildFormFromPrompt(prompt));
    setFormError(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setSaving(false);
    setFormError(null);
    setEditingPrompt(null);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPage();
  }, [loadPage]);

  async function handleSave() {
    const name = trimOrEmpty(form.name);
    const prompt_type = trimOrEmpty(form.prompt_type);
    const content = trimOrEmpty(form.content);
    const description = trimOrEmpty(form.description);
    const model = trimOrEmpty(form.model);
    const body: CreateSystemPromptBody = {
      name,
      prompt_type,
      description,
      content,
      is_active: form.is_active,
      max_input_tokens: asNumber(form.max_input_tokens, Number(DEFAULT_FORM.max_input_tokens)),
      max_output_tokens: asNumber(form.max_output_tokens, Number(DEFAULT_FORM.max_output_tokens)),
      temperature: asNumber(form.temperature, Number(DEFAULT_FORM.temperature)),
      provider: form.provider || null,
      model: model || null,
    };

    if (!name || !prompt_type || !content) {
      setFormError(t("systemPrompts.requiredFields"));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingPrompt) {
        await updateGameSystemPrompt(gameId, editingPrompt.id, body as UpdateSystemPromptBody);
        toast({ title: t("common.saved"), description: t("systemPrompts.updatedSuccess") });
      }
      else {
        await createGameSystemPrompt(gameId, body);
        toast({ title: t("common.added"), description: t("systemPrompts.createdSuccess") });
      }
      setBillingNotice(null);
      closeEditor();
      await loadPage();
    }
    catch (err) {
      const message = isApiError(err) ? (err.data?.error || err.message) : err instanceof Error ? err.message : t("systemPrompts.saveFailed");
      if (isApiError(err) && err.status === 402) {
        setBillingNotice(t("systemPrompts.paymentRequired"));
        setFormError(t("systemPrompts.paymentRequired"));
      }
      else if (isApiError(err) && err.status === 409) {
        setFormError(message || t("systemPrompts.duplicateName"));
      }
      else if (isApiError(err) && err.status === 403) {
        setFormError(t("systemPrompts.accessDenied"));
      }
      else if (isApiError(err) && err.status === 404) {
        setFormError(t("systemPrompts.promptNotFound"));
      }
      else {
        setFormError(message || t("systemPrompts.saveFailed"));
      }
    }
    finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(prompt: SystemPrompt) {
    setRefreshing(true);
    try {
      await updateGameSystemPrompt(gameId, prompt.id, { is_active: !prompt.is_active });
      toast({
        title: t("common.saved"),
        description: prompt.is_active ? t("systemPrompts.deactivatedSuccess") : t("systemPrompts.activatedSuccess"),
      });
      setBillingNotice(null);
      await loadPage();
    }
    catch (err) {
      const message = isApiError(err) ? (err.data?.error || err.message) : err instanceof Error ? err.message : t("systemPrompts.saveFailed");
      if (isApiError(err) && err.status === 402) {
        setBillingNotice(t("systemPrompts.paymentRequired"));
      }
      toast({
        variant: "destructive",
        title: isApiError(err) && err.status === 402 ? t("systemPrompts.paymentRequired") : t("common.error"),
        description: message || t("systemPrompts.saveFailed"),
      });
    }
    finally {
      setRefreshing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget)
      return;
    setDeleting(true);
    try {
      await deleteGameSystemPrompt(gameId, deleteTarget.id);
      toast({ title: t("common.deleted"), description: t("systemPrompts.deletedSuccess") });
      setDeleteTarget(null);
      await loadPage();
    }
    catch (err) {
      const message = isApiError(err) ? (err.data?.error || err.message) : err instanceof Error ? err.message : t("systemPrompts.deleteFailed");
      toast({ variant: "destructive", title: t("common.error"), description: message || t("systemPrompts.deleteFailed") });
    }
    finally {
      setDeleting(false);
    }
  }

  return (
    <div id="game-sysprompts-page" className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <div id="game-sysprompts-breadcrumbs-wrap" className="mb-4">
        <Breadcrumb id="game-sysprompts-breadcrumbs">
          <BreadcrumbList id="game-sysprompts-breadcrumbs-list" className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem id="game-sysprompts-breadcrumbs-games-item">
              <BreadcrumbLink id="game-sysprompts-breadcrumbs-games-link" href="/games">
                {t("common.games")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator id="game-sysprompts-breadcrumbs-games-sep">/</BreadcrumbSeparator>
            <BreadcrumbItem id="game-sysprompts-breadcrumbs-game-item">
              <BreadcrumbLink id="game-sysprompts-breadcrumbs-game-link" href={game ? `/games/${game.id}` : `/games/${gameId}`}>
                {game?.name ?? gameId}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator id="game-sysprompts-breadcrumbs-game-sep">/</BreadcrumbSeparator>
            <BreadcrumbItem id="game-sysprompts-breadcrumbs-current-item">
              <span id="game-sysprompts-breadcrumbs-current-text">{t("systemPrompts.title")}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div id="game-sysprompts-header" className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
        <div id="game-sysprompts-title-block" className="flex items-center gap-3 min-w-0">
          <Button id="game-sysprompts-back-btn" variant="outline" size="icon" className="shrink-0" asChild>
            <Link href={`/games/${gameId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div id="game-sysprompts-title-copy" className="min-w-0 flex-1">
            <h1 id="game-sysprompts-title" className="text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
              {t("systemPrompts.title")}
            </h1>
            <p id="game-sysprompts-subtitle" className="text-muted-foreground flex items-center gap-2 flex-wrap text-sm">
              <span id="game-sysprompts-subtitle-count" className={activePromptCount >= SLOT_LIMIT ? "text-destructive font-medium" : ""}>
                {activePromptCount.toLocaleString()} / {SLOT_LIMIT.toLocaleString()} {t("systemPrompts.activeCountLabel")}
              </span>
              <span id="game-sysprompts-subtitle-bar" className="inline-block h-1.5 w-20 shrink-0 rounded-full bg-muted overflow-hidden align-middle sm:w-24">
                <span
                  id="game-sysprompts-subtitle-bar-fill"
                  className={`block h-full rounded-full transition-all ${activePromptCount >= SLOT_LIMIT ? "bg-destructive" : activePromptCount / SLOT_LIMIT >= 0.8 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${Math.min((activePromptCount / SLOT_LIMIT) * 100, 100)}%` }}
                />
              </span>
              <span id="game-sysprompts-subtitle-free" className="inline-flex items-center gap-1">
                {freeSlots.toLocaleString()} {t("systemPrompts.freeSlotsLeftShort")}
              </span>
              {lockedSlots > 0 && (
                <Link id="game-sysprompts-subtitle-upgrade-link" href="/payment" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0" title={t("systemPrompts.topUpSCoin")}>
                  <Hammer className="h-3.5 w-3.5" />
                </Link>
              )}
            </p>
          </div>
        </div>
        <div id="game-sysprompts-header-actions" className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="sysprompts" />
        </div>
      </div>

      <Tabs id="game-sysprompts-tabs" value={activeTab} onValueChange={(value) => setActiveTab(value as "game-prompts" | "default-prompts")} className="space-y-4">
        <TabsList id="game-sysprompts-tabs-list" className="w-auto inline-flex">
          <TabsTrigger id="game-sysprompts-tab-game-prompts" value="game-prompts" className="whitespace-nowrap">
            {t("systemPrompts.tabGamePrompts")}
          </TabsTrigger>
          <TabsTrigger id="game-sysprompts-tab-default-prompts" value="default-prompts" className="whitespace-nowrap">
            {t("systemPrompts.tabDefaultPrompts")}
          </TabsTrigger>
        </TabsList>

        <TabsContent id="game-sysprompts-tab-game-prompts-content" value="game-prompts" className="mt-0">
          <SystemPromptsContent
            locale={locale}
            t={t}
            prompts={prompts}
            requestTypes={requestTypes}
            loading={loading}
            error={gameError}
            refreshing={refreshing}
            billingNotice={billingNotice}
            nameFilter={nameFilter}
            setNameFilter={setNameFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onRefresh={onRefresh}
            onCreate={openCreate}
            onEdit={openEdit}
            onToggle={handleToggleActive}
            onDelete={setDeleteTarget}
            onDismissBilling={() => setBillingNotice(null)}
          />
        </TabsContent>

        <TabsContent id="game-sysprompts-tab-default-prompts-content" value="default-prompts" className="mt-0">
          <DefaultSystemPromptsContent
            t={t}
            prompts={defaultPrompts}
            loading={defaultLoading}
            error={defaultError}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </TabsContent>
      </Tabs>

      <SystemPromptEditorSheet
        open={editorOpen}
        editingPrompt={editingPrompt}
        form={form}
        setForm={setForm}
        saving={saving}
        formError={formError}
        needsUnlockWarning={needsUnlockWarning}
        promptTypeOptions={promptTypeOptions}
        t={t}
        onClose={closeEditor}
        onSave={() => void handleSave()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent id="game-sysprompts-delete-dialog">
          <AlertDialogHeader id="game-sysprompts-delete-header">
            <AlertDialogTitle id="game-sysprompts-delete-title">{t("systemPrompts.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription id="game-sysprompts-delete-desc">
              {t("systemPrompts.deleteDescription").replace("{name}", deleteTarget?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter id="game-sysprompts-delete-footer">
            <AlertDialogCancel id="game-sysprompts-delete-cancel" disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction id="game-sysprompts-delete-confirm" onClick={() => void handleDelete()} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("systemPrompts.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
