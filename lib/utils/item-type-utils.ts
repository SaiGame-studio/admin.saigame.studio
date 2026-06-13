/**
 * Centralized item type utilities
 * This file manages all item type options and their display labels
 * Update this file to modify item types across the entire application
 */
export interface ItemTypeOption {
    value: string;
    label: string;
}
/**
 * Master list of item types with their display labels
 * Add, remove, or modify item types here to sync across all dropdowns
 */
const ITEM_TYPE_OPTIONS: ItemTypeOption[] = [
    { value: "char_profile", label: "Character Profile" },
    { value: "equipment", label: "Equipment" },
    { value: "quest_item", label: "Quest Item" },
    { value: "inventory", label: "Inventory" },
    { value: "currency", label: "Currency" },
    { value: "misc", label: "Miscellaneous" },
    { value: "loot_box_fixed", label: "Fixed Loot Box" },
    { value: "loot_box_rng", label: "RNG Loot Box" },
];
/**
 * Get all available item type options
 * This function should be used by all components that need item type options
 */
export function getItemTypeOptions(): ItemTypeOption[] {
    return ITEM_TYPE_OPTIONS;
}
/**
 * Get item type label by value
 */
export function getItemTypeLabel(value: string): string {
    const option = ITEM_TYPE_OPTIONS.find(opt => opt.value === value);
    if (option) {
        return option.label;
    }
    // Special handling for lootbox types with alternative formats
    if (value.includes('loot_box_rng') || value.includes('loot box_rng') || value === 'Loot Box_rng') {
        return 'RNG Loot Box';
    }
    if (value.includes('loot_box_fixed') || value.includes('loot box_fixed')) {
        return 'Fixed Loot Box';
    }
    // Default fallback
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
/**
 * Check if an item type value is valid
 */
export function isValidItemType(value: string): boolean {
    return ITEM_TYPE_OPTIONS.some(opt => opt.value === value);
}
/**
 * Get item type values only (for validation, etc.)
 */
export function getItemTypeValues(): string[] {
    return ITEM_TYPE_OPTIONS.map(opt => opt.value);
}
