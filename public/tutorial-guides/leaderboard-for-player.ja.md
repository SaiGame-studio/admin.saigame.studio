Sai Server の `Leaderboard` コンポーネントで、Unity ゲームにリーダーボードを表示します。ゲームのボード一覧、上位プレイヤー、現在のプレイヤーの順位を取得できます。スコアはサーバーが記録するため、プレイヤーがクライアントから不正なスコアを送ることはできません。

**このガイドで行うこと：**
- ゲームのすべてのリーダーボードを一覧表示する
- ボードの上位 N 人を読み込む
- ログイン中のプレイヤーの順位とスコアを表示する

## 事前準備

- ゲームに作成済みのリーダーボードが 1 つ以上あること（[Leaderboard](/tutorials/guides/15a-leaderboard)を参照）。リーダーボードにはゲームの **Rare** サブスクリプションが必要です。
- Unity でログイン済みのプレイヤー

## スコアがリーダーボードに反映される仕組み

ゲームクライアントはスコアを送信しません。ボードの **スコアソース** が何を数えるかを決めます。

- `gacha_pack_open_count` – 選択したガチャパックを開くたびに +1
- `item_collected_count` – 選択したアイテムを受け取るたびに +数量（インベントリへの付与またはメールボックスからの受け取り）

サーバーがこれらのイベントを記録し、バックグラウンドワーカーがボードに加算します。新しいスコアが表示されるまで少し時間がかかることがあります。

## ステップ 1：リーダーボードを一覧表示する

1. **Play モード** に入り、ログインします。
2. `SaiServer` オブジェクト上の `Leaderboard` コンポーネントを選択します。
3. **List Boards** をクリックします。

**期待される結果：** **Board List** に、無効なものも含めたゲームのすべてのリーダーボードが、キー、スコアモード、スコアソースとともに表示されます。

![Unity インスペクターでリーダーボードを一覧表示](/tutorial-guides/leaderboard-for-player/step-01.png)

ボードの **Get Board** で詳細を再読み込みできます。**Clear Boards** は読み込んだ一覧を消去します。

## ステップ 2：上位プレイヤーを読み込む

1. ボードの下で **Top N** に取得したい人数を設定します。
2. **Get Top N** をクリックします。

サーバーはデフォルトで **100** 人、最大 **500** 人を返します。それより大きい値は 500 に丸められます。

![リーダーボードの上位プレイヤーを取得](/tutorial-guides/leaderboard-for-player/step-02.png)

## ステップ 3：プレイヤーの順位を表示する

ボードの下の **My Rank** をクリックすると、ログイン中のプレイヤーの順位、スコア、現在のシーズンを読み込みます。

![My Rank でプレイヤーの順位とスコアを表示](/tutorial-guides/leaderboard-for-player/step-03.png)

## コードからリーダーボードを使う

```csharp
using SaiGame.Services;
using UnityEngine;

public class LeaderboardPanel : MonoBehaviour
{
    [SerializeField] private string boardKey = "weekly_chest";

    public void Refresh()
    {
        Leaderboard leaderboard = SaiServer.Instance.Leaderboard;
        leaderboard.ListBoards(boards =>
        {
            LeaderboardBoard board = leaderboard.GetBoardByKey(boardKey);
            if (board == null) return;

            leaderboard.GetTopRankings(board.id, 10, top =>
            {
                foreach (LeaderboardRankingEntry entry in top.entries)
                    Debug.Log($"#{entry.rank} {entry.user_id} {entry.score}");
            }, e => Debug.LogError(e));

            leaderboard.GetLocalRanking(board.id,
                me => Debug.Log($"My rank: #{me.rank} ({me.score})"),
                e => Debug.LogError(e));
        }, e => Debug.LogError(e));
    }
}
```

## よくある問題

- **一覧にボードがない。** 先に管理画面でリーダーボードを作成し、ゲームに必要なサブスクリプションがあるか確認してください。
- **My Rank が空。** プレイヤーはこのボードでまだスコアがありません。紐づいたガチャパックを開くか、紐づいたアイテムを受け取るとポイントが入ります。
- **スコアがまだ変わらない。** スコアはバックグラウンドワーカーが加算します。少し待ってから再読み込みしてください。
- **500 人しか返らない。** 1 回のリクエストの上限は 500 です。

## FAQ

### プレイヤーは Unity から自分のスコアを送信できますか？
いいえ。スコアはガチャパックを開く、アイテムを受け取るといったサーバー側のイベントからのみ発生します。これにより、クライアントからの不正なスコアを防ぎます。

### リーダーボードに何人まで表示できますか？
1 回のリクエストで最大 500 人、デフォルトは 100 人です。

### リーダーボードを毎日や毎週リセットできますか？
はい。各ボードにリセットスケジュール（never、daily、weekly、monthly、season）があります。[Leaderboard](/tutorials/guides/15a-leaderboard)を参照してください。

## 次のステップ

- [Leaderboard Admin Page](/tutorials/guides/leaderboard-admin-page)
- [Event Type](/tutorials/guides/event-type)
