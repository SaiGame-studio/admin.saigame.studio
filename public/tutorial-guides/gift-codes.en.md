Create gift codes (redeem codes) for your game and let players redeem them in Unity. A Sai Server gift code opens one or more **gacha packs** for the player. The server checks the code's dates, usage limit and whether the player already used it, so each player can redeem a code only once.

**In this guide you will:**
- create a gift code linked to gacha packs,
- choose single-use, limited or unlimited codes with start and end dates,
- redeem the code in Unity with the `GiftCodeRedeemer` component,
- track who redeemed it.

## Before you start

- At least one gacha pack that holds the rewards (see [Open Gacha Pack](/tutorials/guides/open-gacha-pack)). The pack's reward destination (Mailbox or Direct Inventory) decides where the rewards go.
- A logged-in player with Gamer Progress in Unity (see [Create Gamer Progress](/tutorials/guides/create-gamer-progress)).

## Step 1: Create a gift code

1. Open **Items** in your game dashboard and select the **Giftcodes** tab.

![Giftcodes tab on the Items page](/tutorial-guides/gift-codes/giftcodes-tab.png =1500x)

2. Create a new code and fill in the form:

| Field | Description |
|---|---|
| **Code** | The text players type, for example `WELCOME2026`. It cannot be changed after creation. |
| **Description** | An internal note for your team. |
| **Linked Gacha Packs** | The packs opened when the code is claimed. Key requirements are skipped, so players do not need keys. |
| **Max Uses** | **Single use (1 person)**, **Limited uses** (enter a number) or **Unlimited (everyone can redeem)**. |
| **Active At** | When the code starts working. |
| **Expires At** | When the code stops working. Leave it empty for no end date. |

3. Save the code.

![Create Gift Code form filled in with an example](/tutorial-guides/gift-codes/create-form.png =544x)

![Gift code usage, dates and Create button](/tutorial-guides/gift-codes/create-form-save.png =560x)


**Expected result:** the code appears in **Game Giftcodes** with its status: **Active**, **Scheduled** (Active At is in the future), **Inactive**, **Expired** or **Depleted** (all uses taken).

![Game Giftcodes list with status badges](/tutorial-guides/gift-codes/status-list.png =1495x)


## Step 2: Redeem the code in Unity

1. Enter **Play Mode** and log in as a player.
2. Select **SaiServer > Item** in the Hierarchy and expand the `GiftCodeRedeemer` component in the Inspector.
3. Enter the code in **Default Gift Code** and click **Redeem Gift Code**.

![Gift Code Redeemer in Unity Play Mode with an example code](/tutorial-guides/gift-codes/redeemer-inspector.png =808x)


**Expected result:** the Inspector shows **Total Items Granted** and **Total Gacha Rolls**. The rewards go to the player's Mailbox or inventory, depending on each pack's reward destination.

![Successful WELCOME2026 redemption in Unity with the onSuccess Console log and one item granted](/tutorial-guides/gift-codes/redeem-result.png =1059x)


From code, for example from a "Redeem" button in your settings screen:

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

Codes are matched **exactly**, so `welcome2026` and `WELCOME2026` are different codes. Tell players how to type the code, or convert the input to match the way you create codes.

## Step 3: See who redeemed a code

Open the code in the **Giftcodes** tab and view its **redemptions**. Each row shows the player and the time of redemption. The used count shows how many uses are taken.

![Giftcode Redemptions dialog](/tutorial-guides/gift-codes/redemptions.png =840x)


A code that has been redeemed at least once cannot be deleted. Make it inactive or let it expire instead.

## Redeem errors

| Result | Cause |
|---|---|
| **404** gift code not found or invalid | The code does not exist in this game, or it was typed differently. |
| **403** gift code cannot be claimed | The code is inactive or not active yet, it has expired, all uses are taken, or this player already redeemed it. |

## Common problems

- **"Not found" for a code that exists.** Check the spelling and letter case, and that Unity uses the same Game ID as the game that owns the code.
- **The player gets nothing in the inventory.** Check the Mailbox. The pack may deliver rewards to the Mailbox.
- **A code works for one player only.** Max Uses is set to **Single use (1 person)**. Use **Unlimited** for a public code.

## FAQ

### Can a player redeem the same gift code twice?
No. Each player can redeem a code once, even when the code has unlimited uses.

### How do I make a code for every player?
Set **Max Uses** to **Unlimited (everyone can redeem)** and set an **Expires At** date for the campaign.

### What can a gift code give?
A gift code opens its linked gacha packs. Put the exact rewards in a pack, for example a pack with one fixed item, to give a guaranteed reward.

## Next steps

- [What is Gacha Pack?](/tutorials/guides/what-is-gacha-pack)
- [Send an item to a player](/tutorials/guides/5b-send-an-item-to-a-player)
