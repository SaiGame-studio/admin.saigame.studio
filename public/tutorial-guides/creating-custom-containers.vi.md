This guide walks you through creating a new type of storage and transferring items between different player containers.

## 1. Creating the Container Item
First, we must define the physical item that represents the storage in the game world.

1. Navigate to the **Item Definitions** list in the Admin panel.
2. Create a new item named **"Chest"**.
3. **Important:** Set the **Item Type** to **Container**.
4. Save the item definition.
![alt](/tutorial-guides/creating-custom-containers/step-01.png)

---

## 2. Configuring the Container Grid
Now, define the internal logic (dimensions) for this specific container type.

1. Navigate to the **Containers** tab in the Game Admin.
2. Create a new container entry named **"Chest"**.
3. Set the **Grid Dimensions** to **10x10**.
4. In the **Linked Item Definition** field, select the **Chest** item you created in the previous step.
    * *Note: This links the "Chest" item to this specific 10x10 storage logic.*
![alt](/tutorial-guides/creating-custom-containers/step-02.png)

---

## 3. Distributing the New Container
To test the system, the player must own an instance of this container.

1. Go to the **Mailbox** system.
2. Send the **Chest** item to the target player.
3. Switch to **Unity** and execute the **Claim** action for that mail.
![alt](/tutorial-guides/creating-custom-containers/step-03.png)

---

## 4. Initializing Containers in Unity
Once the item is claimed, the system needs to recognize the new storage instance.

1. In the Unity Hierarchy, locate the **Item** child object under `SaiService`.
2. Open the **PlayerContainer** class component.
3. Click the **Get Containers** button.
4. **Verification:** You should now see two containers listed for the player:
    * **Main Inventory**
    * **Chest**
![alt](/tutorial-guides/creating-custom-containers/step-04.png)

---

## 5. Transferring Items Between Containers
You can move items not just within a grid, but across different containers entirely.

### Execution Steps
1. Open the **Item Move** class component in Unity.
2. **Select Source & Target:** * Select the **Iron Sword** (currently in Main Inventory).
    * Select the **Chest** as the target destination.
3. **Execute:** Click **Move Item**.
4. **Validation:** Look for a `Success` log in the Console. This indicates the item has jumped from one container instance to another.
![alt](/tutorial-guides/creating-custom-containers/step-05.png)

---

## 6. Final Verification
Check the backend to ensure the database reflects the cross-container move.

1. Return to the **Sai Game Admin** web interface.
2. Open the player's profile and check the **Chest** in **Grid View**.
    * **Result:** The **Iron Sword** is now visible inside the Chest grid.
3. Check the **Main Inventory**.
    * **Result:** The **Iron Sword** is no longer present there.
![alt](/tutorial-guides/creating-custom-containers/step-06.png)

> **Note:** Cross-container movement follows the same validation rules as grid movement. The target container must have enough empty slots to accommodate the item's dimensions.

