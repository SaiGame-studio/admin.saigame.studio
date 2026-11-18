Lua スクリプトで利用できるクエスト関数一覧

---

### `game.get_quest_def_by_id(id)`

UUID を指定して `QuestDefinition` のひな形を取得します。

```lua
local quest, err = game.get_quest_def_by_id("q1w2e3r4-...")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | クエスト定義の UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

