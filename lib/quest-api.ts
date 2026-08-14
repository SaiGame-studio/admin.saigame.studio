/**
 * Quest Definitions API — v1 endpoints
 * Routes: /api/v1/games/{game_id}/quest-definitions
 * Requires: quest:write or quest:read permission
 *
 * Condition model: compound AND/OR tree (migration 055+)
 * Refs: docs/quest-condition-type.md, docs/quest-definition-fields.md
 */
import { api } from '@/lib/api-client';
// ─── Quest Types ──────────────────────────────────────────────────────────────
export type QuestType = 'one_time' | 'daily' | 'repeatable' | 'chain' | 'session';
// ─── Condition Tree ───────────────────────────────────────────────────────────
export interface ItemRequirement {
    item_definition_id: string;
    quantity: number;
    item_definition_name?: string;
    item_definition_code?: string;
}
/** A single trackable requirement (leaf node in the condition tree) */
export interface QuestConditionLeaf {
    clause_id: string;
    type: string;
    /** Required for counter types: login */
    target?: number;
    /** Optional direct item ref used by some drafts */
    item_definition_id?: string;
    item_definition_name?: string;
    item_definition_code?: string;
    /** Required for collect_and_keep / collect_and_submit / not_have_item */
    items?: ItemRequirement[];
    /** Required for gacha_opened — specifies pack + required open count */
    packs?: {
        gacha_pack_id: string;
        quantity: number;
    };
    /** Optional extra filter metadata (future use) */
    details?: Record<string, unknown>;
}
/** An AND/OR group of conditions (inner or root node) */
export interface QuestConditionGroup {
    operator: 'AND' | 'OR';
    clauses: (QuestConditionLeaf | QuestConditionGroup)[];
}
export function isConditionLeaf(node: QuestConditionLeaf | QuestConditionGroup): node is QuestConditionLeaf {
    return 'type' in node;
}
// ─── Rewards ──────────────────────────────────────────────────────────────────
export type RewardType = 'item';
export interface QuestReward {
    reward_type: RewardType;
    item_definition_id?: string;
    item_definition_name?: string;
    item_definition_code?: string;
    quantity_min?: number;
    quantity_max?: number;
}
// ─── Quest Definition ─────────────────────────────────────────────────────────
export interface QuestDefinition {
    id: string;
    studio_id: string;
    game_id: string;
    name: string;
    code_name?: string;
    description?: string;
    quest_type: QuestType;
    conditions: QuestConditionGroup;
    is_active: boolean;
    sort_order: number;
    type_config?: Record<string, unknown>;
    rewards: QuestReward[];
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
export interface ListQuestDefinitionsResponse {
    quests: QuestDefinition[];
    total?: number;
}
export interface CreateQuestDefinitionRequest {
    name: string;
    code_name?: string;
    description?: string;
    quest_type: QuestType;
    conditions: QuestConditionGroup;
    is_active?: boolean;
    type_config?: Record<string, unknown>;
    rewards?: QuestReward[];
    metadata?: Record<string, unknown>;
}
export interface UpdateQuestDefinitionRequest {
    name?: string;
    code_name?: string;
    description?: string;
    quest_type?: QuestType;
    conditions?: QuestConditionGroup;
    is_active?: boolean;
    sort_order?: number;
    type_config?: Record<string, unknown>;
    rewards?: QuestReward[];
    metadata?: Record<string, unknown>;
}
// ─── Quest Types ─────────────────────────────────────────────────────────────
export interface QuestTypeOption {
    value: string;
    description: string;
}
export interface ListQuestTypesResponse {
    quest_types: QuestTypeOption[];
}
export async function listQuestTypes(): Promise<ListQuestTypesResponse> {
    return api.get('/api/v1/quest-types');
}
export interface QuestConditionTypeOption {
    type: string;
    message_code: string;
    description: string;
    uses_items: boolean;
    auto_check: boolean;
    sample_clause: QuestConditionLeaf;
}
export interface ListQuestConditionTypesResponse {
    condition_types: QuestConditionTypeOption[];
}
export async function listQuestConditionTypes(gameId: string): Promise<ListQuestConditionTypesResponse> {
    return api.get(`/api/v1/games/${gameId}/quests/condition-types`);
}
// ─── API Functions ─────────────────────────────────────────────────────────────
export async function listQuestDefinitions(gameId: string, params?: {
    status?: boolean;
    limit?: number;
    after?: string;
    sort_by?: string;
    order?: string;
    pool_assigned?: boolean;
}): Promise<ListQuestDefinitionsResponse> {
    const qs = new URLSearchParams();
    if (params?.status !== undefined)
        qs.set('status', String(params.status));
    if (params?.limit !== undefined)
        qs.set('limit', String(params.limit));
    if (params?.after !== undefined)
        qs.set('after', params.after);
    if (params?.sort_by)
        qs.set('sort_by', params.sort_by);
    if (params?.order)
        qs.set('order', params.order);
    if (params?.pool_assigned !== undefined)
        qs.set('pool_assigned', String(params.pool_assigned));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get(`/api/v1/games/${gameId}/quest-definitions${query}`);
}
export async function getQuestDefinition(gameId: string, questId: string): Promise<QuestDefinition> {
    return api.get(`/api/v1/games/${gameId}/quest-definitions/${questId}`);
}
export async function createQuestDefinition(gameId: string, data: CreateQuestDefinitionRequest): Promise<QuestDefinition> {
    return api.post(`/api/v1/games/${gameId}/quest-definitions`, data);
}
export async function updateQuestDefinition(gameId: string, questId: string, data: UpdateQuestDefinitionRequest, options?: {
    suppressToast?: boolean;
}): Promise<QuestDefinition> {
    return api.patch(`/api/v1/games/${gameId}/quest-definitions/${questId}`, data, options);
}
export async function deleteQuestDefinition(gameId: string, questId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/quest-definitions/${questId}`);
}
// ─── Quest Chain Member Types (pivot table — Many-to-Many) ────────────────────
export interface QuestChainMember {
    id: string;
    chain_id: string;
    quest_definition_id: string;
    sort_order: number;
    unlock_quest_ids: string[];
    created_at: string;
    updated_at: string;
}
export interface ListChainMembersResponse {
    members: QuestChainMember[];
}
export interface AddChainMemberRequest {
    quest_definition_id: string;
    sort_order: number;
    unlock_quest_ids: string[];
}
export interface UpdateChainMemberRequest {
    sort_order?: number;
    unlock_quest_ids?: string[];
}
// ─── Quest Chain Types ─────────────────────────────────────────────────────────
export type ChainType = 'linear' | 'branching' | 'parallel';
export type ChainContentType = 'full_one_time' | 'full_session' | 'mix';
export interface QuestChain {
    id: string;
    studio_id: string;
    game_id: string;
    chain_key: string;
    display_name: string;
    description?: string;
    chain_type: ChainType;
    type_config?: { content_type?: ChainContentType };
    is_active: boolean;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface ListQuestChainsResponse {
    chains: QuestChain[];
    total: number;
    limit: number;
    offset: number;
}
export interface CreateQuestChainRequest {
    chain_key: string;
    display_name: string;
    description?: string;
    chain_type: ChainType;
    is_active: boolean;
}
export interface UpdateQuestChainRequest {
    display_name?: string;
    description?: string;
    chain_type?: ChainType;
    is_active?: boolean;
}
// ─── Quest Chain API Functions ────────────────────────────────────────────────
export async function listQuestChains(gameId: string, params?: {
    limit?: number;
    offset?: number;
    search?: string;
}): Promise<ListQuestChainsResponse> {
    const qs = new URLSearchParams();
    if (params?.limit !== undefined)
        qs.set('limit', String(params.limit));
    if (params?.offset !== undefined)
        qs.set('offset', String(params.offset));
    if (params?.search?.trim())
        qs.set('search', params.search.trim());
    const query = qs.toString() ? `?${qs}` : '';
    return api.get(`/api/v1/games/${gameId}/quest-chains${query}`);
}
export async function getQuestChain(gameId: string, chainId: string): Promise<QuestChain> {
    return api.get(`/api/v1/games/${gameId}/quest-chains/${chainId}`);
}
export async function createQuestChain(gameId: string, data: CreateQuestChainRequest): Promise<QuestChain> {
    return api.post(`/api/v1/games/${gameId}/quest-chains`, data);
}
export async function updateQuestChain(gameId: string, chainId: string, data: UpdateQuestChainRequest): Promise<QuestChain> {
    return api.patch(`/api/v1/games/${gameId}/quest-chains/${chainId}`, data);
}
export async function deleteQuestChain(gameId: string, chainId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/quest-chains/${chainId}`);
}
// ─── Quest Chain Member API Functions ─────────────────────────────────────────
export async function listChainMembers(gameId: string, chainId: string): Promise<ListChainMembersResponse> {
    return api.get(`/api/v1/games/${gameId}/quest-chains/${chainId}/members`);
}
export async function addChainMember(gameId: string, chainId: string, data: AddChainMemberRequest): Promise<QuestChainMember> {
    return api.post(`/api/v1/games/${gameId}/quest-chains/${chainId}/members`, data);
}
export async function updateChainMember(gameId: string, chainId: string, questId: string, data: UpdateChainMemberRequest): Promise<QuestChainMember> {
    return api.patch(`/api/v1/games/${gameId}/quest-chains/${chainId}/members/${questId}`, data);
}
export async function removeChainMember(gameId: string, chainId: string, questId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/quest-chains/${chainId}/members/${questId}`);
}
// ─── Quest Chain Layout API Functions ──────────────────────────────────────────
export interface ChainLayoutNodePosition {
    id: string;
    x: number;
    y: number;
}
export interface ChainLayout {
    positions: ChainLayoutNodePosition[];
}
export async function getChainLayout(gameId: string, chainId: string): Promise<ChainLayout> {
    return api.get(`/api/v1/games/${gameId}/quest-chains/${chainId}/layout`);
}
export async function saveChainLayout(gameId: string, chainId: string, data: ChainLayout): Promise<void> {
    return api.put(`/api/v1/games/${gameId}/quest-chains/${chainId}/layout`, data);
}
// ─── Daily Quest Pool Types ───────────────────────────────────────────────────
export type AssignmentStrategy = 'weighted_random' | 'fixed_rotation' | 'weekly_schedule' | 'monthly_schedule';
export interface DailyQuestPoolQuest {
    id: string;
    pool_id: string;
    quest_definition_id: string;
    studio_id: string;
    game_id: string;
    weight: number;
    created_at: string;
}
export interface ListPoolQuestsResponse {
    quests: DailyQuestPoolQuest[];
}
export interface CompletionBonus {
    id: string;
    studio_id: string;
    game_id: string;
    pool_id: string;
    rewards: QuestReward[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface DailyQuestPool {
    id: string;
    studio_id: string;
    game_id: string;
    pool_key: string;
    display_name: string;
    description?: string;
    assignment_strategy: AssignmentStrategy;
    slots_per_day: number;
    reset_hour_utc: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    quest_count: number;
}
export interface CreateDailyQuestPoolRequest {
    pool_key: string;
    display_name: string;
    description?: string;
    assignment_strategy: AssignmentStrategy;
    slots_per_day: number;
    reset_hour_utc?: number;
    is_active?: boolean;
}
export interface UpdateDailyQuestPoolRequest {
    display_name?: string;
    description?: string;
    slots_per_day?: number;
    reset_hour_utc?: number;
    is_active?: boolean;
}
export interface AddQuestToPoolRequest {
    quest_id: string;
    weight: number;
    sequence_order: number;
}
export interface SetCompletionBonusRequest {
    rewards: QuestReward[];
}
export interface ListDailyQuestPoolsResponse {
    pools: DailyQuestPool[];
    total?: number;
    limit?: number;
    offset?: number;
}
// ─── Daily Quest Pool API Functions ───────────────────────────────────────────
export async function listDailyQuestPools(gameId: string, params?: {
    status?: boolean;
    limit?: number;
    offset?: number;
}): Promise<ListDailyQuestPoolsResponse> {
    const qs = new URLSearchParams();
    if (params?.status !== undefined)
        qs.set('status', String(params.status));
    if (params?.limit !== undefined)
        qs.set('limit', String(params.limit));
    if (params?.offset !== undefined)
        qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get(`/api/v1/games/${gameId}/admin/daily-quest-pools${query}`);
}
export async function getDailyQuestPool(gameId: string, poolId: string): Promise<DailyQuestPool> {
    return api.get(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}`);
}
export async function listPoolQuests(gameId: string, poolId: string): Promise<ListPoolQuestsResponse> {
    return api.get(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/quests`);
}
export async function createDailyQuestPool(gameId: string, data: CreateDailyQuestPoolRequest): Promise<DailyQuestPool> {
    return api.post(`/api/v1/games/${gameId}/admin/daily-quest-pools`, data);
}
export async function updateDailyQuestPool(gameId: string, poolId: string, data: UpdateDailyQuestPoolRequest): Promise<DailyQuestPool> {
    return api.patch(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}`, data);
}
export async function addQuestToPool(gameId: string, poolId: string, data: AddQuestToPoolRequest): Promise<DailyQuestPoolQuest> {
    return api.post(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/quests`, data);
}
export async function removeQuestFromPool(gameId: string, poolId: string, questId: string, entryId?: string): Promise<void> {
    const entryQuery = entryId ? `?entry_id=${encodeURIComponent(entryId)}` : "";
    return api.delete(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/quests/${questId}${entryQuery}`);
}
export async function setCompletionBonus(gameId: string, poolId: string, data: SetCompletionBonusRequest): Promise<CompletionBonus> {
    return api.put(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/completion-bonus`, data);
}
export async function getCompletionBonus(gameId: string, poolId: string): Promise<CompletionBonus> {
    return api.get(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/completion-bonus`);
}
// ─── Daily Quest Assign-Ahead Preview Types ────────────────────────────────────
export interface DailyQuestAssignment {
    id: string;
    studio_id: string;
    game_id: string;
    user_id: string;
    pool_id: string;
    quest_definition_id: string;
    assigned_date: string;
    available_at: string;
    expires_at: string;
    created_at: string;
}
export interface DailyQuestAheadQuestEntry {
    assignment: DailyQuestAssignment;
    quest: QuestDefinition;
    status: string;
    progress?: {
        id: string;
    };
}
export interface DailyQuestAheadDay {
    date: string;
    is_today: boolean;
    already_assigned: boolean;
    quests: DailyQuestAheadQuestEntry[];
}
export interface DailyQuestFuturePreview {
    pool_id: string;
    days_ahead: number;
    start_date: string;
    end_date: string;
    days: DailyQuestAheadDay[];
}
// ─── Daily Quest Assign-Ahead Preview API Function ─────────────────────────────
/**
 * GET /api/v1/games/{game_id}/admin/daily-quest-pools/{pool_id}/players/{player_id}/assign-ahead
 * Read-only. Returns whatever was pre-assigned via POST .../assign-ahead for the given player.
 * Days with no assignments are still included with quests: [].
 */
export async function getPlayerDailyQuestAheadPreview(gameId: string, poolId: string, playerId: string, params?: {
    days_ahead?: number;
}): Promise<DailyQuestFuturePreview> {
    const qs = new URLSearchParams();
    if (params?.days_ahead !== undefined)
        qs.set('days_ahead', String(params.days_ahead));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/players/${playerId}/assign-ahead${query}`);
}

/**
 * GET /api/v1/games/{game_id}/admin/daily-quest-pools/{pool_id}/players/{player_id}/assigned-timeframe
 * Read-only. Returns quests assigned within a specific timeframe.
 */
export async function getPlayerDailyQuestTimeframe(gameId: string, poolId: string, playerId: string, params: {
    start_date: string;
    end_date: string;
}): Promise<DailyQuestFuturePreview> {
    const qs = new URLSearchParams();
    qs.set('start_date', params.start_date);
    qs.set('end_date', params.end_date);
    const query = `?${qs.toString()}`;
    return api.get(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}/players/${playerId}/assigned-timeframe${query}`);
}

export async function deleteDailyQuestPool(gameId: string, poolId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/admin/daily-quest-pools/${poolId}`);
}

export interface SessionWindowConfig {
    session: {
        schedule_mode: 'fixed';
        session_start_at: string;
        session_end_at: string;
    } | {
        schedule_mode: 'interval';
        cycle_start_at: string;
        repeat_type: 'day' | 'week' | 'month';
        repeat_amount: number;
    } | {
        schedule_mode: 'annual';
        session_start_at: string;
        session_end_at: string;
    };
}
export interface SessionQuestPool {
    id: string;
    game_id: string;
    pool_key: string;
    display_name: string;
    description?: string;
    is_active: boolean;
    type_config: SessionWindowConfig;
    created_at: string;
    updated_at: string;
}
export interface SessionQuestPoolChain {
    id: string;
    pool_id: string;
    chain_id: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}
export interface SessionQuestPoolInput {
    pool_key: string;
    display_name: string;
    description?: string;
    is_active: boolean;
    type_config: SessionWindowConfig;
}
export interface ListSessionQuestPoolsResponse {
    pools: SessionQuestPool[];
    total: number;
}
export async function listSessionQuestPools(gameId: string): Promise<ListSessionQuestPoolsResponse> {
    return api.get(`/api/v1/games/${gameId}/admin/session-quest-pools`);
}
export async function createSessionQuestPool(gameId: string, data: SessionQuestPoolInput): Promise<SessionQuestPool> {
    return api.post(`/api/v1/games/${gameId}/admin/session-quest-pools`, data);
}
export async function updateSessionQuestPool(gameId: string, poolId: string, data: Partial<Omit<SessionQuestPoolInput, "pool_key">>): Promise<SessionQuestPool> {
    return api.patch(`/api/v1/games/${gameId}/admin/session-quest-pools/${poolId}`, data);
}
export async function deleteSessionQuestPool(gameId: string, poolId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/admin/session-quest-pools/${poolId}`);
}
export async function listSessionQuestPoolChains(gameId: string, poolId: string): Promise<{ chains: SessionQuestPoolChain[] }> {
    return api.get(`/api/v1/games/${gameId}/admin/session-quest-pools/${poolId}/chains`);
}
export async function addChainToSessionQuestPool(gameId: string, poolId: string, chainId: string, sortOrder: number): Promise<SessionQuestPoolChain> {
    return api.post(`/api/v1/games/${gameId}/admin/session-quest-pools/${poolId}/chains`, { chain_id: chainId, sort_order: sortOrder });
}
export async function removeChainFromSessionQuestPool(gameId: string, poolId: string, chainId: string): Promise<void> {
    return api.delete(`/api/v1/games/${gameId}/admin/session-quest-pools/${poolId}/chains/${chainId}`);
}
export async function reorderSessionQuestPoolChains(gameId: string, poolId: string, chainIds: string[]): Promise<void> {
    return api.patch(`/api/v1/games/${gameId}/admin/session-quest-pools/${poolId}/chains/order`, { chain_ids: chainIds });
}
