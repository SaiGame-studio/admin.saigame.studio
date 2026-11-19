Save player progress in the cloud and load it on any device with the Sai Server Unity SDK. Experience and gold are updated with server-side deltas. Your own save data is stored as JSON in **Game Data**. The player logs in with the same account on Android, iOS or PC and continues where they left off.

**In this guide you will:**
- add experience and gold with delta updates,
- save and load a JSON game state,
- load the same save on a second device,
- learn the limits that apply to cloud saves.

## Before you start

- The player is logged in and has Gamer Progress in your game (see [#2a - Create Gamer Progress](/tutorials/guides/create-gamer-progress)).
- Progress has been loaded with **Create Progress** or **Get Progress** in this session. Updates are rejected until it is loaded.

## Step 1: Update experience and gold with deltas

Delta updates add to the current value on the server instead of overwriting it. Two sessions that add gold at the same time both count.

1. On the `GamerProgress` component, enter the amounts in the **Update Delta Values** section.
2. Click **Update Progress (+XP, +Gold)**.

![Update Delta Values in the GamerProgress component](/tutorial-guides/cross-platform-save/step-01.png)

```csharp
// Add 150 XP and spend 20 gold. Game Data is kept as it is.
SaiServer.Instance.GamerProgress.UpdateProgress(150, -20, null,
    data => Debug.Log($"Level {data.level}, Gold {data.gold}"),
    error => Debug.LogError(error));
```

Rules checked by the server:
- **Experience delta:** 0 to 1,000,000. Experience cannot be reduced.
- **Gold delta:** -1,000,000 to 1,000,000. Gold never goes below 0. A larger deduction stops at 0.
- The **level** is recalculated from experience on every update.

## Step 2: Save your game state as JSON

**Game Data** is a schema-less JSON field. Store any structure you need, such as checkpoints, settings or completed tutorials.

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

In the Inspector, paste the JSON into the Game Data field (use **Beautify JSON** to format it) and click **Update Progress**. In code, pass the JSON string as the third argument:

```csharp
string saveJson = JsonUtility.ToJson(mySaveState);
SaiServer.Instance.GamerProgress.UpdateProgress(0, 0, saveJson,
    data => Debug.Log("Saved to the cloud"),
    error => Debug.LogError(error));
```

![JSON Game Data saved on Gamer Progress](/tutorial-guides/cross-platform-save/step-02.png)

> For items, currencies and rewards that players can trade or spend, use [Item Definitions](/tutorials/guides/what-is-item-definition) and the inventory instead of Game Data. The server validates those changes.

## Step 3: Load the save on another device

1. On the second device, log in with the **same account**.
2. Call **Get Progress**.
3. Read the save with `GamerProgress.GetGameData()` and restore your game state.

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

**Expected result:** the second device shows the same level, experience, gold and Game Data as the first device.

## How conflicts are handled

- **Experience and gold** use deltas with optimistic locking. If two updates happen at the same moment, the server retries automatically. If it still cannot apply the update, it returns **409** "concurrent update conflict, please retry".
- **Game Data** is replaced as a whole on each save. The last save wins. Sai Server does not merge two different JSON saves. If players can play on two devices at the same time, load the latest progress before you save, or keep critical values in experience, gold or items.
- There is **no offline sync** in the SDK. Save when the device is online, and retry failed saves in your game.

## Limits

| Limit | Value |
|---|---|
| Game Data size | 2.5 MiB of serialized JSON |
| Experience delta per update | 0 to 1,000,000 |
| Gold delta per update | -1,000,000 to 1,000,000 |

A save larger than 2.5 MiB fails with **413** and the message code `GAME_DATA_TOO_LARGE`.

## Common problems

- **"invalid experience delta".** The experience delta is negative or larger than 1,000,000.
- **413 `GAME_DATA_TOO_LARGE`.** Reduce the save size. Store large or shared content elsewhere, and keep only state in Game Data.
- **409 concurrent update conflict.** Retry the update.
- **The second device shows old data.** Call **Get Progress** after login. The SDK does not push changes to other devices.

## FAQ

### Can a player continue the same save on Android, iOS and PC?
Yes. Progress belongs to the account and the game, not to the device. Log in with the same account and call Get Progress.

### Is the cloud save merged between devices?
No. Experience and gold changes are added on the server, but Game Data is replaced by the latest save.

### How big can a cloud save be?
Up to 2.5 MiB of serialized JSON per player per game.

## Next steps

- [#5a - What is Item Definition?](/tutorials/guides/what-is-item-definition)
- [#5b - Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
