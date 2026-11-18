All entity functions supported by Lua scripts

---

### `game.get_entity_def_by_id(id)`

Fetches an `EntityDefinition` (enemy/NPC/room template) by UUID.

```lua
local entity, err = game.get_entity_def_by_id("e1n2t3i4-...")
if err ~= nil then error(err) end
output.entity_hp = entity.stats.hp
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Entity definition UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_entity_def_by_key(key)`

Fetches an `EntityDefinition` by its string key.

```lua
local entity, err = game.get_entity_def_by_key("goblin_boss")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `key` | string | yes | Entity key (non-empty). |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

--- 

### `game.entity_pool_random(pool_key)`

Picks one random entity from a named pool using weighted random selection.  
Only entries with `weight > 0` are eligible.

```lua
local entity, err = game.entity_pool_random("dungeon_floor_1")
if err ~= nil then error(err) end
output.enemy_id  = entity.id
output.enemy_hp  = entity.stats.hp
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `pool_key` | string | yes | Pool key (non-empty). |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.entity_pool_min(pool_key, stat_key [, count])`

Returns the entity/entities with the **lowest** value for `stat_key` in the pool.  
When `count <= 1` (default), returns a single table. When `count > 1`, returns a list.  
Maximum `count` is 100.

```lua
-- single weakest enemy
local weakest, err = game.entity_pool_min("dungeon_floor_1", "hp")

-- three weakest enemies
local list, err = game.entity_pool_min("dungeon_floor_1", "hp", 3)
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `pool_key` | string | yes | Pool key (non-empty). |
| 2 | `stat_key` | string | yes | Stat key to compare (non-empty). |
| 3 | `count` | integer | no | Number of entities to return (default `1`, max `100`). |

**Returns:** `(table, nil)` when `count=1`; `(list-table, nil)` when `count>1`; `(nil, string)` on error.

---

### `game.entity_pool_max(pool_key, stat_key [, count])`

Returns the entity/entities with the **highest** value for `stat_key` in the pool.  
Same behaviour as `entity_pool_min` but sorted descending.

```lua
local strongest, err = game.entity_pool_max("dungeon_floor_1", "attack")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `pool_key` | string | yes | Pool key (non-empty). |
| 2 | `stat_key` | string | yes | Stat key to compare (non-empty). |
| 3 | `count` | integer | no | Number of entities to return (default `1`, max `100`). |

**Returns:** `(table, nil)` when `count=1`; `(list-table, nil)` when `count>1`; `(nil, string)` on error.

---

### `game.get_entity_pool_def_by_id(id)`

Fetches a full `EntityPool` definition (including its entries, weights, and stats) by UUID.

```lua
local pool, err = game.get_entity_pool_def_by_id("p0o1l2d-...")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Entity pool UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_entity_pool_def_by_key(pool_key)`

Fetches a full `EntityPool` definition by pool key.

```lua
local pool, err = game.get_entity_pool_def_by_key("dungeon_floor_1")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `pool_key` | string | yes | Pool key (non-empty). |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.
