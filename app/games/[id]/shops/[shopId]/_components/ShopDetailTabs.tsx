"use client";
import { CopyButton } from "@/components/CopyButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertCircle, Loader2, PackageSearch, Plus, RefreshCw, ScrollText, ShoppingCart } from "lucide-react";
import { ALL_EVENT_TYPES, EVENT_TYPE_BADGE, EVENT_TYPE_LABELS, toDatetimeLocal } from "./shop-detail-shared";
import { SortableItemRow } from "./SortableItemRow";
import type { ShopDetailViewState } from "./use-shop-detail";
export function ShopDetailTabs(state: ShopDetailViewState) {
    const { shop, params, items, router, searchParams, t, itemsLoading, itemsError, itemFilter, setItemFilter, itemDefs, logsLoaded, logs, logsLoading, logsError, logsTotal, logFilterType, setLogFilterType, logFilterActorType, setLogFilterActorType, logFilterFrom, setLogFilterFrom, logFilterTo, setLogFilterTo, logLimit, setLogLimit, logOffset, setLogOffset, filteredItems, loadLogs, reordering, sensors, handleDragEnd, toggleItemActive, openAdd, openEdit, openDelete } = state;
    return <>
        {/* Tabs: Items / Logs */}
        <Tabs value={searchParams.get("tab") === "logs" ? "logs" : "items"} onValueChange={(v) => {
            router.replace(v === "items" ? window.location.pathname : `${window.location.pathname}?tab=${encodeURIComponent(v)}`, { scroll: false });
            if (v === "logs" && !logsLoaded) {
                loadLogs({ offset: 0 });
            }
        }}>
            <TabsList>
                <TabsTrigger value="items" className="flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    Items
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex items-center gap-1.5">
                    <ScrollText className="h-4 w-4" />
                    Logs
                </TabsTrigger>
            </TabsList>

            {/* ─── Items Tab ─────────────────────────────────────────── */}
            <TabsContent value="items" className="space-y-4 mt-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h2 className="text-xl font-semibold">Items</h2>
                            {!itemsLoading && (<p className="text-sm text-muted-foreground flex items-center gap-2">
                                {shop?.item_limit
                                    ? (() => {
                                        const used = items.length;
                                        const max = shop.item_limit;
                                        const pct = used / max;
                                        return (<>
                                            <span className={pct >= 1 ? "text-destructive font-medium" : ""}>
                                                {used} / {max} items
                                            </span>
                                            <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                                                <span className={`block h-full rounded-full transition-all ${pct >= 1 ? "bg-destructive" : pct >= 0.8 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                                            </span>
                                        </>);
                                    })()
                                    : <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>}
                            </p>)}
                            {itemsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mt-0.5" />}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={itemFilter} onValueChange={(v: "all" | "active" | "disabled") => setItemFilter(v)}>
                            <SelectTrigger className="w-[140px] h-8 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Show All</SelectItem>
                                <SelectItem value="active">Active Only</SelectItem>
                                <SelectItem value="disabled">Disabled Only</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={openAdd} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Item
                        </Button>
                    </div>
                </div>

                {itemsError ? (<Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{itemsError}</AlertDescription>
                </Alert>) : itemsLoading ? (<Card>
                    <CardContent className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading items…
                    </CardContent>
                </Card>) : filteredItems.length === 0 ? (<Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <PackageSearch className="h-10 w-10 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">
                                {items.length === 0 ? "No items in this shop" : `No ${itemFilter} items`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {items.length === 0
                                    ? "Add items to start selling to players."
                                    : "Try changing the filter above."}
                            </p>
                        </div>
                        {items.length === 0 && (<Button onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Item
                        </Button>)}
                    </CardContent>
                </Card>) : (<Card className={reordering ? "opacity-60 pointer-events-none" : ""}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead className="w-10 text-center">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Item Definition</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead>Limit</TableHead>
                                    <TableHead>Restock</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <SortableContext items={filteredItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                <TableBody>
                                    {filteredItems.map((item, idx) => (<SortableItemRow key={item.id} item={item} index={idx} gameId={params.id} itemDefs={itemDefs} onEdit={openEdit} onDelete={openDelete} onToggle={toggleItemActive} />))}
                                </TableBody>
                            </SortableContext>
                        </Table>
                    </DndContext>
                </Card>)}
            </TabsContent>

            {/* ─── Logs Tab ──────────────────────────────────────────── */}
            <TabsContent value="logs" className="space-y-4 mt-4">
                {/* Filter bar */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-wrap gap-3 items-end">
                            {/* Event type */}
                            <div className="space-y-1 min-w-[180px]">
                                <p className="text-xs text-muted-foreground font-medium">Event Type</p>
                                <Select value={logFilterType || "__all__"} onValueChange={(v) => setLogFilterType(v === "__all__" ? "" : v)}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">All types</SelectItem>
                                        {ALL_EVENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Actor type */}
                            <div className="space-y-1 min-w-[130px]">
                                <p className="text-xs text-muted-foreground font-medium">Actor</p>
                                <Select value={logFilterActorType || "__all__"} onValueChange={(v) => setLogFilterActorType(v === "__all__" ? "" : v)}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="All actors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">All actors</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="player">Player</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* From */}
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">From</p>
                                <Input type="datetime-local" className="h-8 text-sm w-44" value={logFilterFrom} onChange={(e) => setLogFilterFrom(e.target.value)} />
                            </div>

                            {/* To */}
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium">To</p>
                                <Input type="datetime-local" className="h-8 text-sm w-44" value={logFilterTo} onChange={(e) => setLogFilterTo(e.target.value)} />
                            </div>

                            {/* Limit */}
                            <div className="space-y-1 min-w-[90px]">
                                <p className="text-xs text-muted-foreground font-medium">Limit</p>
                                <Select value={String(logLimit)} onValueChange={(v) => setLogLimit(Number(v))}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="200">200</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 items-end pb-0.5">
                                <Button size="sm" className="h-8" onClick={() => {
                                    setLogOffset(0);
                                    loadLogs({ offset: 0 });
                                }} disabled={logsLoading}>
                                    {logsLoading
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                        : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                                    Apply
                                </Button>
                                <Button size="sm" variant="outline" className="h-8" disabled={logsLoading} onClick={() => {
                                    const todayFrom = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return toDatetimeLocal(d); })();
                                    const tomorrowTo = (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return toDatetimeLocal(d); })();
                                    setLogFilterType("");
                                    setLogFilterActorType("");
                                    setLogFilterFrom(todayFrom);
                                    setLogFilterTo(tomorrowTo);
                                    setLogLimit(50);
                                    setLogOffset(0);
                                    loadLogs({ type: "", actor_type: "", from: todayFrom, to: tomorrowTo, limit: 50, offset: 0 });
                                }}>
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logs table */}
                {logsError ? (<Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{logsError}</AlertDescription>
                </Alert>) : logsLoading ? (<Card>
                    <CardContent className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading logs…
                    </CardContent>
                </Card>) : !logsLoaded ? (<Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
                        <ScrollText className="h-8 w-8" />
                        <p className="text-sm">Apply filters to load logs.</p>
                    </CardContent>
                </Card>) : logs.length === 0 ? (<Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
                        <ScrollText className="h-8 w-8" />
                        <p className="text-sm">No log entries found.</p>
                    </CardContent>
                </Card>) : (<Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="whitespace-nowrap">Time</TableHead>
                                <TableHead>Event</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead>Actor ID</TableHead>
                                <TableHead>Endpoint</TableHead>
                                <TableHead>Metadata</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (<TableRow key={log.id}>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                    {new Date(log.created_at).toLocaleString(undefined, {
                                        year: "numeric", month: "short", day: "numeric",
                                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                                    })}
                                </TableCell>
                                <TableCell>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_TYPE_BADGE[log.activity_type] ?? "bg-muted text-muted-foreground"}`}>
                                        {EVENT_TYPE_LABELS[log.activity_type] ?? log.activity_type}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${log.actor_type === "admin"
                                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                                        : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"}`}>
                                        {log.actor_type}
                                    </span>
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                    <span title={log.actor_id}>{log.actor_id.slice(0, 8)}…</span>
                                    <CopyButton text={log.actor_id} className="ml-1" />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                                    {log.endpoint ? (<code className="font-mono text-[10px] leading-snug break-all">{log.endpoint}</code>) : (<span className="italic">—</span>)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-xs">
                                    {log.metadata && Object.keys(log.metadata).length > 0 ? (<pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-snug">
                                        {JSON.stringify(log.metadata, null, 2)}
                                    </pre>) : (<span className="italic">—</span>)}
                                </TableCell>
                            </TableRow>))}
                        </TableBody>
                    </Table>
                    {/* Pagination */}
                    {(logsTotal > logLimit || logOffset > 0) && (<div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                        <span>
                            {logOffset + 1}–{Math.min(logOffset + logs.length, logsTotal)} of {logsTotal}
                        </span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7" disabled={logOffset === 0 || logsLoading} onClick={() => {
                                const next = Math.max(0, logOffset - logLimit);
                                setLogOffset(next);
                                loadLogs({ offset: next });
                            }}>
                                Previous
                            </Button>
                            <Button size="sm" variant="outline" className="h-7" disabled={logOffset + logLimit >= logsTotal || logsLoading} onClick={() => {
                                const next = logOffset + logLimit;
                                setLogOffset(next);
                                loadLogs({ offset: next });
                            }}>
                                Next
                            </Button>
                        </div>
                    </div>)}
                </Card>)}
            </TabsContent>
        </Tabs>

        {/* ── Add Item Dialog ───────────────────────────────────────── */}


    </>;
}
