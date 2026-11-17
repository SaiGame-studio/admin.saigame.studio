This section covers how to test your quests effectively and how to interact with them within the Unity environment.

## 1. Testing Best Practices
* **Simplified Testing:** For faster verification, set the conditions of your **one_time** quests to **Login**. This allows for immediate completion.
* **Item Conditions:** If your quest requires specific items, ensure you use administrative tool to grant those items to your test account before proceeding.

---

## 2. Unity Integration (Quest Child Object)
In Unity, locate the **Quest Child Object**. Within this object, you will primarily work with the **ChainQuest** class.

### ChainList Overview
The **ChainList** displays all the Quest Chains you have created. Each chain provides two distinct ways to view its contents:
![alt](/tutorial-guides/complete-a-chain-quest/step-01.png)
#### A. Quest Tree
* **Purpose:** Displays the entire quest flow in a tree structure. 
* **Use Case:** Use this to verify that the data is synchronized correctly with the Web UI.
* **Interaction:** This is a **read-only** view; you cannot interact with the quests here.
![alt](/tutorial-guides/complete-a-chain-quest/step-02.png)

#### B. Quest Flat
In this view, you can see individual quests along with three essential action buttons:

1. **Start**: Manually triggers the mission. Clicking this creates a **Quest Instance** for the player, allowing progress tracking to begin.
2. **Check**: Triggers a manual progress update. The backend will verify item counts and activity logs to update the quest status. 
    * *Note:* The backend does **not** constantly run background checks. You must call this function via the client (e.g., when a player opens the Quest Detail UI) to refresh the status.
3. **Claim**: If the quest state is **Completed**, use this to collect rewards. Once claimed, a **one_time** quest becomes permanently inaccessible for that account.
![alt](/tutorial-guides/complete-a-chain-quest/step-03.png)

---

## 3. Reviewing Progress
After completing and claiming your quests, you can verify the results and audit the data by accessing the **QuestHistory** class, which stores a full log of the player's past activities.
![alt](/tutorial-guides/complete-a-chain-quest/step-04.png)

---
> **Developer Tip:** To ensure a smooth player experience, automate the "Check" function at logical gameplay intervals—such as when entering a specific zone or opening the quest log—so the UI always feels up to date.
