# Quest Condition Type System

<!-- Ticket: P2-T14 -->

## Overview

Quest conditions describe what a player must accomplish to complete a quest.
Instead of a single flat `condition_type` + `condition_target`, the system now
supports a **compound AND/OR tree** of conditions. Each leaf is a separate
trackable requirement; groups combine leaves with logical operators.

---

## Condition Tree Structure

A quest's `conditions` field is a `QuestConditionGroup` — the root of the tree:

```json
{
  "operator": "AND",
  "clauses": [ /* QuestConditionClause[] */ ]
}
```

Each element in `clauses` is a `QuestConditionClause`, which is either:

| Node kind | Required fields | Description |
|-----------|-----------------|-------------|
| **Leaf** | `clause_id`, `type`, `target` or `items` | A single trackable requirement |
| **Group** | `operator`, `clauses` | A nested AND/OR sub-group |

### Root group

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operator` | `"AND"` \| `"OR"` | ✅ | How root clauses are combined |
| `clauses` | `QuestConditionClause[]` | ✅ | The condition nodes |

### Leaf clause fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clause_id` | `string` | ✅ | Unique stable key within the quest (e.g. `"a"`, `"kill_boss"`). Used as the key in `progress_data`. |
| `type` | `string` | ✅ | Event type this clause tracks (see [Supported Condition Types](#supported-condition-types)) |
| `target` | `int` | for counter types | Required count to satisfy the clause |
| `details` | `object` | ❌ | Optional extra filter metadata (future use; stored but not enforced) |
| `items` | `ItemRequirement[]` | for `item_collect` | Array of `{item_definition_id, quantity}` pairs |

### Group node fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operator` | `"AND"` \| `"OR"` | ✅ | How child clauses are combined |
| `clauses` | `QuestConditionClause[]` | ✅ | Child nodes |

> **Note:** A node is a group if it has `operator` + `clauses`. A node is a leaf if it has `type`. These are mutually exclusive.

---

## Supported Condition Types

### `login`

Player must log in N times.

```json
{
  "clause_id": "daily_login",
  "type": "login",
  "target": 3
}
```

Progress tracking: `{"daily_login": 2}` → needs 1 more login.

---

### `item_collect`

Player must collect one or more specific item types (each with a required quantity).
Multiple items are treated as AND (all must be collected to satisfy the clause).

```json
{
  "clause_id": "herb_run",
  "type": "item_collect",
  "items": [
    { "item_definition_id": "uuid-iron-ore", "quantity": 20 },
    { "item_definition_id": "uuid-coal", "quantity": 5 }
  ]
}
```

Progress tracking (sub-map by item UUID):
```json
{ "herb_run": { "uuid-iron-ore": 12, "uuid-coal": 3 } }
```

Event payload must include `item_quantities`:
```json
{
  "event_type": "item_collect",
  "item_quantities": {
    "uuid-iron-ore": 8
  }
}
```

---

### `gacha_opened`

Player must open N gacha packs.

```json
{
  "clause_id": "gacha_3",
  "type": "gacha_opened",
  "target": 3
}
```

---

## AND / OR Combinations

### Simple AND (all must be done)

```json
{
  "operator": "AND",
  "clauses": [
    { "clause_id": "login_once", "type": "login",        "target": 1 },
    { "clause_id": "open_gacha", "type": "gacha_opened", "target": 3 }
  ]
}
```

Completed only when both clauses are satisfied.

---

### Simple OR (any one is enough)

```json
{
  "operator": "OR",
  "clauses": [
    { "clause_id": "login_once", "type": "login",        "target": 1 },
    { "clause_id": "open_gacha", "type": "gacha_opened", "target": 1 }
  ]
}
```

Completed when either clause is met.

---

### Nested example (AND with an OR sub-group)

```json
{
  "operator": "AND",
  "clauses": [
    {
      "clause_id": "login_3",
      "type": "login",
      "target": 3
    },
    {
      "operator": "OR",
      "clauses": [
        { "clause_id": "gacha_2",    "type": "gacha_opened", "target": 2 },
        { "clause_id": "collect_ore", "type": "item_collect", "items": [{ "item_definition_id": "uuid-iron-ore", "quantity": 10 }] }
      ]
    }
  ]
}
```

Completed when: `login_3` is satisfied **AND** (`gacha_2` OR `collect_ore` is satisfied).

---

## Progress Data Format (`progress_data`)

`player_quest_progress.progress_data` is a JSONB object keyed by `clause_id`.

| Clause type | Progress value type | Example |
|-------------|---------------------|---------|
| Counter (`login`, `gacha_opened`) | `number` | `{"login_3": 2}` |
| `item_collect` | `object` (item UUID → collected count) | `{"collect_ore": {"uuid-iron-ore": 7}}` |

Full example for the nested quest above:
```json
{
  "login_3": 2,
  "gacha_2": 0,
  "collect_ore": { "uuid-iron-ore": 0 }
}
```

After opening 2 gachas (`event_type = "gacha_opened"`):
```json
{
  "login_3": 2,
  "gacha_2": 2,
  "collect_ore": { "uuid-iron-ore": 0 }
}
```
→ OR branch satisfied (`gacha_2` = 2 ≥ 2) → AND still needs `login_3` = 1 more.

---

## Triggering Progress (Server-Side Only)

Quest progress is **never advanced by the client**. The client cannot send events. Progress is updated exclusively by server-side usecases when the corresponding action completes:

| `type` | Triggered by |
|--------|--------------|
| `login` | Auth service on successful login |
| `item_collect` | Inventory usecase when items are granted to player |
| `gacha_opened` | Gacha usecase after a pack is opened |

Server code calls `QuestService.RecordQuestEvent` / `DailyQuestService.RecordDailyQuestEvent` internally — these methods are **not exposed as HTTP endpoints**.

---

## API — Creating a Quest Definition

### `POST /api/v1/admin/quests`

```json
{
  "name": "Gacha Addict",
  "description": "Log in 5 times and open 3 gacha packs",
  "quest_type": "one_time",
  "conditions": {
    "operator": "AND",
    "clauses": [
      { "clause_id": "logins",   "type": "login",        "target": 5 },
      { "clause_id": "gacha_3",  "type": "gacha_opened", "target": 3 }
    ]
  },
  "rewards": [
    { "reward_type": "coin", "amount": 500 }
  ],
  "is_active": true,
  "sort_order": 1
}
```

---

## Design Notes

- `clause_id` must be **unique within a quest** (not globally). It is the key in `progress_data`.
- Group nodes do **not** have a `clause_id` — they are not tracked individually.
- The completion check runs entirely **in Go** (usecase layer) after each `SaveProgress` call; no SQL triggers or stored procedures are used.
- An empty `clauses` array: AND operator → trivially **satisfied**; OR operator → trivially **unsatisfied**.
- `details` filtering is stored for future use but **not enforced** in the current implementation.
