# Studio System Prompt Override - Front-End Integration Guide

This guide is for **studio members** who need to manage game-specific system prompts.

It is based on the current backend routes and handlers:
- Route registration: `internal/handler/route_definitions.go`
- HTTP handlers: `internal/handler/system_prompt_handler.go`
- Use case logic: `internal/usecase/system_prompt_usecase.go`

The goal of this UI is simple:
- let a studio member create a prompt for one game
- let game prompts override the runtime prompt for the same `prompt_type`
- show when a game has run out of free prompt slots and needs 10 sCoin to unlock more

---

## What The Front End Needs To Know

### Prompt types

The backend accepts the existing request-type keys used by the LLM system. Examples:
- `lore_creating`
- `item_generation`
- `lore_analyzing`
- `item_modify`
- `quest_definition_generation`

The UI should render the available types from a static list or from the existing request-type API if you already have one in the app.

### Prompt slots

- Each game has 7 free active system prompt slots.
- Starting from the 8th active prompt, unlocking a new active slot costs 10 sCoin.
- Inactive prompts do not consume an active slot.
- Re-activating an inactive prompt can also trigger the 10 sCoin unlock flow.

The backend enforces this rule. The front end only needs to detect the `402 Payment Required` response and guide the user to top up sCoin if needed.

### Clone behavior

Creating a new prompt is treated as creating a new game-specific copy based on an existing prompt of the same type.

For the front end, this means:
- you do not send a template ID
- you only send the fields for the new prompt
- the backend resolves the source prompt of the same type and applies the new values

This keeps the form simple and avoids extra client-side cloning logic.

---

## API Surface

### Game-specific prompts

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/games/{game_id}/system-prompts` | Create a game-specific prompt |
| `GET` | `/api/v1/games/{game_id}/system-prompts` | List prompts for a game |
| `GET` | `/api/v1/games/{game_id}/system-prompts/{prompt_id}` | Get one prompt |
| `PATCH` | `/api/v1/games/{game_id}/system-prompts/{prompt_id}` | Update one prompt |
| `DELETE` | `/api/v1/games/{game_id}/system-prompts/{prompt_id}` | Soft-delete one prompt |

### Platform defaults

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/system-prompts/defaults` | List platform default prompts |

Auth rules:
- game-specific routes: JWT + studio membership for the game
- default read routes: JWT only

---

## Response Shapes

### Create / update response

`POST /api/v1/games/{game_id}/system-prompts`
`PATCH /api/v1/games/{game_id}/system-prompts/{prompt_id}`

These endpoints return a single prompt object:

```json
{
  "id": "019768ab-0000-7000-8000-000000000001",
  "game_id": "019768ab-0000-7000-8000-000000000010",
  "created_by": "019768ab-0000-7000-8000-000000000020",
  "name": "dark-fantasy-lore-writer",
  "prompt_type": "lore_creating",
  "description": "Writes dark fantasy lore in second person.",
  "is_active": true,
  "content": "You are a dark fantasy lore writer...",
  "max_input_tokens": 8192,
  "max_output_tokens": 2048,
  "temperature": 0.8,
  "provider": null,
  "model": null,
  "created_at": "2026-06-15T10:00:00Z",
  "updated_at": "2026-06-15T10:00:00Z"
}
```

### Request bodies

#### Create prompt

`POST /api/v1/games/{game_id}/system-prompts`

```json
{
  "name": "dark-fantasy-lore-writer",
  "prompt_type": "lore_creating",
  "description": "Writes dark fantasy lore in second person.",
  "is_active": true,
  "content": "You are a dark fantasy lore writer specializing in grim, atmospheric second-person prose.",
  "max_input_tokens": 8192,
  "max_output_tokens": 2048,
  "temperature": 0.8,
  "provider": null,
  "model": null
}
```

#### Update prompt

`PATCH /api/v1/games/{game_id}/system-prompts/{prompt_id}`

```json
{
  "description": "Tighter version for short-form lore.",
  "content": "You are a dark fantasy lore writer. Be concise.",
  "max_output_tokens": 1024,
  "temperature": 1.0
}
```

### List response

`GET /api/v1/games/{game_id}/system-prompts`
`GET /api/v1/system-prompts/defaults`

These endpoints return:

```json
{
  "data": [
    {
      "id": "019768ab-0000-7000-8000-000000000001",
      "game_id": "019768ab-0000-7000-8000-000000000010",
      "created_by": "019768ab-0000-7000-8000-000000000020",
      "name": "dark-fantasy-lore-writer",
      "prompt_type": "lore_creating",
      "description": "Writes dark fantasy lore in second person.",
      "is_active": true,
      "content": "You are a dark fantasy lore writer...",
      "max_input_tokens": 8192,
      "max_output_tokens": 2048,
      "temperature": 0.8,
      "provider": null,
      "model": null,
      "created_at": "2026-06-15T10:00:00Z",
      "updated_at": "2026-06-15T10:00:00Z"
    }
  ]
}
```

### Delete response

`DELETE /api/v1/games/{game_id}/system-prompts/{prompt_id}`

Success returns:

```json
{}
```

with HTTP `204 No Content`.

---

## Recommended UI Flows

### 1. Prompt list page

Show:
- prompt name
- prompt type
- active / inactive badge
- provider / model override badge if present
- updated time
- action buttons: edit, deactivate/activate, delete

Suggested empty states:
- no prompt yet
- free slots still available
- free slots exhausted, locked behind 10 sCoin

### 2. Create prompt modal

Fields:
- `name`
- `prompt_type`
- `description`
- `content`
- `is_active`
- `max_input_tokens`
- `max_output_tokens`
- `temperature`
- `provider`
- `model`

Behavior:
- default `is_active = true`
- trim whitespace before submit
- keep `content` required
- if the game already has 7 active prompts, warn that creating an 8th active prompt may cost 10 sCoin

Important:
- do not ask the user to pick a template prompt
- the backend handles clone-from-same-type internally

### 3. Edit prompt modal

The edit modal can reuse the same form fields.

Important cases:
- editing content, provider, or model does not necessarily trigger a slot charge
- turning an inactive prompt back on may trigger the 10 sCoin unlock flow
- if the user changes the prompt so it becomes invalid, the backend returns `400`

### 4. Delete action

Deleting a prompt is a soft delete.

Recommended UI:
- confirm dialog with prompt name
- after success, remove the row from the current list
- if the deleted prompt was active, refresh the prompt list so the UI can recompute active slot usage

---

## Slot Usage UI

The backend does not expose a dedicated slot-usage endpoint for this feature.

Recommended client-side approach:
1. Call `GET /api/v1/games/{game_id}/system-prompts`
2. Count prompts where `is_active = true` and `deleted_at` is not present in the current list response
3. Render:
   - `0 / 7` to `7 / 7` as free slots
   - `8+ active prompts` as locked slots that require 10 sCoin each

If your app wants to show a precise locked-slot count, compute:

```text
locked_slots = max(active_prompt_count - 7, 0)
```

This is a display heuristic only. The backend remains the source of truth.

---

## Error Handling

### `400 Bad Request`

Typical causes:
- empty content
- invalid prompt type
- invalid name format
- invalid token or temperature value

UI response:
- highlight the invalid field
- keep the form open
- show the message returned by the backend

### `401 Unauthorized`

User is not logged in or the token is missing/expired.

UI response:
- redirect to login

### `403 Forbidden`

Typical causes:
- user is not a studio member of the game
- user tries to modify a platform default prompt without super admin access
- platform default prompt is immutable for delete

UI response:
- show access denied

### `404 Not Found`

Typical causes:
- prompt ID does not exist
- game does not exist

UI response:
- show not found and refresh the list

### `409 Conflict`

Typical cause:
- prompt name already exists in that game scope

UI response:
- tell the user to choose a different name

### `402 Payment Required`

Typical cause:
- user tried to create or activate a prompt that requires an unlock beyond the 7 free active slots, and the wallet does not have enough sCoin

UI response:
- show a paywall / top-up prompt
- keep the user on the form
- after top-up, retry the same action

---

## Suggested Front-End State Model

```ts
type SystemPromptFormState = {
  name: string;
  promptType: string;
  description: string;
  content: string;
  isActive: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature: number;
  provider: string | null;
  model: string | null;
};
```

Suggested derived state:
- `activePromptCount`
- `lockedSlotCount`
- `needsSlotPurchase`
- `canSave`

---

## Example UX Copy

- "This game has 7 free active prompt slots."
- "The next active prompt costs 10 sCoin to unlock."
- "This prompt was saved as an inactive draft and did not consume a slot."
- "You do not have enough sCoin to unlock another prompt slot."

---

## Implementation Checklist

- [ ] Build a list page for game prompts.
- [ ] Build a create/edit modal using the same form.
- [ ] Load prompt list on page open and after any mutation.
- [ ] Count active prompts in the client to show free vs locked slots.
- [ ] Handle `402 Payment Required` with a top-up flow.
- [ ] Handle `409 Conflict` for duplicate prompt names.
- [ ] Handle `403 Forbidden` for cross-game access.
- [ ] Do not ask the user to pick a clone source prompt.
- [ ] Keep all prompt management game-scoped in the UI.
