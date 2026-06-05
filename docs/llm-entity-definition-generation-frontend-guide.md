# LLM Entity Definition Generation - Front-End Integration Guide

`entity_definition_generation` is the AI flow for drafting `EntityDefinition` templates for game objects that are not player-owned inventory items. It is used for enemies, rooms, relics, defense units, bosses, NPCs, and other custom entity templates.

This flow is **direct generation**, not planning. There is no separate `entity_definition_generation_planning` step.

---

## 1. Recommended Front-End Flow

1. Detect intent if the user is typing free-form chat.
2. If intent type is `entity_definition_generation`, open the entity generation flow directly.
3. Call the SSE generation endpoint.
4. Accumulate the streamed text.
5. Parse one JSON block per entity definition.
6. Save each parsed entity through the entity definition API, or let the backend materialize them with `create-records`.

If the user already selected the request type in the UI, you can skip `detect-intent` and call the generation endpoint directly.

---

## 2. API Overview

| Method | Path | Auth | Protocol | Purpose |
|--------|------|------|----------|---------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | JSON | Route free-form chat to `entity_definition_generation` when appropriate |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-definition-generation` | JWT (studio member) | SSE streaming | Generate entity definition drafts |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/create-records` | JWT (studio member) | JSON | Materialize generated definitions from the conversation content |
| `POST` | `/api/v1/games/{game_id}/entity-definitions` | JWT (studio member) | JSON | Save a single entity definition directly |
| `GET` | `/api/v1/games/{game_id}/entity-definitions` | JWT (studio member) | JSON | List saved entity definitions |
| `GET` | `/api/v1/entity-definitions/types` | Public | JSON | Fetch valid entity types for the UI |

Required headers:

```http
Authorization: Bearer <studio_member_jwt>
Content-Type: application/json
```

---

## 3. Detect Intent

Use this only when the UI accepts free-form chat.

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent`

Example request:

```jsonc
{
  "user_prompt": "Create a boss entity for a volcanic dungeon.",
  "history": []
}
```

Example response:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "entity_definition_generation",
      "entity_type": "boss",
      "goal": "Create a boss entity for a volcanic dungeon"
    }
  ],
  "prompt_version": "v20260605.1",
  "clarification": ""
}
```

Front-end rule:

- If `detected_intents[0].type` is `entity_definition_generation`, call the entity generation SSE endpoint directly.
- Use `detected_intents[0].entity_type` as the default `entity_type`.
- Use `detected_intents[0].goal` as the default goal text if the UI needs it.
- Do not route this flow through any planning endpoint.

---

## 4. Call Entity Generation

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/entity-definition-generation`

This endpoint returns `text/event-stream`.

#### Request body

```jsonc
{
  "user_prompt": "Create a volcanic boss with fire-based phases.",
  "language": "en",
  "entity_type": "boss",
  "lore_entry_ids": ["uuid"],
  "item_definition_ids": ["uuid"],
  "container_definition_ids": ["uuid"],
  "goals": ["Create one boss entity with two phases"],
  "generated_items": [],
  "request_history": []
}
```

Field notes:

- `user_prompt` is the main instruction from the user.
- `language` is optional, but recommended if the UI knows the target language.
- `entity_type` should match the requested entity family: `enemy`, `room`, `relic`, `defense_unit`, `boss`, `npc`, or `other`.
- `lore_entry_ids`, `item_definition_ids`, and `container_definition_ids` are optional context references.
- `goals` can help the model stay on scope.
- `generated_items` is for edit or regenerate flows.
- `request_history` is optional prior LLM context.

Valid `entity_type` values:

| Value | Typical use |
|-------|-------------|
| `enemy` | Normal combat enemy |
| `room` | Encounter room or map room template |
| `relic` | Persistent passive relic template |
| `defense_unit` | Tower, turret, or defensive structure |
| `boss` | Boss entity |
| `npc` | Non-player character |
| `other` | Generic fallback |

Example request:

```jsonc
{
  "user_prompt": "Create a volcanic boss with fire phases and an area attack.",
  "language": "en",
  "entity_type": "boss",
  "goals": [
    "Create one boss entity for a volcanic dungeon"
  ],
  "lore_entry_ids": [
    "01960000-0000-7000-8000-000000000111"
  ]
}
```

---

## 5. Read the SSE Stream

The stream starts with:

```text
: connected
```

Then it sends chunk events:

```text
data: {"type":"chunk","text":"..."}
```

Append every `text` chunk into one string.

When the request finishes, you receive:

```text
data: {"type":"done","request_id":"...","conversation_id":"...","detected_request_type":"entity_definition_generation","status":"completed"}
```

If an error happens:

```text
data: {"type":"error","message":"..."}
```

Stop streaming and surface the message.

---

## 6. Parse the Output

The LLM returns **one block per entity definition**, not a JSON array.

Each block follows this pattern:

```markdown
## Volcanic Tyrant
- **Entity Key**: volcanic_tyrant
- **Name**: Volcanic Tyrant
- **Entity Type**: boss
- **Description**: A fire-wreathed boss that guards the heart of the volcano.
- **Rarity**: legendary
- **Icon**: icons/entities/volcanic_tyrant.png
- **Is Active**: true

```json
{
  "_v": "v20260606.1",
  "entity_key": "volcanic_tyrant",
  "name": "Volcanic Tyrant",
  "entity_type": "boss",
  "description": "A fire-wreathed boss that guards the heart of the volcano.",
  "icon_url": "icons/entities/volcanic_tyrant.png",
  "rarity": "legendary",
  "stats": {
    "hp": 1200,
    "attack": 90,
    "defense": 35,
    "speed": 8,
    "ai_pattern": "aggressive"
  },
  "abilities": [
    {
      "id": "phase_1_fireball",
      "effect_type": "damage",
      "target": "opponent",
      "magnitude": 30,
      "metadata": {
        "element": "fire"
      }
    }
  ],
  "metadata": {
    "description": "A fire-wreathed boss that guards the heart of the volcano.",
    "icon": "icons/entities/volcanic_tyrant.png",
    "ui_label": "Volcanic Tyrant"
  },
  "is_active": true
}
```

---
```

Important parsing rules:

- Extract each fenced `json` block separately.
- Do not expect a single JSON array.
- Strip `_v` before sending the payload to the entity definition save endpoint if your client normalizes fields.
- `metadata.description` must match the human-readable Description line.

### JSON shape

Each block uses these fields:

| Field | Meaning |
|-------|---------|
| `_v` | Internal version tag from the prompt |
| `entity_key` | Unique machine-readable key |
| `name` | Display name |
| `entity_type` | Entity family |
| `description` | Short summary |
| `icon_url` | Optional icon URL |
| `rarity` | Optional rarity |
| `stats` | Entity stats JSON |
| `abilities` | Effect list |
| `metadata` | UI and extra config |
| `is_active` | Active flag |

---

## 7. Save the Result

You have two supported save strategies.

### Option A. Save each entity directly

Use this when the UI wants to review each block before saving.

#### `POST /api/v1/games/{game_id}/entity-definitions`

Request body:

```jsonc
{
  "entity_key": "volcanic_tyrant",
  "entity_type": "boss",
  "name": "Volcanic Tyrant",
  "description": "A fire-wreathed boss that guards the heart of the volcano.",
  "icon_url": "icons/entities/volcanic_tyrant.png",
  "rarity": "legendary",
  "stats": {
    "hp": 1200,
    "attack": 90,
    "defense": 35,
    "speed": 8,
    "ai_pattern": "aggressive"
  },
  "abilities": [],
  "metadata": {
    "description": "A fire-wreathed boss that guards the heart of the volcano.",
    "icon": "icons/entities/volcanic_tyrant.png",
    "ui_label": "Volcanic Tyrant"
  },
  "is_active": true
}
```

Example response:

```json
{
  "id": "01960000-0000-7000-8000-0000000008ab",
  "studio_id": "01960000-0000-7000-8000-000000000001",
  "game_id": "01960000-0000-7000-8000-000000000002",
  "entity_key": "volcanic_tyrant",
  "entity_type": "boss",
  "name": "Volcanic Tyrant",
  "description": "A fire-wreathed boss that guards the heart of the volcano.",
  "icon_url": "icons/entities/volcanic_tyrant.png",
  "rarity": "legendary",
  "stats": {},
  "abilities": [],
  "metadata": {},
  "is_active": true,
  "deleted_at": null,
  "created_at": "2026-06-06T10:00:00Z",
  "updated_at": "2026-06-06T10:00:00Z"
}
```

If you use this path, resolve validation failures before retrying:

- `entity_key` must be unique per game.
- `entity_type` must be valid.
- `rarity` must use a supported value.
- `stats` and `abilities` must pass entity-specific validation.

### Option B. Let the backend materialize from the conversation

If the generation result is already stored in the conversation, call:

#### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/create-records`

Example response:

```json
{
  "created_count": 1,
  "item_definition_ids": [],
  "container_definition_ids": [],
  "entity_definition_ids": [
    "01960000-0000-7000-8000-0000000008ab"
  ]
}
```

Use this path if you want the backend to create records from `accumulated_content["entity_definitions"]` and return the created IDs.

---

## 8. Validation Checklist

Before enabling the Save button, validate:

- `entity_key` is non-empty and uses lowercase snake_case.
- `name` is non-empty.
- `entity_type` is one of the valid entity types.
- `stats` is a JSON object.
- `abilities` is an array.
- `metadata.description` matches the displayed description.
- `metadata` stays within the backend key limits.
- `rarity`, if present, uses a supported rarity value.
- `_v` is removed before sending the save payload, unless your serializer already ignores unknown fields.

Valid rarities:

`common`, `uncommon`, `rare`, `epic`, `legendary`, `set_item`, `mythic`, `Unique`

---

## 9. Backend References

| Area | Code reference |
|------|----------------|
| Entity LLM request type | [`internal/domain/llm_content.go#L32`](../../internal/domain/llm_content.go#L32) |
| System prompt type registration | [`internal/domain/system_prompt.go#L43`](../../internal/domain/system_prompt.go#L43) |
| Built-in entity generation prompt | [`internal/services/implementations/builtin_prompts.go#L48`](../../internal/services/implementations/builtin_prompts.go#L48), [`internal/services/implementations/builtin_prompts.go#L315`](../../internal/services/implementations/builtin_prompts.go#L315) |
| Intent detection prompt | [`internal/services/implementations/prompts/207_intent_detection.md#L24`](../../internal/services/implementations/prompts/207_intent_detection.md#L24) |
| Intent detector implementation | [`internal/services/implementations/llm_intent_detector.go#L100`](../../internal/services/implementations/llm_intent_detector.go#L100) |
| Conversation SSE endpoint | [`internal/handler/llm_conversation_handler.go#L279`](../../internal/handler/llm_conversation_handler.go#L279) |
| Create-records response includes entity IDs | [`internal/handler/llm_conversation_handler.go#L698`](../../internal/handler/llm_conversation_handler.go#L698), [`internal/handler/llm_conversation_handler.go#L726`](../../internal/handler/llm_conversation_handler.go#L726) |
| Entity definition route group | [`internal/handler/entity_definition_handler.go#L342`](../../internal/handler/entity_definition_handler.go#L342) |
| Public entity types endpoint | [`internal/handler/entity_definition_handler.go#L293`](../../internal/handler/entity_definition_handler.go#L293) |
| Entity domain rules | [`internal/domain/entity_definition.go#L24`](../../internal/domain/entity_definition.go#L24), [`internal/domain/entity_definition.go#L59`](../../internal/domain/entity_definition.go#L59) |

