import type { SystemPrompt, SystemPromptProvider } from "@/lib/system-prompt-api";

export const SLOT_LIMIT = 7;

export const FALLBACK_REQUEST_TYPES = [
  "lore_creating",
  "item_generation",
  "lore_analyzing",
  "item_modify",
  "quest_definition_generation",
  "preset_generation",
  "container_creating",
  "container_creating_planning",
  "generator_item_creating",
  "generator_item_creating_planning",
  "gacha_pack_creating",
  "gacha_pack_creating_planning",
  "equipment_slot_generation",
  "crafting_recipe_creating",
  "crafting_recipe_creating_planning",
  "entity_definition_generation",
  "entity_pool_creating",
  "entity_pool_creating_planning",
].filter((value, index, array) => array.indexOf(value) === index);

export const PROVIDERS: Array<{ value: SystemPromptProvider; label: string }> = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

export type StatusFilter = "all" | "active" | "inactive";

export type SystemPromptFormState = {
  name: string;
  prompt_type: string;
  description: string;
  content: string;
  is_active: boolean;
  max_input_tokens: string;
  max_output_tokens: string;
  temperature: string;
  provider: "" | SystemPromptProvider;
  model: string;
};

export type PromptTypeOption = {
  value: string;
  label: string;
};

export const DEFAULT_FORM: SystemPromptFormState = {
  name: "",
  prompt_type: "",
  description: "",
  content: "",
  is_active: true,
  max_input_tokens: "8192",
  max_output_tokens: "2048",
  temperature: "0.8",
  provider: "",
  model: "",
};

export function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function asNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function trimOrEmpty(value: string) {
  return value.trim();
}

export function getPromptTypeLabel(t: (key: string) => string, promptType: string) {
  const translated = t(`llmConversation.requestTypes.${promptType}`);
  return translated === `llmConversation.requestTypes.${promptType}` ? promptType : translated;
}

export function getProviderLabel(provider: string | null) {
  if (!provider)
    return "";
  const entry = PROVIDERS.find((item) => item.value === provider);
  return entry?.label ?? provider;
}

export function buildFormFromPrompt(prompt?: SystemPrompt | null): SystemPromptFormState {
  if (!prompt)
    return { ...DEFAULT_FORM };
  return {
    name: prompt.name ?? "",
    prompt_type: prompt.prompt_type ?? "",
    description: prompt.description ?? "",
    content: prompt.content ?? "",
    is_active: prompt.is_active,
    max_input_tokens: String(prompt.max_input_tokens ?? 0),
    max_output_tokens: String(prompt.max_output_tokens ?? 0),
    temperature: String(prompt.temperature ?? 0),
    provider: prompt.provider ?? "",
    model: prompt.model ?? "",
  };
}
