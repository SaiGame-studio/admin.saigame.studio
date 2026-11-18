## **Limits**
| Constraint | Value |
|---|---|
| Max execution time | 500 ms |
| Max call-stack depth | 200 frames |
| Max script body size | 32 KB |
| Max `output` keys | 64 |
| Max `game.log` lines | 100 |
| Max scripts per game | 200 |

---

## Global Variables

These are injected automatically before the script runs.

| Name | Type | Description |
|---|---|---|
| `payload` | table | Arbitrary JSON sent by the caller via `POST .../run`. Read-only by convention. |
| `ctx` | table | Execution context. Always contains `player_id`, `game_id`, `studio_id`, `timestamp` (Unix seconds). May contain extra server-injected keys such as `ctx.pack`. |
| `output` | table | The script writes results here. All keys are returned to the caller. Maximum 64 keys. |

### `ctx` fields

| Field | Type | Description |
|---|---|---|
| `ctx.player_id` | string | UUID of the authenticated player. |
| `ctx.game_id` | string | UUID of the current game. |
| `ctx.studio_id` | string | UUID of the current studio. |
| `ctx.timestamp` | number | Server-side Unix timestamp (seconds) at execution start. |

---

## Standard Libraries Available

| Library | Included functions |
|---|---|
| `base` | `print`, `pairs`, `ipairs`, `type`, `tostring`, `tonumber`, `unpack`, `select`, `pcall`, `xpcall`, `error`, `assert`, `rawget`, `rawset`, `rawequal`, `next`, `setmetatable`, `getmetatable` |
| `table` | `table.insert`, `table.remove`, `table.concat`, `table.sort`, `table.unpack` |
| `string` | `string.format`, `string.sub`, `string.len`, `string.upper`, `string.lower`, `string.rep`, `string.reverse`, `string.byte`, `string.char`, `string.find`, `string.match`, `string.gmatch`, `string.gsub` |
| `math` | `math.abs`, `math.ceil`, `math.floor`, `math.sqrt`, `math.random`, `math.randomseed`, `math.max`, `math.min`, `math.huge`, `math.pi`, etc. |

---

### `game.log(msg)`

Appends a message to the script execution log (captured and returned in `ScriptRunResult.logs`).  
`print(msg)` is an alias for this function.

```lua
game.log("damage dealt: " .. damage)
print("player hp: " .. hp)  -- same effect
```

**Parameters**

| # | Name | Type | Required | Description |
|---|---|---|---|---|
| 1 | `msg` | string | yes | Message to log. |

**Returns:** nothing

