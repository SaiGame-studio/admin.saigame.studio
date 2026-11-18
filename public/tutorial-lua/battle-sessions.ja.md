Lua スクリプトで利用できる戦闘関数一覧

--- 

### `game.battle_session_create(state)`

新しい戦闘セッション（状態 = `active`）を作成し、初期状態を Redis に保存します（TTL は 30 分）。  
プレイヤーに既存のアクティブなセッションがある場合はエラーを返します。

```lua
local session_id, err = game.battle_session_create({
    round = 1,
    player_hp = 100,
    enemy_hp  = 80
})
if err ~= nil then error(err) end
output.session_id = session_id
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `state` | table | はい | 戦闘の初期状態（任意のキーと値）。 |

**戻り値:** 成功時は `(session_id_string, nil)`、エラー時は `(nil, string)`。

---

### `game.battle_session_get(session_id)`

Redis から現在の戦闘状態を読み取ります。

```lua
local state, err = game.battle_session_get(session_id)
if err ~= nil then error(err) end
output.round = state.round
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | はい | 戦闘セッションの UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.battle_session_update(session_id, state)`

Redis の戦闘状態を上書きします（TTL を 30 分にリセットします）。

```lua
state.round     = state.round + 1
state.enemy_hp  = state.enemy_hp - damage
local err = game.battle_session_update(session_id, state)
if err ~= nil then output.error = err end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | はい | 戦闘セッションの UUID。 |
| 2 | `state` | table | はい | 書き込む新しい状態（以前の状態を置き換えます）。 |

**戻り値:** 成功時は `nil`、失敗時はエラーを表す `string`。

---

### `game.battle_session_end(session_id [, end_data])`

PostgreSQL でセッションを `ended` に変更し、`end_data` を保存して Redis キーを削除します。

```lua
local err = game.battle_session_end(session_id, {
    winner   = "player",
    exp_gain = 150
})
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | はい | 戦闘セッションの UUID。 |
| 2 | `end_data` | table | いいえ | セッションレコードに保存する結果データ。既定値は `{}`。 |

**戻り値:** 成功時は `nil`、失敗時はエラーを表す `string`。

---

### `game.battle_session_flee(session_id)`

PostgreSQL でセッションを `fled` に変更し、Redis キーを削除します。

```lua
local err = game.battle_session_flee(session_id)
if err ~= nil then output.error = err end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | はい | 戦闘セッションの UUID。 |

**戻り値:** 成功時は `nil`、失敗時はエラーを表す `string`。

---

### `game.open_entity_drop_packs(session_id, entity_def_id, pack_ids)`

戦闘セッションで倒した敵に指定されている、すべてのガチャドロップパックを開封します。  
1 回の呼び出しにつきパック ID は最大 7 件です。

```lua
local results, err = game.open_entity_drop_packs(session_id, entity.id, {
    "pack-uuid-1",
    "pack-uuid-2"
})
if err ~= nil then error(err) end
for i = 1, #results do
    game.log("pack " .. results[i].pack_name .. " success=" .. tostring(results[i].success))
end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `session_id` | string (UUID) | はい | アクティブな戦闘セッションの UUID。 |
| 2 | `entity_def_id` | string (UUID) | はい | 倒したエンティティの定義 UUID。 |
| 3 | `pack_ids` | table（UUID 文字列の配列） | はい | 開封するガチャパックの UUID リスト。最大 7 件。 |

**戻り値:** 成功時は `(list-table, nil)`。各要素は `{ pack_id, pack_name, success, error }`。エラー時は `(nil, string)`。

