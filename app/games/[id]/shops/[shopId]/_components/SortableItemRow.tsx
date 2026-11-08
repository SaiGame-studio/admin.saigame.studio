"use client";
import { CopyButton } from "@/components/CopyButton";
import { SGemIcon } from "@/components/SGemIcon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { type ShopItem } from "@/lib/shop-admin-api";
import { SGEM_CURRENCY_LABEL } from "@/lib/shop-currency";
import type { ItemDefinition } from "@/types/inventory";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { PURCHASE_LIMIT_LABELS, RESTOCK_LABELS } from "./shop-detail-shared";
interface SortableItemRowProps {
    item: ShopItem;
    index: number;
    gameId: string;
    itemDefs: ItemDefinition[];
    onEdit: (item: ShopItem) => void;
    onDelete: (item: ShopItem) => void;
    onToggle: (item: ShopItem) => void;
}
export function SortableItemRow({ item, index, gameId, itemDefs, onEdit, onDelete, onToggle }: SortableItemRowProps) {
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
                <GripVertical className="h-4 w-4" />
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
                    <CopyButton text={item.id} className="shrink-0" />
                </div>
            </div>
        </TableCell>
        <TableCell>
            <Link href={`/games/${gameId}/items/${item.item_def_id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono">
                {itemDefs.find((d) => d.id === item.item_def_id)?.name ?? item.item_def_id.slice(0, 8) + "…"}
                <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
        </TableCell>
        <TableCell className="text-right font-semibold">
            {item.price.toLocaleString()}
            {item.currency_type === "sgem" && (<span id={`shop-item-currency-sgem-${item.id}`} className="flex items-center justify-end gap-1 text-xs text-muted-foreground font-normal mt-0.5">
                <SGemIcon id={`shop-item-currency-sgem-icon-${item.id}`} className="h-4 w-4" /> {SGEM_CURRENCY_LABEL}
            </span>)}
            {item.currency_type !== "sgem" && item.currency_item_def_id && (<Link href={`/games/${gameId}/items/${item.currency_item_def_id}`} className="flex items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary hover:underline font-normal font-mono mt-0.5" target="_blank">
                {itemDefs.find((d) => d.id === item.currency_item_def_id)?.name ?? item.currency_item_def_id.slice(0, 8) + "…"}
                <ExternalLink className="h-3 w-3 shrink-0" />
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
            <Switch checked={item.is_active} onCheckedChange={() => onToggle(item)} title={item.is_active ? "Deactivate" : "Activate"} />
        </TableCell>
        <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(item)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </TableCell>
    </TableRow>);
}
