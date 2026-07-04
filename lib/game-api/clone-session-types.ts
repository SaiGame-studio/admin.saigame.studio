import type { Game } from "@/types/game";
import type { QuestDefinition } from "@/lib/quest-api";

export interface CloneableGamesResponse {
    games: Game[];
    total: number;
}


export interface CloneSessionResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    same_studio?: boolean;
    status?: string;
    message?: string;
}

export interface CloneSessionProgress {
    total?: number;
    processed?: number;
    completed?: boolean;
}

export interface CloneSessionWarning {
    field?: string;
    source_id?: string;
    message_code?: string;
    message?: string;
    message_params?: Record<string, string | number | boolean | null | undefined>;
}

export interface CloneSessionConflict {
    content_type?: CloneSessionIgnoreContentType;
    field?: string;
    value?: string;
    source_id?: string;
    target_id?: string;
    source_item_definitions_id?: string;
    target_definition_id?: string;
    phase?: string;
    definition_type?: string;
    message_code?: string;
    message?: string;
    message_params?: Record<string, string | number | boolean | null | undefined>;
}

export interface CloneSessionEstimatedCost {
    currency?: string;
    amount?: number;
}

export interface ActiveCloneSessionSummary {
    session_id: string;
    target_game_id: string;
    target_game_name?: string;
    status?: string;
    expires_at?: number;
    expires_in_seconds?: number;
}

export interface ActiveCloneSessionsResponse {
    source_game_id?: string;
    source_game_name?: string;
    session_ttl_seconds?: number;
    active_session_count?: number;
    active_sessions?: ActiveCloneSessionSummary[];
}

export interface CloneSessionLastRunResponse {
    warnings?: CloneSessionWarning[];
    conflicts?: CloneSessionConflict[];
    estimated_clone_cost?: CloneSessionEstimatedCost;
}

export interface CloneSessionRunOptions {
    overwrite_all_conflicting_codes?: boolean;
}

export interface CloneSessionSnapshot {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    same_studio?: boolean;
    status?: string;
    current_phase?: string;
    current_batch_index?: number;
    batch_size?: number;
    clone_run_options?: CloneSessionRunOptions;
    last_run_response?: CloneSessionLastRunResponse;
    progress?: Record<string, CloneSessionProgress>;
    session_ttl_seconds?: number;
    expires_at?: number;
    expires_in_seconds?: number;
    message?: string;
}

export interface CloneSessionCurrentEntityPool {
    id: string;
    game_id: string;
    pool_key: string;
    name: string;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentEntityPoolsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    entity_pools?: CloneSessionCurrentEntityPool[];
}

export interface CloneSessionCurrentItemDefinition {
    id: string;
    game_id: string;
    item_code: string;
    name: string;
    category?: string;
    rarity?: string;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentItemsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    items?: CloneSessionCurrentItemDefinition[];
}

export interface CloneSessionCurrentCraftingRecipe {
    id: string;
    game_id: string;
    recipe_key: string;
    name: string;
    category?: string;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentCraftingRecipesResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    crafting_recipes?: CloneSessionCurrentCraftingRecipe[];
}

export interface CloneSessionCurrentItemContainer {
    id: string;
    game_id: string;
    code_name: string;
    name: string;
    container_type: string;
    grid_cols: number;
    grid_rows: number;
    is_portable: boolean;
    instanced_per_item: boolean;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentItemContainersResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    item_containers?: CloneSessionCurrentItemContainer[];
}

export interface CloneSessionCurrentItemTag {
    id: string;
    game_id: string;
    tag_key: string;
    label: string;
    color?: string;
    item_count?: number;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentItemTagsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    item_tags?: CloneSessionCurrentItemTag[];
    tags?: CloneSessionCurrentItemTag[];
}

export interface CloneSessionCurrentEquipmentSlotDefinition {
    id: string;
    game_id: string;
    slot_key: string;
    name: string;
    description?: string;
    allowed_categories?: string[];
    allowed_item_definition_ids?: string[];
    metadata?: Record<string, string | number | boolean | null | undefined>;
    is_active?: boolean;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    ignored?: boolean;
    is_ignored?: boolean;
    previously_cloned?: boolean;
    cloned_target_id?: string | null;
    clone_adoption_kind?: string | null;
}

export interface CloneSessionCurrentEquipmentSlotDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    equipment_slot_definitions?: CloneSessionCurrentEquipmentSlotDefinition[];
}

export type CloneSessionCurrentQuestDefinition = QuestDefinition & {
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
};

export interface CloneSessionCurrentShopDefinition {
    id: string;
    game_id: string;
    shop_key: string;
    name: string;
    description: string;
    shop_type: string;
    is_active: boolean;
    item_count?: number;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CloneSessionCurrentPresetDefinition {
    id: string;
    game_id: string;
    code_name: string;
    preset_type: string;
    name: string;
    max_slots?: number;
    metadata?: Record<string, string | number | boolean | null | undefined>;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CloneSessionCurrentGachaPackPoolItem {
    item_definition_id: string;
    weight: number;
    quantity_min: number;
    quantity_max: number;
}

export interface CloneSessionCurrentGachaPackKeyRequirement {
    item_definition_id: string;
    quantity: number;
}

export interface CloneSessionCurrentGachaPack {
    id: string;
    game_id: string;
    code_name: string;
    name: string;
    item_pool?: CloneSessionCurrentGachaPackPoolItem[];
    collect_destination?: string;
    key_requirements?: CloneSessionCurrentGachaPackKeyRequirement[];
    metadata?: Record<string, string | number | boolean | null | undefined>;
    is_enabled?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
    previously_cloned?: boolean;
    cloned_target_id?: string | null;
    clone_adoption_kind?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CloneSessionCurrentQuestsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    quests?: CloneSessionCurrentQuestDefinition[];
    quest_definitions?: CloneSessionCurrentQuestDefinition[];
}

export interface CloneSessionCurrentShopDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    shop_definitions?: CloneSessionCurrentShopDefinition[];
    shops?: CloneSessionCurrentShopDefinition[];
}

export interface CloneSessionCurrentPresetDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    preset_definitions?: CloneSessionCurrentPresetDefinition[];
    presets?: CloneSessionCurrentPresetDefinition[];
}

export interface CloneSessionCurrentGachaPacksResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    gacha_packs?: CloneSessionCurrentGachaPack[];
}

export interface CloneSessionCurrentItemsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentCraftingRecipesParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentItemContainersParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentItemTagsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentEquipmentSlotDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentQuestsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentShopDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentPresetDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentGachaPacksParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export type CloneSessionIgnoreContentType =
    | "item_definition"
    | "item_container_definition"
    | "equipment_slot_definition"
    | "item_tag"
    | "quest_definition"
    | "shop_definition"
    | "preset_definition"
    | "gacha_pack"
    | "crafting_recipe"
    | "entity_definition"
    | "entity_pool"
    | "leaderboard_definition";

export interface CloneSessionManualOverwritePairPayload {
    content_type: CloneSessionIgnoreContentType;
    source_id: string;
    target_id: string;
}

export interface CloneSessionCurrentEntityDefinition {
    id: string;
    game_id: string;
    entity_key: string;
    name: string;
    entity_type?: string;
    rarity?: string;
    previously_cloned?: boolean;
    ignored?: boolean;
    is_ignored?: boolean;
}

export interface CloneSessionCurrentEntityDefinitionsResponse {
    session_id?: string;
    source_game_id?: string;
    source_game_name?: string;
    target_game_id?: string;
    limit?: number;
    offset?: number;
    total?: number;
    entity_definitions?: CloneSessionCurrentEntityDefinition[];
    entities?: CloneSessionCurrentEntityDefinition[];
}

export interface CloneSessionCurrentEntityDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}

export interface CloneSessionCurrentLeaderboardDefinition {
    id: string;
    board_key: string;
    name: string;
    description?: string;
    score_mode?: string;
    sort_direction?: string;
    reset_schedule?: string;
    score_source_type?: string;
    score_source_ref_id?: string;
    created_at?: string;
    updated_at?: string;
    ignored?: boolean;
    is_ignored?: boolean;
    previously_cloned?: boolean;
}

export interface CloneSessionCurrentLeaderboardDefinitionsResponse {
    limit?: number;
    offset?: number;
    total?: number;
    leaderboard_definitions?: CloneSessionCurrentLeaderboardDefinition[];
}

export interface CloneSessionCurrentLeaderboardDefinitionsParams {
    id?: string;
    name?: string;
    limit?: number;
    offset?: number;
}
