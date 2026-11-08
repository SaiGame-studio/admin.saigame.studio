import { type PurchaseLimitType, type RestockSchedule, type ShopEventType } from "@/lib/shop-admin-api";
export const SHOP_TYPE_BADGE: Record<string, string> = {
    permanent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    daily: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    weekly: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    seasonal: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    event: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
export const PURCHASE_LIMIT_LABELS: Record<PurchaseLimitType, string> = {
    unlimited: "Unlimited",
    player: "Per Player",
    global: "Global",
};
export const RESTOCK_LABELS: Record<RestockSchedule, string> = {
    none: "Never",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
};
export const EVENT_TYPE_LABELS: Record<string, string> = {
    shop_created: "Shop Created",
    shop_updated: "Shop Updated",
    shop_deleted: "Shop Deleted",
    shop_item_added: "Item Added",
    shop_item_updated: "Item Updated",
    shop_item_deleted: "Item Deleted",
    shop_viewed: "Shop Viewed",
    item_purchased: "Item Purchased",
};
export const EVENT_TYPE_BADGE: Record<string, string> = {
    shop_created: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    shop_updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    shop_deleted: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    shop_item_added: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    shop_item_updated: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    shop_item_deleted: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    shop_viewed: "bg-muted text-muted-foreground",
    item_purchased: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};
export const ALL_EVENT_TYPES: ShopEventType[] = [
    "shop_created",
    "shop_updated",
    "shop_item_added",
    "shop_item_updated",
    "shop_item_deleted",
    "shop_viewed",
    "item_purchased",
];
export function formatDate(iso: string | null | undefined) {
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
export function formatDateInput(iso: string | null | undefined): string {
    if (!iso)
        return "";
    // Convert ISO to datetime-local value (YYYY-MM-DDTHH:mm)
    return new Date(iso).toISOString().slice(0, 16);
}
export function dateStatusColor(iso: string | null | undefined, kind: "start" | "end"): string {
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
export function toDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export type ItemFormState = {
    translations: import("@/lib/shop-admin-api").ShopItemTranslations;
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
export const defaultItemForm: ItemFormState = {
    translations: {},
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
