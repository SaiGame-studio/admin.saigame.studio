A player can be signed in to **account A** in your game but to **account B** on Sai Play. When your game sends them to Sai Play to buy or top up, the purchase goes to the account signed in on the web, not the one in the game.

Add `game_expect_user` to the link, and Sai Play warns the player when the two accounts differ.

## The link format

```
https://play.saigame.studio/<page>?game_expect_user=<user_id>
```

| Parameter | Required | Value |
|---|---|---|
| `game_expect_user` | No | The ID (UUID) of the user signed in to your game |

It works on **every** Sai Play page, for example:

| Page | Path |
|---|---|
| Your game | `/games/{game_id}` |
| Items | `/games/{game_id}/items` |
| Shops | `/games/{game_id}/shops` |
| One shop | `/games/{game_id}/shops/{shop_id}` |
| Buy sGem | `/sgem` |

## What Sai Play does

- **No `game_expect_user`, or a value that is not a UUID:** the page works as usual.
- **Same account:** nothing is shown.
- **Different account:** a warning appears under the header with the web account's name and a masked email. The player can **sign out and sign in again** (they come back to the same page afterwards) or **keep this account**.
- **Not signed in:** after the player signs in, the accounts are compared.

![Sai Play warning when the web account differs from the game account](/tutorial-tips/game-expect-user-warning.png)

Sai Play removes the parameter from the address bar and remembers it until the browser tab is closed.

## Example in Unity

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

## Tips

- Use `?` when the link has no other parameters, and `&` when it already has some.
- Only send the ID of the user who is **currently** signed in to the game.
- The parameter only shows a warning. It never signs anyone in or out, and it grants no access to the account.
