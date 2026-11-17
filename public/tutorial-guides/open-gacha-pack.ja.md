Guide to Implementing and Opening a Gacha Pack

# Technical Guide: Implementing and Testing Gacha Packs

This guide outlines the workflow for linking items to Gacha Packs via metadata, configuring rewards, and executing the opening sequence within the Unity client.

---

## 1. Core Logic & Linking
When an item is selected as a **Key** for a Gacha Pack, a logical link is established through the item's **metadata**. This metadata ensures the system recognizes the specific item instance as the trigger for the randomized reward logic.

---

## 2. Implementation Steps

### Step 1: Create the Key Item
1. Navigate to the Item Database.
2. Create a new item named `Gacha Item`.
3. Set the **Category** to `Gacha Pack`.
![alt](/tutorial-guides/open-gacha-pack/step-01.png)

### Step 2: Configure the Gacha Pack
1. Create a new **Gacha Pack** definition.
2. Assign the `Gacha Item` created in Step 1 as the primary **Key**.
3. **Important**: Record the `id` and `code_name` of the pack for later use in the client.
![alt](/tutorial-guides/open-gacha-pack/step-02.png)

### Step 3: Define Rewards
1. Select at least two items to serve as rewards.
2. Assign drop rates (probabilities) to each item based on your desired balance.

### Step 4: Distribute the Key Item
1. Access the **Mailbox** system in the admin panel.
2. Send **5 units** of the `Gacha Item` to the target player's UID.
![alt](/tutorial-guides/open-gacha-pack/step-03.png)

---

## 3. Client-Side Testing (Unity)

To verify the integration, follow these steps within the Unity environment:

1. Log in to the game client using the player account that received the items.
2. Make sure to claim the `Gacha Item` from your Mailbox.
![alt](/tutorial-guides/open-gacha-pack/step-04.png)
4. Locate the `Gacha Pack` class within the `Child Object Item` hierarchy.
5. To execute the "Open" command, use either the `ID` or `code_name` recorded during Step 2.
![alt](/tutorial-guides/open-gacha-pack/step-05.png)

> **Note**: You must specify the **Container ID** currently holding the `Gacha Item` (e.g., Inventory or Vault) for the request to be valid. You can get the `container_id` from the PlayerContainer class.

![alt](/tutorial-guides/open-gacha-pack/step-06.png) 

### Reward Retrieval
- If the delivery method is set to **Mailbox**, items will not be added directly to the inventory.
- Players must perform an additional **Claim** action within the mailbox to transfer the items to their **Main Inventory**.
- You might wonder why the Mailbox Delivery Method exists, it's designed to prevent issues where a full inventory (due to slot limits) could block transactions or disrupt the user experience.
![alt](/tutorial-guides/open-gacha-pack/step-07.png)

---

## 4. Technical Constraints & Debugging

### Container Consistency
If a Gacha Pack requires multiple keys, all keys must reside within the **same container**.
* **Failure State**: If Key A is in the Inventory and Key B is in the Storage, the pack will fail to open.
* **Solution**: Move all required keys into a single container before calling the open function.

### Debugging Best Practices
For efficient debugging, Gacha Packs can be opened directly via the `PlayerItem` or `PlayerContainer` classes.
![alt](/tutorial-guides/open-gacha-pack/step-08.png)

