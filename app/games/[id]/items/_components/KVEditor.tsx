"use client";

import { Plus } from "lucide-react";

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
}: {
  entries: KVEntry[];
  onChange: (v: KVEntry[]) => void;
  label: string;
  numericValue?: boolean;
}) {
  const { t } = useTranslation();
  const addRow = () => onChange([...entries, { key: "", value: "" }]);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const update = (i: number, field: "key" | "value", val: string) => {
    if (numericValue && field === "value" && val !== "" && val !== "-" && isNaN(Number(val))) return;
    const next = entries.map((e, idx) => (idx === i ? { ...e, [field]: val } : e));
    onChange(next);
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {entries.map((e, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input className="h-7 text-xs" placeholder="key" value={e.key} onChange={(ev) => update(i, "key", ev.target.value)} />
          <span className="text-muted-foreground">=</span>
          <Input className="h-7 text-xs" placeholder={numericValue ? "0" : "value"} inputMode={numericValue ? "decimal" : undefined} value={e.value} onChange={(ev) => update(i, "value", ev.target.value)} />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" type="button" onClick={() => remove(i)}>
            ?
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" type="button" className="h-7 text-xs mt-1" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" /> {t("common.add")}
      </Button>
    </div>
  );
}
