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
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("items.editPresetDefinition")}</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground truncate">{definition.id}</p>
        </SheetHeader>
        <div className="space-y-4 py-2 pr-2.5 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="epd-name">
              {t("items.name")} <span className="text-destructive">*</span>
            </Label>
            <Input id="epd-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="epd-code-name">{t("items.codeName")}</Label>
            <Input id="epd-code-name" value={definition.code_name ?? ""} readOnly className="font-mono opacity-70" />
            <p className="text-xs text-muted-foreground">{t("items.codeName")} is readonly.</p>
          </div>
          <div className="space-y-1">
            <Label>{t("items.presetType")}</Label>
            <Input value={definition.preset_type} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">{t("items.presetTypeImmutable")}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="epd-slots">
                {t("items.maxSlots")} <span className="text-destructive">*</span>
              </Label>
              <span className="text-sm font-semibold tabular-nums">{maxSlots} / 70</span>
            </div>
            <Slider id="epd-slots" min={1} max={70} step={1} value={[Number(maxSlots)]} onValueChange={([v]) => setMaxSlots(String(v))} />
            {errors.maxSlots && <p className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t("items.metadataOptional")} />
          </div>
        </div>
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t("items.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
