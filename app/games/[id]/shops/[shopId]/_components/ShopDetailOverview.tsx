"use client";
import { CopyButton } from "@/components/CopyButton";
import { GameNavButtons } from "@/components/GameNavButtons";
import { SGemIcon } from "@/components/SGemIcon";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ITEMS_TABS } from "@/lib/items-tabs";
import { type ShopCollectDestination } from "@/lib/shop-admin-api";
import { SGEM_CURRENCY_LABEL, SGEM_CURRENCY_VALUE, isSGemCurrency, matchesSGemSearch, toCurrencyPickerValue, toShopCurrencyPayload } from "@/lib/shop-currency";
import { ArrowLeft, Calendar, Check, ChevronsUpDown, Clock, Coins, ExternalLink, Loader2, Pencil, Save, X } from "lucide-react";
import Link from "next/link";
import { ShopSaiPlayField } from "../../_components/ShopSaiPlayField";
import { SHOP_TYPE_BADGE, dateStatusColor, formatDate, formatDateInput, toDatetimeLocal } from "./shop-detail-shared";
import { ShopTextEditor } from "./ShopTextEditor";
import type { ShopDetailViewState } from "./use-shop-detail";
export function ShopDetailOverview(state: ShopDetailViewState) {
    const { shop, setShop, params, items, setPendingToggle, gameName, t, itemDefs, itemDefsLoading, editingField, setEditingField, tmpVal, setTmpVal, tmpShopType, setTmpShopType, saving, currencyCbOpen, setCurrencyCbOpen, currencyCbSearch, setCurrencyCbSearch, currencyCbShowAll, setCurrencyCbShowAll, currencyItem, startEdit, saveField } = state;
    return <>


        {/* Breadcrumb */}
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/games">Games</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href={`/games/${params.id}`}>{gameName ?? params.id}</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href={`/games/${params.id}/shops`}>Shops</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink>{shop.name}</BreadcrumbLink>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>

        {/* Back + Shop info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/games/${params.id}/shops`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{shop.name}</h1>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHOP_TYPE_BADGE[shop.shop_type] ?? ""}`}>
                        {shop.shop_type}
                    </span>
                    <div className="flex items-center gap-2">
                        <Switch checked={shop.is_active} onCheckedChange={(checked) => setPendingToggle(checked)} title={shop.is_active ? "Deactivate shop" : "Activate shop"} />
                        <span className="text-sm text-muted-foreground">{shop.is_active ? "Active" : "Inactive"}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0 items-center flex-wrap">
                <GameNavButtons gameId={params.id} active="items" />
            </div>
        </div>
        <div id="shop-item-catalogue-tabs-container" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">


            <Tabs value="shops">
                <TabsList id="shop-item-catalogue-tab-list" className="w-auto inline-flex">
                    {ITEMS_TABS.map(({ key, icon: Icon, labelKey }) => (
                        <TabsTrigger id={`shop-item-catalogue-tab-${key}`} key={key} value={key} asChild>
                            <Link href={`/games/${params.id}/items?tab=${key}`}>
                                <Icon id={`shop-item-catalogue-tab-icon-${key}`} className="mr-1.5 h-3.5 w-3.5" />
                                {t(labelKey)}
                            </Link>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
        <Card className="group/card">
            <CardContent className="pt-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">

                    {/* LEFT column */}
                    <div id="shop-text-column" className="min-w-0 space-y-4 text-sm">
 <ShopTextEditor key={shop.id} shop={shop} onSaved={setShop} />
</div>

                    {/* RIGHT column */}
                    <div id="shop-settings-column" className="min-w-0 space-y-1 text-sm">
{/* Shop Code Name */}
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">Code Name</span>
                            {editingField === "shop_key" ? (<div className="flex items-center gap-1 flex-1">
                                <Input className="h-7 text-sm font-mono w-52" value={tmpVal} onChange={(e) => setTmpVal(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} disabled={saving} autoFocus />
                                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ shop_key: tmpVal.trim() })}>
                                    <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>) : (<div className="group/key flex items-center gap-1 flex-1">
                                <span className="font-mono text-foreground/80">{shop.shop_key}</span>
                                <CopyButton id="shop-detail-code-name-copy" iconId="shop-detail-code-name-copy-icon" text={shop.shop_key} className="h-7 w-7 shrink-0 justify-center" />
                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("shop_key", shop.shop_key)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </div>)}
                        </div>

                        {/* Shop Type */}
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">Type</span>
                            {editingField === "shop_type" ? (<div className="flex items-center gap-1 flex-1">
                                <Select value={tmpShopType} onValueChange={setTmpShopType} disabled={saving}>
                                    <SelectTrigger className="h-7 text-xs w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(["permanent", "event"] as const).map((t) => (<SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ shop_type: tmpShopType })}>
                                    <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHOP_TYPE_BADGE[shop.shop_type] ?? ""}`}>
                                    {shop.shop_type}
                                </span>
                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("shop_type", shop.shop_type)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </div>)}
                        </div>

                        {/* Currency */}
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none flex items-center gap-1">
                                <Coins className="h-3 w-3" /> Currency
                            </span>
                            {editingField === "currency" ? (<div className="space-y-1.5 flex-1">
                                <Popover open={currencyCbOpen} onOpenChange={setCurrencyCbOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={currencyCbOpen} className="w-full justify-between font-normal h-8 text-sm" disabled={itemDefsLoading}>
                                            {itemDefsLoading ? (<span className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                                            </span>) : isSGemCurrency(tmpVal) ? (<span id="shop-currency-sgem-selected" className="flex items-center gap-2">
                                                <SGemIcon id="shop-currency-sgem-selected-icon" className="h-4 w-4" /> {SGEM_CURRENCY_LABEL}
                                            </span>) : tmpVal ? (<span className="flex items-center gap-2">
                                                <span>{itemDefs.find((d) => d.id === tmpVal)?.name ?? <span className="font-mono text-xs">{tmpVal.slice(0, 8)}…</span>}</span>
                                                {itemDefs.find((d) => d.id === tmpVal) && (<span className="text-xs text-muted-foreground font-mono">
                                                    {itemDefs.find((d) => d.id === tmpVal)!.item_code}
                                                </span>)}
                                            </span>) : (<span className="text-muted-foreground">Select currency item…</span>)}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
                                        <Command shouldFilter={false}>
                                            <CommandInput placeholder="Search by name or code…" value={currencyCbSearch} onValueChange={setCurrencyCbSearch} />
                                            <CommandList>
                                                <CommandEmpty>No item found.</CommandEmpty>
                                                <CommandGroup>
                                                    {matchesSGemSearch(currencyCbSearch) && (<CommandItem id="shop-currency-option-sgem" value={SGEM_CURRENCY_VALUE} onSelect={() => {
                                                        setTmpVal(SGEM_CURRENCY_VALUE);
                                                        setCurrencyCbOpen(false);
                                                        setCurrencyCbSearch("");
                                                    }}>
                                                        <Check className={`mr-2 h-4 w-4 shrink-0 ${isSGemCurrency(tmpVal) ? "opacity-100" : "opacity-0"}`} />
                                                        <SGemIcon id="shop-currency-option-sgem-icon" className="h-4 w-4 mr-2" />
                                                        <span className="flex-1">{SGEM_CURRENCY_LABEL}</span>
                                                    </CommandItem>)}
                                                    {itemDefs
                                                        .filter((d) => (currencyCbShowAll || d.category === "currency") &&
                                                            (d.name.toLowerCase().includes(currencyCbSearch.toLowerCase()) ||
                                                                d.item_code.toLowerCase().includes(currencyCbSearch.toLowerCase())))
                                                        .slice(0, 30)
                                                        .map((d) => (<CommandItem key={d.id} value={d.id} onSelect={() => {
                                                            setTmpVal(d.id);
                                                            setCurrencyCbOpen(false);
                                                            setCurrencyCbSearch("");
                                                        }}>
                                                            <Check className={`mr-2 h-4 w-4 shrink-0 ${tmpVal === d.id ? "opacity-100" : "opacity-0"}`} />
                                                            <span className="flex-1">{d.name}</span>
                                                            <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>
                                                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{d.category}</span>
                                                        </CommandItem>))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="cb_show_all" checked={currencyCbShowAll} onCheckedChange={(v) => setCurrencyCbShowAll(!!v)} />
                                    <label htmlFor="cb_show_all" className="text-xs text-muted-foreground cursor-pointer select-none">
                                        Show all item types
                                    </label>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={() => saveField(toShopCurrencyPayload(tmpVal))}>
                                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                                {shop.currency_type === "sgem" ? (<span id="shop-currency-sgem" className="flex items-center gap-1.5 text-foreground font-semibold">
                                    <SGemIcon id="shop-currency-sgem-icon" className="h-4 w-4" /> {SGEM_CURRENCY_LABEL}
                                </span>) : shop.currency_item_def_id ? (<span className="flex items-center gap-1.5">
                                    {currencyItem ? (<Link href={`/games/${params.id}/items/${shop.currency_item_def_id}`} className="flex items-center gap-1.5 hover:underline text-foreground font-semibold" title="View item definition">
                                        <span>{currencyItem.name}</span>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </Link>) : (<Link href={`/games/${params.id}/items/${shop.currency_item_def_id}`} className="flex items-center gap-1 hover:underline text-foreground/80" title="View item definition">
                                        <span className="text-xs font-mono">{shop.currency_item_def_id.slice(0, 8)}…</span>
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>)}
                                </span>) : (<span className="italic text-muted-foreground/50">—</span>)}
                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("currency", toCurrencyPickerValue(shop))}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </div>)}
                        </div>

                        {/* Starts / Ends At — event only */}
                        {(editingField === "shop_type" ? tmpShopType : shop.shop_type) === "event" && (<>
                            {/* Starts At */}
                            <div className="flex items-baseline gap-3 min-h-[32px]">
                                <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Starts At
                                </span>
                                {editingField === "starts_at" ? (<div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-1">
                                        <Input type="datetime-local" className="h-7 text-xs w-48" value={tmpVal} onChange={(e) => setTmpVal(e.target.value)} disabled={saving} autoFocus />
                                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ starts_at: tmpVal ? new Date(tmpVal).toISOString() : null })}>
                                            <Save className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setTmpVal(toDatetimeLocal(new Date()))}>Now</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>Today 00:00</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>Tomorrow</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>Next month</Button>
                                    </div>
                                </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                                    <span className={`font-semibold ${dateStatusColor(shop.starts_at, "start")}`}>
                                        {formatDate(shop.starts_at)}
                                        {shop.starts_at && new Date(shop.starts_at).getTime() > Date.now() && (<span className="ml-1.5 text-xs font-normal opacity-80">not started</span>)}
                                    </span>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("starts_at", formatDateInput(shop.starts_at))}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </div>)}
                            </div>

                            {/* Ends At */}
                            <div className="flex items-baseline gap-3 min-h-[32px]">
                                <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Ends At
                                </span>
                                {editingField === "ends_at" ? (<div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-1">
                                        <Input type="datetime-local" className="h-7 text-xs w-48" value={tmpVal} onChange={(e) => setTmpVal(e.target.value)} disabled={saving} autoFocus />
                                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ ends_at: tmpVal ? new Date(tmpVal).toISOString() : null })}>
                                            <Save className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>+1 week</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 14); d.setHours(23, 59, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>+2 weeks</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setHours(23, 59, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>+1 month</Button>
                                        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 2, 0); d.setHours(23, 59, 0, 0); setTmpVal(toDatetimeLocal(d)); }}>End of next month</Button>
                                    </div>
                                </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                                    <span className={`font-semibold ${dateStatusColor(shop.ends_at, "end")}`}>
                                        {formatDate(shop.ends_at)}
                                        {shop.ends_at && (() => {
                                            const diff = new Date(shop.ends_at).getTime() - Date.now();
                                            if (diff < 0)
                                                return <span className="ml-1.5 text-xs font-normal opacity-80">expired</span>;
                                            if (diff < 24 * 60 * 60 * 1000)
                                                return <span className="ml-1.5 text-xs font-normal opacity-80">ending soon</span>;
                                            return null;
                                        })()}
                                    </span>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("ends_at", formatDateInput(shop.ends_at))}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </div>)}
                            </div>
                        </>)}



                        <ShopSaiPlayField gameId={params.id} shopId={shop.id} checked={shop.show_in_sai_play ?? false} disabled={saving} onCheckedChange={(checked) => saveField({ show_in_sai_play: checked })} labels={{ title: t('shop.showInSaiPlay'), hint: t('shop.showInSaiPlayHint'), on: t('shop.showInSaiPlayOn'), off: t('shop.showInSaiPlayOff'), open: t('shop.openInSaiPlay') }} />




                        {/* IDs */}
                        <div id="shop-detail-ids-separator" role="separator" className="!my-3 border-t border-border/60" />
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none">Game ID</span>
                            <span className="flex items-center gap-1.5 text-xs font-mono text-foreground/70">
                                {shop.game_id}
                                <CopyButton text={shop.game_id} />
                            </span>
                        </div>
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none">Shop ID</span>
                            <span className="flex items-center gap-1.5 text-xs font-mono text-foreground/70">
                                {shop.id}
                                <CopyButton text={shop.id} />
                            </span>
                        </div>

                        {/* Created At / Updated At */}
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Created
                            </span>
                            <span className="text-foreground/80">{formatDate(shop.created_at)}</span>
                        </div>
                        <div className="flex items-baseline gap-3 min-h-[32px]">
                            <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Updated
                            </span>
                            <span className="text-foreground/80">{formatDate(shop.updated_at)}</span>
                        </div>





                        <div id="shop-detail-delivery-separator" role="separator" className="!my-3 border-t border-border/60" />
                        <div id="shop-detail-item-delivery" className="space-y-2 pt-2">
                            <div id="shop-detail-delivery-destination" className="flex items-baseline gap-3 min-h-[32px]">
                                <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">{t('shop.collectDestination')}</span>
                                {editingField === "collect_destination" ? (<div className="flex items-center gap-1 flex-1">
                                    <Select value={tmpVal} onValueChange={setTmpVal} disabled={saving}>
                                        <SelectTrigger id="shop-detail-collect-destination" className="h-7 text-xs w-52"><SelectValue /></SelectTrigger>
                                        <SelectContent id="shop-detail-collect-destination-options">
                                            <SelectItem id="shop-detail-collect-destination-mailbox" value="mailbox">{t('shop.collectDestinationMailbox')}</SelectItem>
                                            <SelectItem id="shop-detail-collect-destination-inventory" value="inventory">{t('shop.collectDestinationInventory')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button id="shop-detail-save-collect-destination" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ collect_destination: tmpVal as ShopCollectDestination })}><Save className="h-3.5 w-3.5" /></Button>
                                    <Button id="shop-detail-cancel-collect-destination" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}><X className="h-3.5 w-3.5" /></Button>
                                </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                                    <span>{shop.collect_destination === "inventory" ? t('shop.collectDestinationInventory') : t('shop.collectDestinationMailbox')}</span>
                                    <Button id="shop-detail-edit-collect-destination" size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("collect_destination", shop.collect_destination ?? "mailbox")}><Pencil className="h-3.5 w-3.5" /></Button>
                                </div>)}
                            </div>

                            {shop.collect_destination !== "inventory" && (<>
                                <div id="shop-detail-mailbox-title" className="flex items-baseline gap-3 min-h-[32px]">
                                    <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">{t('shop.mailboxTitle')}</span>
                                    {editingField === "mailbox_title" ? (<div className="flex items-center gap-1 flex-1">
                                        <Input id="shop-detail-mailbox-title-input" className="h-7 text-sm" value={tmpVal} onChange={(event) => setTmpVal(event.target.value)} disabled={saving} autoFocus />
                                        <Button id="shop-detail-save-mailbox-title" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ mailbox_title: tmpVal })}><Save className="h-3.5 w-3.5" /></Button>
                                        <Button id="shop-detail-cancel-mailbox-title" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}><X className="h-3.5 w-3.5" /></Button>
                                    </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                                        <span>{shop.mailbox_title || t('shop.mailboxTitleDefault')}</span>
                                        <Button id="shop-detail-edit-mailbox-title" size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("mailbox_title", shop.mailbox_title ?? "")}><Pencil className="h-3.5 w-3.5" /></Button>
                                    </div>)}
                                </div>

                                <div id="shop-detail-mailbox-body" className="flex items-start gap-3 min-h-[32px]">
                                    <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">{t('shop.mailboxBody')}</span>
                                    {editingField === "mailbox_body" ? (<div className="space-y-1 flex-1">
                                        <Textarea id="shop-detail-mailbox-body-input" className="min-h-[80px] resize-none text-sm" value={tmpVal} onChange={(event) => setTmpVal(event.target.value)} disabled={saving} autoFocus />
                                        <div className="flex gap-1">
                                            <Button id="shop-detail-save-mailbox-body" size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={() => saveField({ mailbox_body: tmpVal })}><Save className="mr-1 h-3.5 w-3.5" />{t('common.save')}</Button>
                                            <Button id="shop-detail-cancel-mailbox-body" size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}><X className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>) : (<div className="group/meta flex items-start gap-1 flex-1">
                                        <p className="flex-1 whitespace-pre-line text-foreground/80">{shop.mailbox_body || t('shop.mailboxBodyDefault')}</p>
                                        <Button id="shop-detail-edit-mailbox-body" size="icon" variant="ghost" className="h-7 w-7 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("mailbox_body", shop.mailbox_body ?? "")}><Pencil className="h-3.5 w-3.5" /></Button>
                                    </div>)}
                                </div>
                            </>)}
                        </div>
</div>{/* /right column */}

                </div>
            </CardContent>
        </Card>


    </>;
}
