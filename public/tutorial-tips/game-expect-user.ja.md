プレイヤーがゲームでは**アカウント A**、Sai Play では**アカウント B** でログインしていることがあります。ゲームから Sai Play に移動して購入やチャージをすると、ゲームのアカウントではなく、Web でログイン中のアカウントに反映されます。

リンクに `game_expect_user` を付けると、2 つのアカウントが異なる場合に Sai Play がプレイヤーに警告します。

## リンクの形式

```
https://play.saigame.studio/<ページ>?game_expect_user=<user_id>
```

| パラメーター | 必須 | 値 |
|---|---|---|
| `game_expect_user` | いいえ | ゲームでログイン中のユーザーの ID（UUID） |

Sai Play の**すべての**ページで使えます。例：

| ページ | パス |
|---|---|
| ゲーム | `/games/{game_id}` |
| アイテム | `/games/{game_id}/items` |
| ショップ一覧 | `/games/{game_id}/shops` |
| 個別のショップ | `/games/{game_id}/shops/{shop_id}` |
| sGem の購入 | `/sgem` |

## Sai Play の動作

- **`game_expect_user` がない、または UUID ではない値：** ページは通常どおり動作します。
- **同じアカウント：** 何も表示されません。
- **異なるアカウント：** ヘッダーの下に警告が表示され、Web のアカウント名と一部を隠したメールアドレスが示されます。プレイヤーは**ログアウトして再ログイン**（完了後は同じページに戻ります）するか、**このアカウントを使う**かを選べます。
- **ログインしていない：** プレイヤーがログインした後にアカウントが比較されます。

![Web のアカウントがゲームのアカウントと異なる場合の Sai Play の警告](/tutorial-tips/game-expect-user-warning.png)

Sai Play はパラメーターをアドレスバーから削除し、ブラウザーのタブを閉じるまで記憶します。

## Unity での例

```csharp
using System;
using UnityEngine;
using SaiGame.Services;

public static class SaiPlayLinks
{
    private const string SaiPlayUrl = "https://play.saigame.studio";

    public static void OpenShop(string shopId)
    {
        string url = $"{SaiPlayUrl}/games/{SaiServer.Instance.GameId}/shops/{shopId}";

        // Add the signed-in user so Sai Play can warn about a different web account.
        UserData user = SaiServer.Instance.CurrentUser;
        if (user != null && !string.IsNullOrEmpty(user.id))
            url += "?game_expect_user=" + Uri.EscapeDataString(user.id);

        Application.OpenURL(url);
    }
}
```

## ヒント

- リンクにほかのパラメーターがなければ `?`、すでにある場合は `&` を使います。
- ゲームで**現在**ログインしているユーザーの ID だけを送ってください。
- このパラメーターは警告を表示するだけです。ログインやログアウトは行わず、アカウントへのアクセス権も与えません。
