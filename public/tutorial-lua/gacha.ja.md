Lua スクリプトで利用できるガチャパック関数一覧

---

### `game.get_gacha_pack_by_id(id)`

UUID を指定して `GachaPack` 定義を取得します。

```lua
local pack, err = game.get_gacha_pack_by_id("e5f6a7b8-...")
if err ~= nil then error(err) end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | ガチャパックの UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.open_gacha_pack(pack_id [, container_id [, idempotency_key]])`

認証済みプレイヤーのガチャパックを 1 つ開封します。  
`idempotency_key` を省略すると、ランダムな UUID を自動生成します。

```lua
local result, err = game.open_gacha_pack("e5f6a7b8-...")
if err ~= nil then error(err) end
-- result.transaction_id, result.items[], result.is_duplicate
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `pack_id` | string (UUID) | はい | 開封するガチャパックの UUID。 |
| 2 | `container_id` | string (UUID) | いいえ | コンテナインスタンスの UUID（省略する場合は `""`）。 |
| 3 | `idempotency_key` | string | いいえ | 重複処理を防ぐキー。空の場合は自動生成します。 |

**戻り値:** 成功時は `transaction_id`、`collect_destination`、`mailbox_message_id`、`is_duplicate`、`items[]` を含む `(table, nil)`。エラー時は `(nil, string)`。

---

### `game.get_container_def_by_id(id)`

UUID を指定して `ItemContainerDefinition` テンプレートを取得します。

```lua
local def, err = game.get_container_def_by_id("c9d0e1f2-...")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | コンテナ定義の UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_container_by_id(id)`

UUID を指定して、具体的な `ItemContainer` インスタンス（プレイヤー所有のレコード）を取得します。所有権はサーバー側で検証されます。

```lua
local container, err = game.get_container_by_id("c9d0e1f2-...")
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | コンテナインスタンスの UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

