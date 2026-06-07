# LLM Entity Pool Creating - Front-End Integration Guide

**Entity pool creating** uses AI to draft `EntityPool` definitions for studio designers. An entity pool defines which entity definitions can be selected together at runtime and with what relative weights.

For frontend implementation, use this order:

1. Detect intent.
2. Run entity pool planning.
3. Execute any `entity_definition_generation` actions returned by planning.
4. Resolve generated entity refs to UUIDs.
5. Call `entity-pool-creating`.
6. Parse the draft and save the final pool.

`entity_pool_creating_planning` is the planning step that runs before the final pool generator when missing entity definitions may need to be created first. The generated draft still needs to be saved through the entity pool HTTP endpoints after entity references are resolved.

---

## 1. Recommended Flow

### 1.1 Detect intent

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` when the UI accepts free-form chat.

If `detected_intents[0].type` is `entity_pool_creating_planning`, continue to the planning step. Use `detected_language`, `entity_type`, and `goal` as the defaults for the planning request.

### 1.2 Plan entity pool creation

Call `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-pool-creating-planning`.

The planning response returns `content.actions`.

- If an action has `type = entity_definition_generation`, create that missing entity first.
- The final action always has `type = entity_pool_creating`.
- Use the generated entity keys from planning to resolve `__REF:ENTITY_KEY` placeholders later.

### 1.3 Execute actions in order

Follow `content.actions` in sequence.

- For `entity_definition_generation`, send the **full planning action** to `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-definition-generation` via `generated_items`. This keeps `entity_key`, `entity_name`, `entity_type`, and `depends_on` intact for the LLM. Then parse the generated entity output and save it through `POST /api/v1/games/{game_id}/entity-definitions`.
- For `entity_pool_creating`, send the **full planning action** to `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-pool-creating` via `generated_items`. This keeps `pool_key`, `pool_name`, `entity_definition_ids`, and `depends_on` intact for the LLM.

If planning created new entity refs, pass those UUIDs in `entity_definition_ids` when calling `entity-pool-creating`.

### 1.4 Save the pool

Parse the output from `entity-pool-creating`, resolve `__REF:ENTITY_KEY` placeholders to real UUIDs, then call `POST /api/v1/games/{game_id}/entity-pools` for each pool block.

After creating the pool, add each entry through `POST /api/v1/games/{game_id}/entity-pools/{pool_id}/entries` using the resolved `entity_definition_id` and the generated `weight`.

---

## 2. API Overview

| Method | Path | Auth | Protocol | Status |
|--------|------|------|----------|--------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-pool-creating-planning` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-pool-creating` | JWT (studio member) | SSE streaming | Available |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/entity-definitions` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/entity-pools` | JWT (studio member) | JSON | Available |
| `POST` | `/api/v1/games/{game_id}/entity-pools/{pool_id}/entries` | JWT (studio member) | JSON | Available |

Required headers:

```http
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## 3. Preconditions

1. **Conversation exists** - create one first through `POST /api/v1/games/{game_id}/llm/conversations`.
2. **LLM token quota is available** - quota failures return `402 Payment Required`.
3. **Entity definitions are available** - pass relevant `entity_definition_ids` so the LLM can use their `entity_key` values in `__REF:ENTITY_KEY` placeholders.
4. **Entity refs can be resolved** - the LLM returns `__REF:ENTITY_KEY` placeholders, and the save endpoints require real UUIDs.

---

## 4. Call `entity-pool-creating`

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-pool-creating`

Call this only after the planning step has finished and all required entity generation has been resolved.

#### Request Body

```jsonc
{
  "user_prompt": "string",
  "language": "string",
  "entity_type": "string",
  "goals": ["string"],
  "entity_definition_ids": ["uuid"],
  "generated_items": [],
  "request_history": []
}
```

Valid `entity_type` values:

| Value | Use case |
|-------|----------|
| `enemy` | Enemy pools |
| `room` | Encounter room pools |
| `relic` | Relic pools |
| `defense_unit` | Defense unit pools |
| `boss` | Boss pools |
| `npc` | NPC pools |
| `other` | Miscellaneous pools |

Example request:

```jsonc
{
  "user_prompt": "Create a boss pool with a frost sentinel and an ice tyrant.",
  "language": "en",
  "entity_type": "boss",
  "entity_definition_ids": [
    "01960000-0000-7000-0000-000000000301",
    "01960000-0000-7000-0000-000000000302"
  ],
  "goals": [
    "Create one boss pool with two powerful winter-themed bosses"
  ]
}
```

---

## 5. Read the SSE Stream

The response has `Content-Type: text/event-stream`.

### 5.1 Connection Ping

```text
: connected
```

### 5.2 Chunk

```text
data: {"type":"chunk","text":"..."}
```

Append every `text` value into one accumulated string.

### 5.3 Done

```text
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"entity_pool_creating","status":"completed"}
```

The stream is complete. Parse the accumulated text after this event.

### 5.4 Error

```text
data: {"type":"error","message":"..."}
```

Stop the stream and show the message.

---

## 6. Parse LLM Output

The LLM returns **one block per pool**, not a single JSON array. Each block contains labeled fields, one fenced `json` object, and a `---` separator.

Example block:

````markdown
## Frost Boss Pool
- **Pool Key**: frost_boss_pool
- **Name**: Frost Boss Pool
- **Description**: A themed boss pool for cold and deadly encounters.
- **Is Active**: true
- **Entry**: Frost Sentinel (__REF:FROST_SENTINEL) - weight: 7000
- **Entry**: Ice Tyrant (__REF:ICE_TYRANT) - weight: 3000

```json
{
  "_v": "v20260606.2",
  "pool_key": "frost_boss_pool",
  "name": "Frost Boss Pool",
  "description": "A themed boss pool for cold and deadly encounters.",
  "is_active": true,
  "entries": [
    {
      "entity_definition_id": "__REF:FROST_SENTINEL",
      "weight": 7000
    },
    {
      "entity_definition_id": "__REF:ICE_TYRANT",
      "weight": 3000
    }
  ],
  "metadata": {
    "description": "A themed boss pool for cold and deadly encounters.",
    "icon": "icons/pools/frost_boss_pool.png",
    "ui_color": "#5DADE2"
  }
}
```

---
````

### JSON Shape

```jsonc
{
  "_v": "v20260606.2",
  "pool_key": "frost_boss_pool",
  "name": "Frost Boss Pool",
  "description": "A themed boss pool for cold and deadly encounters.",
  "is_active": true,
  "entries": [
    {
      "entity_definition_id": "__REF:FROST_SENTINEL",
      "weight": 7000
    }
  ],
  "metadata": {}
}
```

---

## 7. Resolve `__REF:ENTITY_KEY` to UUIDs

The LLM output uses `__REF:ENTITY_KEY` placeholders, not real UUIDs. Before saving:

1. Build a map from the entity definitions you passed through `entity_definition_ids`.
2. For each `__REF:SOME_KEY`, find the entity whose `entity_key` is `SOME_KEY`.
3. Replace the placeholder with the real entity definition `id`.
4. If a ref cannot be resolved, block save and ask the user to select an entity manually.

---

## 8. Save the Pool

### `POST /api/v1/games/{game_id}/entity-pools`

Send the parsed pool after stripping `_v` and resolving all entity refs to UUIDs.

Sample `201 Created` response:

```json
{
  "id": "01960000-0000-7000-0000-000000000401",
  "game_id": "01960000-0000-7000-0000-000000000002",
  "pool_key": "frost_boss_pool",
  "name": "Frost Boss Pool",
  "description": "A themed boss pool for cold and deadly encounters.",
  "metadata": {},
  "is_active": true,
  "created_at": "2026-06-06T10:00:00Z",
  "updated_at": "2026-06-06T10:00:00Z"
}
```

Then add each entry through:

### `POST /api/v1/games/{game_id}/entity-pools/{pool_id}/entries`

Sample request:

```jsonc
{
  "entity_definition_id": "01960000-0000-7000-0000-000000000301",
  "weight": 7000
}
```

---

## 9. Edit or Regenerate

For an edit/regenerate flow, send existing pool drafts through `generated_items`. The LLM should return the same number of pool blocks, modified according to the new user instruction.

```jsonc
{
  "user_prompt": "Reduce the boss pool to a single boss and make it more rare.",
  "entity_type": "boss",
  "generated_items": [
    {
      "pool_key": "frost_boss_pool",
      "name": "Frost Boss Pool",
      "description": "A themed boss pool for cold and deadly encounters.",
      "is_active": true,
      "entries": [
        {
          "entity_definition_id": "__REF:FROST_SENTINEL",
          "weight": 7000
        },
        {
          "entity_definition_id": "__REF:ICE_TYRANT",
          "weight": 3000
        }
      ],
      "metadata": {
        "description": "A themed boss pool for cold and deadly encounters."
      }
    }
  ]
}
```

---

## 10. Detect Intent

Use this only when the UI accepts free-form chat without a selected request type.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

```jsonc
{
  "user_prompt": "Create a boss pool with frost-themed enemies and one legendary boss.",
  "history": []
}
```

Example `200 OK` response:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "entity_pool_creating_planning",
      "entity_type": "boss",
      "goal": "Create a boss pool with frost-themed members"
    }
  ],
  "prompt_version": "v20260606.1",
  "clarification": ""
}
```

Use `detected_intents[n].type` to select the request flow and `detected_intents[n].entity_type` as the default `entity_type` when calling the entity pool planning endpoint.

### 10.1 Entity Pool Planning

Entity pools reference entity definitions; they do not create entity definitions themselves. `detect-intent` is only a routing step and returns the top-level `entity_pool_creating_planning` intent. After detection, run the planning flow to decide whether any entity definitions must be created before calling `entity-pool-creating`.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-pool-creating-planning`

Example `200 OK` response:

```jsonc
{
  "language": "en",
  "summary": "Create a boss pool with two new winter-themed boss members.",
  "requires_entity_generation": true,
  "actions": [
    {
      "type": "entity_definition_generation",
      "entity_type": "boss",
      "goal": "Create a Frost Sentinel boss entity definition for the pool",
      "entity_key": "frost_sentinel",
      "entity_name": "Frost Sentinel",
      "pool_key": "",
      "pool_name": "",
      "entity_definition_ids": [],
      "depends_on": []
    },
    {
      "type": "entity_definition_generation",
      "entity_type": "boss",
      "goal": "Create an Ice Tyrant boss entity definition for the pool",
      "entity_key": "ice_tyrant",
      "entity_name": "Ice Tyrant",
      "pool_key": "",
      "pool_name": "",
      "entity_definition_ids": [],
      "depends_on": []
    },
    {
      "type": "entity_pool_creating",
      "entity_type": "boss",
      "goal": "Create a boss pool that uses __REF:FROST_SENTINEL and __REF:ICE_TYRANT in entity_definition_ids",
      "entity_key": "",
      "entity_name": "",
      "pool_key": "frost_boss_pool",
      "pool_name": "Frost Boss Pool",
      "entity_definition_ids": ["__REF:FROST_SENTINEL", "__REF:ICE_TYRANT"],
      "depends_on": [0, 1]
    }
  ],
  "clarification": ""
}
```

Front-end execution order:

1. Keep the user's originally selected `entity_definition_ids`.
2. Call `entity-pool-creating-planning` with the detected planning intent.
3. Execute any `entity_definition_generation` actions returned by planning by forwarding the full action object to `entity-definition-generation`.
4. Save the generated entity definitions and add their IDs to the final `entity_definition_ids` list.
5. Execute the final `entity_pool_creating` action by forwarding the full action object to `entity-pool-creating`.
6. After parsing the draft, validate the expected pool size and member count before enabling Save.

If the parsed pool does not match the expected structure, for example the goal says `2 pool members` but `entries.length` is `1`, do not save the draft. Regenerate with a corrective goal or ask the user to edit the draft.

---

## 11. Validation Checklist

Before enabling the Save button:

- `pool_key` matches `^[a-z][a-z0-9_]{0,63}$`.
- `name` is not empty.
- `description` is not empty.
- `entries.length` is at least `1`.
- Every item in `entries` has a real UUID, not `__REF:*`.
- Every `weight` is at least `0`.
- `metadata` has at most 50 keys total, including nested keys.
- Every key and value in `metadata` follows the backend contract.
