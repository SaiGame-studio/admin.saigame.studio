**Gamer Progress** を使って、ログイン済みのユーザーをゲームのプレイヤーにします。Gamer Progress は Sai Server がプレイヤーごとに保持するゲーム単位のセーブ記録で、レベル、経験値、ゴールド、独自の JSON ゲームデータを含みます。一度作成し、プレイヤーがゲームを開くたびに読み込みます。

**このガイドで行うこと：**
- ログイン中のユーザーの Gamer Progress を作成する
- Get Progress で読み込む
- Gamer Profile と Gamer Progress の違いを理解する

## 事前準備

- Sai Server に接続済みで、`SaiAuth` または Google でユーザーがログインしている Unity プロジェクト（[Unity Package のインポート](/tutorials/guides/import-unity-package)を参照）

スタジオやゲームの作成に使うアカウントでも、ゲームにログインしてプレイできます。テストプレイヤーとして便利です。

## ステップ 1：Gamer Progress を作成する

1. ログインし、`SaiServer` オブジェクト上の `GamerProgress` コンポーネントを選択します。
2. **Create Progress** をクリックします。

**期待される結果：** アカウントがまだこのゲームのプレイヤーでなければ、Console に成功メッセージが表示され、コンポーネントに新しい進行データが表示されます。

![Unity で Gamer Progress を作成](/tutorial-guides/create-gamer-progress/step-01.png)

## ステップ 2：Gamer Progress を読み込む

**Get Progress** をクリックして、プレイヤーの保存データをゲームに読み込みます。

![Unity で Gamer Progress を取得](/tutorial-guides/create-gamer-progress/step-02.png)

コードでは、ログイン後に進行データを読み込み、新規プレイヤーなら作成します。

```csharp
using SaiGame.Services;
using UnityEngine;

public class LoadPlayerSave : MonoBehaviour
{
    public void LoadOrCreate()
    {
        GamerProgress progress = SaiServer.Instance.GamerProgress;
        progress.GetProgress(
            data => Debug.Log($"Level {data.level}, XP {data.experience}, Gold {data.gold}"),
            error => progress.CreateProgress(
                data => Debug.Log("New player created"),
                createError => Debug.LogError(createError)));
    }
}
```

読み込んだデータは `GamerProgress.CurrentProgress` で参照できます。更新する前に必ず読み込みまたは作成を行ってください。

## ステップ 3（任意）：Gamer Progress を消去する

**Clear Progress** は、このゲームにおける現在のプレイヤーの進行データを削除します。

> **警告：** この操作はプレイヤーのゲームデータを完全に削除し、元に戻せません。テスト時のみ使用してください。

![Gamer Progress を消去](/tutorial-guides/create-gamer-progress/step-03.png)

## Gamer Progress に保存されるデータ

| フィールド | 説明 |
|---|---|
| `level` | 経験値からサーバーが計算：`floor(sqrt(experience / 100))`、最小 1 |
| `experience` | 累計経験値。サーバー側のデルタで更新 |
| `gold` | ゴールド残高。サーバー側のデルタで更新され、0 未満にはならない |
| `game_data` | 独自の JSON セーブデータ（[クロスプラットフォームのクラウドセーブ](/tutorials/guides/cross-platform-save)を参照） |
| `version` | 進行データを更新するたびに増加 |

## Gamer Profile と Gamer Progress

- **Gamer Profile** – ユーザーが初めて何らかのゲームに参加したときに自動作成されます。ユーザーごとにグローバルな Gamer Profile は **1 つ** だけです。
- **Gamer Progress** – **ゲームごと** に 1 件。ユーザーは複数のゲームで Gamer Progress を持てます。

![Gamer Profile は自動で作成される](/tutorial-guides/create-gamer-progress/step-04.png)

プレイヤーの進行データを確認するには、ゲームのダッシュボードで **Players** を開き、プレイヤーを選択します。

![ダッシュボードでプレイヤーの Gamer Progress を探す](/tutorial-guides/create-gamer-progress/step-05.png)

## よくある問題

- **新規プレイヤーで Get Progress が失敗する。** このゲームにまだ進行データがありません。先に **Create Progress** を呼んでください。
- **Update Progress で先にデータを読み込むよう求められる。** `UpdateProgress` の前に `CreateProgress` または `GetProgress` を成功させてください。
- **「You are banned from this game」。** ダッシュボードでプレイヤーの進行データが BAN されており、更新できません。

## FAQ

### ユーザーはいつゲームのプレイヤーになりますか？
そのゲームでユーザーの Gamer Progress が作成されたときです。ログインだけではプレイヤーになりません。

### プレイヤーのレベルはどう計算されますか？
経験値から `floor(sqrt(experience / 100))` でサーバーが計算します。最小レベルは 1 です。

### 1 つのアカウントで複数のゲームを遊べますか？
はい。1 つのアカウントには Gamer Profile が 1 つあり、ゲームごとに別々の Gamer Progress を持ちます。

## 次のステップ

- [クロスプラットフォームのクラウドセーブ](/tutorials/guides/cross-platform-save)
- [プレイヤーにアイテムを送る](/tutorials/guides/5b-send-an-item-to-a-player)
