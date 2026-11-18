## **制限**
| 制限項目 | 値 |
|---|---|
| 最大実行時間 | 500 ms |
| コールスタックの最大深度 | 200 フレーム |
| スクリプト本体の最大サイズ | 32 KB |
| `output` の最大キー数 | 64 |
| `game.log` の最大行数 | 100 |
| ゲームごとの最大スクリプト数 | 200 |

---

## グローバル変数

これらの変数はスクリプト実行前に自動で注入されます。

| 名前 | 型 | 説明 |
|---|---|---|
| `payload` | table | 呼び出し元が `POST .../run` で送信する任意の JSON。慣例として読み取り専用です。 |
| `ctx` | table | 実行コンテキスト。常に `player_id`、`game_id`、`studio_id`、`timestamp`（Unix 秒）を含みます。`ctx.pack` など、サーバーが追加するキーを含む場合もあります。 |
| `output` | table | スクリプトが結果を書き込むテーブル。すべてのキーを呼び出し元へ返します。最大 64 キーです。 |

### `ctx` のフィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `ctx.player_id` | string | 認証済みプレイヤーの UUID。 |
| `ctx.game_id` | string | 現在のゲームの UUID。 |
| `ctx.studio_id` | string | 現在のスタジオの UUID。 |
| `ctx.timestamp` | number | 実行開始時のサーバー側 Unix タイムスタンプ（秒）。 |

---

## 利用可能な標準ライブラリ

| ライブラリ | 利用できる関数 |
|---|---|
| `base` | `print`, `pairs`, `ipairs`, `type`, `tostring`, `tonumber`, `unpack`, `select`, `pcall`, `xpcall`, `error`, `assert`, `rawget`, `rawset`, `rawequal`, `next`, `setmetatable`, `getmetatable` |
| `table` | `table.insert`, `table.remove`, `table.concat`, `table.sort`, `table.unpack` |
| `string` | `string.format`, `string.sub`, `string.len`, `string.upper`, `string.lower`, `string.rep`, `string.reverse`, `string.byte`, `string.char`, `string.find`, `string.match`, `string.gmatch`, `string.gsub` |
| `math` | `math.abs`, `math.ceil`, `math.floor`, `math.sqrt`, `math.random`, `math.randomseed`, `math.max`, `math.min`, `math.huge`, `math.pi` など |

---

### `game.log(msg)`

スクリプト実行ログにメッセージを追加します（ログは収集され、`ScriptRunResult.logs` に返されます）。  
`print(msg)` はこの関数の別名です。

```lua
game.log("damage dealt: " .. damage)
print("player hp: " .. hp)  -- same effect
```

**パラメーター**

| # | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| 1 | `msg` | string | はい | ログに記録するメッセージ。 |

**戻り値:** なし

