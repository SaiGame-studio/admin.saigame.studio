All battle functions supported by Lua scripts

--- 

### `game.battle_session_create(state)`

Creates a new battle session (status = `active`) and stores the initial state in Redis (TTL 30 minutes).  
Returns an error if the player already has an active session.

```lua
local session_id, err = game.battle_session_create({
    round = 1,
    player_hp = 100,
    enemy_hp  = 80
})
if err ~= nil then error(err) end
output.session_id = session_id
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `state` | table | yes | Initial battle state (arbitrary key/value). |

**Returns:** `(session_id_string, nil)` on success, `(nil, string)` on error.

---

### `game.battle_session_get(session_id)`

Reads the current battle state from Redis.

```lua
local state, err = game.battle_session_get(session_id)
if err ~= nil then error(err) end
output.round = state.round
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | yes | Battle session UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.battle_session_update(session_id, state)`

Overwrites the battle state in Redis (resets TTL to 30 minutes).

```lua
state.round     = state.round + 1
state.enemy_hp  = state.enemy_hp - damage
local err = game.battle_session_update(session_id, state)
if err ~= nil then output.error = err end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | yes | Battle session UUID. |
| 2 | `state` | table | yes | New state to write (replaces previous state). |

**Returns:** `nil` on success, `string` error on failure.

---

### `game.battle_session_end(session_id [, end_data])`

Marks the session as `ended` in PostgreSQL, saves `end_data`, and deletes the Redis key.

```lua
local err = game.battle_session_end(session_id, {
    winner   = "player",
    exp_gain = 150
})
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | yes | Battle session UUID. |
| 2 | `end_data` | table | no | Outcome data stored to the session record. Defaults to `{}`. |

**Returns:** `nil` on success, `string` error on failure.

---

### `game.battle_session_flee(session_id)`

Marks the session as `fled` in PostgreSQL and deletes the Redis key.

```lua
local err = game.battle_session_flee(session_id)
if err ~= nil then output.error = err end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | yes | Battle session UUID. |

**Returns:** `nil` on success, `string` error on failure.

---

### `game.open_entity_drop_packs(session_id, entity_def_id, pack_ids)`

Opens all gacha drop packs listed for a defeated enemy in a battle session.  
Maximum 7 pack IDs per call.

```lua
local results, err = game.open_entity_drop_packs(session_id, entity.id, {
    "pack-uuid-1",
    "pack-uuid-2"
})
if err ~= nil then error(err) end
for i = 1, #results do
    game.log("pack " .. results[i].pack_name .. " success=" .. tostring(results[i].success))
end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | yes | Active battle session UUID. |
| 2 | `entity_def_id` | string (UUID) | yes | Defeated entity definition UUID. |
| 3 | `pack_ids` | table (array of UUID strings) | yes | List of gacha pack UUIDs to open. Max 7 entries. |

**Returns:** `(list-table, nil)` on success where each entry is `{ pack_id, pack_name, success, error }`; `(nil, string)` on error.

