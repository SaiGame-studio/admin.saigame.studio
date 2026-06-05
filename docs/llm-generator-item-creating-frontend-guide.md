# LLM Generator Item Creating - Front-End Integration Guide

**Generator item creating** uses AI to draft `ItemDefinition` records for passive, time-based resource producers. A generator item defines what the player owns, how often it produces output, how much it can store, and which output items it can generate.

For frontend implementation, use this order:

1. Detect intent.
2. Run generator item planning.
3. Execute any `item_generation` actions returned by planning.
4. Resolve generated item refs to UUIDs.
5. Call `generator-item-creating`.
6. Parse the draft and save the final generator item definition.

`generator_item_creating_planning` is the planning step that runs before the final generator-item-creating request when output item dependencies may need to be created first. The generated draft still needs to be saved through the item-definition JSON endpoint after item references are resolved.

---

## 1. Recommended Flow

### 1.1 Detect intent

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` when the UI accepts free-form chat.

If `detected_intents[0].type` is `generator_item_creating_planning`, continue to the planning step. Use `detected_language`, `entity_type`, and `goal` as the defaults for the planning request.

### 1.2 Plan generator item creation

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/generator-item-creating-planning`.

The planning response returns `content.actions`.

- If an action has `type = item_generation`, create that missing output item first.
- The final action always has `type = generator_item_creating`.
- Use the generated item codes from planning to resolve `__REF:ITEM_CODE` placeholders later.

### 1.3 Execute actions in order

Follow `content.actions` in sequence.

- For `item_generation`, send the **full planning action** to `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/item-generation` via `generated_items`. This keeps `item_code`, `item_category`, `item_name`, `item_definition_ids`, and `depends_on` intact for the LLM. Then parse the generated item output and save it through `POST /api/v1/games/{game_id}/item-definitions`.
- For `generator_item_creating`, call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/generator-item-creating`.

If planning created new item refs, pass those UUIDs in `item_definition_ids` when calling `generator-item-creating`.

### 1.4 Save the generator

Parse the output from `generator-item-creating`, resolve `__REF:ITEM_CODE` placeholders to real UUIDs, then call `POST /api/v1/games/{game_id}/item-definitions` for each generator block.

---

## 2. Backend References

| Area | Code reference |
|------|----------------|
| LLM request type | [`internal/domain/llm_content.go#L32`](../../internal/domain/llm_content.go#L32), [`internal/domain/llm_content.go#L49`](../../internal/domain/llm_content.go#L49) |
| Generator planning request type | [`internal/domain/llm_content.go#L35`](../../internal/domain/llm_content.go#L35), [`internal/domain/system_prompt.go#L43`](../../internal/domain/system_prompt.go#L43) |
| Generator prompt contract | [`internal/services/implementations/prompts/204_generator_item_creation.md#L1`](../../internal/services/implementations/prompts/204_generator_item_creation.md#L1) |
| Generator planning prompt contract | [`internal/services/implementations/prompts/211_generator_item_creating_planning.md#L1`](../../internal/services/implementations/prompts/211_generator_item_creating_planning.md#L1) |
| Current LLM registered routes | [`internal/handler/route_definitions.go#L4460`](../../internal/handler/route_definitions.go#L4460), [`internal/handler/route_definitions.go#L4478`](../../internal/handler/route_definitions.go#L4478) |
| Item definition routes | [`internal/handler/route_definitions.go#L1755`](../../internal/handler/route_definitions.go#L1755), [`internal/handler/route_definitions.go#L1764`](../../internal/handler/route_definitions.go#L1764) |
| Create item handler | [`internal/handler/entity_definition_handler.go#L45`](../../internal/handler/entity_definition_handler.go#L45) |

---

## 3. API Overview

| Method | Path | Auth | Protocol | Status |
|--------|------|------|----------|--------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/generator-item-creating-planning` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/generator-item-creating` | JWT (studio member) | SSE streaming | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/item-definitions` | JWT (studio member, `items:create`) | JSON | Available |
| `GET` | `/api/v1/games/{game_id}/item-definitions` | JWT (studio member, `items:read`) | JSON | Available |

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

## 5. Call `generator-item-creating`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/generator-item-creating`

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
| `mine` | Ore, stone, coal, or gem mines |
| `farm` | Crop, fruit, or animal product farms |
| `well` | Water, mana, or liquid wells |
| `forge` | Ore-to-ingot or heat-driven production |
| `factory` | Processed material or industrial production |
| `grove` | Wood, herb, or nature resource producers |
| `field` | Broad outdoor resource fields |

Example request:

```jsonc
{
  "user_prompt": "Create a gold mine generator with a rare gem output.",
  "language": "en",
  "entity_type": "mine",
  "item_definition_ids": [
    "01960000-0000-7000-0000-000000000101",
    "01960000-0000-7000-0000-000000000102"
  ],
  "goals": [
    "Create one mine generator that uses the existing Gold and Rare Gem item refs in item_definition_ids"
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
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"generator_item_creating","status":"completed"}
```

The stream is complete. Parse the accumulated text after this event.

### 6.4 Error

```text
data: {"type":"error","message":"..."}
```

Stop the stream and show the message.

---

## 7. Parse LLM Output

The LLM returns **one block per generator item**, not a single JSON array. Each block contains labeled fields, one fenced `json` object, and a `---` separator.

Example block:

````markdown
## Gold Mine
- **Code Name**: gold_mine
- **Name**: Gold Mine
- **Category**: generator
- **Description**: A reinforced mine that steadily produces gold and rare gems.
- **Rarity**: common
- **Stackable**: No
- **Max Stack**: -
- **Client Writable**: No
- **Client Update Qty**: No
- **Icon**: icons/generator/gold_mine.png
- **Production Interval**: 60 seconds
- **Tick Capacity**: 200 ticks
- **Collect Destination**: inventory
- **Output**: Gold (__REF:GOLD) - drop_rate: 1, qty: 1-2
- **Output**: Rare Gem (__REF:RARE_GEM) - drop_rate: 0.01, qty: 1-1

```json
{
  "_v": "v20260606.17",
  "item_code": "GOLD_MINE",
  "name": "Gold Mine",
  "category": "generator",
  "rarity": "common",
  "is_stackable": false,
  "max_stack_size": null,
  "base_stats": {},
  "metadata": {
    "description": "A reinforced mine that steadily produces gold and rare gems.",
    "icon": "icons/generator/gold_mine.png",
    "generator_config": {
      "output_pool": [
        {
          "item_definition_id": "__REF:GOLD",
          "drop_rate": 1,
          "quantity_min": 1,
          "quantity_max": 2
        },
        {
          "item_definition_id": "__REF:RARE_GEM",
          "drop_rate": 0.01,
          "quantity_min": 1,
          "quantity_max": 1
        }
      ],
      "production_interval_seconds": 60,
      "tick_capacity": 200,
      "collect_destination": "inventory"
    }
  },
  "client_writable": false,
  "allow_client_update_qty": false
}
```

---
````

### JSON Shape

```jsonc
{
  "_v": "v20260606.17",
  "item_code": "GOLD_MINE",
  "name": "Gold Mine",
  "category": "generator",
  "rarity": "common",
  "is_stackable": false,
  "max_stack_size": null,
  "base_stats": {},
  "metadata": {
    "description": "A reinforced mine that steadily produces gold and rare gems.",
    "icon": "icons/generator/gold_mine.png",
    "generator_config": {
      "output_pool": [
        {
          "item_definition_id": "__REF:GOLD",
          "drop_rate": 1,
          "quantity_min": 1,
          "quantity_max": 2
        }
      ],
      "production_interval_seconds": 60,
      "tick_capacity": 200,
      "collect_destination": "inventory"
    }
  },
  "client_writable": false,
  "allow_client_update_qty": false
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

## 9. Save the Generator

### `POST /api/v1/games/{game_id}/item-definitions`

Send the parsed generator after stripping `_v` and resolving all item refs to UUIDs.

Sample `201 Created` response:

```json
{
  "id": "01960000-0000-7000-0000-000000000201",
  "game_id": "01960000-0000-7000-0000-000000000002",
  "item_code": "GOLD_MINE",
  "name": "Gold Mine",
  "category": "generator",
  "rarity": "common",
  "is_stackable": false,
  "max_stack_size": null,
  "metadata": {},
  "created_at": "2026-06-06T10:00:00Z",
  "updated_at": "2026-06-06T10:00:00Z"
}
```

---

## 10. Edit or Regenerate

For an edit/regenerate flow, send existing generator drafts through `generated_items`. The LLM should return the same number of generator blocks, modified according to the new user instruction.

```jsonc
{
  "user_prompt": "Increase the production interval to 120 seconds and add a wood output.",
  "entity_type": "mine",
  "generated_items": [
    {
      "item_code": "GOLD_MINE",
      "name": "Gold Mine",
      "category": "generator",
      "rarity": "common",
      "is_stackable": false,
      "max_stack_size": null,
      "metadata": {
        "description": "A reinforced mine that steadily produces gold."
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
  "user_prompt": "Create a mine that produces gold and rare gems.",
  "history": []
}
```

Example `200 OK` response:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "generator_item_creating_planning",
      "entity_type": "mine",
      "goal": "Create a mine generator with gold and rare gem outputs"
    }
  ],
  "prompt_version": "v20260606.2",
  "clarification": ""
}
```

Use `detected_intents[n].type` to select the request flow and `detected_intents[n].entity_type` as the default `entity_type` when calling the generator planning endpoint.

### 11.1 Generator Item Planning

Generator items reference output item definitions; they do not create those output items themselves. `detect-intent` is only a routing step and returns the top-level `generator_item_creating_planning` intent. After detection, run the planning flow to decide whether any output items must be created before calling `generator-item-creating`.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/generator-item-creating-planning`

Example `200 OK` response:

```jsonc
{
  "request_id": "01960000-0000-7000-8000-000000000211",
  "conversation_id": "01960000-0000-7000-8000-000000000101",
  "detected_request_type": "generator_item_creating_planning",
  "status": "completed",
  "prompt_version": "v20260606.2",
  "content": {
    "language": "en",
    "summary": "Create a mine generator with one missing currency output and one missing rare material output.",
    "requires_item_generation": true,
    "actions": [
      {
        "type": "item_generation",
        "entity_type": "currency",
        "item_category": "currency",
        "goal": "Create a Gold item definition for the generator output",
        "item_name": "Gold",
        "item_code": "GOLD",
        "item_definition_ids": [],
        "depends_on": []
      },
      {
        "type": "item_generation",
        "entity_type": "material",
        "item_category": "material",
        "goal": "Create a Rare Gem item definition for the generator output",
        "item_name": "Rare Gem",
        "item_code": "RARE_GEM",
        "item_definition_ids": [],
        "depends_on": []
      },
      {
        "type": "generator_item_creating",
        "entity_type": "mine",
        "item_category": "",
        "goal": "Create a mine generator that uses __REF:GOLD and __REF:RARE_GEM in item_definition_ids",
        "item_name": "",
        "item_code": "",
        "item_definition_ids": ["__REF:GOLD", "__REF:RARE_GEM"],
        "depends_on": [0, 1]
      }
    ],
    "clarification": ""
  }
}
```

Front-end execution order:

1. Keep the user's originally selected `item_definition_ids`.
2. Call `generator-item-creating-planning` with the detected planning intent.
3. Execute any `item_generation` actions returned by planning by forwarding the full action object to `item-generation`.
4. Save the generated item definitions and add their IDs to the final `item_definition_ids` list.
5. Call `generator-item-creating` with the complete item definition list and the detected generator goal.
6. After parsing the draft, validate the expected output count and generator settings from the goal before enabling Save.

If the parsed generator does not match the expected structure, for example the goal says `2 output items` but `generator_config.output_pool.length` is `1`, do not save the draft. Regenerate with a corrective goal or ask the user to edit the draft.

---

## 12. Validation Checklist

Before enabling the Save button:

- `item_code` matches `^[A-Z][A-Z0-9_]{0,63}$`.
- `name` is not empty.
- `category` is `generator`.
- `is_stackable` is `false`.
- `max_stack_size` is `null`.
- `generator_config.output_pool.length` is at least `1`.
- Every item in `generator_config.output_pool` has a real UUID, not `__REF:*`.
- Every `drop_rate` is between `0` and `1`.
- Every `quantity_min` is at least `1`.
- Every `quantity_max` is at least `quantity_min`.
- `production_interval_seconds` is at least `1`.
- `tick_capacity` is at least `1`.
- `metadata` has at most 50 keys total, including nested keys.
- Every key and value in `metadata` follows the backend contract.
