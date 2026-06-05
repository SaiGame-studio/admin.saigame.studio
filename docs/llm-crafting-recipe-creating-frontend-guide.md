# LLM Crafting Recipe Creating - Front-End Integration Guide

**Crafting recipe creating** uses AI to draft `CraftRecipe` definitions for studio designers. A crafting recipe defines the player-facing formula for combining input items into one or more output items, including success chance, bonus output chance, consumed materials, and optional in-place item upgrades.

For frontend implementation, use this order:

1. Detect intent.
2. Run crafting recipe planning.
3. Execute any `item_generation` actions returned by planning.
4. Resolve generated item refs to UUIDs.
5. Call `crafting-recipe-creating`.
6. Parse the draft and save the final recipe.

`crafting_recipe_creating_planning` is the planning step that runs before the final recipe generator when item dependencies may need to be created first. The generated draft still needs to be saved through the crafting recipe JSON endpoint after item references are resolved.

---

## 1. Recommended Flow

### 1.1 Detect intent

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` when the UI accepts free-form chat.

If `detected_intents[0].type` is `crafting_recipe_creating_planning`, continue to the planning step. Use `detected_language`, `entity_type`, and `goal` as the defaults for the planning request.

### 1.2 Plan crafting recipe creation

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/crafting-recipe-creating-planning`.

The planning response returns `content.actions`.

- If an action has `type = item_generation`, create that missing item first.
- The final action always has `type = crafting_recipe_creating`.
- Use the generated item codes from planning to resolve `__REF:ITEM_CODE` placeholders later.

### 1.3 Execute actions in order

Follow `content.actions` in sequence.

- For `item_generation`, call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation`, parse the generated item output, then save it through `POST /api/v1/games/{game_id}/item-definitions`.
- For `crafting_recipe_creating`, call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/crafting-recipe-creating`.

If planning created new item refs, pass those UUIDs in `item_definition_ids` when calling `crafting-recipe-creating`.

### 1.4 Save the recipe

Parse the output from `crafting-recipe-creating`, resolve `__REF:ITEM_CODE` placeholders to real UUIDs, then call `POST /api/v1/games/{game_id}/crafting/recipes` for each recipe block.

---

## Backend References

| Area | Code reference |
|------|----------------|
| LLM request type | [`internal/domain/llm_content.go#L33`](../../internal/domain/llm_content.go#L33), [`internal/domain/llm_content.go#L49`](../../internal/domain/llm_content.go#L49) |
| Crafting planning request type | [`internal/domain/llm_content.go#L29`](../../internal/domain/llm_content.go#L29), [`internal/domain/llm_content.go#L55`](../../internal/domain/llm_content.go#L55), [`internal/domain/system_prompt.go#L40`](../../internal/domain/system_prompt.go#L40) |
| Crafting prompt contract | [`internal/services/implementations/prompts/206_crafting_recipe_creating.txt#L1`](../../internal/services/implementations/prompts/206_crafting_recipe_creating.txt#L1), [`internal/services/implementations/prompts/206_crafting_recipe_creating.txt#L64`](../../internal/services/implementations/prompts/206_crafting_recipe_creating.txt#L64) |
| Crafting planning prompt contract | [`internal/services/implementations/prompts/209_crafting_recipe_creating_planning.txt#L1`](../../internal/services/implementations/prompts/209_crafting_recipe_creating_planning.txt#L1) |
| Current LLM registered routes | [`internal/handler/route_definitions.go#L4385`](../../internal/handler/route_definitions.go#L4385), [`internal/handler/route_definitions.go#L4481`](../../internal/handler/route_definitions.go#L4481), [`internal/handler/route_definitions.go#L4489`](../../internal/handler/route_definitions.go#L4489) |
| Crafting recipe routes | [`internal/handler/route_definitions.go#L586`](../../internal/handler/route_definitions.go#L586), [`internal/handler/route_definitions.go#L612`](../../internal/handler/route_definitions.go#L612) |
| Create recipe handler | [`internal/handler/crafting_handler.go#L294`](../../internal/handler/crafting_handler.go#L294), [`internal/handler/crafting_handler.go#L326`](../../internal/handler/crafting_handler.go#L326) |
| Input and output parsing | [`internal/handler/crafting_handler.go#L513`](../../internal/handler/crafting_handler.go#L513), [`internal/handler/crafting_handler.go#L532`](../../internal/handler/crafting_handler.go#L532) |

---

## API Overview

| Method | Path | Auth | Protocol | Status |
|--------|------|------|----------|--------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/crafting-recipe-creating-planning` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/crafting-recipe-creating` | JWT (studio member) | SSE streaming | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/crafting/recipes` | JWT (studio member, `craft:manage`) | JSON | Available |
| `GET` | `/api/v1/games/{game_id}/crafting/recipes` | JWT (studio member, `craft:manage`) | JSON | Available |
| `GET` | `/api/v1/games/{game_id}/crafting/recipes/{recipe_id}` | JWT (studio member, `craft:manage`) | JSON | Available |
| `PUT` | `/api/v1/games/{game_id}/crafting/recipes/{recipe_id}` | JWT (studio member, `craft:update`) | JSON | Available |
| `DELETE` | `/api/v1/games/{game_id}/crafting/recipes/{recipe_id}` | JWT (studio member, `craft:manage`) | JSON | Available |

Required headers:

```http
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## Preconditions

1. **Conversation exists** - create one first through `POST /api/v1/games/{game_id}/llm/conversations`.
2. **LLM token quota is available** - quota failures return `402 Payment Required`.
3. **Item definitions are available** - pass relevant `item_definition_ids` so the LLM can use their `item_code` values in `__REF:ITEM_CODE` placeholders.
4. **Item refs can be resolved** - the LLM returns `__REF:ITEM_CODE` placeholders, and the save endpoint requires real UUIDs.

---

## 2. Call `crafting-recipe-creating`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/crafting-recipe-creating`

Call this only after the planning step has finished and all required item generation has been resolved.

#### Request Body

```jsonc
{
  "user_prompt": "string",
  "language": "string",
  "entity_type": "string",
  "goals": ["string"],
  "lore_entry_ids": ["uuid"],
  "item_definition_ids": ["uuid"],
  "generated_items": [{}],
  "request_history": []
}
```

Valid `entity_type` values:

| Value | Use case |
|-------|----------|
| `weapon` | Weapon forging, enhancement, or fusion recipes |
| `armor` | Armor upgrade or armor crafting recipes |
| `accessory` | Ring, charm, necklace, or trinket recipes |
| `potion` | Consumable brewing recipes |
| `card_fusion` | Card combine, evolve, or fusion recipes |
| `material` | Material conversion or refinement recipes |
| `other` | Any recipe that does not fit the categories above |

Example request:

```jsonc
{
  "user_prompt": "Create 2 weapon crafting recipes: enhance an iron sword and fuse 3 common swords into a rare sword.",
  "language": "en",
  "entity_type": "weapon",
  "item_definition_ids": [
    "01960000-0000-7000-0000-000000000101",
    "01960000-0000-7000-0000-000000000102",
    "01960000-0000-7000-0000-000000000103"
  ],
  "goals": [
    "Create one in-place upgrade recipe for Iron Sword",
    "Create one fusion recipe that consumes 3 Common Sword items"
  ]
}
```

---

## 3. Read the SSE Stream

The response has `Content-Type: text/event-stream`.

### 3.1 Connection Ping

```text
: connected
```

This confirms the stream opened. No UI action is required.

### 3.2 Chunk

```text
data: {"type":"chunk","text":"..."}
```

Append every `text` value into one accumulated string.

### 3.3 Done

```text
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"crafting_recipe_creating","status":"completed"}
```

The stream is complete. Parse the accumulated text after this event.

### 3.4 Error

```text
data: {"type":"error","message":"..."}
```

Stop the stream and show the message.

---

## 4. Parse LLM Output

The LLM returns **one block per recipe**, not a single JSON array. Each block contains labeled fields, one fenced `json` object, and a `---` separator.

Example block:

````markdown
## Enhance Iron Sword
- **Recipe Key**: enhance_iron_sword
- **Name**: Enhance Iron Sword
- **Description**: Enhances an Iron Sword, increasing its attack power.
- **Category**: weapon
- **Success Rate**: 7500000 (75.00%)
- **Bonus Rate**: 1000000 (10.00%)
- **Is Active**: true
- **Input**: Iron Sword (__REF:IRON_SWORD) - qty: 1, consumed: false
- **Input**: Enhance Stone (__REF:ENHANCE_STONE) - qty: 3, consumed: true
- **Output**: Iron Sword (__REF:IRON_SWORD) - qty: 1-1, type: main, level_increment: 1, properties_patch: {"attack_bonus": 5}

```json
{
  "_v": "v20260604.1",
  "recipe_key": "enhance_iron_sword",
  "name": "Enhance Iron Sword",
  "description": "Enhances an Iron Sword, increasing its attack power.",
  "category": "weapon",
  "success_rate": 7500000,
  "bonus_rate": 1000000,
  "is_active": true,
  "inputs": [
    {
      "item_definition_id": "__REF:IRON_SWORD",
      "quantity": 1,
      "is_consumed": false
    },
    {
      "item_definition_id": "__REF:ENHANCE_STONE",
      "quantity": 3,
      "is_consumed": true
    }
  ],
  "outputs": [
    {
      "item_definition_id": "__REF:IRON_SWORD",
      "quantity_min": 1,
      "quantity_max": 1,
      "output_type": "main",
      "level_increment": 1,
      "properties_patch": {
        "attack_bonus": 5
      },
      "sort_order": 1
    }
  ],
  "metadata": {}
}
```

---
````

### JSON Shape

```jsonc
{
  "_v": "v20260604.1",
  "recipe_key": "enhance_iron_sword",
  "name": "Enhance Iron Sword",
  "description": "Enhances an Iron Sword, increasing its attack power.",
  "category": "weapon",
  "success_rate": 7500000,
  "bonus_rate": 1000000,
  "available_from": null,
  "available_until": null,
  "is_active": true,
  "inputs": [
    {
      "item_definition_id": "__REF:IRON_SWORD",
      "quantity": 1,
      "is_consumed": false
    }
  ],
  "outputs": [
    {
      "item_definition_id": "__REF:IRON_SWORD",
      "quantity_min": 1,
      "quantity_max": 1,
      "output_type": "main",
      "level_increment": 1,
      "properties_patch": { "attack_bonus": 5 },
      "sort_order": 1
    }
  ],
  "metadata": {}
}
```

Field notes:

| Field | Type | Front-end handling |
|-------|------|--------------------|
| `_v` | string | Internal prompt version. Strip before saving. |
| `recipe_key` | string | Must match `^[a-z][a-z0-9_]{0,63}$`. |
| `name` | string | Required display name. |
| `description` | string or omitted | Optional text shown in the studio UI. |
| `category` | string or omitted | Use one of the recipe categories above. |
| `success_rate` | number | Scale is `10000000` for 100 percent. |
| `bonus_rate` | number | Scale is `10000000` for 100 percent. |
| `available_from` | ISO timestamp or null | Optional schedule start. |
| `available_until` | ISO timestamp or null | Optional schedule end. |
| `is_active` | boolean | Usually `true` for newly generated recipes. |
| `inputs` | array | At least 1 item, max 7. Resolve each `item_definition_id`. |
| `outputs` | array | At least 1 item, max 7, and at least one `main` output. |
| `metadata` | object | Max 50 keys total, including nested keys. |

---

## 5. Resolve `__REF:ITEM_CODE` to UUIDs

The LLM output uses `__REF:ITEM_CODE` placeholders, not real UUIDs. Before saving:

1. Build a map from the item definitions you passed through `item_definition_ids`.
2. For each `__REF:SOME_CODE`, find the item whose `item_code` is `SOME_CODE`.
3. Replace the placeholder with the real item definition `id`.
4. If a ref cannot be resolved, block save and ask the user to select an item manually.

```typescript
interface ItemDefinitionOption {
  id: string;
  item_code: string;
  name: string;
}

function resolveItemRef(ref: string, itemCodeToId: Map<string, string>): string {
  const match = ref.match(/^__REF:(.+)$/);
  if (!match) return ref;

  const resolved = itemCodeToId.get(match[1]);
  if (!resolved) {
    throw new Error(`Unresolved item reference: ${ref}`);
  }
  return resolved;
}

function buildItemCodeMap(items: ItemDefinitionOption[]): Map<string, string> {
  return new Map(items.map((item) => [item.item_code, item.id]));
}
```

---

## 6. Save the Recipe

### `POST /api/v1/games/{game_id}/crafting/recipes`

Send the parsed recipe after stripping `_v` and resolving all item refs to UUIDs.

```jsonc
{
  "recipe_key": "enhance_iron_sword",
  "name": "Enhance Iron Sword",
  "description": "Enhances an Iron Sword, increasing its attack power.",
  "category": "weapon",
  "success_rate": 7500000,
  "bonus_rate": 1000000,
  "available_from": null,
  "available_until": null,
  "is_active": true,
  "inputs": [
    {
      "item_definition_id": "01960000-0000-7000-0000-000000000101",
      "quantity": 1,
      "is_consumed": false
    },
    {
      "item_definition_id": "01960000-0000-7000-0000-000000000102",
      "quantity": 3,
      "is_consumed": true
    }
  ],
  "outputs": [
    {
      "item_definition_id": "01960000-0000-7000-0000-000000000101",
      "quantity_min": 1,
      "quantity_max": 1,
      "output_type": "main",
      "level_increment": 1,
      "properties_patch": {
        "attack_bonus": 5
      },
      "sort_order": 1
    }
  ],
  "metadata": {}
}
```

Sample `201 Created` response:

```json
{
  "id": "01960000-0000-7000-0000-000000000201",
  "game_id": "01960000-0000-7000-0000-000000000002",
  "recipe_key": "enhance_iron_sword",
  "name": "Enhance Iron Sword",
  "description": "Enhances an Iron Sword, increasing its attack power.",
  "category": "weapon",
  "success_rate": 7500000,
  "bonus_rate": 1000000,
  "available_from": null,
  "available_until": null,
  "is_active": true,
  "metadata": {},
  "inputs": [
    {
      "id": "01960000-0000-7000-0000-000000000301",
      "recipe_id": "01960000-0000-7000-0000-000000000201",
      "game_id": "01960000-0000-7000-0000-000000000002",
      "item_definition_id": "01960000-0000-7000-0000-000000000101",
      "quantity": 1,
      "is_consumed": false,
      "created_at": "2026-06-04T10:00:00Z",
      "updated_at": "2026-06-04T10:00:00Z"
    }
  ],
  "outputs": [
    {
      "id": "01960000-0000-7000-0000-000000000401",
      "recipe_id": "01960000-0000-7000-0000-000000000201",
      "game_id": "01960000-0000-7000-0000-000000000002",
      "item_definition_id": "01960000-0000-7000-0000-000000000101",
      "quantity_min": 1,
      "quantity_max": 1,
      "output_type": "main",
      "level_increment": 1,
      "properties_patch": {
        "attack_bonus": 5
      },
      "sort_order": 1,
      "created_at": "2026-06-04T10:00:00Z",
      "updated_at": "2026-06-04T10:00:00Z"
    }
  ],
  "created_by": "01960000-0000-7000-0000-000000000099",
  "created_at": "2026-06-04T10:00:00Z",
  "updated_at": "2026-06-04T10:00:00Z"
}
```

---

## 7. Edit or Regenerate

For an edit/regenerate flow, send existing recipe drafts through `generated_items`. The LLM should return the same number of recipe blocks, modified according to the new user instruction.

```jsonc
{
  "user_prompt": "Lower the success rate to 60 percent and add a bonus output for scrap metal.",
  "language": "en",
  "entity_type": "weapon",
  "generated_items": [
    {
      "recipe_key": "enhance_iron_sword",
      "name": "Enhance Iron Sword",
      "description": "Enhances an Iron Sword, increasing its attack power.",
      "category": "weapon",
      "success_rate": 7500000,
      "bonus_rate": 0,
      "is_active": true,
      "inputs": [
        {
          "item_definition_id": "__REF:IRON_SWORD",
          "quantity": 1,
          "is_consumed": false
        }
      ],
      "outputs": [
        {
          "item_definition_id": "__REF:IRON_SWORD",
          "quantity_min": 1,
          "quantity_max": 1,
          "output_type": "main",
          "level_increment": 1,
          "properties_patch": { "attack_bonus": 5 },
          "sort_order": 1
        }
      ],
      "metadata": {}
    }
  ]
}
```

---

## 8. Detect Intent

Use this only when the UI accepts free-form chat without a selected request type.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Create a sword enhancement recipe and a potion brewing recipe.",
  "history": []
}
```

Example `200 OK` response:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "crafting_recipe_creating_planning",
      "entity_type": "weapon",
      "goal": "Create a sword enhancement crafting recipe with missing item definitions"
    },
    {
      "type": "crafting_recipe_creating_planning",
      "entity_type": "potion",
      "goal": "Create a potion brewing crafting recipe with missing item definitions"
    }
  ],
  "prompt_version": "v20260605.1",
  "clarification": ""
}
```

Use `detected_intents[n].type` to select the request flow and `detected_intents[n].entity_type` as the default `entity_type` when calling the crafting recipe planning endpoint.

### 8.1 Crafting Recipe Planning

Crafting recipes reference item definitions; they do not create item definitions themselves. `detect-intent` is only a routing step and returns the top-level `crafting_recipe_creating_planning` intent. After detection, run the planning flow to decide whether any input or output item definitions must be created before calling `crafting-recipe-creating`.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/crafting-recipe-creating-planning`

Example `200 OK` response:

```jsonc
{
  "request_id": "01960000-0000-7000-8000-000000000209",
  "conversation_id": "01960000-0000-7000-8000-000000000101",
  "detected_request_type": "crafting_recipe_creating_planning",
  "status": "completed",
  "prompt_version": "v20260605.1",
  "content": {
    "language": "en",
    "summary": "Create a weapon crafting recipe with one missing output item.",
    "requires_item_generation": true,
    "actions": [
      {
        "type": "item_generation",
        "entity_type": "material",
        "goal": "Create an Iron Ore item definition for the recipe input",
        "item_code": "IRON_ORE",
        "item_definition_ids": [],
        "depends_on": []
      },
      {
        "type": "crafting_recipe_creating",
        "entity_type": "weapon",
        "goal": "Create a weapon crafting recipe that uses __REF:IRON_ORE in item_definition_ids",
        "item_code": "",
        "item_definition_ids": ["__REF:IRON_ORE"],
        "depends_on": [0]
      }
    ],
    "clarification": ""
  }
}
```

Expected detect-intent result for a recipe with two inputs and one output:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "crafting_recipe_creating_planning",
      "entity_type": "weapon",
      "goal": "Create one weapon crafting recipe with 2 distinct inputs, Iron Ore and Wood, and 1 main output, Iron Sword"
    }
  ],
  "prompt_version": "v20260605.1",
  "clarification": ""
}
```

Front-end execution order:

1. Keep the user's originally selected `item_definition_ids`.
2. Call `crafting-recipe-creating-planning` with the detected planning intent.
3. Execute any `item_generation` actions returned by planning.
4. Save the generated item definitions and add their IDs to the final `item_definition_ids` list.
5. Call `crafting-recipe-creating` with the complete item definition list and the detected crafting goal.
6. After parsing the draft, validate the expected input/output counts from the goal before enabling Save.

If the parsed recipe does not match the expected structure, for example the goal says `2 distinct inputs` but `inputs.length` is `1`, do not save the draft. Regenerate with a corrective goal or ask the user to edit the draft.

---

## 9. Full TypeScript Example

```typescript
export type CraftingRecipeEntityType =
  | "weapon"
  | "armor"
  | "accessory"
  | "potion"
  | "card_fusion"
  | "material"
  | "other";

export interface CraftRecipeInputDraft {
  item_definition_id: string;
  quantity: number;
  is_consumed: boolean;
}

export interface CraftRecipeOutputDraft {
  item_definition_id: string;
  quantity_min: number;
  quantity_max: number;
  output_type: "main" | "bonus";
  level_increment?: number | null;
  properties_patch?: Record<string, unknown> | null;
  sort_order: number;
}

export interface CraftRecipeDraft {
  _v?: string;
  recipe_key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  success_rate: number;
  bonus_rate: number;
  available_from?: string | null;
  available_until?: string | null;
  is_active: boolean;
  inputs: CraftRecipeInputDraft[];
  outputs: CraftRecipeOutputDraft[];
  metadata?: Record<string, unknown>;
}

export interface CraftRecipeInputResult extends CraftRecipeInputDraft {
  id: string;
  recipe_id: string;
  game_id: string;
  created_at: string;
  updated_at: string;
  item_definition?: unknown;
}

export interface CraftRecipeOutputResult extends CraftRecipeOutputDraft {
  id: string;
  recipe_id: string;
  game_id: string;
  created_at: string;
  updated_at: string;
  item_definition?: unknown;
}

export interface CraftRecipeResult extends Omit<CraftRecipeDraft, "_v"> {
  id: string;
  game_id: string;
  inputs: CraftRecipeInputResult[];
  outputs: CraftRecipeOutputResult[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

async function streamCraftingRecipeCreating(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  options?: {
    language?: string;
    entityType?: CraftingRecipeEntityType;
    goals?: string[];
    loreEntryIds?: string[];
    itemDefinitionIds?: string[];
    generatedItems?: CraftRecipeDraft[];
  }
): Promise<string> {
  const body: Record<string, unknown> = { user_prompt: userPrompt };
  if (options?.language) body.language = options.language;
  if (options?.entityType) body.entity_type = options.entityType;
  if (options?.goals?.length) body.goals = options.goals;
  if (options?.loreEntryIds?.length) body.lore_entry_ids = options.loreEntryIds;
  if (options?.itemDefinitionIds?.length) body.item_definition_ids = options.itemDefinitionIds;
  if (options?.generatedItems?.length) body.generated_items = options.generatedItems;

  const res = await fetch(
    `/api/v1/games/${gameId}/llm/conversations/${conversationId}/requests/crafting-recipe-creating`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === "chunk") accumulated += event.text;
      if (event.type === "error") throw new Error(event.message);
      if (event.type === "done") return accumulated;
    }
  }

  return accumulated;
}

function extractRecipeBlocks(raw: string): CraftRecipeDraft[] {
  const recipes: CraftRecipeDraft[] = [];
  const fenceRe = /```json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(raw)) !== null) {
    const parsed = JSON.parse(match[1].trim()) as CraftRecipeDraft;
    recipes.push(parsed);
  }

  return recipes;
}

function resolveRecipeRefs(recipe: CraftRecipeDraft, itemCodeToId: Map<string, string>): CraftRecipeDraft {
  return {
    ...recipe,
    inputs: recipe.inputs.map((input) => ({
      ...input,
      item_definition_id: resolveItemRef(input.item_definition_id, itemCodeToId),
    })),
    outputs: recipe.outputs.map((output) => ({
      ...output,
      item_definition_id: resolveItemRef(output.item_definition_id, itemCodeToId),
    })),
  };
}

async function saveCraftRecipe(gameId: string, draft: CraftRecipeDraft): Promise<CraftRecipeResult> {
  const { _v: _ignored, ...body } = draft;

  const res = await fetch(`/api/v1/games/${gameId}/crafting/recipes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

async function generateAndSaveCraftRecipes(
  gameId: string,
  conversationId: string,
  userPrompt: string,
  itemCodeToId: Map<string, string>,
  options?: {
    language?: string;
    entityType?: CraftingRecipeEntityType;
    goals?: string[];
    itemDefinitionIds?: string[];
  }
): Promise<CraftRecipeResult[]> {
  const raw = await streamCraftingRecipeCreating(gameId, conversationId, userPrompt, options);
  const drafts = extractRecipeBlocks(raw).map((recipe) => resolveRecipeRefs(recipe, itemCodeToId));
  return Promise.all(drafts.map((recipe) => saveCraftRecipe(gameId, recipe)));
}
```

---

## 10. Validation Checklist

Before enabling the Save button:

- `recipe_key` matches `^[a-z][a-z0-9_]{0,63}$`.
- `name` is not empty.
- `success_rate` and `bonus_rate` are integers from `0` to `10000000`.
- `inputs.length` is between `1` and `7`.
- `outputs.length` is between `1` and `7`.
- At least one output has `output_type === "main"`.
- Every input and output `item_definition_id` is a real UUID, not `__REF:*`.
- `quantity`, `quantity_min`, and `quantity_max` are valid positive integers.
- `quantity_max >= quantity_min`.
- `level_increment`, when present, is greater than `0`.
- `metadata` has at most 50 keys total, including nested keys.

---

## 11. Important UI Notes

### Success and bonus rates use a 10,000,000 scale

Display percentages by dividing by `10000000`. For example, `7500000` is `75%`, and `500000` is `5%`.

### Upgrade recipes use the same item as input and output

If an output item definition matches an input item definition, treat the recipe as an in-place upgrade in the UI. The base input should normally use `is_consumed: false`, and the output should include `level_increment` or `properties_patch`.

### Do not send `_v` to the save endpoint

`_v` is only the prompt-output version marker. Strip it before saving.

### Block unresolved refs

Saving unresolved `__REF:*` values will fail because the save endpoint parses item IDs as UUIDs.
