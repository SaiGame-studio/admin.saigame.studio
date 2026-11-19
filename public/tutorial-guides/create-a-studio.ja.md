Sai Server の管理画面で Studio、Team、最初の Game を作成します。Unity プロジェクトを Sai Server バックエンドに接続する前の最初のステップで、所要時間は約 5 分です。

**このガイドで行うこと：**
- Studio（メインのワークスペース）を作成する
- 自動で作成される Team を確認する
- 最初の Game を作成し、Unity 用に **Game ID** をコピーする

## 事前準備

- **メール認証済み**の Sai Server アカウント
- アカウントで **二要素認証（2FA）** を有効にしていること。Studios ページでは、スタジオ作成前に 2FA の有効化が求められます。
- 2 つ目以降のスタジオを作成する場合は十分な **sCoin**（下の「費用はいくら？」を参照）

## ステップ 1：Studio を作成する

Studio はメインのワークスペースです。すべての Team、Game、メンバーは Studio に属します。

1. **Studios** ページを開きます。
2. スタジオ名を入力し、**Create** をクリックします。

![Sai Server 管理画面で新しいスタジオを作成](/tutorial-guides/create-a-studio/step-01.png)

## ステップ 2：Team を確認する

スタジオを作成すると、Sai Server がデフォルトのチーム（**Team #1**）を作成し、あなたをオーナーとして追加します。

![スタジオ内のデフォルトチーム](/tutorial-guides/create-a-studio/step-02.png)

- **一人で開発する場合：** 誰も追加する必要はありません。
- **チームで開発する場合：** メンバーに Sai Server アカウントを登録してもらい、**User ID** を送ってもらってからチームに追加します。

![User ID でチームにメンバーを追加](/tutorial-guides/create-a-studio/step-03.png)

## ステップ 3：最初の Game を作成する

1. [ゲーム作成ページ](https://server.saigame.studio/games/new)から新しいゲームを作成します。
2. ゲームをチームに割り当て、チームの全員が作業できるようにします。

![ゲームを作成](/tutorial-guides/create-a-studio/step-04.png)

![ゲームをチームに追加](/tutorial-guides/create-a-studio/step-05.png)

**期待される結果：** ゲームがスタジオに表示されます。**Game Detail** ページを開き、**Game ID** をコピーしてください。次のレッスンで Unity に貼り付けます。

## 費用はいくら？

Studio、Team、Game は月額ではなく **sCoin による買い切り** です。

| 項目 | デフォルト | 追加費用 |
|---|---|---|
| Studio | 最初のスタジオは無料 | 追加スタジオ 1 つにつき 50 sCoin |
| スタジオあたりの Game | 2 | 追加ゲーム枠 1 つにつき 5 sCoin |
| スタジオあたりの Team | 1 | 追加チーム 1 つにつき 10 sCoin |
| スタジオあたりのメンバー | 5 | メンバー枠 50 人分で 50 sCoin |

一部のゲーム内機能（例：Leaderboard）では、ゲームの月額サブスクリプションが必要です。該当するレッスンで説明します。

## よくある問題

- **スタジオを作成できない。** メール認証が完了しているか、2FA が有効になっているか確認してください。
- **sCoin が足りない。** 無料なのは最初のスタジオだけです。別のスタジオや追加枠を購入する前に sCoin をチャージしてください。
- **スタジオを削除したい。** ゲームが残っていないスタジオはオーナーが削除できます。2FA を使用している場合は 2FA コードが求められます。

## FAQ

### Sai Server は無料で始められますか？
はい。最初のスタジオは無料で、ゲーム枠 2、チーム 1、メンバー 5 人が含まれます。

### Studio、Team、Game の違いは？
**Studio** はワークスペースであり支払いの単位です。**Team** は一緒に作業するメンバーのグループです。**Game** は 1 つのプロジェクトで、独自のプレイヤー、アイテム、設定を持ちます。階層は Studio > Team > Game > Player です。

### スタジオやゲームに毎月費用がかかりますか？
いいえ。スタジオ、チーム、ゲーム、各種枠は sCoin による買い切りです。

## 次のステップ

- [Unity Package をインポートして Sai Server に接続する](/tutorials/guides/import-unity-package)
- [Unity で Google ログインを追加する](/tutorials/guides/unity-google-login)
