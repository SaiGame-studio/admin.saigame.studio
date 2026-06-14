"use client";
import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { toSlug, toSlugUnderscore, toSafeCodeName } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Search, RefreshCw, Package, Eye, Copy, Check, ExternalLink, Hammer, Trash2, Pencil, Dices, Save, X, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Loader2, Wand2, ZoomIn, ZoomOut, Info, Tag, Lock, Archive, Zap, Shield, LayoutTemplate, AlertTriangle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ITEMS_TABS } from "@/lib/items-tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n/use-translation";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { getGame } from "@/lib/game-api";
import { ApiError } from "@/lib/api-client";
import { listItemDefinitions, createItemDefinition, getItemDefinition, updateItemDefinition, fetchItemCategories, fetchItemRarities, listContainerDefinitions, createContainerDefinition, getContainerDefinition, updateContainerDefinition, deleteContainerDefinition, fetchContainerTypes, type ContainerTypeOption, listGachaPacks, createGachaPack, updateGachaPack, deleteGachaPack, setGachaPackEnabled, listEquipmentSlots, getEquipmentSlot, createEquipmentSlot, updateEquipmentSlot, deleteEquipmentSlot, listItemTags, getItemTag, createItemTag, updateItemTag, deleteItemTag, listPresetDefinitions, createPresetDefinition, updatePresetDefinition, deletePresetDefinition, type ListItemsParams, type ItemTag, type CreateItemTagRequest, type UpdateItemTagRequest, type PresetDefinition, type CreatePresetDefinitionRequest, type UpdatePresetDefinitionRequest, } from "@/lib/inventory-api";
import type { ItemDefinition, ItemCategory, ItemRarity, CreateItemRequest, UpdateItemRequest, ContainerDefinition, ContainerType, CreateContainerDefinitionRequest, UpdateContainerDefinitionRequest, GachaPack, GachaPoolEntry, KeyRequirement, EquipmentSlot, } from "@/types/inventory";
import { RARITY_COLORS } from "@/types/inventory";
import type { GameLimits } from "@/types/game";
import { GameNavButtons } from "@/components/GameNavButtons";
import { CopyButton } from "@/components/CopyButton";
import { CraftingTab } from "@/components/crafting/crafting-tab";
import { EquipmentsTab, EquipmentSlotSheet } from '@/components/EquipmentsTab';
import { CreateItemDefinitionDialog } from '@/components/CreateItemDefinitionDialog';
import { createConversation, linkConversationContent } from '@/lib/llm-conversation-api';
import { safeGetItem, safeSetItem } from '@/lib/storage-utils';
import { useEscapeLayer } from '@/hooks/use-escape-manager';
function RarityBadge({ rarity }: {
    rarity: ItemRarity;
}) {
    const c = RARITY_COLORS[rarity];
    if (!c) {
        return (<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border text-gray-400 border-gray-400 bg-gray-400/10 capitalize w-fit">
        {rarity}
      </span>);
    }
    return (<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${c.text} ${c.border} ${c.bg} capitalize w-fit`}>
      {rarity}
    </span>);
}
type KVEntry = {
    key: string;
    value: string;
};
function KVEditor({ entries, onChange, label, numericValue, }: {
    entries: KVEntry[];
    onChange: (v: KVEntry[]) => void;
    label: string;
    numericValue?: boolean;
}) {
    const addRow = () => onChange([...entries, { key: "", value: "" }]);
    const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
    const update = (i: number, field: "key" | "value", val: string) => {
        if (numericValue && field === "value" && val !== "" && val !== "-" && isNaN(Number(val)))
            return;
        const next = entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
        onChange(next);
    };
    return (<div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {entries.map((e, i) => (<div key={i} className="flex gap-1 items-center">
          <Input className="h-7 text-xs" placeholder="key" value={e.key} onChange={(ev) => update(i, "key", ev.target.value)}/>
          <span className="text-muted-foreground">=</span>
          <Input className="h-7 text-xs" placeholder={numericValue ? "0" : "value"} inputMode={numericValue ? "decimal" : undefined} value={e.value} onChange={(ev) => update(i, "value", ev.target.value)}/>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" type="button" onClick={() => remove(i)}>
            ?
          </Button>
        </div>))}
      <Button variant="outline" size="sm" type="button" className="h-7 text-xs mt-1" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1"/> Add
      </Button>
    </div>);
}
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Gacha helpers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
/** snake_case ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Title Case (e.g. "gacha_pack" ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ "Gacha Pack") */
function prettyCategory(s: string): string {
    return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function formatPct(pct: number): string {
    if (pct === 0)
        return "0%";
    if (pct >= 1)
        return pct.toFixed(2) + "%";
    if (pct >= 0.01)
        return pct.toFixed(4) + "%";
    if (pct >= 0.0001)
        return pct.toFixed(6) + "%";
    return pct.toFixed(10).replace(/\.?0+$/, "") + "%";
}
function DropBar({ weight, total }: {
    weight: number;
    total: number;
}) {
    const pct = total > 0 ? Math.min((weight / total) * 100, 100) : 0;
    return (<div className="flex items-center gap-1.5 min-w-[400px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
        {formatPct(pct)}
      </span>
    </div>);
}
interface PoolRow {
    item_definition_id: string;
    weight: string;
    quantity_min: string;
    quantity_max: string;
}
const EMPTY_ROW = (): PoolRow => ({
    item_definition_id: "",
    weight: "700000",
    quantity_min: "1",
    quantity_max: "1",
});
interface KeyReqRow {
    item_definition_id: string;
    quantity: string;
}
type GachaLLMRow = {
    item_definition_id?: unknown;
    weight?: unknown;
    quantity_min?: unknown;
    quantity_max?: unknown;
    quantity?: unknown;
};
const EMPTY_KEY_ROW = (): KeyReqRow => ({
    item_definition_id: "",
    quantity: "1",
});
function emptyGachaForm() {
    return {
        name: "",
        code_name: "",
        collect_destination: "mailbox" as "mailbox" | "inventory",
        is_enabled: true,
        mailbox_title: "",
        mailbox_body: "",
        pool: [EMPTY_ROW()],
        keyReqs: [EMPTY_KEY_ROW()],
    };
}
/** Resolve a __REF:ITEM_CODE placeholder to the actual item definition ID.
 *  Returns the original value unchanged if it is not a __REF: placeholder
 *  or no matching item is found. */
function resolveGachaRef(rawId: string, items: ItemDefinition[]): string {
    if (!rawId.startsWith('__REF:'))
        return rawId;
    const code = rawId.slice(6); // strip "__REF:"
    const found = items.find((it) => it.item_code?.toUpperCase() === code.toUpperCase());
    return found ? found.id : rawId;
}
/** Search the API to resolve __REF:ITEM_CODE placeholders to actual item definition IDs.
 *  Returns a map of item_code -> item_definition_id for every ref that was found. */
async function resolveGachaRefCodes(rawIds: string[], gameId: string): Promise<Record<string, string>> {
    const refCodes = [...new Set(rawIds.filter((id) => id.startsWith('__REF:')).map((id) => id.slice(6)))];
    const codeToId: Record<string, string> = {};
    if (refCodes.length === 0)
        return codeToId;
    await Promise.allSettled(refCodes.map((code) => listItemDefinitions({ gameId }, { item_code: code, limit: 1 })
        .then((res) => {
        const found = (res.items ?? [])[0];
        if (found)
            codeToId[code] = found.id;
    })
        .catch(() => { })));
    return codeToId;
}
/** Apply a code->id map: if rawId is __REF:CODE, return the resolved ID when available,
 *  otherwise keep the placeholder so the form can still show the unresolved ref. */
function applyRefCodeMap(rawId: string, codeToId: Record<string, string>): string {
    if (!rawId.startsWith('__REF:'))
        return rawId;
    return codeToId[rawId.slice(6)] ?? rawId;
}
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Container Definition helpers ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
const CONTAINER_TYPE_META: Record<string, {
    label: string;
    className: string;
}> = {
    inventory: { label: 'Inventory', className: 'bg-gray-500/15 text-gray-400 border-gray-400/40' },
    chest: { label: 'Chest', className: 'bg-amber-500/15 text-amber-500 border-amber-500/40' },
    bag: { label: 'Bag', className: 'bg-green-500/15 text-green-500 border-green-500/40' },
    vault: { label: 'Vault', className: 'bg-purple-500/15 text-purple-500 border-purple-500/40' },
    shulker_box: { label: 'Shulker Box', className: 'bg-pink-500/15 text-pink-500 border-pink-500/40' },
    equipment: { label: 'Equipment', className: 'bg-blue-500/15 text-blue-400 border-blue-400/40' },
};
function ContainerTypeBadge({ type }: {
    type: ContainerType;
}) {
    const m = CONTAINER_TYPE_META[type] ?? { label: type, className: 'bg-muted text-muted-foreground border-border' };
    return (<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${m.className}`}>
      {m.label}
    </span>);
}
type ContainerDraftValues = {
    name?: string;
    code_name?: string;
    container_type?: string;
    grid_cols?: number;
    grid_rows?: number;
    is_portable?: boolean;
    instanced_per_item?: boolean;
    linked_item_definition_id?: string;
    linked_item_definition_name?: string;
    linked_item_definition_code?: string;
    metadata?: Record<string, unknown>;
};
function normalizeContainerDraftValues(draft: Record<string, unknown> | null | undefined): ContainerDraftValues | undefined {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft))
        return undefined;
    const record = draft as Record<string, unknown>;
    const metadata = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? record.metadata as Record<string, unknown>
        : undefined;
    return {
        name: typeof record.name === 'string' ? record.name : undefined,
        code_name: typeof record.code_name === 'string' ? record.code_name : undefined,
        container_type: typeof record.container_type === 'string' ? record.container_type : undefined,
        grid_cols: typeof record.grid_cols === 'number' ? record.grid_cols : undefined,
        grid_rows: typeof record.grid_rows === 'number' ? record.grid_rows : undefined,
        is_portable: typeof record.is_portable === 'boolean' ? record.is_portable : undefined,
        instanced_per_item: typeof record.instanced_per_item === 'boolean' ? record.instanced_per_item : undefined,
        linked_item_definition_id: typeof record.linked_item_definition_id === 'string' ? record.linked_item_definition_id : undefined,
        linked_item_definition_name: typeof record.linked_item_definition_name === 'string' ? record.linked_item_definition_name : undefined,
        linked_item_definition_code: typeof record.linked_item_definition_code === 'string' ? record.linked_item_definition_code : undefined,
        metadata,
    };
}
function CreateContainerDefinitionDialog({ open, gameId, allItems, containerTypeOptions, initialValues, onCreated, onClose, }: {
    open: boolean;
    gameId: string;
    allItems: ItemDefinition[];
    containerTypeOptions: ContainerTypeOption[];
    initialValues?: {
        name?: string;
        code_name?: string;
        container_type?: string;
        grid_cols?: number;
        grid_rows?: number;
        is_portable?: boolean;
        linked_item_definition_id?: string;
        linked_item_definition_name?: string;
        linked_item_definition_code?: string;
        metadata?: Record<string, unknown>;
    };
    onCreated: (id: string) => void;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    useEscapeLayer(open, onClose);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [codeName, setCodeName] = useState("");
    const [containerType, setContainerType] = useState<ContainerType>("chest");
    const [gridCols, setGridCols] = useState("9");
    const [gridRows, setGridRows] = useState("3");
    const [isPortable, setIsPortable] = useState(false);
    const [linkedItemId, setLinkedItemId] = useState("");
    const [linkedItemNameFallback, setLinkedItemNameFallback] = useState("");
    const [linkedItemCodeFallback, setLinkedItemCodeFallback] = useState("");
    const [linkedItemOpen, setLinkedItemOpen] = useState(false);
    const [linkedItemSearch, setLinkedItemSearch] = useState("");
    const [meta, setMeta] = useState<KVEntry[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        if (open && initialValues) {
            setLinkedItemNameFallback("");
            setLinkedItemCodeFallback("");
            if (initialValues.name)
                setName(initialValues.name);
            if (initialValues.code_name)
                setCodeName(initialValues.code_name);
            else if (initialValues.name)
                setCodeName(toSafeCodeName(initialValues.name));
            if (initialValues.container_type)
                setContainerType(initialValues.container_type as ContainerType);
            if (initialValues.grid_cols)
                setGridCols(String(initialValues.grid_cols));
            if (initialValues.grid_rows)
                setGridRows(String(initialValues.grid_rows));
            if (initialValues.is_portable !== undefined)
                setIsPortable(initialValues.is_portable);
            if (initialValues.linked_item_definition_id) {
                const raw = initialValues.linked_item_definition_id;
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
                if (isUuid) {
                    setLinkedItemId(raw);
                }
                else {
                    const match = allItems.find(item => item.item_code.toLowerCase() === raw.toLowerCase());
                    if (match)
                        setLinkedItemId(match.id);
                }
            }
            if (initialValues.linked_item_definition_name)
                setLinkedItemNameFallback(initialValues.linked_item_definition_name);
            if (initialValues.linked_item_definition_code)
                setLinkedItemCodeFallback(initialValues.linked_item_definition_code);
            setMeta(Object.entries(initialValues.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
        }
    }, [open, initialValues, allItems]);
    function resetForm() {
        setName("");
        setCodeName("");
        setContainerType("chest");
        setGridCols("9");
        setGridRows("3");
        setIsPortable(false);
        setLinkedItemId("");
        setLinkedItemNameFallback("");
        setLinkedItemCodeFallback("");
        setMeta([]);
        setErrors({});
    }
    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 2)
            e.name = t('items.nameMustBe2Chars');
        if (!codeName.trim())
            e.codeName = t('items.codeNameRequired');
        else if (!/^[a-z][a-z0-9_]{0,63}$/.test(codeName.trim()))
            e.codeName = t('items.codeNameInvalid');
        const cols = Number(gridCols);
        const rows = Number(gridRows);
        if (!cols || cols < 1 || cols > 54)
            e.gridCols = t('items.colsMustBe');
        if (!rows || rows < 1 || rows > 54)
            e.gridRows = t('items.rowsMustBe');
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    const selectedLinkedItem = allItems.find((i) => i.id === linkedItemId);
    const linkedItemDisplayName = selectedLinkedItem?.name ?? linkedItemNameFallback;
    const linkedItemDisplayCode = selectedLinkedItem?.item_code ?? linkedItemCodeFallback;
    async function handleSubmit() {
        if (!validate())
            return;
        setLoading(true);
        try {
            const metadata: Record<string, unknown> = {};
            meta.forEach(({ key, value }) => {
                if (key.trim())
                    metadata[key.trim()] = value;
            });
            const body: CreateContainerDefinitionRequest = {
                name: name.trim(),
                code_name: codeName.trim(),
                container_type: containerType,
                grid_cols: Number(gridCols),
                grid_rows: Number(gridRows),
                is_portable: isPortable,
                ...(linkedItemId ? { linked_item_definition_id: linkedItemId } : {}),
                metadata,
            };
            const res = await createContainerDefinition({ gameId }, body);
            toast({ title: t('items.containerCreated'), description: `"${name.trim()}" added.` });
            resetForm();
            onCreated(res.container_definition.id);
            onClose();
        }
        catch (err: any) {
            if (err?.status === 403) {
                toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionCreateContainer') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToCreate'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(v) => {
            if (!v) {
                resetForm();
                onClose();
            }
        }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col" onInteractOutside={(e) => e.preventDefault()} onFocusOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t('items.newContainerDefinition')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="cd-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="cd-name" placeholder="e.g. Standard Chest" value={name} onChange={(e) => {
            const next = e.target.value;
            setName(next);
            if (!codeName.trim())
                setCodeName(toSafeCodeName(next));
        }}/>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
        <div className="space-y-1">
          <Label htmlFor="cd-code-name">{t('items.codeName')} <span className="text-destructive">*</span></Label>
          <Input id="cd-code-name" placeholder={t('items.codeNamePlaceholder')} value={codeName} onChange={(e) => setCodeName(e.target.value)}/>
          <p className="text-xs text-muted-foreground">{t('items.codeNameHint')}</p>
          {errors.codeName && <p className="text-xs text-destructive">{errors.codeName}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('items.containerType')} <span className="text-destructive">*</span></Label>
              <Select value={containerType} onValueChange={(v) => setContainerType(v as ContainerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {containerTypeOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>
                      {CONTAINER_TYPE_META[opt.value]?.label ?? opt.value}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch id="cd-portable" checked={isPortable} onCheckedChange={setIsPortable}/>
              <Label htmlFor="cd-portable">{t('items.portable')}</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cd-cols">{t('items.gridColumns')} <span className="text-destructive">*</span></Label>
              <Input id="cd-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)}/>
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="cd-rows">{t('items.gridRows')} <span className="text-destructive">*</span></Label>
              <Input id="cd-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)}/>
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('items.linkedItemDefinition')}</Label>
            <div className="flex items-center gap-1">
              <Popover open={linkedItemOpen} onOpenChange={setLinkedItemOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={linkedItemOpen} className="w-full justify-between font-normal">
                    {linkedItemId ? (<span className="truncate">
                        {linkedItemDisplayName ?? linkedItemId.slice(0, 8) + "?"}
                        {linkedItemDisplayCode && (<span className="ml-1 text-xs text-muted-foreground font-mono">
                            ({linkedItemDisplayCode})
                          </span>)}
                      </span>) : (<span className="text-muted-foreground">{t('items.noLinkedItem')}</span>)}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder={t('items.searchByNameOrCode')} value={linkedItemSearch} onValueChange={setLinkedItemSearch}/>
                    <CommandList>
                      <CommandEmpty>{t('items.noItemFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__none__" onSelect={() => {
            setLinkedItemId("");
            setLinkedItemOpen(false);
            setLinkedItemSearch("");
        }}>
                          <Check className={`mr-2 h-4 w-4 shrink-0 ${!linkedItemId ? "opacity-100" : "opacity-0"}`}/>
                          <span className="text-muted-foreground">{t('items.noLinkedItemOption')}</span>
                        </CommandItem>
                        {allItems
            .filter((d) => !linkedItemSearch ||
            d.name.toLowerCase().includes(linkedItemSearch.toLowerCase()) ||
            (d.item_code ?? "").toLowerCase().includes(linkedItemSearch.toLowerCase()))
            .slice(0, 50)
            .map((d) => (<CommandItem key={d.id} value={d.id} onSelect={() => {
                setLinkedItemId(d.id);
                setLinkedItemOpen(false);
                setLinkedItemSearch("");
            }}>
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${linkedItemId === d.id ? "opacity-100" : "opacity-0"}`}/>
                              <span className="flex-1 truncate">{d.name}</span>
                              {d.item_code && (<span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>)}
                            </CommandItem>))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {linkedItemId && (<Link href={`/games/${gameId}/items/${linkedItemId}`} target="_blank" title={t('items.goToItemDef')}>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" type="button">
                    <ExternalLink className="h-4 w-4"/>
                  </Button>
                </Link>)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('items.containerLinkDescPre')}<code className="bg-muted px-1 rounded">ensure-container</code>{t('items.containerLinkDescPost')}
            </p>
          </div>
          <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataWithExample')}/>
        </div>
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={() => { resetForm(); onClose(); }}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('items.creating') : t('common.save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
function EditContainerDefinitionDialog({ open, gameId, definition, initialValues, allItems, onUpdated, onClose, }: {
    open: boolean;
    gameId: string;
    definition: ContainerDefinition;
    initialValues?: ContainerDraftValues;
    allItems: ItemDefinition[];
    onUpdated: (updated: ContainerDefinition) => void;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    useEscapeLayer(open, onClose);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(initialValues?.name ?? definition.name);
    const [codeName, setCodeName] = useState(initialValues?.code_name ?? definition.code_name ?? "");
    const [gridCols, setGridCols] = useState(String(initialValues?.grid_cols ?? definition.grid_cols));
    const [gridRows, setGridRows] = useState(String(initialValues?.grid_rows ?? definition.grid_rows));
    const [linkedItemId, setLinkedItemId] = useState(initialValues?.linked_item_definition_id ?? definition.linked_item_definition_id ?? "");
    const [linkedItemOpen, setLinkedItemOpen] = useState(false);
    const [linkedItemSearch, setLinkedItemSearch] = useState("");
    const [instancedPerItem, setInstancedPerItem] = useState(initialValues?.instanced_per_item ?? initialValues?.is_portable ?? definition.instanced_per_item ?? false);
    const [meta, setMeta] = useState<KVEntry[]>(Object.entries(initialValues?.metadata ?? definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        setName(initialValues?.name ?? definition.name);
        setCodeName(initialValues?.code_name ?? definition.code_name ?? "");
        setGridCols(String(initialValues?.grid_cols ?? definition.grid_cols));
        setGridRows(String(initialValues?.grid_rows ?? definition.grid_rows));
        setLinkedItemId(initialValues?.linked_item_definition_id ?? definition.linked_item_definition_id ?? "");
        setLinkedItemSearch("");
        setInstancedPerItem(initialValues?.instanced_per_item ?? initialValues?.is_portable ?? definition.instanced_per_item ?? false);
        setMeta(Object.entries(initialValues?.metadata ?? definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
        setErrors({});
    }, [definition, initialValues]);
    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 2)
            e.name = t('items.nameMustBe2Chars');
        if (!codeName.trim())
            e.codeName = t('items.codeNameRequired');
        else if (!/^[a-z][a-z0-9_]{0,63}$/.test(codeName.trim()))
            e.codeName = t('items.codeNameInvalid');
        const cols = Number(gridCols);
        const rows = Number(gridRows);
        if (!cols || cols < 1 || cols > 54)
            e.gridCols = t('items.colsMustBe');
        if (!rows || rows < 1 || rows > 54)
            e.gridRows = t('items.rowsMustBe');
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    async function handleSubmit() {
        if (!validate())
            return;
        setLoading(true);
        try {
            const metadata: Record<string, unknown> = {};
            meta.forEach(({ key, value }) => {
                if (key.trim())
                    metadata[key.trim()] = value;
            });
            const origLinked = definition.linked_item_definition_id ?? "";
            const body: UpdateContainerDefinitionRequest = {
                name: name.trim(),
                code_name: codeName.trim(),
                grid_cols: Number(gridCols),
                grid_rows: Number(gridRows),
                instanced_per_item: instancedPerItem,
                metadata,
            };
            // Only send linked_item_definition_id if it changed
            if (linkedItemId !== origLinked) {
                // "" means unlink, UUID means set new link
                body.linked_item_definition_id = linkedItemId;
            }
            const { container_definition: updated } = await updateContainerDefinition({ gameId }, definition.id, body);
            toast({ title: t('items.containerUpdated') });
            onUpdated(updated);
            onClose();
        }
        catch (err: any) {
            if (err?.status === 409) {
                toast({ variant: "destructive", title: t('items.cannotShrinkGrid'), description: t('items.itemsOutOfBounds') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToUpdate'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(v) => {
            if (!v)
                onClose();
        }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.editContainerDefinition')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <ContainerTypeBadge type={definition.container_type}/>
            <span>{definition.is_portable ? t('items.portable') : t('items.fixed')}</span>
            <span className="text-xs">{t('items.immutable')}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ed-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="ed-name" value={name} onChange={(e) => {
            const next = e.target.value;
            setName(next);
            if (!codeName.trim())
                setCodeName(toSafeCodeName(next));
        }}/>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ed-code-name">{t('items.codeName')} <span className="text-destructive">*</span></Label>
            <Input id="ed-code-name" value={codeName} readOnly/>
            <p className="text-xs text-muted-foreground">{t('items.codeNameHint')}</p>
            {errors.codeName && <p className="text-xs text-destructive">{errors.codeName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ed-cols">{t('items.gridColumns')}</Label>
              <Input id="ed-cols" type="number" min={1} max={54} value={gridCols} onChange={(e) => setGridCols(e.target.value)}/>
              {errors.gridCols && <p className="text-xs text-destructive">{errors.gridCols}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ed-rows">{t('items.gridRows')}</Label>
              <Input id="ed-rows" type="number" min={1} max={54} value={gridRows} onChange={(e) => setGridRows(e.target.value)}/>
              {errors.gridRows && <p className="text-xs text-destructive">{errors.gridRows}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('items.linkedItemDefinition')}</Label>
            <div className="flex items-center gap-1">
              <Popover open={linkedItemOpen} onOpenChange={setLinkedItemOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={linkedItemOpen} className="w-full justify-between font-normal">
                    {linkedItemId ? (<span className="truncate">
                        {allItems.find((i) => i.id === linkedItemId)?.name ?? linkedItemId.slice(0, 8) + "?"}
                        {allItems.find((i) => i.id === linkedItemId)?.item_code && (<span className="ml-1 text-xs text-muted-foreground font-mono">
                            ({allItems.find((i) => i.id === linkedItemId)!.item_code})
                          </span>)}
                      </span>) : (<span className="text-muted-foreground">{t('items.noLinkedItem')}</span>)}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder={t('items.searchByNameOrCode')} value={linkedItemSearch} onValueChange={setLinkedItemSearch}/>
                    <CommandList>
                      <CommandEmpty>{t('items.noItemFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="__none__" onSelect={() => {
            setLinkedItemId("");
            setLinkedItemOpen(false);
            setLinkedItemSearch("");
        }}>
                          <Check className={`mr-2 h-4 w-4 shrink-0 ${!linkedItemId ? "opacity-100" : "opacity-0"}`}/>
                          <span className="text-muted-foreground">{t('items.noLinkedItemOption')}</span>
                        </CommandItem>
                        {allItems
            .filter((d) => !linkedItemSearch ||
            d.name.toLowerCase().includes(linkedItemSearch.toLowerCase()) ||
            (d.item_code ?? "").toLowerCase().includes(linkedItemSearch.toLowerCase()))
            .slice(0, 50)
            .map((d) => (<CommandItem key={d.id} value={d.id} onSelect={() => {
                setLinkedItemId(d.id);
                setLinkedItemOpen(false);
                setLinkedItemSearch("");
            }}>
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${linkedItemId === d.id ? "opacity-100" : "opacity-0"}`}/>
                              <span className="flex-1 truncate">{d.name}</span>
                              {d.item_code && (<span className="ml-2 text-xs text-muted-foreground font-mono">{d.item_code}</span>)}
                            </CommandItem>))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {linkedItemId && (<Link href={`/games/${gameId}/items/${linkedItemId}`} target="_blank" title={t('items.goToItemDef')}>
                  <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" type="button">
                    <ExternalLink className="h-4 w-4"/>
                  </Button>
                </Link>)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('items.containerLinkDescPre')}<code className="bg-muted px-1 rounded">ensure-container</code>{t('items.containerLinkDescPost')}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ed-instanced-per-item">{t('items.instancedPerItem')}</Label>
              <p className="text-xs text-muted-foreground">{t('items.instancedPerItemDesc')}</p>
            </div>
            <Switch id="ed-instanced-per-item" checked={instancedPerItem} onCheckedChange={setInstancedPerItem}/>
          </div>
          <KVEditor entries={meta} onChange={setMeta} label={t('items.metadata')}/>
        </div>
        <SheetFooter className="pt-4">
          <Button variant="outline" disabled={loading} onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('items.saving') : t('items.saveChanges')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Tags Tab ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function TagsTab({ gameId, tags, setTags, loading, setLoading, error, setError, activeTab, }: {
    gameId: string;
    tags: ItemTag[];
    setTags: (v: ItemTag[]) => void;
    loading: boolean;
    setLoading: (v: boolean) => void;
    error: string | null;
    setError: (v: string | null) => void;
    activeTab: string;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<ItemTag | null>(null);
    const [deletingTag, setDeletingTag] = useState<ItemTag | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{
        tag_key: string;
        label: string;
        color: string;
        metadata: string;
    }>({
        tag_key: "", label: "", color: "#A855F7", metadata: "{}",
    });
    const [autoSlug, setAutoSlug] = useState(true);
    const [formErr, setFormErr] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const fetchTags = useCallback(() => {
        if (!gameId)
            return;
        setLoading(true);
        setError(null);
        listItemTags({ gameId }, { limit: 100, offset: 0 })
            .then((res) => setTags(res.tags ?? []))
            .catch((e) => setError(e?.message ?? "Failed to load item tags"))
            .finally(() => setLoading(false));
    }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (activeTab !== "tags" || !gameId)
            return;
        if (tags.length > 0 || loading)
            return;
        fetchTags();
    }, [activeTab, gameId]); // eslint-disable-line react-hooks/exhaustive-deps
    function openCreate() {
        setEditingTag(null);
        setForm({ tag_key: "", label: "", color: "#A855F7", metadata: "{}" });
        setAutoSlug(true);
        setFormErr(null);
        setSheetOpen(true);
    }
    function openEdit(tag: ItemTag, e: React.MouseEvent) {
        e.stopPropagation();
        setEditingTag(tag);
        setForm({
            tag_key: tag.tag_key,
            label: tag.label,
            color: tag.color ?? "#A855F7",
            metadata: tag.metadata ? JSON.stringify(tag.metadata, null, 2) : "{}",
        });
        setAutoSlug(false);
        setFormErr(null);
        setSheetOpen(true);
    }
    const TAG_KEY_RE = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$|^[a-z0-9]{1}$/;
    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setFormErr(null);
        if (!editingTag) {
            const key = form.tag_key;
            if (form.label.trim().length > 20) {
                setFormErr(t('items.tagLabelTooLong'));
                return;
            }
            if (key.length < 2) {
                setFormErr(t('items.tagKeyTooShort'));
                return;
            }
            if (key.length > 20) {
                setFormErr(t('items.tagKeyTooLong'));
                return;
            }
            if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(key)) {
                setFormErr(t('items.tagKeyInvalid'));
                return;
            }
            if (tags.length >= 50) {
                setFormErr(t('items.tagMaxReached'));
                return;
            }
        }
        let parsedMeta: Record<string, unknown> = {};
        try {
            parsedMeta = JSON.parse(form.metadata || "{}");
        }
        catch {
            setFormErr("Metadata must be valid JSON");
            return;
        }
        setSaving(true);
        try {
            if (editingTag) {
                const updated = await updateItemTag({ gameId }, editingTag.id, {
                    label: form.label,
                    color: form.color,
                    metadata: parsedMeta,
                });
                setTags(tags.map((tag) => (tag.id === updated.id ? updated : tag)));
                toast({ title: t('items.tagUpdated') });
            }
            else {
                const created = await createItemTag({ gameId }, {
                    tag_key: form.tag_key,
                    label: form.label,
                    color: form.color,
                    metadata: parsedMeta,
                });
                setTags([...tags, created]);
                toast({ title: t('items.tagCreated') });
            }
            setSheetOpen(false);
        }
        catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save tag";
            setFormErr(msg);
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDelete() {
        if (!deletingTag)
            return;
        setDeleteLoading(true);
        try {
            await deleteItemTag({ gameId }, deletingTag.id);
            setTags(tags.filter((tag) => tag.id !== deletingTag.id));
            toast({ title: t('items.tagDeleted') });
            setDeletingTag(null);
        }
        catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('items.failedToDelete');
            toast({ title: t('common.error'), description: msg, variant: "destructive" });
        }
        finally {
            setDeleteLoading(false);
        }
    }
    const filtered = search
        ? tags.filter((tag) => tag.tag_key.toLowerCase().includes(search.toLowerCase()) ||
            tag.label.toLowerCase().includes(search.toLowerCase()))
        : tags;
    return (<div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{t('items.itemTagsTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {tags.length > 0
            ? <><span className={tags.length >= 50 ? "text-destructive font-medium" : ""}>{tags.length}</span><span className="text-muted-foreground">/50 {t('items.tagsLabel')} ? {t('items.tagLimitFixed')}</span></>
            : t('items.noTagsYet')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
            <input type="text" placeholder={t('items.searchTagsPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"/>
            {search && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5"/>
              </button>)}
          </div>
          <Button variant="outline" size="sm" onClick={fetchTags} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" onClick={openCreate} disabled={tags.length >= 50}>
            <Tag className="h-3.5 w-3.5 mr-1"/> {t('items.newTag')}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (<div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>)}

      {/* Loading skeleton */}
      {loading && (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-24 rounded-lg"/>))}
        </div>)}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (<div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Tag className="h-10 w-10 text-muted-foreground/40"/>
          <p className="text-sm text-muted-foreground">
            {search ? t('items.noTagsMatchSearch') : t('items.noTagsCreate')}
          </p>
          {!search && (<Button size="sm" onClick={openCreate}>
              <Tag className="h-3.5 w-3.5 mr-1"/> {t('items.newTag')}
            </Button>)}
        </div>)}

      {/* Tags grid */}
      {!loading && filtered.length > 0 && (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((tag) => (<Card key={tag.id} className="relative group">
              {/* actions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â top right */}
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(tag, e)} title={t('common.edit')}>
                  <Pencil className="h-3.5 w-3.5"/>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingTag(tag); }} title={t('common.delete')}>
                  <Trash2 className="h-3.5 w-3.5"/>
                </Button>
              </div>
              <CardContent className="pt-4 pb-4 px-4 space-y-2">
                {/* Color swatch + label */}
                <div className="flex items-center gap-2 pr-16">
                  <span className="inline-block h-4 w-4 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: tag.color }}/>
                  <span className="font-semibold text-sm truncate">{tag.label}</span>
                </div>
                {/* tag_key */}
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                    {tag.tag_key}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{tag.item_count} {t('items.itemsUnit')}</span>
                </div>
                {/* metadata preview */}
                {tag.metadata && Object.keys(tag.metadata).length > 0 && (<p className="text-xs text-muted-foreground font-mono truncate">
                    {JSON.stringify(tag.metadata)}
                  </p>)}
              </CardContent>
            </Card>))}
        </div>)}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTag ? t('items.editTag') : t('items.createTag')}</SheetTitle>
            <SheetDescription>
              {editingTag ? `${t('items.editTagDesc')} "${editingTag.label}"` : t('items.createTagDesc')}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            {/* Tag Key Rules info */}
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2.5 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground flex items-center gap-1.5"><Tag className="h-3 w-3"/> {t('items.tagKeyRules')}</p>
              <ul className="space-y-0.5 pl-1">
                <li>Format: <code className="font-mono bg-muted rounded px-1">^[a-z0-9][a-z0-9\-]*[a-z0-9]$</code></li>
                <li>{t('items.tagRuleLower')}</li>
                <li>{t('items.tagRuleStart')}</li>
                <li>{t('items.tagRuleLength')}</li>
                <li><span className="text-amber-500 font-medium">{t('items.tagImmutableNote')}</span></li>
                <li>{t('items.tagRuleMax')}</li>
              </ul>
            </div>
            {!editingTag && (<>
                <div className="space-y-1.5">
                  <Label htmlFor="label">{t('items.label')} <span className="text-destructive">*</span></Label>
                  <Input id="label" placeholder="e.g. Rare" value={form.label} maxLength={20} onChange={(e) => {
                const label = e.target.value;
                setForm((f) => ({
                    ...f,
                    label,
                    ...(autoSlug ? { tag_key: toSlug(label).slice(0, 20) } : {}),
                }));
            }} required/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag_key">{t('items.tagKey')} <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <Input id="tag_key" placeholder="e.g. rare-starter" value={form.tag_key} maxLength={20} onChange={(e) => {
                setAutoSlug(false);
                setForm((f) => ({ ...f, tag_key: toSlug(e.target.value) }));
            }} required className="font-mono"/>
                    <Button type="button" size="icon" variant={autoSlug ? "default" : "outline"} className="h-9 w-9 shrink-0" title={autoSlug ? t('items.tagAutoSlugOn') : t('items.tagAutoSlugOff')} onClick={() => setAutoSlug((v) => !v)}>
                      <Wand2 className="h-4 w-4"/>
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{autoSlug ? <span className="text-primary">{t('items.tagAutoGenerating')}</span> : <span>{t('items.tagAutoLowercaseOnly')}</span>}</span>
                    <span className={form.tag_key.length > 18 ? "text-amber-500" : ""}>{form.tag_key.length}/20</span>
                  </div>
                </div>
              </>)}
            {editingTag && (<>
                <div className="space-y-1.5">
                  <Label htmlFor="label">{t('items.label')} <span className="text-destructive">*</span></Label>
                  <Input id="label" placeholder="e.g. Rare" value={form.label} maxLength={20} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required/>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('items.tagKey')}</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">{editingTag.tag_key}</code>
                    <span className="text-[11px] text-amber-500 font-medium whitespace-nowrap">{t('items.tagImmutable')}</span>
                  </div>
                </div>
              </>)}
            <div className="space-y-1.5">
              <Label htmlFor="color">{t('items.color')}</Label>
              <div className="flex items-center gap-2">
                <input id="color" type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded-md border border-input p-1"/>
                <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="#A855F7" className="font-mono"/>
              </div>
            </div>
            {formErr && (<p className="text-sm text-destructive">{formErr}</p>)}
            <SheetFooter className="gap-2 flex-wrap">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>}
                {editingTag ? t('items.saveChanges') : t('items.createTag')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                {t('common.cancel')}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTag} onOpenChange={(open) => {
            if (!open)
                setDeletingTag(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deleteTag')} "{deletingTag?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deleteTagDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Generator Tab ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function GeneratorTab({ studioId, gameId, generatorItems, setGeneratorItems, generatorLoading, setGeneratorLoading, generatorError, setGeneratorError, activeTab, refreshKey, onAddGenerator, }: {
    studioId: string;
    gameId: string;
    generatorItems: ItemDefinition[];
    setGeneratorItems: (items: ItemDefinition[]) => void;
    generatorLoading: boolean;
    setGeneratorLoading: (v: boolean) => void;
    generatorError: string | null;
    setGeneratorError: (v: string | null) => void;
    activeTab: string;
    refreshKey: number;
    onAddGenerator: () => void;
}) {
    const { t } = useTranslation();
    const [poolNames, setPoolNames] = useState<Record<string, string>>({});
    // Fetch generators
    const fetchGenerators = useCallback(() => {
        if (!gameId)
            return;
        setGeneratorLoading(true);
        setGeneratorError(null);
        setPoolNames({});
        listItemDefinitions({ studioId, gameId }, { category: "generator", limit: 500 })
            .then((res) => {
            setGeneratorItems(res.items ?? []);
            const ids = new Set<string>();
            (res.items ?? []).forEach((item) => {
                const gc = item.metadata?.generator_config as Record<string, unknown> | undefined;
                if (!gc)
                    return;
                const pool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : [];
                pool.forEach((e) => {
                    const id = String(e.item_definition_id ?? "");
                    if (id)
                        ids.add(id);
                });
            });
            ids.forEach((id) => {
                getItemDefinition({ studioId, gameId }, id)
                    .then((r) => setPoolNames((prev) => ({ ...prev, [id]: r.item?.name ?? id })))
                    .catch(() => { });
            });
        })
            .catch((e) => setGeneratorError(e?.message ?? t('items.failedLoadGenerators')))
            .finally(() => setGeneratorLoading(false));
    }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
    // Fetch on first activation
    useEffect(() => {
        if (activeTab !== "generators" || !gameId)
            return;
        if (generatorItems.length > 0 || generatorLoading)
            return;
        fetchGenerators();
    }, [activeTab, gameId]); // eslint-disable-line react-hooks/exhaustive-deps
    // Refetch when parent bumps the refresh key (e.g. after creating a new generator)
    useEffect(() => {
        if (refreshKey === 0 || !gameId)
            return;
        fetchGenerators();
    }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
    if (generatorLoading) {
        return (<div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
        <span className="ml-2 text-sm text-muted-foreground">{t('items.loadingGenerators')}</span>
      </div>);
    }
    if (generatorError) {
        return (<div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1"/>
            {t('items.addGenerator')}
          </Button>
        </div>
        <div className="text-center py-12 text-sm text-destructive">{generatorError}</div>
      </div>);
    }
    if (generatorItems.length === 0) {
        return (<div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1"/>
            {t('items.addGenerator')}
          </Button>
        </div>
        <div className="text-center py-12 text-sm text-muted-foreground">
          {t('items.noGeneratorItems')}
        </div>
      </div>);
    }
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('items.generatorsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{generatorItems.length} {t('items.generatorsDefined')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGenerators} disabled={generatorLoading} title={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${generatorLoading ? "animate-spin" : ""}`}/>
          </Button>
          <Button size="sm" className="h-8" onClick={onAddGenerator}>
            <Plus className="h-4 w-4 mr-1"/>
            {t('items.addGenerator')}
          </Button>
        </div>
      </div>

      {/* Concept explanation */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p><span className="font-semibold text-foreground">{t('items.generatorIntervalShort')}</span> {t('items.generatorIntervalDescPre')} <code className="bg-muted px-1 rounded">interval</code> {t('items.generatorIntervalDescPost')}</p>
        <p><span className="font-semibold text-foreground">{t('items.tickCapacity')}</span> {t('items.generatorTickCapDescPre')} <code className="bg-muted px-1 rounded">interval ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tick_cap</code> {t('items.generatorTickCapDescPost')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {generatorItems.map((item) => {
            const gc = (item.metadata?.generator_config ?? {}) as Record<string, unknown>;
            const interval = Number(gc.production_interval_seconds) || 0;
            const ticks = Number(gc.tick_capacity) || 0;
            const maxSeconds = interval * ticks;
            const hours = Math.floor(maxSeconds / 3600);
            const mins = Math.floor((maxSeconds % 3600) / 60);
            const timeStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
            const outputPool = Array.isArray(gc.output_pool) ? gc.output_pool as Array<Record<string, unknown>> : [];
            return (<Card key={item.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold truncate">{item.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0">{item.rarity}</Badge>
                </div>
                {item.item_code && (<p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    {item.item_code} <CopyButton text={item.item_code}/>
                  </p>)}
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-xs">
                {/* Timing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t('items.generatorIntervalShort')}</p>
                    <p className="font-semibold text-sm">{interval}s</p>
                  </div>
                  <div className="rounded-md border px-3 py-2 text-center">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">{t('items.generatorTickCap')}</p>
                    <p className="font-semibold text-sm">{ticks}</p>
                  </div>
                </div>

                {/* Offline hint */}
                {interval > 0 && ticks > 0 && (<div className="rounded-md bg-muted/50 border border-dashed px-3 py-1.5 text-[11px] text-muted-foreground">
                    ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â± {t('items.maxOffline')}: <span className="font-semibold text-foreground">{timeStr}</span>
                    <span className="mx-1">ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·</span>
                    <span className="font-mono">{interval}s ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {ticks}</span> = {maxSeconds.toLocaleString()}s
                  </div>)}

                {/* Output Pool */}
                {outputPool.length > 0 && (<div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground font-medium">{t('items.outputPoolCount')} ({outputPool.length})</p>
                    <div className="space-y-1">
                      {outputPool.map((entry, idx) => {
                        const defId = String(entry.item_definition_id ?? "");
                        const name = poolNames[defId];
                        const dropPct = entry.drop_rate != null ? `${(Number(entry.drop_rate) * 100).toFixed(1)}%` : "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â";
                        return (<div key={idx} className="flex items-center gap-2 rounded border px-2.5 py-2 bg-background">
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <Link href={`/games/${gameId}/items/${defId}`} className="inline-flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors" title={defId}>
                                <span className="truncate max-w-[160px]">{name || defId.slice(0, 16) + "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦"}</span>
                                <ExternalLink className="h-3 w-3 shrink-0"/>
                              </Link>
                              {defId && <CopyButton text={defId}/>}
                            </div>
                            <span className="text-muted-foreground shrink-0">{dropPct}</span>
                            <span className="text-muted-foreground shrink-0 font-mono text-[10px]">{String(entry.quantity_min ?? 1)}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ{String(entry.quantity_max ?? 1)}</span>
                          </div>);
                    })}
                    </div>
                  </div>)}
              </CardContent>
              <div className="px-6 pb-4 flex justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title={t('common.edit')}>
                  <Link href={`/games/${gameId}/items/${item.id}`}>
                    <Pencil className="h-3.5 w-3.5"/>
                  </Link>
                </Button>
              </div>
            </Card>);
        })}
      </div>
    </div>);
}
export default function GameItemsPage() {
    const params = useParams() as {
        id: string;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { t } = useTranslation();
    const gameId = params.id;
    const [gameName, setGameName] = useState("");
    const [studioId, setStudioId] = useState("");
    const [maxItems, setMaxItems] = useState<number | null>(null);
    const [itemUsage, setItemUsage] = useState<number | null>(null);
    const [maxEquipmentSlots, setMaxEquipmentSlots] = useState<number | null>(null);
    const [equipmentSlotsUsage, setEquipmentSlotsUsage] = useState<number | null>(null);
    const [items, setItems] = useState<ItemDefinition[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [copiedPackId, setCopiedPackId] = useState(false);
    // filters
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterRarity, setFilterRarity] = useState<string>("all");
    const [searchName, setSearchName] = useState("");
    const [debouncedName, setDebouncedName] = useState("");
    const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
    const [tagFilterOpen, setTagFilterOpen] = useState(false);
    const [filterAllowClientUpdateQty, setFilterAllowClientUpdateQty] = useState<string>("all");
    // pagination
    const LIMIT = 50;
    const [offset, setOffset] = useState(0);
    // modal
    const [showCreate, setShowCreate] = useState(false);
    const [createInitCategory, setCreateInitCategory] = useState<ItemCategory | undefined>(undefined);
    const [categories, setCategories] = useState<ItemCategory[]>([]);
    const [rarities, setRarities] = useState<ItemRarity[]>([]);
    // tab state management
    const [activeTab, setActiveTab] = useState<string>("catalogue");
    // containers tab state
    const CONTAINER_LIMIT = 50;
    const [containerDefs, setContainerDefs] = useState<ContainerDefinition[]>([]);
    const [containerTotal, setContainerTotal] = useState(0);
    const [containerLoading, setContainerLoading] = useState(false);
    const [containerError, setContainerError] = useState<string | null>(null);
    const [containerOffset, setContainerOffset] = useState(0);
    const [showCreateContainer, setShowCreateContainer] = useState(false);
    const [createContainerInitialValues, setCreateContainerInitialValues] = useState<{
        name?: string;
        code_name?: string;
        container_type?: string;
        grid_cols?: number;
        grid_rows?: number;
        is_portable?: boolean;
        linked_item_definition_id?: string;
        linked_item_definition_name?: string;
        linked_item_definition_code?: string;
        metadata?: Record<string, unknown>;
    } | undefined>(undefined);
    const [createContainerConvContext, setCreateContainerConvContext] = useState<{
        turnId: string;
        responseIdx: number;
        containerIdx: number;
    } | undefined>(undefined);
    const [editingContainer, setEditingContainer] = useState<ContainerDefinition | null>(null);
    const [editingContainerDraft, setEditingContainerDraft] = useState<ContainerDraftValues | undefined>(undefined);
    const [editingContainerConvContext, setEditingContainerConvContext] = useState<{
        turnId: string;
        responseIdx: number;
        containerIdx: number;
    } | undefined>(undefined);
    const [deletingContainer, setDeletingContainer] = useState<ContainerDefinition | null>(null);
    const [deleteContainerLoading, setDeleteContainerLoading] = useState(false);
    const [containerSearch, setContainerSearch] = useState("");
    const [containerSearchDebounced, setContainerSearchDebounced] = useState("");
    const [containerAllItems, setContainerAllItems] = useState<ItemDefinition[]>([]);
    const [containerTypeOptions, setContainerTypeOptions] = useState<ContainerTypeOption[]>([]);
    const [expandedContainerId, setExpandedContainerId] = useState<string | null>(null);
    const [containerDetailCache, setContainerDetailCache] = useState<Record<string, ContainerDefinition>>({});
    const [containerDetailLoading, setContainerDetailLoading] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<{
        id: string;
        field: string;
    } | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [editValue2, setEditValue2] = useState<string>(""); // for dimensions
    const [containerItemsOnly, setContainerItemsOnly] = useState<boolean>(false);
    const [metadataRows, setMetadataRows] = useState<{
        k: string;
        v: string;
    }[]>([]);
    const [containerSubTab, setContainerSubTab] = useState<"definitions" | "slot-guide">("definitions");
    // generator tab state
    const [generatorItems, setGeneratorItems] = useState<ItemDefinition[]>([]);
    const [generatorLoading, setGeneratorLoading] = useState(false);
    const [generatorError, setGeneratorError] = useState<string | null>(null);
    const [generatorRefreshKey, setGeneratorRefreshKey] = useState(0);
    // equipments tab state
    const [equipmentSlots, setEquipmentSlots] = useState<EquipmentSlot[]>([]);
    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentError, setEquipmentError] = useState<string | null>(null);
    // tags tab state
    const [itemTags, setItemTags] = useState<ItemTag[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagsError, setTagsError] = useState<string | null>(null);
    // track which item is being updated
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    // explanation panel state
    const [showExplanationPanel, setShowExplanationPanel] = useState(false);
    const [explanationTopic, setExplanationTopic] = useState<'write_props' | 'update_qty' | null>(null);
    // preset tab state
    const [presetDefs, setPresetDefs] = useState<PresetDefinition[]>([]);
    const [presetLoading, setPresetLoading] = useState(false);
    const [presetError, setPresetError] = useState<string | null>(null);
    const [presetSearch, setPresetSearch] = useState("");
    const [presetSearchDebounced, setPresetSearchDebounced] = useState("");
    const [showCreatePreset, setShowCreatePreset] = useState(false);
    const [createPresetInitialValues, setCreatePresetInitialValues] = useState<{
        name?: string;
        preset_type?: string;
        code_name?: string;
        max_slots?: number;
    } | undefined>(undefined);
    const [createPresetTurnContext, setCreatePresetTurnContext] = useState<{
        turnId: string;
        responseIdx: number;
        presetIdx: number;
        convId: string;
    } | null>(null);
    const [editingPreset, setEditingPreset] = useState<PresetDefinition | null>(null);
    const [deletingPreset, setDeletingPreset] = useState<PresetDefinition | null>(null);
    const [deletePresetLoading, setDeletePresetLoading] = useState(false);
    // gacha tab state
    const [gachaPacks, setGachaPacks] = useState<GachaPack[]>([]);
    const [gachaAllItems, setGachaAllItems] = useState<ItemDefinition[]>([]);
    const [gachaLoading, setGachaLoading] = useState(false);
    const [gachaError, setGachaError] = useState<string | null>(null);
    const [gameLimits, setGameLimits] = useState<GameLimits | null>(null);
    const [expandedPack, setExpandedPack] = useState<string | null>(null);
    const [gachaSheetOpen, setGachaSheetOpen] = useState(false);
    const [editingPack, setEditingPack] = useState<GachaPack | null>(null);
    const [formSaving, setFormSaving] = useState(false);
    const [gachaForm, setGachaForm] = useState(emptyGachaForm());
    const [gachaAutoSlug, setGachaAutoSlug] = useState(true);
    const [createGachaConvContext, setCreateGachaConvContext] = useState<{
        turnId: string;
        responseIdx: number;
        gachaPackIdx: number;
    } | undefined>(undefined);
    const [deletingPack, setDeletingPack] = useState<GachaPack | null>(null);
    const [deletePackLoading, setDeletePackLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [gachaSearch, setGachaSearch] = useState("");
    const [gachaSearchDebounced, setGachaSearchDebounced] = useState("");
    const [gachaComboOpen, setGachaComboOpen] = useState<string | null>(null);
    const [gachaComboSearch, setGachaComboSearch] = useState("");
    const suppressGachaAutoOpenRef = useRef(false);
    useEscapeLayer(gachaSheetOpen, gachaCloseSheet);
    // conversation panel integration
    const [convPanelOpen, setConvPanelOpen] = useState(false);
    const [convActiveId, setConvActiveId] = useState<string | null>(null);
    const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
    const [linkingContainerId, setLinkingContainerId] = useState<string | null>(null);
    const [linkingPresetId, setLinkingPresetId] = useState<string | null>(null);
    useEffect(() => {
        function readPanelState() {
            setConvPanelOpen(safeGetItem('ss_conv_panel_open') === 'true');
            setConvActiveId(safeGetItem(`ss_conv_active_${gameId}`) ?? null);
        }
        readPanelState();
        const handler = () => readPanelState();
        window.addEventListener('storage', handler);
        window.addEventListener('ss:conv-state-changed', handler);
        function handleOpenCreateContainer(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            setCreateContainerInitialValues({
                name: detail.name,
                code_name: detail.code_name ?? (typeof detail.name === 'string' ? toSafeCodeName(detail.name) : undefined),
                container_type: detail.container_type,
                grid_cols: detail.grid_cols,
                grid_rows: detail.grid_rows,
                is_portable: detail.is_portable,
                linked_item_definition_id: detail.linked_item_definition_id,
                linked_item_definition_name: detail.linked_item_definition_name,
                linked_item_definition_code: detail.linked_item_definition_code,
                metadata: detail.metadata,
            });
            if (detail.turnId !== undefined) {
                setCreateContainerConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, containerIdx: detail.containerIdx });
            }
            else {
                setCreateContainerConvContext(undefined);
            }
            setActiveTab('containers');
            setShowCreateContainer(true);
        }
        window.addEventListener('ss:open-create-container', handleOpenCreateContainer);
        async function handleOpenEditContainer(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            const containerId = typeof detail.containerId === 'string' ? detail.containerId : '';
            const providedDefinition = detail.definition && typeof detail.definition === 'object'
                ? detail.definition as ContainerDefinition
                : null;
            const providedDraft = normalizeContainerDraftValues(detail.container ?? detail.initialValues ?? null);
            const context = detail.turnId !== undefined
                ? { turnId: detail.turnId, responseIdx: detail.responseIdx, containerIdx: detail.containerIdx }
                : undefined;
            setActiveTab('containers');
            setShowCreateContainer(false);
            setEditingContainerConvContext(context);
            setEditingContainerDraft(providedDraft);
            setEditingContainer(null);
            const matched = providedDefinition ?? containerDefs.find((def) => def.id === containerId) ?? null;
            if (matched) {
                setEditingContainer(matched);
                return;
            }
            if (!containerId) {
                toast({ title: t('items.failedToLoadContainerDefinition'), variant: 'destructive' });
                return;
            }
            try {
                const res = await getContainerDefinition({ gameId }, containerId);
                setEditingContainer(res.container_definition);
            }
            catch {
                toast({ title: t('items.failedToLoadContainerDefinition'), variant: 'destructive' });
            }
        }
        window.addEventListener('ss:open-edit-container', handleOpenEditContainer);
        async function handleOpenCreateGachaPack(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            const rawPool = Array.isArray(detail.item_pool) && detail.item_pool.length > 0
                ? detail.item_pool.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    weight: String(r.weight ?? 1),
                    quantity_min: String(r.quantity_min ?? 1),
                    quantity_max: String(r.quantity_max ?? 1),
                }))
                : [EMPTY_ROW()];
            const rawKeyReqs = Array.isArray(detail.key_requirements) && detail.key_requirements.length > 0
                ? detail.key_requirements.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    quantity: String(r.quantity ?? 1),
                }))
                : [EMPTY_KEY_ROW()];
            const allRawIds = [
                ...rawPool.map((r: PoolRow) => r.item_definition_id),
                ...rawKeyReqs.map((r: KeyReqRow) => r.item_definition_id),
            ];
            const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
            const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const meta = (detail.metadata ?? {}) as Record<string, unknown>;
            setEditingPack(null);
            setGachaAutoSlug(false);
            setGachaForm({
                name: typeof detail.name === 'string' ? detail.name : '',
                code_name: typeof detail.code_name === 'string' ? detail.code_name : '',
                collect_destination: detail.collect_destination === 'inventory' ? 'inventory' : 'mailbox',
                is_enabled: detail.is_enabled !== false,
                mailbox_title: typeof meta.mailbox_title === 'string' ? meta.mailbox_title : '',
                mailbox_body: typeof meta.mailbox_body === 'string' ? meta.mailbox_body : '',
                pool,
                keyReqs,
            });
            if (detail.turnId !== undefined) {
                setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
            }
            else {
                setCreateGachaConvContext(undefined);
            }
            setActiveTab('gacha');
            setGachaSheetOpen(true);
        }
        window.addEventListener('ss:open-create-gacha-pack', handleOpenCreateGachaPack);
        async function handleOpenEditGachaPack(e: Event) {
            const detail = (e as CustomEvent).detail ?? {};
            const existingPack = detail.existingPack as GachaPack | undefined;
            if (!existingPack)
                return;
            const llmData = (detail.llmData ?? {}) as Record<string, unknown>;
            const rawPool = Array.isArray(llmData.item_pool) && llmData.item_pool.length > 0
                ? llmData.item_pool.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    weight: String(r.weight ?? 1),
                    quantity_min: String(r.quantity_min ?? 1),
                    quantity_max: String(r.quantity_max ?? 1),
                }))
                : existingPack.item_pool.map((r) => ({
                    item_definition_id: r.item_definition_id,
                    weight: String(r.weight),
                    quantity_min: String(r.quantity_min),
                    quantity_max: String(r.quantity_max),
                }));
            const rawKeyReqs = Array.isArray(llmData.key_requirements) && llmData.key_requirements.length > 0
                ? llmData.key_requirements.map((r: GachaLLMRow) => ({
                    item_definition_id: String(r.item_definition_id ?? ''),
                    quantity: String(r.quantity ?? 1),
                }))
                : (existingPack.key_requirements ?? []).map((r) => ({
                    item_definition_id: r.item_definition_id,
                    quantity: String(r.quantity),
                }));
            const allRawIds = [
                ...rawPool.map((r) => r.item_definition_id),
                ...rawKeyReqs.map((r) => r.item_definition_id),
            ];
            const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
            const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
            const existingMeta = (existingPack.metadata ?? {}) as Record<string, unknown>;
            const llmMeta = (llmData.metadata && typeof llmData.metadata === 'object' && !Array.isArray(llmData.metadata))
                ? llmData.metadata as Record<string, unknown>
                : existingMeta;
            setEditingPack(existingPack);
            setGachaAutoSlug(false);
            setGachaForm({
                name: typeof llmData.name === 'string' && llmData.name.trim() ? llmData.name : existingPack.name,
                code_name: existingPack.code_name ?? '',
                collect_destination: llmData.collect_destination === 'inventory' || llmData.collect_destination === 'mailbox'
                    ? llmData.collect_destination
                    : existingPack.collect_destination ?? 'mailbox',
                is_enabled: existingPack.is_enabled,
                mailbox_title: typeof llmMeta.mailbox_title === 'string' ? llmMeta.mailbox_title : '',
                mailbox_body: typeof llmMeta.mailbox_body === 'string' ? llmMeta.mailbox_body : '',
                pool,
                keyReqs,
            });
            if (detail.turnId !== undefined) {
                setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
            }
            const newParams = new URLSearchParams(window.location.search);
            newParams.set('editPack', existingPack.id);
            router.replace(`${window.location.pathname}?${newParams.toString()}`);
            setActiveTab('gacha');
            setGachaSheetOpen(true);
        }
        window.addEventListener('ss:open-edit-gacha-pack', handleOpenEditGachaPack);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('ss:conv-state-changed', handler);
            window.removeEventListener('ss:open-create-container', handleOpenCreateContainer);
            window.removeEventListener('ss:open-edit-container', handleOpenEditContainer);
            window.removeEventListener('ss:open-create-gacha-pack', handleOpenCreateGachaPack);
            window.removeEventListener('ss:open-edit-gacha-pack', handleOpenEditGachaPack);
        };
    }, [gameId, containerDefs, toast, t]);
    // initialize tab from URL params
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "containers" || tab === "catalogue" || tab === "gacha" || tab === "generators" || tab === "equipments" || tab === "tags" || tab === "preset" || tab === "crafting") {
            setActiveTab(tab);
        }
        const cst = searchParams.get("csubtab");
        if (cst === "definitions" || cst === "slot-guide")
            setContainerSubTab(cst);
        // initialize container/gacha search from URL `q` param
        const q = searchParams.get("q");
        if (q && tab === "preset")
            setPresetSearch(q);
        else if (q && tab !== "gacha")
            setContainerSearch(q);
        else if (q && tab === "gacha")
            setGachaSearch(q);
        // initialize preset search from URL `id` param
        const presetId = searchParams.get("id");
        if (presetId && tab === "preset")
            setPresetSearch(presetId);
        // initialize container search from URL `id` param
        const containerId = searchParams.get("id");
        if (containerId && tab === "containers")
            setContainerSearch(containerId);
        if (tab === "containers" && searchParams.get("editContainer")) {
            const editContainerId = searchParams.get("editContainer");
            if (editContainerId) {
                const pendingKey = `ss_pending_container_edit_${gameId}`;
                const pendingRaw = safeGetItem(pendingKey);
                let pendingDraft: ContainerDraftValues | undefined;
                if (pendingRaw) {
                    try {
                        pendingDraft = normalizeContainerDraftValues(JSON.parse(pendingRaw));
                    }
                    catch {
                        pendingDraft = undefined;
                    }
                    finally {
                        safeRemoveItem(pendingKey);
                    }
                }
                const target = containerDefs.find((def) => def.id === editContainerId);
                if (target) {
                    setEditingContainerDraft(pendingDraft);
                    setEditingContainer(target);
                    const newParams = new URLSearchParams(searchParams.toString());
                    newParams.delete("editContainer");
                    const nextQuery = newParams.toString();
                    router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
                }
                else {
                    void (async () => {
                        try {
                            const res = await getContainerDefinition({ gameId }, editContainerId);
                            setEditingContainerDraft(pendingDraft);
                            setEditingContainer(res.container_definition);
                            const newParams = new URLSearchParams(searchParams.toString());
                            newParams.delete("editContainer");
                            const nextQuery = newParams.toString();
                            router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
                        }
                        catch {
                            toast({ title: t('items.failedToLoadContainerDefinition'), variant: 'destructive' });
                        }
                    })();
                }
            }
        }
        // auto-open create preset sheet from URL params
        if (tab === "preset" && searchParams.get("create") === "1") {
            const iv: {
                name?: string;
                preset_type?: string;
                code_name?: string;
                max_slots?: number;
            } = {};
            const pName = searchParams.get("preset_name");
            const pType = searchParams.get("preset_type");
            const pCode = searchParams.get("code_name");
            const pSlots = searchParams.get("max_slots");
            if (pName)
                iv.name = pName;
            if (pType)
                iv.preset_type = pType;
            if (pCode)
                iv.code_name = pCode;
            if (pSlots && !isNaN(Number(pSlots)))
                iv.max_slots = Number(pSlots);
            setCreatePresetInitialValues(iv);
            setShowCreatePreset(true);
            // Restore turn context stored by ConversationPanel before navigation
            const pendingTurnRaw = safeGetItem(`ss_pending_preset_turn_${gameId}`);
            if (pendingTurnRaw) {
                try {
                    setCreatePresetTurnContext(JSON.parse(pendingTurnRaw));
                    // Remove immediately so it's not re-consumed on next open
                    localStorage.removeItem(`ss_pending_preset_turn_${gameId}`);
                }
                catch { /* ignore malformed data */ }
            }
        }
        // auto-open preset edit sheet from URL params
        if (tab === "preset" && searchParams.get("editPreset")) {
            const presetEditId = searchParams.get("editPreset");
            const target = presetDefs.find((def) => def.id === presetEditId);
            if (target) {
                setEditingPreset(target);
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete("editPreset");
                const nextQuery = newParams.toString();
                router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
            }
        }
        // auto-open gacha create sheet from LLM (data stored in localStorage)
        if (tab === "gacha" && searchParams.get("create") === "1") {
            const pendingRaw = safeGetItem(`ss_pending_gacha_create_${gameId}`);
            if (pendingRaw) {
                void (async () => {
                    try {
                        const detail = JSON.parse(pendingRaw);
                        const rawPool = Array.isArray(detail.item_pool) && detail.item_pool.length > 0
                            ? detail.item_pool.map((r: GachaLLMRow) => ({
                                item_definition_id: String(r.item_definition_id ?? ''),
                                weight: String(r.weight ?? 1),
                                quantity_min: String(r.quantity_min ?? 1),
                                quantity_max: String(r.quantity_max ?? 1),
                            }))
                            : [EMPTY_ROW()];
                        const rawKeyReqs = Array.isArray(detail.key_requirements) && detail.key_requirements.length > 0
                            ? detail.key_requirements.map((r: GachaLLMRow) => ({
                                item_definition_id: String(r.item_definition_id ?? ''),
                                quantity: String(r.quantity ?? 1),
                            }))
                            : [EMPTY_KEY_ROW()];
                        const allRawIds = [
                            ...rawPool.map((r: PoolRow) => r.item_definition_id),
                            ...rawKeyReqs.map((r: KeyReqRow) => r.item_definition_id),
                        ];
                        const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
                        const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                        const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                        const meta = (detail.metadata ?? {}) as Record<string, unknown>;
                        setEditingPack(null);
                        setGachaAutoSlug(false);
                        setGachaForm({
                            name: typeof detail.name === 'string' ? detail.name : '',
                            code_name: typeof detail.code_name === 'string' ? detail.code_name : '',
                            collect_destination: detail.collect_destination === 'inventory' ? 'inventory' : 'mailbox',
                            is_enabled: detail.is_enabled !== false,
                            mailbox_title: typeof meta.mailbox_title === 'string' ? meta.mailbox_title : '',
                            mailbox_body: typeof meta.mailbox_body === 'string' ? meta.mailbox_body : '',
                            pool,
                            keyReqs,
                        });
                        if (detail.turnId !== undefined) {
                            setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
                        }
                        localStorage.removeItem(`ss_pending_gacha_create_${gameId}`);
                        setGachaSheetOpen(true);
                    }
                    catch { /* ignore parse errors */ }
                })();
            }
        }
        // auto-open equipment slot create sheet from LLM navigation (data stored in localStorage)
        if (tab === "equipments" && searchParams.get("create") === "1") {
            const pendingEquipRaw = safeGetItem(`ss_pending_equipment_slot_create_${gameId}`);
            if (pendingEquipRaw) {
                try {
                    const detail = JSON.parse(pendingEquipRaw);
                    localStorage.removeItem(`ss_pending_equipment_slot_create_${gameId}`);
                    window.dispatchEvent(new CustomEvent('ss:open-create-equipment-slot', { detail }));
                }
                catch { /* ignore parse errors */ }
            }
        }
        // auto-open equipment slot edit sheet from LLM navigation (data stored in localStorage)
        if (tab === "equipments" && searchParams.get("editFromLLM") === "1") {
            const pendingEditRaw = safeGetItem(`ss_pending_equipment_slot_edit_${gameId}`);
            if (pendingEditRaw) {
                try {
                    const detail = JSON.parse(pendingEditRaw);
                    localStorage.removeItem(`ss_pending_equipment_slot_edit_${gameId}`);
                    window.dispatchEvent(new CustomEvent('ss:open-edit-equipment-slot', { detail }));
                }
                catch { /* ignore parse errors */ }
            }
        }
        // auto-open gacha edit sheet from LLM navigation (data stored in localStorage)
        if (tab === "gacha" && searchParams.get("editFromLLM") === "1") {
            const pendingRaw = safeGetItem(`ss_pending_gacha_edit_${gameId}`);
            if (pendingRaw) {
                void (async () => {
                    try {
                        const detail = JSON.parse(pendingRaw);
                        const existingPack = detail.existingPack as GachaPack | undefined;
                        if (existingPack) {
                            const llmData = (detail.llmData ?? {}) as Record<string, unknown>;
                            const rawPool = Array.isArray(llmData.item_pool) && llmData.item_pool.length > 0
                                ? llmData.item_pool.map((r: GachaLLMRow) => ({
                                    item_definition_id: String(r.item_definition_id ?? ''),
                                    weight: String(r.weight ?? 1),
                                    quantity_min: String(r.quantity_min ?? 1),
                                    quantity_max: String(r.quantity_max ?? 1),
                                }))
                                : existingPack.item_pool.map((r) => ({
                                    item_definition_id: r.item_definition_id,
                                    weight: String(r.weight),
                                    quantity_min: String(r.quantity_min),
                                    quantity_max: String(r.quantity_max),
                                }));
                            const rawKeyReqs = Array.isArray(llmData.key_requirements) && llmData.key_requirements.length > 0
                                ? llmData.key_requirements.map((r: GachaLLMRow) => ({
                                    item_definition_id: String(r.item_definition_id ?? ''),
                                    quantity: String(r.quantity ?? 1),
                                }))
                                : (existingPack.key_requirements ?? []).map((r) => ({
                                    item_definition_id: r.item_definition_id,
                                    quantity: String(r.quantity),
                                }));
                            const allRawIds = [
                                ...rawPool.map((r: PoolRow) => r.item_definition_id),
                                ...rawKeyReqs.map((r: KeyReqRow) => r.item_definition_id),
                            ];
                            const codeToId = gameId ? await resolveGachaRefCodes(allRawIds, gameId) : {};
                            const pool = rawPool.map((r: PoolRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                            const keyReqs = rawKeyReqs.map((r: KeyReqRow) => ({ ...r, item_definition_id: applyRefCodeMap(r.item_definition_id, codeToId) }));
                            const existingMeta = (existingPack.metadata ?? {}) as Record<string, unknown>;
                            const llmMeta = (llmData.metadata && typeof llmData.metadata === 'object' && !Array.isArray(llmData.metadata))
                                ? llmData.metadata as Record<string, unknown>
                                : existingMeta;
                            setEditingPack(existingPack);
                            setGachaAutoSlug(false);
                            setGachaForm({
                                name: typeof llmData.name === 'string' && llmData.name.trim() ? llmData.name : existingPack.name,
                                code_name: existingPack.code_name ?? '',
                                collect_destination: llmData.collect_destination === 'inventory' || llmData.collect_destination === 'mailbox'
                                    ? llmData.collect_destination
                                    : existingPack.collect_destination ?? 'mailbox',
                                is_enabled: existingPack.is_enabled,
                                mailbox_title: typeof llmMeta.mailbox_title === 'string' ? llmMeta.mailbox_title : '',
                                mailbox_body: typeof llmMeta.mailbox_body === 'string' ? llmMeta.mailbox_body : '',
                                pool,
                                keyReqs,
                            });
                            if (detail.turnId !== undefined) {
                                setCreateGachaConvContext({ turnId: detail.turnId, responseIdx: detail.responseIdx, gachaPackIdx: detail.gachaPackIdx });
                            }
                            localStorage.removeItem(`ss_pending_gacha_edit_${gameId}`);
                            suppressGachaAutoOpenRef.current = true;
                            const newParams = new URLSearchParams(searchParams.toString());
                            newParams.delete('editFromLLM');
                            newParams.set('editPack', existingPack.id);
                            router.replace(`${window.location.pathname}?${newParams.toString()}`);
                            setGachaSheetOpen(true);
                        }
                    }
                    catch { /* ignore parse errors */ }
                })();
            }
        }
    }, [searchParams, gameId, presetDefs, containerDefs, router, toast, t]);
    // update URL when tab changes
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`${window.location.pathname}?tab=${value}`);
    };
    const handleContainerSubTabChange = (value: string) => {
        const v = value as "definitions" | "slot-guide";
        setContainerSubTab(v);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("csubtab", v);
        router.replace(`${window.location.pathname}?${newParams.toString()}`);
    };
    // debounce name filter
    useEffect(() => {
        const t = setTimeout(() => setDebouncedName(searchName), 300);
        return () => clearTimeout(t);
    }, [searchName]);
    // debounce container search
    useEffect(() => {
        const t = setTimeout(() => setContainerSearchDebounced(containerSearch), 250);
        return () => clearTimeout(t);
    }, [containerSearch]);
    // debounce gacha search
    useEffect(() => {
        const t = setTimeout(() => setGachaSearchDebounced(gachaSearch), 250);
        return () => clearTimeout(t);
    }, [gachaSearch]);
    // debounce preset search
    useEffect(() => {
        const t = setTimeout(() => setPresetSearchDebounced(presetSearch), 250);
        return () => clearTimeout(t);
    }, [presetSearch]);
    // sync container search to URL
    useEffect(() => {
        if (activeTab === 'gacha')
            return;
        const newParams = new URLSearchParams(searchParams.toString());
        if (containerSearchDebounced) {
            newParams.set("q", containerSearchDebounced);
        }
        else {
            newParams.delete("q");
        }
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [containerSearchDebounced]); // eslint-disable-line react-hooks/exhaustive-deps
    // sync gacha search to URL
    useEffect(() => {
        if (activeTab !== 'gacha')
            return;
        const newParams = new URLSearchParams(searchParams.toString());
        if (gachaSearchDebounced) {
            newParams.set("q", gachaSearchDebounced);
        }
        else {
            newParams.delete("q");
        }
        router.replace(`${window.location.pathname}?${newParams.toString()}`, { scroll: false });
    }, [gachaSearchDebounced]); // eslint-disable-line react-hooks/exhaustive-deps
    // fetch categories, rarities & tags from API on mount
    useEffect(() => {
        Promise.all([fetchItemCategories(), fetchItemRarities()])
            .then(([cats, rars]) => { setCategories(cats); setRarities(rars); })
            .catch(() => { });
    }, []);
    useEffect(() => {
        if (!gameId)
            return;
        listItemTags({ gameId }, { limit: 200, offset: 0 })
            .then((res) => setItemTags(res.tags ?? []))
            .catch(() => { });
    }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
    // load game info ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â also used to refresh usage after mutations
    const loadGameInfo = useCallback(async () => {
        try {
            const g = await getGame(gameId);
            setGameName(g.name);
            setStudioId(g.studio_id ?? "");
            setMaxItems(g.limits?.max_items ?? null);
            setItemUsage(g.usage?.items ?? null);
            setGameLimits(g.limits ?? null);
            setMaxEquipmentSlots(g.limits?.max_equipment_slots ?? null);
            setEquipmentSlotsUsage(g.usage?.equipment_slots ?? null);
        }
        catch {
            // game failed to load ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â stop the skeleton
            setLoading(false);
        }
    }, [gameId]);
    useEffect(() => {
        loadGameInfo();
    }, [loadGameInfo]);
    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: ListItemsParams = { limit: LIMIT, offset };
            if (filterCategory !== "all")
                params.category = filterCategory as ItemCategory;
            if (filterRarity !== "all")
                params.rarity = filterRarity as ItemRarity;
            if (debouncedName)
                params.name = debouncedName;
            if (selectedTagKeys.length > 0)
                params.tags = selectedTagKeys;
            if (filterAllowClientUpdateQty !== "all")
                params.allow_client_update_qty = filterAllowClientUpdateQty === "true";
            const result = await listItemDefinitions({ gameId }, params);
            setItems(result.items ?? []);
            setTotal(result.total);
        }
        catch (err: any) {
            // 404 = catalogue exists but is empty ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â treat as empty list, not an error
            if (err instanceof ApiError && err.status === 404) {
                setItems([]);
                setTotal(0);
            }
            else {
                setError(err?.message ?? "Failed to load items");
            }
        }
        finally {
            setLoading(false);
        }
    }, [gameId, filterCategory, filterRarity, debouncedName, selectedTagKeys, filterAllowClientUpdateQty, offset]);
    useEffect(() => {
        fetchItems();
    }, [fetchItems]);
    // reset offset when filters change
    useEffect(() => {
        setOffset(0);
    }, [filterCategory, filterRarity, debouncedName, selectedTagKeys, filterAllowClientUpdateQty]);
    // handle updating a single item field
    const handleUpdateItemField = useCallback(async (itemId: string, patch: Partial<ItemDefinition>) => {
        setUpdatingItemId(itemId);
        try {
            const updated = await updateItemDefinition({ gameId }, itemId, patch as UpdateItemRequest);
            // update local state
            setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, ...updated.item } : item));
            toast({ title: t('items.itemUpdated') });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('items.failedToUpdateItem'), description: err?.message ?? "Unknown error" });
        }
        finally {
            setUpdatingItemId(null);
        }
    }, [gameId, toast]);
    // Link an item definition to the active (or a newly created) conversation
    async function handleLinkItemToConversation(item: ItemDefinition) {
        setLinkingItemId(item.id);
        try {
            let convId: string | null = convActiveId;
            if (!convId) {
                // No active conversation ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â create a new one
                const newConv = await createConversation(gameId, {
                    title: `Item: ${item.name}`,
                    goal: t('items.linkToConvGoal').replace('{name}', item.name),
                });
                convId = newConv.ID;
            }
            safeSetItem(`ss_conv_active_${gameId}`, convId);
            setConvActiveId(convId);
            await linkConversationContent(gameId, convId, 'item_definition', item.id);
            // Dispatch AFTER linking so the useEffect([activeConvId]) in the panel loads already-linked content
            window.dispatchEvent(new CustomEvent('ss:conv-external-created', { detail: { convId, gameId } }));
            window.dispatchEvent(new CustomEvent('ss:conv-content-linked', { detail: { convId, gameId, contentType: 'item_definition', contentId: item.id, contentName: item.name } }));
            toast({ title: t('items.linkToConvSuccess'), description: item.name });
        }
        catch (err: unknown) {
            toast({
                variant: 'destructive',
                title: t('items.linkToConvFailed'),
                description: err instanceof Error ? err.message : undefined,
            });
        }
        finally {
            setLinkingItemId(null);
        }
    }
    // Link a container definition to the active (or a newly created) conversation
    async function handleLinkContainerToConversation(def: ContainerDefinition) {
        setLinkingContainerId(def.id);
        try {
            let convId: string | null = convActiveId;
            const containerLabel = def.code_name ? `${def.name} (${def.code_name})` : def.name;
            if (!convId) {
                const newConv = await createConversation(gameId, {
                    title: `Container: ${containerLabel}`,
                    goal: t('items.linkToConvGoal').replace('{name}', containerLabel),
                });
                convId = newConv.ID;
            }
            safeSetItem(`ss_conv_active_${gameId}`, convId);
            setConvActiveId(convId);
            await linkConversationContent(gameId, convId, 'container_definition', def.id);
            window.dispatchEvent(new CustomEvent('ss:conv-external-created', { detail: { convId, gameId } }));
            window.dispatchEvent(new CustomEvent('ss:conv-content-linked', { detail: { convId, gameId, contentType: 'container_definition', contentId: def.id, contentName: containerLabel } }));
            toast({ title: t('items.linkToConvSuccess'), description: containerLabel });
        }
        catch (err: unknown) {
            toast({
                variant: 'destructive',
                title: t('items.linkToConvFailed'),
                description: err instanceof Error ? err.message : undefined,
            });
        }
        finally {
            setLinkingContainerId(null);
        }
    }
    // Content linking helpers
    // Link a preset definition to the active (or a newly created) conversation
    async function handleLinkPresetToConversation(def: PresetDefinition) {
        setLinkingPresetId(def.id);
        try {
            let convId: string | null = convActiveId;
            if (!convId) {
                const newConv = await createConversation(gameId, {
                    title: `Preset: ${def.name}`,
                    goal: t('items.linkToConvGoal').replace('{name}', def.name),
                });
                convId = newConv.ID;
            }
            safeSetItem(`ss_conv_active_${gameId}`, convId);
            setConvActiveId(convId);
            await linkConversationContent(gameId, convId, 'preset_definition', def.id);
            window.dispatchEvent(new CustomEvent('ss:conv-external-created', { detail: { convId, gameId } }));
            window.dispatchEvent(new CustomEvent('ss:conv-content-linked', { detail: { convId, gameId, contentType: 'preset_definition', contentId: def.id, contentName: def.name } }));
            toast({ title: t('items.linkToConvSuccess'), description: def.name });
        }
        catch (err: unknown) {
            toast({
                variant: 'destructive',
                title: t('items.linkToConvFailed'),
                description: err instanceof Error ? err.message : undefined,
            });
        }
        finally {
            setLinkingPresetId(null);
        }
    }
    const fetchContainerDefs = useCallback(async () => {
        setContainerLoading(true);
        setContainerError(null);
        try {
            const ctx = { gameId };
            const [result, itemsRes] = await Promise.all([
                listContainerDefinitions(ctx, { limit: CONTAINER_LIMIT, offset: containerOffset }),
                listItemDefinitions(ctx, { limit: 200 }),
            ]);
            setContainerDefs(result.container_definitions ?? []);
            setContainerTotal(result.total);
            setContainerAllItems(itemsRes.items ?? []);
        }
        catch (err: any) {
            setContainerError(err?.message ?? 'Failed to load container definitions');
        }
        finally {
            setContainerLoading(false);
        }
    }, [gameId, containerOffset]);
    useEffect(() => {
        if (activeTab === 'containers') {
            fetchContainerDefs();
        }
    }, [activeTab, fetchContainerDefs]);
    useEffect(() => {
        fetchContainerTypes().then(setContainerTypeOptions).catch(() => { });
    }, []);
    async function handleDeleteContainer() {
        if (!deletingContainer)
            return;
        setDeleteContainerLoading(true);
        try {
            await deleteContainerDefinition({ gameId }, deletingContainer.id);
            toast({ title: t('items.containerDeleted') });
            setDeletingContainer(null);
            fetchContainerDefs();
            loadGameInfo();
        }
        catch (err: any) {
            if (err?.status === 403) {
                toast({ variant: "destructive", title: t('items.cannotDelete'), description: t('items.systemContainerCannotDelete') });
            }
            else if (err?.status === 409) {
                toast({ variant: "destructive", title: t('items.cannotDelete'), description: t('items.containerHasActiveRefs') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setDeleteContainerLoading(false);
        }
    }
    const containerTotalPages = Math.ceil(containerTotal / CONTAINER_LIMIT);
    const containerCurrentPage = Math.floor(containerOffset / CONTAINER_LIMIT) + 1;
    // client-side filter by name, code name, or id
    const filteredGachaPacks = gachaSearchDebounced
        ? gachaPacks.filter((p) => {
            const q = gachaSearchDebounced.toLowerCase();
            return (p.name.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q) ||
                (p.code_name ?? "").toLowerCase().includes(q));
        })
        : gachaPacks;
    const filteredContainerDefs = containerSearchDebounced
        ? containerDefs.filter((d) => d.name.toLowerCase().includes(containerSearchDebounced.toLowerCase()) ||
            (d.code_name ?? "").toLowerCase().includes(containerSearchDebounced.toLowerCase()) ||
            d.id.toLowerCase().includes(containerSearchDebounced.toLowerCase()))
        : containerDefs;
    function getItemName(id: string | null | undefined): string {
        if (!id)
            return t('items.noLinkedItem');
        const it = containerAllItems.find((i) => i.id === id) || items.find((i) => i.id === id);
        return it ? (it.name + (it.item_code ? ` (${it.item_code})` : "")) : id.slice(0, 8) + "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦";
    }
    const handleContainerRowClick = (def: ContainerDefinition) => {
        if (expandedContainerId === def.id) {
            setExpandedContainerId(null);
            return;
        }
        setExpandedContainerId(def.id);
        setEditingField(null); // Reset inline edit state
        // Initialize metadata rows immediately from cache or basic def
        const base = containerDetailCache[def.id] || def;
        const rows = Object.entries(base.metadata || {}).map(([k, v]) => ({
            k,
            v: typeof v === 'object' ? JSON.stringify(v) : String(v)
        }));
        setMetadataRows(rows.length > 0 ? rows : [{ k: "", v: "" }]);
        if (containerDetailCache[def.id])
            return;
        setContainerDetailLoading(def.id);
        getContainerDefinition({ gameId }, def.id)
            .then((res: {
            container_definition: ContainerDefinition;
        }) => {
            setContainerDetailCache((prev) => ({ ...prev, [def.id]: res.container_definition }));
            // Update rows with fetched data if the user hasn't started editing yet
            if (!editingField || editingField.id !== def.id) {
                const fetchedRows = Object.entries(res.container_definition.metadata || {}).map(([k, v]) => ({
                    k,
                    v: typeof v === 'object' ? JSON.stringify(v) : String(v)
                }));
                setMetadataRows(fetchedRows.length > 0 ? fetchedRows : [{ k: "", v: "" }]);
            }
        })
            .catch(() => {
            setContainerDetailCache((prev) => ({ ...prev, [def.id]: def }));
        })
            .finally(() => setContainerDetailLoading(null));
    };
    const [updatingContainerId, setUpdatingContainerId] = useState<string | null>(null);
    const handleUpdateContainerField = useCallback(async (definitionId: string, patch: UpdateContainerDefinitionRequest) => {
        setUpdatingContainerId(definitionId);
        try {
            const { container_definition: updated } = await updateContainerDefinition({ gameId }, definitionId, patch);
            // Update the main list
            setContainerDefs((prev) => prev.map((d) => d.id === definitionId ? updated : d));
            // Update the detail cache
            setContainerDetailCache((prev) => ({ ...prev, [definitionId]: updated }));
            toast({ title: t('items.containerUpdated') });
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('items.failedToUpdate'), description: err?.message ?? "Unknown error" });
        }
        finally {
            setUpdatingContainerId(null);
        }
    }, [gameId, t, toast]);
    const handleSaveInlineEdit = async () => {
        if (!editingField)
            return;
        const { id, field } = editingField;
        const patch: UpdateContainerDefinitionRequest = {};
        if (field === 'name') {
            if (!editValue.trim()) {
                toast({ variant: "destructive", title: t('items.nameRequired') });
                return;
            }
            patch.name = editValue.trim();
        }
        if (field === 'code_name') {
            if (!editValue.trim()) {
                toast({ variant: "destructive", title: t('items.codeNameRequired') });
                return;
            }
            if (!/^[a-z][a-z0-9_]{0,63}$/.test(editValue.trim())) {
                toast({ variant: "destructive", title: t('items.saveFailed'), description: t('items.codeNameInvalid') });
                return;
            }
            patch.code_name = editValue.trim();
        }
        if (field === 'linked_item_id')
            patch.linked_item_definition_id = editValue;
        if (field === 'grid') {
            const cols = parseInt(editValue);
            const rows = parseInt(editValue2);
            if (isNaN(cols) || cols < 1 || cols > 54) {
                toast({ variant: "destructive", title: t('items.colsMustBe') });
                return;
            }
            if (isNaN(rows) || rows < 1 || rows > 54) {
                toast({ variant: "destructive", title: t('items.rowsMustBe') });
                return;
            }
            patch.grid_cols = cols;
            patch.grid_rows = rows;
        }
        if (field === 'metadata') {
            const metadata: Record<string, any> = {};
            metadataRows.forEach(row => {
                const key = row.k.trim();
                if (key) {
                    let val: any = row.v.trim();
                    // Basic type inference
                    if (val.toLowerCase() === 'true')
                        val = true;
                    else if (val.toLowerCase() === 'false')
                        val = false;
                    else if (!isNaN(Number(val)) && val !== "")
                        val = Number(val);
                    metadata[key] = val;
                }
            });
            patch.metadata = metadata;
        }
        await handleUpdateContainerField(id, patch);
        setEditingField(null);
    };
    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Gacha ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const fetchGachaData = useCallback(async () => {
        setGachaLoading(true);
        setGachaError(null);
        try {
            const ctx = { gameId };
            const [packsRes, itemsRes] = await Promise.all([
                listGachaPacks(ctx),
                listItemDefinitions(ctx, { limit: 200 }),
            ]);
            setGachaPacks(packsRes.packs ?? []);
            setGachaAllItems(itemsRes.items ?? []);
        }
        catch (err: any) {
            setGachaError(err?.message ?? "Failed to load gacha data");
        }
        finally {
            setGachaLoading(false);
        }
    }, [gameId]);
    useEffect(() => {
        if (activeTab === 'gacha') {
            fetchGachaData();
        }
    }, [activeTab, fetchGachaData]);
    // resolve __REF:ITEM_CODE placeholders in gacha form pool/keyReqs once item list is available
    useEffect(() => {
        if (!gachaSheetOpen || gachaAllItems.length === 0)
            return;
        setGachaForm((prev) => {
            const hasRefs = prev.pool.some((r) => r.item_definition_id.startsWith('__REF:')) ||
                prev.keyReqs.some((r) => r.item_definition_id.startsWith('__REF:'));
            if (!hasRefs)
                return prev;
            return {
                ...prev,
                pool: prev.pool.map((r) => ({
                    ...r,
                    item_definition_id: resolveGachaRef(r.item_definition_id, gachaAllItems),
                })),
                keyReqs: prev.keyReqs.map((r) => ({
                    ...r,
                    item_definition_id: resolveGachaRef(r.item_definition_id, gachaAllItems),
                })),
            };
        });
    }, [gachaAllItems, gachaSheetOpen]);
    // auto-open edit sheet when ?editPack=<id> is in the URL (keep param so F5 re-opens)
    useEffect(() => {
        if (suppressGachaAutoOpenRef.current) {
            suppressGachaAutoOpenRef.current = false;
            return;
        }
        const packId = searchParams.get("editPack");
        if (!packId || gachaLoading || gachaPacks.length === 0)
            return;
        const pack = gachaPacks.find((p) => p.id === packId);
        if (pack) {
            gachaOpenEdit(pack);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gachaPacks, gachaLoading]);
    function gachaCloseSheet() {
        suppressGachaAutoOpenRef.current = true;
        setGachaSheetOpen(false);
        setCreateGachaConvContext(undefined);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("editPack");
        router.replace(`${window.location.pathname}?${newParams.toString()}`);
    }
    function gachaOpenCreate() {
        setEditingPack(null);
        setGachaForm(emptyGachaForm());
        setGachaAutoSlug(true);
        setGachaSheetOpen(true);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("editPack");
        router.replace(`${window.location.pathname}?${newParams.toString()}`);
    }
    function gachaOpenEdit(pack: GachaPack) {
        setEditingPack(pack);
        setGachaAutoSlug(false);
        const meta = (pack.metadata ?? {}) as Record<string, unknown>;
        setGachaForm({
            name: pack.name,
            code_name: pack.code_name ?? "",
            collect_destination: pack.collect_destination ?? "mailbox",
            is_enabled: pack.is_enabled,
            mailbox_title: typeof meta.mailbox_title === "string" ? meta.mailbox_title : "",
            mailbox_body: typeof meta.mailbox_body === "string" ? meta.mailbox_body : "",
            pool: pack.item_pool.length > 0
                ? pack.item_pool.map((e) => ({
                    item_definition_id: e.item_definition_id,
                    weight: String(e.weight),
                    quantity_min: String(e.quantity_min),
                    quantity_max: String(e.quantity_max),
                }))
                : [EMPTY_ROW()],
            keyReqs: (pack.key_requirements ?? []).length > 0
                ? pack.key_requirements.map((r) => ({
                    item_definition_id: r.item_definition_id,
                    quantity: String(r.quantity),
                }))
                : [EMPTY_KEY_ROW()],
        });
        setGachaSheetOpen(true);
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("editPack", pack.id);
        router.replace(`${window.location.pathname}?${newParams.toString()}`);
    }
    function updateKeyReqRow(index: number, patch: Partial<KeyReqRow>) {
        setGachaForm((f) => ({ ...f, keyReqs: f.keyReqs.map((r, i) => i === index ? { ...r, ...patch } : r) }));
    }
    function addKeyReqRow() {
        setGachaForm((f) => ({ ...f, keyReqs: [...f.keyReqs, EMPTY_KEY_ROW()] }));
    }
    function removeKeyReqRow(index: number) {
        setGachaForm((f) => ({ ...f, keyReqs: f.keyReqs.filter((_, i) => i !== index) }));
    }
    function updatePoolRow(index: number, patch: Partial<PoolRow>) {
        setGachaForm((f) => ({ ...f, pool: f.pool.map((r, i) => i === index ? { ...r, ...patch } : r) }));
    }
    function addPoolRow() {
        setGachaForm((f) => ({ ...f, pool: [...f.pool, EMPTY_ROW()] }));
    }
    function removePoolRow(index: number) {
        setGachaForm((f) => ({ ...f, pool: f.pool.filter((_, i) => i !== index) }));
    }
    async function handleGachaSave(closeAfterSave: boolean = true) {
        const name = gachaForm.name.trim();
        const codeName = gachaForm.code_name.trim();
        if (!name) {
            toast({ variant: "destructive", title: t('items.nameRequired') });
            return;
        }
        if (codeName && !/^[a-z][a-z0-9_]{0,63}$/.test(codeName)) {
            toast({
                variant: "destructive",
                title: t('items.saveFailed'),
                description: 'Code name must match ^[a-z][a-z0-9_]{0,63}$',
            });
            return;
        }
        const poolSource = gachaForm.pool
            .filter((r) => r.item_definition_id.trim())
            .map((r) => ({
            ...r,
            item_definition_id: resolveGachaRef(r.item_definition_id.trim(), gachaAllItems),
        }));
        const keyReqSource = gachaForm.keyReqs
            .filter((r) => r.item_definition_id.trim())
            .map((r) => ({
            ...r,
            item_definition_id: resolveGachaRef(r.item_definition_id.trim(), gachaAllItems),
        }));
        if (poolSource.length < 1) {
            toast({
                variant: "destructive",
                title: t('items.saveFailed'),
                description: 'Gacha pack must have at least one reward item.',
            });
            return;
        }
        const unresolvedRefs = [...poolSource, ...keyReqSource].filter((r) => r.item_definition_id.startsWith('__REF:'));
        if (unresolvedRefs.length > 0) {
            toast({
                variant: "destructive",
                title: t('items.saveFailed'),
                description: 'Some referenced item definitions are still unresolved. Please select them manually before saving.',
            });
            return;
        }
        const item_pool: GachaPoolEntry[] = poolSource.map((r) => ({
            item_definition_id: r.item_definition_id,
            weight: Math.max(1, Number(r.weight) || 1),
            quantity_min: Math.max(1, Number(r.quantity_min) || 1),
            quantity_max: Math.max(Number(r.quantity_min) || 1, Number(r.quantity_max) || 1),
        }));
        const key_requirements: KeyRequirement[] = keyReqSource.map((r) => ({
            item_definition_id: r.item_definition_id,
            quantity: Math.max(1, Number(r.quantity) || 1),
        }));
        if (item_pool.some((entry) => entry.weight < 1 || entry.quantity_min < 1 || entry.quantity_max < entry.quantity_min)) {
            toast({
                variant: "destructive",
                title: t('items.saveFailed'),
                description: 'Reward entries must have valid weight and quantity ranges.',
            });
            return;
        }
        if (key_requirements.some((entry) => entry.quantity < 1)) {
            toast({
                variant: "destructive",
                title: t('items.saveFailed'),
                description: 'Key requirement quantities must be at least 1.',
            });
            return;
        }
        const existingMeta = (editingPack?.metadata ?? {}) as Record<string, unknown>;
        const { mailbox_title: _omitTitle, mailbox_body: _omitBody, ...restMeta } = existingMeta;
        const metadata: Record<string, unknown> = { ...restMeta };
        if (gachaForm.collect_destination === "mailbox") {
            if (gachaForm.mailbox_title.trim())
                metadata.mailbox_title = gachaForm.mailbox_title.trim();
            if (gachaForm.mailbox_body.trim())
                metadata.mailbox_body = gachaForm.mailbox_body.trim();
        }
        const countMetadataKeys = (value: unknown): number => {
            if (!value || typeof value !== 'object')
                return 0;
            if (Array.isArray(value))
                return value.reduce((sum, entry) => sum + countMetadataKeys(entry), 0);
            return Object.entries(value as Record<string, unknown>).reduce((sum, [, entry]) => sum + 1 + countMetadataKeys(entry), 0);
        };
        if (countMetadataKeys(metadata) > 50) {
            toast({
                variant: "destructive",
                title: t('items.saveFailed'),
                description: 'Metadata cannot exceed 50 keys in total.',
            });
            return;
        }
        setFormSaving(true);
        try {
            const ctx = { gameId };
            if (editingPack) {
                const res = await updateGachaPack(ctx, editingPack.id, {
                    name,
                    ...(codeName && { code_name: codeName }),
                    collect_destination: gachaForm.collect_destination,
                    is_enabled: gachaForm.is_enabled,
                    item_pool,
                    key_requirements,
                    metadata,
                });
                setGachaPacks((prev) => prev.map((p) => p.id === editingPack.id ? res.pack : p));
                setEditingPack(res.pack);
                toast({ title: t('items.packUpdated') });
                if (createGachaConvContext) {
                    const { turnId, responseIdx, gachaPackIdx } = createGachaConvContext;
                    window.dispatchEvent(new CustomEvent('ss:gacha-pack-created', {
                        detail: { gachaPackId: res.pack.id, gachaPackName: res.pack.name, turnId, responseIdx, gachaPackIdx },
                    }));
                    setCreateGachaConvContext(undefined);
                }
            }
            else {
                const res = await createGachaPack(ctx, {
                    name,
                    ...(codeName && { code_name: codeName }),
                    collect_destination: gachaForm.collect_destination,
                    is_enabled: gachaForm.is_enabled,
                    item_pool,
                    key_requirements,
                    metadata,
                });
                setGachaPacks((prev) => [res.pack, ...prev]);
                toast({ title: t('items.packCreated') });
                loadGameInfo();
                if (createGachaConvContext) {
                    const { turnId, responseIdx, gachaPackIdx } = createGachaConvContext;
                    window.dispatchEvent(new CustomEvent('ss:gacha-pack-created', {
                        detail: { gachaPackId: res.pack.id, gachaPackName: res.pack.name, turnId, responseIdx, gachaPackIdx },
                    }));
                    setCreateGachaConvContext(undefined);
                }
            }
            if (closeAfterSave)
                gachaCloseSheet();
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('items.saveFailed'), description: err?.message ?? "Unknown error" });
        }
        finally {
            setFormSaving(false);
        }
    }
    async function handleGachaToggle(pack: GachaPack) {
        setTogglingId(pack.id);
        try {
            const res = await setGachaPackEnabled({ gameId }, pack.id, !pack.is_enabled);
            setGachaPacks((prev) => prev.map((p) => p.id === pack.id ? { ...p, is_enabled: res.is_enabled } : p));
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('items.failedToTogglePack'), description: err?.message });
        }
        finally {
            setTogglingId(null);
        }
    }
    async function handleGachaDelete() {
        if (!deletingPack)
            return;
        setDeletePackLoading(true);
        try {
            await deleteGachaPack({ gameId }, deletingPack.id);
            setGachaPacks((prev) => prev.filter((p) => p.id !== deletingPack.id));
            toast({ title: t('items.packDeleted') });
            setDeletingPack(null);
            loadGameInfo();
        }
        catch (err: any) {
            toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message });
        }
        finally {
            setDeletePackLoading(false);
        }
    }
    const formTotalWeight = gachaForm.pool.reduce((s, r) => s + (Number(r.weight) || 0), 0);
    function gachaItemName(id: string) {
        const it = gachaAllItems.find((i) => i.id === id);
        if (!it)
            return <code className="text-xs">{id.slice(0, 8)}ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦</code>;
        return <span>{it.name} <span className="text-muted-foreground text-xs">({it.item_code || it.id.slice(0, 6)})</span></span>;
    }
    function gachaItemShortName(id: string) {
        const it = gachaAllItems.find((i) => i.id === id);
        return it ? (it.name + (it.item_code ? ` (${it.item_code})` : "")) : id.slice(0, 8) + "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦";
    }
    // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Preset Definitions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
    const fetchPresetDefs = useCallback(async () => {
        if (!gameId)
            return;
        setPresetLoading(true);
        setPresetError(null);
        try {
            const result = await listPresetDefinitions({ gameId });
            setPresetDefs(result.definitions ?? []);
        }
        catch (err: any) {
            setPresetError(err?.message ?? 'Failed to load preset definitions');
        }
        finally {
            setPresetLoading(false);
        }
    }, [gameId]);
    useEffect(() => {
        if (activeTab === 'preset') {
            fetchPresetDefs();
        }
    }, [activeTab, fetchPresetDefs]);
    const filteredPresetDefs = presetSearchDebounced
        ? presetDefs.filter((d) => d.name.toLowerCase().includes(presetSearchDebounced.toLowerCase()) ||
            d.preset_type.toLowerCase().includes(presetSearchDebounced.toLowerCase()) ||
            d.id.toLowerCase().includes(presetSearchDebounced.toLowerCase()))
        : presetDefs;
    const totalPages = Math.ceil(total / LIMIT);
    const currentPage = Math.floor(offset / LIMIT) + 1;
    return (<div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="/games">Games</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href={`/games/${gameId}`}>{gameName || gameId}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <span>{t('items.itemsContainers')}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:justify-between md:items-center md:gap-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.push(`/games/${gameId}`)}>
            <ArrowLeft className="h-4 w-4"/>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
              {t('items.itemCatalogue')}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 flex-wrap text-sm">
              {maxItems != null
            ? (() => {
                const used = itemUsage ?? total;
                return <>
                    <span className={used >= maxItems ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {maxItems.toLocaleString()} {t('items.itemsUnit')}
                    </span>
                    <span className="inline-block h-1.5 w-20 shrink-0 rounded-full bg-muted overflow-hidden align-middle sm:w-24">
                      <span className={`block h-full rounded-full transition-all ${used >= maxItems ? "bg-destructive" : used / maxItems >= 0.8 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min((used / maxItems) * 100, 100)}%` }}/>
                    </span>
                    <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0" title="Manage plugins / raise limits">
                      <Hammer className="h-3.5 w-3.5"/>
                    </Link>
                  </>;
            })()
            : total > 0 ? `${total} ${t('items.itemsDefined')}` : t('items.noItemsYet')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <GameNavButtons gameId={gameId} active="items"/>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
            <TabsList className="w-auto inline-flex">
              {ITEMS_TABS.map(({ key, icon: Icon, labelKey }) => (<TabsTrigger key={key} value={key} className="whitespace-nowrap">
                  <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0"/>{t(labelKey)}
                </TabsTrigger>))}
            </TabsList>
          </div>

        <TabsContent value="crafting" className="space-y-4">
          <CraftingTab gameId={gameId} studioId={studioId}/>
        </TabsContent>

        <TabsContent value="catalogue" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.itemDefinitions')}</h2>
              <p className="text-sm text-muted-foreground">
                {total > 0 ? `${total.toLocaleString()} ${t('items.itemsDefined')}` : t('items.noItemsYet')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Clear all */}
              {(searchName || filterCategory !== "all" || filterRarity !== "all" || filterAllowClientUpdateQty !== "all" || selectedTagKeys.length > 0) && (<button className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => { setSearchName(""); setFilterCategory("all"); setFilterRarity("all"); setFilterAllowClientUpdateQty("all"); setSelectedTagKeys([]); }}>
                  Clear
                </button>)}
              {/* Name search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                <input type="text" placeholder={t('items.searchByName')} value={searchName} onChange={(e) => setSearchName(e.target.value)} className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-7 text-sm outline-none focus:ring-1 focus:ring-ring"/>
                {searchName && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchName("")}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              {/* Category */}
              <select className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">{t('items.allCategories')}</option>
                {categories.map((c) => (<option key={c} value={c}>{prettyCategory(c)}</option>))}
              </select>
              {/* Rarity */}
              <select className="h-8 rounded-md border border-input bg-background px-2 text-sm capitalize" value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)}>
                <option value="all">{t('items.allRarities')}</option>
                {rarities.map((r) => (<option key={r} value={r} className="capitalize">{r}</option>))}
              </select>
              {/* Allow Client Update Qty */}
              <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={filterAllowClientUpdateQty} onChange={(e) => setFilterAllowClientUpdateQty(e.target.value)}>
                <option value="all">{t('items.allQtyPermissions')}</option>
                <option value="true">{t('items.canUpdateQty')}</option>
                <option value="false">{t('items.cannotUpdateQty')}</option>
              </select>
              {/* Tags filter */}
              {itemTags.length > 0 && (<Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <Tag className="h-3.5 w-3.5"/>
                      {t('items.tabTags')}
                      {selectedTagKeys.length > 0 && (<span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-semibold">
                          {selectedTagKeys.length}
                        </span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('items.searchTagsIn')}/>
                      <CommandList>
                        <CommandEmpty>{t('items.noTagsFound')}</CommandEmpty>
                        <CommandGroup>
                          {itemTags.map((tag) => {
                const active = selectedTagKeys.includes(tag.tag_key);
                return (<CommandItem key={tag.tag_key} value={tag.label || tag.tag_key} onSelect={() => {
                        setSelectedTagKeys((prev) => active ? prev.filter((k) => k !== tag.tag_key) : [...prev, tag.tag_key]);
                    }}>
                                <span className="mr-2 h-3 w-3 shrink-0 rounded-full border" style={{ background: tag.color ?? "#A855F7", borderColor: tag.color ?? "#A855F7" }}/>
                                <span className="flex-1 truncate">{tag.label || tag.tag_key}</span>
                                {active && <Check className="h-3.5 w-3.5 ml-1 shrink-0"/>}
                              </CommandItem>);
            })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>)}
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchItems} disabled={loading} title="Refresh">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>
              </Button>
              <Button size="sm" className="h-8" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1"/>
                {t('items.newItem')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : error ? (<div className="p-6 text-center text-destructive">{error}</div>) : items.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">{t('items.noItemsFound')}</p>
                  <p className="text-sm mt-1">
                    {(filterCategory !== "all" || filterRarity !== "all" || debouncedName || selectedTagKeys.length > 0)
                ? t('items.noItemsDesc')
                : t('items.noItemsNewDesc')}
                  </p>
                </div>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      {convPanelOpen && <TableHead id="items-table-header-link-conv" className="text-center w-10"/>}
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.itemCode')}</TableHead>
                      <TableHead className="text-center">{t('items.category')}</TableHead>
                      <TableHead className="text-center">{t('items.rarity')}</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('items.writePropsHeader')}</span>
                          <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExplanationTopic('write_props');
                setShowExplanationPanel(true);
            }} title="Learn more about Write Props">
                            <span className="text-[10px] font-bold">?</span>
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{t('items.updateQtyHeader')}</span>
                          <button type="button" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExplanationTopic('update_qty');
                setShowExplanationPanel(true);
            }} title="Learn more about Update Qty">
                            <span className="text-[10px] font-bold">?</span>
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">{t('items.stackable')}</TableHead>
                      {!convPanelOpen && <TableHead className="text-center">{t('items.gridHeader')}</TableHead>}
                      {!convPanelOpen && <TableHead className="text-center">{t('items.actionsHeader')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (<TableRow key={item.id} className="hover:bg-muted/40">
                        {convPanelOpen && (<TableCell id={`items-row-${item.id}-link-conv-cell`} className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button id={`items-row-${item.id}-link-conv-btn`} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-500" disabled={linkingItemId === item.id} onClick={() => handleLinkItemToConversation(item)}>
                                    {linkingItemId === item.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        : (<span id={`items-row-${item.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                          <Bot className="h-3.5 w-3.5"/>
                                          <Plus className="h-2.5 w-2.5 stroke-[3]"/>
                                        </span>)}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent id={`items-row-${item.id}-link-conv-tooltip`} side="top">
                                  {t('items.linkToConv')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>)}
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-0.5">
                            <Link href={`/games/${gameId}/items/${item.id}`} className="hover:text-primary hover:underline font-medium">
                              {item.name}
                            </Link>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-muted-foreground">{item.id}</span>
                              <CopyButton text={item.id} size="h-3 w-3"/>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.item_code ? (<div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
                              <CopyButton text={item.item_code} size="h-3 w-3"/>
                            </div>) : (<span className="text-muted-foreground text-xs">—</span>)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs w-fit mx-auto">
                            {prettyCategory(item.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <RarityBadge rarity={item.rarity}/>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center cursor-pointer hover:opacity-80" onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateItemField(item.id, { client_writable: !item.client_writable });
                }}>
                            <span className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${updatingItemId === item.id ? 'opacity-50' : ''} ${item.client_writable ? 'bg-green-100 border-green-300' : 'bg-muted border-muted-foreground'}`}>
                              <span className={`h-5 w-5 rounded-full transition-all ${item.client_writable ? 'ml-auto bg-green-500' : 'bg-muted-foreground'}`}/>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center cursor-pointer hover:opacity-80" onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateItemField(item.id, { allow_client_update_qty: !item.allow_client_update_qty });
                }}>
                            <span className={`inline-flex h-6 w-10 items-center rounded-full border px-0.5 transition-all ${updatingItemId === item.id ? 'opacity-50' : ''} ${item.allow_client_update_qty ? 'bg-blue-100 border-blue-300' : 'bg-muted border-muted-foreground'}`}>
                              <span className={`h-5 w-5 rounded-full transition-all ${item.allow_client_update_qty ? 'ml-auto bg-blue-500' : 'bg-muted-foreground'}`}/>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.is_stackable ? (<span className="text-green-500 text-sm font-medium">
                              {t('common.yes')} {item.max_stack_size != null ? item.max_stack_size.toLocaleString() : "∞"}
                            </span>) : (<span className="text-muted-foreground text-sm">{t('common.no')}</span>)}
                        </TableCell>
                        {!convPanelOpen && (<TableCell className="text-center text-sm text-muted-foreground">
                            {item.grid_width} × {item.grid_height}
                          </TableCell>)}
                        {!convPanelOpen && (<TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" asChild title="Edit">
                                  <Link href={`/games/${gameId}/items/${item.id}`}>
                                    <Pencil className="h-4 w-4"/>
                                  </Link>
                                </Button>
                            </div>
                          </TableCell>)}
                      </TableRow>))}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (<div className="flex items-center justify-between gap-3 mt-4 text-sm text-muted-foreground flex-wrap">
              <span>
                Page {currentPage} of {totalPages} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â {total} items
              </span>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}>
                  {t('common.previous')}
                </Button>
                <Button variant="outline" size="sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}>
                  {t('common.next')}
                </Button>
              </div>
            </div>)}
        </TabsContent>

        <TabsContent value="containers" className="space-y-4">
          <Tabs value={containerSubTab} onValueChange={handleContainerSubTabChange} className="space-y-4">
            <div className="-mx-4 px-4 overflow-x-auto sm:mx-0 sm:px-0">
              <TabsList className="w-auto inline-flex">
                <TabsTrigger value="definitions" className="whitespace-nowrap">{t('items.subTabDefinitions')}</TabsTrigger>
                <TabsTrigger value="slot-guide" className="whitespace-nowrap">{t('items.subTabSlotGuide')}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="slot-guide" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary"/>
                    {t('items.containerSlotGuideTitle')}
                  </CardTitle>
                  <CardDescription>
                    {t('items.containerSlotGuideDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">

                  {/* Overview */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t('items.containerSlotOverviewTitle')}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t('items.containerSlotOverviewText')}
                    </p>
                  </div>

                  <Separator />

                  {/* Diagram */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">{t('items.containerSlotDiagramTitle')}</h3>
                    <div className="border rounded-md p-4 bg-muted/20 overflow-x-auto">
                      <MermaidDiagram chart={(isDark) => `flowchart TB
  subgraph SETUP["ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â SETUP ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Definitions"]
    direction LR
    A["ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â¦ ItemDefinition\\nÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬\\ncategory: character\\nitem_code: warrior\\nid: uuid-warrior-def"]
    M["ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Slot Restrictions\\nÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬\\nslot_0: helmet\\nslot_1: armor\\nslot_2: boots\\nslot_3: gloves\\nslot_4: weapon\\nslot_5: shield"]
    B["ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â ContainerDefinition\\nÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬\\nname: hero_warrior_slots\\ntype: equipment\\ngrid: 6ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â1\\nlinked_item_def_id: ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“"]
    A -- "linked_item_definition_id ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢" --> B
    B -. "reverse lookup" .-> A
    M -. "attached metadata" .-> B
  end

  subgraph RUNTIME["ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“Ãƒâ€šÃ‚Â¶ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â RUNTIME ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Instances"]
    direction LR
    C["ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¦Ãƒâ€šÃ‚Â¸ InventoryItem\\nÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬\\nid: uuid-my-warrior\\nitem_definition_id:\\n  uuid-warrior-def"]
    D["ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ ContainerInstance\\nÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬\\nitem_container_definition_id:\\n  hero_warrior_slots\\nowner_user_id: player-uuid\\nslots: [0][1][2][3][ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â4][5]"]
    E["ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â InventoryItem\\nÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬\\nitem: sword\\ncontainer_id: D\\ngrid_x: 4  grid_y: 0"]
    C -- "grant ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ auto-creates" --> D
    D -. "owner_user_id (NOT item id)" .-> C
    E -- "POST /inventory/move ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ slot 4" --> D
  end

  B -- "instantiated from" --> D

  style A fill:${isDark ? "#1e3a5f" : "#eff6ff"},stroke:${isDark ? "#60a5fa" : "#93c5fd"},color:${isDark ? "#bfdbfe" : "#1e40af"}
  style B fill:${isDark ? "#431407" : "#fff7ed"},stroke:${isDark ? "#f97316" : "#fb923c"},color:${isDark ? "#fed7aa" : "#9a3412"}
  style M fill:${isDark ? "#1e293b" : "#f8fafc"},stroke:${isDark ? "#475569" : "#cbd5e1"},stroke-dasharray:4,color:${isDark ? "#94a3b8" : "#64748b"}
  style C fill:${isDark ? "#052e16" : "#f0fdf4"},stroke:${isDark ? "#4ade80" : "#86efac"},color:${isDark ? "#bbf7d0" : "#166534"}
  style D fill:${isDark ? "#422006" : "#fef9c3"},stroke:${isDark ? "#f59e0b" : "#fbbf24"},color:${isDark ? "#fde68a" : "#92400e"}
  style E fill:${isDark ? "#2e1065" : "#faf5ff"},stroke:${isDark ? "#a855f7" : "#c4b5fd"},color:${isDark ? "#e9d5ff" : "#6b21a8"}
  style SETUP fill:${isDark ? "#1c1c1e" : "#f8fafc"},stroke:${isDark ? "#374151" : "#e2e8f0"}
  style RUNTIME fill:${isDark ? "#1c1c1e" : "#f8fafc"},stroke:${isDark ? "#374151" : "#e2e8f0"}`} className="[&_svg]:max-w-full [&_svg]:h-auto"/>
                      <p className="text-xs text-muted-foreground text-center mt-2 italic">{t('items.containerSlotDiagramCaption')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 1 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                      {t('items.containerSlotStep1Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7">{t('items.containerSlotStep1Desc')}</p>
                    <div className="pl-7 space-y-2">
                      <div className="rounded-md border bg-muted/40 p-3 space-y-1.5 font-mono text-xs">
                        <div><span className="text-muted-foreground">name:</span> <span>"hero_warrior_slots"</span></div>
                        <div><span className="text-muted-foreground">container_type:</span> <span>"equipment"</span></div>
                        <div><span className="text-muted-foreground">grid_cols:</span> <span>6</span></div>
                        <div><span className="text-muted-foreground">grid_rows:</span> <span>1</span></div>
                        <div><span className="text-muted-foreground">is_portable:</span> <span>false</span></div>
                        <div><span className="text-muted-foreground">linked_item_definition_id:</span> <span>"&lt;hero_item_def_id&gt;"</span></div>
                      </div>
                      <p className="text-muted-foreground text-xs">{t('items.containerSlotStep1Note')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 2 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                      {t('items.containerSlotStep2Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7 leading-relaxed">{t('items.containerSlotStep2Desc')}</p>
                  </div>

                  <Separator />

                  {/* Step 3 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                      {t('items.containerSlotStep3Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7">{t('items.containerSlotStep3Desc')}</p>
                    <div className="pl-7 space-y-2">
                      <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1.5">
                        <div><span className="text-muted-foreground">"slot_0_allowed_tags":</span> <span>"helmet"</span></div>
                        <div><span className="text-muted-foreground">"slot_1_allowed_tags":</span> <span>"armor"</span></div>
                        <div><span className="text-muted-foreground">"slot_2_allowed_tags":</span> <span>"boots"</span></div>
                        <div><span className="text-muted-foreground">"slot_3_allowed_tags":</span> <span>"gloves"</span></div>
                        <div><span className="text-muted-foreground">"slot_4_allowed_tags":</span> <span>"weapon,sword,axe"</span></div>
                        <div><span className="text-muted-foreground">"slot_5_allowed_tags":</span> <span>"shield,offhand"</span></div>
                      </div>
                      <p className="text-muted-foreground text-xs">{t('items.containerSlotStep3Note')}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Step 4 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">4</span>
                      {t('items.containerSlotStep4Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7 leading-relaxed">{t('items.containerSlotStep4Desc')}</p>
                    <ul className="pl-7 list-disc list-inside text-muted-foreground space-y-1 text-xs">
                      <li><code className="bg-muted px-1 rounded">owner_user_id</code> ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â {t('items.containerSlotStep4Bullet1')}</li>
                      <li><code className="bg-muted px-1 rounded">item_container_definition_id</code> ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â {t('items.containerSlotStep4Bullet2')}</li>
                      <li>{t('items.containerSlotStep4Bullet3')}</li>
                    </ul>
                  </div>

                  <Separator />

                  {/* Step 5 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">5</span>
                      {t('items.containerSlotStep5Title')}
                    </h3>
                    <p className="text-muted-foreground pl-7 leading-relaxed">{t('items.containerSlotStep5Desc')}</p>
                    <div className="pl-7 space-y-2">
                      <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1">
                        <div className="text-muted-foreground font-sans text-[11px] mb-2">// POST /inventory/move - Equip vao slot 4 (weapon)</div>
                        <div><span className="text-muted-foreground">item_id:</span> <span>&lt;item_id_cÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â§n_equip&gt;</span></div>
                        <div><span className="text-muted-foreground">target_container_id:</span> <span>&lt;hero_equipment_container_id&gt;</span></div>
                        <div><span className="text-muted-foreground">grid_x:</span> <span>4</span></div>
                        <div><span className="text-muted-foreground">grid_y:</span> <span>0</span></div>
                      </div>
                      <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1">
                        <div className="text-muted-foreground font-sans text-[11px] mb-2">// POST /inventory/move - Unequip (ve main inventory)</div>
                        <div><span className="text-muted-foreground">item_id:</span> <span>&lt;item_id_cÃƒÆ’Ã‚Â¡Ãƒâ€šÃ‚ÂºÃƒâ€šÃ‚Â§n_unequip&gt;</span></div>
                        <div><span className="text-muted-foreground">target_container_id:</span> <span>&lt;player_main_inventory_container_id&gt;</span></div>
                        <div className="text-muted-foreground font-sans text-[11px] mt-1">// grid_x/grid_y optional - server tu tim vi tri trong</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Summary table */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t('items.containerSlotCompareTitle')}</h3>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">{t('items.containerSlotCompareCriteria')}</TableHead>
                            <TableHead className="text-xs">{t('items.containerSlotCompareEqSlotDef')}</TableHead>
                            <TableHead className="text-xs">{t('items.containerSlotCompareContainer')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareScope')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotScopeEq')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotScopeContainer')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareMultiHero')}</TableCell>
                            <TableCell className="text-xs text-destructive">{t('items.containerSlotMultiHeroEq')}</TableCell>
                            <TableCell className="text-xs text-amber-600 font-medium">{t('items.containerSlotMultiHeroContainer')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareRestrictions')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotRestrictEq')}</TableCell>
                            <TableCell className="text-xs text-green-600 font-medium">{t('items.containerSlotRestrictContainer')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-xs font-medium">{t('items.containerSlotCompareAutoCreate')}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{t('items.containerSlotAutoEq')}</TableCell>
                            <TableCell className="text-xs text-green-600 font-medium">{t('items.containerSlotAutoContainer')}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        <TabsContent value="definitions" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.containerDefinitions')}</h2>
              <p className="text-sm text-muted-foreground">
                {containerTotal > 0
                ? `${containerSearchDebounced ? `${filteredContainerDefs.length} ${t('items.of')} ` : ""}${containerTotal} ${containerTotal !== 1 ? t('items.definitions') : t('items.definition')}`
                : t('items.noContainerDefs')}
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                <Input placeholder={t('items.searchByNameOrCode')} value={containerSearch} onChange={(e) => setContainerSearch(e.target.value)} className="pl-8 h-8 w-56 text-sm"/>
                {containerSearch && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setContainerSearch("")} title={t('items.clearSearch')}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              <Button variant="outline" size="icon" onClick={fetchContainerDefs} title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4"/>
              </Button>
              <Button onClick={() => setShowCreateContainer(true)}>
                <Plus className="h-4 w-4 mr-2"/>
                {t('items.newContainer')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {containerLoading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : containerError ? (<div className="p-6 text-center text-destructive">{containerError}</div>) : filteredContainerDefs.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">
                    {containerSearchDebounced ? t('items.noMatchingContainers') : t('items.noContainerDefs')}
                  </p>
                  <p className="text-sm mt-1">
                    {containerSearchDebounced
                    ? t('items.noContainersMatchSearch').replace('{query}', containerSearchDebounced)
                    : t('items.clickNewContainerToCreate')}
                  </p>
                </div>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      {convPanelOpen && <TableHead id="containers-table-header-link-conv" className="text-center w-10"/>}
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.codeName')}</TableHead>
                      <TableHead>{t('items.type')}</TableHead>
                      <TableHead>{t('items.grid')}</TableHead>
                      <TableHead>{t('items.portable')}</TableHead>
                      <TableHead>{t('items.linkedItemDefinition')}</TableHead>
                      <TableHead className="text-right">{t('items.actionsHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContainerDefs.map((def) => {
                    const isExpanded = expandedContainerId === def.id;
                    const detail = containerDetailCache[def.id];
                    const isLoadingDetail = containerDetailLoading === def.id;
                    return (<Fragment key={def.id}>
                          <TableRow className={`hover:bg-muted/40 cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`} onClick={() => handleContainerRowClick(def)}>
                            {convPanelOpen && (<TableCell id={`containers-row-${def.id}-link-conv-cell`} className="text-center" onClick={(e) => e.stopPropagation()}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button id={`containers-row-${def.id}-link-conv-btn`} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" disabled={linkingContainerId === def.id} onClick={() => handleLinkContainerToConversation(def)}>
                                        {linkingContainerId === def.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                : (<span id={`containers-row-${def.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                              <Bot className="h-3.5 w-3.5"/>
                                              <Plus className="h-2.5 w-2.5 stroke-[3]"/>
                                            </span>)}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent id={`containers-row-${def.id}-link-conv-tooltip`} side="top">
                                      {t('items.linkToConv')}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>)}
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0"/>) : (<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0"/>)}
                                <span>{def.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {def.code_name ? (<div className="text-xs font-mono text-muted-foreground flex items-center gap-0.5" title={def.code_name}>
                                  <span className="truncate max-w-[180px]">{def.code_name}</span>
                                  <CopyButton text={def.code_name}/>
                                </div>) : (<span className="text-xs text-muted-foreground italic">?</span>)}
                            </TableCell>
                            <TableCell>
                              <ContainerTypeBadge type={def.container_type}/>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {def.grid_cols} ? {def.grid_rows}
                              <span className="text-xs ml-1">({def.grid_cols * def.grid_rows} {t('items.slots')})</span>
                            </TableCell>
                            <TableCell>
                              {def.is_portable ? (<span className="text-green-500 text-sm font-medium">{t('common.yes')}</span>) : (<span className="text-muted-foreground text-sm">{t('common.no')}</span>)}
                            </TableCell>
                            <TableCell className="text-sm max-w-[180px]">
                              {def.linked_item_definition_id ? (<span className="flex items-center gap-1">
                                  <span className="text-primary font-medium truncate" title={def.linked_item_definition_id}>
                                    {getItemName(def.linked_item_definition_id)}
                                  </span>
                                  <Link href={`/games/${gameId}/items/${def.linked_item_definition_id}`} title={t('items.goToItemDef')}>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary shrink-0 transition-colors"/>
                                  </Link>
                                </span>) : (<span className="text-muted-foreground italic text-xs">?</span>)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {def.container_type !== 'inventory' && (<Button variant="ghost" size="icon" title={t('common.delete')} className="text-destructive hover:text-destructive" onClick={(e) => {
                                e.stopPropagation();
                                setDeletingContainer(def);
                            }}>
                                    <Trash2 className="h-4 w-4"/>
                                  </Button>)}
                              </div>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (<TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={convPanelOpen ? 8 : 7} className="p-0">
                                <div className="px-10 py-4 space-y-4 border-l-2 border-primary/20 bg-primary/5 group/expand">
                                  {isLoadingDetail ? (<div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Loader2 className="h-4 w-4 animate-spin"/>
                                      {t('items.loadingDetailDots')}
                                    </div>) : (<>
                                      {/* ID & Name information */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.containerIdLabel')}</p>
                                          <div className="flex items-center gap-2 group/id">
                                            <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono break-all">{def.id}</code>
                                            <CopyButton text={def.id}/>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.name')}</p>
                                          <div className="flex items-center gap-1.5">
                                            {editingField?.id === def.id && editingField?.field === 'name' ? (<div className="flex items-center gap-1 min-w-0 flex-1">
                                                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs flex-1" autoFocus/>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                                  <Check className="h-4 w-4"/>
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                  <X className="h-4 w-4"/>
                                                </Button>
                                              </div>) : (<div className="flex items-center gap-1.5 group/edit">
                                                <span className="text-sm font-medium">{def.name}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity" onClick={() => { setEditingField({ id: def.id, field: 'name' }); setEditValue(def.name); }}>
                                                  <Pencil className="h-3 w-3"/>
                                                </Button>
                                              </div>)}
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.codeName')}</p>
                                          <div className="flex items-center gap-1.5">
                                            {editingField?.id === def.id && editingField?.field === 'code_name' ? (<div className="flex items-center gap-1 min-w-0 flex-1">
                                                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs flex-1 font-mono" autoFocus/>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                                  <Check className="h-4 w-4"/>
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                  <X className="h-4 w-4"/>
                                                </Button>
                                              </div>) : (<div className="flex items-center gap-1.5 group/edit min-w-0">
                                                <span className={`text-sm font-mono truncate ${def.code_name ? "text-foreground" : "text-muted-foreground italic"}`}>
                                                  {def.code_name ?? "—"}
                                                </span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/edit:opacity-100 transition-opacity" onClick={() => { setEditingField({ id: def.id, field: 'code_name' }); setEditValue(def.code_name ?? ""); }}>
                                                  <Pencil className="h-3 w-3"/>
                                                </Button>
                                              </div>)}
                                          </div>
                                        </div>
                                      </div>

                                      <Separator />

                                      {/* Details grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.containerType')}</p>
                                          <p className="text-sm font-medium capitalize">{def.container_type}</p>
                                        </div>
                                        
                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.dimensionsHeader')}</p>
                                          <div className="flex items-center gap-1.5 min-h-[20px]">
                                            {editingField?.id === def.id && editingField?.field === 'grid' ? (<div className="flex items-center gap-1">
                                                <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 w-12 text-xs text-center px-1"/>
                                                <span className="text-xs text-muted-foreground">ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â</span>

                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveInlineEdit}>
                                                  <Check className="h-4 w-4"/>
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                  <X className="h-4 w-4"/>
                                                </Button>
                                              </div>) : (<div className="flex items-center gap-1.5 group/edit">
                                                <p className="text-sm font-medium">{def.grid_cols} ? {def.grid_rows} ({def.grid_cols * def.grid_rows} {t('items.totalSlots')})</p>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity" onClick={() => {
                                        setEditingField({ id: def.id, field: 'grid' });
                                        setEditValue(String(def.grid_cols));
                                        setEditValue2(String(def.grid_rows));
                                    }}>
                                                  <Pencil className="h-3 w-3"/>
                                                </Button>
                                              </div>)}
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.portable')}</p>
                                          <p className="text-sm font-medium">{def.is_portable ? t('common.yes') : t('common.no')}</p>
                                        </div>

                                        {detail && (<div className="space-y-0.5">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.updatedAtLabel')}</p>
                                            <p className="text-[11px] text-muted-foreground">{new Date(detail.updated_at).toLocaleString()}</p>
                                          </div>)}
                                      </div>

                                      <Separator />

                                      {/* Linked Item + Instanced Per Item ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 3-col grid */}
                                      <div className="grid grid-cols-3 gap-6">

                                      {/* Linked Item */}
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.linkedItemDefinition')}</p>
                                        <div className="flex items-center gap-1.5">
                                          {editingField?.id === def.id && editingField?.field === 'linked_item_id' ? (<div className="flex flex-col gap-1.5 flex-1">
                                              <div className="flex items-center gap-1.5">
                                                <input type="checkbox" id="containerItemsOnly" checked={containerItemsOnly} onChange={(e) => setContainerItemsOnly(e.target.checked)} className="h-3.5 w-3.5 cursor-pointer"/>
                                                <label htmlFor="containerItemsOnly" className="text-[10px] text-muted-foreground cursor-pointer select-none">
                                                  {t('items.showContainerItemsOnly') ?? 'Show container items only'}
                                                </label>
                                              </div>
                                              <div className="flex items-center gap-1 flex-1">
                                              <div className="relative flex-1">
                                                <Select value={editValue || "none"} onValueChange={(v) => setEditValue(v === "none" ? "" : v)}>
                                                  <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder={t('items.selectItem')}/>
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="none">{t('items.noLinkedItemOption')}</SelectItem>
                                                    {(containerItemsOnly
                                        ? containerAllItems.filter(i => i.category === 'container' || i.category === 'character' || i.category === 'other')
                                        : containerAllItems).map(item => (<SelectItem key={item.id} value={item.id}>
                                                        {item.name} {item.item_code ? `(${item.item_code})` : ""}
                                                      </SelectItem>))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSaveInlineEdit}>
                                                <Check className="h-4 w-4"/>
                                              </Button>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingField(null)}>
                                                <X className="h-4 w-4"/>
                                              </Button>
                                            </div>
                                            </div>) : (<div className="flex items-center gap-2 group/edit">
                                              {def.linked_item_definition_id ? (<div className="flex items-center gap-2">
                                                  <Link href={`/games/${gameId}/items/${def.linked_item_definition_id}`} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline" title={t('items.goToItemDef')}>
                                                    {getItemName(def.linked_item_definition_id)}
                                                    <ExternalLink className="h-3.5 w-3.5 shrink-0"/>
                                                  </Link>
                                                </div>) : (<span className="text-sm text-muted-foreground italic">{t('items.noLinkedItem')}</span>)}
                                              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover/expand:opacity-100 transition-opacity" onClick={() => {
                                        setEditingField({ id: def.id, field: 'linked_item_id' });
                                        setEditValue(def.linked_item_definition_id || "");
                                    }}>
                                                <Pencil className="h-3 w-3"/>
                                              </Button>
                                            </div>)}
                                        </div>
                                      </div>

                                      {/* Instanced Per Item ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â only when linked item exists */}
                                      {def.linked_item_definition_id ? (<div className="flex items-center gap-3">
                                          <Switch checked={def.instanced_per_item ?? false} onCheckedChange={(checked) => handleUpdateContainerField(def.id, { instanced_per_item: checked })}/>
                                          <div className="space-y-0.5">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.instancedPerItem')}</p>
                                            <p className="text-xs text-muted-foreground">{t('items.instancedPerItemDesc')}</p>
                                          </div>
                                        </div>) : <div />}

                                      </div>{/* end 3-col grid */}

                                      {/* Metadata */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between group/meta-header">
                                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('items.fullMetadata')}</p>
                                          {editingField?.id === def.id && editingField?.field === 'metadata' && (<div className="flex items-center gap-1">
                                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                                        setEditingField(null);
                                        // Reset to cached version
                                        const current = containerDetailCache[def.id] || def;
                                        const rows = Object.entries(current.metadata || {}).map(([k, v]) => ({
                                            k,
                                            v: typeof v === 'object' ? JSON.stringify(v) : String(v)
                                        }));
                                        setMetadataRows(rows.length > 0 ? rows : [{ k: "", v: "" }]);
                                    }}>{t('common.cancel')}</Button>
                                              <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveInlineEdit}>{t('common.save')}</Button>
                                            </div>)}
                                        </div>
                                        
                                        <div className="space-y-1.5 py-1">
                                          {metadataRows.map((row, i) => (<div key={i} className="flex gap-1.5 items-center group/meta-row">
                                              <Input placeholder="Key" value={row.k} onChange={e => {
                                        const next = [...metadataRows];
                                        next[i] = { ...next[i], k: e.target.value };
                                        setMetadataRows(next);
                                        setEditingField({ id: def.id, field: 'metadata' }); // set as dirty
                                    }} className="w-[140px] h-7 text-[11px] font-mono bg-background/30"/>
                                              <span className="text-muted-foreground text-[10px]">:</span>
                                              <Input placeholder="Value" value={row.v} onChange={e => {
                                        const next = [...metadataRows];
                                        next[i] = { ...next[i], v: e.target.value };
                                        setMetadataRows(next);
                                        setEditingField({ id: def.id, field: 'metadata' }); // set as dirty
                                    }} className="flex-1 h-7 text-[11px] font-mono bg-background/30"/>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive opacity-0 group-hover/meta-row:opacity-100 transition-opacity" onClick={() => {
                                        setMetadataRows(metadataRows.filter((_, idx) => idx !== i));
                                        setEditingField({ id: def.id, field: 'metadata' });
                                    }}>
                                                <X className="h-3.5 w-3.5"/>
                                              </Button>
                                            </div>))}
                                          
                                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary transition-colors" onClick={() => {
                                    setMetadataRows([...metadataRows, { k: "", v: "" }]);
                                    setEditingField({ id: def.id, field: 'metadata' });
                                }}>
                                            <Plus className="h-3 w-3 mr-1"/>
                                            {t('common.add' as any)}
                                          </Button>
                                        </div>
                                      </div>

                                      {/* Created At */}
                                      {detail && (<div className="text-[11px] text-muted-foreground pt-1">
                                          <span>{t('items.createdAtLabel')}: {new Date(detail.created_at).toLocaleString()}</span>
                                        </div>)}
                                    </>)}
                                </div>
                              </TableCell>
                            </TableRow>)}
                        </Fragment>);
                })}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>

          {/* Pagination */}
          {containerTotalPages > 1 && (<div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                {t('crafting.pageLabel')} {containerCurrentPage} {t('crafting.pageOf')} {containerTotalPages} - {containerTotal} {t('items.definitions')}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={containerOffset === 0} onClick={() => setContainerOffset(Math.max(0, containerOffset - CONTAINER_LIMIT))}>
                  {t('common.previous')}
                </Button>
                <Button variant="outline" size="sm" disabled={containerOffset + CONTAINER_LIMIT >= containerTotal} onClick={() => setContainerOffset(containerOffset + CONTAINER_LIMIT)}>
                  {t('common.next')}
                </Button>
              </div>
            </div>)}
          </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="gacha" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {t('items.gachaPacksTitle')}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="inline-flex items-center justify-center rounded-full h-5 w-5 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors" title={t('items.gachaAntiSpamTitle')}>
                      <AlertTriangle className="h-3.5 w-3.5"/>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500"/>
                        {t('items.gachaAntiSpamTitle')}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6 text-sm">
                      {/* Flow */}
                      <div>
                        <h3 className="font-semibold text-base mb-2">{t('items.gachaAntiSpamFlow')}</h3>
                        <div className="space-y-1 rounded-md bg-muted/50 border px-3 py-3 font-mono text-xs leading-relaxed">
                          <p>{t('items.gachaAntiSpamFlowStep1')}</p>
                          <p className="pl-3 text-muted-foreground">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {t('items.gachaAntiSpamFlowStep2')}</p>
                          <p className="pl-3 text-muted-foreground">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {t('items.gachaAntiSpamFlowStep3')}</p>
                          <p className="pl-3 text-muted-foreground">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {t('items.gachaAntiSpamFlowStep4')}</p>
                          <p className="pl-8 text-muted-foreground">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {t('items.gachaAntiSpamFlowStep4a')}</p>
                          <p className="pl-8 text-muted-foreground">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {t('items.gachaAntiSpamFlowStep4b')}</p>
                          <p className="pl-3 text-muted-foreground">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ {t('items.gachaAntiSpamFlowStep5')}</p>
                        </div>
                      </div>

                      {/* Calc */}
                      <div>
                        <h3 className="font-semibold text-base mb-2">{t('items.gachaAntiSpamCalcTitle')}</h3>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>{t('items.gachaAntiSpamCalcLine1')}</li>
                          <li>{t('items.gachaAntiSpamCalcLine2')}</li>
                          <li className="text-destructive font-medium">{t('items.gachaAntiSpamCalcLine3')}</li>
                        </ul>
                      </div>

                      {/* Reset */}
                      <div>
                        <h3 className="font-semibold text-base mb-2">{t('items.gachaAntiSpamResetTitle')}</h3>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>{t('items.gachaAntiSpamResetLine1')}</li>
                          <li>{t('items.gachaAntiSpamResetLine2')}</li>
                          <li className="font-medium text-foreground">{t('items.gachaAntiSpamResetLine3')}</li>
                        </ul>
                      </div>

                      {/* Example */}
                      <div>
                        <h3 className="font-semibold text-base mb-2">{t('items.gachaAntiSpamExampleTitle')}</h3>
                        <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 border px-3 py-3 text-xs leading-relaxed font-mono text-foreground/80">
        {`00:00  Player opens pack #1   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ count=1, set EXPIRE 60s  ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦
00:02  Player opens pack #2   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ count=2                  ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦
...
00:15  Player opens pack #10  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ count=10                 ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦
00:16  Player opens pack #11  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ count=11 > 10            ÃƒÆ’Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒâ€¦Ã¢â‚¬â„¢ 429
00:30  Resend old idempotency key                        ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ cached
01:00  Key expires, counter resets
01:01  Player opens pack #1   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ count=1, set EXPIRE 60s  ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦`}
                        </pre>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {gameLimits?.max_gacha_packs != null
                ? <>
                      <span className={gachaPacks.length >= gameLimits.max_gacha_packs ? "text-destructive font-medium" : ""}>
                        {gachaPacks.length} / {gameLimits.max_gacha_packs} {t('items.gachaPacksUnit')}
                      </span>
                      <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                        <span className={`block h-full rounded-full transition-all ${gachaPacks.length >= gameLimits.max_gacha_packs ? "bg-destructive" : gachaPacks.length / gameLimits.max_gacha_packs >= 0.8 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min((gachaPacks.length / (gameLimits.max_gacha_packs || 1)) * 100, 100)}%` }}/>
                      </span>
                      <Link href={`/games/${gameId}/plugins`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors" title={t('items.managePlugins')}>
                        <Hammer className="h-3.5 w-3.5"/>
                      </Link>
                    </>
                : `${gachaPacks.length} ${t('items.gachaPacksConfigured')}`}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                <Input id="gacha-search-input" placeholder={t('items.searchByNameOrId')} value={gachaSearch} onChange={(e) => setGachaSearch(e.target.value)} className="pl-8 h-8 w-56 text-sm"/>
                {gachaSearch && (<button id="gacha-search-clear-btn" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setGachaSearch("")} title={t('items.clearSearch')}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              <Button variant="outline" size="icon" onClick={fetchGachaData} title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4"/>
              </Button>
              <Button size="sm" onClick={gachaOpenCreate} disabled={!!(gameLimits?.max_gacha_packs != null && gachaPacks.length >= gameLimits.max_gacha_packs)}>
                <Plus className="h-4 w-4 mr-1.5"/>
                {t('items.newGachaPack')}
              </Button>
            </div>
          </div>

          {/* Loading / Error */}
          {gachaLoading ? (<div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full"/>)}
            </div>) : gachaError ? (<Card className="border-destructive">
              <CardContent className="pt-6 text-destructive text-sm">{gachaError}</CardContent>
            </Card>) : gachaPacks.length === 0 ? (<Card className="border-dashed">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <Dices className="h-10 w-10 text-muted-foreground/40"/>
                <p className="text-muted-foreground">{t('items.noGachaPacks')}</p>
                <Button onClick={gachaOpenCreate}><Plus className="h-4 w-4 mr-2"/>{t('items.createFirstPack')}</Button>
              </CardContent>
            </Card>) : filteredGachaPacks.length === 0 ? (<Card className="border-dashed">
              <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40"/>
                <p className="text-muted-foreground text-sm">{t('items.noMatchingContainers')}</p>
                <Button variant="outline" size="sm" onClick={() => setGachaSearch("")}>{t('items.clearSearch')}</Button>
              </CardContent>
            </Card>) : (<div id="gacha-packs-list" className="space-y-3">
              {filteredGachaPacks.map((pack) => {
                    const totalWeight = pack.item_pool.reduce((s, e) => s + e.weight, 0);
                    const isExpanded = expandedPack === pack.id;
                    return (<Card key={pack.id} className={`transition-all ${!pack.is_enabled ? "opacity-60" : ""}`}>
                    {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Clickable header row ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
                    <div className="cursor-pointer select-none" onClick={() => setExpandedPack(isExpanded ? null : pack.id)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {/* Chevron */}
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0"/>
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0"/>}

                          {/* Col 1: Name + ID */}
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base truncate">{pack.name}</CardTitle>
                              <Badge variant={pack.is_enabled ? "default" : "secondary"} className="text-xs shrink-0">
                                {pack.is_enabled ? t('items.enabled') : t('items.disabled')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                              <span>ID: {pack.id}</span>
                              <CopyButton text={pack.id} size="h-3 w-3"/>
                            </div>
                            {pack.code_name && (<div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                <span>Code: {pack.code_name}</span>
                                <CopyButton text={pack.code_name} size="h-3 w-3"/>
                              </div>)}
                          </div>

                          {/* Col 2: Keys */}
                          <div className="w-52 shrink-0 text-sm text-muted-foreground">
                            {(pack.key_requirements ?? []).length === 0 ? (
                              <span className="italic text-xs">{t('items.noKeyRequired')}</span>
                            ) : pack.key_requirements.length === 1 ? (
                              <span>
                                - <strong className="text-foreground">{pack.key_requirements[0].quantity} x</strong> {gachaItemShortName(pack.key_requirements[0].item_definition_id)}
                              </span>
                            ) : (
                              <span>- {pack.key_requirements.length} {t('items.gachaKeysCount')}</span>
                            )}
                          </div>

                          {/* Col 3: Collect destination */}
                          <div className="w-36 shrink-0 text-sm text-muted-foreground">
                            <span className="inline-flex flex-col items-start px-2 py-1 rounded text-xs font-medium border bg-muted/40 leading-tight">
                              <span className="text-muted-foreground">{t('items.deliveryToLabel')}</span>
                              <span className="text-foreground">{pack.collect_destination === "inventory" ? t('items.collectDestinationMainInventoryShort') : t('items.collectDestinationMailboxShort')}</span>
                            </span>
                          </div>

                          {/* Col 4: Items in pool */}
                          <div className="w-28 shrink-0 text-sm text-muted-foreground">
                            {pack.item_pool.length} {t('items.itemsUnit')}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch checked={pack.is_enabled} onCheckedChange={() => handleGachaToggle(pack)} disabled={togglingId === pack.id} title={pack.is_enabled ? t('items.disablePack') : t('items.enablePack')} onClick={(e) => e.stopPropagation()}/>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); gachaOpenEdit(pack); }}>
                              <Pencil className="h-3.5 w-3.5"/>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingPack(pack); }}>
                              <Trash2 className="h-3.5 w-3.5"/>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </div>

                    {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Expanded detail ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
                    {isExpanded && (<>
                        <Separator />
                        <CardContent className="pt-4 pb-4">
                          <div className="grid grid-cols-5 gap-4 items-start">
                            <div className="col-span-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('items.keyRequirements')}</p>
                              {(pack.key_requirements ?? []).length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">{t('items.noKeyRequired')}</p>
                              ) : (
                                <div className="rounded-md border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs h-8 w-8" />
                                        <TableHead className="text-xs h-8">{t('items.name')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-12">{t('items.quantity')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(pack.key_requirements ?? []).map((kr, i) => {
                                        const item = gachaAllItems.find((x) => x.id === kr.item_definition_id);
                                        return (
                                          <TableRow key={i}>
                                            <TableCell className="text-xs py-2 w-8">
                                              <Link href={`/games/${gameId}/items/${kr.item_definition_id}`} target="_blank" title={t('items.goToItemDef')}>
                                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                                              </Link>
                                            </TableCell>
                                            <TableCell className="text-xs py-2">
                                              {item ? (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-medium">{item.name}</span>
                                                  {item.item_code && <code className="text-muted-foreground font-mono text-[11px]">{item.item_code}</code>}
                                                  {item.rarity && <RarityBadge rarity={item.rarity} />}
                                                </div>
                                              ) : (
                                                <code className="font-mono text-[11px] text-muted-foreground">{kr.item_definition_id.slice(0, 8)}...</code>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs py-2 text-right font-semibold tabular-nums">{kr.quantity}x</TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>

                            <div className="col-span-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('items.dropTable')}</p>
                              {pack.item_pool.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No items in pool</p>
                              ) : (
                                <div className="rounded-md border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs h-8 w-8" />
                                        <TableHead className="text-xs h-8">{t('items.name')}</TableHead>
                                        <TableHead className="text-xs h-8 w-24">{t('items.rarityHeader')}</TableHead>
                                        <TableHead className="text-xs h-8">{t('items.dropRate')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-24">{t('items.weight')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-14">Min</TableHead>
                                        <TableHead className="text-xs h-8 text-right w-14">Max</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {[...pack.item_pool]
                                        .sort((a, b) => b.weight - a.weight)
                                        .map((entry, i) => {
                                          const item = gachaAllItems.find((x) => x.id === entry.item_definition_id);
                                          const pct = totalWeight > 0 ? (entry.weight / totalWeight) * 100 : 0;
                                          const rarity = entry.rarity ?? item?.rarity;
                                          return (
                                            <TableRow key={i}>
                                              <TableCell className="text-xs py-2 w-8">
                                                <Link href={`/games/${gameId}/items/${entry.item_definition_id}`} target="_blank" title={t('items.goToItemDef')}>
                                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                                                </Link>
                                              </TableCell>
                                              <TableCell className="text-xs py-2">
                                                {item ? (
                                                  <div>
                                                    <span className="font-medium">{item.name}</span>
                                                    {item.item_code && <code className="ml-1.5 text-muted-foreground font-mono text-[11px]">{item.item_code}</code>}
                                                  </div>
                                                ) : (
                                                  <code className="font-mono text-[11px] text-muted-foreground">{entry.item_definition_id.slice(0, 8)}...</code>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs py-2">
                                                {rarity ? <RarityBadge rarity={rarity} /> : <span className="text-muted-foreground">-</span>}
                                                <div className="flex items-center gap-2">
                                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                                                  </div>
                                                  <span className="tabular-nums text-muted-foreground w-16 text-right shrink-0">{formatPct(pct)}</span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums text-muted-foreground">{entry.weight.toLocaleString()}</TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums font-medium">{entry.quantity_min}</TableCell>
                                              <TableCell className="text-xs py-2 text-right tabular-nums font-medium">{entry.quantity_max}</TableCell>
                                            </TableRow>
                                          );
                                        })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </>)}
                  </Card>);
                })}
            </div>)}
        </TabsContent>
        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â GENERATORS TAB ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â */}
        <TabsContent value="generators" className="space-y-4">
          <GeneratorTab studioId={studioId} gameId={gameId} generatorItems={generatorItems} setGeneratorItems={setGeneratorItems} generatorLoading={generatorLoading} setGeneratorLoading={setGeneratorLoading} generatorError={generatorError} setGeneratorError={setGeneratorError} activeTab={activeTab} refreshKey={generatorRefreshKey} onAddGenerator={() => {
            setCreateInitCategory("generator" as ItemCategory);
            setShowCreate(true);
        }}/>
        </TabsContent>
        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â EQUIPMENTS TAB ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â */}
        <TabsContent value="equipments" className="space-y-4">
          <EquipmentsTab gameId={gameId} slots={equipmentSlots} setSlots={setEquipmentSlots} loading={equipmentLoading} setLoading={setEquipmentLoading} error={equipmentError} setError={setEquipmentError} activeTab={activeTab} maxEquipmentSlots={maxEquipmentSlots} equipmentSlotsUsage={equipmentSlotsUsage} onLoadGameInfo={loadGameInfo}/>
        </TabsContent>
        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â TAGS TAB ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â */}
        <TabsContent value="tags" className="space-y-4">
          <TagsTab gameId={gameId} tags={itemTags} setTags={setItemTags} loading={tagsLoading} setLoading={setTagsLoading} error={tagsError} setError={setTagsError} activeTab={activeTab}/>
        </TabsContent>
        <TabsContent value="preset" className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{t('items.presetsTitle')}</h2>
              {(() => {
                    const used = presetDefs.length;
                    const max = 500;
                    const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
                    return (<p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className={used >= max ? "text-destructive font-medium" : ""}>
                      {used.toLocaleString()} / {max.toLocaleString()}
                    </span>
                    <span className="inline-block h-1.5 w-24 rounded-full bg-muted overflow-hidden align-middle">
                      <span className={`block h-full rounded-full transition-all ${used >= max ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }}/>
                    </span>
                    <span className="text-xs text-muted-foreground">{t('items.fixedLimitNoUpgrade')}</span>
                    {presetSearchDebounced && (<span className="text-xs text-muted-foreground">({filteredPresetDefs.length} {t('items.matching')})</span>)}
                  </p>);
                })()}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                <Input placeholder={t('items.searchByNameTypeOrId')} value={presetSearch} onChange={(e) => setPresetSearch(e.target.value)} className="pl-8 h-8 w-64 text-sm"/>
                {presetSearch && (<button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setPresetSearch("")} title={t('items.clearSearch')}>
                    <X className="h-3.5 w-3.5"/>
                  </button>)}
              </div>
              <Button variant="outline" size="icon" onClick={fetchPresetDefs} title={t('common.refresh')}>
                <RefreshCw className="h-4 w-4"/>
              </Button>
              <Button onClick={() => setShowCreatePreset(true)}>
                <Plus className="h-4 w-4 mr-2"/>
                {t('items.newPresetDefinition')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {presetLoading ? (<div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full"/>))}
                </div>) : presetError ? (<div className="p-6 text-center text-destructive">{presetError}</div>) : filteredPresetDefs.length === 0 ? (<div className="p-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30"/>
                  <p className="text-lg font-medium">
                    {presetSearchDebounced ? t('items.noMatchingPresets') : t('items.noPresetDefs')}
                  </p>
                  <p className="text-sm mt-1">
                    {presetSearchDebounced
                        ? t('items.noPresetsMatchSearch').replace('{query}', presetSearchDebounced)
                        : t('items.clickNewPresetToCreate')}
                  </p>
                </div>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      {convPanelOpen && <TableHead className="text-center w-12"/>}
                      <TableHead>{t('items.name')}</TableHead>
                      <TableHead>{t('items.codeName')}</TableHead>
                      <TableHead>{t('items.presetType')}</TableHead>
                      <TableHead>{t('items.maxSlots')}</TableHead>
                      <TableHead>{t('items.metadata')}</TableHead>
                      <TableHead className="text-right">{t('items.actionsHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPresetDefs.map((def) => (<TableRow key={def.id} className="hover:bg-muted/40">
                        {convPanelOpen && (<TableCell id={`presets-row-${def.id}-link-conv-cell`} className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button id={`presets-row-${def.id}-link-conv-btn`} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-500" disabled={linkingPresetId === def.id} onClick={() => handleLinkPresetToConversation(def)}>
                                    {linkingPresetId === def.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                : (<span id={`presets-row-${def.id}-link-conv-icon`} className="inline-flex items-center gap-[1px]">
                                          <Bot className="h-3.5 w-3.5"/>
                                          <Plus className="h-2.5 w-2.5 stroke-[3]"/>
                                        </span>)}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent id={`presets-row-${def.id}-link-conv-tooltip`} side="top">
                                  {t('items.linkToConv')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>)}
                        <TableCell className="font-medium">
                          {def.name}
                          <div className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-0.5" title={def.id}>
                            <span className="truncate max-w-[180px]">{def.id}</span>
                            <CopyButton text={def.id}/>
                          </div>
                        </TableCell>
                        <TableCell>
                          {def.code_name ? (<div className="text-xs font-mono text-muted-foreground flex items-center gap-0.5" title={def.code_name}>
                              <span className="truncate max-w-[180px]">{def.code_name}</span>
                              <CopyButton text={def.code_name}/>
                            </div>) : (<span className="text-xs text-muted-foreground italic">?</span>)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border bg-blue-500/15 text-blue-400 border-blue-400/40 capitalize">
                            {def.preset_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {def.max_slots}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {Object.keys(def.metadata ?? {}).length > 0
                            ? Object.entries(def.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : <span className="italic">?</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" title={t('common.edit')} onClick={() => setEditingPreset(def)}>
                              <Pencil className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" title={t('common.delete')} className="text-destructive hover:text-destructive" onClick={() => setDeletingPreset(def)}>
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      { /* Create Item Modal */ }
      <CreateItemDefinitionDialog
        open={showCreate}
        studioId={studioId}
        gameId={gameId}
        onCreated={(_id) => {
          fetchItems();
          loadGameInfo();
          if (activeTab === "generators")
            setGeneratorRefreshKey((k) => k + 1);
          if (activeTab === "gacha")
            fetchGachaData();
        }}
        onClose={() => {
          setShowCreate(false);
          setCreateInitCategory(undefined);
        }}
        categories={categories}
        rarities={rarities}
        initialCategory={createInitCategory}
      />
      { /* Create Container Definition Modal */ }
      <CreateContainerDefinitionDialog
        open={showCreateContainer}
        gameId={gameId}
        allItems={containerAllItems}
        containerTypeOptions={containerTypeOptions}
        initialValues={createContainerInitialValues}
        onCreated={(id) => {
          fetchContainerDefs();
          loadGameInfo();
          if (createContainerConvContext) {
            const { turnId, responseIdx, containerIdx } = createContainerConvContext;
            window.dispatchEvent(new CustomEvent('ss:container-created', { detail: { containerId: id, containerName: createContainerInitialValues?.name, containerCodeName: createContainerInitialValues?.code_name, turnId, responseIdx, containerIdx } }));
          }
        }}
        onClose={() => {
          setShowCreateContainer(false);
          setCreateContainerInitialValues(undefined);
          setCreateContainerConvContext(undefined);
        }}
      />
      {editingContainer && (
        <EditContainerDefinitionDialog
          open={!!editingContainer}
          gameId={gameId}
          definition={editingContainer}
          initialValues={editingContainerDraft}
          allItems={containerAllItems}
          onUpdated={(updated) => {
            fetchContainerDefs();
            loadGameInfo();
            if (editingContainerConvContext) {
              const { turnId, responseIdx, containerIdx } = editingContainerConvContext;
              window.dispatchEvent(new CustomEvent('ss:container-updated', {
                detail: {
                  containerId: updated.id,
                  containerName: updated.name,
                  containerCodeName: updated.code_name,
                  turnId,
                  responseIdx,
                  containerIdx,
                },
              }));
            }
          }}
          onClose={() => {
            setEditingContainer(null);
            setEditingContainerDraft(undefined);
            setEditingContainerConvContext(undefined);
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("editContainer");
            const nextQuery = newParams.toString();
            router.replace(nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname, { scroll: false });
          }}
        />
      )}
      {/* Delete Container Definition Confirmation */}
      {deletingContainer && (
        <Dialog open={!!deletingContainer} onOpenChange={(v) => {
          if (!v)
            setDeletingContainer(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('items.deleteContainerTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('items.deleteContainerConfirm')}{" "}
              <span className="font-semibold text-foreground">"{deletingContainer.name}"</span>?
              {t('items.cannotUndone')}
            </p>
            {deletingContainer.container_type === 'inventory' && (
              <p className="text-xs text-destructive mt-1">{t('items.systemContainerCannotDelete')}</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={deleteContainerLoading}>{t('common.cancel')}</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteContainer} disabled={deleteContainerLoading || deletingContainer.container_type === 'inventory'}>
                {deleteContainerLoading ? t('items.deleting') : t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
{ /* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Gacha Create / Edit Sheet ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */ }
<Sheet open={gachaSheetOpen} onOpenChange={(open) => {
        if (!open)
            gachaCloseSheet();
    }}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editingPack ? `${t('items.editPackPrefix')}: ${editingPack.name}` : t('items.newGachaPack')}</SheetTitle>
            <SheetDescription className="text-xs">
              {t('items.gachaSheetDesc')}
            </SheetDescription>
            {editingPack && (<div className="flex items-center gap-1 pt-1">
                <p className="text-xs font-mono text-muted-foreground">
                  ID: {editingPack.id}
                </p>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" title={t('items.copyId')} onClick={(event) => {
            const text = editingPack.id;
            console.log('[CopyPackId] clicked, text:', text);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(() => console.log('[CopyPackId] Clipboard API success'))
                    .catch((err) => console.warn('[CopyPackId] Clipboard API failed:', err));
            }
            else {
                const sheetContent = (event.currentTarget as HTMLElement).closest('[role="dialog"]') ?? document.body;
                console.log('[CopyPackId] container:', sheetContent);
                const el = document.createElement('textarea');
                el.value = text;
                el.style.position = 'fixed';
                el.style.top = '0';
                el.style.left = '0';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
                sheetContent.appendChild(el);
                el.focus();
                el.select();
                console.log('[CopyPackId] selectionStart:', el.selectionStart, 'selectionEnd:', el.selectionEnd);
                const result = document.execCommand('copy');
                console.log('[CopyPackId] execCommand result:', result);
                sheetContent.removeChild(el);
            }
            setCopiedPackId(true);
            setTimeout(() => setCopiedPackId(false), 1500);
        }}>
                  {copiedPackId
            ? <Check className="h-3 w-3 text-green-500"/>
            : <Copy className="h-3 w-3"/>}
                </button>
              </div>)}
          </SheetHeader>

          <div className="space-y-5">
            {/* Name + Enabled */}
            <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="gacha-name">{t('items.name')} <span className="text-destructive">*</span></Label>
                <Input id="gacha-name" placeholder={t('items.gachaNamePlaceholder')} value={gachaForm.name} onChange={(e) => {
        const v = e.target.value;
        setGachaForm((f) => ({
            ...f,
            name: v,
            ...(gachaAutoSlug ? { code_name: toSlugUnderscore(v) } : {}),
        }));
    }} disabled={formSaving}/>
              </div>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label htmlFor="gacha-enabled" className="flex items-center gap-3 h-10 px-3 rounded-md border border-border bg-muted/30 cursor-pointer select-none">
                      <Switch id="gacha-enabled" checked={gachaForm.is_enabled} onCheckedChange={(v) => setGachaForm((f) => ({ ...f, is_enabled: v }))} disabled={formSaving}/>
                      <span className="text-sm font-medium">{t('items.enabled')}</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    {t('items.playersCanOpen')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Code Name */}
            <div className="space-y-1.5">
              <Label htmlFor="gacha-code-name">
                {t('items.gachaCodeNameLabel')}{" "}
                <span className="text-muted-foreground text-xs font-normal">({t('items.gachaCodeNameHint')})</span>
              </Label>
              <div className="flex gap-2">
                <Input id="gacha-code-name" placeholder={t('items.gachaCodeNamePlaceholder')} value={gachaForm.code_name} onChange={(e) => {
        setGachaAutoSlug(false);
        setGachaForm((f) => ({ ...f, code_name: e.target.value }));
    }} className="font-mono" disabled={formSaving}/>
                <Button type="button" variant={gachaAutoSlug ? "default" : "outline"} size="icon" className="shrink-0" title={gachaAutoSlug ? t('items.autoSlugOn') : t('items.autoSlugOff')} onClick={() => {
        const next = !gachaAutoSlug;
        setGachaAutoSlug(next);
        if (next)
            setGachaForm((f) => ({ ...f, code_name: toSlugUnderscore(f.name) }));
    }}>
                  <Wand2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Collect Destination */}
            <div className="space-y-1.5">
              <Label htmlFor="gacha-collect-destination">{t('items.collectDestination')}</Label>
              <Select value={gachaForm.collect_destination} onValueChange={(v) => setGachaForm((f) => ({ ...f, collect_destination: v as "mailbox" | "inventory" }))}>
                <SelectTrigger id="gacha-collect-destination" disabled={formSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mailbox">{t('items.collectDestinationMailbox')}</SelectItem>
                  <SelectItem value="inventory">{t('items.collectDestinationMainInventory')}</SelectItem>
                </SelectContent>
              </Select>
              {gachaForm.collect_destination === "inventory" && (<p className="text-xs text-muted-foreground">{t('items.collectDestinationInventoryHint')}</p>)}
            </div>

            {/* Mailbox message (only when destination is mailbox) */}
            {gachaForm.collect_destination === "mailbox" && (<div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gacha-mailbox-title">{t('items.gachaMailboxTitle')}</Label>
                  <Input id="gacha-mailbox-title" value={gachaForm.mailbox_title} onChange={(e) => setGachaForm((f) => ({ ...f, mailbox_title: e.target.value }))} placeholder={t('items.gachaMailboxTitlePlaceholder')} disabled={formSaving}/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gacha-mailbox-body">{t('items.gachaMailboxBody')}</Label>
                  <Textarea id="gacha-mailbox-body" value={gachaForm.mailbox_body} onChange={(e) => setGachaForm((f) => ({ ...f, mailbox_body: e.target.value }))} placeholder={t('items.gachaMailboxBodyPlaceholder')} disabled={formSaving} rows={3}/>
                </div>
                <p className="text-xs text-muted-foreground">{t('items.gachaMailboxHint')}</p>
              </div>)}

            <Separator />

            {/* Key Requirements */}
            <div className="space-y-3">
              <div>
                <Label className="text-base">{t('items.keyRequirements')}</Label>
                <p className="text-xs text-muted-foreground">{t('items.keyReqDesc')}</p>
              </div>
              {gachaForm.keyReqs.length > 0 && (<div className="text-xs text-muted-foreground grid grid-cols-[24px_1fr_80px_32px] gap-1.5 px-1 font-medium">
                  <span />
                  <span>{t('items.name')}</span>
                  <span>{t('items.quantity')}</span>
                  <span />
                </div>)}
              <div className="space-y-2">
                {gachaForm.keyReqs.map((row, i) => (<div key={i} className="grid grid-cols-[24px_1fr_80px_32px] gap-1.5 items-center">
                    {row.item_definition_id ? (<Link href={`/games/${params.id}/items/${row.item_definition_id}`} title="View item">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors"/>
                      </Link>) : (<span />)}
                    <Popover open={gachaComboOpen === `keyreq-${i}`} onOpenChange={(open) => {
            setGachaComboOpen(open ? `keyreq-${i}` : null);
            if (!open)
                setGachaComboSearch("");
        }} modal={true}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-between font-normal" disabled={formSaving}>
                          {row.item_definition_id ? (
                            <span className="truncate">
                              {gachaAllItems.find((it) => it.id === row.item_definition_id)?.name ?? `${row.item_definition_id.slice(0, 8)}...`}
                            </span>
                          ) : (
                            <span className="truncate text-muted-foreground">Select item</span>
                          )}
                          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput placeholder={t('items.searchByNameOrIdPlaceholder')} value={gachaComboSearch} onValueChange={setGachaComboSearch}/>
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                              {gachaAllItems
            .filter((it) => !gachaComboSearch ||
            it.name.toLowerCase().includes(gachaComboSearch.toLowerCase()) ||
            it.id.toLowerCase().includes(gachaComboSearch.toLowerCase()) ||
            (it.item_code ?? "").toLowerCase().includes(gachaComboSearch.toLowerCase()))
            .slice(0, 50)
            .map((it) => (<CommandItem key={it.id} value={it.id} onSelect={() => {
                updateKeyReqRow(i, { item_definition_id: it.id });
                setGachaComboOpen(null);
                setGachaComboSearch("");
            }}>
                                    <Check className={`mr-2 h-4 w-4 shrink-0 ${row.item_definition_id === it.id ? "opacity-100" : "opacity-0"}`}/>
                                    <span className="flex-1 truncate">{it.name}</span>
                                    {it.item_code && <span className="text-xs text-muted-foreground font-mono ml-1">({it.item_code})</span>}
                                  </CommandItem>))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Input type="number" min={1} className="h-8 text-xs text-center font-mono" value={row.quantity} onChange={(e) => updateKeyReqRow(i, { quantity: e.target.value })} disabled={formSaving}/>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeKeyReqRow(i)} disabled={formSaving} type="button">
                      <X className="h-3.5 w-3.5"/>
                    </Button>
                  </div>))}
              </div>
              {gachaForm.keyReqs.length === 0 && (<p className="text-xs text-muted-foreground italic">{t('items.noKeyItems')}</p>)}
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" type="button" onClick={addKeyReqRow} disabled={formSaving}>
                  <Plus className="h-3.5 w-3.5 mr-1"/> {t('items.addKey')}
                </Button>
                <button type="button" onClick={() => {
        setCreateInitCategory("key" as ItemCategory);
        setShowCreate(true);
    }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Plus className="h-3 w-3"/>
                  {t('items.createNewItem')}
                </button>
                <button type="button" onClick={() => fetchGachaData()} disabled={formSaving} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="Reload item definitions">
                  <RefreshCw className="h-3 w-3"/>
                  {t('items.reloadItemDefs')}
                </button>
              </div>
            </div>

            <Separator />

            {/* Item Pool */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">{t('items.itemPoolLabel')}</Label>
                  {formTotalWeight > 0 && (<p className="text-xs text-muted-foreground">
                      {t('items.totalWeight')}: {formTotalWeight.toLocaleString()}
                      {formTotalWeight === 1000000 && " (1M = % notation)"}
                    </p>)}
                </div>
                <Button size="sm" variant="outline" type="button" onClick={addPoolRow} disabled={formSaving}>
                  <Plus className="h-3.5 w-3.5 mr-1"/> {t('items.addItem')}
                </Button>
              </div>
              {gachaForm.pool.length > 0 && (<div className="text-xs text-muted-foreground grid grid-cols-[1fr_110px_120px_120px_32px] gap-1.5 px-1 font-medium">
                  <span>{t('items.name')}</span>
                  <span>{t('items.weight')}</span>
                  <span>{t('items.min')}</span>
                  <span>{t('items.max')}</span>
                  <span />
                </div>)}
              <div className="space-y-2">
                {gachaForm.pool.map((row, i) => {
        const pct = formTotalWeight > 0 ? ((Number(row.weight) || 0) / formTotalWeight * 100) : 0;
        return (<div key={i} className="grid grid-cols-[1fr_110px_120px_120px_32px] gap-1.5 items-center">
                      <Popover open={gachaComboOpen === `pool-${i}`} onOpenChange={(open) => {
                setGachaComboOpen(open ? `pool-${i}` : null);
                if (!open)
                    setGachaComboSearch("");
            }} modal={true}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs w-full justify-between font-normal" disabled={formSaving}>
                            {row.item_definition_id ? (
                              <span className="truncate">
                                {gachaAllItems.find((it) => it.id === row.item_definition_id)?.name ?? `${row.item_definition_id.slice(0, 8)}...`}
                              </span>
                            ) : (
                              <span className="truncate text-muted-foreground">Select item</span>
                            )}
                            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput placeholder={t('items.searchByNameOrIdPlaceholder')} value={gachaComboSearch} onValueChange={setGachaComboSearch}/>
                            <CommandList>
                              <CommandEmpty>No item found.</CommandEmpty>
                              <CommandGroup>
                                {gachaAllItems
                .filter((it) => !gachaComboSearch ||
                it.name.toLowerCase().includes(gachaComboSearch.toLowerCase()) ||
                it.id.toLowerCase().includes(gachaComboSearch.toLowerCase()) ||
                (it.item_code ?? "").toLowerCase().includes(gachaComboSearch.toLowerCase()))
                .slice(0, 50)
                .map((it) => (<CommandItem key={it.id} value={it.id} onSelect={() => {
                    updatePoolRow(i, { item_definition_id: it.id });
                    setGachaComboOpen(null);
                    setGachaComboSearch("");
                }}>
                                      <Check className={`mr-2 h-4 w-4 shrink-0 ${row.item_definition_id === it.id ? "opacity-100" : "opacity-0"}`}/>
                                      <span className="flex-1 truncate">{it.name}</span>
                                      {it.item_code && <span className="text-xs text-muted-foreground font-mono ml-1">({it.item_code})</span>}
                                    </CommandItem>))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="relative">
                        <Input type="text" inputMode="numeric" className="h-8 text-xs pr-1 font-mono" value={row.weight ? Number(row.weight).toLocaleString() : ""} onChange={(e) => updatePoolRow(i, { weight: e.target.value.replace(/[^0-9]/g, "") })} disabled={formSaving} title={pct > 0 ? `? ${formatPct(pct)}` : ""}/>
                      </div>
                      <Input type="text" inputMode="numeric" className="h-8 text-xs text-center font-mono" value={row.quantity_min ? Number(row.quantity_min).toLocaleString() : ""} onChange={(e) => updatePoolRow(i, { quantity_min: e.target.value.replace(/[^0-9]/g, "") })} disabled={formSaving}/>
                      <Input type="text" inputMode="numeric" className="h-8 text-xs text-center font-mono" value={row.quantity_max ? Number(row.quantity_max).toLocaleString() : ""} onChange={(e) => updatePoolRow(i, { quantity_max: e.target.value.replace(/[^0-9]/g, "") })} disabled={formSaving}/>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removePoolRow(i)} disabled={formSaving} type="button">
                        <X className="h-3.5 w-3.5"/>
                      </Button>
                    </div>);
    })}
              </div>
              {gachaForm.pool.some((r) => r.item_definition_id && Number(r.weight) > 0) && (<div className="mt-3 rounded border bg-muted/40 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('items.dropRatePreview')}</p>
                  {[...gachaForm.pool]
            .filter((r) => r.item_definition_id)
            .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))
            .map((row, i) => {
            const item = gachaAllItems.find((it) => it.id === row.item_definition_id);
            return (<div key={i} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{item?.name ?? row.item_definition_id.slice(0, 8)}</span>
                          <DropBar weight={Number(row.weight) || 0} total={formTotalWeight}/>
                        </div>);
        })}
                </div>)}
              {gachaForm.pool.length === 0 && (<p className="text-xs text-muted-foreground italic">
                  {t('items.noItemsPool')}
                </p>)}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-6 mt-4 border-t">
            <Button variant="outline" onClick={() => gachaCloseSheet()} disabled={formSaving}>
              {t('common.cancel')}
            </Button>
            {editingPack ? (<>
                <Button variant="outline" onClick={() => handleGachaSave(false)} disabled={formSaving}>
                  {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                  {t('items.saveAndContinue')}
                </Button>
                <Button onClick={() => handleGachaSave(true)} disabled={formSaving}>
                  {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                  {t('items.saveAndClose')}
                </Button>
              </>) : (<Button onClick={() => handleGachaSave(true)} disabled={formSaving}>
                {formSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                {t('items.createPack')}
              </Button>)}
          </div>
        </SheetContent>
      </Sheet>;
{ /* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Gacha Delete Confirmation ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */ }
<AlertDialog open={!!deletingPack} onOpenChange={(o) => {
        if (!o)
            setDeletingPack(null);
    }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deletePack')} "{deletingPack?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deletePackDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePackLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleGachaDelete} disabled={deletePackLoading}>
              {deletePackLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>;
      {/* Preset Create Sheet */}
      <CreatePresetDefinitionSheet open={showCreatePreset} gameId={gameId} initialValues={createPresetInitialValues} turnContext={createPresetTurnContext} onCreated={fetchPresetDefs} onClose={() => { setShowCreatePreset(false); setCreatePresetInitialValues(undefined); setCreatePresetTurnContext(null); }}/>
      {/* Preset Edit Sheet */}
      {editingPreset && (<EditPresetDefinitionSheet open={!!editingPreset} gameId={gameId} definition={editingPreset} onUpdated={fetchPresetDefs} onClose={() => setEditingPreset(null)}/>)}
      {/* Preset Delete Confirmation */}
      <AlertDialog open={!!deletingPreset} onOpenChange={(o) => {
        if (!o)
            setDeletingPreset(null);
    }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('items.deletePreset')} "{deletingPreset?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('items.deletePresetDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePresetLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={async () => {
        if (!deletingPreset)
            return;
        setDeletePresetLoading(true);
        try {
            await deletePresetDefinition({ gameId }, deletingPreset.id);
            toast({ title: t('items.presetDeleted') });
            setDeletingPreset(null);
            fetchPresetDefs();
        }
        catch (err: any) {
            if (err?.status === 403) {
                toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionDeletePreset') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToDelete'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setDeletePresetLoading(false);
        }
    }} disabled={deletePresetLoading}>
              {deletePresetLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>;
{ /* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Explanation Panel ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */ }
<Sheet open={showExplanationPanel} onOpenChange={setShowExplanationPanel}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {explanationTopic === 'write_props'
        ? t('items.explanation.writeProps.title')
        : explanationTopic === 'update_qty'
            ? t('items.explanation.updateQty.title')
            : t('common.support')}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto">
            {explanationTopic === 'write_props' && (<div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{t('items.explanation.writeProps.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('items.explanation.writeProps.description')}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.writeProps.whenEnabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.writeProps.enabled1')}</li>
                    <li>{t('items.explanation.writeProps.enabled2')}</li>
                    <li>{t('items.explanation.writeProps.enabled3')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.writeProps.whenDisabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.writeProps.disabled1')}</li>
                    <li>{t('items.explanation.writeProps.disabled2')}</li>
                    <li>{t('items.explanation.writeProps.disabled3')}</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-blue-800 dark:text-blue-200">
                  Tip: <strong>{t('items.explanation.writeProps.tip')}</strong> {t('items.explanation.writeProps.tipContent')}
                </div>
              </div>)}

            {explanationTopic === 'update_qty' && (<div className="space-y-3 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{t('items.explanation.updateQty.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('items.explanation.updateQty.description')}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.updateQty.whenEnabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.updateQty.enabled1')}</li>
                    <li>{t('items.explanation.updateQty.enabled2')}</li>
                    <li>{t('items.explanation.updateQty.enabled3')}</li>
                    <li>{t('items.explanation.updateQty.enabled4')}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('items.explanation.updateQty.whenDisabled')}</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>{t('items.explanation.updateQty.disabled1')}</li>
                    <li>{t('items.explanation.updateQty.disabled2')}</li>
                    <li>{t('items.explanation.updateQty.disabled3')}</li>
                    <li>{t('items.explanation.updateQty.disabled4')}</li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-2 text-xs text-amber-800 dark:text-amber-200">
                  Warning: <strong>{t('items.explanation.updateQty.warning')}</strong> {t('items.explanation.updateQty.warningContent')}
                </div>
              </div>)}
          </div>

          <SheetFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowExplanationPanel(false)}>{t('common.close')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
// Create Preset Definition Sheet
function CreatePresetDefinitionSheet({ open, gameId, initialValues, turnContext, onCreated, onClose, }: {
    open: boolean;
    gameId: string;
    initialValues?: {
        name?: string;
        preset_type?: string;
        code_name?: string;
        max_slots?: number;
    };
    turnContext?: {
        turnId: string;
        responseIdx: number;
        presetIdx: number;
        convId: string;
    } | null;
    onCreated: () => void;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    useEscapeLayer(open, onClose);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [containerType, setContainerType] = useState("");
    const [codeName, setCodeName] = useState("");
    const [autoSlug, setAutoSlug] = useState(true);
    const [maxSlots, setMaxSlots] = useState("20");
    const [meta, setMeta] = useState<{
        key: string;
        value: string;
    }[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    // Pre-fill form when opened with initial values (e.g. from LLM conversation)
    useEffect(() => {
        if (open && initialValues) {
            if (initialValues.name)
                setName(initialValues.name);
            if (initialValues.preset_type)
                setContainerType(initialValues.preset_type);
            if (initialValues.code_name) {
                setCodeName(initialValues.code_name);
                setAutoSlug(false);
            }
            else if (initialValues.name) {
                setCodeName(toSlugUnderscore(initialValues.name));
            }
            if (initialValues.max_slots)
                setMaxSlots(String(initialValues.max_slots));
        }
    }, [open, initialValues]);
    function resetForm() {
        setName("");
        setContainerType("");
        setCodeName("");
        setAutoSlug(true);
        setMaxSlots("20");
        setMeta([]);
        setErrors({});
    }
    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 2)
            e.name = t('items.nameMustBe2Chars');
        if (!containerType.trim())
            e.containerType = t('items.containerTypeRequired');
        const slots = Number(maxSlots);
        if (!maxSlots || !slots || slots < 1 || slots > 70)
            e.maxSlots = t('items.maxSlotsInvalid');
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    async function handleSubmit() {
        if (!validate())
            return;
        setLoading(true);
        try {
            const metadata: Record<string, unknown> = {};
            meta.forEach(({ key, value }) => {
                if (key.trim())
                    metadata[key.trim()] = value;
            });
            const finalCodeName = (autoSlug ? toSlugUnderscore(name) : codeName).trim();
            const body: CreatePresetDefinitionRequest = {
                preset_type: containerType.trim(),
                name: name.trim(),
                ...(finalCodeName ? { code_name: finalCodeName } : {}),
                max_slots: Number(maxSlots),
                metadata,
            };
            const created = await createPresetDefinition({ gameId }, body);
            toast({ title: t('items.presetCreated'), description: `"${name.trim()}" added.` });
            // Notify conversation panel so the save button becomes a link
            if (turnContext) {
                window.dispatchEvent(new CustomEvent('ss:preset-created', {
                    detail: {
                        presetId: created.id,
                        presetName: created.name,
                        turnId: turnContext.turnId,
                        responseIdx: turnContext.responseIdx,
                        presetIdx: turnContext.presetIdx,
                    },
                }));
            }
            resetForm();
            onCreated();
            onClose();
        }
        catch (err: any) {
            if (err?.status === 403) {
                toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionCreatePreset') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToCreate'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(v) => {
            if (!v) {
                resetForm();
                onClose();
            }
        }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.newPresetDefinition')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="pd-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="pd-name" placeholder="e.g. Standard Deck" value={name} onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (autoSlug)
                setCodeName(toSlugUnderscore(v));
        }}/>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-code-name">
              {t('items.codeName')}{" "}
              <span className="text-muted-foreground text-xs font-normal">({t('items.presetCodeNameHint')})</span>
            </Label>
            <div className="flex gap-2">
              <Input id="pd-code-name" placeholder={t('items.presetCodeNamePlaceholder')} value={autoSlug ? toSlugUnderscore(name) : codeName} onChange={(e) => {
            setAutoSlug(false);
            setCodeName(e.target.value);
        }} className="font-mono"/>
              <Button type="button" variant={autoSlug ? "default" : "outline"} size="icon" className="shrink-0" title={autoSlug ? t('items.autoSlugOn') : t('items.autoSlugOff')} onClick={() => {
            const next = !autoSlug;
            setAutoSlug(next);
            if (next)
                setCodeName(toSlugUnderscore(name));
        }}>
                <Wand2 className="h-4 w-4"/>
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pd-type">{t('items.presetType')} <span className="text-destructive">*</span></Label>
            <Input id="pd-type" placeholder="e.g. deck, party" value={containerType} onChange={(e) => setContainerType(e.target.value)}/>
            {errors.containerType && <p className="text-xs text-destructive">{errors.containerType}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pd-slots">{t('items.maxSlots')} <span className="text-destructive">*</span></Label>
              <span className="text-sm font-semibold tabular-nums">{maxSlots} / 70</span>
            </div>
            <Slider id="pd-slots" min={1} max={70} step={1} value={[Number(maxSlots)]} onValueChange={([v]) => setMaxSlots(String(v))}/>
            {errors.maxSlots && <p className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataOptional')}/>
          </div>
        </div>
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
            {t('common.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Edit Preset Definition Sheet ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function EditPresetDefinitionSheet({ open, gameId, definition, onUpdated, onClose, }: {
    open: boolean;
    gameId: string;
    definition: PresetDefinition;
    onUpdated: () => void;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const { t } = useTranslation();
    useEscapeLayer(open, onClose, 1);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(definition.name);
    const [maxSlots, setMaxSlots] = useState(String(definition.max_slots));
    const [meta, setMeta] = useState<{
        key: string;
        value: string;
    }[]>(Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        if (!open)
            return;
        setName(definition.name);
        setMaxSlots(String(definition.max_slots));
        setMeta(Object.entries(definition.metadata ?? {}).map(([key, value]) => ({ key, value: String(value) })));
        setErrors({});
    }, [open, definition]);
    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 2)
            e.name = t('items.nameMustBe2Chars');
        const slots = Number(maxSlots);
        if (!maxSlots || !slots || slots < 1 || slots > 70)
            e.maxSlots = t('items.maxSlotsInvalid');
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    async function handleSubmit() {
        if (!validate())
            return;
        setLoading(true);
        try {
            const metadata: Record<string, unknown> = {};
            meta.forEach(({ key, value }) => {
                if (key.trim())
                    metadata[key.trim()] = value;
            });
            const body: UpdatePresetDefinitionRequest = {
                name: name.trim(),
                max_slots: Number(maxSlots),
                metadata,
            };
            await updatePresetDefinition({ gameId }, definition.id, body);
            toast({ title: t('items.presetUpdated'), description: `"${name.trim()}" saved.` });
            onUpdated();
            onClose();
        }
        catch (err: any) {
            if (err?.status === 403) {
                toast({ variant: "destructive", title: t('items.permissionDenied'), description: t('items.noPermissionUpdatePreset') });
            }
            else {
                toast({ variant: "destructive", title: t('items.failedToUpdate'), description: err?.message ?? "Unknown error" });
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (<Sheet open={open} onOpenChange={(v) => {
            if (!v)
                onClose();
        }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('items.editPresetDefinition')}</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground truncate">{definition.id}</p>
        </SheetHeader>
        <div className="space-y-4 py-2 pr-2.5 flex-1 overflow-y-auto">
          <div className="space-y-1">
            <Label htmlFor="epd-name">{t('items.name')} <span className="text-destructive">*</span></Label>
            <Input id="epd-name" value={name} onChange={(e) => setName(e.target.value)}/>
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="epd-code-name">{t('items.codeName')}</Label>
            <Input id="epd-code-name" value={definition.code_name ?? ""} readOnly className="font-mono opacity-70"/>
            <p className="text-xs text-muted-foreground">{t('items.codeName')} is readonly.</p>
          </div>
          <div className="space-y-1">
            <Label>{t('items.presetType')}</Label>
            <Input value={definition.preset_type} disabled className="opacity-60"/>
            <p className="text-xs text-muted-foreground">{t('items.presetTypeImmutable')}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="epd-slots">{t('items.maxSlots')} <span className="text-destructive">*</span></Label>
              <span className="text-sm font-semibold tabular-nums">{maxSlots} / 70</span>
            </div>
            <Slider id="epd-slots" min={1} max={70} step={1} value={[Number(maxSlots)]} onValueChange={([v]) => setMaxSlots(String(v))}/>
            {errors.maxSlots && <p className="text-xs text-destructive">{errors.maxSlots}</p>}
          </div>
          <div className="space-y-1">
            <KVEditor entries={meta} onChange={setMeta} label={t('items.metadataOptional')}/>
          </div>
        </div>
        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
            {t('items.saveChanges')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>);
}
