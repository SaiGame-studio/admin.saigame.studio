Lua スクリプトで利用できるイベント種別関数一覧

---

### `game.get_event_type_by_id(id_or_name)`

UUID または名前の文字列で `GameEventType` を取得します。

```lua
local evt, err = game.get_event_type_by_id("player_kill")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id_or_name` | string | はい | UUID 文字列またはイベント種別名。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_event_type_by_name(name)`

名前の文字列で `GameEventType` を取得します。

```lua
local evt, err = game.get_event_type_by_name("player_kill")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `name` | string | はい | イベント種別名（空文字不可）。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

