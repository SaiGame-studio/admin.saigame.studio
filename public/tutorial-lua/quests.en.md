All quest functions supported by Lua scripts

---

### `game.get_quest_def_by_id(id)`

Fetches a `QuestDefinition` blueprint by UUID.

```lua
local quest, err = game.get_quest_def_by_id("q1w2e3r4-...")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Quest definition UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

