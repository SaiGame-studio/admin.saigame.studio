"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { ItemDefinition } from "@/types/inventory";

/** Searchable item picker used by the gacha pack sheet (same behavior as the Drop 1 picker). */
export function GachaItemCombobox({
  idPrefix,
  value,
  items,
  disabled,
  onSelect,
}: {
  /** Prefix for element ids; the trigger button id is exactly `idPrefix`. */
  idPrefix: string;
  value: string;
  items: ItemDefinition[];
  disabled?: boolean;
  onSelect: (itemId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.toLowerCase();
  const options = items
    .filter((it) => !query || it.name.toLowerCase().includes(query) || it.id.toLowerCase().includes(query) || (it.item_code ?? "").toLowerCase().includes(query))
    .slice(0, 50);
  const selected = value ? items.find((it) => it.id === value) : undefined;

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setSearch(""); }} modal>
      <PopoverTrigger asChild>
        <Button id={idPrefix} variant="outline" size="sm" className="h-8 text-xs w-full justify-between font-normal" disabled={disabled} type="button">
          {value ? (
            <span id={`${idPrefix}-selected`} className="truncate">{selected?.name ?? `${value.slice(0, 8)}...`}</span>
          ) : (
            <span id={`${idPrefix}-placeholder`} className="truncate text-muted-foreground">{t("items.selectItem")}</span>
          )}
          <ChevronsUpDown id={`${idPrefix}-icon`} className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent id={`${idPrefix}-popover`} className="w-[440px] max-w-[calc(100vw-2rem)] p-0" align="start">
        <Command id={`${idPrefix}-command`} shouldFilter={false}>
          <CommandInput id={`${idPrefix}-search`} placeholder={t("items.searchByNameOrIdPlaceholder")} value={search} onValueChange={setSearch} />
          <CommandList id={`${idPrefix}-listbox`}>
            <CommandEmpty id={`${idPrefix}-empty-state`}>No item found.</CommandEmpty>
            <CommandGroup id={`${idPrefix}-group`}>
              {options.map((it) => (
                <CommandItem
                  id={`${idPrefix}-option-${it.id}`}
                  key={it.id}
                  value={it.id}
                  onSelect={() => {
                    onSelect(it.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check id={`${idPrefix}-option-check-${it.id}`} className={`mr-2 h-4 w-4 shrink-0 ${value === it.id ? "opacity-100" : "opacity-0"}`} />
                  <span id={`${idPrefix}-option-name-${it.id}`} className="flex-1 truncate">{it.name}</span>
                  {it.item_code && <span id={`${idPrefix}-option-code-${it.id}`} className="text-xs text-muted-foreground font-mono ml-1">({it.item_code})</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
