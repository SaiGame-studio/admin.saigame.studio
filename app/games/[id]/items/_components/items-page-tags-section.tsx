"use client";

import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { Loader2, Pencil, RefreshCw, Search, Tag, Trash2, Wand2, X } from "lucide-react";

import { toSlug } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { listItemTags, createItemTag, updateItemTag, deleteItemTag } from "@/lib/inventory-api";
import type { ItemTag } from "@/lib/inventory-api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type ItemsPageTagsSectionProps = {
  gameId: string;
  tags: ItemTag[];
  setTags: (tags: ItemTag[]) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  error: string | null;
  setError: (value: string | null) => void;
  activeTab: string;
};

export function ItemsPageTagsSection({
  gameId,
  tags,
  setTags,
  loading,
  setLoading,
  error,
  setError,
  activeTab,
}: ItemsPageTagsSectionProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ItemTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<ItemTag | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tag_key: "",
    label: "",
    color: "#A855F7",
    metadata: "{}",
  });
  const [autoSlug, setAutoSlug] = useState(true);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  const fetchTags = useCallback(() => {
    if (!gameId) {
      return;
    }

    setLoading(true);
    setError(null);

    listItemTags({ gameId }, { limit: 100, offset: 0 })
      .then((res) => {
        setTags(res.tags ?? []);
        setHasFetched(true);
      })
      .catch((e) => setError(e?.message ?? "Failed to load item tags"))
      .finally(() => setLoading(false));
  }, [gameId, setError, setLoading, setTags]);

  useEffect(() => {
    if (activeTab !== "tags" || !gameId) {
      return;
    }
    if (tags.length > 0 || loading || hasFetched) {
      return;
    }
    fetchTags();
  }, [activeTab, fetchTags, gameId, loading, tags.length, hasFetched]);

  function openCreate() {
    setEditingTag(null);
    setForm({ tag_key: "", label: "", color: "#A855F7", metadata: "{}" });
    setAutoSlug(true);
    setFormErr(null);
    setSheetOpen(true);
  }

  function openEdit(tag: ItemTag, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTag(tag);
    setForm({
      tag_key: tag.tag_key,
      label: tag.label,
      color: tag.color ?? "#A855F7",
      metadata: tag.metadata ? JSON.stringify(tag.metadata, null, 2) : "{}",
    });
    setAutoSlug(false);
    setFormErr(null);
    setSheetOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);

    if (!editingTag) {
      const key = form.tag_key;
      if (form.label.trim().length > 20) {
        setFormErr(t("items.tagLabelTooLong"));
        return;
      }
      if (key.length < 2) {
        setFormErr(t("items.tagKeyTooShort"));
        return;
      }
      if (key.length > 20) {
        setFormErr(t("items.tagKeyTooLong"));
        return;
      }
      if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(key)) {
        setFormErr(t("items.tagKeyInvalid"));
        return;
      }
      if (tags.length >= 50) {
        setFormErr(t("items.tagMaxReached"));
        return;
      }
    }

    let parsedMeta: Record<string, unknown> = {};
    try {
      parsedMeta = JSON.parse(form.metadata || "{}");
    } catch {
      setFormErr("Metadata must be valid JSON");
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        const updated = await updateItemTag({ gameId }, editingTag.id, {
          label: form.label,
          color: form.color,
          metadata: parsedMeta,
        });
        setTags(tags.map((tag) => (tag.id === updated.id ? updated : tag)));
        toast({ title: t("items.tagUpdated") });
      } else {
        const created = await createItemTag({ gameId }, {
          tag_key: form.tag_key,
          label: form.label,
          color: form.color,
          metadata: parsedMeta,
        });
        setTags([...tags, created]);
        toast({ title: t("items.tagCreated") });
      }
      setSheetOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save tag";
      setFormErr(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingTag) {
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteItemTag({ gameId }, deletingTag.id);
      setTags(tags.filter((tag) => tag.id !== deletingTag.id));
      toast({ title: t("items.tagDeleted") });
      setDeletingTag(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("items.failedToDelete");
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }

  const filtered = search
    ? tags.filter(
        (tag) =>
          tag.tag_key.toLowerCase().includes(search.toLowerCase()) ||
          tag.label.toLowerCase().includes(search.toLowerCase()),
      )
    : tags;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t("items.itemTagsTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {tags.length > 0 ? (
              <>
                <span className={tags.length >= 50 ? "text-destructive font-medium" : ""}>{tags.length}</span>
                <span className="text-muted-foreground">/50 {t("items.tagsLabel")} ? {t("items.tagLimitFixed")}</span>
              </>
            ) : (
              t("items.noTagsYet")
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={t("items.searchTagsPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchTags} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openCreate} disabled={tags.length >= 50}>
            <Tag className="h-3.5 w-3.5 mr-1" /> {t("items.newTag")}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Tag className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{search ? t("items.noTagsMatchSearch") : t("items.noTagsCreate")}</p>
          {!search && (
            <Button size="sm" onClick={openCreate}>
              <Tag className="h-3.5 w-3.5 mr-1" /> {t("items.newTag")}
            </Button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((tag) => (
            <Card key={tag.id} className="relative group">
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(tag, e)} title={t("common.edit")}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTag(tag);
                  }}
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardContent className="pt-4 pb-4 px-4 space-y-2">
                <div className="flex items-center gap-2 pr-16">
                  <span className="inline-block h-4 w-4 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: tag.color }} />
                  <span className="font-semibold text-sm truncate">{tag.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                    {tag.tag_key}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {tag.item_count} {t("items.itemsUnit")}
                  </span>
                </div>
                {tag.metadata && Object.keys(tag.metadata).length > 0 && (
                  <p className="text-xs text-muted-foreground font-mono truncate">{JSON.stringify(tag.metadata)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTag ? t("items.editTag") : t("items.createTag")}</SheetTitle>
            <SheetDescription>
              {editingTag ? `${t("items.editTagDesc")} "${editingTag.label}"` : t("items.createTagDesc")}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2.5 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> {t("items.tagKeyRules")}
              </p>
              <ul className="space-y-0.5 pl-1">
                <li>
                  Format: <code className="font-mono bg-muted rounded px-1">^[a-z0-9][a-z0-9\-]*[a-z0-9]$</code>
                </li>
                <li>{t("items.tagRuleLower")}</li>
                <li>{t("items.tagRuleStart")}</li>
                <li>{t("items.tagRuleLength")}</li>
                <li>
                  <span className="text-amber-500 font-medium">{t("items.tagImmutableNote")}</span>
                </li>
                <li>{t("items.tagRuleMax")}</li>
              </ul>
            </div>
            {!editingTag && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="label">
                    {t("items.label")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="label"
                    placeholder="e.g. Rare"
                    value={form.label}
                    maxLength={20}
                    onChange={(e) => {
                      const label = e.target.value;
                      setForm((f) => ({
                        ...f,
                        label,
                        ...(autoSlug ? { tag_key: toSlug(label).slice(0, 20) } : {}),
                      }));
                    }}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag_key">
                    {t("items.tagKey")} <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="tag_key"
                      placeholder="e.g. rare-starter"
                      value={form.tag_key}
                      maxLength={20}
                      onChange={(e) => {
                        setAutoSlug(false);
                        setForm((f) => ({ ...f, tag_key: toSlug(e.target.value) }));
                      }}
                      required
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant={autoSlug ? "default" : "outline"}
                      className="h-9 w-9 shrink-0"
                      title={autoSlug ? t("items.tagAutoSlugOn") : t("items.tagAutoSlugOff")}
                      onClick={() => setAutoSlug((v) => !v)}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {autoSlug ? <span className="text-primary">{t("items.tagAutoGenerating")}</span> : <span>{t("items.tagAutoLowercaseOnly")}</span>}
                    </span>
                    <span className={form.tag_key.length > 18 ? "text-amber-500" : ""}>{form.tag_key.length}/20</span>
                  </div>
                </div>
              </>
            )}
            {editingTag && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="label">
                    {t("items.label")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="label"
                    placeholder="e.g. Rare"
                    value={form.label}
                    maxLength={20}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("items.tagKey")}</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">{editingTag.tag_key}</code>
                    <span className="text-[11px] text-amber-500 font-medium whitespace-nowrap">{t("items.tagImmutable")}</span>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="color">{t("items.color")}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-md border border-input p-1"
                />
                <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="#A855F7" className="font-mono" />
              </div>
            </div>
            {formErr && <p className="text-sm text-destructive">{formErr}</p>}
            <SheetFooter className="gap-2 flex-wrap">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editingTag ? t("items.saveChanges") : t("items.createTag")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                {t("common.cancel")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deletingTag}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTag(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("items.deleteTag")} "{deletingTag?.label}"?
            </AlertDialogTitle>
            <AlertDialogDescription>{t("items.deleteTagDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
