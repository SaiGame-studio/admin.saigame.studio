# LLM Quest Definition Generation - Front-End Integration Guide

`quest_definition_generation` is the final AI flow for drafting a single `QuestDefinition` JSON object that the frontend can send to the quest creation API.

For free-form chat, the recommended flow now starts with `quest_definition_generation_planning`, because the quest may need new item definitions for rewards or item-based conditions before the final quest JSON can be generated.

---

## 1. Recommended Front-End Flow

1. Detect intent if the user is typing free-form chat.
2. If intent type is `quest_definition_generation_planning`, open the quest planning flow directly.
3. Call the quest planning endpoint.
4. Execute any `item_generation` actions returned by planning.
5. Resolve `__REF:ITEM_CODE` placeholders to real item definition UUIDs.
6. Call the final quest JSON generation endpoint.
7. Parse the single JSON object returned in `content`.
8. Call the quest creation API with the resolved payload.

If the user already selected the request type in the UI, you can skip `detect-intent` and call the planning endpoint directly.

---

## 2. API Overview

| Method | Path | Auth | Protocol | Purpose |
|--------|------|------|----------|---------|
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/detect-intent` | JWT (studio member) | JSON | Route free-form chat to `quest_definition_generation_planning` when appropriate |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/quest-definition-generation-planning` | JWT (studio member) | JSON | Plan any missing item definitions before generating the final quest |
| `POST` | `/api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/quest-definition-generation` | JWT (studio member) | JSON | Generate exactly one quest definition draft |
| `POST` | `/api/v1/studios/{studio_id}/games/{game_id}/quest-definitions` | JWT (studio member) | JSON | Create the final quest definition |

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
  "user_prompt": "Create a daily quest where players log in and receive a potion.",
  "history": []
}
```

Example response:

```jsonc
{
  "detected_language": "en",
  "detected_intents": [
    {
      "type": "quest_definition_generation_planning",
      "entity_type": "daily",
      "goal": "Create a daily quest where players log in and receive a potion"
    }
  ],
  "prompt_version": "v20260605.1",
  "clarification": ""
}
```

Front-end rule:

- If `detected_intents[0].type` is `quest_definition_generation_planning`, call the quest planning endpoint directly.
- Use `detected_intents[0].entity_type` as the quest type hint if the UI needs one.
- Use `detected_intents[0].goal` as the default goal text if the UI wants to display a summary.

---

## 4. Call Quest Planning

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/quest-definition-generation-planning`

This endpoint returns JSON.

### Request body

```jsonc
{
  "user_prompt": "Create a daily quest where players log in and receive a potion reward.",
  "language": "en",
  "entity_type": "daily",
  "lore_entry_ids": [],
  "item_definition_ids": [],
  "container_definition_ids": [],
  "entity_definition_ids": [],
  "goals": ["Create one quest definition and create any missing reward items first"],
  "generated_items": [],
  "request_history": []
}
```

Field notes:

- `user_prompt` is the main instruction from the user.
- `language` is optional, but recommended if the UI knows the target language.
- `entity_type` is the quest type hint. Use `one_time` or `daily` when known.
- `item_definition_ids` lets the planner match existing items for rewards or conditions.
- `goals` can help the model stay on scope.
- `generated_items` is for edit or regenerate flows.
- `request_history` is optional prior LLM context.

Example response:

```jsonc
{
  "request_id": "01970000-0000-7000-8000-000000000401",
  "conversation_id": "01970000-0000-7000-8000-000000000402",
  "detected_request_type": "quest_definition_generation_planning",
  "status": "completed",
  "prompt_version": "v20260607.1",
  "content": {
    "language": "en",
    "summary": "Create a daily quest with a potion reward.",
    "requires_item_generation": true,
    "actions": [
      {
        "type": "item_generation",
        "entity_type": "potion",
        "goal": "Create a Forest Potion item definition for the quest reward",
        "item_code": "FOREST_POTION",
        "item_definition_ids": [],
        "depends_on": []
      },
      {
        "type": "quest_definition_generation",
        "entity_type": "daily",
        "goal": "Create one daily quest definition that uses __REF:FOREST_POTION in item_definition_ids",
        "item_code": "",
        "item_definition_ids": ["__REF:FOREST_POTION"],
        "depends_on": [0]
      }
    ],
    "clarification": ""
  }
}
```

Planning rules:

- If `content.actions` includes `item_generation`, create those items first.
- Resolve the generated item refs before calling the final quest generator.
- The final action must always be `quest_definition_generation`.
- The planner still produces only one quest definition flow, not a batch.

---

## 5. Call Quest Generation

### `POST /api/v1/games/{game_id}/llm/conversations/{conversation_id}/requests/quest-definition-generation`

This endpoint returns JSON, not SSE.

### Request body

```jsonc
{
  "user_prompt": "Create a daily quest where players log in and receive a potion reward.",
  "language": "en",
  "entity_type": "daily",
  "lore_entry_ids": [],
  "item_definition_ids": ["01960000-0000-7000-8000-000000000111"],
  "container_definition_ids": [],
  "entity_definition_ids": [],
  "goals": [
    "Create exactly one quest definition"
  ],
  "generated_items": [],
  "request_history": []
}
```

Field notes:

- `user_prompt` is the main instruction from the user.
- `language` is optional, but recommended if the UI knows the target language.
- `entity_type` is the quest type hint. Use `one_time` or `daily` when known.
- `lore_entry_ids` is optional context for tone and naming.
- `item_definition_ids` lets the model reference existing items in rewards or item-based conditions.
- `container_definition_ids` and `entity_definition_ids` are optional context references.
- `goals` can help the model stay on scope.
- `generated_items` is for edit or regenerate flows.
- `request_history` is optional prior LLM context.

Valid quest types:

| Value | Typical use |
|-------|-------------|
| `one_time` | Standard quest that can be completed once |
| `daily` | Quest that resets every day and belongs to the daily quest system |

Example response:

```jsonc
{
  "request_id": "01970000-0000-7000-8000-000000000301",
  "conversation_id": "01970000-0000-7000-8000-000000000302",
  "detected_request_type": "quest_definition_generation",
  "status": "completed",
  "prompt_version": "v20260607.3",
  "content": {
    "code_name": "forest_herb_delivery",
    "name": "Forest Herb Delivery",
    "description": "Collect forest herbs and deliver them as part of a small village request.",
    "quest_type": "one_time",
    "conditions": {
      "operator": "AND",
      "clauses": [
        {
          "clause_id": "collect_herbs",
          "type": "collect_and_keep",
          "items": [
            {
              "item_definition_id": "__REF:FOREST_HERB",
              "quantity": 5
            }
          ]
        }
      ]
    },
    "rewards": [
      {
        "reward_type": "item",
        "item_definition_id": "__REF:POTION_SMALL",
        "quantity_min": 50,
        "quantity_max": 50
      }
    ],
    "is_active": true,
    "metadata": {
      "reward_delivery": "mailbox"
    }
  }
}
```

Important parsing rules:

- `content` is a single quest definition object.
- Do not expect an array of quests.
- Do not create more than one quest from one response.
- Resolve all `__REF:ITEM_CODE` placeholders to real item definition UUIDs before saving.

---

## 6. Save the Quest Definition

After parsing `content`, send it to:

### `POST /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions`

Example request body:

```jsonc
{
  "code_name": "forest_herb_delivery",
  "name": "Forest Herb Delivery",
  "description": "Collect forest herbs and deliver them as part of a small village request.",
  "quest_type": "one_time",
  "conditions": {
    "operator": "AND",
    "clauses": [
      {
        "clause_id": "collect_herbs",
        "type": "collect_and_keep",
        "items": [
          {
            "item_definition_id": "01960000-0000-7000-8000-000000000111",
            "quantity": 5
          }
        ]
      }
    ]
  },
  "rewards": [
    {
      "reward_type": "item",
      "item_definition_id": "01960000-0000-7000-8000-000000000222",
      "quantity_min": 50,
      "quantity_max": 50
    }
  ],
  "is_active": true,
  "metadata": {
    "reward_delivery": "mailbox"
  }
}
```

Save rules:

- `code_name` must be stable and lowercase snake_case.
- `quest_type` must be `one_time` or `daily`.
- `conditions` must remain a flat tree.
- `rewards` should use resolved UUIDs, not `__REF:` placeholders.

---

## 7. Backend References

| Area | Code reference |
|------|----------------|
| Quest planning request type registration | [`internal/domain/llm_content.go#L27`](../../internal/domain/llm_content.go#L27), [`internal/domain/llm_content.go#L55-L60`](../../internal/domain/llm_content.go#L55-L60) |
| Quest prompt type allow-list | [`internal/domain/system_prompt.go#L38`](../../internal/domain/system_prompt.go#L38) |
| Quest planning prompt contract | [`internal/services/implementations/prompts/216_quest_definition_generation_planning.md#L1`](../../internal/services/implementations/prompts/216_quest_definition_generation_planning.md#L1) |
| Quest prompt contract | [`internal/services/implementations/prompts/215_quest_definition_generation.md#L1`](../../internal/services/implementations/prompts/215_quest_definition_generation.md#L1) |
| Quest intent detection rules | [`internal/services/implementations/prompts/207_intent_detection.md#L20`](../../internal/services/implementations/prompts/207_intent_detection.md#L20), [`internal/services/implementations/prompts/207_intent_detection.md#L54`](../../internal/services/implementations/prompts/207_intent_detection.md#L54) |
| JSON request handler | [`internal/handler/llm_conversation_handler.go#L251`](../../internal/handler/llm_conversation_handler.go#L251), [`internal/handler/llm_conversation_handler.go#L509-L556`](../../internal/handler/llm_conversation_handler.go#L509-L556) |
| Detect intent handler | [`internal/handler/llm_conversation_handler.go#L615`](../../internal/handler/llm_conversation_handler.go#L615), [`internal/handler/llm_conversation_handler.go#L630-L676`](../../internal/handler/llm_conversation_handler.go#L630-L676) |
| Route registration | [`internal/handler/route_definitions.go#L4385`](../../internal/handler/route_definitions.go#L4385), [`internal/handler/route_definitions.go#L4433-L4449`](../../internal/handler/route_definitions.go#L4433-L4449) |
| Quest creation API | [`internal/handler/quest_handler.go#L704`](../../internal/handler/quest_handler.go#L704), [`internal/domain/quest_inputs.go#L38-L57`](../../internal/domain/quest_inputs.go#L38-L57) |
| Quest type allow-list | [`internal/domain/quest.go#L21-L30`](../../internal/domain/quest.go#L21-L30) |
| `create-records` does not materialize quests | [`internal/usecase/llm_conversation_usecase.go#L784-L858`](../../internal/usecase/llm_conversation_usecase.go#L784-L858) |

---

## 8. Practical Front-End Notes

- Treat this flow as a single-quest generator, not a batch generator.
- Use the planning endpoint whenever the quest may need new item definitions.
- If the response is ambiguous or the UI needs review, show the draft first and let the user edit before saving.
- Do not rely on `create-records` for quests; it currently materializes items, containers, and entities only.
- If a reward or condition references an item code, resolve that code to the real item definition UUID before submitting the quest creation request.
