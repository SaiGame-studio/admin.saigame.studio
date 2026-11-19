Turn a logged-in user into a player of your game with **Gamer Progress**. Gamer Progress is the per-game save record that Sai Server keeps for each player: level, experience, gold and your own JSON game data. Create it once, then load it every time the player opens the game.

**In this guide you will:**
- create Gamer Progress for the logged-in user,
- load it back with Get Progress,
- understand Gamer Profile vs Gamer Progress.

## Before you start

- A Unity project connected to Sai Server, with a user logged in through `SaiAuth` or Google (see [#1b - Import the Unity package](/tutorials/guides/import-unity-package)).

The account you use to create studios and games can also log in and play your games. It is a convenient test player.

## Step 1: Create Gamer Progress

1. Log in, then select the `GamerProgress` component on the `SaiServer` object.
2. Click **Create Progress**.

**Expected result:** if the account is not yet a player of this game, the Console shows a success message and the component shows the new progress.

![Create Gamer Progress in Unity](/tutorial-guides/create-gamer-progress/step-01.png)

## Step 2: Load Gamer Progress

Click **Get Progress** to load the player's saved data into the game.

![Get Gamer Progress in Unity](/tutorial-guides/create-gamer-progress/step-02.png)

In code, load the progress after login and create it when the player is new:

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

The loaded data is available in `GamerProgress.CurrentProgress`. You must load or create progress before you update it.

## Step 3 (optional): Clear Gamer Progress

**Clear Progress** deletes the current player's progress for this game.

> **Warning:** this permanently erases the player's gameplay data for the game and cannot be undone. Use it only for testing.

![Clear Gamer Progress](/tutorial-guides/create-gamer-progress/step-03.png)

## What data does Gamer Progress store?

| Field | Description |
|---|---|
| `level` | Calculated by the server from experience: `floor(sqrt(experience / 100))`, minimum 1. |
| `experience` | Total experience. Updated with server-side deltas. |
| `gold` | Gold balance. Updated with server-side deltas and never goes below 0. |
| `game_data` | Your own JSON save data (see [#2b - Cross-platform cloud save](/tutorials/guides/cross-platform-save)). |
| `version` | Increases on every progress update. |

## Gamer Profile vs Gamer Progress

- **Gamer Profile** – created automatically when a user joins any game for the first time. There is only **one** global Gamer Profile per user.
- **Gamer Progress** – one record **per game**. A user can have Gamer Progress in many games.

![Gamer Profile is created automatically](/tutorial-guides/create-gamer-progress/step-04.png)

To inspect a player's progress, open **Players** in your game dashboard and select the player.

![Find a player's Gamer Progress in the dashboard](/tutorial-guides/create-gamer-progress/step-05.png)

## Common problems

- **Get Progress fails for a new player.** The user has no progress in this game yet. Call **Create Progress** first.
- **Update Progress says to load data first.** Call `CreateProgress` or `GetProgress` successfully before `UpdateProgress`.
- **"You are banned from this game".** The player's progress was banned from the dashboard and cannot be updated.

## FAQ

### When does a user become a player of my game?
When Gamer Progress is created for that user in your game. Logging in alone does not make the user a player.

### How is the player level calculated?
The server calculates it from experience with `floor(sqrt(experience / 100))`. The minimum level is 1.

### Can one account play several games?
Yes. One account has one Gamer Profile and a separate Gamer Progress in each game.

## Next steps

- [#2b - Cross-platform cloud save](/tutorials/guides/cross-platform-save)
- [#5b - Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
