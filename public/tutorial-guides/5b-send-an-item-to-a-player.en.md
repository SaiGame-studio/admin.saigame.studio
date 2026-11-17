This guide demonstrates the foundational method of distributing items to players using the Mailbox system within the Sai Game Admin and Unity environment.

## 1. Overview
The Mailbox system serves as a primary delivery mechanism for rewards, compensatio. This method allows administrators to push items directly to specific player accounts for manual retrieval.

---

## 2. Locating the Player Profile
Before sending items, you must verify the player's current inventory state to ensure the transaction is tracked correctly.

1. Navigate to the **Players** section of the Game Admin.
2. Select the specific **Player Profile** from the list.
3. Open the **Items Tab**.
4. **Verification:** Confirm that the item list is currently empty.
![alt](/tutorial-guides/5b-send-an-item-to-a-player/step-01.png)

---

## 3. Sending a Mail with Attachments
To send an item, use the Player Mailbox interface. This ensures the unique Player ID is correctly mapped.

### Navigation
* While in the Player Profile, navigate to the **Mail Tab**.
    * *Note: Using this tab automatically populates the Player ID field.*
![alt](/tutorial-guides/5b-send-an-item-to-a-player/step-02.png) 

### Execution Steps
1. Locate the **Attachments** section at the bottom of the interface.
2. Select a specific item from the available library.
3. Set any necessary message parameters and click **Send**.
4. **Verification:** The **Player Mailbox** list should now display a new entry with the status:
    * **unread**
    * **unclaim**
![alt](/tutorial-guides/5b-send-an-item-to-a-player/step-03.png)

---

## 4. Claiming Items in Unity
Once the mail is sent via the Admin panel, the player must claim it within the game client to update their inventory.

### Implementation Workflow
1. Launch the project in **Unity**.
2. Log in with the targeted player account.
3. Locate the `Mailbox` class under the `SaiService` Object.
4. Execute the `LoadMessage` method to fetch current mail data.
![alt](/tutorial-guides/5b-send-an-item-to-a-player/step-04.png)
5. Execute the **Claim** action on the specific email containing the attachment.
![alt](/tutorial-guides/5b-send-an-item-to-a-player/step-05.png)

---

## 5. Verification of Receipt
After the claim action is completed in Unity, the database updates the player's inventory state.

1. Return to the **Sai Game Admin**.
2. Refresh the **Items Tab** within the Player Profile.
3. The attached item will now appear in the player's inventory list.
![alt](/tutorial-guides/5b-send-an-item-to-a-player/step-06.png)

