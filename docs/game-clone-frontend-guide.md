# Game Clone System - Frontend Integration Guide

This guide explains how the front end should integrate with the phased game clone API.

It is based on the current backend implementation in:
- `internal/handler/game_clone_handler.go`
- `internal/handler/route_definitions.go`
- `internal/usecase/game_clone_usecase.go`
- `internal/repository/game_clone_session_repository.go`

The clone flow is intentionally **step-based**:
- the front end creates a clone session
- the front end calls `run` repeatedly to process one batch at a time
- the front end reads the session snapshot to restore progress or show status
- the front end deletes the session when the attempt should be retired

---

## 1. Core UI Model

The UI should treat a clone as a long-lived session with these states:

- `created`
- `running`
- `blocked`
- `completed`
- `failed`
- `deleted`

The backend stores the session and returns a full snapshot after create and run calls.

Recommended UI screens:
- clone setup form
- clone progress view
- conflict / quota blocker view
- completed state

Game visibility and clone pricing are driven by the source game payload:
- `share_level` tells the UI whether the game is `private`, `protected`, or `public`
- `clone_cost` is the clone price displayed for `public` games

Current backend behavior:
- `protected` games are cloneable only inside the same studio
- `public` games are cloneable cross-studio and should display their clone price in the picker
- the current `PATCH /api/v1/games/{id}` handler accepts `share_level` and `clone_cost`
- the clone settings page can update game visibility inline
- the UI should still ensure that `public` games use a `clone_cost` of at least `7`

---

## 2. API Surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/games/cloneable` | List cloneable source games |
| `POST` | `/api/v1/games/{game_id}/clone-sessions` | Create a clone session |
| `POST` | `/api/v1/game-clone-sessions/{session_id}/run` | Process the next batch |
| `GET` | `/api/v1/game-clone-sessions/{session_id}` | Restore current session state |
| `POST` | `/api/v1/game-clone-sessions/{session_id}/delete` | Mark session as deleted |

The create route is game-scoped. The other routes use the session ID directly.

---

## 3. List Cloneable Games

### Request

`GET /api/v1/games/cloneable?target_game_id={uuid}&name={optional}&game_id={optional}&limit={optional}&offset={optional}`

Query parameters:
- `target_game_id` is required and is used to derive the target studio
- `name` is an optional partial search on game name
- `game_id` is an optional exact source-game filter
- `limit` and `offset` are optional pagination parameters
- `limit` defaults to `100` and is capped at `100`

The list includes:
- public games from any studio
- protected games from the same studio as the target game

### Response

Example:

```json
{
  "games": [
    {
      "id": "018f6f2d-9a21-7c2f-8c1d-3f2a9e11b001",
      "studio_id": "018f6f20-1111-7c2f-8c1d-3f2a9e11b000",
      "name": "Game Template Alpha",
      "description": "Base template for the project",
      "tags": ["template", "rpg"],
      "status": "development",
      "is_active": true,
      "share_level": "public",
      "clone_cost": 7,
      "is_cloned_game": false,
      "limits": {
        "max_items": 1000,
        "max_shops": 20,
        "max_quests": 200
      },
      "usage": {
        "items": 120,
        "shops": 3,
        "quests": 12
      },
      "settings": {
        "daily_quest_max_advance_days": 7
      },
      "created_at": "2026-06-16T10:00:00Z",
      "updated_at": "2026-06-16T10:00:00Z"
    }
  ],
  "total": 247
}
```

### Frontend behavior

- Call this endpoint to populate the source-game picker.
- Send `target_game_id` from the destination game the user wants to clone into.
- Use `name` for partial search when the user types text.
- Use `game_id` for exact lookup when the user pastes a UUID.
- Show only the returned `games` array in the picker.
- Use `total` to decide whether to show "search to load more" messaging.
- Render a `Protected` badge for `share_level = protected`.
- Render a `Public` badge and the `clone_cost` value for `share_level = public`.
- Render the current visibility as plain text with a pencil trigger for inline editing.
- Enforce the `public` clone cost rule when saving the visibility change.

---

## 4. Create Clone Session

### Request

`POST /api/v1/games/{game_id}/clone-sessions`

```json
{
  "name": "Game A - Production",
  "target_game_id": "018f6f4e-9c1a-7b2a-8d2f-1d4e6fdc2a12"
}
```

Important:
- `name` is required
- `target_game_id` is required
- the backend derives `target_studio_id` from the target game

### Response

The backend returns a session snapshot with:
- `session_id`
- `source_game_id`
- `target_game_id`
- `status`
- `current_phase`
- `current_batch_index`
- `batch_size`
- `last_run_response`
- `progress`
- `message`

Example:

```json
{
  "session_id": "018f6f4d-4b0f-7c9a-8d2f-1d4e6fdc2a11",
  "source_game_id": "018f6f2d-9a21-7c2f-8c1d-3f2a9e11b001",
  "target_game_id": "018f6f4e-9c1a-7b2a-8d2f-1d4e6fdc2a12",
  "status": "created",
  "current_phase": "item_definitions",
  "current_batch_index": 0,
  "batch_size": 10,
  "last_run_response": {
    "warnings": [
      {
        "field": "item_definitions",
        "message": "Target quota is not enough to clone all item definitions."
      }
    ],
    "estimated_clone_cost": {
      "currency": "sGem",
      "amount": 0
    }
  },
  "progress": {
    "item_definitions": { "total": 42, "processed": 0, "completed": false },
    "item_container_definitions": { "total": 3, "processed": 0, "completed": false },
    "quest_definitions": { "total": 18, "processed": 0, "completed": false },
    "shop_definitions": { "total": 5, "processed": 0, "completed": false }
  },
  "message": "Preparing clone"
}
```

### Frontend behavior

- Show the preflight warnings immediately.
- Show the estimated clone cost if present.
- Disable the `Run` button until the user confirms the session should start.
- If the backend rejects the create call, keep the form open and display the error.

---

## 5. Run Clone Session

### Request

`POST /api/v1/game-clone-sessions/{session_id}/run`

No request body.

The backend processes exactly one batch for the current phase.
Batch size is fixed at `10`.

### Response

The response includes the full session snapshot, so the UI does not need to call `GET` after every run.

Example:

```json
{
  "session_id": "018f6f4d-4b0f-7c9a-8d2f-1d4e6fdc2a11",
  "source_game_id": "018f6f2d-9a21-7c2f-8c1d-3f2a9e11b001",
  "target_game_id": "018f6f4e-9c1a-7b2a-8d2f-1d4e6fdc2a12",
  "status": "running",
  "current_phase": "item_definitions",
  "current_batch_index": 3,
  "batch_size": 10,
  "last_run_response": {
    "warnings": [
      {
        "field": "item_definitions",
        "message": "Target quota is not enough to clone all item definitions."
      }
    ],
    "estimated_clone_cost": {
      "currency": "sGem",
      "amount": 0
    }
  },
  "progress": {
    "item_definitions": { "total": 42, "processed": 30, "completed": false },
    "item_container_definitions": { "total": 3, "processed": 0, "completed": false },
    "quest_definitions": { "total": 18, "processed": 0, "completed": false },
    "shop_definitions": { "total": 5, "processed": 0, "completed": false }
  },
  "message": "Batch processed successfully"
}
```

### Frontend behavior

- Keep calling `run` until the session reaches `completed`.
- If the session becomes `blocked`, stop auto-running and show the blocker message.
- If the session moves to the next phase, update the progress header immediately.
- Do not assume the backend will process more than one batch per call.

---

## 6. Restore Session

### Request

`GET /api/v1/game-clone-sessions/{session_id}`

### Response

Same snapshot shape as `run`, but with the current status message.

Use this endpoint when:
- the page reloads
- the user navigates away and comes back
- the clone flow resumes later

### Frontend behavior

- Call this endpoint on page load if you already have a session ID.
- Use it to restore the current phase, batch index, and progress counters.
- If the backend returns `404`, clear the local session state and send the user back to the setup screen.

---

## 7. Delete Session

### Request

`POST /api/v1/game-clone-sessions/{session_id}/delete`

### Response

`204 No Content`

### Frontend behavior

- Use this when the user cancels the flow.
- After a successful delete, remove the session from local state.
- Do not expect a JSON body.

---

## 8. Progress Data

The backend returns per-phase progress in a `progress` object.

Recommended keys:
- `item_definitions`
- `item_container_definitions`
- `quest_definitions`
- `shop_definitions`

Each phase entry has:
- `total`
- `processed`
- `completed`

Example derived UI label:

```ts
const label = `${progress.processed} / ${progress.total}`;
```

Recommended progress bar rule:
- show the active phase as the primary progress bar
- show the other phases as queued or pending

---

## 9. Errors And Blockers

### `400 Bad Request`

Typical causes:
- missing `name`
- missing `target_game_id`
- invalid UUID

UI response:
- keep the form open
- highlight the invalid field

### `403 Forbidden`

Typical causes:
- caller cannot read the source game
- caller cannot create a game in the target studio
- caller is not allowed to view or resume the session

UI response:
- show access denied
- return to the previous screen

### `404 Not Found`

Typical causes:
- source game not found
- target game not found
- session not found

UI response:
- show not found
- clear stale session state

### `409 Conflict`

Typical causes:
- duplicate clone session for the same source game
- target definition conflict
- invalid clone source

UI response:
- show the conflict message
- keep the session visible if the backend returned a snapshot

### `422 Unprocessable Entity`

Typical causes:
- quota block during a batch

UI response:
- stop automatic runs
- tell the user what resource limit must be increased
- allow retry after the limit is fixed

### `500 Internal Server Error`

Typical causes:
- unexpected backend failure

UI response:
- show a generic failure state
- allow retry only if the session still exists and is not deleted

---

## 10. Suggested Frontend State

```ts
type CloneSessionState = {
  sessionId: string | null;
  sourceGameId: string;
  targetGameId: string;
  status: "created" | "running" | "blocked" | "completed" | "deleted" | "failed";
  currentPhase: "item_definitions" | "item_container_definitions" | "quest_definitions" | "shop_definitions" | "finalization";
  currentBatchIndex: number;
  batchSize: number;
  progress: Record<string, { total: number; processed: number; completed: boolean }>;
  warnings: Array<{ field: string; message: string }>;
  conflicts: Array<{ field: string; value?: string; target_definition_id?: string; message: string }>;
  message: string;
};
```

Suggested derived flags:
- `canRun`
- `isBlocked`
- `isCompleted`
- `hasWarnings`
- `hasConflicts`

---

## 11. Recommended UI Flow

1. User opens the clone setup screen.
2. User selects a source game and a target game.
3. UI submits `POST /api/v1/games/{game_id}/clone-sessions`.
4. UI shows the preflight warnings and estimated cost.
5. User clicks `Run`.
6. UI keeps calling `POST /api/v1/game-clone-sessions/{session_id}/run`.
7. UI stops automatically when the session becomes `blocked` or `completed`.
8. UI lets the user resolve the blocker or close the flow.

---

## 12. Implementation Checklist

- [ ] Build a clone setup form with `name` and `target_game_id`
- [ ] Show preflight warnings before the first run
- [ ] Persist `session_id` in local UI state
- [ ] Poll or manually step through `run`
- [ ] Render batch progress per phase
- [ ] Pause when the session becomes `blocked`
- [ ] Show `409` conflict details clearly
- [ ] Handle `204 No Content` for delete
- [ ] Restore session state with `GET` on reload
