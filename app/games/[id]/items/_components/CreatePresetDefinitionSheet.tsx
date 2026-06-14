"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { createPresetDefinition, type CreatePresetDefinitionRequest } from "@/lib/inventory-api";
import { toSlugUnderscore } from "@/lib/utils";
import { useEscapeLayer } from "@/hooks/use-escape-manager";

import { KVEditor, type KVEntry } from "./KVEditor";

export function CreatePresetDefinitionSheet({
  open,
  gameId,
  initialValues,
  turnContext,
  onCreated,
  onClose,
}: {
  open: boolean;
  gameId: string;
  initialValues?: {
    name?: string;
    preset_type?: string;
    code_name?: string;
    max_slots?: number;
  };
  turnContext?: {
    turnId: string;
    responseIdx: number;
    presetIdx: number;
    convId: string;
  } | null;
  onCreated: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  useEscapeLayer(open, onClose);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [containerType, setContainerType] = useState("");
  const [codeName, setCodeName] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [maxSlots, setMaxSlots] = useState("20");
  const [meta, setMeta] = useState<KVEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && initialValues) {
      if (initialValues.name) setName(initialValues.name);
      if (initialValues.preset_type) setContainerType(initialValues.preset_type);
      if (initialValues.code_name) {
        setCodeName(initialValues.code_name);
        setAutoSlug(false);
      } else if (initialValues.name) {
        setCodeName(toSlugUnderscore(initialValues.name));
      }
      if (initialValues.max_slots) setMaxSlots(String(initialValues.max_slots));
    }
  }, [open, initialValues]);

  function resetForm() {
    setName("");
    setContainerType("");
    setCodeName("");
    setAutoSlug(true);
    setMaxSlots("20");
    setMeta([]);
    setErrors({});
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = t("items.nameMustBe2Chars");
    if (!containerType.trim()) e.containerType = t("items.containerTypeRequired");
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
      const finalCodeName = (autoSlug ? toSlugUnderscore(name) : codeName).trim();
      const body: CreatePresetDefinitionRequest = {
        preset_type: containerType.trim(),
        name: name.trim(),
        ...(finalCodeName ? { code_name: finalCodeName } : {}),
        max_slots: Number(maxSlots),
        metadata,
      };
      const created = await createPresetDefinition({ gameId }, body);
      toast({ title: t("items.presetCreated"), description: `"${name.trim()}" added.` });
      if (turnContext) {
        window.dispatchEvent(
          new CustomEvent("ss:preset-created", {
            detail: {
              presetId: created.id,
              presetName: created.name,
              turnId: turnContext.turnId,
              responseIdx: turnContext.responseIdx,
              presetIdx: turnContext.presetIdx,
            },
          })
        );
      }
      resetForm();
      onCreated();
      onClose();
    } catch (err: any) {
      if (err?.status === 403) {
        toast({ variant: "destructive", title: t("items.permissionDenied"), description: t("items.noPermissionCreatePreset") });
      } else {
        toast({ variant: "destructive", title: t("items.failedToCreate"), description: err?.message ?? "Unknown error" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetForm();
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("items.newPresetDefinition")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="pd-name">
              {t("items.name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pd-name"
              placeholder="e.g. Standard Deck"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (autoSlug) setCodeName(toSlugUnderscore(v));
              }}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-code-name">
              {t("items.codeName")}{" "}
              <span className="text-muted-foreground text-xs font-normal">({t("items.presetCodeNameHint")})</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="pd-code-name"
                placeholder={t("items.presetCodeNamePlaceholder")}
                value={autoSlug ? toSlugUnderscore(name) : codeName}
                onChange={(e) => {
                  setAutoSlug(false);
                  setCodeName(e.target.value);
                }}
                className="font-mono"
              />
              <Button
                type="button"
                variant={autoSlug ? "default" : "outline"}
                size="icon"
                className="shrink-0"
                title={autoSlug ? t("items.autoSlugOn") : t("items.autoSlugOff")}
                onClick={() => {
                  const next = !autoSlug;
                  setAutoSlug(next);
                  if (next) setCodeName(toSlugUnderscore(name));
                }}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-type">
              {t("items.presetType")} <span className="text-destructive">*</span>
            </Label>
            <Input id="pd-type" placeholder="e.g. deck, party" value={containerType} onChange={(e) => setContainerType(e.target.value)} />
            {errors.containerType && <p className="text-xs text-destructive">{errors.containerType}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pd-slots">
                {t("items.maxSlots")} <span className="text-destructive">*</span>
              </Label>
              <span className="text-sm font-semibold tabular-nums">{maxSlots} / 70</span>
            </div>
            <Slider id="pd-slots" min={1} max={70} step={1} value={[Number(maxSlots)]} onValueChange={([v]) => setMaxSlots(String(v))} />
            {errors.maxSlots && <p className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t("items.metadataOptional")} />
          </div>
        </div>
        <SheetFooter className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t("common.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
