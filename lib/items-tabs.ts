import { Package, Tag, LayoutTemplate, Archive, Dices, Zap, Shield, Hammer, type LucideIcon, } from "lucide-react";
export type ItemsTabKey = "catalogue" | "tags" | "preset" | "containers" | "gacha" | "generators" | "equipments" | "crafting";
export interface ItemsTabConfig {
    key: ItemsTabKey;
    icon: LucideIcon;
    labelKey: string;
}
export const ITEMS_TABS: ItemsTabConfig[] = [
    { key: "catalogue", icon: Package, labelKey: "items.tabItems" },
    { key: "tags", icon: Tag, labelKey: "items.tabTags" },
    { key: "preset", icon: LayoutTemplate, labelKey: "items.tabPreset" },
    { key: "containers", icon: Archive, labelKey: "items.tabContainers" },
    { key: "gacha", icon: Dices, labelKey: "items.tabGacha" },
    { key: "generators", icon: Zap, labelKey: "items.tabGenerators" },
    { key: "equipments", icon: Shield, labelKey: "items.tabEquipmentSlots" },
    { key: "crafting", icon: Hammer, labelKey: "items.tabCrafting" },
];
