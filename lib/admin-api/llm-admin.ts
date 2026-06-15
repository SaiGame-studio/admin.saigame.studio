import { api } from "@/lib/api-client";

export type LLMTokenStatsPeriod = "hourly" | "daily" | "weekly" | "monthly";
export type LLMTokenStatsFilterMode = "studio_id" | "game_id" | "user_id" | "all";

export interface LLMTokenStatsBucket {
    label: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
}

export interface LLMTokenStatsResultBase {
    period: LLMTokenStatsPeriod;
    buckets: LLMTokenStatsBucket[];
    total_input_tokens: number;
    total_output_tokens: number;
    total_tokens: number;
}

export type LLMTokenStatsResult = LLMTokenStatsResultBase & Record<string, unknown>;

export interface LLMTokenBalance {
    game_id: string;
    free_tokens_remaining: number;
    free_tokens_used: number;
    premium_tokens_remaining: number;
    premium_tokens_used: number;
}

export interface LLMTokenTopUpRequest {
    free_tokens?: number;
    premium_tokens?: number;
}

export interface LLMTokenTopUpResponse {
    game_id: string;
}

export async function getLLMTokenStatsPeriods(): Promise<{
    periods: LLMTokenStatsPeriod[];
}> {
    return api.get("/api/v1/llm/token-stats/periods");
}

export async function getLLMTokenStats(period: LLMTokenStatsPeriod, mode: LLMTokenStatsFilterMode, id?: string): Promise<LLMTokenStatsResult> {
    const params = new URLSearchParams({ period });
    if (mode === "all") {
        params.set("scope", "all");
    }
    else if (id) {
        params.set(mode, id);
    }
    return api.get(`/api/v1/admin/llm/token-stats?${params}`);
}

export async function getLLMTokenBalance(gameId: string): Promise<LLMTokenBalance> {
    return api.get(`/api/v1/admin/games/${gameId}/llm-tokens/balance`);
}

export async function topUpLLMTokens(gameId: string, body: LLMTokenTopUpRequest): Promise<LLMTokenTopUpResponse> {
    return api.post(`/api/v1/admin/games/${gameId}/llm-tokens/topup`, body);
}
