"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, X } from "lucide-react";
import { listItemDefinitions, getItemDefinition } from "@/lib/inventory-api";
import type { ItemDefinition } from "@/types/inventory";
import type { SteamRewardItem } from "@/lib/game-steam-api";
import { useTranslation } from "@/lib/i18n/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function SteamRewardItemsEditor({ gameId, items, onChange, disabled }: {
    gameId: string; items: SteamRewardItem[]; onChange: (items: SteamRewardItem[]) => void; disabled: boolean;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<ItemDefinition[]>([]);
    const [names, setNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const ids = items.map(item => item.item_definition_id).join(",");
    useEffect(() => {
        if (!open || disabled) return;
        let active = true;
        setLoading(true);
        setFailed(false);
        setResults([]);
        const timer = setTimeout(() => {
            listItemDefinitions({ gameId }, { name: search.trim() || undefined, limit: 20 })
                .then(page => { if (active) setResults(page.items ?? []); })
                .catch(() => { if (active) { setResults([]); setFailed(true); } })
                .finally(() => { if (active) setLoading(false); });
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [gameId, search, open, disabled]);
    useEffect(() => {
        let active = true;
        const selectedIds = ids ? ids.split(",") : [];
        void Promise.all(selectedIds.map(async id => {
            try { const result = await getItemDefinition({ gameId }, id); return [id, `${result.item.name} (${result.item.item_code})`] as const; }
            catch { return [id, id] as const; }
        })).then(entries => { if (active) setNames(Object.fromEntries(entries)); });
        return () => { active = false; };
    }, [gameId, ids]);
    return <div id="game-steam-rewards-editor" className="min-w-0 space-y-2">
        <Label id="game-steam-rewards-label" htmlFor="game-steam-item-select">{t("steam.items")}</Label>
        <Popover open={open && !disabled} onOpenChange={value => { if (!disabled) setOpen(value); }}>
            <PopoverTrigger asChild>
                <Button id="game-steam-item-select" type="button" variant="outline" role="combobox" aria-expanded={open && !disabled} aria-controls="game-steam-item-options" aria-labelledby="game-steam-rewards-label game-steam-item-select-label" className="w-full justify-between" disabled={disabled || items.length >= 50}>
                    <span id="game-steam-item-select-label">{t("steam.addItem")}</span>
                    <ChevronsUpDown id="game-steam-item-select-icon" className="h-4 w-4 shrink-0 opacity-50"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent id="game-steam-item-dropdown" align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command id="game-steam-item-command" shouldFilter={false}>
                    <CommandInput id="game-steam-item-search" value={search} onValueChange={setSearch} placeholder={t("steam.searchItems")}/>
                    <CommandList id="game-steam-item-options" aria-busy={loading}>
                        {loading && <p id="game-steam-items-loading" role="status" className="p-3 text-sm text-muted-foreground">{t("common.loading")}</p>}
                        {failed && <p id="game-steam-items-error" role="alert" className="p-3 text-sm text-destructive">{t("steam.itemsLoadFailed")}</p>}
                        {!loading && !failed && <CommandEmpty id="game-steam-items-empty">{t("steam.noItems")}</CommandEmpty>}
                        {!loading && !failed && <CommandGroup id="game-steam-item-results">
                            {results.filter(item => !items.some(selected => selected.item_definition_id === item.id)).map(item =>
                                <CommandItem id={`game-steam-item-option-${item.id}`} key={item.id} value={item.id} onSelect={() => {
                                    if (disabled || items.length >= 50 || items.some(selected => selected.item_definition_id === item.id)) return;
                                    setNames(current => ({ ...current, [item.id]: `${item.name} (${item.item_code})` }));
                                    onChange([...items, { item_definition_id: item.id, quantity: 1 }]);
                                    setOpen(false);
                                    setSearch("");
                                }}>{item.name} ({item.item_code})</CommandItem>)}
                        </CommandGroup>}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
        <p id="game-steam-rewards-description" className="text-xs text-muted-foreground">{t("steam.itemsDescription")}</p>
        {items.map(item => <div id={`game-steam-reward-${item.item_definition_id}`} key={item.item_definition_id} className="flex items-center gap-2 rounded-md border p-3">
            <Link id={`game-steam-reward-link-${item.item_definition_id}`} href={`/games/${gameId}/items/${item.item_definition_id}`} className="min-w-0 flex-1 truncate text-sm underline">{names[item.item_definition_id] ?? item.item_definition_id}</Link>
            <Label id={`game-steam-quantity-label-${item.item_definition_id}`} htmlFor={`game-steam-quantity-${item.item_definition_id}`} className="sr-only">{t("steam.quantity")}</Label>
            <Input id={`game-steam-quantity-${item.item_definition_id}`} type="number" min={1} max={10000} step={1} value={item.quantity} className="w-28" disabled={disabled} onChange={event => onChange(items.map(value => value.item_definition_id === item.item_definition_id ? { ...value, quantity: Number(event.target.value) } : value))}/>
            <Button id={`game-steam-remove-${item.item_definition_id}`} type="button" variant="ghost" size="icon" disabled={disabled} aria-label={t("steam.removeItem")} onClick={() => onChange(items.filter(value => value.item_definition_id !== item.item_definition_id))}><X id={`game-steam-remove-icon-${item.item_definition_id}`} className="h-4 w-4"/></Button>
        </div>)}
    </div>;
}
