All preset functions supported by Lua scripts

---

### `game.get_preset_def_by_id(id)`

Fetches a `PresetDefinition` (deck/party/loadout template) by UUID.

```lua
local def, err = game.get_preset_def_by_id("p1r2e3s4-...")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Preset definition UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_preset_by_id(id)`

Fetches a `Preset` instance (player-owned deck/party/loadout) by UUID.

```lua
local preset, err = game.get_preset_by_id("p5r6e7s8-...")
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | yes | Preset instance UUID. |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

---

### `game.get_preset_slots(preset_id)`

Returns all slots for a preset instance as a list of `{ inventory_item_id, slot_index }` tables.

```lua
local slots, err = game.get_preset_slots("p5r6e7s8-...")
if err ~= nil then error(err) end
for i = 1, #slots do
    game.log("slot " .. slots[i].slot_index .. " item: " .. slots[i].inventory_item_id)
end
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `preset_id` | string (UUID) | yes | Preset instance UUID. |

**Returns:** `(list-table, nil)` on success, `(nil, string)` on error.

