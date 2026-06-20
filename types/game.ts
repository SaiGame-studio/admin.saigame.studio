export interface GameLimits {
    max_concurrent_users: number;
    max_items: number;
    max_gacha_packs: number;
    max_player_profiles: number;
    max_shops: number;
    max_quests?: number;
    max_node_definitions?: number;
    max_event_types?: number;
    max_leaderboards?: number;
    max_daily_quest_sets?: number;
    max_battle_pass_sets?: number;
    max_entity_defs?: number;
    max_scripts?: number;
    max_equipment_slots?: number;
}
export interface GameUsage {
    concurrent_users: number;
    items: number;
    gacha_packs: number;
    player_profiles: number;
    shops: number;
    quests?: number;
    node_definitions?: number;
    event_types?: number;
    leaderboards?: number;
    entity_definitions?: number;
    scripts?: number;
    equipment_slots?: number;
}
export interface Game {
    id: string;
    studio_id: string;
    name: string;
    slug: string;
    description?: string;
    game_type: string;
    share_level?: "private" | "protected" | "public";
    clone_cost?: number;
    is_cloned_game?: boolean;
    tags?: string[];
    config: {
        max_players: number;
        server_region: string;
        [key: string]: any;
    };
    settings?: {
        allow_player_trading?: boolean;
        allow_tracing_player_event?: boolean;
        leaderboard_tracing?: boolean;
        quest_reward_delivery?: "mailbox" | "direct" | "";
        quest_mailbox_title?: string;
        quest_mailbox_body?: string;
        [key: string]: any;
    };
    is_active: boolean;
    created_at: number;
    updated_at: number;
    player_count?: number;
    limits?: GameLimits;
    usage?: GameUsage;
    // Legacy fields for backward compatibility
    status?: string;
    shop_count?: number;
    tier?: string;
    studio?: {
        id: string;
        name: string;
        tier: string;
        game_count: number;
        user_profile_id: string;
        updated_at: number;
        created_at: number;
    };
    total_player?: number;
    item_profile_count?: number;
}
export interface ApiResponse<T> {
    status: string;
    message: string;
    message_code: string;
    data: T;
}
export enum GameStatus {
    Development = "development",
    Alpha = "alpha",
    Beta = "beta",
    Released = "released",
    Archived = "archived"
}
export enum ItemType {
    CharProfile = "char_profile",
    Equipments = "equipments",
    QuestItems = "quest_items",
    Inventories = "inventories",
    Currencies = "currencies",
    Misc = "misc",
    GachaPack = "gacha_pack"
}
export enum ItemProfileStatus {
    ReadyToUse = "ready_to_use",
    InProgress = "in_progress",
    ErrorUnStackAmountTooBig = "un_stackable_amount_too_big"
}
