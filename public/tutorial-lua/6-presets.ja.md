Lua スクリプトで利用できるプリセット関数一覧

---

### `game.get_preset_def_by_id(id)`

UUID を指定して `PresetDefinition`（デッキ／パーティー／装備構成のテンプレート）を取得します。

```lua
local def, err = game.get_preset_def_by_id("p1r2e3s4-...")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | プリセット定義の UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_preset_by_id(id)`

UUID を指定して `Preset` インスタンス（プレイヤー所有のデッキ／パーティー／装備構成）を取得します。

```lua
local preset, err = game.get_preset_by_id("p5r6e7s8-...")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | プリセットインスタンスの UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_preset_slots(preset_id)`

プリセットインスタンスの全スロットを、`{ inventory_item_id, slot_index }` テーブルのリストとして返します。

```lua
local slots, err = game.get_preset_slots("p5r6e7s8-...")
if err ~= nil then error(err) end
for i = 1, #slots do
    game.log("slot " .. slots[i].slot_index .. " item: " .. slots[i].inventory_item_id)
end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `preset_id` | string (UUID) | はい | プリセットインスタンスの UUID。 |

**戻り値:** 成功時は `(list-table, nil)`、エラー時は `(nil, string)`。

