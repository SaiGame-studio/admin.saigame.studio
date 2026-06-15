import { api } from "@/lib/api-client";
import type {
  CreateSystemPromptBody,
  SystemPrompt,
  SystemPromptProvider,
  SystemPromptType,
  UpdateSystemPromptBody,
} from "@/lib/admin-api";

export type {
  CreateSystemPromptBody,
  SystemPrompt,
  SystemPromptProvider,
  SystemPromptType,
  UpdateSystemPromptBody,
};

export interface SystemPromptsResult {
  metadata?: {
    max_sys_prompts?: number;
  };
  data: SystemPrompt[];
}

export async function listGameSystemPrompts(gameId: string): Promise<SystemPromptsResult> {
  return api.get(`/api/v1/games/${encodeURIComponent(gameId)}/system-prompts`, { suppressToast: true });
}

export async function listDefaultSystemPrompts(): Promise<SystemPromptsResult> {
  return api.get("/api/v1/system-prompts/defaults", { suppressToast: true });
}

export async function getGameSystemPrompt(gameId: string, promptId: string): Promise<SystemPrompt> {
  return api.get(`/api/v1/games/${encodeURIComponent(gameId)}/system-prompts/${encodeURIComponent(promptId)}`, { suppressToast: true });
}

export async function createGameSystemPrompt(gameId: string, body: CreateSystemPromptBody): Promise<SystemPrompt> {
  return api.post(`/api/v1/games/${encodeURIComponent(gameId)}/system-prompts`, body, { suppressToast: true });
}

export async function updateGameSystemPrompt(gameId: string, promptId: string, body: UpdateSystemPromptBody): Promise<SystemPrompt> {
  return api.patch(`/api/v1/games/${encodeURIComponent(gameId)}/system-prompts/${encodeURIComponent(promptId)}`, body, { suppressToast: true });
}

export async function deleteGameSystemPrompt(gameId: string, promptId: string): Promise<void> {
  await api.delete(`/api/v1/games/${encodeURIComponent(gameId)}/system-prompts/${encodeURIComponent(promptId)}`, { suppressToast: true });
}
