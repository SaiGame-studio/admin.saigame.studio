import type { CloneSessionConflict } from "@/lib/game-api";

export function getConflictProgressTab(conflict: CloneSessionConflict) {
    const hint = `${conflict.phase ?? ""} ${conflict.definition_type ?? ""} ${conflict.field ?? ""}`.toLowerCase();
    if (hint.includes("container")) return "item_container_definitions";
    if (hint.includes("tag")) return "item_tags";
    if (hint.includes("quest")) return "quest_definitions";
    if (hint.includes("shop")) return "shop_definitions";
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

    return (conflict.target_definition_id || conflict.value || "").trim();
}
