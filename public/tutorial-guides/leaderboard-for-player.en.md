Show leaderboards in your Unity game with the Sai Server `Leaderboard` component. You can list the game's boards, load the top players and show the current player's rank. Scores are recorded by the server, so players cannot submit fake scores from the client.

**In this guide you will:**
- list all leaderboards of your game,
- load the top N players of a board,
- show the logged-in player's rank and score.

## Before you start

- At least one leaderboard created for your game (see [#15a - Leaderboard](/tutorials/guides/15a-leaderboard)). Leaderboards need the **Rare** subscription for the game.
- A logged-in player in Unity (see [#1b - Import the Unity package](/tutorials/guides/import-unity-package)).

## How scores reach the leaderboard

The game client does not send scores. A board's **score source** decides what counts:

- `gacha_pack_open_count` – +1 each time the player opens the selected gacha pack.
- `item_collected_count` – +quantity each time the player receives the selected item, through an inventory grant or a mailbox claim.

The server records these events and a background worker adds them to the board. A new score can take a short moment to appear.

## Step 1: List the leaderboards

1. Enter **Play Mode** and log in.
2. Select the `Leaderboard` component on the `SaiServer` object.
3. Click **List Boards**.

**Expected result:** **Board List** shows every leaderboard of the game, including disabled ones, with its key, score mode and score source.

![List all leaderboards in the Unity Inspector](/tutorial-guides/leaderboard-for-player/step-01.png)

Click **Get Board** on a board to reload its details. **Clear Boards** clears the loaded list.

## Step 2: Load the top players

1. Under a board, set **Top N** to the number of players you want.
2. Click **Get Top N**.

The server returns **100** players by default and at most **500**. A larger value is reduced to 500.

![Get the top players of a leaderboard](/tutorial-guides/leaderboard-for-player/step-02.png)

## Step 3: Show the player's rank

Click **My Rank** under a board to load the logged-in player's rank, score and current season.

![My Rank shows the player's rank and score](/tutorial-guides/leaderboard-for-player/step-03.png)

## Use the leaderboard from code

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

## Common problems

- **No boards in the list.** Create a leaderboard in the admin first, and check that the game has the required subscription.
- **My Rank is empty.** The player has no score on this board yet. Open the linked gacha pack or receive the linked item to earn points.
- **The score has not changed yet.** Scores are added by a background worker. Wait a moment and load again.
- **Only 500 players are returned.** 500 is the maximum for one request.

## FAQ

### Can players submit their own score from Unity?
No. Scores come only from server-side events, such as opening a gacha pack or receiving an item. This prevents fake scores from the client.

### How many players can I show on a leaderboard?
Up to 500 per request. The default is 100.

### Can leaderboards reset every day or week?
Yes. Each board has a reset schedule (never, daily, weekly, monthly or season). See [#15a - Leaderboard](/tutorials/guides/15a-leaderboard).

## Next steps

- [#15b - Leaderboard Admin Page](/tutorials/guides/leaderboard-admin-page)
- [#16a - Event Type](/tutorials/guides/event-type)
