import { api } from "@/lib/api-client";

export type SystemPromptType = string;
export type SystemPromptProvider = "gemini" | "openai" | "anthropic";

export interface SystemPrompt {
    id: string;
    game_id: string | null;
    created_by: string | null;
    name: string;
    prompt_type: SystemPromptType;
    description: string;
    is_active: boolean;
    content: string;
    max_input_tokens: number;
    max_output_tokens: number;
    temperature: number;
    provider: SystemPromptProvider | null;
    model: string | null;
    created_at: string;
    updated_at: string;
}

export interface SystemPromptsResult {
    data: SystemPrompt[];
}

export interface CreateSystemPromptBody {
    name: string;
    prompt_type: SystemPromptType;
    description?: string;
    is_active: boolean;
    content: string;
    max_input_tokens?: number;
    max_output_tokens?: number;
    temperature?: number;
    provider?: SystemPromptProvider | null;
    model?: string | null;
}

export interface UpdateSystemPromptBody {
    name?: string;
    prompt_type?: SystemPromptType;
    description?: string;
    is_active?: boolean;
    content?: string;
    max_input_tokens?: number;
    max_output_tokens?: number;
    temperature?: number;
    provider?: SystemPromptProvider | "" | null;
    model?: string | null;
}

export async function listDefaultSystemPrompts(params?: {
    prompt_type?: SystemPromptType;
}): Promise<SystemPromptsResult> {
    const query = new URLSearchParams();
    if (params?.prompt_type)
        query.set("prompt_type", params.prompt_type);
    const qs = query.toString();
    return api.get(`/api/v1/system-prompts/defaults${qs ? `?${qs}` : ""}`);
}

export async function getDefaultSystemPrompt(id: string): Promise<SystemPrompt> {
    return api.get(`/api/v1/system-prompts/defaults/${encodeURIComponent(id)}`);
}

export async function createDefaultSystemPrompt(body: CreateSystemPromptBody): Promise<SystemPrompt> {
    return api.post("/api/v1/admin/system-prompts", body);
}

export async function updateDefaultSystemPrompt(id: string, body: UpdateSystemPromptBody): Promise<SystemPrompt> {
    return api.patch(`/api/v1/admin/system-prompts/${encodeURIComponent(id)}`, body);
}
