# Daily Quest System — Studio Owner Admin Guide

> **Scope:** This document covers only the **Studio Owner / Admin** side of the Daily Quest system.  
> Player-facing endpoints (GetDailyQuests, ClaimReward, ClaimBonus, GetStreak, WeekView, MonthView) are intentionally excluded.

---

## Table of Contents

1. [Concept Overview](#1-concept-overview)
2. [Full Setup Flow](#2-full-setup-flow)
3. [Step 1 — Create Quest Definitions](#3-step-1--create-quest-definitions)
4. [Step 2 — Create a Daily Quest Pool](#4-step-2--create-a-daily-quest-pool)
5. [Step 3 — Add Quests to the Pool](#5-step-3--add-quests-to-the-pool)
6. [Step 4 — Set Completion Bonus](#6-step-4--set-completion-bonus)
7. [Step 5 — Activate / Deactivate Pool](#7-step-5--activate--deactivate-pool)
8. [List & Read Pools](#8-list--read-pools)
9. [Remove a Quest from a Pool](#9-remove-a-quest-from-a-pool)
10. [Manage Quest Definitions](#10-manage-quest-definitions)
11. [Assignment Strategy Reference](#11-assignment-strategy-reference)
12. [RewardConfig Reference](#12-rewardconfig-reference)
13. [Condition Tree Reference](#13-condition-tree-reference)
14. [Error Reference](#14-error-reference)

---

## 1. Concept Overview

```
QuestDefinition(s)           ← reusable quest blueprints
        │
        ▼
 DailyQuestPool              ← one pool per "channel" (e.g. "Daily Casual", "Weekly Hard")
        │
        ├─ DailyQuestPoolQuest (weight / order) ×N
        │
        ├─ DailyCompletionBonus (reward given when player clears all daily slots)
        │
        └─ Assignment Strategy
               │
               ├─ weighted_random   → random pick weighted by `weight` field
               ├─ fixed_rotation    → round-robin by `sequence_order`
               ├─ weekly_schedule   → fixed quest for a specific day-of-week (0=Sun…6=Sat)
               └─ monthly_schedule  → fixed quest for a specific day-of-month (1–31)
```

**Key rules:**
- A pool holds many quests but only displays **`slots_per_day`** of them to a player each day.
- The pool resets every day at **`reset_hour_utc`** (UTC).
- A quest must exist as a `QuestDefinition` with `quest_type = "daily"` before it can be added to a pool.
- The pool is not visible to players until `is_active = true`.

---

## 2. Full Setup Flow

```
 ┌──────────────────────────────────────────────────────┐
 │  1. POST /quest-definitions  (create 1+ quest defs)  │
 └──────────────────────┬───────────────────────────────┘
                        │
 ┌──────────────────────▼───────────────────────────────┐
 │  2. POST /daily-quest-pools  (create pool)           │
 └──────────────────────┬───────────────────────────────┘
                        │
 ┌──────────────────────▼───────────────────────────────┐
 │  3. POST /daily-quest-pools/{id}/quests  (add quests)│
 └──────────────────────┬───────────────────────────────┘
                        │
 ┌──────────────────────▼───────────────────────────────┐
 │  4. PUT /daily-quest-pools/{id}/completion-bonus     │
 └──────────────────────┬───────────────────────────────┘
                        │
 ┌──────────────────────▼───────────────────────────────┐
 │  5. PATCH /daily-quest-pools/{id}  is_active=true    │
 └──────────────────────────────────────────────────────┘
```

---

## 3. Step 1 — Create Quest Definitions

Before adding quests to a pool you need `QuestDefinition` records with `quest_type = "daily"`.

### Endpoint

```
POST /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions
```

**Headers**
```
Authorization: Bearer <studio_token>
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | Display name shown in UI |
| `description` | string | ✅ | Short description |
| `quest_type` | string | ✅ | **Must be `"daily"`** for use in a daily pool |
| `conditions` | object | ✅ | Condition tree — see [Section 13](#13-condition-tree-reference) |
| `rewards` | array | ✅ | Array of `RewardConfig` — see [Section 12](#12-rewardconfig-reference) |
| `is_active` | bool | ✅ | `false` to draft, `true` to publish |
| `sort_order` | int | — | Display order in list views |
| `quest_chain_id` | UUID | — | Omit for standalone daily quests |
| `prerequisite_quest_id` | UUID | — | Omit for daily quests |

### Example — Login Quest

```json
POST /api/v1/studios/stu_abc/games/gm_xyz/quest-definitions
{
  "name": "Daily Login",
  "description": "Log in to the game today.",
  "quest_type": "daily",
  "conditions": {
    "operator": "AND",
    "clauses": [
      {
        "clause_id": "login_once",
        "type": "login",
        "target": 1
      }
    ]
  },
  "rewards": [
    { "reward_type": "coin", "amount": 50 }
  ],
  "is_active": true,
  "sort_order": 1
}
```

### Example — Collect Items Quest

```json
{
  "name": "Collect 3 Swords",
  "description": "Collect 3 Iron Sword items today.",
  "quest_type": "daily",
  "conditions": {
    "operator": "AND",
    "clauses": [
      {
        "clause_id": "sword_collect",
        "type": "item_collect",
        "items": [
          { "item_definition_id": "def-uuid-here", "quantity": 3 }
        ]
      }
    ]
  },
  "rewards": [
    {
      "reward_type": "item",
      "item_definition_id": "reward-item-uuid-here",
      "quantity_min": 1,
      "quantity_max": 1
    }
  ],
  "is_active": true,
  "sort_order": 2
}
```

### Example — Multi-condition Quest (AND)

```json
{
  "name": "Login + 5 Gacha",
  "description": "Log in and open 5 gacha packs today.",
  "quest_type": "daily",
  "conditions": {
    "operator": "AND",
    "clauses": [
      { "clause_id": "login", "type": "login", "target": 1 },
      { "clause_id": "gacha_5", "type": "gacha_opened", "target": 5 }
    ]
  },
  "rewards": [
    { "reward_type": "coin", "amount": 200 }
  ],
  "is_active": true,
  "sort_order": 3
}
```

### Response (201 Created)

```json
{
  "id": "quest-def-uuid",
  "studio_id": "stu_abc",
  "game_id": "gm_xyz",
  "name": "Daily Login",
  "quest_type": "daily",
  "conditions": { ... },
  "rewards": [ ... ],
  "is_active": true,
  "sort_order": 1,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

Save the `id` — you'll need it when adding quests to a pool.

---

## 4. Step 2 — Create a Daily Quest Pool

### Endpoint

```
POST /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools
```

**Headers**
```
Authorization: Bearer <studio_token>
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `pool_key` | string | ✅ | Unique stable key within the game (e.g. `"daily_casual"`). Cannot be changed after creation. |
| `display_name` | string | ✅ | Human-readable name |
| `description` | string | — | Optional description |
| `assignment_strategy` | string | ✅ | One of: `weighted_random`, `fixed_rotation`, `weekly_schedule`, `monthly_schedule` |
| `slots_per_day` | int | ✅ | How many quests a player sees per day (≥ 1) |
| `reset_hour_utc` | int | — | UTC hour when the pool resets (0–23). Default: `0` (midnight UTC) |
| `is_active` | bool | — | Default `false`. Set `true` when ready to go live. |

### Strategy Examples

#### weighted_random
Randomly picks `slots_per_day` quests each day. Rarer quests get lower `weight`.

```json
{
  "pool_key": "daily_casual",
  "display_name": "Daily Casual Quests",
  "description": "3 random easy quests every day.",
  "assignment_strategy": "weighted_random",
  "slots_per_day": 3,
  "reset_hour_utc": 0,
  "is_active": false
}
```

#### fixed_rotation
Cycles through quests in `sequence_order` (1, 2, 3 … back to 1). Good for predictable daily content.

```json
{
  "pool_key": "daily_rotation",
  "display_name": "Daily Rotation",
  "assignment_strategy": "fixed_rotation",
  "slots_per_day": 1,
  "reset_hour_utc": 6,
  "is_active": false
}
```

#### weekly_schedule
Each quest is pinned to a specific day-of-week. Set `schedule_day` (0=Sunday … 6=Saturday) **when adding quests to the pool**.

```json
{
  "pool_key": "weekly_special",
  "display_name": "Weekly Special Quest",
  "assignment_strategy": "weekly_schedule",
  "slots_per_day": 1,
  "reset_hour_utc": 0,
  "is_active": false
}
```

#### monthly_schedule
Each quest is pinned to a specific day-of-month (1–31). Set `schedule_day` **when adding quests to the pool**.

```json
{
  "pool_key": "monthly_event",
  "display_name": "Monthly Event Quests",
  "assignment_strategy": "monthly_schedule",
  "slots_per_day": 1,
  "reset_hour_utc": 0,
  "is_active": false
}
```

### Response (201 Created)

```json
{
  "id": "pool-uuid",
  "studio_id": "stu_abc",
  "game_id": "gm_xyz",
  "pool_key": "daily_casual",
  "display_name": "Daily Casual Quests",
  "assignment_strategy": "weighted_random",
  "slots_per_day": 3,
  "reset_hour_utc": 0,
  "is_active": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

---

## 5. Step 3 — Add Quests to the Pool

### Endpoint

```
POST /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}/quests
```

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `quest_id` | UUID | ✅ | Must be an existing `QuestDefinition` with `quest_type = "daily"` |
| `weight` | int | ✅ for `weighted_random` | Relative weight (e.g. 10 = common, 1 = rare). Ignored for schedule strategies. |
| `sequence_order` | int | ✅ for `fixed_rotation`, `weekly_schedule`, `monthly_schedule` | See strategy-specific notes below. |

### Per-Strategy Details

#### weighted_random
- `weight` determines relative probability. Example: quest A = 10, quest B = 1 → A is 10× more likely.
- `sequence_order` is ignored.

```json
{
  "quest_id": "quest-def-uuid-1",
  "weight": 10,
  "sequence_order": 0
}
```

#### fixed_rotation
- `sequence_order` determines cycle position (1, 2, 3, …).
- Quests are served in ascending `sequence_order` day by day, wrapping around.

```json
{ "quest_id": "quest-def-uuid-1", "weight": 1, "sequence_order": 1 }
```
```json
{ "quest_id": "quest-def-uuid-2", "weight": 1, "sequence_order": 2 }
```
```json
{ "quest_id": "quest-def-uuid-3", "weight": 1, "sequence_order": 3 }
```

#### weekly_schedule
- `sequence_order` = day-of-week: **0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday**.
- Each day-of-week should map to exactly one quest in the pool.

```json
{ "quest_id": "monday-quest-uuid", "weight": 1, "sequence_order": 1 }
```
```json
{ "quest_id": "friday-quest-uuid", "weight": 1, "sequence_order": 5 }
```

#### monthly_schedule
- `sequence_order` = day-of-month (1–31).
- If a month doesn't have that day (e.g. day 31 in February), it falls back to the last valid day.

```json
{ "quest_id": "first-of-month-uuid", "weight": 1, "sequence_order": 1 }
```
```json
{ "quest_id": "fifteenth-uuid",      "weight": 1, "sequence_order": 15 }
```

### Response (201 Created)

```json
{
  "pool_id": "pool-uuid",
  "quest_id": "quest-def-uuid-1",
  "weight": 10,
  "sequence_order": 0
}
```

---

## 6. Step 4 — Set Completion Bonus

The completion bonus is awarded once a player completes **all** quests assigned to them for the day.

### Endpoint

```
PUT /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}/completion-bonus
```

> Using `PUT` — it replaces the entire bonus configuration. Calling it again overwrites the previous bonus.

### Request Body

| Field | Type | Required | Notes |
|---|---|---|---|
| `rewards` | array of RewardConfig | ✅ | List of rewards to grant on full completion. See [Section 12](#12-rewardconfig-reference). |

### Example — Coin Bonus

```json
{
  "rewards": [
    { "reward_type": "coin", "amount": 500 }
  ]
}
```

### Example — Item + Coin Bonus

```json
{
  "rewards": [
    { "reward_type": "coin", "amount": 200 },
    {
      "reward_type": "item",
      "item_definition_id": "chest-uuid",
      "quantity_min": 1,
      "quantity_max": 1
    }
  ]
}
```

### Example — Random Quantity Item

```json
{
  "rewards": [
    {
      "reward_type": "item",
      "item_definition_id": "potion-uuid",
      "quantity_min": 2,
      "quantity_max": 5
    }
  ]
}
```

Quantity is randomly selected between `quantity_min` and `quantity_max` at claim time.

### Response (200 OK)

```json
{
  "pool_id": "pool-uuid",
  "rewards": [
    { "reward_type": "coin", "amount": 500 }
  ],
  "updated_at": "2025-01-01T00:00:00Z"
}
```

To **remove the bonus**, `PUT` with an empty array:

```json
{ "rewards": [] }
```

---

## 7. Step 5 — Activate / Deactivate Pool

### Endpoint

```
PATCH /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}
```

All fields are optional — only include fields you want to change.

### Request Body

| Field | Type | Notes |
|---|---|---|
| `display_name` | string | Update the pool name |
| `description` | string | Update description |
| `slots_per_day` | int | Change how many quests players see |
| `reset_hour_utc` | int | Change reset hour (0–23 UTC) |
| `is_active` | bool | `true` = live, `false` = hidden from players |

### Activate

```json
{ "is_active": true }
```

### Deactivate (maintenance / season end)

```json
{ "is_active": false }
```

### Change Slots + Reset Time

```json
{
  "slots_per_day": 5,
  "reset_hour_utc": 3
}
```

### Response (200 OK)

Returns the full updated `DailyQuestPool` object.

```json
{
  "id": "pool-uuid",
  "pool_key": "daily_casual",
  "display_name": "Daily Casual Quests",
  "assignment_strategy": "weighted_random",
  "slots_per_day": 3,
  "reset_hour_utc": 0,
  "is_active": true,
  "updated_at": "2025-01-02T00:00:00Z"
}
```

> **Warning:** Changing `slots_per_day` takes effect the **next reset cycle**, not mid-day.

---

## 8. List & Read Pools

### List All Pools

```
GET /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools
```

**Query Parameters**

| Parameter | Type | Notes |
|---|---|---|
| `active_only` | bool | `true` to return only active pools |

```
GET /api/v1/studios/stu_abc/games/gm_xyz/daily-quest-pools?active_only=true
```

#### Response (200 OK)

```json
[
  {
    "id": "pool-uuid-1",
    "pool_key": "daily_casual",
    "display_name": "Daily Casual Quests",
    "assignment_strategy": "weighted_random",
    "slots_per_day": 3,
    "reset_hour_utc": 0,
    "is_active": true
  },
  {
    "id": "pool-uuid-2",
    "pool_key": "weekly_special",
    "display_name": "Weekly Special Quest",
    "assignment_strategy": "weekly_schedule",
    "slots_per_day": 1,
    "reset_hour_utc": 0,
    "is_active": false
  }
]
```

### Get Single Pool (with quests + bonus)

```
GET /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}
```

#### Response (200 OK)

```json
{
  "id": "pool-uuid",
  "pool_key": "daily_casual",
  "display_name": "Daily Casual Quests",
  "assignment_strategy": "weighted_random",
  "slots_per_day": 3,
  "reset_hour_utc": 0,
  "is_active": true,
  "quests": [
    {
      "quest_id": "quest-uuid-1",
      "weight": 10,
      "sequence_order": 0,
      "quest": { ... }
    },
    {
      "quest_id": "quest-uuid-2",
      "weight": 1,
      "sequence_order": 0,
      "quest": { ... }
    }
  ],
  "completion_bonus": {
    "rewards": [
      { "reward_type": "coin", "amount": 500 }
    ]
  }
}
```

---

## 9. Remove a Quest from a Pool

### Endpoint

```
DELETE /api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}/quests/{quest_id}
```

No request body required.

### Response (204 No Content)

> **Note:** Removing a quest from the pool does **not** delete the `QuestDefinition`. Players who already received this quest today will not be affected until the next daily reset.

---

## 10. Manage Quest Definitions

These endpoints let you edit quest blueprints after creation.

### List Quest Definitions

```
GET /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions
```

**Query Parameters**

| Parameter | Notes |
|---|---|
| `quest_type` | Filter by type, e.g. `?quest_type=daily` |
| `is_active` | Filter by active status |

### Get Single Quest Definition

```
GET /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}
```

### Update Quest Definition

```
PATCH /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}
```

All fields are optional:

```json
{
  "name": "Daily Login (Updated)",
  "rewards": [
    { "reward_type": "coin", "amount": 100 }
  ],
  "is_active": false
}
```

> **Note:** Updating `conditions` replaces the **entire** condition tree. Changes take effect for **new daily assignments** after the next reset. In-progress assignments are not retroactively changed.

### Delete Quest Definition

```
DELETE /api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}
```

> **Warning:** Deleting a quest definition that is still linked to an active pool will break the pool. Always remove the quest from the pool first, then delete the definition.

---

## 11. Assignment Strategy Reference

| Strategy | Description | `weight` used? | `sequence_order` meaning |
|---|---|---|---|
| `weighted_random` | Random pick each day weighted by `weight` | ✅ Yes | Ignored |
| `fixed_rotation` | Round-robin by sequence order, advances each day | Optional | Cycle position (1, 2, 3, …) |
| `weekly_schedule` | Fixed quest per day-of-week | Ignored | Day-of-week: 0=Sun, 1=Mon … 6=Sat |
| `monthly_schedule` | Fixed quest per day-of-month | Ignored | Day-of-month: 1–31 |

### When to use each strategy

| Use case | Recommended strategy |
|---|---|
| General daily quests with variety | `weighted_random` |
| Predictable weekly event quests | `weekly_schedule` |
| Monthly login rewards | `monthly_schedule` |
| Tutorial-style quest progression | `fixed_rotation` |
| Mix of common/rare daily challenges | `weighted_random` with varied weights |

---

## 12. RewardConfig Reference

Used in quest `rewards` array and `completion_bonus.rewards` array.

### Coin Reward

```json
{
  "reward_type": "coin",
  "amount": 100
}
```

| Field | Type | Notes |
|---|---|---|
| `reward_type` | string | `"coin"` |
| `amount` | int64 | Number of coins to credit |

### Item Reward (Fixed Quantity)

```json
{
  "reward_type": "item",
  "item_definition_id": "uuid-of-item-def",
  "quantity_min": 1,
  "quantity_max": 1
}
```

### Item Reward (Random Quantity)

```json
{
  "reward_type": "item",
  "item_definition_id": "uuid-of-item-def",
  "quantity_min": 2,
  "quantity_max": 5
}
```

| Field | Type | Notes |
|---|---|---|
| `reward_type` | string | `"item"` |
| `item_definition_id` | UUID | Must be an existing item definition in the game |
| `quantity_min` | int | Minimum quantity granted (inclusive) |
| `quantity_max` | int | Maximum quantity granted (inclusive). Equal to `quantity_min` for fixed qty. |

### Multiple Rewards (Quest)

```json
"rewards": [
  { "reward_type": "coin", "amount": 50 },
  {
    "reward_type": "item",
    "item_definition_id": "potion-uuid",
    "quantity_min": 1,
    "quantity_max": 1
  }
]
```

All rewards in the array are granted together when the player claims.

---

## 13. Condition Tree Reference

The `conditions` object defines what a player must do to complete the quest.

### Structure

```json
{
  "operator": "AND" | "OR",
  "clauses": [ ...QuestConditionClause ]
}
```

> Nesting is **not** supported — all clauses are flat under the root group.

### Clause Fields

| Field | Type | Notes |
|---|---|---|
| `clause_id` | string | **Unique** identifier within the quest. Used as the key in player progress data. Use stable names (e.g. `"login"`, `"gacha_5"`). |
| `type` | string | Event type — see table below |
| `target` | int | Required count for counter-based conditions. Omit or set to 0 for non-counter types. |
| `items` | array | For `item_collect` only — list of `{ item_definition_id, quantity }` |
| `details` | object | Optional metadata for future filtering (stored but not currently enforced) |

### Supported Condition Types

| `type` | Description | `target` | `items` |
|---|---|---|---|
| `login` | Player logs in | Set to `1` | — |
| `gacha_opened` | Player opens gacha packs | Number of packs | — |
| `item_collect` | Player collects specific items | — | Required (list each item + qty) |

> Additional event types can be registered by the backend. Check with backend for any new types.

### Operator Rules

| Operator | Meaning |
|---|---|
| `AND` | **All** clauses must be satisfied |
| `OR` | **At least one** clause must be satisfied |

### Examples

**Single login clause:**
```json
{
  "operator": "AND",
  "clauses": [
    { "clause_id": "login", "type": "login", "target": 1 }
  ]
}
```

**Either open 3 gacha OR log in:**
```json
{
  "operator": "OR",
  "clauses": [
    { "clause_id": "gacha", "type": "gacha_opened", "target": 3 },
    { "clause_id": "login", "type": "login", "target": 1 }
  ]
}
```

**Collect 2 specific items (must have both):**
```json
{
  "operator": "AND",
  "clauses": [
    {
      "clause_id": "collect_sword",
      "type": "item_collect",
      "items": [
        { "item_definition_id": "sword-uuid", "quantity": 2 }
      ]
    }
  ]
}
```

---

## 14. Error Reference

### Quest Definition Errors

| HTTP | Error message | Meaning |
|---|---|---|
| 404 | `quest: definition not found` | `quest_id` does not exist |
| 400 | `quest: definition is not active` | Quest is inactive; activate it first |
| 409 | — | Duplicate name or constraint violation |

### Daily Quest Pool Errors

| HTTP | Error message | Meaning |
|---|---|---|
| 404 | `daily quest pool not found` | `pool_id` does not exist |
| 400 | `daily quest: bonus already claimed` | (Player side) not applicable to admin UI |
| 400 | `daily quest: bonus not eligible` | (Player side) not applicable to admin UI |
| 400 | `daily quest: quest expired` | (Player side) not applicable to admin UI |

### General Errors

| HTTP | Meaning | Action |
|---|---|---|
| 400 Bad Request | Malformed JSON or missing required field | Check request body |
| 401 Unauthorized | Token missing or invalid | Re-authenticate |
| 403 Forbidden | Studio owner does not own this game | Verify `studio_id` and `game_id` |
| 409 Conflict | `pool_key` already exists in this game | Use a different `pool_key` |
| 500 Internal Server Error | Backend error | Check server logs |

---

## Quick Reference — Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/studios/{studio_id}/games/{game_id}/quest-definitions` | Create quest definition |
| `GET` | `/api/v1/studios/{studio_id}/games/{game_id}/quest-definitions` | List quest definitions |
| `GET` | `/api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}` | Get single quest definition |
| `PATCH` | `/api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}` | Update quest definition |
| `DELETE` | `/api/v1/studios/{studio_id}/games/{game_id}/quest-definitions/{quest_id}` | Delete quest definition |
| `POST` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools` | Create pool |
| `GET` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools` | List pools |
| `GET` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}` | Get pool (with quests + bonus) |
| `PATCH` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}` | Update pool (incl. activate/deactivate) |
| `POST` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}/quests` | Add quest to pool |
| `DELETE` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}/quests/{quest_id}` | Remove quest from pool |
| `PUT` | `/api/v1/studios/{studio_id}/games/{game_id}/daily-quest-pools/{pool_id}/completion-bonus` | Set / update completion bonus |
