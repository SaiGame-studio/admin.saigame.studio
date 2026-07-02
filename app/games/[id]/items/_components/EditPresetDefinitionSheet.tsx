"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { updatePresetDefinition, type PresetDefinition, type UpdatePresetDefinitionRequest } from "@/lib/inventory-api";
import { useEscapeLayer } from "@/hooks/use-escape-manager";

import { KVEditor, type KVEntry } from "./KVEditor";

function toKebabIdSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function EditPresetDefinitionSheet({
  open,
  gameId,
  definition,
  onUpdated,
  onClose,
}: {
  open: boolean;
  gameId: string;
  definition: PresetDefinition;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  useEscapeLayer(open, onClose, 1);
  const definitionIdSegment = toKebabIdSegment(definition.id);
  const panelIdPrefix = `edit-preset-definition-${definitionIdSegment}`;
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(definition.name);
  const [maxSlots, setMaxSlots] = useState(String(definition.max_slots));
  const [meta, setMeta] = useState<KVEntry[]>(
    Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(definition.name);
    setMaxSlots(String(definition.max_slots));
    setMeta(Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
    setErrors({});
  }, [open, definition]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = t("items.nameMustBe2Chars");
    const slots = Number(maxSlots);
    if (!maxSlots || !slots || slots < 1 || slots > 70) e.maxSlots = t("items.maxSlotsInvalid");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const metadata: Record<string, unknown> = {};
      meta.forEach(({ key, value }) => {
        if (key.trim()) metadata[key.trim()] = value;
      });
      const body: UpdatePresetDefinitionRequest = {
        name: name.trim(),
        max_slots: Number(maxSlots),
        metadata,
      };
      await updatePresetDefinition({ gameId }, definition.id, body);
      toast({ title: t("items.presetUpdated"), description: `"${name.trim()}" saved.` });
      onUpdated();
      onClose();
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t("items.permissionDenied"), description: t("items.noPermissionUpdatePreset") });
      } else {
        toast({ variant: "destructive", title: t("items.failedToUpdate"), description: err?.message ?? "Unknown error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent id={`${panelIdPrefix}-sheet-content`} side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader id={`${panelIdPrefix}-sheet-header`}>
          <SheetTitle id={`${panelIdPrefix}-sheet-title`}>{t("items.editPresetDefinition")}</SheetTitle>
          <p id={`${panelIdPrefix}-definition-id`} className="text-xs font-mono text-muted-foreground truncate">{definition.id}</p>
        </SheetHeader>
        <div id={`${panelIdPrefix}-form`} className="space-y-4 py-2 pr-2.5 flex-1 overflow-y-auto">
          <div id={`${panelIdPrefix}-name-field`} className="space-y-1">
            <Label id={`${panelIdPrefix}-name-label`} htmlFor={`${panelIdPrefix}-name-input`}>
              {t("items.name")} <span id={`${panelIdPrefix}-name-required`} className="text-destructive">*</span>
            </Label>
            <Input id={`${panelIdPrefix}-name-input`} value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p id={`${panelIdPrefix}-name-error`} className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div id={`${panelIdPrefix}-code-name-field`} className="space-y-1">
            <Label id={`${panelIdPrefix}-code-name-label`} htmlFor={`${panelIdPrefix}-code-name-input`}>{t("items.codeName")}</Label>
            <Input id={`${panelIdPrefix}-code-name-input`} value={definition.code_name ?? ""} readOnly className="font-mono opacity-70" />
            <p id={`${panelIdPrefix}-code-name-description`} className="text-xs text-muted-foreground">{t("items.codeName")} is readonly.</p>
          </div>
          <div id={`${panelIdPrefix}-preset-type-field`} className="space-y-1">
            <Label id={`${panelIdPrefix}-preset-type-label`} htmlFor={`${panelIdPrefix}-preset-type-input`}>{t("items.presetType")}</Label>
            <Input id={`${panelIdPrefix}-preset-type-input`} value={definition.preset_type} disabled className="opacity-60" />
            <p id={`${panelIdPrefix}-preset-type-description`} className="text-xs text-muted-foreground">{t("items.presetTypeImmutable")}</p>
          </div>
          <div id={`${panelIdPrefix}-max-slots-field`} className="space-y-2">
            <div id={`${panelIdPrefix}-max-slots-header`} className="flex items-center justify-between">
              <Label id={`${panelIdPrefix}-max-slots-label`} htmlFor={`${panelIdPrefix}-max-slots-slider`}>
                {t("items.maxSlots")} <span id={`${panelIdPrefix}-max-slots-required`} className="text-destructive">*</span>
              </Label>
              <span id={`${panelIdPrefix}-max-slots-value`} className="text-sm font-semibold tabular-nums">{maxSlots} / 70</span>
            </div>
            <Slider id={`${panelIdPrefix}-max-slots-slider`} min={1} max={70} step={1} value={[Number(maxSlots)]} onValueChange={([v]) => setMaxSlots(String(v))} />
            {errors.maxSlots && <p id={`${panelIdPrefix}-max-slots-error`} className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div id={`${panelIdPrefix}-metadata-field`} className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t("items.metadataOptional")} idPrefix={`${panelIdPrefix}-metadata`} />
          </div>
        </div>
        <SheetFooter id={`${panelIdPrefix}-sheet-footer`} className="pt-4 border-t">
          <Button id={`${panelIdPrefix}-cancel-btn`} variant="outline" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button id={`${panelIdPrefix}-save-btn`} onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 id={`${panelIdPrefix}-save-loading-icon`} className="h-4 w-4 mr-2 animate-spin" /> : <Save id={`${panelIdPrefix}-save-icon`} className="h-4 w-4 mr-2" />}
            {t("items.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
