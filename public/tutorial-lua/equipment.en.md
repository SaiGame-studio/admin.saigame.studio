All equipment functions supported by Lua scripts

---

### `game.get_equipped_in_slot(slot_key)`

Returns the inventory item currently equipped in the given slot for the authenticated player.

```lua
local item, err = game.get_equipped_in_slot("weapon")
if err ~= nil then error(err) end
output.weapon_id = item.id
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `slot_key` | string | yes | Slot key string (non-empty). |

**Returns:** `(table, nil)` on success, `(nil, string)` on error.

