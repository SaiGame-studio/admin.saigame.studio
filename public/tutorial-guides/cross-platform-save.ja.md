Sai Server Unity SDK でプレイヤーの進行データをクラウドに保存し、どの端末でも読み込めるようにします。経験値とゴールドはサーバー側のデルタで更新され、独自のセーブデータは **Game Data** に JSON として保存されます。同じアカウントでログインすれば、Android、iOS、PC のどれでも続きからプレイできます。

> **⚠️ Gamer Progress にはチート対策がありません。** 主に、オフラインゲームなどでセーブデータをクラウドにバックアップしたいゲーム向けの機能です。

**このガイドで行うこと：**
- デルタ更新で経験値とゴールドを加算する
- ゲームの状態を JSON で保存・読み込みする
- 2 台目の端末で同じセーブを読み込む
- クラウドセーブの制限を理解する

## 事前準備

- プレイヤーがログインしており、ゲームに Gamer Progress があること（[Create Gamer Progress](/tutorials/guides/create-gamer-progress)を参照）
- このセッションで **Create Progress** または **Get Progress** により進行データが読み込まれていること。読み込み前の更新は拒否されます。

## ステップ 1：デルタで経験値とゴールドを更新する

デルタ更新は値を上書きせず、サーバー上の現在値に加算します。2 つのセッションが同時にゴールドを加算しても、両方が反映されます。

1. `GamerProgress` コンポーネントの **Update Delta Values** セクションに数値を入力します。
2. **Update Progress (+XP, +Gold)** をクリックします。

![GamerProgress コンポーネントの Update Delta Values](/tutorial-guides/cross-platform-save/step-01.png)

```csharp
// Add 150 XP and spend 20 gold. The current Game Data is kept.
SaiServer.Instance.GamerProgress.UpdateProgress(150, -20, null,
    data => Debug.Log($"Level {data.level}, Gold {data.gold}"),
    error => Debug.LogError(error));
```

サーバーがチェックするルール：
- **経験値のデルタ：** 0〜1,000,000。経験値は減らせません。
- **ゴールドのデルタ：** -1,000,000〜1,000,000。ゴールドは 0 未満にならず、残高を超える減算は 0 で止まります。
- 更新のたびに経験値から **レベル** が再計算されます。

## ステップ 2：ゲームの状態を JSON で保存する

**Game Data** はスキーマのない JSON フィールドです。チェックポイント、設定、完了したチュートリアルなど、必要な構造を自由に保存できます。

```json
{
  "last_checkpoint": "dungeon_level_07",
  "inventory": {
    "potions": 5,
    "equipped_weapon": "iron_sword_plus_1"
  },
  "tutorials_completed": ["movement", "combat_basics"],
  "settings": {
    "difficulty": "hard",
    "invert_y": false
  }
}
```

インスペクターでは Game Data 欄に JSON を貼り付け（**Beautify JSON** で整形できます）、**Update Progress** をクリックします。コードでは JSON 文字列を 3 番目の引数に渡します。

```csharp
string saveJson = JsonUtility.ToJson(mySaveState);
SaiServer.Instance.GamerProgress.UpdateProgress(0, 0, saveJson,
    data => Debug.Log("Saved to the cloud"),
    error => Debug.LogError(error));
```

![Gamer Progress に保存された JSON Game Data](/tutorial-guides/cross-platform-save/step-02.png)

## ステップ 3：別の端末でセーブを読み込む

1. 2 台目の端末で **同じアカウント** でログインします。
2. **Get Progress** を呼び出します。
3. `GamerProgress.GetGameData()` でセーブを読み取り、ゲームの状態を復元します。

```csharp
SaiServer.Instance.GamerProgress.GetProgress(
    data =>
    {
        string json = SaiServer.Instance.GamerProgress.GetGameData();
        MySaveState state = JsonUtility.FromJson<MySaveState>(json);
        // Apply the state to your game.
    },
    error => Debug.LogError(error));
```

**期待される結果：** 2 台目の端末に、1 台目と同じレベル、経験値、ゴールド、Game Data が表示されます。

## 競合の扱い

- **経験値とゴールド** は楽観的ロック付きのデルタで更新されます。同時に 2 つの更新が起きるとサーバーが自動で再試行し、それでも適用できない場合は **409**「concurrent update conflict, please retry」を返します。
- **Game Data** は保存のたびに丸ごと置き換えられ、最後の保存が優先されます。Sai Server は異なる 2 つの JSON をマージしません。プレイヤーが 2 台で同時にプレイする可能性がある場合は、保存前に最新の進行データを読み込むか、重要な値を経験値、ゴールド、アイテムで管理してください。
- SDK に **オフライン同期はありません**。オンライン時に保存し、失敗した保存はゲーム側で再試行してください。

## 制限

| 制限 | 値 |
|---|---|
| Game Data のサイズ | シリアライズ後の JSON で 2.5 MiB |
| 1 回あたりの経験値デルタ | 0〜1,000,000 |
| 1 回あたりのゴールドデルタ | -1,000,000〜1,000,000 |

2.5 MiB を超えるセーブは **413** とメッセージコード `GAME_DATA_TOO_LARGE` で失敗します。

## よくある問題

- **「invalid experience delta」。** 経験値のデルタが負の値か、1,000,000 を超えています。
- **413 `GAME_DATA_TOO_LARGE`。** セーブサイズを減らしてください。大きなコンテンツや共有データは別の場所に置き、Game Data には状態だけを保存します。
- **409 concurrent update conflict。** 更新を再試行してください。
- **2 台目の端末に古いデータが表示される。** ログイン後に **Get Progress** を呼んでください。SDK は他の端末へ変更をプッシュしません。

## FAQ

### Android、iOS、PC で同じセーブを続けられますか？
はい。進行データは端末ではなく、アカウントとゲームに紐づきます。同じアカウントでログインし、Get Progress を呼んでください。

### クラウドセーブは端末間でマージされますか？
いいえ。経験値とゴールドの変更はサーバーで加算されますが、Game Data は最新の保存で置き換えられます。

### クラウドセーブの最大サイズは？
プレイヤー 1 人・ゲーム 1 つあたり、シリアライズ後の JSON で最大 2.5 MiB です。

## 次のステップ

- [What is Item Definition?](/tutorials/guides/what-is-item-definition)
- [Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
