Lua スクリプトで利用できる装備関数一覧

---

### `game.get_equipped_in_slot(slot_key)`

認証済みプレイヤーが指定スロットに装備しているインベントリアイテムを返します。

```lua
local item, err = game.get_equipped_in_slot("weapon")
if err ~= nil then error(err) end
output.weapon_id = item.id
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `slot_key` | string | はい | 装備スロットのキー（空文字不可）。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

