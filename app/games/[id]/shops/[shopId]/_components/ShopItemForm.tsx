"use client";
import { SGemIcon } from "@/components/SGemIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n/use-translation";
import { type PurchaseLimitType, type RestockSchedule } from "@/lib/shop-admin-api";
import { SGEM_CURRENCY_LABEL, SGEM_CURRENCY_VALUE, isSGemCurrency, matchesSGemSearch } from "@/lib/shop-currency";
import type { ItemDefinition } from "@/types/inventory";
import { AlertCircle, Check, ChevronsUpDown, ExternalLink, Loader2, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ItemFormState, dateStatusColor, toDatetimeLocal } from "./shop-detail-shared";
import { ShopItemTranslationsEditor } from "./ShopItemTranslationsEditor";
interface ItemFormProps {
    form: ItemFormState;
    setField: <K extends keyof ItemFormState>(k: K, v: ItemFormState[K]) => void;
    itemDefs: ItemDefinition[];
    itemDefsLoading: boolean;
    error: string | null;
    disableItemDef?: boolean;
    gameId?: string;
    editItemId?: string;
}
export function ItemForm({ form, setField, itemDefs, itemDefsLoading, error, disableItemDef, gameId, editItemId, }: ItemFormProps) {
    const { t } = useTranslation();
    const showLimits = form.purchase_limit_type !== "unlimited";
    // Item def combobox
    const [itemDefOpen, setItemDefOpen] = useState(false);
    const [itemDefSearch, setItemDefSearch] = useState("");
    const selectedItemDef = itemDefs.find((d) => d.id === form.item_def_id);
    const filteredItemDefs = itemDefs.filter((d) => d.name.toLowerCase().includes(itemDefSearch.toLowerCase()) ||
        d.item_code.toLowerCase().includes(itemDefSearch.toLowerCase()));
    // Display name auto-sync
    const [syncName, setSyncName] = useState(true);
    // Currency combobox local state
    const [currOpen, setCurrOpen] = useState(false);
    const [currSearch, setCurrSearch] = useState("");
    const [currShowAll, setCurrShowAll] = useState(false);
    const filteredCurrDefs = itemDefs.filter((d) => (currShowAll || d.category === "currency") &&
        (d.name.toLowerCase().includes(currSearch.toLowerCase()) ||
            d.item_code.toLowerCase().includes(currSearch.toLowerCase())));
    const selectedCurrDef = itemDefs.find((d) => d.id === form.currency_item_def_id);
    return (<div className="space-y-4 py-1">
        {/* Item definition */}
        <div className="space-y-1.5">
            {!disableItemDef && <Label>
                Item Definition <span className="text-destructive">*</span>
            </Label>}
            {!disableItemDef ? (<Popover open={itemDefOpen} onOpenChange={setItemDefOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={itemDefOpen} className="w-full justify-between font-normal h-9 text-sm" disabled={itemDefsLoading}>
                        {itemDefsLoading ? (<span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                        </span>) : selectedItemDef ? (<span className="flex items-center gap-2">
                            <span>{selectedItemDef.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{selectedItemDef.item_code}</span>
                        </span>) : form.item_def_id ? (<span className="font-mono text-xs text-muted-foreground">{form.item_def_id.slice(0, 8)}…</span>) : (<span className="text-muted-foreground">Select item definition…</span>)}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
                    <Command shouldFilter={false}>
                        <CommandInput placeholder="Search by name or code…" value={itemDefSearch} onValueChange={setItemDefSearch} />
                        <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                                {filteredItemDefs.slice(0, 30).map((d) => (<CommandItem key={d.id} value={d.id} onSelect={() => {
                                    setField("item_def_id", d.id);
                                    if (syncName)
                                        setField("display_name", d.name);
                                    setItemDefOpen(false);
                                    setItemDefSearch("");
                                }}>
                                    <Check className={`mr-2 h-4 w-4 shrink-0 ${form.item_def_id === d.id ? "opacity-100" : "opacity-0"}`} />
                                    <span className="flex-1">{d.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>
                                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{d.category}</span>
                                </CommandItem>))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>) : (<div id="shop-item-definition-summary" className="flex items-baseline gap-2 text-sm">
                <span id="shop-item-definition-label" className="shrink-0 font-medium">Item Definition:</span>
                {gameId && editItemId ? (
                    <Link id="shop-item-definition-link" href={`/games/${gameId}/items/${editItemId}`} className="inline-flex max-w-full items-center gap-2 text-primary hover:underline">
                        <span id="shop-item-definition-name" className="break-all">{selectedItemDef?.name ?? form.item_def_id}</span>
                        <ExternalLink id="shop-item-definition-link-icon" className="h-4 w-4 shrink-0" />
                    </Link>
                ) : (
                    <span id="shop-item-definition-text" className="break-all">{selectedItemDef?.name ?? form.item_def_id}</span>
                )}
            </div>)}
        </div>

        <ShopItemTranslationsEditor translations={form.translations} english={{ display_name: form.display_name, description: form.description }} onChange={(translations) => setField("translations", translations)}>
        {(languagePicker) => <>
        {/* Display name */}
        <div className="space-y-1.5">
            <Label>
                {t("shopItemTranslations.displayName")} (English) <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
                <Input id="shop-item-english-display-name" className="min-w-0 flex-1" placeholder="e.g. Magic Sword" value={form.display_name} onChange={(e) => {
                    setField("display_name", e.target.value);
                    setSyncName(false);
                }} />
                {!disableItemDef && (<Button type="button" variant={syncName ? "default" : "outline"} size="icon" className="shrink-0" title={syncName ? "Auto-sync with item definition (click to disable)" : "Auto-sync disabled (click to enable)"} onClick={() => {
                    const next = !syncName;
                    setSyncName(next);
                    if (next && selectedItemDef)
                        setField("display_name", selectedItemDef.name);
                }}>
                    <Wand2 className="h-4 w-4" />
                </Button>)}
                {languagePicker}
            </div>
            {!disableItemDef && (<p className="text-xs text-muted-foreground">
                {syncName ? "Auto-syncing with item definition name." : "Manual mode — not syncing with item definition."}
            </p>)}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
            <div id="shop-item-english-description-header" className="flex items-center justify-between gap-2">
                <Label id="shop-item-english-description-label">{t("shopItemTranslations.description")} (English)</Label>
                <span id="shop-item-english-description-count" className={`shrink-0 text-xs ${form.description.length >= 700 ? 'text-destructive font-medium' : form.description.length >= 600 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {form.description.length}/700
                </span>
            </div>
            <Textarea placeholder="Optional description…" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={7} maxLength={700} />
            <p id="shop-item-form-english-help" className="text-xs leading-snug text-muted-foreground">{t("shopItemTranslations.englishHelp")}</p>
        </div>

        </>}
        </ShopItemTranslationsEditor>
        {/* Price + Currency */}
        <div className="flex gap-3">
            <div className="space-y-1.5 w-2/5">
                <Label>
                    Price <span className="text-destructive">*</span>
                </Label>
                <Input type="number" min={1} placeholder="e.g. 200" value={form.price} onChange={(e) => setField("price", e.target.value)} />
            </div>
            <div className="space-y-1.5 w-3/5">
                <Label>Currency <span className="text-xs text-muted-foreground">(overrides shop)</span></Label>
                <div className="flex items-center gap-2">
                    <Popover open={currOpen} onOpenChange={setCurrOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={currOpen} className="flex-1 justify-between font-normal h-9 text-sm">
                                {isSGemCurrency(form.currency_item_def_id) ? (<span id="shop-item-form-currency-sgem-selected" className="flex items-center gap-2"><SGemIcon id="shop-item-form-currency-sgem-selected-icon" className="h-4 w-4" /> {SGEM_CURRENCY_LABEL}</span>) : selectedCurrDef ? (<span>{selectedCurrDef.name}</span>) : form.currency_item_def_id ? (<span className="font-mono text-xs text-muted-foreground">{form.currency_item_def_id.slice(0, 8)}…</span>) : (<span className="text-muted-foreground">None (use shop default)</span>)}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
                            <Command shouldFilter={false}>
                                <CommandInput placeholder="Search by name or code…" value={currSearch} onValueChange={setCurrSearch} />
                                <CommandList>
                                    <CommandEmpty>No item found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem value="__none__" onSelect={() => { setField("currency_item_def_id", ""); setCurrOpen(false); setCurrSearch(""); }}>
                                            <Check className={`mr-2 h-4 w-4 shrink-0 ${!form.currency_item_def_id ? "opacity-100" : "opacity-0"}`} />
                                            <span className="text-muted-foreground italic">None</span>
                                        </CommandItem>
                                        {matchesSGemSearch(currSearch) && (<CommandItem id="shop-item-form-currency-option-sgem" value={SGEM_CURRENCY_VALUE} onSelect={() => { setField("currency_item_def_id", SGEM_CURRENCY_VALUE); setCurrOpen(false); setCurrSearch(""); }}>
                                            <Check className={`mr-2 h-4 w-4 shrink-0 ${isSGemCurrency(form.currency_item_def_id) ? "opacity-100" : "opacity-0"}`} />
                                            <SGemIcon id="shop-item-form-currency-option-sgem-icon" className="h-4 w-4 mr-2" />
                                            <span className="flex-1">{SGEM_CURRENCY_LABEL}</span>
                                        </CommandItem>)}
                                        {filteredCurrDefs.slice(0, 30).map((d) => (<CommandItem key={d.id} value={d.id} onSelect={() => { setField("currency_item_def_id", d.id); setCurrOpen(false); setCurrSearch(""); }}>
                                            <Check className={`mr-2 h-4 w-4 shrink-0 ${form.currency_item_def_id === d.id ? "opacity-100" : "opacity-0"}`} />
                                            <span className="flex-1">{d.name}</span>
                                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{d.category}</span>
                                        </CommandItem>))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            <div className="flex items-center gap-2 px-3 py-2 border-t">
                                <Checkbox id="curr_show_all" checked={currShowAll} onCheckedChange={(v) => setCurrShowAll(!!v)} />
                                <label htmlFor="curr_show_all" className="text-xs text-muted-foreground cursor-pointer select-none">Show all item types</label>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {form.currency_item_def_id && (<Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" title="Clear override" onClick={() => setField("currency_item_def_id", "")}>
                        <X className="h-4 w-4" />
                    </Button>)}
                </div>
            </div>
        </div>

        {/* Purchase limit */}
        <div className={showLimits ? "grid grid-cols-2 gap-3" : ""}>
            <div className="space-y-1.5">
                <Label>Purchase Limit Type</Label>
                <Select value={form.purchase_limit_type} onValueChange={(v) => setField("purchase_limit_type", v as PurchaseLimitType)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="player">Per Player</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {showLimits && (<div className="space-y-1.5">
                <Label>Max Purchases</Label>
                <Input type="number" min={0} value={form.purchase_limit} onChange={(e) => setField("purchase_limit", e.target.value)} />
            </div>)}
        </div>

        {/* Stock + Restock Schedule */}
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
                <Label>
                    Stock{" "}
                    <span className="text-xs text-muted-foreground">(0 = unlimited)</span>
                </Label>
                <Input type="number" min={0} value={form.stock} onChange={(e) => setField("stock", e.target.value)} />
            </div>
            <div className="space-y-1.5">
                <Label>Restock Schedule</Label>
                <Select value={form.restock_schedule} onValueChange={(v) => setField("restock_schedule", v as RestockSchedule)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Never</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Available from/until */}
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
                <Label className={form.available_from ? dateStatusColor(new Date(form.available_from).toISOString(), "start") : ""}>
                    Available From
                    {form.available_from && new Date(form.available_from).getTime() > Date.now() && (<span className="ml-1 text-xs font-normal opacity-80">· not started</span>)}
                </Label>
                <Input type="datetime-local" value={form.available_from} onChange={(e) => setField("available_from", e.target.value)} className={form.available_from ? `border-current/20 ${dateStatusColor(new Date(form.available_from).toISOString(), "start")}` : ""} />
                <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setField("available_from", toDatetimeLocal(new Date()))}>Now</Button>
                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setField("available_from", toDatetimeLocal(d)); }}>Today</Button>
                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); setField("available_from", toDatetimeLocal(d)); }}>Tomorrow</Button>
                    {form.available_from && (<Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => setField("available_from", "")}>Clear</Button>)}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label className={form.available_until ? dateStatusColor(new Date(form.available_until).toISOString(), "end") : ""}>
                    Available Until
                    {form.available_until && (() => {
                        const diff = new Date(form.available_until).getTime() - Date.now();
                        if (diff < 0)
                            return <span className="ml-1 text-xs font-normal opacity-80">· expired</span>;
                        if (diff < 24 * 60 * 60 * 1000)
                            return <span className="ml-1 text-xs font-normal opacity-80">· ending soon</span>;
                        return null;
                    })()}
                </Label>
                <Input type="datetime-local" value={form.available_until} onChange={(e) => setField("available_until", e.target.value)} className={form.available_until ? `border-current/20 ${dateStatusColor(new Date(form.available_until).toISOString(), "end")}` : ""} />
                <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); setField("available_until", toDatetimeLocal(d)); }}>+1w</Button>
                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 14); d.setHours(23, 59, 0, 0); setField("available_until", toDatetimeLocal(d)); }}>+2w</Button>
                    <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setHours(23, 59, 0, 0); setField("available_until", toDatetimeLocal(d)); }}>+1m</Button>
                    {form.available_until && (<Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => setField("available_until", "")}>Clear</Button>)}
                </div>
            </div>
        </div>

        {/* Active */}
        <div className="flex items-center gap-3">
            <Switch id="item_active" checked={form.is_active} onCheckedChange={(v) => setField("is_active", v)} />
            <Label htmlFor="item_active" className="cursor-pointer">
                Active immediately
            </Label>
        </div>

        {error && (<Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
        </Alert>)}
    </div>);
}
