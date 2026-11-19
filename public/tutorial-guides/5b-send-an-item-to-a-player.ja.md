ゲーム内の **Mailbox** でプレイヤーにアイテムを送り、Unity で受け取ります。Mailbox は Sai Server で報酬、補填、ギフトを配布する仕組みです。管理画面でメールにアイテムを添付し、プレイヤーがゲームクライアントで受け取る（Claim）と、サーバーがプレイヤーのインベントリにアイテムを追加します。

**このガイドで行うこと：**
- 管理画面からアイテム付きのメールを送る
- Unity の `Mailbox` コンポーネントでメールを読み込み、受け取る
- アイテムがプレイヤーのインベントリに届いたことを確認する

## 事前準備

- 送るための Item Definition（[Item Definition とは？](/tutorials/guides/what-is-item-definition)を参照）
- ゲームに Gamer Progress を持つプレイヤー（[Gamer Progress を作成する](/tutorials/guides/create-gamer-progress)を参照）

## ステップ 1：プレイヤーのプロフィールを開く

1. ゲームのダッシュボードで **Players** を開きます。
2. プレイヤーを選択します。
3. **Items** タブを開き、現在のアイテムを確認します。新しいテストプレイヤーはアイテムを持っていません。

![プレイヤープロフィールの Items タブ](/tutorial-guides/5b-send-an-item-to-a-player/step-01.png)

## ステップ 2：添付付きのメールを送る

1. 同じプレイヤープロフィールで **Mail** タブを開きます。Player ID は自動入力されます。
2. **Attachments** でアイテムと数量を選びます。
3. タイトルと本文を書いて **Send** をクリックします。

![プレイヤープロフィールの Mail タブ](/tutorial-guides/5b-send-an-item-to-a-player/step-02.png)

**期待される結果：** **Player Mailbox** の一覧に、**unread** かつ **unclaimed** の新しいメールが表示されます。

![新しいメールは unread・unclaimed](/tutorial-guides/5b-send-an-item-to-a-player/step-03.png)

## ステップ 3：Unity でアイテムを受け取る

1. **Play モード** に入り、そのプレイヤーでログインします。
2. `SaiServer` オブジェクト上の `Mailbox` コンポーネントを選択します。
3. **Load Messages** をクリックします。各メールには **[Unread]**、**[Read]**、**[Claimed]**、**[Expired]** のステータスが表示されます。
4. 添付のあるメールで **Claim** をクリックします。読み込んだメールをまとめて受け取るには **Claim All** をクリックします。

![Mailbox コンポーネントの Load Messages](/tutorial-guides/5b-send-an-item-to-a-player/step-04.png)

![メールの添付を受け取る](/tutorial-guides/5b-send-an-item-to-a-player/step-05.png)

**Unread Count** と **Unclaimed Count** を使うと、ゲーム UI に通知バッジを表示できます。

コードでの同じ流れ：

```csharp
using SaiGame.Services;
using UnityEngine;

public class MailboxExample : MonoBehaviour
{
    public void ClaimFirstMail()
    {
        Mailbox mailbox = SaiServer.Instance.Mailbox;
        mailbox.GetMessages(null, null,
            response =>
            {
                if (response.messages == null || response.messages.Length == 0) return;
                string messageId = response.messages[0].id;
                mailbox.ClaimMessage(messageId,
                    claimed => Debug.Log("Claimed"),
                    error => Debug.LogError(error));
            },
            error => Debug.LogError(error));
    }

    // Call after Load Messages / GetMessages: claims every loaded mail with an unclaimed attachment.
    public void ClaimEverything()
    {
        SaiServer.Instance.Mailbox.ClaimAllMessages(
            claimed => Debug.Log($"Claimed {claimed.Length} mails"),
            error => Debug.LogError(error));
    }
}
```

## ステップ 4：インベントリでアイテムを確認する

1. 管理画面のプレイヤープロフィールに戻ります。
2. **Items** タブを更新します。

**期待される結果：** 添付したアイテムがプレイヤーのインベントリに表示されます。

![受け取ったアイテムが Items タブに表示される](/tutorial-guides/5b-send-an-item-to-a-player/step-06.png)

## なぜ Mailbox でアイテムを配布するのか

- **アイテムを付与するのはサーバー。** ゲームクライアントは受け取りを依頼するだけで、アイテムを作り出せません。
- **プレイヤーが受け取った内容を確認できる。** 各メールにタイトルと本文があります（例：「メンテナンス補填」）。
- **多くの機能が利用する。** ガチャパック、アイテムジェネレーター、クエスト報酬は、インベントリに直接ではなく Mailbox に届けることもできます。

## よくある問題

- **Load Messages で何も返らない。** メールを送ったプレイヤーと同じアカウント、同じゲームでログインしているか確認してください。
- **Claim ボタンがない。** メールに添付がありません。Claim は添付付きのメールにのみ表示されます。
- **受け取ってもアイテムが表示されない。** **Items** タブを更新してください。インベントリが満杯の場合、サーバーは容量不足のエラーを返します。

## FAQ

### Sai Server で 1 人のプレイヤーにアイテムを贈るには？
プレイヤーのプロフィールを開き、**Mail** タブでアイテムを添付したメールを送り、ゲーム内で受け取ってもらいます。

### プレイヤーはすべてのメールを一度に受け取れますか？
はい。先にメールを読み込み、**Claim All**（コードでは `ClaimAllMessages`）を使うと、読み込んだメールのうち未受け取りの添付をすべて受け取ります。

### Mailbox を経由せずに報酬を渡せますか？
はい。ガチャパックやクエストなど一部の機能は、メインインベントリに直接届けられます。[ガチャパックとは？](/tutorials/guides/what-is-gacha-pack)を参照してください。

## 次のステップ

- [Container とは？](/tutorials/guides/what-is-container)
- [ギフトコードの作成と引き換え](/tutorials/guides/gift-codes)
