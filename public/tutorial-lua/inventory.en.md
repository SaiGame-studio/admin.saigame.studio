All inventory functions supported by Lua scripts

---

### `game.grant_item(item_def_id, amount)`

Grants `amount` units of an item to the current player.

```lua
local err = game.grant_item("d2b4e1a0-...", 5)
if err ~= nil then
    output.error = err
end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `item_def_id` | string (UUID) | yes | `ItemDefinition` ID to grant. |
| 2 | `amount` | integer | yes | Number of units to grant. Must be > 0. |

**Returns:** `nil` on success, `string` error message on failure.

---

### `game.deduct_item(item_def_id, amount)`

Deducts `amount` units of an item from the current player's inventory.

```lua
local err = game.deduct_item("d2b4e1a0-...", 1)
if err ~= nil then
    output.error = err
end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `item_def_id` | string (UUID) | yes | `ItemDefinition` ID to deduct. |
| 2 | `amount` | integer | yes | Number of units to deduct. Must be > 0. |

**Returns:** `nil` on success, `string` error message on failure.

---

### `game.get_item_def_by_id(id)`

Fetches an `ItemDefinition` template (catalogue entry) by UUID.

```lua
local def, err = game.get_item_def_by_id("d2b4e1a0-...")
if err ~= nil then error(err) end
output.item_name = def.name
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | `ItemDefinition` UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_item_def_by_code(code)`

Fetches an `ItemDefinition` template by its string code.

```lua
local def, err = game.get_item_def_by_code("sword_iron")
if err ~= nil then error(err) end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `code` | string | yes | Item code (non-empty). |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_item_instance_by_id(id)`

Fetches a concrete `InventoryItem` instance (player-owned row) by UUID.

```lua
local item, err = game.get_item_instance_by_id("a1b2c3d4-...")
if err ~= nil then error(err) end
output.item_quantity = item.quantity
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Inventory item instance UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.update_item_private_properties(item_id, version, props)`

Merges `props` into the `private_properties` JSONB field of an inventory item and increments its version.  
The `"level"` key is reserved and must not appear in `props`.

```lua
local err = game.update_item_private_properties(item.id, item.version, {
    enchant_level = 3,
    durability    = 80
})
if err ~= nil then output.error = err end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `item_id` | string (UUID) | yes | Inventory item UUID. |
| 2 | `version` | integer | yes | Current version for optimistic concurrency. |
| 3 | `props` | table | yes | Key/value pairs to merge into private properties. |

**Returns:** `nil` on success, `string` error message on failure.

