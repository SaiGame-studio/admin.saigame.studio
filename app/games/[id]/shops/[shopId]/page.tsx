"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList, } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { ArrowLeft, Plus, Pencil, Trash2, AlertCircle, Calendar, Loader2, PackageSearch, Coins, ShoppingCart, RotateCcw, Save, X, ChevronsUpDown, Check, ExternalLink, Wand2, GripVertical, ScrollText, RefreshCw, Clock, } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent, } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { getShop, listShopItems, addShopItem, updateShop, updateShopItem, deleteShopItem, listShopEvents, type ShopDefinition, type ShopItem, type ShopEvent, type ShopEventType, type ActorType, type AddShopItemPayload, type UpdateShopItemPayload, type PurchaseLimitType, type RestockSchedule, } from "@/lib/shop-admin-api";
import { listItemDefinitions, getItemDefinition } from "@/lib/inventory-api";
import { getGame } from "@/lib/game-api";
import type { ItemDefinition } from "@/types/inventory";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { GameNavButtons } from "@/components/GameNavButtons";
// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_TYPE_BADGE: Record<string, string> = {
    permanent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    daily: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    weekly: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    seasonal: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    event: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
const PURCHASE_LIMIT_LABELS: Record<PurchaseLimitType, string> = {
    unlimited: "Unlimited",
    player: "Per Player",
    global: "Global",
};
const RESTOCK_LABELS: Record<RestockSchedule, string> = {
    none: "Never",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
};
const EVENT_TYPE_LABELS: Record<string, string> = {
    shop_created: "Shop Created",
    shop_updated: "Shop Updated",
    shop_deleted: "Shop Deleted",
    shop_item_added: "Item Added",
    shop_item_updated: "Item Updated",
    shop_item_deleted: "Item Deleted",
    shop_viewed: "Shop Viewed",
    item_purchased: "Item Purchased",
};
const EVENT_TYPE_BADGE: Record<string, string> = {
    shop_created: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    shop_updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    shop_deleted: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    shop_item_added: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    shop_item_updated: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    shop_item_deleted: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    shop_viewed: "bg-muted text-muted-foreground",
    item_purchased: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};
const ALL_EVENT_TYPES: ShopEventType[] = [
    "shop_created",
    "shop_updated",
    "shop_item_added",
    "shop_item_updated",
    "shop_item_deleted",
    "shop_viewed",
    "item_purchased",
];
function formatDate(iso: string | null | undefined) {
    if (!iso)
        return "—";
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function formatDateInput(iso: string | null | undefined): string {
    if (!iso)
        return "";
    // Convert ISO to datetime-local value (YYYY-MM-DDTHH:mm)
    return new Date(iso).toISOString().slice(0, 16);
}
function dateStatusColor(iso: string | null | undefined, kind: "start" | "end"): string {
    if (!iso)
        return "text-muted-foreground";
    const now = Date.now();
    const t = new Date(iso).getTime();
    if (kind === "start") {
        if (t > now)
            return "text-amber-500";
        return "text-emerald-600";
    }
    const diff = t - now;
    if (diff < 0)
        return "text-destructive";
    if (diff < 24 * 60 * 60 * 1000)
        return "text-amber-500";
    return "text-emerald-600";
}
function toDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// ─── Default Item Form ────────────────────────────────────────────────────────
type ItemFormState = {
    item_def_id: string;
    display_name: string;
    description: string;
    price: string;
    currency_item_def_id: string;
    purchase_limit_type: PurchaseLimitType;
    purchase_limit: string;
    restock_schedule: RestockSchedule;
    stock: string;
    sort_order: string;
    is_active: boolean;
    available_from: string;
    available_until: string;
};
const defaultItemForm: ItemFormState = {
    item_def_id: "",
    display_name: "",
    description: "",
    price: "",
    currency_item_def_id: "",
    purchase_limit_type: "unlimited",
    purchase_limit: "0",
    restock_schedule: "none",
    stock: "0",
    sort_order: "0",
    is_active: true,
    available_from: "",
    available_until: "",
};
// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShopDetailPage() {
    const params = useParams() as {
        id: string;
        shopId: string;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const { locale } = useLanguage();
    const { t } = useTranslation(locale);
    const { toast } = useToast();
    const [shop, setShop] = useState<ShopDefinition | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Shop items (separate endpoint)
    const [items, setItems] = useState<ShopItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [itemsError, setItemsError] = useState<string | null>(null);
    const [itemFilter, setItemFilter] = useState<"all" | "active" | "disabled">("all");
    // Item definitions (for picker)
    const [itemDefs, setItemDefs] = useState<ItemDefinition[]>([]);
    const [itemDefsLoading, setItemDefsLoading] = useState(false);
    const [itemDefsSearch, setItemDefsSearch] = useState("");
    const itemDefsLoaded = useRef(false);
    // Add item dialog
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState<ItemFormState>(defaultItemForm);
    const [addError, setAddError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    // Edit item dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editItem, setEditItem] = useState<ShopItem | null>(null);
    const [editForm, setEditForm] = useState<ItemFormState>(defaultItemForm);
    const [editError, setEditError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    // Delete item dialog
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState<ShopItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    // Toggle active confirm
    const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
    const [toggling, setToggling] = useState(false);
    // Inline field editing
    const [editingField, setEditingField] = useState<string | null>(null);
    const [tmpVal, setTmpVal] = useState("");
    const [tmpShopType, setTmpShopType] = useState<string>("permanent");
    const [saving, setSaving] = useState(false);
    // Currency combobox (meta card)
    const [currencyCbOpen, setCurrencyCbOpen] = useState(false);
    const [currencyCbSearch, setCurrencyCbSearch] = useState("");
    const [currencyCbShowAll, setCurrencyCbShowAll] = useState(false);
    // Resolved currency item definition (for display)
    const [currencyItem, setCurrencyItem] = useState<ItemDefinition | null>(null);
    // Game name for breadcrumb
    const [gameName, setGameName] = useState<string | null>(null);
    // Logs tab
    const [logsTabActive, setLogsTabActive] = useState(false);
    const [logsLoaded, setLogsLoaded] = useState(false);
    const [logs, setLogs] = useState<ShopEvent[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [logsTotal, setLogsTotal] = useState(0);
    const [logFilterType, setLogFilterType] = useState<string>("");
    const [logFilterActorType, setLogFilterActorType] = useState<string>("");
    const [logFilterFrom, setLogFilterFrom] = useState<string>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return toDatetimeLocal(d); });
    const [logFilterTo, setLogFilterTo] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return toDatetimeLocal(d); });
    const [logLimit, setLogLimit] = useState<number>(50);
    const [logOffset, setLogOffset] = useState<number>(0);
    // ── Load data ────────────────────────────────────────────────────────────────
    useEffect(() => {
        loadShop();
        ensureItemDefs();
        // Auto-load logs if navigating directly to ?tab=logs
        if (searchParams.get("tab") === "logs") {
            loadLogs({ offset: 0 });
        }
    }, [params.id, params.shopId]);
    async function loadShop() {
        try {
            setLoading(true);
            const gameData = await getGame(params.id);
            setGameName(gameData.name);
            const data = await getShop(params.id, params.shopId);
            setShop(data);
            if (data.currency_item_def_id) {
                getItemDefinition({ gameId: params.id }, data.currency_item_def_id)
                    .then((res) => setCurrencyItem(res.item))
                    .catch(() => { });
            }
            loadItems();
        }
        catch (err: any) {
            setError(err?.message ?? "Failed to load shop");
        }
        finally {
            setLoading(false);
        }
    }
    async function loadItems() {
        try {
            setItemsLoading(true);
            setItemsError(null);
            const resp = await listShopItems(params.id, params.shopId);
            const sorted = [...(resp.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
            setItems(sorted);
        }
        catch (err: any) {
            setItemsError(err?.message ?? "Failed to load items");
        }
        finally {
            setItemsLoading(false);
        }
    }
    const filteredItems = itemFilter === "all" ? items
        : itemFilter === "active" ? items.filter((i) => i.is_active)
            : items.filter((i) => !i.is_active);
    async function loadLogs(overrides?: {
        type?: string;
        actor_type?: string;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
    }) {
        const type = overrides?.type !== undefined ? overrides.type : logFilterType;
        const actor_type = overrides?.actor_type !== undefined ? overrides.actor_type : logFilterActorType;
        const from = overrides?.from !== undefined ? overrides.from : logFilterFrom;
        const to = overrides?.to !== undefined ? overrides.to : logFilterTo;
        const limit = overrides?.limit !== undefined ? overrides.limit : logLimit;
        const offset = overrides?.offset !== undefined ? overrides.offset : logOffset;
        setLogsLoading(true);
        setLogsError(null);
        try {
            const resp = await listShopEvents(params.id, params.shopId, {
                type: type ? (type as ShopEventType) : undefined,
                actor_type: actor_type ? (actor_type as ActorType) : undefined,
                from: from ? new Date(from).toISOString() : undefined,
                to: to ? new Date(to).toISOString() : undefined,
                limit,
                offset,
            });
            setLogs(resp.logs ?? []);
            setLogsTotal(resp.total ?? 0);
            setLogsLoaded(true);
        }
        catch (err: any) {
            setLogsError(err?.message ?? "Failed to load logs");
        }
        finally {
            setLogsLoading(false);
        }
    }
    const [reordering, setReordering] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1)
            return;
        const reordered = arrayMove(items, oldIndex, newIndex);
        setItems(reordered);
        setReordering(true);
        try {
            await Promise.all(reordered.map((item, idx) => item.sort_order !== idx
                ? updateShopItem(params.id, params.shopId, item.id, { sort_order: idx })
                : Promise.resolve()));
            // refresh to get server state
            const resp = await listShopItems(params.id, params.shopId);
            const sorted = [...(resp.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
            setItems(sorted);
        }
        catch {
            // revert on error
            await loadItems();
        }
        finally {
            setReordering(false);
        }
    }
    async function toggleItemActive(item: ShopItem) {
        const updated = { ...item, is_active: !item.is_active };
        setItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
        try {
            await updateShopItem(params.id, params.shopId, item.id, { is_active: !item.is_active });
        }
        catch (err: any) {
            // revert on error
            setItems((prev) => prev.map((i) => i.id === item.id ? item : i));
            toast({ variant: "destructive", title: "Error", description: err?.message ?? "Failed to update" });
        }
    }
    async function ensureItemDefs() {
        if (itemDefsLoaded.current)
            return;
        itemDefsLoaded.current = true;
        setItemDefsLoading(true);
        try {
            const resp = await listItemDefinitions({ gameId: params.id }, { limit: 200 });
            setItemDefs(resp.items ?? []);
        }
        catch {
            // silently fail; user can still type UUID manually
        }
        finally {
            setItemDefsLoading(false);
        }
    }
    // ── Add item ─────────────────────────────────────────────────────────────────
    function openAdd() {
        setAddForm(defaultItemForm);
        setAddError(null);
        setItemDefsSearch("");
        setAddOpen(true);
        ensureItemDefs();
    }
    function setAddField<K extends keyof ItemFormState>(k: K, v: ItemFormState[K]) {
        setAddForm((p) => ({ ...p, [k]: v }));
    }
    function validateItemForm(form: ItemFormState): string | null {
        if (!form.item_def_id.trim())
            return "Item Definition is required.";
        if (!form.display_name.trim())
            return "Display name is required.";
        const price = Number(form.price);
        if (isNaN(price) || price <= 0)
            return "Price must be a positive number.";
        if (form.purchase_limit_type !== "unlimited") {
            const limit = Number(form.purchase_limit);
            if (isNaN(limit) || limit < 0)
                return "Purchase limit must be >= 0.";
        }
        const stock = Number(form.stock);
        if (isNaN(stock) || stock < 0)
            return "Stock must be >= 0.";
        if (form.available_from && form.available_until) {
            if (new Date(form.available_until) <= new Date(form.available_from))
                return "Available until must be after available from.";
        }
        return null;
    }
    async function handleAdd() {
        const err = validateItemForm(addForm);
        if (err) {
            setAddError(err);
            return;
        }
        setAddError(null);
        setAdding(true);
        try {
            const payload: AddShopItemPayload = {
                item_def_id: addForm.item_def_id.trim(),
                display_name: addForm.display_name.trim(),
                description: addForm.description.trim() || undefined,
                price: Number(addForm.price),
                purchase_limit_type: addForm.purchase_limit_type,
                purchase_limit: addForm.purchase_limit_type === "unlimited" ? 0 : Number(addForm.purchase_limit),
                restock_schedule: addForm.purchase_limit_type === "unlimited" ? "none" : addForm.restock_schedule,
                stock: Number(addForm.stock),
                is_active: addForm.is_active,
            };
            if (addForm.currency_item_def_id.trim())
                payload.currency_item_def_id = addForm.currency_item_def_id.trim();
            if (addForm.available_from)
                payload.available_from = new Date(addForm.available_from).toISOString();
            if (addForm.available_until)
                payload.available_until = new Date(addForm.available_until).toISOString();
            await addShopItem(params.id, params.shopId, payload);
            await loadItems();
            setAddOpen(false);
        }
        catch (err: any) {
            setAddError(err?.message ?? "Failed to add item");
        }
        finally {
            setAdding(false);
        }
    }
    // ── Edit item ────────────────────────────────────────────────────────────────
    function openEdit(item: ShopItem) {
        setEditItem(item);
        setEditForm({
            item_def_id: item.item_def_id,
            display_name: item.display_name,
            description: item.description ?? "",
            price: String(item.price),
            currency_item_def_id: item.currency_item_def_id ?? "",
            purchase_limit_type: item.purchase_limit_type,
            purchase_limit: String(item.purchase_limit),
            restock_schedule: item.restock_schedule,
            stock: String(item.stock),
            sort_order: String(item.sort_order),
            is_active: item.is_active,
            available_from: formatDateInput(item.available_from),
            available_until: formatDateInput(item.available_until),
        });
        setEditError(null);
        setEditOpen(true);
    }
    function setEditField<K extends keyof ItemFormState>(k: K, v: ItemFormState[K]) {
        setEditForm((p) => ({ ...p, [k]: v }));
    }
    async function handleEdit() {
        if (!editItem)
            return;
        const err = validateItemForm(editForm);
        if (err) {
            setEditError(err);
            return;
        }
        setEditError(null);
        setEditing(true);
        try {
            const payload: UpdateShopItemPayload = {
                display_name: editForm.display_name.trim(),
                description: editForm.description.trim() || undefined,
                price: Number(editForm.price),
                purchase_limit_type: editForm.purchase_limit_type,
                purchase_limit: editForm.purchase_limit_type === "unlimited" ? 0 : Number(editForm.purchase_limit),
                restock_schedule: editForm.purchase_limit_type === "unlimited" ? "none" : editForm.restock_schedule,
                stock: Number(editForm.stock),
                is_active: editForm.is_active,
                // send "" to clear override, or UUID to set it
                currency_item_def_id: editForm.currency_item_def_id ?? "",
            };
            if (editForm.available_from)
                payload.available_from = new Date(editForm.available_from).toISOString();
            if (editForm.available_until)
                payload.available_until = new Date(editForm.available_until).toISOString();
            await updateShopItem(params.id, params.shopId, editItem.id, payload);
            await loadItems();
            setEditOpen(false);
        }
        catch (err: any) {
            setEditError(err?.message ?? "Failed to update item");
        }
        finally {
            setEditing(false);
        }
    }
    // ── Delete item ───────────────────────────────────────────────────────────────
    function openDelete(item: ShopItem) {
        setDeleteItem(item);
        setDeleteError(null);
        setDeleteOpen(true);
    }
    async function handleDelete() {
        if (!deleteItem)
            return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteShopItem(params.id, params.shopId, deleteItem.id);
            await loadItems();
            setDeleteOpen(false);
        }
        catch (err: any) {
            setDeleteError(err?.message ?? "Failed to delete item");
        }
        finally {
            setDeleting(false);
        }
    }
    function startEdit(field: string, value: string) {
        setTmpVal(value);
        if (field === "shop_type")
            setTmpShopType(value);
        if (field === "currency") {
            ensureItemDefs();
            setCurrencyCbOpen(false);
            setCurrencyCbSearch("");
            setCurrencyCbShowAll(false);
        }
        setEditingField(field);
    }
    async function saveField(payload: Record<string, unknown>) {
        if (!shop)
            return;
        setSaving(true);
        try {
            const updated = await updateShop(params.id, params.shopId, payload as any);
            setShop(updated);
            setEditingField(null);
            // Refresh currency display if it changed
            if ("currency_item_def_id" in payload) {
                const newId = payload.currency_item_def_id as string | null;
                if (newId) {
                    getItemDefinition({ gameId: params.id }, newId)
                        .then((res) => setCurrencyItem(res.item))
                        .catch(() => { });
                }
                else {
                    setCurrencyItem(null);
                }
            }
        }
        catch (err: any) {
            toast({ variant: "destructive", title: "Server Error", description: err?.message ?? "Failed to save" });
        }
        finally {
            setSaving(false);
        }
    }
    async function confirmToggleActive() {
        if (!shop || pendingToggle === null)
            return;
        setToggling(true);
        try {
            const updated = await updateShop(params.id, params.shopId, { is_active: pendingToggle });
            setShop(updated);
        }
        catch (err: any) {
            toast({ variant: "destructive", title: "Server Error", description: err?.message ?? "Failed to update shop" });
        }
        finally {
            setToggling(false);
            setPendingToggle(null);
        }
    }
    // ── Render ───────────────────────────────────────────────────────────────────
    if (loading) {
        return (<div className="container mx-auto py-12 px-4 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin"/>
        Loading shop…
      </div>);
    }
    if (error || !shop) {
        return (<div className="container mx-auto py-6 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>{error ?? "Shop not found."}</AlertDescription>
        </Alert>
      </div>);
    }
    const filteredDefs = itemDefs.filter((d) => d.name.toLowerCase().includes(itemDefsSearch.toLowerCase()) ||
        d.item_code.toLowerCase().includes(itemDefsSearch.toLowerCase()));
    return (<div className="container mx-auto py-6 px-4 space-y-6">
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
              <ArrowLeft className="h-4 w-4"/>
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{shop.name}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHOP_TYPE_BADGE[shop.shop_type] ?? ""}`}>
              {shop.shop_type}
            </span>
            <div className="flex items-center gap-2">
              <Switch checked={shop.is_active} onCheckedChange={(checked) => setPendingToggle(checked)} title={shop.is_active ? "Deactivate shop" : "Activate shop"}/>
              <span className="text-sm text-muted-foreground">{shop.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0 items-center flex-wrap">
          <GameNavButtons gameId={params.id} active="shops"/>
        </div>
      </div>
      <Card className="group/card">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">

            {/* LEFT column */}
            <div className="space-y-1 text-sm">

              {/* Shop Name */}
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">Name</span>
                {editingField === "name" ? (<div className="flex items-center gap-1 flex-1">
                    <Input className="h-7 text-sm w-56" value={tmpVal} onChange={(e) => setTmpVal(e.target.value)} disabled={saving} autoFocus/>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ name: tmpVal.trim() })}>
                      <Save className="h-3.5 w-3.5"/>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                      <X className="h-3.5 w-3.5"/>
                    </Button>
                  </div>) : (<div className="group/name flex items-center gap-1 flex-1">
                    <span className="font-semibold text-foreground">{shop.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("name", shop.name)}>
                      <Pencil className="h-3.5 w-3.5"/>
                    </Button>
                  </div>)}
              </div>

              {/* Shop Code Name */}
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none">Code Name</span>
                {editingField === "shop_key" ? (<div className="flex items-center gap-1 flex-1">
                    <Input className="h-7 text-sm font-mono w-52" value={tmpVal} onChange={(e) => setTmpVal(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} disabled={saving} autoFocus/>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ shop_key: tmpVal.trim() })}>
                      <Save className="h-3.5 w-3.5"/>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                      <X className="h-3.5 w-3.5"/>
                    </Button>
                  </div>) : (<div className="group/key flex items-center gap-1 flex-1">
                    <span className="font-mono text-foreground/80">{shop.shop_key}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("shop_key", shop.shop_key)}>
                      <Pencil className="h-3.5 w-3.5"/>
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
                      <Save className="h-3.5 w-3.5"/>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                      <X className="h-3.5 w-3.5"/>
                    </Button>
                  </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SHOP_TYPE_BADGE[shop.shop_type] ?? ""}`}>
                      {shop.shop_type}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("shop_type", shop.shop_type)}>
                      <Pencil className="h-3.5 w-3.5"/>
                    </Button>
                  </div>)}
              </div>

              {/* Starts / Ends At — event only */}
              {(editingField === "shop_type" ? tmpShopType : shop.shop_type) === "event" && (<>
                  {/* Starts At */}
                  <div className="flex items-baseline gap-3 min-h-[32px]">
                    <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none flex items-center gap-1">
                      <Calendar className="h-3 w-3"/> Starts At
                    </span>
                    {editingField === "starts_at" ? (<div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-1">
                          <Input type="datetime-local" className="h-7 text-xs w-48" value={tmpVal} onChange={(e) => setTmpVal(e.target.value)} disabled={saving} autoFocus/>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ starts_at: tmpVal ? new Date(tmpVal).toISOString() : null })}>
                            <Save className="h-3.5 w-3.5"/>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                            <X className="h-3.5 w-3.5"/>
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
                          <Pencil className="h-3.5 w-3.5"/>
                        </Button>
                      </div>)}
                  </div>

                  {/* Ends At */}
                  <div className="flex items-baseline gap-3 min-h-[32px]">
                    <span className="text-xs text-muted-foreground/60 w-24 shrink-0 pt-1 select-none flex items-center gap-1">
                      <Calendar className="h-3 w-3"/> Ends At
                    </span>
                    {editingField === "ends_at" ? (<div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-1">
                          <Input type="datetime-local" className="h-7 text-xs w-48" value={tmpVal} onChange={(e) => setTmpVal(e.target.value)} disabled={saving} autoFocus/>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => saveField({ ends_at: tmpVal ? new Date(tmpVal).toISOString() : null })}>
                            <Save className="h-3.5 w-3.5"/>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                            <X className="h-3.5 w-3.5"/>
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
                          <Pencil className="h-3.5 w-3.5"/>
                        </Button>
                      </div>)}
                  </div>
                </>)}

            </div>

            {/* RIGHT column */}
            <div className="space-y-1 text-sm">

              {/* IDs */}
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none">Game ID</span>
                <span className="flex items-center gap-1.5 text-xs font-mono text-foreground/70">
                  {shop.game_id}
                  <CopyButton text={shop.game_id}/>
                </span>
              </div>
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none">Shop ID</span>
                <span className="flex items-center gap-1.5 text-xs font-mono text-foreground/70">
                  {shop.id}
                  <CopyButton text={shop.id}/>
                </span>
              </div>

              {/* Created At / Updated At */}
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none flex items-center gap-1">
                  <Clock className="h-3 w-3"/> Created
                </span>
                <span className="text-foreground/80">{formatDate(shop.created_at)}</span>
              </div>
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none flex items-center gap-1">
                  <Clock className="h-3 w-3"/> Updated
                </span>
                <span className="text-foreground/80">{formatDate(shop.updated_at)}</span>
              </div>

              {/* Currency */}
              <div className="flex items-baseline gap-3 min-h-[32px]">
                <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none flex items-center gap-1">
                  <Coins className="h-3 w-3"/> Currency
                </span>
                {editingField === "currency" ? (<div className="space-y-1.5 flex-1">
                    <Popover open={currencyCbOpen} onOpenChange={setCurrencyCbOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={currencyCbOpen} className="w-full justify-between font-normal h-8 text-sm" disabled={itemDefsLoading}>
                          {itemDefsLoading ? (<span className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin"/> Loading…
                            </span>) : tmpVal ? (<span className="flex items-center gap-2">
                              <span>{itemDefs.find((d) => d.id === tmpVal)?.name ?? <span className="font-mono text-xs">{tmpVal.slice(0, 8)}…</span>}</span>
                              {itemDefs.find((d) => d.id === tmpVal) && (<span className="text-xs text-muted-foreground font-mono">
                                  {itemDefs.find((d) => d.id === tmpVal)!.item_code}
                                </span>)}
                            </span>) : (<span className="text-muted-foreground">Select currency item…</span>)}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
                        <Command shouldFilter={false}>
                          <CommandInput placeholder="Search by name or code…" value={currencyCbSearch} onValueChange={setCurrencyCbSearch}/>
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
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
                                    <Check className={`mr-2 h-4 w-4 shrink-0 ${tmpVal === d.id ? "opacity-100" : "opacity-0"}`}/>
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
                      <Checkbox id="cb_show_all" checked={currencyCbShowAll} onCheckedChange={(v) => setCurrencyCbShowAll(!!v)}/>
                      <label htmlFor="cb_show_all" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Show all item types
                      </label>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={() => saveField({ currency_item_def_id: tmpVal.trim() || null })}>
                        <Save className="h-3.5 w-3.5 mr-1"/> Save
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                        <X className="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>) : (<div className="group/meta flex items-center gap-1 flex-1">
                    {shop.currency_item_def_id ? (<span className="flex items-center gap-1.5">
                        {currencyItem ? (<Link href={`/games/${params.id}/items/${shop.currency_item_def_id}`} className="flex items-center gap-1.5 hover:underline text-foreground font-semibold" title="View item definition">
                            <span>{currencyItem.name}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                          </Link>) : (<Link href={`/games/${params.id}/items/${shop.currency_item_def_id}`} className="flex items-center gap-1 hover:underline text-foreground/80" title="View item definition">
                            <span className="text-xs font-mono">{shop.currency_item_def_id.slice(0, 8)}…</span>
                            <ExternalLink className="h-3 w-3"/>
                          </Link>)}
                      </span>) : (<span className="italic text-muted-foreground/50">—</span>)}
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("currency", shop.currency_item_def_id ?? "")}>
                      <Pencil className="h-3.5 w-3.5"/>
                    </Button>
                  </div>)}
              </div>

              {/* Description */}
              <div className="flex gap-3 min-h-[32px] mt-2">
                <span className="text-xs text-muted-foreground/60 w-20 shrink-0 pt-1 select-none">Description</span>
                {editingField === "description" ? (<div className="space-y-1 flex-1">
                    <textarea className="w-full border rounded px-2 py-1.5 text-sm resize-none min-h-[80px] bg-background" value={tmpVal} onChange={(e) => setTmpVal(e.target.value)} disabled={saving} autoFocus maxLength={700}/>
                    <p className={`text-right text-xs ${tmpVal.length >= 700 ? 'text-destructive font-medium' : tmpVal.length >= 600 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {tmpVal.length}/700
                    </p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" disabled={saving} onClick={() => saveField({ description: tmpVal.trim() || undefined })}>
                        <Save className="h-3.5 w-3.5 mr-1"/> Save
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={saving} onClick={() => setEditingField(null)}>
                        <X className="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>) : (<div className="group/desc flex w-full items-start gap-1 flex-1">
                    <p className="flex-1 text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                      {shop.description || <span className="italic text-muted-foreground/50">—</span>}
                    </p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity" onClick={() => startEdit("description", shop.description ?? "")}>
                      <Pencil className="h-3.5 w-3.5"/>
                    </Button>
                  </div>)}
              </div>

            </div>{/* /right column */}

          </div>
        </CardContent>
      </Card>

      {/* Tabs: Items / Logs */}
      <Tabs value={searchParams.get("tab") === "logs" ? "logs" : "items"} onValueChange={(v) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("tab", v);
            router.replace(`?${sp.toString()}`, { scroll: false });
            if (v === "logs" && !logsLoaded) {
                loadLogs({ offset: 0 });
            }
        }}>
        <TabsList>
          <TabsTrigger value="items" className="flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4"/>
            Items
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <ScrollText className="h-4 w-4"/>
            Logs
          </TabsTrigger>
        </TabsList>

        {/* ─── Items Tab ─────────────────────────────────────────── */}
        <TabsContent value="items" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-muted-foreground mt-0.5"/>
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
                                <span className={`block h-full rounded-full transition-all ${pct >= 1 ? "bg-destructive" : pct >= 0.8 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct * 100, 100)}%` }}/>
                              </span>
                            </>);
                })()
                : <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>}
                  </p>)}
                {itemsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mt-0.5"/>}
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
                <Plus className="h-4 w-4"/>
                Add Item
              </Button>
            </div>
          </div>

          {itemsError ? (<Alert variant="destructive">
              <AlertCircle className="h-4 w-4"/>
              <AlertDescription>{itemsError}</AlertDescription>
            </Alert>) : itemsLoading ? (<Card>
              <CardContent className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading items…
              </CardContent>
            </Card>) : filteredItems.length === 0 ? (<Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <PackageSearch className="h-10 w-10 text-muted-foreground"/>
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
                    <Plus className="h-4 w-4 mr-2"/>
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
                      {filteredItems.map((item, idx) => (<SortableItemRow key={item.id} item={item} index={idx} gameId={params.id} itemDefs={itemDefs} onEdit={openEdit} onDelete={openDelete} onToggle={toggleItemActive}/>))}
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
                      <SelectValue placeholder="All types"/>
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
                      <SelectValue placeholder="All actors"/>
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
                  <Input type="datetime-local" className="h-8 text-sm w-44" value={logFilterFrom} onChange={(e) => setLogFilterFrom(e.target.value)}/>
                </div>

                {/* To */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">To</p>
                  <Input type="datetime-local" className="h-8 text-sm w-44" value={logFilterTo} onChange={(e) => setLogFilterTo(e.target.value)}/>
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
            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1"/>
            : <RefreshCw className="h-3.5 w-3.5 mr-1"/>}
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
              <AlertCircle className="h-4 w-4"/>
              <AlertDescription>{logsError}</AlertDescription>
            </Alert>) : logsLoading ? (<Card>
              <CardContent className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/> Loading logs…
              </CardContent>
            </Card>) : !logsLoaded ? (<Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
                <ScrollText className="h-8 w-8"/>
                <p className="text-sm">Apply filters to load logs.</p>
              </CardContent>
            </Card>) : logs.length === 0 ? (<Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-center text-muted-foreground">
                <ScrollText className="h-8 w-8"/>
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
                        <CopyButton text={log.actor_id} className="ml-1"/>
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
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>Add Item to Shop</SheetTitle>
            <SheetDescription>Select an item definition and configure its shop settings.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2 pr-4">
          <ItemForm form={addForm} setField={setAddField} itemDefs={itemDefs} itemDefsLoading={itemDefsLoading} error={addError} gameId={params.id}/>
          </div>
          <SheetFooter className="pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding}>
              {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Add Item
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Item Dialog ──────────────────────────────────────── */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>Edit Item</SheetTitle>
            <SheetDescription>{editItem?.display_name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2 pr-4">
          <ItemForm form={editForm} setField={setEditField} itemDefs={itemDefs} itemDefsLoading={false} error={editError} disableItemDef gameId={params.id} editItemId={editItem?.item_def_id}/>
          </div>
          <SheetFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editing}>
              {editing && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Toggle Active Confirmation ────────────────────────────── */}
      <Dialog open={pendingToggle !== null} onOpenChange={(open) => {
            if (!open)
                setPendingToggle(null);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingToggle ? "Activate shop?" : "Deactivate shop?"}</DialogTitle>
            <DialogDescription>
              {pendingToggle
            ? "This shop will become visible and purchasable by players."
            : "This shop will be hidden from players and no longer purchasable."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingToggle(null)} disabled={toggling}>
              Cancel
            </Button>
            <Button onClick={confirmToggleActive} disabled={toggling}>
              {toggling && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">{deleteItem?.display_name}</span> from this shop?
              This action cannot be undone on the UI (soft-delete — history is preserved).
            </DialogDescription>
          </DialogHeader>
          {deleteError && (<Alert variant="destructive">
              <AlertCircle className="h-4 w-4"/>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
              Remove Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
// ─── Sortable Item Row ────────────────────────────────────────────────────────
interface SortableItemRowProps {
    item: ShopItem;
    index: number;
    gameId: string;
    itemDefs: ItemDefinition[];
    onEdit: (item: ShopItem) => void;
    onDelete: (item: ShopItem) => void;
    onToggle: (item: ShopItem) => void;
}
function SortableItemRow({ item, index, gameId, itemDefs, onEdit, onDelete, onToggle }: SortableItemRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? "var(--muted)" : undefined,
        zIndex: isDragging ? 10 : undefined,
        position: "relative",
    };
    return (<TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 pr-0">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded touch-none" title="Drag to reorder">
          <GripVertical className="h-4 w-4"/>
        </button>
      </TableCell>
      <TableCell className="w-10 text-center text-xs text-muted-foreground font-mono">
        {item.sort_order}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{item.display_name}</p>
          {item.description && (<p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>)}
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-muted-foreground/60 font-mono">{item.id}</span>
            <CopyButton text={item.id} className="shrink-0"/>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Link href={`/games/${gameId}/items/${item.item_def_id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono" target="_blank">
          {itemDefs.find((d) => d.id === item.item_def_id)?.name ?? item.item_def_id.slice(0, 8) + "…"}
          <ExternalLink className="h-3 w-3 shrink-0"/>
        </Link>
      </TableCell>
      <TableCell className="text-right font-semibold">
        {item.price.toLocaleString()}
        {item.currency_item_def_id && (<Link href={`/games/${gameId}/items/${item.currency_item_def_id}`} className="flex items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary hover:underline font-normal font-mono mt-0.5" target="_blank">
            {itemDefs.find((d) => d.id === item.currency_item_def_id)?.name ?? item.currency_item_def_id.slice(0, 8) + "…"}
            <ExternalLink className="h-3 w-3 shrink-0"/>
          </Link>)}
      </TableCell>
      <TableCell>
        <span className="text-xs">
          {item.purchase_limit_type === "unlimited" ? ("Unlimited") : (<>{item.purchase_limit.toLocaleString()} <span className="text-muted-foreground">/ {PURCHASE_LIMIT_LABELS[item.purchase_limit_type]}</span></>)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs">{RESTOCK_LABELS[item.restock_schedule]}</span>
      </TableCell>
      <TableCell className="text-right">
        {item.stock === 0 ? (<span className="text-xs text-muted-foreground">∞</span>) : (item.stock.toLocaleString())}
      </TableCell>
      <TableCell>
        <Switch checked={item.is_active} onCheckedChange={() => onToggle(item)} title={item.is_active ? "Deactivate" : "Activate"}/>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
            <Pencil className="h-4 w-4"/>
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(item)}>
            <Trash2 className="h-4 w-4"/>
          </Button>
        </div>
      </TableCell>
    </TableRow>);
}
// ─── Shared Item Form ─────────────────────────────────────────────────────────
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
function ItemForm({ form, setField, itemDefs, itemDefsLoading, error, disableItemDef, gameId, editItemId, }: ItemFormProps) {
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
        <Label>
          Item Definition <span className="text-destructive">*</span>
        </Label>
        {!disableItemDef ? (<Popover open={itemDefOpen} onOpenChange={setItemDefOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={itemDefOpen} className="w-full justify-between font-normal h-9 text-sm" disabled={itemDefsLoading}>
                {itemDefsLoading ? (<span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin"/> Loading…
                  </span>) : selectedItemDef ? (<span className="flex items-center gap-2">
                    <span>{selectedItemDef.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{selectedItemDef.item_code}</span>
                  </span>) : form.item_def_id ? (<span className="font-mono text-xs text-muted-foreground">{form.item_def_id.slice(0, 8)}…</span>) : (<span className="text-muted-foreground">Select item definition…</span>)}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search by name or code…" value={itemDefSearch} onValueChange={setItemDefSearch}/>
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
                        <Check className={`mr-2 h-4 w-4 shrink-0 ${form.item_def_id === d.id ? "opacity-100" : "opacity-0"}`}/>
                        <span className="flex-1">{d.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{d.category}</span>
                      </CommandItem>))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>) : (<div className="flex items-center gap-2">
            <Input value={form.item_def_id} disabled className="font-mono text-xs flex-1"/>
            {gameId && editItemId && (<Link href={`/games/${gameId}/items/${editItemId}`} target="_blank" className="shrink-0 text-muted-foreground hover:text-foreground" title="View item definition">
                <ExternalLink className="h-4 w-4"/>
              </Link>)}
          </div>)}
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label>
          Display Name <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input placeholder="e.g. Magic Sword" value={form.display_name} onChange={(e) => {
            setField("display_name", e.target.value);
            setSyncName(false);
        }}/>
          {!disableItemDef && (<Button type="button" variant={syncName ? "default" : "outline"} size="icon" className="shrink-0" title={syncName ? "Auto-sync with item definition (click to disable)" : "Auto-sync disabled (click to enable)"} onClick={() => {
                const next = !syncName;
                setSyncName(next);
                if (next && selectedItemDef)
                    setField("display_name", selectedItemDef.name);
            }}>
              <Wand2 className="h-4 w-4"/>
            </Button>)}
        </div>
        {!disableItemDef && (<p className="text-xs text-muted-foreground">
            {syncName ? "Auto-syncing with item definition name." : "Manual mode — not syncing with item definition."}
          </p>)}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea placeholder="Optional description…" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} maxLength={700}/>
        <p className={`text-right text-xs ${form.description.length >= 700 ? 'text-destructive font-medium' : form.description.length >= 600 ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {form.description.length}/700
        </p>
      </div>

      {/* Price + Currency */}
      <div className="flex gap-3">
        <div className="space-y-1.5 w-2/5">
          <Label>
            Price <span className="text-destructive">*</span>
          </Label>
          <Input type="number" min={1} placeholder="e.g. 200" value={form.price} onChange={(e) => setField("price", e.target.value)}/>
        </div>
        <div className="space-y-1.5 w-3/5">
          <Label>Currency <span className="text-xs text-muted-foreground">(overrides shop)</span></Label>
          <div className="flex items-center gap-2">
          <Popover open={currOpen} onOpenChange={setCurrOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={currOpen} className="flex-1 justify-between font-normal h-9 text-sm">
                {selectedCurrDef ? (<span>{selectedCurrDef.name}</span>) : form.currency_item_def_id ? (<span className="font-mono text-xs text-muted-foreground">{form.currency_item_def_id.slice(0, 8)}…</span>) : (<span className="text-muted-foreground">None (use shop default)</span>)}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" style={{ zIndex: 9999 }}>
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search by name or code…" value={currSearch} onValueChange={setCurrSearch}/>
                <CommandList>
                  <CommandEmpty>No item found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => { setField("currency_item_def_id", ""); setCurrOpen(false); setCurrSearch(""); }}>
                      <Check className={`mr-2 h-4 w-4 shrink-0 ${!form.currency_item_def_id ? "opacity-100" : "opacity-0"}`}/>
                      <span className="text-muted-foreground italic">None</span>
                    </CommandItem>
                    {filteredCurrDefs.slice(0, 30).map((d) => (<CommandItem key={d.id} value={d.id} onSelect={() => { setField("currency_item_def_id", d.id); setCurrOpen(false); setCurrSearch(""); }}>
                        <Check className={`mr-2 h-4 w-4 shrink-0 ${form.currency_item_def_id === d.id ? "opacity-100" : "opacity-0"}`}/>
                        <span className="flex-1">{d.name}</span>
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{d.category}</span>
                      </CommandItem>))}
                  </CommandGroup>
                </CommandList>
              </Command>
              <div className="flex items-center gap-2 px-3 py-2 border-t">
                <Checkbox id="curr_show_all" checked={currShowAll} onCheckedChange={(v) => setCurrShowAll(!!v)}/>
                <label htmlFor="curr_show_all" className="text-xs text-muted-foreground cursor-pointer select-none">Show all item types</label>
              </div>
            </PopoverContent>
          </Popover>
          {form.currency_item_def_id && (<Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" title="Clear override" onClick={() => setField("currency_item_def_id", "")}>
              <X className="h-4 w-4"/>
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
            <Input type="number" min={0} value={form.purchase_limit} onChange={(e) => setField("purchase_limit", e.target.value)}/>
          </div>)}
      </div>

      {/* Stock + Restock Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>
            Stock{" "}
            <span className="text-xs text-muted-foreground">(0 = unlimited)</span>
          </Label>
          <Input type="number" min={0} value={form.stock} onChange={(e) => setField("stock", e.target.value)}/>
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
          <Input type="datetime-local" value={form.available_from} onChange={(e) => setField("available_from", e.target.value)} className={form.available_from ? `border-current/20 ${dateStatusColor(new Date(form.available_from).toISOString(), "start")}` : ""}/>
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
          <Input type="datetime-local" value={form.available_until} onChange={(e) => setField("available_until", e.target.value)} className={form.available_until ? `border-current/20 ${dateStatusColor(new Date(form.available_until).toISOString(), "end")}` : ""}/>
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
        <Switch id="item_active" checked={form.is_active} onCheckedChange={(v) => setField("is_active", v)}/>
        <Label htmlFor="item_active" className="cursor-pointer">
          Active immediately
        </Label>
      </div>

      {error && (<Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertDescription>{error}</AlertDescription>
        </Alert>)}
    </div>);
}
