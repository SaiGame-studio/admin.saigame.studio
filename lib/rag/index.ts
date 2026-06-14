/**
 * RAG-lite lookup engine.
 *
 * Usage:
 *   import { getRelevantDocs } from '@/lib/rag'
 *
 *   // In your "help" request handler:
 *   const context = getRelevantDocs(userPrompt, detectedIntentType)
 *   const enrichedPrompt = `[PLATFORM CONTEXT]\n${context}\n\n[USER QUESTION]\n${userPrompt}`
 *
 * How it works:
 *   1. Each doc module declares KEYWORDS and INTENT_TYPES.
 *   2. This function scores each module against the user's prompt and intent type.
 *   3. Returns the concatenated DOC strings of the top-scoring modules (up to MAX_CHUNKS).
 *
 * To add a new topic:
 *   1. Create lib/rag/my-topic.ts exporting KEYWORDS, INTENT_TYPES, DOC.
 *   2. Import and add it to the ALL_MODULES array below.
 */
import * as overview from './overview';
import * as conversations from './conversations';
import * as intentRouting from './intent-routing';
import * as items from './items';
import * as lore from './lore';
import * as containers from './containers';
import * as gacha from './gacha';
import * as presets from './presets';
import * as tokens from './tokens';
interface RagModule {
    KEYWORDS: string[];
    INTENT_TYPES: string[];
    DOC: string;
}
const ALL_MODULES: RagModule[] = [
    overview,
    conversations,
    intentRouting,
    items,
    lore,
    containers,
    gacha,
    presets,
    tokens,
];
/** Maximum number of doc chunks to inject. Keeps context size bounded. */
const MAX_CHUNKS = 3;
/**
 * Returns the most relevant documentation chunks for a given user prompt and optional intent type.
 * Always includes the platform overview as a baseline.
 *
 * @param prompt - The raw user message.
 * @param intentType - Optional detected intent type (e.g. "item_generation").
 * @returns Concatenated documentation string ready to inject into an LLM prompt.
 */
export function getRelevantDocs(prompt: string, intentType?: string): string {
    const normalizedPrompt = prompt.toLowerCase();
    const scored = ALL_MODULES.map((mod) => {
        let score = 0;
        // Keyword match in prompt
        for (const kw of mod.KEYWORDS) {
            if (normalizedPrompt.includes(kw.toLowerCase())) {
                score += 1;
            }
        }
        // Intent type exact match — strong signal
        if (intentType && mod.INTENT_TYPES.includes(intentType)) {
            score += 10;
        }
        // Always include overview as baseline
        if (mod === overview) {
            score += 1;
        }
        return { mod, score };
    });
    const topModules = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_CHUNKS)
        .map((s) => s.mod);
    // Ensure overview is always present if nothing else matched
    if (topModules.length === 0) {
        topModules.push(overview);
    }
    return topModules.map((m) => m.DOC.trim()).join('\n\n---\n\n');
}
/**
 * Returns ALL documentation chunks concatenated.
 * Use only when you have a very broad "how does the system work" question
 * and token budget is not a concern.
 */
export function getAllDocs(): string {
    return ALL_MODULES.map((m) => m.DOC.trim()).join('\n\n---\n\n');
}
