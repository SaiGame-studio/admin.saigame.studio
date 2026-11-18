All gacha pack functions supported by Lua scripts

---

### `game.get_gacha_pack_by_id(id)`

Fetches a `GachaPack` definition by UUID.

```lua
local pack, err = game.get_gacha_pack_by_id("e5f6a7b8-...")
if err ~= nil then error(err) end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Gacha pack UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.open_gacha_pack(pack_id [, container_id [, idempotency_key]])`

Opens a single gacha pack for the authenticated player.  
If `idempotency_key` is omitted, a random UUID is generated automatically.

```lua
local result, err = game.open_gacha_pack("e5f6a7b8-...")
if err ~= nil then error(err) end
-- result.transaction_id, result.items[], result.is_duplicate
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `pack_id` | string (UUID) | yes | Gacha pack UUID to open. |
| 2 | `container_id` | string (UUID) | no | Container instance UUID (pass `""` to skip). |
| 3 | `idempotency_key` | string | no | Deduplication key; auto-generated if empty. |

**Returns:** `(table, nil)` on success where table has `transaction_id`, `collect_destination`, `mailbox_message_id`, `is_duplicate`, `items[]`; `(nil, string)` on error.

---

### `game.get_container_def_by_id(id)`

Fetches an `ItemContainerDefinition` template by UUID.

```lua
local def, err = game.get_container_def_by_id("c9d0e1f2-...")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Container definition UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_container_by_id(id)`

Fetches a concrete `ItemContainer` instance (player-owned row) by UUID. Ownership is enforced server-side.

```lua
local container, err = game.get_container_by_id("c9d0e1f2-...")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Container instance UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

