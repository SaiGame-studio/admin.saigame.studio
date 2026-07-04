"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/use-translation";

export type KVEntry = {
  key: string;
  value: string;
};

export function KVEditor({
  entries,
  onChange,
  label,
  numericValue,
  idPrefix,
}: {
  entries: KVEntry[];
  onChange: (v: KVEntry[]) => void;
  label: string;
  numericValue?: boolean;
  idPrefix?: string;
}) {
  const { t } = useTranslation();
  const resolvedIdPrefix = idPrefix ?? "kv-editor";
  const addRow = () => onChange([...entries, { key: "", value: "" }]);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const update = (i: number, field: "key" | "value", val: string) => {
    if (numericValue && field === "value" && val !== "" && val !== "-" && isNaN(Number(val))) return;
    const next = entries.map((e, idx) => (idx === i ? { ...e, [field]: val } : e));
    onChange(next);
  };

  return (
    <div id={`${resolvedIdPrefix}-container`} className="space-y-1">
      <Label id={`${resolvedIdPrefix}-label`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {entries.map((e, i) => (
        <div id={`${resolvedIdPrefix}-row-${i}`} key={i} className="flex gap-1 items-center">
          <Input
            id={`${resolvedIdPrefix}-key-input-${i}`}
            className="h-7 text-xs"
            placeholder="key"
            value={e.key}
            onChange={(ev) => update(i, "key", ev.target.value)}
          />
          <span id={`${resolvedIdPrefix}-equals-${i}`} className="text-muted-foreground">
            =
          </span>
          <Input
            id={`${resolvedIdPrefix}-value-input-${i}`}
            className="h-7 text-xs"
            placeholder={numericValue ? "0" : "value"}
            inputMode={numericValue ? "decimal" : undefined}
            value={e.value}
            onChange={(ev) => update(i, "value", ev.target.value)}
          />
          <Button
            id={`${resolvedIdPrefix}-remove-btn-${i}`}
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive"
            type="button"
            onClick={() => remove(i)}
          >
            <Trash2 id={`${resolvedIdPrefix}-remove-icon-${i}`} className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button id={`${resolvedIdPrefix}-add-btn`} variant="outline" size="sm" type="button" className="h-7 text-xs mt-1" onClick={addRow}>
        <Plus id={`${resolvedIdPrefix}-add-icon`} className="h-3 w-3 mr-1" /> {t("common.add")}
      </Button>
    </div>
  );
}
