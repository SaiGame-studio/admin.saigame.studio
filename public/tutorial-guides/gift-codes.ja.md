ゲーム用のギフトコード（引き換えコード）を作成し、プレイヤーが Unity で引き換えられるようにします。Sai Server のギフトコードは、プレイヤーのために 1 つ以上の **ガチャパック** を開きます。サーバーがコードの有効期間、使用回数の上限、プレイヤーが既に使用したかどうかを確認するため、各プレイヤーは 1 つのコードを 1 回だけ引き換えられます。

**このガイドで行うこと：**
- ガチャパックに紐づいたギフトコードを作成する
- 1 回限り・回数制限・無制限のコードと開始・終了日時を設定する
- `GiftCodeRedeemer` コンポーネントで Unity からコードを引き換える
- 引き換えたプレイヤーを確認する

## 事前準備

- 報酬を含むガチャパックが 1 つ以上あること（[Open Gacha Pack](/tutorials/guides/open-gacha-pack)を参照）。パックの報酬の配送先（Mailbox または Direct Inventory）で、報酬の届き先が決まります。
- Unity でログイン済みで、Gamer Progress を持つプレイヤー（[Create Gamer Progress](/tutorials/guides/create-gamer-progress)を参照）

## ステップ 1：ギフトコードを作成する

1. ゲームのダッシュボードで **Items** を開き、**Giftcodes** タブを選択します。

![Items ページの Giftcodes タブ](/tutorial-guides/gift-codes/giftcodes-tab.png =1500x)

2. 新しいコードを作成し、フォームに入力します。

| フィールド | 説明 |
|---|---|
| **Code** | プレイヤーが入力する文字列（例：`WELCOME2026`）。作成後は変更できません。 |
| **Description** | チーム用の内部メモ |
| **Linked Gacha Packs** | 引き換え時に開かれるパック。鍵の要件はスキップされるため、プレイヤーは鍵を必要としません。 |
| **Max Uses** | **Single use (1 person)**、**Limited uses**（回数を入力）、**Unlimited (everyone can redeem)** |
| **Active At** | コードが使えるようになる日時 |
| **Expires At** | コードが使えなくなる日時。終了日がない場合は空欄 |

3. コードを保存します。

![例を入力した Create Gift Code フォーム](/tutorial-guides/gift-codes/create-form.png =544x)

![使用回数、有効期間と Create ボタン](/tutorial-guides/gift-codes/create-form-save.png =560x)


**期待される結果：** **Game Giftcodes** にコードが表示され、ステータスは **Active**、**Scheduled**（Active At が未来）、**Inactive**、**Expired**、**Depleted**（使用回数をすべて消化）のいずれかになります。

![ステータスバッジ付きの Game Giftcodes 一覧](/tutorial-guides/gift-codes/status-list.png =1495x)


## ステップ 2：Unity でコードを引き換える

1. **Play モード** に入り、プレイヤーでログインします。
2. Hierarchy で **SaiServer > Item** を選択し、インスペクターの `GiftCodeRedeemer` コンポーネントを展開します。
3. **Default Gift Code** にコードを入力し、**Redeem Gift Code** をクリックします。

![Unity Play モードでコードを入力した Gift Code Redeemer](/tutorial-guides/gift-codes/redeemer-inspector.png =808x)


**期待される結果：** インスペクターに **Total Items Granted** と **Total Gacha Rolls** が表示されます。報酬は各パックの配送先に応じて、プレイヤーの Mailbox またはインベントリに届きます。

![Unity で WELCOME2026 の引き換え成功：Console の onSuccess ログと付与されたアイテム 1 個](/tutorial-guides/gift-codes/redeem-result.png =1059x)


コードから呼ぶ例（設定画面の「引き換え」ボタンなど）：

```csharp
using SaiGame.Services;
using UnityEngine;

public class RedeemCodeButton : MonoBehaviour
{
    [SerializeField] private GiftCodeRedeemer redeemer;

    public void Redeem(string code)
    {
        redeemer.Redeem(code.Trim(),
            result => Debug.Log($"Redeemed: {result.total_items_granted} items"),
            error => Debug.LogWarning($"Cannot redeem: {error}"));
    }
}
```

コードは **完全一致** で照合されるため、`welcome2026` と `WELCOME2026` は別のコードです。入力方法をプレイヤーに案内するか、作成したコードの形式に合わせて入力を変換してください。

## ステップ 3：引き換えたプレイヤーを確認する

**Giftcodes** タブでコードを開き、**redemptions** を確認します。各行にプレイヤーと引き換え日時が表示されます。使用回数で、何回分が使われたかがわかります。

![Giftcode Redemptions ダイアログ](/tutorial-guides/gift-codes/redemptions.png =840x)


一度でも引き換えられたコードは削除できません。代わりに無効化するか、期限切れにしてください。

## 引き換えエラー

| 結果 | 原因 |
|---|---|
| **404** gift code not found or invalid | このゲームにコードが存在しない、または入力が異なる |
| **403** gift code cannot be claimed | コードが無効または開始前、期限切れ、使用回数の上限に達した、またはこのプレイヤーが既に引き換え済み |

## よくある問題

- **存在するコードなのに「not found」になる。** つづりと大文字・小文字、そして Unity がコードを所有するゲームと同じ Game ID を使っているか確認してください。
- **インベントリに何も届かない。** Mailbox を確認してください。パックが報酬を Mailbox に届けている可能性があります。
- **コードが 1 人しか使えない。** Max Uses が **Single use (1 person)** になっています。公開コードには **Unlimited** を使ってください。

## FAQ

### 同じギフトコードを 2 回引き換えられますか？
いいえ。使用回数が無制限のコードでも、各プレイヤーは 1 回だけ引き換えられます。

### 全プレイヤー向けのコードを作るには？
**Max Uses** を **Unlimited (everyone can redeem)** にし、キャンペーンの **Expires At** を設定します。

### ギフトコードで何を配れますか？
ギフトコードは紐づいたガチャパックを開きます。確定報酬を配りたい場合は、固定アイテム 1 つだけのパックなど、報酬を直接パックに設定してください。

## 次のステップ

- [What is Gacha Pack?](/tutorials/guides/what-is-gacha-pack)
- [Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
