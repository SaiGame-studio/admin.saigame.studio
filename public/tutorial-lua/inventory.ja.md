Lua スクリプトで利用できるインベントリ関数一覧

---

### `game.grant_item(item_def_id, amount)`

現在のプレイヤーにアイテムを `amount` 個付与します。

```lua
local err = game.grant_item("d2b4e1a0-...", 5)
if err ~= nil then
    output.error = err
end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `item_def_id` | string (UUID) | はい | 付与する `ItemDefinition` の ID。 |
| 2 | `amount` | integer | はい | 付与する個数。0 より大きい必要があります。 |

**戻り値:** 成功時は `nil`、失敗時はエラーメッセージの `string`。

---

### `game.deduct_item(item_def_id, amount)`

現在のプレイヤーのインベントリからアイテムを `amount` 個差し引きます。

```lua
local err = game.deduct_item("d2b4e1a0-...", 1)
if err ~= nil then
    output.error = err
end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `item_def_id` | string (UUID) | はい | 差し引く `ItemDefinition` の ID。 |
| 2 | `amount` | integer | はい | 差し引く個数。0 より大きい必要があります。 |

**戻り値:** 成功時は `nil`、失敗時はエラーメッセージの `string`。

---

### `game.get_item_def_by_id(id)`

UUID を指定して `ItemDefinition` テンプレート（カタログ項目）を取得します。

```lua
local def, err = game.get_item_def_by_id("d2b4e1a0-...")
if err ~= nil then error(err) end
output.item_name = def.name
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | `ItemDefinition` の UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_item_def_by_code(code)`

文字列コードを指定して `ItemDefinition` テンプレートを取得します。

```lua
local def, err = game.get_item_def_by_code("sword_iron")
if err ~= nil then error(err) end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `code` | string | はい | アイテムコード（空文字不可）。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.get_item_instance_by_id(id)`

UUID を指定して、具体的な `InventoryItem` インスタンス（プレイヤー所有のレコード）を取得します。

```lua
local item, err = game.get_item_instance_by_id("a1b2c3d4-...")
if err ~= nil then error(err) end
output.item_quantity = item.quantity
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `id` | string (UUID) | はい | インベントリアイテムインスタンスの UUID。 |

**戻り値:** 成功時は `(table, nil)`、エラー時は `(nil, string)`。

---

### `game.update_item_private_properties(item_id, version, props)`

インベントリアイテムの JSONB フィールド `private_properties` に `props` をマージし、バージョンを増やします。  
`"level"` キーは予約されており、`props` に含めることはできません。

```lua
local err = game.update_item_private_properties(item.id, item.version, {
    enchant_level = 3,
    durability    = 80
})
if err ~= nil then output.error = err end
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `item_id` | string (UUID) | はい | インベントリアイテムの UUID。 |
| 2 | `version` | integer | はい | 楽観的並行制御に使用する現在のバージョン。 |
| 3 | `props` | table | はい | プライベートプロパティにマージするキーと値の組。 |

**戻り値:** 成功時は `nil`、失敗時はエラーメッセージの `string`。

