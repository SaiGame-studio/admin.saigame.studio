import type { CloneSessionConflict } from "@/lib/game-api";

export function getConflictProgressTab(conflict: CloneSessionConflict) {
    const hint = `${conflict.phase ?? ""} ${conflict.definition_type ?? ""} ${conflict.field ?? ""} ${conflict.message_code ?? ""}`.toLowerCase();
    if (hint.includes("equipment") || hint.includes("slot")) return "equipment_slot_definitions";
    if (hint.includes("container")) return "item_container_definitions";
    if (hint.includes("tag")) return "item_tags";
    if (hint.includes("quest")) return "quest_definitions";
    if (hint.includes("shop")) return "shop_definitions";
    if (hint.includes("preset")) return "preset_definitions";
    if (hint.includes("gacha")) return "gacha_packs";
    if (hint.includes("crafting") || hint.includes("recipe")) return "crafting_recipes";
    if (hint.includes("entity")) return "entity_definitions";
    return "item_definitions";
}

export function normalizeProgressTab(tab: string, entries: Array<[string, { total?: number; processed?: number; completed?: boolean }]>) {
    if (entries.some(([phaseKey]) => phaseKey === tab)) return tab;
    if (tab === "item_tags" && entries.some(([phaseKey]) => phaseKey === "item_tag_definitions")) return "item_tag_definitions";
    return entries[0]?.[0] ?? tab;
}

export function getConflictSearchId(conflict: CloneSessionConflict, tab: string) {
    if (tab === "item_definitions") {
        return (conflict.source_item_definitions_id || "").trim();
    }

    if (tab === "item_container_definitions" || tab === "equipment_slot_definitions" || tab === "item_tags" || tab === "item_tag_definitions" || tab === "quest_definitions" || tab === "shop_definitions" || tab === "preset_definitions" || tab === "gacha_packs" || tab === "gacha_pack_definitions" || tab === "crafting_recipes" || tab === "crafting_recipe_definitions" || tab === "entity_definitions") {
        return (conflict.source_id || "").trim();
    }

    return (conflict.target_definition_id || conflict.value || "").trim();
}
