"use client";
import { useToast } from "@/hooks/use-toast";
import { getGame } from "@/lib/game-api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getItemDefinition, listItemDefinitions } from "@/lib/inventory-api";
import { addShopItem, deleteShopItem, getShop, listShopEvents, listShopItems, updateShop, updateShopItem, type ActorType, type AddShopItemPayload, type ShopDefinition, type ShopEvent, type ShopEventType, type ShopItem, type UpdateShopItemPayload } from "@/lib/shop-admin-api";
import { toAddItemCurrencyPayload, toCurrencyPickerValue, toUpdateItemCurrencyPayload } from "@/lib/shop-currency";
import type { ItemDefinition } from "@/types/inventory";
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ItemFormState, defaultItemForm, formatDateInput, toDatetimeLocal } from "./shop-detail-shared";
export function useShopDetail() {

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
                description: addForm.description.trim(),
                translations: { ...addForm.translations, en: { display_name: addForm.display_name.trim(), description: addForm.description.trim() } },
                price: Number(addForm.price),
                purchase_limit_type: addForm.purchase_limit_type,
                purchase_limit: addForm.purchase_limit_type === "unlimited" ? 0 : Number(addForm.purchase_limit),
                restock_schedule: addForm.purchase_limit_type === "unlimited" ? "none" : addForm.restock_schedule,
                stock: Number(addForm.stock),
                is_active: addForm.is_active,
            };
            Object.assign(payload, toAddItemCurrencyPayload(addForm.currency_item_def_id));
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
            display_name: item.translations?.en?.display_name?.trim() ? item.translations.en.display_name : item.display_name,
            description: item.translations?.en?.description?.trim() ? item.translations.en.description : item.description ?? "",
            translations: item.translations ?? {},
            price: String(item.price),
            currency_item_def_id: toCurrencyPickerValue(item),
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
    async function handleEdit(closeAfterSave: boolean) {
        if (!editItem || editing)
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
                description: editForm.description.trim(),
                translations: { ...editForm.translations, en: { display_name: editForm.display_name.trim(), description: editForm.description.trim() } },
                price: Number(editForm.price),
                purchase_limit_type: editForm.purchase_limit_type,
                purchase_limit: editForm.purchase_limit_type === "unlimited" ? 0 : Number(editForm.purchase_limit),
                restock_schedule: editForm.purchase_limit_type === "unlimited" ? "none" : editForm.restock_schedule,
                stock: Number(editForm.stock),
                is_active: editForm.is_active,
                // send "" to clear an override, or a value to set it
                ...toUpdateItemCurrencyPayload(editForm.currency_item_def_id ?? ""),
            };
            if (editForm.available_from)
                payload.available_from = new Date(editForm.available_from).toISOString();
            if (editForm.available_until)
                payload.available_until = new Date(editForm.available_until).toISOString();
            const updated = await updateShopItem(params.id, params.shopId, editItem.id, payload);
            setEditItem(updated);
            await loadItems();
            if (closeAfterSave) setEditOpen(false);
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

    return { loading, error, shop, params, items, setPendingToggle, gameName, router, searchParams, t, itemsLoading, itemsError, itemFilter, setItemFilter, itemDefs, itemDefsLoading, editingField, setEditingField, tmpVal, setTmpVal, tmpShopType, setTmpShopType, saving, currencyCbOpen, setCurrencyCbOpen, currencyCbSearch, setCurrencyCbSearch, currencyCbShowAll, setCurrencyCbShowAll, currencyItem, logsLoaded, logs, logsLoading, logsError, logsTotal, logFilterType, setLogFilterType, logFilterActorType, setLogFilterActorType, logFilterFrom, setLogFilterFrom, logFilterTo, setLogFilterTo, logLimit, setLogLimit, logOffset, setLogOffset, filteredItems, loadLogs, reordering, sensors, handleDragEnd, toggleItemActive, openAdd, openEdit, openDelete, startEdit, saveField, addOpen, setAddOpen, addForm, addError, adding, editOpen, setEditOpen, editItem, editForm, editError, editing, deleteOpen, setDeleteOpen, deleteItem, deleting, deleteError, pendingToggle, toggling, setAddField, handleAdd, setEditField, handleEdit, handleDelete, confirmToggleActive };
}
export type ShopDetailState = ReturnType<typeof useShopDetail>;
export type ShopDetailViewState = Omit<ShopDetailState, "shop"> & { shop: ShopDefinition };
