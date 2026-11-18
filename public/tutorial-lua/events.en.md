All event type functions supported by Lua scripts

---

### `game.get_event_type_by_id(id_or_name)`

Fetches a `GameEventType` by UUID or name string.

```lua
local evt, err = game.get_event_type_by_id("player_kill")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id_or_name` | string | yes | UUID string or event type name. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_event_type_by_name(name)`

Fetches a `GameEventType` by its name string.

```lua
local evt, err = game.get_event_type_by_name("player_kill")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `name` | string | yes | Event type name (non-empty). |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

