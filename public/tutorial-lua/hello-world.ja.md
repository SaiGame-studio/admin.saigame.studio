Sai Server で最初の **サーバーサイド Lua スクリプト** を書いて実行し、Unity から呼び出します。Lua スクリプトはゲームのルールをサーバー上で実行するため、プレイヤーが改変できません。各スクリプトはクライアントから `payload` を受け取り、`output` を返します。

**このガイドで行うこと：**
- Web エディターで Lua スクリプトを作成する
- Hello World サンプルを読み込み、テスト用ペイロードで実行する
- `BattleScript` で同じスクリプトを Unity から実行する
- `LuaScriptManager` で Unity からスクリプトファイルを管理する

## 事前準備

- Sai Server のゲーム（[Studio の作成](/tutorials/guides/create-a-studio)を参照）
- Unity 部分：接続済みの Unity プロジェクトとログイン中のプレイヤー（[Unity Package のインポート](/tutorials/guides/import-unity-package)を参照）

各ゲームにはデフォルトで **7 つのスクリプト枠** があります。使用数は **Scripts** ページ上部のカウンターで確認できます。プラグインで上限を増やせます。

![スロット使用数カウンター付きの Scripts ページ](/tutorial-lua/hello-world/step-00.png)

## ステップ 1：スクリプトを作成する

1. ゲームのダッシュボードで **Scripts** を開き、**New Script** をクリックします。
2. `hello_world` などの名前を入力します。名前は英字で始まり、小文字、数字、アンダースコアのみ使えます。これはゲームクライアントがスクリプトを実行する際の **トリガーキー** です。

![新しい Lua スクリプトを作成](/tutorial-lua/hello-world/step-01.png)

3. スクリプト一覧の **Edit**（鉛筆）アイコンをクリックして、Web の Lua エディターを開きます。

![Lua エディターを開く](/tutorial-lua/hello-world/step-02.png)

> **注意：** **Active** スイッチはオンのままにしてください。無効なスクリプトは実行できません。

## ステップ 2：Hello World サンプルを読み込む

エディターは 2 つの部分に分かれています。
- **Script Body** – コードを書く場所です。入力中に構文エラーがハイライトされ、サイズバーで **250 KB** の上限に対する使用量がわかります。
- **Sample Scripts** – 右側にあります。**Core** タブを開き、`#1 tut_hello_output` を選択します。**Replace / Append** スイッチで、サンプルがコードを置き換えるか末尾に追加されるかを選べます。

![tut_hello_output を含む Sample Scripts](/tutorial-lua/hello-world/step-03.png)

変更のたびに **Ctrl+S** を押すか、**Save** アイコンをクリックしてください。

サンプルの内容：

```lua
-- 'payload' is the input table sent by the client.
local player_name = payload.player_name or "stranger"

-- 'output' is returned to the client.
output.greeting  = "Hello, " .. player_name .. "!"
output.processed = true

-- game.log() writes to the script log.
game.log("tut_hello_output ran for: " .. player_name)
```

## ステップ 3：エディターでスクリプトを実行する

1. **Run Script** までスクロールします。
2. **Run** ボタン横のバッジを確認します。スクリプトは自分のアカウントとして実行されるため、このゲームのプレイヤープロフィールが必要です。バッジが **No profile** なら **Create profile** をクリックします。バッジが **Profile ready** になると **Run** が有効になります。

![実行前にプレイヤープロフィールを作成](/tutorial-lua/hello-world/step-04-profile.png)

3. 次のペイロードを入力して **Run** をクリックします。

```json
{
  "payload": {
    "player_name": "Alice"
  }
}
```

**期待される結果：** **Run Result** に `"greeting": "Hello, Alice!"` と `"processed": true`、実行時間（ミリ秒）が表示されます。`player_name` を削除して再実行すると `"Hello, stranger!"` になります。

![Hello World スクリプトの Run Result](/tutorial-lua/hello-world/step-04.png)

> **ヒント：** ペイロードエディター内で **Ctrl+S** を押す（または **Save** アイコンをクリックする）と、次回のためにペイロードが保存されます。

## ステップ 4：Unity からスクリプトを実行する

1. **Play モード** に入り、ログインします。
2. `SaiServer` オブジェクト上の `BattleScript` コンポーネントを選択します。
3. **Script Name** に `hello_world` を設定し、同じリクエストボディを貼り付けます。
4. **Run Script** をクリックします。

**期待される結果：** **JSON Response** が Web エディターと一致し、`output`、`logs`、`duration_ms` を含みます。

![Unity から Lua スクリプトを実行](/tutorial-lua/hello-world/step-05.png)

コードから：

```csharp
using SaiGame.Services;
using UnityEngine;

public class HelloLua : MonoBehaviour
{
    public void Run()
    {
        SaiServer.Instance.BattleScript.RunScript(
            "hello_world",
            "{\"payload\":{\"player_name\":\"Alice\"}}",
            json => Debug.Log(json),
            error => Debug.LogError(error));
    }
}
```

## ステップ 5（任意）：Unity からスクリプトを管理する

`LuaScriptManager` コンポーネントはスクリプトを `Assets/SaiGame/LuaScript/Scripts` に `.lua` ファイルとして保存するため、コードエディターで編集し、バージョン管理できます。

- **Load Scripts** – サーバー上のスクリプトを一覧表示し、ローカルファイルと照合
- **Download** – サーバーのスクリプトをローカルファイルに保存
- **Upload New** – ローカルファイルからサーバーにスクリプトを作成
- **Update** – ローカルファイルを既存のサーバースクリプトに反映
- **Create BattleStart script**、**Create BattleEnd script**、**Create Custom script** – 新しいスクリプトファイルを作成。ファイル名は同じ規則 `^[a-z][a-z0-9_]*$` に従います。

## Lua ランタイムの制限

| 制限 | 値 |
|---|---|
| 実行時間 | 1 回あたり 500 ms |
| スクリプトサイズ | 250 KB |
| ゲームあたりのスクリプト数 | デフォルト 7（プラグインで追加可能） |

500 ms を超えたスクリプトは停止されます。すべてのランタイム制限と利用可能な関数は [Lua API の概要](/tutorials/lua-guides/overview)を参照してください。

## よくある問題

- **Script not found。** Unity で指定する名前はスクリプト名と完全に一致する必要があります。
- **Script is inactive。** **Active** スイッチをオンに戻してください。
- **Run が無効。** バッジが **No profile** です。**Create profile** をクリックしてください。
- **output が空。** リクエストボディに `payload` オブジェクトがあり、実行前にスクリプトを保存したか確認してください。
- **スクリプトが停止される。** 500 ms を超えました。重い処理をループの外に出すか、複数回の呼び出しに分けてください。

## FAQ

### なぜゲームロジックをサーバー上の Lua で実行するのですか？
ルールをサーバーが実行するため、プレイヤーはクライアントを改変して報酬、ダメージ、ドロップ率を変えられません。

### 1 つのゲームで Lua スクリプトはいくつ作れますか？
デフォルトで 7 つです。プラグインで追加できます。

### Lua スクリプトでプレイヤーにアイテムを付与できますか？
はい。`grant_item` や `deduct_item` などのインベントリ関数を使います。[Lua インベントリ関数](/tutorials/lua-guides/inventory)を参照してください。

## 次のステップ

- [Enemy Definition](/tutorials/lua-guides/enemy-definition)
- [Execute Script](/tutorials/lua-guides/execute-script)
