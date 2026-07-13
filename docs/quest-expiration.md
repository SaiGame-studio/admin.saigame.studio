# Quest Expiration Specification

## Purpose

This document defines the expiration behavior for player quest instances. Expiration belongs to `quest_player_progress`, not directly to quest availability. A quest definition only configures an optional lifetime in minutes.

This specification applies to both supported quest types:

- `one_time`
- `daily`

## Terminology

| Term | Storage | Meaning |
|---|---|---|
| Expiration lifetime | `quest_definitions.expire_after_minutes` | Optional positive number of minutes assigned to each new player quest instance. `NULL` means no instance TTL. |
| Instance deadline | `quest_player_progress.expires_at` | Absolute deadline calculated when the first instance is created. |
| Daily reset deadline | `quest_player_progress.reset_at` | End of the current daily assignment window. `NULL` for one-time quests. |
| Expired instance | Runtime evaluation | The instance is expired when either `expires_at` or `reset_at` has been reached. |

The effective deadline is therefore:

```text
effective_deadline = earliest non-null value of expires_at and reset_at
expired = now >= effective_deadline
```

## Database Schema

Migration: `migrations/226_add_quest_instance_expiration.up.sql`

```sql
ALTER TABLE quest_definitions
    ADD COLUMN IF NOT EXISTS expire_after_minutes INTEGER;

ALTER TABLE quest_player_progress
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

No database trigger, stored procedure, or database-side UUID generation is introduced by this expiration feature.

## Definition Configuration

### Create quest definition

`POST /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions`

`expire_after_minutes` is optional and applies to both `one_time` and `daily` definitions.

```json
{
  "code_name": "WEEKLY_HUNT",
  "name": "Weekly Hunt",
  "description": "Defeat the weekly target",
  "quest_type": "one_time",
  "conditions": {
    "operator": "AND",
    "clauses": []
  },
  "rewards": [],
  "is_active": true,
  "expire_after_minutes": 7200
}
```

Successful response:

```json
{
  "id": "019b312f-41a7-7c21-8e24-37ea3c2b31f8",
  "game_id": "019b312e-828d-7958-81dd-408973b65af1",
  "code_name": "WEEKLY_HUNT",
  "name": "Weekly Hunt",
  "description": "Defeat the weekly target",
  "quest_type": "one_time",
  "conditions": {
    "operator": "AND",
    "clauses": []
  },
  "rewards": [],
  "is_active": true,
  "expire_after_minutes": 7200,
  "metadata": {},
  "created_at": "2026-07-13T00:00:00Z",
  "updated_at": "2026-07-13T00:00:00Z"
}
```

### Update quest definition

`PATCH /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}`

```json
{
  "expire_after_minutes": 10080
}
```

Successful response includes the updated configuration:

```json
{
  "id": "019b312f-41a7-7c21-8e24-37ea3c2b31f8",
  "quest_type": "one_time",
  "is_active": true,
  "expire_after_minutes": 10080,
  "updated_at": "2026-07-14T10:15:00Z"
}
```

The value must be greater than zero. Invalid values return HTTP `422`:

```json
{
  "error": "invalid quest expiration",
  "message": "quest: expire_after_minutes must be greater than zero",
  "message_code": "INVALID_QUEST_EXPIRE_AFTER_MINUTES"
}
```

Updating `expire_after_minutes` does not rewrite an existing progress row. A restart with a persisted original `expires_at` inherits that deadline instead of using the updated definition value. The current definition value is used only when the new progress has no deadline to inherit.

## Starting a Quest

Endpoint:

`POST /api/v1/games/{game_id}/quests/{quest_id}/start`

### First start

When no previous progress exists, the service creates a progress row. If the definition has `expire_after_minutes`, it calculates:

```text
progress.expires_at = progress.created_at + expire_after_minutes
```

The deadline is persisted within the same transaction used by `StartQuest`.

Example response:

```json
{
  "id": "019b3130-630d-7ca7-a4ae-9275c099f827",
  "game_id": "019b312e-828d-7958-81dd-408973b65af1",
  "user_id": "019b312f-8478-792c-996c-c6598039cb41",
  "quest_definition_id": "019b312f-41a7-7c21-8e24-37ea3c2b31f8",
  "progress_data": {},
  "status": "in_progress",
  "expires_at": "2026-07-18T00:00:00Z",
  "version": 0,
  "created_at": "2026-07-13T00:00:00Z",
  "updated_at": "2026-07-13T00:00:00Z"
}
```

### Idempotent start

Calling `/start` again while the latest progress is `in_progress` and not expired returns that existing progress. It does not create another instance or extend the deadline.

Calling `/start` when the latest `in_progress` progress has expired returns HTTP `410` with `QUEST_EXPIRED`.

### Restart after cancellation

A cancelled instance may be started again only while its original effective deadline has not passed.

The replacement progress row receives a new `id` and `created_at`, but inherits the original `expires_at`. The configured TTL is not recalculated.

Example timeline:

```text
Monday:    first start, expires_at = Saturday
Tuesday:   cancel while in_progress
Tuesday:   start again, expires_at remains Saturday
Saturday:  deadline reached
Afterward: start returns QUEST_EXPIRED
```

This rule prevents cancel-and-restart from extending a quest lifetime.

## Expiration Evaluation

Expiration is evaluated dynamically. The persisted status is not automatically changed by a scheduled job when a deadline passes.

For a one-time quest:

```text
expired = expires_at != NULL AND now >= expires_at
```

For a daily quest:

```text
expired = (expires_at != NULL AND now >= expires_at)
       OR (reset_at != NULL AND now >= reset_at)
```

The daily quest view exposes an expired instance with the synthetic status `expired` and does not expose the expired progress as the current active progress.

## Cancellation Rules

Endpoint:

`POST /api/v1/games/{game_id}/quests/{quest_id}/cancel`

| Current status | Not expired | Expired | Result |
|---|---:|---:|---|
| `in_progress` | Yes | Yes | Cancellation allowed. |
| `completed` | No | No | Cancellation rejected with `QUEST_ALREADY_COMPLETED`. |
| `claimed` | No | No | Cancellation rejected with `QUEST_ALREADY_CLAIMED`. |
| `cancelled` | No | No | Cancellation rejected with `QUEST_NOT_STARTED`. |

An expired `in_progress` instance may be cancelled for cleanup, but it cannot be started again because the cancelled row retains the original expired deadline.

Successful cancellation of an expired instance:

```json
{
  "quest_id": "019b312f-41a7-7c21-8e24-37ea3c2b31f8",
  "cancelled": true,
  "restartable": false,
  "message": "quest progress cancelled"
}
```

Successful cancellation of a non-expired instance returns `restartable: true` when the definition is active.

## Progress Check and Reward Claim

### Check progress

`POST /api/v1/games/{game_id}/quests/{quest_id}/check`

For an active quest definition, this endpoint always returns the definition and the effective instance status. For an expired instance, it returns HTTP `200 OK` with top-level `status: "expired"`, the stored progress row, and the quest definition. It does not evaluate conditions or write progress updates after expiration.

```json
{
  "progress": {
    "id": "0190f4a2-8329-7e31-9712-c6c52dcf9ea1",
    "quest_definition_id": "0190f49f-ea57-73ac-a25b-e9ac87af2164",
    "status": "in_progress",
    "progress_data": {},
    "expires_at": "2026-07-12T10:00:00Z"
  },
  "status": "expired",
  "quest_definition": {
    "id": "0190f49f-ea57-73ac-a25b-e9ac87af2164",
    "code_name": "WEEKLY_COLLECTION",
    "name": "Weekly Collection",
    "quest_type": "one_time",
    "is_active": true,
    "expire_after_minutes": 7200
  }
}
```

### Claim reward

`POST /api/v1/games/{game_id}/quests/{quest_id}/claim`

The service requires status `completed` and rejects the claim when the progress has expired. A `claimed` row remains final and idempotency handling may return the existing claim.

Expired response for `/start` or `/claim`:

```json
{
  "error": "quest has expired",
  "message": "quest: quest has expired",
  "message_code": "QUEST_EXPIRED"
}
```

HTTP status: `410 Gone`.

## State Transitions

```text
not_started
    |
    | POST /start
    v
in_progress ---------------------> completed ---------------------> claimed
    |                                terminal for cancellation       terminal
    |
    | POST /cancel, before or after expiration
    v
cancelled
    |
    | POST /start before original deadline only
    v
new in_progress instance with inherited expires_at
```

Expiration does not itself persist a new database status. It acts as a runtime gate around start, check, claim, and restart behavior.

## Implementation References

| Behavior | Source |
|---|---|
| Definition and progress expiration fields | `internal/domain/quest.go` |
| Create/update inputs | `internal/domain/quest_inputs.go` |
| Expiration validation and lifecycle rules | `internal/services/implementations/quest_usecase.go` |
| Persistence and transactional deadline update | `internal/repository/postgres_quest_repository.go` |
| HTTP error mapping and cancellation response | `internal/handler/quest_handler.go` |
| Database migration | `migrations/226_add_quest_instance_expiration.up.sql` |
