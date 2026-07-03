import type { CloneSessionConflict, CloneSessionIgnoreContentType } from "@/lib/game-api";
import { getConflictProgressTab } from "./cloneSessionConflictNavigation";

type CloneSessionManualOverwritePair = {
    contentType: CloneSessionIgnoreContentType;
    sourceId: string;
    targetId: string;
};

export function getCloneSessionManualOverwritePair(conflict: CloneSessionConflict): CloneSessionManualOverwritePair | null {
    const progressTab = getConflictProgressTab(conflict);

    if (progressTab === "item_definitions") {
        const sourceId = (conflict.source_item_definitions_id || conflict.source_id || "").trim();
        const targetId = (conflict.target_definition_id || conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "item_definition", sourceId, targetId } : null;
    }

    if (progressTab === "item_container_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "item_container_definition", sourceId, targetId } : null;
    }

    if (progressTab === "equipment_slot_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "equipment_slot_definition", sourceId, targetId } : null;
    }

    if (progressTab === "item_tags" || progressTab === "item_tag_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "item_tag", sourceId, targetId } : null;
    }

    if (progressTab === "quest_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "quest_definition", sourceId, targetId } : null;
    }

    if (progressTab === "shop_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "shop_definition", sourceId, targetId } : null;
    }

    if (progressTab === "preset_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "preset_definition", sourceId, targetId } : null;
    }

    if (progressTab === "crafting_recipes" || progressTab === "crafting_recipe_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "crafting_recipe", sourceId, targetId } : null;
    }

    if (progressTab === "entity_definitions") {
        const sourceId = (conflict.source_id || "").trim();
        const targetId = (conflict.target_id || "").trim();
        return sourceId && targetId ? { contentType: "entity_definition", sourceId, targetId } : null;
    }

    return null;
}

export function findCloneSessionManualOverwriteTargetId(
    conflicts: CloneSessionConflict[],
    contentType: CloneSessionIgnoreContentType,
    sourceId: string,
): string | null {
    for (const conflict of conflicts) {
        const pair = getCloneSessionManualOverwritePair(conflict);
        if (pair?.contentType === contentType && pair.sourceId === sourceId) {
            return pair.targetId;
        }
    }

    return null;
}
