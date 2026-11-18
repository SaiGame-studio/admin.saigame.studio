Lua スクリプトで利用できるエンティティ関数一覧

---

### `game.get_entity_def_by_id(id)`

UUID を指定して `EntityDefinition`（敵／NPC／部屋のテンプレート）を取得します。

```lua
local entity, err = game.get_entity_def_by_id("e1n2t3i4-...")
if err ~= nil then error(err) end
output.entity_hp = entity.stats.hp
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | エンティティ定義の UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_entity_def_by_key(key)`

文字列キーを指定して `EntityDefinition` を取得します。

```lua
local entity, err = game.get_entity_def_by_key("goblin_boss")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `key` | string | はい | エンティティのキー（空文字不可）。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

--- 

### `game.entity_pool_random(pool_key)`

指定したプールから、重み付きランダム選択でエンティティを 1 つ選びます。  
`weight > 0` のエントリーのみが選択対象です。

```lua
local entity, err = game.entity_pool_random("dungeon_floor_1")
if err ~= nil then error(err) end
output.enemy_id  = entity.id
output.enemy_hp  = entity.stats.hp
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `pool_key` | string | はい | プールのキー（空文字不可）。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.entity_pool_min(pool_key, stat_key [, count])`

プール内で `stat_key` の値が **最も低い** エンティティを返します。  
`count <= 1`（既定値）の場合は単一のテーブル、`count > 1` の場合はリストを返します。  
`count` の最大値は 100 です。

```lua
-- single weakest enemy
local weakest, err = game.entity_pool_min("dungeon_floor_1", "hp")

-- three weakest enemies
local list, err = game.entity_pool_min("dungeon_floor_1", "hp", 3)
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `pool_key` | string | はい | プールのキー（空文字不可）。 |
| 2 | `stat_key` | string | はい | 比較するステータスのキー（空文字不可）。 |
| 3 | `count` | integer | いいえ | 返すエンティティ数（既定値 `1`、最大 `100`）。 |

**戻り値:** `count=1` の場合は `(table, nil)`、`count>1` の場合は `(list-table, nil)`、エラー時は `(nil, string)`。

---

### `game.entity_pool_max(pool_key, stat_key [, count])`

プール内で `stat_key` の値が **最も高い** エンティティを返します。  
`entity_pool_min` と同じ動作ですが、降順で並べ替えます。

```lua
local strongest, err = game.entity_pool_max("dungeon_floor_1", "attack")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `pool_key` | string | はい | プールのキー（空文字不可）。 |
| 2 | `stat_key` | string | はい | 比較するステータスのキー（空文字不可）。 |
| 3 | `count` | integer | いいえ | 返すエンティティ数（既定値 `1`、最大 `100`）。 |

**戻り値:** `count=1` の場合は `(table, nil)`、`count>1` の場合は `(list-table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_entity_pool_def_by_id(id)`

UUID を指定して、エントリー、重み、ステータスを含む完全な `EntityPool` 定義を取得します。

```lua
local pool, err = game.get_entity_pool_def_by_id("p0o1l2d-...")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | エンティティプールの UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_entity_pool_def_by_key(pool_key)`

プールキーを指定して完全な `EntityPool` 定義を取得します。

```lua
local pool, err = game.get_entity_pool_def_by_key("dungeon_floor_1")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `pool_key` | string | はい | プールのキー（空文字不可）。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。
