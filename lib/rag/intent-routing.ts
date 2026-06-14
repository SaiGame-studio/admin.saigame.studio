/**
 * RAG chunk: Intent detection and request routing.
 * Injected when the user asks how prompts are classified or routed to different AI tasks.
 */
export const KEYWORDS = [
    'intent', 'detect', 'routing', 'request type', 'classify', 'auto', 'auto-detect',
    'how does the AI know', 'wrong intent', 'detected wrong', 'specify type',
    'loại request', 'phân loại', 'tự động nhận biết', 'nhận dạng ý định',
];
export const INTENT_TYPES: string[] = [];
export const DOC = `
# Intent Detection & Request Routing

## How the System Classifies Prompts
Before executing any generation, the system runs a **detect-intent** call:
1. Your prompt is sent to a low-temperature (deterministic) LLM call.
2. The LLM classifies it into one or more known request types.
3. The system then fires a separate streaming request for each detected intent.

This means from a single prompt like "Create lore for the Iron Kingdom and generate 5 weapons for knights", the system will automatically:
- Run a \`lore_creating\` request for the lore
- Run an \`item_generation\` request for the weapons

## All Known Request Types
| Type | What It Does |
|---|---|
| \`item_generation\` | Generate new item definitions |
| \`item_modify\` | Edit or update existing generated items |
| \`generator_item_creating\` | Generate items via a generator template |
| \`lore_creating\` | Create new lore entries (characters, locations, factions, etc.) |
| \`lore_analyzing\` | Analyze or summarize provided lore |
| \`lore_updating\` | Update existing lore entries |
| \`container_creating\` | Create container definitions with required code_name (chest, bag, inventory, etc.) |
| \`gacha_pack_creating\` | Create gacha pack definitions |
| \`preset_generation\` | Create preset definitions (deck, party, loadout, etc.) |

## If Detection Picks the Wrong Type
The system may occasionally misclassify ambiguous prompts. You can:
1. **Rephrase** your prompt to be more explicit (e.g. "Generate item definitions for..." instead of just "Create items").
2. **Specify** the intent explicitly by selecting the type in the UI before sending.

## Priority Order for Multi-Intent
When multiple intents are detected, they are executed in this order:
1. Lore operations first (lore_creating, lore_analyzing, lore_updating)
2. Item / generation operations second
This ensures lore context is generated before items that reference it.

## The "Unknown" Intent
If the classifier cannot determine the intent, it returns an \`IntentUndetectableError\` and asks the user for clarification instead of guessing.
`;
