# LLM Gacha Pack Creating - Front-End Integration Guide

**Gacha pack creating** uses AI to draft `GachaPack` definitions for studio designers. A gacha pack defines the random reward pool, optional key requirements, and delivery destination for players who open the pack.

For frontend implementation, use this order:

1. Detect intent.
2. Run gacha pack planning.
3. Execute any `item_generation` actions returned by planning.
4. Resolve generated item refs to UUIDs.
5. Call `gacha-pack-creating`.
6. Parse the draft and save the final pack.

`gacha_pack_creating_planning` is the planning step that runs before the final pack generator when item dependencies may need to be created first. The generated draft still needs to be saved through the gacha pack JSON endpoint after item references are resolved.

---

## 1. Recommended Flow

### 1.1 Detect intent

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` when the UI accepts free-form chat.

If `detected_intents[0].type` is `gacha_pack_creating_planning`, continue to the planning step. Use `detected_language`, `entity_type`, and `goal` as the defaults for the planning request.

### 1.2 Plan gacha pack creation

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating-planning`.

The planning response returns `content.actions`.

- If an action has `type = item_generation`, create that missing item first.
- The final action always has `type = gacha_pack_creating`.
- Use the generated item codes from planning to resolve `__REF:ITEM_CODE` placeholders later.

### 1.3 Execute actions in order

Follow `content.actions` in sequence.

- For `item_generation`, call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation`, parse the generated item output, then save it through `POST /api/v1/games/{game_id}/item-definitions`.
- For `gacha_pack_creating`, call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating`.

If planning created new item refs, pass those UUIDs in `item_definition_ids` when calling `gacha-pack-creating`.

### 1.4 Save the pack

Parse the output from `gacha-pack-creating`, resolve `__REF:ITEM_CODE` placeholders to real UUIDs, then call `POST /api/v1/games/{game_id}/gacha/packs` for each pack block.

---

## 2. Backend References

| Area | Code reference |
|------|----------------|
| LLM request type | [`internal/domain/llm_content.go#L26`](../../internal/domain/llm_content.go#L26), [`internal/domain/llm_content.go#L49`](../../internal/domain/llm_content.go#L49) |
| Gacha planning request type | [`internal/domain/llm_content.go#L28`](../../internal/domain/llm_content.go#L28), [`internal/domain/system_prompt.go#L38`](../../internal/domain/system_prompt.go#L38) |
| Gacha prompt contract | [`internal/services/implementations/prompts/203_gacha_pack_generation.txt#L1`](../../internal/services/implementations/prompts/203_gacha_pack_generation.txt#L1) |
| Gacha planning prompt contract | [`internal/services/implementations/prompts/210_gacha_pack_creating_planning.txt#L1`](../../internal/services/implementations/prompts/210_gacha_pack_creating_planning.txt#L1) |
| Current LLM registered routes | [`internal/handler/route_definitions.go#L4438`](../../internal/handler/route_definitions.go#L4438), [`internal/handler/route_definitions.go#L4457`](../../internal/handler/route_definitions.go#L4457) |
| Gacha pack routes | [`internal/handler/route_definitions.go#L1938`](../../internal/handler/route_definitions.go#L1938), [`internal/handler/route_definitions.go#L1966`](../../internal/handler/route_definitions.go#L1966) |
| Create pack handler | [`internal/handler/gacha_handler.go#L398`](../../internal/handler/gacha_handler.go#L398) |

---

## 3. API Overview

| Method | Path | Auth | Protocol | Status |
|--------|------|------|----------|--------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating-planning` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating` | JWT (studio member) | SSE streaming | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/gacha/packs` | JWT (studio member, `gacha:manage`) | JSON | Available |
| `GET` | `/api/v1/games/{game_id}/gacha/packs` | JWT (studio member, `gacha:read`) | JSON | Available |

Required headers:

```http
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## 4. Preconditions

1. **Conversation exists** - create one first through `POST /api/v1/games/{game_id}/llm/conversations`.
2. **LLM token quota is available** - quota failures return `402 Payment Required`.
3. **Item definitions are available** - pass relevant `item_definition_ids` so the LLM can use their `item_code` values in `__REF:ITEM_CODE` placeholders.
4. **Item refs can be resolved** - the LLM returns `__REF:ITEM_CODE` placeholders, and the save endpoint requires real UUIDs.

---

## 5. Call `gacha-pack-creating`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating`

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
| `standard` | Default gacha pack |
| `event` | Event-limited packs |
| `seasonal` | Seasonal packs |
| `daily` | Daily packs |
| `premium` | Premium packs |
| `limited` | Limited-quantity packs |

Example request:

```jsonc
{
  "user_prompt": "Create a premium fire pack with a key item and rare rewards.",
  "language": "en",
  "entity_type": "premium",
  "item_definition_ids": [
    "01960000-0000-7000-0000-000000000101",
    "01960000-0000-7000-0000-000000000102"
  ],
  "goals": [
    "Create one premium gacha pack with a key requirement and a small reward pool"
  ]
}
```

---

## 6. Read the SSE Stream

The response has `Content-Type: text/event-stream`.

### 6.1 Connection Ping

```text
: connected
```

### 6.2 Chunk

```text
data: {"type":"chunk","text":"..."}
```

Append every `text` value into one accumulated string.

### 6.3 Done

```text
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"gacha_pack_creating","status":"completed"}
```

The stream is complete. Parse the accumulated text after this event.

### 6.4 Error

```text
data: {"type":"error","message":"..."}
```

Stop the stream and show the message.

---

## 7. Parse LLM Output

The LLM returns **one block per pack**, not a single JSON array. Each block contains labeled fields, one fenced `json` object, and a `---` separator.

Example block:

````markdown
## Fire Premium Pack
- **Code Name**: fire_premium_pack
- **Name**: Fire Premium Pack
- **Collect Destination**: mailbox
- **Is Enabled**: true
- **Description**: A premium fire pack with rare fire-themed rewards.
- **Icon**: icons/gacha/fire_pack.png
- **UI Color**: #FF6B35
- **Drop**: Flame Sword (__REF:FLAME_SWORD) - weight: 7000, qty: 1-1
- **Drop**: Fire Crystal (__REF:FIRE_CRYSTAL) - weight: 500, qty: 1-1

```json
{
  "_v": "v20260605.1",
  "code_name": "fire_premium_pack",
  "name": "Fire Premium Pack",
  "collect_destination": "mailbox",
  "is_enabled": true,
  "item_pool": [
    {
      "item_definition_id": "__REF:FLAME_SWORD",
      "weight": 7000,
      "quantity_min": 1,
      "quantity_max": 1
    },
    {
      "item_definition_id": "__REF:FIRE_CRYSTAL",
      "weight": 500,
      "quantity_min": 1,
      "quantity_max": 1
    }
  ],
  "key_requirements": [],
  "metadata": {
    "description": "A premium fire pack with rare fire-themed rewards.",
    "icon": "icons/gacha/fire_pack.png",
    "ui_color": "#FF6B35"
  }
}
```

---
````

### JSON Shape

```jsonc
{
  "_v": "v20260605.1",
  "code_name": "fire_premium_pack",
  "name": "Fire Premium Pack",
  "collect_destination": "mailbox",
  "is_enabled": true,
  "item_pool": [
    {
      "item_definition_id": "__REF:FLAME_SWORD",
      "weight": 7000,
      "quantity_min": 1,
      "quantity_max": 1
    }
  ],
  "key_requirements": [
    {
      "item_definition_id": "__REF:FIRE_KEY",
      "quantity": 1
    }
  ],
  "metadata": {}
}
```

---

## 8. Resolve `__REF:ITEM_CODE` to UUIDs

The LLM output uses `__REF:ITEM_CODE` placeholders, not real UUIDs. Before saving:

1. Build a map from the item definitions you passed through `item_definition_ids`.
2. For each `__REF:SOME_CODE`, find the item whose `item_code` is `SOME_CODE`.
3. Replace the placeholder with the real item definition `id`.
4. If a ref cannot be resolved, block save and ask the user to select an item manually.

---

## 9. Save the Pack

### `POST /api/v1/games/{game_id}/gacha/packs`

Send the parsed pack after stripping `_v` and resolving all item refs to UUIDs.

Sample `201 Created` response:

```json
{
  "id": "01960000-0000-7000-0000-000000000201",
  "game_id": "01960000-0000-7000-0000-000000000002",
  "code_name": "fire_premium_pack",
  "name": "Fire Premium Pack",
  "collect_destination": "mailbox",
  "is_enabled": true,
  "item_pool": [],
  "key_requirements": [],
  "metadata": {},
  "created_at": "2026-06-05T10:00:00Z",
  "updated_at": "2026-06-05T10:00:00Z"
}
```

---

## 10. Edit or Regenerate

For an edit/regenerate flow, send existing pack drafts through `generated_items`. The LLM should return the same number of pack blocks, modified according to the new user instruction.

```jsonc
{
  "user_prompt": "Lower the key cost to 1 and add a new rare item to the pool.",
  "entity_type": "premium",
  "generated_items": [
    {
      "code_name": "fire_premium_pack",
      "name": "Fire Premium Pack",
      "collect_destination": "mailbox",
      "is_enabled": true,
      "item_pool": [
        {
          "item_definition_id": "__REF:FLAME_SWORD",
          "weight": 7000,
          "quantity_min": 1,
          "quantity_max": 1
        }
      ],
      "key_requirements": [
        {
          "item_definition_id": "__REF:FIRE_KEY",
          "quantity": 2
        }
      ],
      "metadata": {
        "description": "A premium fire pack with rare fire-themed rewards."
      }
    }
  ]
}
```

---

## 11. Detect Intent

Use this only when the UI accepts free-form chat without a selected request type.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Create a seasonal pack with rare summer rewards and a key item.",
  "history": []
}
```

Example `200 OK` response:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "gacha_pack_creating_planning",
      "entity_type": "seasonal",
      "goal": "Create a seasonal gacha pack with rare summer rewards"
    }
  ],
  "prompt_version": "v20260605.1",
  "clarification": ""
}
```

Use `detected_intents[n].type` to select the request flow and `detected_intents[n].entity_type` as the default `entity_type` when calling the gacha pack planning endpoint.

### 11.1 Gacha Pack Planning

Gacha packs reference item definitions; they do not create item definitions themselves. `detect-intent` is only a routing step and returns the top-level `gacha_pack_creating_planning` intent. After detection, run the planning flow to decide whether any pool or key items must be created before calling `gacha-pack-creating`.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/gacha-pack-creating-planning`

Example `200 OK` response:

```jsonc
{
  "request_id": "01960000-0000-7000-8000-000000000210",
  "conversation_id": "01960000-0000-7000-8000-000000000101",
  "detected_request_type": "gacha_pack_creating_planning",
  "status": "completed",
  "prompt_version": "v20260605.1",
  "content": {
    "language": "en",
    "summary": "Create a seasonal gacha pack with one missing key item and one missing reward item.",
    "requires_item_generation": true,
    "actions": [
      {
        "type": "item_generation",
        "entity_type": "material",
        "goal": "Create a Summer Key item definition for the pack key requirement",
        "item_code": "SUMMER_KEY",
        "item_definition_ids": [],
        "depends_on": []
      },
      {
        "type": "item_generation",
        "entity_type": "weapon",
        "goal": "Create a Sun Blade item definition for the reward pool",
        "item_code": "SUN_BLADE",
        "item_definition_ids": [],
        "depends_on": []
      },
      {
        "type": "gacha_pack_creating",
        "entity_type": "seasonal",
        "goal": "Create a seasonal gacha pack that uses __REF:SUMMER_KEY and __REF:SUN_BLADE in item_definition_ids",
        "item_code": "",
        "item_definition_ids": ["__REF:SUMMER_KEY", "__REF:SUN_BLADE"],
        "depends_on": [0, 1]
      }
    ],
    "clarification": ""
  }
}
```

Front-end execution order:

1. Keep the user's originally selected `item_definition_ids`.
2. Call `gacha-pack-creating-planning` with the detected planning intent.
3. Execute any `item_generation` actions returned by planning.
4. Save the generated item definitions and add their IDs to the final `item_definition_ids` list.
5. Call `gacha-pack-creating` with the complete item definition list and the detected gacha goal.
6. After parsing the draft, validate the expected pool size and key requirement count from the goal before enabling Save.

If the parsed pack does not match the expected structure, for example the goal says `2 reward items` but `item_pool.length` is `1`, do not save the draft. Regenerate with a corrective goal or ask the user to edit the draft.

---

## 12. Validation Checklist

Before enabling the Save button:

- `code_name` matches `^[a-z][a-z0-9_]{0,63}$`.
- `name` is not empty.
- `collect_destination` is either `mailbox` or `inventory`.
- `item_pool.length` is at least `1`.
- Every item in `item_pool` has a real UUID, not `__REF:*`.
- Every `weight` is at least `1`.
- Every `quantity_min` is at least `1`.
- Every `quantity_max` is at least `quantity_min`.
- Every key requirement quantity is at least `1`.
- `metadata` has at most 50 keys total, including nested keys.
- Every key and value in `metadata` follows the backend contract.

