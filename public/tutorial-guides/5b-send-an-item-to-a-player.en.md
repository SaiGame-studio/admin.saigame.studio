Send an item to a player through the in-game **Mailbox** and claim it in Unity. The Mailbox is how you deliver rewards, compensation and gifts with Sai Server. You attach items to a mail in the admin, and the player claims them from the game client. The server then adds the items to the player's inventory.

**In this guide you will:**
- send a mail with an item attachment from the admin,
- load and claim the mail in Unity with the `Mailbox` component,
- verify that the item reached the player's inventory.

## Before you start

- An Item Definition to send (see [#5a - What is Item Definition?](/tutorials/guides/what-is-item-definition)).
- A player with Gamer Progress in your game (see [#2a - Create Gamer Progress](/tutorials/guides/create-gamer-progress)).

## Step 1: Open the player's profile

1. Open **Players** in your game dashboard.
2. Select the player.
3. Open the **Items** tab and note the current items. A new test player has no items.

![Player profile Items tab](/tutorial-guides/5b-send-an-item-to-a-player/step-01.png)

## Step 2: Send a mail with an attachment

1. In the same player profile, open the **Mail** tab. The Player ID is filled in for you.
2. In **Attachments**, select the item and quantity.
3. Write the title and message, then click **Send**.

![Player profile Mail tab](/tutorial-guides/5b-send-an-item-to-a-player/step-02.png)

**Expected result:** the **Player Mailbox** list shows the new mail as **unread** and **unclaimed**.

![New mail is unread and unclaimed](/tutorial-guides/5b-send-an-item-to-a-player/step-03.png)

## Step 3: Claim the item in Unity

1. Enter **Play Mode** and log in as that player.
2. Select the `Mailbox` component on the `SaiServer` object.
3. Click **Load Messages**. Each mail shows a status badge: **[Unread]**, **[Read]**, **[Claimed]** or **[Expired]**.
4. Click **Claim** on the mail with the attachment. To claim every loaded mail at once, click **Claim All**.

![Load Messages in the Mailbox component](/tutorial-guides/5b-send-an-item-to-a-player/step-04.png)

![Claim the mail attachment](/tutorial-guides/5b-send-an-item-to-a-player/step-05.png)

Use **Unread Count** and **Unclaimed Count** to show notification badges in your game UI.

The same flow in code:

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

## Step 4: Verify the item in the inventory

1. Go back to the player's profile in the admin.
2. Refresh the **Items** tab.

**Expected result:** the attached item appears in the player's inventory.

![The claimed item appears in the Items tab](/tutorial-guides/5b-send-an-item-to-a-player/step-06.png)

## Why use the Mailbox to deliver items?

- **The server grants the item.** The game client only asks to claim. It cannot invent items.
- **Players see what they received.** Each mail has a title and message, for example "Maintenance compensation".
- **Many features use it.** Gacha packs, item generators and quest rewards can deliver to the Mailbox instead of directly to the inventory.

## Common problems

- **Load Messages returns nothing.** Check that you are logged in as the same player the mail was sent to, in the same game.
- **The Claim button is missing.** The mail has no attachment. Claim is only shown for mails with attachments.
- **The item does not appear after claiming.** Refresh the **Items** tab. If the inventory is full, the server returns a storage error.

## FAQ

### How do I give an item to one player in Sai Server?
Open the player's profile, use the **Mail** tab to send a mail with the item attached, and let the player claim it in the game.

### Can a player claim all mails at once?
Yes. Load the messages first, then **Claim All** (or `ClaimAllMessages` in code) claims every loaded mail that has an unclaimed attachment.

### Can rewards skip the Mailbox?
Yes. Some features, such as gacha packs and quests, can deliver directly to the main inventory. See [#8a - What is Gacha Pack?](/tutorials/guides/what-is-gacha-pack).

## Next steps

- [#6a - What is Container?](/tutorials/guides/what-is-container)
- [#8c - Create and redeem gift codes](/tutorials/guides/gift-codes)
