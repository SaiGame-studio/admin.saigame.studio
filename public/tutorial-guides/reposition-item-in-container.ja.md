This guide shows how to define an item with grid size and move it within a player's container in Unity.

## 1. Item Definition
Create a new item in the Admin panel with the following specifications:
* **Item Name:** Iron Sword (or any preferred name).
* **Grid Dimensions:** Set the width and height to **1x2**.
![alt](/tutorial-guides/reposition-item-in-container/step-01.png)

---

## 2. Distribution and Retrieval
1. **Send Item:** Use the **Mailbox** system in the Game Admin to grant this item to a player.
![alt](/tutorial-guides/reposition-item-in-container/step-02.png)

2. **Claim Item:** Launch your project in **Unity** and execute the `Claim` action within the `Mailbox` class to move the item from the mail system to the player's inventory.
![alt](/tutorial-guides/reposition-item-in-container/step-03.png)

---

## 3. Verifying the Initial Position
Before moving the item, you must identify its current coordinates:
1. Navigate to the **Sai Game Admin**.
2. Open the **Main Inventory** tab for the player.
3. Switch to the **Grid View**.
4. **Note:** Observe and remember the current X and Y coordinates of the **Iron Sword**.
![alt](/tutorial-guides/reposition-item-in-container/step-04.png)

---

## 4. Moving Items via Unity Inspector
To manually test item relocation, use the built-in movement tools in the Unity editor.

### Execution Steps
1. In the Unity Hierarchy, locate the child object under `SaiService` named **Item**.
2. Select the **Item Move** class component.
3. **Sync Data:** If the Iron Sword does not appear in the list, click the **Sync Item** button.
4. **Target Identification:** Select the **Iron Sword** and the target **Inventory**. 
    * *Note: If multiple containers exist, use the `container_id` to ensure you are selecting the correct inventory instance.*
5. **Set Position:** Input the new target coordinates (X, Y) where you want the item to move.
6. **Execute:** Click the **Move Item** button.
![alt](/tutorial-guides/reposition-item-in-container/step-05.png)

---

## 5. Verification and Implementation
1. **Check Results:** Return to the **Container** view in the Admin panel. You will see that the item has successfully updated to the new coordinates.
![alt](/tutorial-guides/reposition-item-in-container/step-06.png)

2. **Code Integration:** * Double-click the **Log Move Item** message in the Unity Console.
    * This will take you directly to the source code for the movement function.
    * **Note:** You can call this specific method anywhere in your custom scripts to handle programmatic inventory management.
![alt](/tutorial-guides/reposition-item-in-container/step-07.png)

> **Important:** Movement requests are validated by the server. If the target coordinates are already occupied by another item or exceed the container boundaries, the move command will fail.

