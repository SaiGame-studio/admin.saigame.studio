"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Check, Copy, ExternalLink, Loader2, Plus, RefreshCw, Save, Wand2, X, ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n/use-translation";
import { toSlugUnderscore } from "@/lib/utils";
import type { GachaPack, ItemCategory, ItemDefinition } from "@/types/inventory";
import { useEscapeLayer } from "@/hooks/use-escape-manager";

type GachaFormState = {
  name: string;
  code_name: string;
  collect_destination: "mailbox" | "inventory";
  is_enabled: boolean;
  mailbox_title: string;
  mailbox_body: string;
  pool: Array<{
    item_definition_id: string;
    weight: string;
    quantity_min: string;
    quantity_max: string;
  }>;
  keyReqs: Array<{
    item_definition_id: string;
    quantity: string;
  }>;
};

function DropBar({ weight, total }: { weight: number; total: number }) {
  const pct = total > 0 ? Math.min((weight / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-1.5 min-w-[400px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{pct.toFixed(2)}%</span>
    </div>
  );
}

export function GachaPackSheet({
  open,
  editingPack,
  gameId,
  gachaForm,
  setGachaForm,
  formSaving,
  gachaAllItems,
  onClose,
  onSave,
  onReloadItems,
  onCreateItem,
}: {
  open: boolean;
  editingPack: GachaPack | null;
  gameId: string;
  gachaForm: GachaFormState;
  setGachaForm: Dispatch<SetStateAction<GachaFormState>>;
  formSaving: boolean;
  gachaAllItems: ItemDefinition[];
  onClose: () => void;
  onSave: (closeAfterSave: boolean) => void;
  onReloadItems: () => void;
  onCreateItem: (category: ItemCategory) => void;
}) {
  const { t } = useTranslation();
  useEscapeLayer(open, onClose);
  const [gachaAutoSlug, setGachaAutoSlug] = useState(true);
  const [copiedPackId, setCopiedPackId] = useState(false);
  const [gachaComboOpen, setGachaComboOpen] = useState<string | null>(null);
  const [gachaComboSearch, setGachaComboSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setGachaAutoSlug(!editingPack);
    setCopiedPackId(false);
    setGachaComboOpen(null);
    setGachaComboSearch("");
  }, [open, editingPack]);

  useEffect(() => {
    if (!copiedPackId) return;
    const timer = window.setTimeout(() => setCopiedPackId(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedPackId]);

  const formTotalWeight = gachaForm.pool.reduce((s, r) => s + (Number(r.weight) || 0), 0);

  function updateKeyReqRow(index: number, patch: Partial<GachaFormState["keyReqs"][number]>) {
    setGachaForm((f) => ({ ...f, keyReqs: f.keyReqs.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
  }

  function addKeyReqRow() {
    setGachaForm((f) => ({ ...f, keyReqs: [...f.keyReqs, { item_definition_id: "", quantity: "1" }] }));
  }

  function removeKeyReqRow(index: number) {
    setGachaForm((f) => ({ ...f, keyReqs: f.keyReqs.filter((_, i) => i !== index) }));
  }

  function updatePoolRow(index: number, patch: Partial<GachaFormState["pool"][number]>) {
    setGachaForm((f) => ({ ...f, pool: f.pool.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
  }

  function addPoolRow() {
    setGachaForm((f) => ({ ...f, pool: [...f.pool, { item_definition_id: "", weight: "700000", quantity_min: "1", quantity_max: "1" }] }));
  }

  function removePoolRow(index: number) {
    setGachaForm((f) => ({ ...f, pool: f.pool.filter((_, i) => i !== index) }));
  }

  const itemOptions = (search: string) =>
    gachaAllItems
      .filter((it) => !search || it.name.toLowerCase().includes(search.toLowerCase()) || it.id.toLowerCase().includes(search.toLowerCase()) || (it.item_code ?? "").toLowerCase().includes(search.toLowerCase()))
      .slice(0, 50);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent id="gacha-pack-sheet" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader id="gacha-pack-sheet-header" className="mb-4">
          <SheetTitle id="gacha-pack-sheet-title">{editingPack ? `${t("items.editPackPrefix")}: ${editingPack.name}` : t("items.newGachaPack")}</SheetTitle>
          <SheetDescription id="gacha-pack-sheet-description" className="text-xs">
            {t("items.gachaSheetDesc")}
          </SheetDescription>
          {editingPack && (
            <div id={`gacha-pack-sheet-id-${editingPack.id}`} className="flex items-center gap-1 pt-1">
              <p id={`gacha-pack-sheet-id-text-${editingPack.id}`} className="text-xs font-mono text-muted-foreground">
                ID: {editingPack.id}
              </p>
              <button
                id={`gacha-pack-sheet-copy-button-${editingPack.id}`}
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={t("items.copyId")}
                onClick={() => {
                  const text = editingPack.id;
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).catch(() => {});
                  }
                  setCopiedPackId(true);
                }}
              >
                {copiedPackId ? <Check id={`gacha-pack-sheet-copy-icon-ok-${editingPack.id}`} className="h-3 w-3 text-green-500" /> : <Copy id={`gacha-pack-sheet-copy-icon-${editingPack.id}`} className="h-3 w-3" />}
              </button>
            </div>
          )}
        </SheetHeader>

        <div id="gacha-pack-sheet-body" className="space-y-5">
          <div id="gacha-pack-sheet-name-row" className="grid grid-cols-[1fr_auto] gap-4 items-end">
            <div id="gacha-pack-sheet-name-field" className="space-y-1.5 min-w-0">
              <Label id="gacha-pack-sheet-name-label" htmlFor="gacha-name">
                {t("items.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="gacha-name"
                placeholder={t("items.gachaNamePlaceholder")}
                value={gachaForm.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setGachaForm((f) => ({ ...f, name: v, ...(gachaAutoSlug ? { code_name: toSlugUnderscore(v) } : {}) }));
                }}
                disabled={formSaving}
              />
            </div>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label id="gacha-pack-sheet-enabled-label" htmlFor="gacha-enabled" className="flex items-center gap-3 h-10 px-3 rounded-md border border-border bg-muted/30 cursor-pointer select-none">
                    <Switch id="gacha-enabled" checked={gachaForm.is_enabled} onCheckedChange={(v) => setGachaForm((f) => ({ ...f, is_enabled: v }))} disabled={formSaving} />
                    <span id="gacha-pack-sheet-enabled-text" className="text-sm font-medium">{t("items.enabled")}</span>
                  </label>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {t("items.playersCanOpen")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div id="gacha-pack-sheet-code-field" className="space-y-1.5">
            <Label id="gacha-pack-sheet-code-label" htmlFor="gacha-code-name">
              {t("items.gachaCodeNameLabel")} <span className="text-muted-foreground text-xs font-normal">({t("items.gachaCodeNameHint")})</span>
            </Label>
            <div id="gacha-pack-sheet-code-row" className="flex gap-2">
              <Input
                id="gacha-code-name"
                placeholder={t("items.gachaCodeNamePlaceholder")}
                value={gachaForm.code_name}
                onChange={(e) => {
                  setGachaAutoSlug(false);
                  setGachaForm((f) => ({ ...f, code_name: e.target.value }));
                }}
                className="font-mono"
                disabled={formSaving}
              />
              <Button
                id="gacha-pack-sheet-auto-slug-button"
                type="button"
                variant={gachaAutoSlug ? "default" : "outline"}
                size="icon"
                className="shrink-0"
                title={gachaAutoSlug ? t("items.autoSlugOn") : t("items.autoSlugOff")}
                onClick={() => {
                  const next = !gachaAutoSlug;
                  setGachaAutoSlug(next);
                  if (next) setGachaForm((f) => ({ ...f, code_name: toSlugUnderscore(f.name) }));
                }}
              >
                <Wand2 id="gacha-pack-sheet-auto-slug-icon" className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator id="gacha-pack-sheet-separator-destination" />

          <div id="gacha-pack-sheet-destination-field" className="space-y-1.5">
            <Label id="gacha-pack-sheet-destination-label" htmlFor="gacha-collect-destination">{t("items.collectDestination")}</Label>
            <Select value={gachaForm.collect_destination} onValueChange={(v) => setGachaForm((f) => ({ ...f, collect_destination: v as "mailbox" | "inventory" }))}>
              <SelectTrigger id="gacha-collect-destination" disabled={formSaving}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent id="gacha-pack-sheet-destination-options">
                <SelectItem id="gacha-pack-sheet-destination-mailbox" value="mailbox">{t("items.collectDestinationMailbox")}</SelectItem>
                <SelectItem id="gacha-pack-sheet-destination-inventory" value="inventory">{t("items.collectDestinationMainInventory")}</SelectItem>
              </SelectContent>
            </Select>
            {gachaForm.collect_destination === "inventory" && <p id="gacha-pack-sheet-destination-hint" className="text-xs text-muted-foreground">{t("items.collectDestinationInventoryHint")}</p>}
          </div>

          {gachaForm.collect_destination === "mailbox" && (
            <div id="gacha-pack-sheet-mailbox" className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
              <div id="gacha-pack-sheet-mailbox-title-field" className="space-y-1.5">
                <Label id="gacha-pack-sheet-mailbox-title-label" htmlFor="gacha-mailbox-title">{t("items.gachaMailboxTitle")}</Label>
                <Input id="gacha-mailbox-title" value={gachaForm.mailbox_title} onChange={(e) => setGachaForm((f) => ({ ...f, mailbox_title: e.target.value }))} placeholder={t("items.gachaMailboxTitlePlaceholder")} disabled={formSaving} />
              </div>
              <div id="gacha-pack-sheet-mailbox-body-field" className="space-y-1.5">
                <Label id="gacha-pack-sheet-mailbox-body-label" htmlFor="gacha-mailbox-body">{t("items.gachaMailboxBody")}</Label>
                <Textarea id="gacha-mailbox-body" value={gachaForm.mailbox_body} onChange={(e) => setGachaForm((f) => ({ ...f, mailbox_body: e.target.value }))} placeholder={t("items.gachaMailboxBodyPlaceholder")} disabled={formSaving} rows={3} />
              </div>
              <p id="gacha-pack-sheet-mailbox-hint" className="text-xs text-muted-foreground">{t("items.gachaMailboxHint")}</p>
            </div>
          )}

          <Separator id="gacha-pack-sheet-separator-keyreqs" />

          <div id="gacha-pack-sheet-keyreqs" className="space-y-3">
            <div id="gacha-pack-sheet-keyreqs-heading">
              <Label id="gacha-pack-sheet-keyreqs-label" className="text-base">{t("items.keyRequirements")}</Label>
              <p id="gacha-pack-sheet-keyreqs-desc" className="text-xs text-muted-foreground">{t("items.keyReqDesc")}</p>
            </div>
            {gachaForm.keyReqs.length > 0 && (
              <div id="gacha-pack-sheet-keyreqs-header" className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_80px_32px] gap-1.5 px-1 font-medium">
                <span id="gacha-pack-sheet-keyreqs-header-icon" />
                <span id="gacha-pack-sheet-keyreqs-header-name">{t("items.name")}</span>
                <span id="gacha-pack-sheet-keyreqs-header-quantity">{t("items.quantity")}</span>
                <span id="gacha-pack-sheet-keyreqs-header-actions" />
              </div>
            )}
            <div id="gacha-pack-sheet-keyreqs-list" className="space-y-2">
              {gachaForm.keyReqs.map((row, i) => (
                <div id={`gacha-pack-sheet-keyreq-row-${row.item_definition_id || i}`} key={`${row.item_definition_id || "empty"}-${i}`} className="grid grid-cols-[24px_1fr_80px_32px] gap-1.5 items-center">
                  {row.item_definition_id ? (
                    <Link id={`gacha-pack-sheet-keyreq-link-${row.item_definition_id || i}`} href={`/games/${gameId}/items/${row.item_definition_id}`} title="View item">
                      <ExternalLink id={`gacha-pack-sheet-keyreq-link-icon-${row.item_definition_id || i}`} className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  ) : (
                    <span id={`gacha-pack-sheet-keyreq-empty-${i}`} />
                  )}
                  <Popover open={gachaComboOpen === `keyreq-${i}`} onOpenChange={(open) => { setGachaComboOpen(open ? `keyreq-${i}` : null); if (!open) setGachaComboSearch(""); }} modal>
                    <PopoverTrigger asChild>
                      <Button id={`gacha-pack-sheet-keyreq-trigger-${row.item_definition_id || i}`} variant="outline" size="sm" className="h-8 text-xs w-full justify-between font-normal" disabled={formSaving}>
                        {row.item_definition_id ? (
                          <span id={`gacha-pack-sheet-keyreq-selected-${row.item_definition_id || i}`} className="truncate">
                            {gachaAllItems.find((it) => it.id === row.item_definition_id)?.name ?? `${row.item_definition_id.slice(0, 8)}...`}
                          </span>
                        ) : (
                          <span id={`gacha-pack-sheet-keyreq-placeholder-${i}`} className="truncate text-muted-foreground">Select item</span>
                        )}
                        <ChevronsUpDown id={`gacha-pack-sheet-keyreq-trigger-icon-${row.item_definition_id || i}`} className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent id={`gacha-pack-sheet-keyreq-popover-${row.item_definition_id || i}`} className="w-[440px] max-w-[calc(100vw-2rem)] p-0" align="start">
                      <Command id={`gacha-pack-sheet-keyreq-command-${row.item_definition_id || i}`} shouldFilter={false}>
                        <CommandInput id={`gacha-pack-sheet-keyreq-search-${row.item_definition_id || i}`} placeholder={t("items.searchByNameOrIdPlaceholder")} value={gachaComboSearch} onValueChange={setGachaComboSearch} />
                        <CommandList id={`gacha-pack-sheet-keyreq-listbox-${row.item_definition_id || i}`}>
                          <CommandEmpty id={`gacha-pack-sheet-keyreq-empty-state-${row.item_definition_id || i}`}>No item found.</CommandEmpty>
                          <CommandGroup id={`gacha-pack-sheet-keyreq-group-${row.item_definition_id || i}`}>
                            {itemOptions(gachaComboSearch).map((it) => (
                              <CommandItem
                                id={`gacha-pack-sheet-keyreq-option-${it.id}-${i}`}
                                key={it.id}
                                value={it.id}
                                onSelect={() => {
                                  updateKeyReqRow(i, { item_definition_id: it.id });
                                  setGachaComboOpen(null);
                                  setGachaComboSearch("");
                                }}
                              >
                                <Check id={`gacha-pack-sheet-keyreq-option-check-${it.id}-${i}`} className={`mr-2 h-4 w-4 shrink-0 ${row.item_definition_id === it.id ? "opacity-100" : "opacity-0"}`} />
                                <span id={`gacha-pack-sheet-keyreq-option-name-${it.id}-${i}`} className="flex-1 truncate">{it.name}</span>
                                {it.item_code && <span id={`gacha-pack-sheet-keyreq-option-code-${it.id}-${i}`} className="text-xs text-muted-foreground font-mono ml-1">({it.item_code})</span>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input id={`gacha-pack-sheet-keyreq-qty-${row.item_definition_id || i}`} type="number" min={1} className="h-8 text-xs text-center font-mono" value={row.quantity} onChange={(e) => updateKeyReqRow(i, { quantity: e.target.value })} disabled={formSaving} />
                  <Button id={`gacha-pack-sheet-keyreq-remove-${row.item_definition_id || i}`} size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeKeyReqRow(i)} disabled={formSaving} type="button">
                    <X id={`gacha-pack-sheet-keyreq-remove-icon-${row.item_definition_id || i}`} className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {gachaForm.keyReqs.length === 0 && <p id="gacha-pack-sheet-no-keyreqs" className="text-xs text-muted-foreground italic">{t("items.noKeyItems")}</p>}
            <div id="gacha-pack-sheet-keyreq-actions" className="flex items-center justify-between">
              <Button id="gacha-pack-sheet-add-keyreq" size="sm" variant="outline" type="button" onClick={addKeyReqRow} disabled={formSaving}>
                <Plus id="gacha-pack-sheet-add-keyreq-icon" className="h-3.5 w-3.5 mr-1" /> {t("items.addKey")}
              </Button>
              <button id="gacha-pack-sheet-create-key-item" type="button" onClick={() => onCreateItem("key" as ItemCategory)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Plus id="gacha-pack-sheet-create-key-item-icon" className="h-3 w-3" />
                {t("items.createNewItem")}
              </button>
              <button id="gacha-pack-sheet-reload-items" type="button" onClick={onReloadItems} disabled={formSaving} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="Reload item definitions">
                <RefreshCw id="gacha-pack-sheet-reload-items-icon" className="h-3 w-3" />
                {t("items.reloadItemDefs")}
              </button>
            </div>
          </div>

          <Separator id="gacha-pack-sheet-separator-pool" />

          <div id="gacha-pack-sheet-pool" className="space-y-3">
            <div id="gacha-pack-sheet-pool-header" className="flex items-center justify-between">
              <div id="gacha-pack-sheet-pool-header-copy">
                <Label id="gacha-pack-sheet-pool-label" className="text-base">{t("items.itemPoolLabel")}</Label>
                {formTotalWeight > 0 && (
                  <p id="gacha-pack-sheet-pool-total" className="text-xs text-muted-foreground">
                    {t("items.totalWeight")}: {formTotalWeight.toLocaleString()}
                    {formTotalWeight === 1000000 && " (1M = % notation)"}
                  </p>
                )}
              </div>
              <Button id="gacha-pack-sheet-add-pool" size="sm" variant="outline" type="button" onClick={addPoolRow} disabled={formSaving}>
                <Plus id="gacha-pack-sheet-add-pool-icon" className="h-3.5 w-3.5 mr-1" /> {t("items.addItem")}
              </Button>
            </div>
            {gachaForm.pool.length > 0 && (
              <div id="gacha-pack-sheet-pool-header-row" className="text-xs text-muted-foreground grid grid-cols-[1fr_110px_120px_120px_32px] gap-1.5 px-1 font-medium">
                <span id="gacha-pack-sheet-pool-header-name">{t("items.name")}</span>
                <span id="gacha-pack-sheet-pool-header-weight">{t("items.weight")}</span>
                <span id="gacha-pack-sheet-pool-header-min">{t("items.min")}</span>
                <span id="gacha-pack-sheet-pool-header-max">{t("items.max")}</span>
                <span id="gacha-pack-sheet-pool-header-actions" />
              </div>
            )}
            <div id="gacha-pack-sheet-pool-list" className="space-y-2">
              {gachaForm.pool.map((row, i) => {
                const pct = formTotalWeight > 0 ? ((Number(row.weight) || 0) / formTotalWeight) * 100 : 0;
                return (
                  <div id={`gacha-pack-sheet-pool-row-${row.item_definition_id || i}`} key={`${row.item_definition_id || "empty"}-${i}`} className="grid grid-cols-[1fr_110px_120px_120px_32px] gap-1.5 items-center">
                    <Popover open={gachaComboOpen === `pool-${i}`} onOpenChange={(open) => { setGachaComboOpen(open ? `pool-${i}` : null); if (!open) setGachaComboSearch(""); }} modal>
                      <PopoverTrigger asChild>
                        <Button id={`gacha-pack-sheet-pool-trigger-${row.item_definition_id || i}`} variant="outline" size="sm" className="h-8 text-xs w-full justify-between font-normal" disabled={formSaving}>
                          {row.item_definition_id ? (
                            <span id={`gacha-pack-sheet-pool-selected-${row.item_definition_id || i}`} className="truncate">
                              {gachaAllItems.find((it) => it.id === row.item_definition_id)?.name ?? `${row.item_definition_id.slice(0, 8)}...`}
                            </span>
                          ) : (
                            <span id={`gacha-pack-sheet-pool-placeholder-${i}`} className="truncate text-muted-foreground">Select item</span>
                          )}
                          <ChevronsUpDown id={`gacha-pack-sheet-pool-trigger-icon-${row.item_definition_id || i}`} className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent id={`gacha-pack-sheet-pool-popover-${row.item_definition_id || i}`} className="w-[440px] max-w-[calc(100vw-2rem)] p-0" align="start">
                        <Command id={`gacha-pack-sheet-pool-command-${row.item_definition_id || i}`} shouldFilter={false}>
                          <CommandInput id={`gacha-pack-sheet-pool-search-${row.item_definition_id || i}`} placeholder={t("items.searchByNameOrIdPlaceholder")} value={gachaComboSearch} onValueChange={setGachaComboSearch} />
                          <CommandList id={`gacha-pack-sheet-pool-listbox-${row.item_definition_id || i}`}>
                            <CommandEmpty id={`gacha-pack-sheet-pool-empty-state-${row.item_definition_id || i}`}>No item found.</CommandEmpty>
                            <CommandGroup id={`gacha-pack-sheet-pool-group-${row.item_definition_id || i}`}>
                              {itemOptions(gachaComboSearch).map((it) => (
                                <CommandItem
                                  id={`gacha-pack-sheet-pool-option-${it.id}-${i}`}
                                  key={it.id}
                                  value={it.id}
                                  onSelect={() => {
                                    updatePoolRow(i, { item_definition_id: it.id });
                                    setGachaComboOpen(null);
                                    setGachaComboSearch("");
                                  }}
                                >
                                  <Check id={`gacha-pack-sheet-pool-option-check-${it.id}-${i}`} className={`mr-2 h-4 w-4 shrink-0 ${row.item_definition_id === it.id ? "opacity-100" : "opacity-0"}`} />
                                  <span id={`gacha-pack-sheet-pool-option-name-${it.id}-${i}`} className="flex-1 truncate">{it.name}</span>
                                  {it.item_code && <span id={`gacha-pack-sheet-pool-option-code-${it.id}-${i}`} className="text-xs text-muted-foreground font-mono ml-1">({it.item_code})</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div id={`gacha-pack-sheet-pool-weight-wrap-${row.item_definition_id || i}`} className="relative">
                      <Input id={`gacha-pack-sheet-pool-weight-${row.item_definition_id || i}`} type="text" inputMode="numeric" className="h-8 text-xs pr-1 font-mono" value={row.weight ? Number(row.weight).toLocaleString() : ""} onChange={(e) => updatePoolRow(i, { weight: e.target.value.replace(/[^0-9]/g, "") })} disabled={formSaving} title={pct > 0 ? `? ${pct.toFixed(2)}%` : ""} />
                    </div>
                    <Input id={`gacha-pack-sheet-pool-min-${row.item_definition_id || i}`} type="text" inputMode="numeric" className="h-8 text-xs text-center font-mono" value={row.quantity_min ? Number(row.quantity_min).toLocaleString() : ""} onChange={(e) => updatePoolRow(i, { quantity_min: e.target.value.replace(/[^0-9]/g, "") })} disabled={formSaving} />
                    <Input id={`gacha-pack-sheet-pool-max-${row.item_definition_id || i}`} type="text" inputMode="numeric" className="h-8 text-xs text-center font-mono" value={row.quantity_max ? Number(row.quantity_max).toLocaleString() : ""} onChange={(e) => updatePoolRow(i, { quantity_max: e.target.value.replace(/[^0-9]/g, "") })} disabled={formSaving} />
                    <Button id={`gacha-pack-sheet-pool-remove-${row.item_definition_id || i}`} size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removePoolRow(i)} disabled={formSaving} type="button">
                      <X id={`gacha-pack-sheet-pool-remove-icon-${row.item_definition_id || i}`} className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {gachaForm.pool.some((r) => r.item_definition_id && Number(r.weight) > 0) && (
              <div id="gacha-pack-sheet-pool-preview" className="mt-3 rounded border bg-muted/40 p-3 space-y-1.5">
                <p id="gacha-pack-sheet-pool-preview-label" className="text-xs font-medium text-muted-foreground mb-2">{t("items.dropRatePreview")}</p>
                {[...gachaForm.pool]
                  .filter((r) => r.item_definition_id)
                  .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))
                  .map((row, i) => {
                    const item = gachaAllItems.find((it) => it.id === row.item_definition_id);
                    return (
                      <div id={`gacha-pack-sheet-pool-preview-row-${row.item_definition_id || i}`} key={`${row.item_definition_id || "preview"}-${i}`} className="flex items-center gap-2 text-xs">
                        <span id={`gacha-pack-sheet-pool-preview-name-${row.item_definition_id || i}`} className="flex-1 truncate">{item?.name ?? row.item_definition_id.slice(0, 8)}</span>
                        <DropBar weight={Number(row.weight) || 0} total={formTotalWeight} />
                      </div>
                    );
                  })}
              </div>
            )}
            {gachaForm.pool.length === 0 && <p id="gacha-pack-sheet-no-pool" className="text-xs text-muted-foreground italic">{t("items.noItemsPool")}</p>}
          </div>

          <div id="gacha-pack-sheet-actions" className="flex items-center justify-end gap-2 pt-6 mt-4 border-t">
            <Button id="gacha-pack-sheet-cancel" variant="outline" onClick={onClose} disabled={formSaving}>
              {t("common.cancel")}
            </Button>
            {editingPack ? (
              <>
                <Button id="gacha-pack-sheet-save-continue" variant="outline" onClick={() => onSave(false)} disabled={formSaving}>
                  {formSaving ? <Loader2 id="gacha-pack-sheet-save-continue-spinner" className="h-4 w-4 mr-2 animate-spin" /> : <Save id="gacha-pack-sheet-save-continue-icon" className="h-4 w-4 mr-2" />}
                  {t("items.saveAndContinue")}
                </Button>
                <Button id="gacha-pack-sheet-save-close" onClick={() => onSave(true)} disabled={formSaving}>
                  {formSaving ? <Loader2 id="gacha-pack-sheet-save-close-spinner" className="h-4 w-4 mr-2 animate-spin" /> : <Save id="gacha-pack-sheet-save-close-icon" className="h-4 w-4 mr-2" />}
                  {t("items.saveAndClose")}
                </Button>
              </>
            ) : (
              <Button id="gacha-pack-sheet-create" onClick={() => onSave(true)} disabled={formSaving}>
                {formSaving ? <Loader2 id="gacha-pack-sheet-create-spinner" className="h-4 w-4 mr-2 animate-spin" /> : <Save id="gacha-pack-sheet-create-icon" className="h-4 w-4 mr-2" />}
                {t("items.createPack")}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
